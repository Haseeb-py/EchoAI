"""Focused Module 5 detection, persistence, context, and aggregate tests."""

import json
import os
import tempfile
import unittest
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models.campaign import Campaign
from app.models.operations import Call, CallState
from app.models.sales import CallSalesSummary, TurnSalesIntelligence
from app.services.live_call_flow import call_context, persist_customer_turn
from app.services.sales_intelligence import aggregate_call_sales_intelligence, detect_sales_decision, persist_turn_sales_intelligence


class SalesIntelligenceTests(unittest.TestCase):
    def setUp(self):
        handle = tempfile.NamedTemporaryFile(suffix=".db", delete=False); handle.close()
        self.path = handle.name
        self.engine = create_engine(f"sqlite:///{self.path}")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine, expire_on_commit=False)
        self.db = self.Session()
        nodes = [{"id": "discovery", "type": "discovery", "goal": "Understand needs", "prompt": "Ask about needs.", "next_node_ids": []}]
        campaign = Campaign(id=str(uuid4()), name="Any campaign", status="active", product="Any product", script_snapshot_json=json.dumps({"content": json.dumps({"nodes": nodes})}))
        self.call = Call(id=str(uuid4()), campaign_id=campaign.id, status="active")
        self.other = Call(id=str(uuid4()), campaign_id=campaign.id, status="active")
        self.db.add_all([campaign, self.call, self.other, CallState(call_id=self.call.id, current_node_id="discovery"), CallState(call_id=self.other.id, current_node_id="discovery")]); self.db.commit()

    def tearDown(self):
        self.db.close(); self.engine.dispose(); os.unlink(self.path)

    def _turn(self, call, text, turn_id):
        return persist_customer_turn(self.db, call, text=text, worker_turn_id=turn_id)[0]

    def test_all_objection_categories_and_unknown_are_generic(self):
        cases = {"This is too expensive for our budget": "price_budget", "I do not trust this": "trust_credibility", "This is not a priority now": "timing_urgency", "I need approval from my manager": "authority_decision_maker", "We already have another solution": "product_service_fit", "I need to think about it": "hesitation_uncertainty", "Please stop calling": "refusal", "The sky is blue": "none"}
        for text, expected in cases.items():
            self.assertEqual(detect_sales_decision(text).objection_type, expected, text)

    def test_interest_is_not_a_confirmed_commitment(self):
        interest = detect_sales_decision("This sounds good, tell me more")
        commitment = detect_sales_decision("Let's proceed, sign me up")
        self.assertEqual(interest.buying_signal, "interest")
        self.assertFalse(interest.commitment_confirmed)
        self.assertEqual(commitment.buying_signal, "commitment")
        self.assertTrue(commitment.commitment_confirmed)

    def test_persistence_is_idempotent_and_call_isolated(self):
        first = self._turn(self.call, "The price is too high", "one")
        record, duplicate = persist_turn_sales_intelligence(self.db, self.call, first)
        same, replay = persist_turn_sales_intelligence(self.db, self.call, first)
        other_turn = self._turn(self.other, "Please stop calling", "one")
        other, _ = persist_turn_sales_intelligence(self.db, self.other, other_turn)
        self.assertFalse(duplicate); self.assertTrue(replay); self.assertEqual(record.id, same.id)
        self.assertEqual(record.objection_type, "price_budget"); self.assertEqual(other.objection_type, "refusal")
        self.assertEqual(self.db.query(TurnSalesIntelligence).filter_by(call_id=self.call.id).count(), 1)

    def test_context_has_only_current_call_strategy_and_aggregate_preserves_analysis(self):
        turn = self._turn(self.call, "I need approval from my manager", "sales-a")
        persist_turn_sales_intelligence(self.db, self.call, turn)
        other = self._turn(self.other, "This is too expensive", "sales-b")
        persist_turn_sales_intelligence(self.db, self.other, other)
        context = call_context(self.db, self.call)
        self.assertEqual(context["sales"]["objection_type"], "authority_decision_maker")
        self.call.analysis_json = json.dumps({"cognitive": {"customer_experience": "at_risk"}}); self.db.commit()
        summary = aggregate_call_sales_intelligence(self.db, self.call)
        self.assertEqual(summary.primary_objection, "authority_decision_maker")
        self.assertIsNotNone(self.db.get(CallSalesSummary, self.call.id))
        self.assertIn("cognitive", json.loads(self.call.analysis_json))

    def test_refusal_strategy_does_not_suggest_script_progression(self):
        decision = detect_sales_decision("Please remove me and stop calling")
        self.assertIn("Respect", decision.recommended_strategy)
        self.assertIn("Do not persuade", decision.recommended_strategy)

    def test_price_and_trust_can_coexist_and_commitment_survives_later_neutral_turns(self):
        decision = detect_sales_decision("The price seems high and how do I know this is reliable?")
        self.assertEqual(decision.objection_type, "price_budget")
        self.assertEqual(set(decision.objection_types), {"price_budget", "trust_credibility"})
        first = self._turn(self.call, "The price seems high and how do I know this is reliable?", "multi")
        persist_turn_sales_intelligence(self.db, self.call, first)
        committed = self._turn(self.call, "I have decided I want to go ahead with the appointment.", "commit")
        persist_turn_sales_intelligence(self.db, self.call, committed)
        neutral = self._turn(self.call, "Okay, thanks.", "neutral")
        persist_turn_sales_intelligence(self.db, self.call, neutral)
        summary = aggregate_call_sales_intelligence(self.db, self.call)
        self.assertTrue(summary.commitment_confirmed)
        self.assertEqual(summary.highest_buying_signal, "commitment")
        self.assertEqual(summary.objection_count, 2)

    def test_generic_marketing_wording_detects_value_trust_and_interest_without_commitment(self):
        value = detect_sales_decision("Your services sound expensive. I do not want to waste my money on something that might not work.")
        self.assertEqual(value.objection_type, "price_budget")
        self.assertIn("trust_credibility", value.objection_types)
        curious = detect_sales_decision("That sounds interesting. I would like to learn more, but I am not ready to commit yet.")
        self.assertEqual(curious.buying_signal, "interest")
        self.assertFalse(curious.commitment_confirmed)
        certain = detect_sales_decision("I've made my decision. I want to go ahead with the consultation.")
        self.assertTrue(certain.commitment_confirmed)

    def test_refusal_never_produces_a_buying_signal(self):
        decision = detect_sales_decision("Sorry, I am not interested in this call. Bye.")
        self.assertEqual(decision.objection_type, "refusal")
        self.assertEqual(decision.buying_signal, "none")
        self.assertFalse(decision.commitment_confirmed)
