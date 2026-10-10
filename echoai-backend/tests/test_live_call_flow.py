"""Focused Module 3B tests for frozen-script stage transitions."""

import json
import os
import tempfile
import unittest
import asyncio
from uuid import uuid4
from unittest.mock import AsyncMock, Mock, patch
from types import SimpleNamespace

import httpx
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.campaign import Campaign
from app.models.operations import Call, CallState, CallTurn, KnowledgeEntry
from app.models.voice_turn_receipt import VoiceTurnReceipt  # register metadata
from app.models.voice_session import VoiceSession
from app.services.live_call_flow import call_context, persist_ai_turn, persist_customer_turn
from app.api.routes.voice_sessions import _start_worker, end_voice_session, get_live_voice_session
from app.api.routes.voice import complete_analysis
from app.api.routes.operations import recover_orphaned_call
from app.services.voice_adapter import VoiceProviderError
NODES = [
    {"id": "opening", "type": "opening", "goal": "Introduce the call", "prompt": "Introduce.", "next_node_ids": ["discovery"]},
    {"id": "discovery", "type": "discovery", "goal": "Understand current workflow", "prompt": "Ask workflow.", "next_node_ids": ["pitch", "follow_up"]},
    {"id": "pitch", "type": "pitch", "goal": "Gain interest", "prompt": "Explain value.", "next_node_ids": ["closing"]},
    {"id": "follow_up", "type": "pitch", "goal": "Gain interest", "prompt": "Offer follow-up.", "next_node_ids": ["closing"]},
    {"id": "closing", "type": "closing", "goal": "Confirm next step", "prompt": "Confirm booking.", "next_node_ids": []},
]


