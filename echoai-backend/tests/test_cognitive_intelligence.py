"""Focused Module 4 text-intelligence persistence and aggregation tests."""

import json
import os
import tempfile
import unittest
from uuid import uuid4
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.campaign import Campaign
from app.models.cognitive import CallExperience, TurnIntelligence
from app.models.operations import Call, CallState, CallTurn
from app.services.cognitive_intelligence import (
    aggregate_call_experience,
    detect_customer_text,
    persist_turn_intelligence,
)
from app.services.live_call_flow import call_context, persist_customer_turn
from app.api.routes.operations import get_call
from app.api.routes.voice_sessions import persist_live_customer_turn


class CognitiveIntelligenceTests(unittest.TestCase):
    def setUp(self):
        handle = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        handle.close()
        self.path = handle.name
        self.engine = create_engine(f"sqlite:///{self.path}")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db = self.Session()
        nodes = [{"id": "discovery", "goal": "Understand the current workflow", "prompt": "Ask about workflow.", "next_node_ids": []}]
        self.campaign = Campaign(
            id=str(uuid4()), name="Cognitive test", status="active",
            script_snapshot_json=json.dumps({"content": json.dumps({"nodes": nodes})}),
        )
        self.call = Call(id=str(uuid4()), campaign_id=self.campaign.id, status="active")
        self.other_call = Call(id=str(uuid4()), campaign_id=self.campaign.id, status="active")
        self.db.add_all([
            self.campaign, self.call, self.other_call,
            CallState(call_id=self.call.id, current_node_id="discovery"),
            CallState(call_id=self.other_call.id, current_node_id="discovery"),
        ])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        os.unlink(self.path)

    def _customer_turn(self, call, text, worker_turn_id):
        turn, _transition, _duplicate = persist_customer_turn(
            self.db, call, text=text, worker_turn_id=worker_turn_id,
        )
        return turn

    def test_text_detection_is_fast_and_does_not_claim_vader_detects_intent_or_emotion(self):
        result = detect_customer_text("I am frustrated because the pricing sounds expensive.")
        self.assertEqual(result.intent, "pricing")
        self.assertEqual(result.emotion, "frustrated")
        self.assertEqual(result.sentiment, "negative")
        self.assertLess(result.inference_ms, 100)
        self.assertIn("baseline", result.classifier_version)

    def test_campaign_agnostic_intents_do_not_treat_product_words_as_scheduling(self):
        repair = detect_customer_text("my laptop is overheating and I need help repairing it")
        device = detect_customer_text("Okay. So it is HP leadbook")
        complaint = detect_customer_text("I'm extremely frustrated because nobody has fixed my laptop")
        worried = detect_customer_text("I am worried that I might lose all my important files")
        self.assertEqual(repair.intent, "support_request")
        self.assertEqual(device.intent, "unknown")
        self.assertNotEqual(device.intent, "schedule")
        self.assertEqual(complaint.emotion, "frustrated")
        self.assertIn(complaint.intent, {"complaint", "unknown"})
        self.assertEqual(worried.emotion, "uncertain")
        self.assertIn("Clarify in plain language", worried.response_guidance)

    def test_value_and_trust_concerns_are_not_misclassified_as_positive(self):
        result = detect_customer_text("This sounds expensive and I am not convinced it will work.")
        self.assertEqual(result.sentiment, "negative")

    def test_refusal_has_opt_out_precedence_over_purchase_interest(self):
        result = detect_customer_text("Sorry, I am not interested in this call. So bye.")
        self.assertEqual(result.intent, "opt_out")
        self.assertNotEqual(result.emotion, "interested")

    def test_per_turn_persistence_is_idempotent_and_call_isolated(self):
        first = self._customer_turn(self.call, "Can you explain your pricing?", "customer-1")
        record, duplicate = persist_turn_intelligence(self.db, self.call, first)
        same, replay = persist_turn_intelligence(self.db, self.call, first)
        second = self._customer_turn(self.other_call, "Please stop calling me.", "customer-1")
        other, _ = persist_turn_intelligence(self.db, self.other_call, second)
        self.assertFalse(duplicate)
        self.assertTrue(replay)
        self.assertEqual(record.id, same.id)
        self.assertEqual(record.intent, "pricing")
        self.assertEqual(other.intent, "opt_out")
        self.assertEqual(self.db.query(TurnIntelligence).filter(TurnIntelligence.call_id == self.call.id).count(), 1)
        self.assertEqual(self.db.query(TurnIntelligence).filter(TurnIntelligence.call_id == self.other_call.id).count(), 1)

    def test_live_context_uses_only_the_current_calls_latest_cognitive_result(self):
        first = self._customer_turn(self.call, "I am frustrated. Can you repeat that?", "customer-a")
        persist_turn_intelligence(self.db, self.call, first)
        second = self._customer_turn(self.other_call, "Please stop calling me.", "customer-b")
        persist_turn_intelligence(self.db, self.other_call, second)
        context = call_context(self.db, self.call)
        self.assertEqual(context["cognitive"]["intent"], "clarification")
        self.assertEqual(context["cognitive"]["emotion"], "frustrated")
        self.assertNotEqual(context["cognitive"]["intent"], "opt_out")

    def test_aggregate_rebuilds_timeline_and_preserves_existing_analysis_json(self):
        first = self._customer_turn(self.call, "This sounds great, tell me more.", "customer-a")
        persist_turn_intelligence(self.db, self.call, first)
        second = self._customer_turn(self.call, "I am frustrated, the pricing seems expensive.", "customer-b")
        persist_turn_intelligence(self.db, self.call, second)
        self.call.analysis_json = json.dumps({"summary_source": "existing post-call analysis"})
        self.db.commit()
        aggregate = aggregate_call_experience(self.db, self.call)
        rebuilt = aggregate_call_experience(self.db, self.call)
        stored = self.db.get(CallExperience, self.call.id)
        analysis = json.loads(self.db.get(Call, self.call.id).analysis_json)
        timeline = json.loads(stored.sentiment_timeline_json)
        self.assertEqual(aggregate.call_id, rebuilt.call_id)
        self.assertEqual(stored.customer_turn_count, 2)
        self.assertEqual(len(timeline), 2)
        self.assertEqual(analysis["summary_source"], "existing post-call analysis")
        self.assertEqual(analysis["cognitive"]["end_sentiment"], "negative")

    def test_inference_failure_does_not_block_final_transcript_persistence(self):
        with patch("app.api.routes.voice_sessions._require_worker_secret"), patch(
            "app.api.routes.voice_sessions.persist_turn_intelligence", side_effect=RuntimeError("detector unavailable"),
        ):
            context = persist_live_customer_turn(
                self.call.id, {"text": "Can you explain EchoAI?", "turn_id": "failed-intelligence"}, None, self.db,
            )
        self.assertIsNone(context["cognitive"])
        self.assertEqual(self.db.query(CallTurn).filter(CallTurn.call_id == self.call.id).count(), 1)
        self.assertEqual(context["current_node"]["id"], "discovery")

    def test_call_detail_cognitive_data_respects_existing_agent_rbac(self):
        self.call.agent_id = "assigned-agent"
        self.db.commit()
        with self.assertRaises(HTTPException) as blocked:
            get_call(self.call.id, self.db, SimpleNamespace(role="agent", id="different-agent"))
        self.assertEqual(blocked.exception.status_code, 403)
        detail = get_call(self.call.id, self.db, SimpleNamespace(role="agent", id="assigned-agent"))
        self.assertIn("cognitive", detail)
        self.assertIn("intelligence_timeline", detail)

    def test_call_detail_backfills_missing_aggregate_from_persisted_turn_intelligence(self):
        self.call.agent_id = "assigned-agent"
        turn = self._customer_turn(self.call, "I need help with an issue.", "backfill-turn")
        persist_turn_intelligence(self.db, self.call, turn)
        self.assertIsNone(self.db.get(CallExperience, self.call.id))
        detail = get_call(self.call.id, self.db, SimpleNamespace(role="agent", id="assigned-agent"))
        self.assertIsNotNone(detail["cognitive"])
        self.assertEqual(detail["cognitive"]["customer_turn_count"], 1)
        self.assertIsNotNone(self.db.get(CallExperience, self.call.id))
