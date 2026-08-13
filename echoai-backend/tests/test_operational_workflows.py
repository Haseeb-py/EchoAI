import os
import json
import tempfile
import unittest
from uuid import uuid4
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.deps import get_current_user, get_db, require_admin
from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import engine as app_engine
from app.main import app
from app.models.campaign import Campaign
from app.models.operations import Lead
from app.models.user import User
from app.services.voice_adapter import VoiceProviderError, parse_analysis_response


class OperationalWorkflowTests(unittest.TestCase):
    """Core lifecycle tests run against a disposable SQLite database."""

    def setUp(self):
        handle = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        handle.close()
        self.database_path = handle.name
        self.engine = create_engine(f"sqlite:///{self.database_path}", connect_args={"check_same_thread": False})
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(autocommit=False, autoflush=False, bind=self.engine, expire_on_commit=False)
        session = self.Session()
        self.admin = User(id=str(uuid4()), name="Admin", email="admin@example.com", hashed_password=hash_password("test-pass"), role="admin")
        self.supervisor = User(id=str(uuid4()), name="Supervisor", email="supervisor@example.com", hashed_password=hash_password("test-pass"), role="supervisor")
        self.agent = User(id=str(uuid4()), name="Agent", email="agent@example.com", hashed_password=hash_password("test-pass"), role="agent")
        self.active_campaign = Campaign(id=str(uuid4()), name="Active Campaign", status="active")
        self.draft_campaign = Campaign(id=str(uuid4()), name="Draft Campaign", status="draft")
        self.lead = Lead(
            id=str(uuid4()), campaign_id=self.active_campaign.id, name="Test Lead",
            contact="lead@example.com", assigned_agent_id=self.agent.id,
        )
        session.add_all([self.admin, self.supervisor, self.agent, self.active_campaign, self.draft_campaign, self.lead])
        session.commit()
        session.close()
        self.current_user = self.admin

        def override_db():
            db = self.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        app.dependency_overrides[get_current_user] = lambda: self.current_user
        app.dependency_overrides[require_admin] = lambda: self.current_user if self.current_user.role == "admin" else self._forbidden_admin()
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        self.client.close()
        self.engine.dispose()
        app_engine.dispose()
        os.unlink(self.database_path)

    @staticmethod
    def _forbidden_admin():
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")

    def test_calls_require_active_campaign_and_completion_updates_lead(self):
        rejected = self.client.post("/api/calls", json={"campaign_id": self.draft_campaign.id})
        self.assertEqual(rejected.status_code, 409)

        created = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(created.status_code, 201)
        call_id = created.json()["id"]

        completed = self.client.post(f"/api/calls/{call_id}/complete", json={
            "outcome": "converted",
            "summary": "Lead accepted the proposal.",
            "analysis": {
                "start_sentiment": "neutral", "end_sentiment": "positive", "overall_sentiment": "positive",
                "intent": "purchase", "toxic_language": [{"phrase": "bad service", "speaker": "customer"}],
                "objections": ["price"],
                "extracted_lead_details": {"contact_details": [], "stated_needs": ["proposal"], "timeline": "", "budget_context": "", "decision_maker_context": ""},
            },
            "follow_up_recommendation": "Send onboarding details.",
        })
        self.assertEqual(completed.status_code, 200)

        lead = self.client.get(f"/api/agent/leads/{self.lead.id}")
        self.assertEqual(lead.status_code, 200)
        self.assertEqual(lead.json()["status"], "converted")
        self.assertEqual(lead.json()["calls"][0]["summary"], "Lead accepted the proposal.")
        report = self.client.get("/api/admin/reports/calls.csv")
        self.assertEqual(report.status_code, 200)
        self.assertIn("bad service", report.text)

    def test_lead_cannot_have_multiple_active_calls(self):
        first = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(first.status_code, 201)
        second = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(second.status_code, 409)
        self.assertIn("already has an active call", second.json()["detail"])

    def test_campaign_history_cannot_be_deleted(self):
        response = self.client.delete(f"/api/admin/campaigns/{self.active_campaign.id}")
        self.assertEqual(response.status_code, 409)
        self.assertIn("retained", response.json()["detail"].lower())

    def test_closed_campaign_configuration_is_read_only(self):
        self.assertEqual(self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/complete").status_code, 200)
        updated = self.client.put(f"/api/admin/campaigns/{self.active_campaign.id}", json={"goal": "Changed historical goal"})
        self.assertEqual(updated.status_code, 409)
        self.assertIn("read-only", updated.json()["detail"])
        self.assertEqual(self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/archive").status_code, 200)
        self.assertEqual(
            self.client.put(f"/api/admin/campaigns/{self.active_campaign.id}", json={"name": "Changed archive"}).status_code,
            409,
        )

    def test_closed_campaign_leads_are_read_only(self):
        self.assertEqual(self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/complete").status_code, 200)
        created = self.client.post("/api/admin/leads", json={
            "campaign_id": self.active_campaign.id, "name": "Late lead", "contact": "late@example.com",
        })
        self.assertEqual(created.status_code, 409)
        updated = self.client.put(f"/api/admin/leads/{self.lead.id}", json={"status": "follow_up"})
        self.assertEqual(updated.status_code, 409)

    def test_knowledge_scope_is_validated_and_closed_campaign_history_is_read_only(self):
        entry = self.client.post("/api/knowledge", json={
            "campaign_id": self.active_campaign.id, "title": "Campaign FAQ", "category": "faq",
            "content": "Current campaign guidance.", "status": "published",
        })
        self.assertEqual(entry.status_code, 201)
        self.assertEqual(
            self.client.put(f"/api/knowledge/{entry.json()['id']}", json={"campaign_id": str(uuid4())}).status_code,
            404,
        )
        self.assertEqual(self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/complete").status_code, 200)
        self.assertEqual(
            self.client.put(f"/api/knowledge/{entry.json()['id']}", json={"content": "Changed guidance."}).status_code,
            409,
        )
        self.assertEqual(self.client.delete(f"/api/knowledge/{entry.json()['id']}").status_code, 409)
        self.assertEqual(
            self.client.post("/api/knowledge", json={
                "campaign_id": self.active_campaign.id, "title": "Late FAQ", "category": "faq",
                "content": "This must not change history.", "status": "published",
            }).status_code,
            409,
        )

    def test_campaign_activation_requires_active_script_and_persona(self):
        draft = self.client.post("/api/admin/campaigns", json={
            "name": "Readiness Gate Campaign", "product": "EchoAI", "audience": "Sales teams",
            "goal": "Book a demo", "context": "Use approved product facts only.",
        })
        self.assertEqual(draft.status_code, 201)
        blocked = self.client.post(f"/api/admin/campaigns/{draft.json()['id']}/activate")
        self.assertEqual(blocked.status_code, 409)
        self.assertIn("script and persona", blocked.json()["detail"])

        script = self.client.post("/api/admin/scripts", json={
            "title": "Activation script", "summary": "Ready for activation",
            "content": "Opening node with a clear goal and follow-up pitch instructions for a valid campaign script.",
        })
        persona = self.client.post("/api/admin/personas", json={
            "name": "Professional", "tone": "Clear", "description": "A clear professional persona.",
        })
        self.assertEqual(script.status_code, 201)
        self.assertEqual(persona.status_code, 201)
        attached = self.client.put(f"/api/admin/campaigns/{draft.json()['id']}", json={
            "script_id": script.json()["id"], "persona_id": persona.json()["id"],
        })
        self.assertEqual(attached.status_code, 200)
        blocked_legacy_script = self.client.post(f"/api/admin/campaigns/{draft.json()['id']}/activate")
        self.assertEqual(blocked_legacy_script.status_code, 409)
        self.assertIn("node-based", blocked_legacy_script.json()["detail"])
        valid_content = json.dumps({"nodes": [
            {"id": "opening", "type": "opening", "goal": "Introduce", "prompt": "Introduce the call.", "next_node_ids": ["closing"]},
            {"id": "closing", "type": "closing", "goal": "Confirm next step", "prompt": "Ask for the next step.", "next_node_ids": []},
        ]})
        updated_script = self.client.put(f"/api/admin/scripts/{script.json()['id']}", json={"content": valid_content})
        self.assertEqual(updated_script.status_code, 200)
        activated = self.client.post(f"/api/admin/campaigns/{draft.json()['id']}/activate")
        self.assertEqual(activated.status_code, 200)
        self.assertEqual(activated.json()["status"], "active")
        self.assertEqual(
            self.client.put(f"/api/admin/scripts/{script.json()['id']}", json={"is_active": False}).status_code,
            409,
        )
        self.assertEqual(
            self.client.put(f"/api/admin/personas/{persona.json()['id']}", json={"is_active": False}).status_code,
            409,
        )
        self.assertEqual(
            self.client.put(f"/api/admin/scripts/{script.json()['id']}", json={"content": valid_content}).status_code,
            409,
        )
        self.assertEqual(
            self.client.put(f"/api/admin/personas/{persona.json()['id']}", json={"tone": "Warm"}).status_code,
            409,
        )
        self.assertEqual(
            self.client.put(f"/api/admin/campaigns/{draft.json()['id']}", json={"goal": "Changed live goal"}).status_code,
            409,
        )
        self.assertEqual(
            self.client.post(f"/api/admin/scripts/{script.json()['id']}/objections", json={
                "category": "price", "trigger_terms": ["price"], "approved_response": "Approved response.",
            }).status_code,
            409,
        )
        paused = self.client.post(f"/api/admin/campaigns/{draft.json()['id']}/pause")
        self.assertEqual(paused.status_code, 200)
        self.assertEqual(
            self.client.put(f"/api/admin/campaigns/{draft.json()['id']}", json={"goal": "Changed paused goal"}).status_code,
            200,
        )

    def test_campaign_references_protect_scripts_and_personas_from_deletion(self):
        script = self.client.post("/api/admin/scripts", json={
            "title": "Retained script", "summary": "Campaign history dependency",
            "content": "A sufficiently long script body retained for historical campaign inspection and audit review.",
        })
        persona = self.client.post("/api/admin/personas", json={
            "name": "Retained persona", "tone": "Helpful", "description": "Campaign history dependency.",
        })
        self.assertEqual(script.status_code, 201)
        self.assertEqual(persona.status_code, 201)
        linked = self.client.put(f"/api/admin/campaigns/{self.draft_campaign.id}", json={
            "script_id": script.json()["id"], "persona_id": persona.json()["id"],
        })
        self.assertEqual(linked.status_code, 200)
        self.assertEqual(self.client.delete(f"/api/admin/scripts/{script.json()['id']}").status_code, 409)
        self.assertEqual(self.client.delete(f"/api/admin/personas/{persona.json()['id']}").status_code, 409)

    def test_campaign_rejects_dangling_script_and_persona_references(self):
        missing_script = self.client.post("/api/admin/campaigns", json={
            "name": "Broken Script Reference", "script_id": str(uuid4()),
        })
        self.assertEqual(missing_script.status_code, 404)
        missing_persona = self.client.put(f"/api/admin/campaigns/{self.draft_campaign.id}", json={"persona_id": str(uuid4())})
        self.assertEqual(missing_persona.status_code, 404)

    def test_agents_only_read_global_and_assigned_campaign_knowledge(self):
        session = self.Session()
        other_campaign = Campaign(id=str(uuid4()), name="Other Campaign", status="draft")
        session.add(other_campaign)
        session.commit()
        session.close()
        assigned_entry = self.client.post("/api/knowledge", json={
            "campaign_id": self.active_campaign.id, "title": "Assigned campaign", "category": "faq",
            "content": "Knowledge for the assigned campaign.", "status": "published",
        })
        other_entry = self.client.post("/api/knowledge", json={
            "campaign_id": other_campaign.id, "title": "Other campaign", "category": "faq",
            "content": "Knowledge for a different campaign.", "status": "published",
        })
        global_entry = self.client.post("/api/knowledge", json={
            "title": "Global knowledge", "category": "faq", "content": "Knowledge available everywhere.", "status": "published",
        })
        self.assertEqual(assigned_entry.status_code, 201)
        self.assertEqual(other_entry.status_code, 201)
        self.assertEqual(global_entry.status_code, 201)

        self.current_user = self.agent
        visible = self.client.get("/api/knowledge")
        self.assertEqual(visible.status_code, 200)
        visible_ids = {item["id"] for item in visible.json()}
        self.assertIn(assigned_entry.json()["id"], visible_ids)
        self.assertIn(global_entry.json()["id"], visible_ids)
        self.assertNotIn(other_entry.json()["id"], visible_ids)
        self.assertEqual(self.client.get(f"/api/knowledge?campaign_id={other_campaign.id}").status_code, 403)

    def test_completing_campaign_stops_live_calls_but_preserves_history(self):
        created = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(created.status_code, 201)
        call_id = created.json()["id"]

        completed_campaign = self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/complete")
        self.assertEqual(completed_campaign.status_code, 200)
        self.assertEqual(completed_campaign.json()["status"], "completed")

        call = self.client.get(f"/api/calls/{call_id}")
        self.assertEqual(call.status_code, 200)
        self.assertEqual(call.json()["status"], "stopped")
        self.assertEqual(call.json()["outcome"], "campaign_ended")
        self.assertTrue(call.json()["completed_at"])

        turn = self.client.post(
            f"/api/calls/{call_id}/turns",
            json={"campaign_id": self.active_campaign.id, "sequence": 1, "speaker": "customer", "transcript": "Can you hear me?"},
        )
        self.assertEqual(turn.status_code, 404)

    def test_paused_campaign_blocks_new_calls_but_allows_live_call_to_finish(self):
        created = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(created.status_code, 201)
        call_id = created.json()["id"]
        paused = self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/pause")
        self.assertEqual(paused.status_code, 200)
        self.assertEqual(paused.json()["status"], "paused")
        self.assertEqual(
            self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id}).status_code,
            409,
        )
        turn = self.client.post(f"/api/calls/{call_id}/turns", json={
            "campaign_id": self.active_campaign.id, "sequence": 1, "speaker": "customer", "transcript": "Please continue.",
        })
        self.assertEqual(turn.status_code, 200)
        completed = self.client.post(f"/api/calls/{call_id}/complete", json={"outcome": "completed"})
        self.assertEqual(completed.status_code, 200)

    def test_supervisor_preferences_are_role_protected_and_persisted(self):
        self.current_user = self.agent
        forbidden = self.client.get("/api/supervisor/preferences")
        self.assertEqual(forbidden.status_code, 403)

        self.current_user = self.supervisor
        initial = self.client.get("/api/supervisor/preferences")
        self.assertEqual(initial.status_code, 200)
        saved = self.client.put("/api/supervisor/preferences", json={
            "refresh_seconds": 30,
            "alert_sounds_enabled": False,
            "in_app_notifications_enabled": True,
            "default_landing_route": "/supervisor/escalations",
        })
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["refresh_seconds"], 30)
        self.assertFalse(saved.json()["alert_sounds_enabled"])

    def test_admin_account_updates_create_security_audit_events(self):
        updated = self.client.put(f"/api/admin/users/{self.agent.id}", json={"status": "inactive"})
        self.assertEqual(updated.status_code, 200)
        events = self.client.get("/api/admin/users/events")
        self.assertEqual(events.status_code, 200)
        self.assertTrue(any(
            event["event"] == "Account status changed" and event["user_email"] == self.agent.email
            for event in events.json()
        ))

    def test_inactive_account_cannot_reuse_an_existing_token(self):
        token = create_access_token(subject=self.agent.id, role=self.agent.role)
        session = self.Session()
        user = session.query(User).filter(User.id == self.agent.id).first()
        user.status = "inactive"
        session.commit()
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        with self.assertRaises(HTTPException) as error:
            get_current_user(credentials, session)
        self.assertEqual(error.exception.status_code, 403)
        self.assertEqual(error.exception.detail, "Account is not active")
        session.close()

    def test_final_active_admin_cannot_be_disabled_or_demoted(self):
        disabled = self.client.put(f"/api/admin/users/{self.admin.id}", json={"status": "inactive"})
        self.assertEqual(disabled.status_code, 409)
        demoted = self.client.put(f"/api/admin/users/{self.admin.id}", json={"role": "supervisor"})
        self.assertEqual(demoted.status_code, 409)

    def test_post_call_analysis_parser_accepts_fenced_json_and_rejects_invalid_shapes(self):
        valid_analysis = {
            "summary": "Clear outcome", "start_sentiment": "neutral", "end_sentiment": "positive",
            "overall_sentiment": "positive", "intent": "purchase", "outcome": "converted",
            "toxic_language": [], "objections": ["price"], "extracted_lead_details": {"contact_details": [], "stated_needs": ["proposal"], "timeline": "", "budget_context": "", "decision_maker_context": ""}, "follow_up_recommendation": "Send details.",
        }
        self.assertEqual(
            parse_analysis_response(f"```json\n{json.dumps(valid_analysis)}\n```"),
            valid_analysis,
        )
        with self.assertRaises(VoiceProviderError):
            parse_analysis_response("  {\"overall_sentiment\": \"positive\"}  ")
        with self.assertRaises(VoiceProviderError):
            parse_analysis_response("[\"not\", \"an object\"]")

    def test_temporary_voice_bridge_persists_customer_ai_and_post_call_analysis(self):
        created = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(created.status_code, 201)
        call_id = created.json()["id"]
        analysis = {
            "summary": "Customer requested a proposal.", "start_sentiment": "neutral", "end_sentiment": "positive",
            "overall_sentiment": "positive", "intent": "purchase", "outcome": "converted",
            "toxic_language": [], "objections": ["price"], "extracted_lead_details": {"contact_details": [], "stated_needs": ["proposal"], "timeline": "", "budget_context": "", "decision_maker_context": ""}, "follow_up_recommendation": "Send the proposal.",
        }
        with patch("app.api.routes.voice.generate_reply", new=AsyncMock(return_value="I can share a proposal.")), \
             patch("app.api.routes.voice.synthesize_audio", new=AsyncMock(return_value="ZmFrZS1hdWRpbw==")), \
             patch("app.api.routes.voice.analyze_call", new=AsyncMock(return_value=analysis)):
            turn = self.client.post(f"/api/voice/calls/{call_id}/text-turn", json={
                "campaign_id": self.active_campaign.id, "sequence": 0, "transcript": "Can you send a proposal?",
            })
            self.assertEqual(turn.status_code, 200)
            self.assertEqual(turn.json()["reply"], "I can share a proposal.")
            self.assertEqual(turn.json()["next_customer_sequence"], 2)
            completed = self.client.post(f"/api/voice/calls/{call_id}/complete-analysis")
            self.assertEqual(completed.status_code, 200)

        persisted = self.client.get(f"/api/calls/{call_id}")
        self.assertEqual(persisted.status_code, 200)
        self.assertEqual(persisted.json()["status"], "completed")
        self.assertEqual([turn["speaker"] for turn in persisted.json()["turns"]], ["customer", "ai"])
        self.assertEqual(persisted.json()["analysis"]["overall_sentiment"], "positive")

    def test_admin_system_settings_persist_and_enforce_call_limit(self):
        saved = self.client.put("/api/admin/settings", json={
            "workspace_name": "Test Workspace", "max_concurrent_calls": 1,
            "default_language": "English", "environment_mode": "Demo",
        })
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["max_concurrent_calls"], 1)
        self.assertNotIn("api_key", str(saved.json()).lower())

        first = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(first.status_code, 201)
        second = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(second.status_code, 409)

    def test_admin_can_create_and_assign_a_lead_to_an_agent(self):
        created = self.client.post("/api/admin/leads", json={
            "campaign_id": self.active_campaign.id, "name": "Assigned Lead",
            "contact": "assigned@example.com", "assigned_agent_id": self.agent.id,
        })
        self.assertEqual(created.status_code, 201)
        leads = self.client.get("/api/agent/leads")
        self.assertEqual(leads.status_code, 200)
        self.assertTrue(any(lead["id"] == created.json()["id"] for lead in leads.json()))

    def test_lead_assignment_rejects_inactive_agents(self):
        self.client.put(f"/api/admin/users/{self.agent.id}", json={"status": "inactive"})
        rejected = self.client.post("/api/admin/leads", json={
            "campaign_id": self.active_campaign.id, "name": "Inactive Assignment",
            "contact": "inactive-assignment@example.com", "assigned_agent_id": self.agent.id,
        })
        self.assertEqual(rejected.status_code, 422)
        self.assertIn("active agent", rejected.json()["detail"])

    def test_turn_uses_campaign_knowledge_objection_guidance_and_escalation_workflow(self):
        script_content = json.dumps({"nodes": [
            {"id": "opening", "type": "opening", "goal": "Introduce", "prompt": "Introduce the offer.", "next_node_ids": ["pitch"]},
            {"id": "pitch", "type": "pitch", "goal": "Explain value", "prompt": "Explain value.", "next_node_ids": []},
        ]})
        script = self.client.post("/api/admin/scripts", json={
            "title": "Test node script", "content": script_content, "summary": "Node-based test script",
        })
        persona = self.client.post("/api/admin/personas", json={
            "name": "Test persona", "tone": "Helpful", "description": "A concise testing persona.",
        })
        self.assertEqual(script.status_code, 201)
        self.assertEqual(persona.status_code, 201)
        paused = self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/pause")
        self.assertEqual(paused.status_code, 200)
        attached = self.client.put(f"/api/admin/campaigns/{self.active_campaign.id}", json={
            "script_id": script.json()["id"], "persona_id": persona.json()["id"],
            "product": "EchoAI", "audience": "Sales teams", "goal": "Book a demo", "context": "Use approved facts only.",
        })
        self.assertEqual(attached.status_code, 200)
        objection = self.client.post(f"/api/admin/scripts/{script.json()['id']}/objections", json={
            "category": "price", "trigger_terms": ["price"], "approved_response": "The price includes onboarding support.",
        })
        self.assertEqual(objection.status_code, 201)
        reactivated = self.client.post(f"/api/admin/campaigns/{self.active_campaign.id}/activate")
        self.assertEqual(reactivated.status_code, 200)
        global_knowledge = self.client.post("/api/knowledge", json={
            "title": "Global price guidance", "category": "faq", "content": "Price guidance from global knowledge.", "status": "published",
        })
        campaign_knowledge = self.client.post("/api/knowledge", json={
            "campaign_id": self.active_campaign.id, "title": "Campaign price guidance", "category": "faq",
            "content": "Price guidance for this campaign.", "status": "published",
        })
        self.assertEqual(global_knowledge.status_code, 201)
        self.assertEqual(campaign_knowledge.status_code, 201)

        created = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(created.status_code, 201)
        out_of_order = self.client.post(f"/api/calls/{created.json()['id']}/turns", json={
            "campaign_id": self.active_campaign.id, "sequence": 3, "speaker": "customer",
            "transcript": "This should be rejected before changing call state.",
        })
        self.assertEqual(out_of_order.status_code, 422)
        turn = self.client.post(f"/api/calls/{created.json()['id']}/turns", json={
            "campaign_id": self.active_campaign.id, "sequence": 1, "speaker": "customer",
            "transcript": "The price is too high; I need a human supervisor.",
        })
        self.assertEqual(turn.status_code, 200)
        self.assertEqual(turn.json()["next_sequence"], 2)
        self.assertEqual(turn.json()["approved_objection_response"], "The price includes onboarding support.")
        self.assertEqual(turn.json()["retrieval_context"][0]["id"], campaign_knowledge.json()["id"])
        self.assertIn("Customer requested human", turn.json()["escalation"]["reason"])

        repeated_turn = self.client.post(f"/api/calls/{created.json()['id']}/turns", json={
            "campaign_id": self.active_campaign.id, "sequence": 2, "speaker": "customer",
            "transcript": "I still need a human supervisor.",
        })
        self.assertEqual(repeated_turn.status_code, 200)
        self.assertEqual(repeated_turn.json()["escalation"]["id"], turn.json()["escalation"]["id"])
        duplicate_turn = self.client.post(f"/api/calls/{created.json()['id']}/turns", json={
            "campaign_id": self.active_campaign.id, "sequence": 2, "speaker": "customer",
            "transcript": "I still need a human supervisor.",
        })
        self.assertEqual(duplicate_turn.status_code, 409)
        alerts = self.client.get("/api/supervisor/alerts")
        self.assertEqual(len(alerts.json()), 1)

        self.current_user = self.supervisor
        acknowledged = self.client.post(
            f"/api/supervisor/alerts/{turn.json()['escalation']['id']}/acknowledge",
            json={"note": "Supervisor reviewing customer request."},
        )
        self.assertEqual(acknowledged.status_code, 200)
        self.assertEqual(acknowledged.json()["status"], "acknowledged")
        resolved = self.client.post(
            f"/api/supervisor/alerts/{turn.json()['escalation']['id']}/resolve",
            json={"note": "Customer request completed."},
        )
        self.assertEqual(resolved.status_code, 200)
        self.assertEqual(resolved.json()["status"], "resolved")
        self.assertEqual(
            self.client.post(f"/api/supervisor/alerts/{turn.json()['escalation']['id']}/acknowledge", json={"note": "Late action"}).status_code,
            409,
        )
        self.assertEqual(
            self.client.post(f"/api/supervisor/alerts/{turn.json()['escalation']['id']}/takeover", json={"note": "Late action"}).status_code,
            409,
        )

    def test_agent_can_request_manual_escalation_with_audit_event(self):
        self.current_user = self.agent
        call = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(call.status_code, 201)
        requested = self.client.post(f"/api/calls/{call.json()['id']}/escalate", json={"note": "Customer asked to speak with a manager."})
        self.assertEqual(requested.status_code, 200)
        self.assertEqual(requested.json()["severity"], "high")

        self.current_user = self.supervisor
        alerts = self.client.get("/api/supervisor/alerts")
        self.assertEqual(alerts.status_code, 200)
        self.assertEqual(alerts.json()[0]["events"][0]["action"], "manual_request")

    def test_call_controls_and_supervisor_whispers_are_persisted(self):
        self.current_user = self.agent
        call = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(call.status_code, 201)
        call_id = call.json()["id"]
        held = self.client.post(f"/api/calls/{call_id}/controls", json={"action": "hold"})
        self.assertEqual(held.status_code, 200)
        self.assertTrue(held.json()["is_held"])
        blocked_turn = self.client.post(f"/api/calls/{call_id}/turns", json={
            "campaign_id": self.active_campaign.id, "sequence": 0, "speaker": "customer", "transcript": "Can you hear me?",
        })
        self.assertEqual(blocked_turn.status_code, 409)
        self.assertEqual(self.client.post(f"/api/calls/{call_id}/controls", json={"action": "resume"}).status_code, 200)

        self.current_user = self.supervisor
        whisper = self.client.post(f"/api/calls/{call_id}/supervisor-messages", json={"message": "Ask one clarifying question before offering a discount."})
        self.assertEqual(whisper.status_code, 201)
        self.current_user = self.agent
        messages = self.client.get(f"/api/calls/{call_id}/supervisor-messages")
        self.assertEqual(messages.status_code, 200)
        self.assertEqual(messages.json()[0]["message"], "Ask one clarifying question before offering a discount.")

    def test_objection_guidance_can_be_updated_and_deleted_before_campaign_use(self):
        script = self.client.post("/api/admin/scripts", json={
            "title": "Editable objections", "summary": "Draft guidance",
            "content": json.dumps({"nodes": [
                {"id": "opening", "type": "opening", "goal": "Open", "prompt": "Open the call.", "next_node_ids": ["closing"]},
                {"id": "closing", "type": "closing", "goal": "Close", "prompt": "Close the call.", "next_node_ids": []},
            ]}),
        })
        self.assertEqual(script.status_code, 201)
        created = self.client.post(f"/api/admin/scripts/{script.json()['id']}/objections", json={
            "node_id": "opening", "category": "price", "trigger_terms": ["price"], "approved_response": "Original response.",
        })
        self.assertEqual(created.status_code, 201)
        updated = self.client.put(f"/api/admin/scripts/{script.json()['id']}/objections/{created.json()['id']}", json={
            "approved_response": "Updated approved response.", "trigger_terms": ["cost", "pricing"],
        })
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["trigger_terms"], ["cost", "pricing"])
        self.assertEqual(self.client.delete(f"/api/admin/scripts/{script.json()['id']}/objections/{created.json()['id']}").status_code, 204)

    def test_campaign_activation_preserves_script_and_persona_snapshots(self):
        script = self.client.post("/api/admin/scripts", json={
            "title": "Snapshot script", "summary": "Initial version",
            "content": json.dumps({"nodes": [
                {"id": "opening", "type": "opening", "goal": "Open", "prompt": "Initial opening.", "next_node_ids": ["closing"]},
                {"id": "closing", "type": "closing", "goal": "Close", "prompt": "Initial close.", "next_node_ids": []},
            ]}),
        })
        persona = self.client.post("/api/admin/personas", json={"name": "Snapshot persona", "tone": "Friendly", "description": "Initial behavior."})
        self.assertEqual(script.status_code, 201)
        self.assertEqual(persona.status_code, 201)
        attached = self.client.put(f"/api/admin/campaigns/{self.draft_campaign.id}", json={
            "script_id": script.json()["id"], "persona_id": persona.json()["id"],
            "product": "EchoAI", "audience": "Sales teams", "goal": "Book a demo", "context": "Use approved facts only.",
        })
        self.assertEqual(attached.status_code, 200)
        active = self.client.post(f"/api/admin/campaigns/{self.draft_campaign.id}/activate")
        self.assertEqual(active.status_code, 200)
        self.assertIn("Initial opening.", active.json()["script_snapshot_json"])
        self.assertIn("Initial behavior.", active.json()["persona_snapshot_json"])

    def test_agents_are_scoped_to_their_assigned_leads_and_calls(self):
        self.current_user = self.agent
        self.assertEqual(
            self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id}).status_code,
            422,
        )
        created = self.client.post("/api/calls", json={"campaign_id": self.active_campaign.id, "lead_id": self.lead.id})
        self.assertEqual(created.status_code, 201)
        call_id = created.json()["id"]

        session = self.Session()
        other_agent = User(
            id=str(uuid4()), name="Other Agent", email="other-agent@example.com",
            hashed_password=hash_password("test-pass"), role="agent",
        )
        other_lead = Lead(
            id=str(uuid4()), campaign_id=self.active_campaign.id, name="Other Lead",
            assigned_agent_id=other_agent.id,
        )
        session.add_all([other_agent, other_lead])
        session.commit()
        session.close()

        visible_leads = self.client.get("/api/agent/leads")
        self.assertEqual(visible_leads.status_code, 200)
        self.assertEqual([item["id"] for item in visible_leads.json()], [self.lead.id])

        self.current_user = other_agent
        self.assertEqual(self.client.get(f"/api/calls/{call_id}").status_code, 403)
        self.assertEqual(self.client.get(f"/api/agent/leads/{self.lead.id}").status_code, 403)
        self.assertEqual(
            self.client.post(
                f"/api/calls/{call_id}/turns",
                json={"campaign_id": self.active_campaign.id, "sequence": 1, "speaker": "customer", "transcript": "Hello"},
            ).status_code,
            403,
        )

        self.current_user = self.supervisor
        self.assertEqual(self.client.get(f"/api/calls/{call_id}").status_code, 200)
        self.assertEqual(
            self.client.post(
                f"/api/calls/{call_id}/turns",
                json={"campaign_id": self.active_campaign.id, "sequence": 1, "speaker": "customer", "transcript": "Hello"},
            ).status_code,
            403,
        )


if __name__ == "__main__":
    unittest.main()