class LiveCallFlowTests(unittest.TestCase):
    def setUp(self):
        handle = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        handle.close()
        self.path = handle.name
        self.engine = create_engine(f"sqlite:///{self.path}")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db = self.Session()
        snapshot = json.dumps({"content": json.dumps({"nodes": NODES})})
        self.campaign = Campaign(id=str(uuid4()), name="Frozen campaign", status="active", script_snapshot_json=snapshot)
        self.call = Call(id=str(uuid4()), campaign_id=self.campaign.id, status="active")
        self.state = CallState(call_id=self.call.id, current_node_id="discovery")
        self.other_call = Call(id=str(uuid4()), campaign_id=self.campaign.id, status="active")
        self.other_state = CallState(call_id=self.other_call.id, current_node_id="discovery")
        self.db.add_all([self.campaign, self.call, self.state, self.other_call, self.other_state])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()
        os.unlink(self.path)

    def _persist(self, text, turn_id, *, next_node_id=None, call=None):
        return persist_customer_turn(
            self.db, call or self.call, text=text, worker_turn_id=turn_id,
            requested_next_node_id=next_node_id,
        )

    def test_goal_evidence_discovery_answer_advances_on_declared_edge(self):
        _, transition, duplicate = self._persist("Our team currently tracks every lead in spreadsheets.", "turn-1", next_node_id="pitch")
        self.assertFalse(duplicate)
        self.assertTrue(transition.advanced)
        self.assertEqual(transition.current_node_id, "pitch")
        self.assertEqual(self.db.get(CallState, self.call.id).current_node_id, "pitch")

    def test_clarification_incomplete_answer_and_objection_do_not_advance(self):
        for number, text in enumerate(("Can you explain what you mean?", "Maybe.", "Not sure.", "I don't know.", "We are not interested right now."), start=1):
            _, transition, _ = self._persist(text, f"hold-{number}")
            self.assertFalse(transition.advanced, text)
            self.assertEqual(self.db.get(CallState, self.call.id).current_node_id, "discovery")

    def test_duplicate_worker_turn_is_idempotent_but_repeated_words_are_not(self):
        self._persist("We track all leads manually in several spreadsheets.", "same-turn")
        _, duplicate_transition, duplicate = self._persist("We track all leads manually in several spreadsheets.", "same-turn")
        self.assertTrue(duplicate)
        self.assertFalse(duplicate_transition.advanced)
        self.assertEqual(self.db.query(CallTurn).filter(CallTurn.call_id == self.call.id).count(), 1)

        # Identical text with a new STT turn id is a real later utterance.
        _, later_transition, duplicate = self._persist("We track all leads manually in several spreadsheets.", "new-turn")
        self.assertFalse(duplicate)
        self.assertFalse(later_transition.advanced)  # pitch requires interest, not a repeated discovery answer
        self.assertEqual(self.db.query(CallTurn).filter(CallTurn.call_id == self.call.id).count(), 2)

    def test_valid_requested_branch_is_used_and_invalid_branch_is_rejected(self):
        _, transition, _ = self._persist(
            "Our process uses spreadsheets, email, and manual follow-ups every day.", "branch-good", next_node_id="follow_up",
        )
        self.assertTrue(transition.advanced)
        self.assertEqual(self.db.get(CallState, self.call.id).current_node_id, "follow_up")

        self.db.get(CallState, self.other_call.id).current_node_id = "discovery"
        self.db.commit()
        _, rejected, _ = self._persist(
            "Our process uses spreadsheets, email, and manual follow-ups every day.", "branch-bad", next_node_id="closing", call=self.other_call,
        )
        self.assertFalse(rejected.advanced)
        self.assertEqual(self.db.get(CallState, self.other_call.id).current_node_id, "discovery")

    def test_unrelated_four_word_discovery_answer_does_not_advance(self):
        _, transition, _ = self._persist("The weather is nice today.", "unrelated")
        self.assertFalse(transition.advanced)
        self.assertEqual(self.db.get(CallState, self.call.id).current_node_id, "discovery")
    def test_ambiguous_discovery_branch_does_not_default_to_first_edge(self):
        _, transition, _ = self._persist("We use spreadsheets to track leads manually.", "ambiguous")
        self.assertFalse(transition.advanced)
        self.assertEqual(transition.reason, "branch intent is ambiguous")
        self.assertEqual(self.db.get(CallState, self.call.id).current_node_id, "discovery")

    def test_call_context_returns_approved_campaign_knowledge(self):
        self.db.add(KnowledgeEntry(
            id=str(uuid4()), campaign_id=self.campaign.id, title="Pilot facts", category="faq",
            content="EchoAI automates voice sales and support conversations.", status="published",
        ))
        self.db.commit()
        self._persist("What is EchoAI?", "knowledge-question")
        context = call_context(self.db, self.call)
        self.assertEqual(context["approved_knowledge"][0]["title"], "Pilot facts")

    def test_worker_uses_frozen_persona_when_available(self):
        self.campaign.persona_id = "persona-now"
        self.campaign.persona_snapshot_json = json.dumps({
            "id": "persona-frozen", "name": "Friendly pilot", "tone": "warm",
            "description": "Use calm, helpful language.",
        })
        session = VoiceSession(id=str(uuid4()), call_id=self.call.id, room_name="room", participant_identity="agent")
        self.db.add(session)
        self.db.commit()
        response = Mock()
        response.raise_for_status = Mock()
        capability = Mock()
        capability.raise_for_status = Mock()
        capability.json.return_value = {"worker_api_version": "module-3b-context-v1"}
        with patch("app.api.routes.voice_sessions.settings", SimpleNamespace(voice_worker_url="http://worker", voice_worker_secret="secret")), \
             patch("app.api.routes.voice_sessions.httpx.get", return_value=capability), \
             patch("app.api.routes.voice_sessions.httpx.post", return_value=response) as post:
            _start_worker(self.call, session, self.db)
        sent = post.call_args.kwargs["json"]["persona"]
        self.assertEqual(sent["id"], "persona-frozen")
        self.assertIn("Friendly pilot", sent["system_prompt"])
        self.assertIn("warm", sent["system_prompt"])

    def test_confirmed_worker_start_failure_closes_call_and_session(self):
        self.call.agent_id = "agent-1"
        session = VoiceSession(id=str(uuid4()), call_id=self.call.id, room_name="room", participant_identity="agent")
        self.db.add(session)
        self.db.commit()
        with patch("app.api.routes.voice_sessions.settings", SimpleNamespace(voice_worker_url="http://worker", voice_worker_secret="secret")), \
             patch("app.api.routes.voice_sessions.httpx.get", side_effect=httpx.ConnectError("worker unavailable")):
            with self.assertRaises(HTTPException) as raised:
                _start_worker(self.call, session, self.db)
        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(self.db.get(Call, self.call.id).status, "disconnected")
        self.assertEqual(self.db.get(VoiceSession, session.id).status, "worker_failed")

    def test_confirmed_missing_live_worker_session_closes_call(self):
        self.call.agent_id = "agent-1"
        session = VoiceSession(id=str(uuid4()), call_id=self.call.id, room_name="room", participant_identity="agent", status="active")
        self.db.add(session)
        self.db.commit()
        user = SimpleNamespace(role="agent", id="agent-1")
        missing = Mock(status_code=404)
        with patch("app.api.routes.voice_sessions.settings", SimpleNamespace(voice_worker_url="http://worker", voice_worker_secret="secret")), \
             patch("app.api.routes.voice_sessions.httpx.get", return_value=missing):
            with self.assertRaises(HTTPException) as raised:
                get_live_voice_session(self.call.id, 0, self.db, user)
        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(self.db.get(Call, self.call.id).status, "disconnected")
        self.assertEqual(self.db.get(VoiceSession, session.id).status, "ended")

    def test_intentional_disconnect_is_terminal_and_idempotent(self):
        self.call.agent_id = "agent-1"
        session = VoiceSession(id=str(uuid4()), call_id=self.call.id, room_name="room", participant_identity="agent")
        self.db.add(session)
        self.db.commit()
        user = SimpleNamespace(role="agent", id="agent-1")
        with patch("app.api.routes.voice_sessions._end_worker") as end_worker:
            first = end_voice_session(self.call.id, self.db, user)
            second = end_voice_session(self.call.id, self.db, user)
        self.assertEqual(first.status, "ended")
        self.assertEqual(second.status, "ended")
        self.assertEqual(self.db.get(Call, self.call.id).status, "disconnected")
        self.assertEqual(self.db.get(VoiceSession, session.id).status, "ended")
        self.assertEqual(end_worker.call_count, 2)

    def test_complete_call_is_terminal_when_post_call_analysis_fails(self):
        self.call.agent_id = "agent-1"
        session = VoiceSession(id=str(uuid4()), call_id=self.call.id, room_name="room", participant_identity="agent")
        self.db.add(session)
        self.db.commit()
        user = SimpleNamespace(role="agent", id="agent-1")

        with patch("app.api.routes.voice.analyze_call", new=AsyncMock(side_effect=VoiceProviderError("analysis unavailable"))), \
             patch("app.api.routes.voice.settings", SimpleNamespace(voice_worker_url="", voice_worker_secret="")):
            result = asyncio.run(complete_analysis(self.call.id, self.db, user))

        self.assertEqual(result["status"], "completed")
        self.assertEqual(self.db.get(Call, self.call.id).status, "completed")
        self.assertIsNotNone(self.db.get(Call, self.call.id).completed_at)
        self.assertEqual(self.db.get(VoiceSession, session.id).status, "ended")

    def test_confirmed_missing_worker_session_can_be_safely_recovered(self):
        self.call.agent_id = "agent-1"
        session = VoiceSession(id=str(uuid4()), call_id=self.call.id, room_name="room", participant_identity="agent", status="active")
        self.db.add(session)
        self.db.commit()
        user = SimpleNamespace(role="agent", id="agent-1")
        missing = Mock(status_code=404)

        with patch("app.api.routes.operations.settings", SimpleNamespace(voice_worker_url="http://worker", voice_worker_secret="secret")), \
             patch("app.api.routes.operations.httpx.get", return_value=missing) as worker_get:
            result = recover_orphaned_call(self.call.id, self.db, user)

        self.assertTrue(result["recovered"])
        self.assertEqual(self.db.get(Call, self.call.id).status, "disconnected")
        self.assertEqual(self.db.get(VoiceSession, session.id).status, "ended")
        self.assertEqual(worker_get.call_count, 1)

    def test_same_agent_campaigns_have_isolated_call_context_and_history(self):
        second_nodes = [{"id": "b-opening", "type": "opening", "goal": "Introduce Product B", "prompt": "Product B greeting.", "next_node_ids": ["b-discovery"]}, {"id": "b-discovery", "type": "discovery", "goal": "Ask B agents", "prompt": "Ask B only.", "next_node_ids": []}]
        campaign_b = Campaign(id=str(uuid4()), name="Campaign B", status="active", product="Product B", script_snapshot_json=json.dumps({"content": json.dumps({"nodes": second_nodes})}))
        call_b = Call(id=str(uuid4()), campaign_id=campaign_b.id, agent_id="same-agent", status="active")
        state_b = CallState(call_id=call_b.id, current_node_id="b-discovery")
        self.call.agent_id = "same-agent"
        self.db.add_all([campaign_b, call_b, state_b])
        self.db.commit()
        persist_customer_turn(self.db, self.call, text="Campaign A history", worker_turn_id="a-1")
        context_b = call_context(self.db, call_b)
        self.assertEqual(context_b["campaign"]["product"], "Product B")
        self.assertEqual(context_b["current_node"]["id"], "b-discovery")
        self.assertEqual(context_b["history"], [])

    def test_calls_are_isolated(self):
        self._persist("We manage sales through spreadsheets and follow-up emails.", "call-one", next_node_id="pitch")
        self.assertEqual(self.db.get(CallState, self.call.id).current_node_id, "pitch")
        self.assertEqual(self.db.get(CallState, self.other_call.id).current_node_id, "discovery")

    def test_audio_completed_ai_turn_is_idempotent_and_marks_opening_delivery(self):
        self.db.get(CallState, self.call.id).current_node_id = "opening"
        self.db.commit()
        turn, duplicate = persist_ai_turn(
            self.db, self.call, text="Hello, I am calling about EchoAI.", worker_turn_id="0",
        )
        self.assertFalse(duplicate)
        repeated, duplicate = persist_ai_turn(
            self.db, self.call, text="Hello, I am calling about EchoAI.", worker_turn_id="0",
        )
        self.assertTrue(duplicate)
        self.assertEqual(repeated.id, turn.id)
        self.assertTrue(call_context(self.db, self.call)["opening_delivered"])
        self.assertEqual(self.db.get(CallState, self.call.id).current_node_id, "discovery")
