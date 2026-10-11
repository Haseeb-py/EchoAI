"""Module 3B worker tests that do not require network providers."""

import asyncio
import unittest
from datetime import datetime, timezone

from echoai_voice.models.persona import LlmConfig, PersonaConfig, TtsConfig
from echoai_voice.models.transcript import TranscriptEvent
from echoai_voice.services.response_generation_service import ResponseGenerationService
class _PersonaManager:
    def get_active_persona(self):
        return PersonaConfig(
            id="campaign-persona", display_name="Campaign", description="",
            system_prompt="Use the campaign persona.",
            tts=TtsConfig(provider="deepgram", voice="aura", speech_rate=1.0),
            llm=LlmConfig(temperature=0.2),
        )


class _Generator:
    def __init__(self):
        self.requests = []

    async def generate(self, request):
        return "reply"

    async def stream(self, request):
        self.requests.append(request)
        yield "reply"


class _BlockingFirstGenerator:
    def __init__(self):
        self.requests = []
        self.first_started = asyncio.Event()

    async def generate(self, request):
        return "reply"

    async def stream(self, request):
        self.requests.append(request)
        if len(self.requests) == 1:
            self.first_started.set()
            await asyncio.Event().wait()
        yield "reply"


class _FailsOnceGenerator:
    def __init__(self):
        self.requests = []

    async def generate(self, request):
        return "reply"

    async def stream(self, request):
        self.requests.append(request)
        if len(self.requests) == 1:
            raise RuntimeError("provider unavailable")
        yield "recovered reply"


def _event(text: str, turn_id: int) -> TranscriptEvent:
    now = datetime.now(timezone.utc)
    return TranscriptEvent(
        call_id="call-a", turn_id=turn_id, speaker="customer", text=text,
        is_final=True, confidence=1.0, timestamp_start=now, timestamp_end=now,
    )


class ResponseGenerationServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_same_final_turn_replayed_four_times_generates_once(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        responses = []
        service.subscribe(responses.append)

        async def provider(_):
            return {"campaign": {}, "current_node": {"id": "discovery", "goal": "Learn needs", "prompt": "Ask."}, "history": []}

        service.set_context_provider(provider)
        for _ in range(4):
            await service.handle_transcript_event(_event("Can you repeat that?", 7))
        self.assertEqual(len(generator.requests), 1)
        self.assertEqual(len(responses), 1)

    async def test_uncertain_answers_remain_reply_eligible(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        responses = []
        service.subscribe(responses.append)

        async def provider(_):
            return {"campaign": {"product": "EchoAI"}, "current_node": {"id": "discovery", "goal": "Learn challenge", "prompt": "Clarify the challenge."}, "history": []}

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("I don't know.", 1))
        await service.handle_transcript_event(_event("Maybe.", 2))
        await service.handle_transcript_event(_event("Not sure.", 3))
        self.assertEqual(len(generator.requests), 3)
        self.assertEqual(len(responses), 3)

    async def test_cancelled_turn_does_not_block_the_next_final_turn(self):
        generator = _BlockingFirstGenerator()
        service = ResponseGenerationService(_PersonaManager(), generator, finalization_delay_seconds=0)
        responses = []
        service.subscribe(responses.append)
        service.submit_transcript_event(_event("First question.", 1))
        await asyncio.wait_for(generator.first_started.wait(), timeout=1)
        await service.cancel_current_response()
        service.submit_transcript_event(_event("I don't know.", 2))
        await service.wait_until_idle()
        self.assertEqual(len(generator.requests), 2)
        self.assertEqual([event.turn_id for event in responses], [2])

    async def test_uses_fresh_context_for_each_customer_turn(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        stages = iter((
            {"campaign": {"goal": "Book"}, "current_node": {"id": "discovery", "goal": "Learn needs"}, "history": []},
            {"campaign": {"goal": "Book"}, "current_node": {"id": "pitch", "goal": "Gain interest"}, "history": []},
        ))

        async def provider(_):
            return next(stages)

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("We use spreadsheets for lead tracking.", 1))
        await service.handle_transcript_event(_event("Yes, that sounds useful.", 2))
        self.assertIn("Current stage id: discovery", generator.requests[0].system_prompt)
        self.assertIn("Current stage id: pitch", generator.requests[1].system_prompt)

    async def test_accepting_opening_uses_bpo_discovery_goal_and_product_context(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)

        async def provider(_):
            return {
                "campaign": {
                    "product": "EchoAI AI voice sales and support automation platform",
                    "audience": "BPO operations teams",
                    "goal": "Qualify BPO automation needs",
                    "context": "BPO Automation Pilot",
                },
                "current_node": {
                    "id": "discovery-agent-count",
                    "type": "discovery",
                    "goal": "Ask how many agents the BPO operates",
                    "prompt": "Ask for the number of agents.",
                },
                "history": [{"speaker": "ai", "text": "Is now a good time for a quick chat?"}],
            }

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("Yes, I have a few minutes.", 1))
        prompt = generator.requests[0].system_prompt
        self.assertIn("discovery-agent-count", prompt)
        self.assertIn("Ask how many agents the BPO operates", prompt)
        self.assertIn("EchoAI AI voice sales and support automation platform", prompt)

    async def test_persisted_human_fatigue_answer_is_retained_for_next_prompt(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)

        async def provider(event):
            return {
                "campaign": {"product": "EchoAI"},
                "current_node": {"id": "discovery", "goal": "Learn needs", "prompt": "Use supplied needs."},
                "history": [
                    {"speaker": "customer", "text": "Our main challenge is human fatigue."},
                    {"speaker": "ai", "text": "Which workflow is affected?"},
                    {"speaker": "customer", "text": event.text},
                ],
            }

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("Our outbound sales calls.", 9))
        history = generator.requests[0].conversation_history
        self.assertTrue(any(turn.text == "Our main challenge is human fatigue." for turn in history))
        self.assertFalse(any(turn.text == "Our outbound sales calls." for turn in history))

    async def test_opening_does_not_call_customer_context_or_record_fake_customer_turn(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)

        async def provider(_):
            raise AssertionError("opening must not be persisted as customer STT")

        service.set_context_provider(provider)
        await service.generate_opening_instruction("Introduce the approved offer.", "call-a")
        self.assertEqual([turn.speaker for turn in service.history_store.snapshot()], ["ai"])
        self.assertEqual(generator.requests[0].latest_customer_transcript.startswith("Start the outbound call"), True)

    async def test_duplicate_opening_for_one_call_generates_once(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        await service.generate_opening_instruction("Introduce the approved offer.", "call-a")
        await service.generate_opening_instruction("Introduce the approved offer.", "call-a")
        self.assertEqual(len(generator.requests), 1)

    async def test_opening_placeholder_is_sanitized_at_generation_boundary(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        await service.generate_opening_instruction("Hello, this is [Your Name].", "call-placeholder")
        self.assertNotIn("[Your Name]", generator.requests[0].latest_customer_transcript)
        self.assertIn("Campaign", generator.requests[0].latest_customer_transcript)

    async def test_bare_name_placeholder_is_sanitized_at_opening_generation_boundary(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        await service.generate_opening_instruction("Hello, this is [Name].", "call-bare-name")
        self.assertNotIn("[Name]", generator.requests[0].latest_customer_transcript)
        self.assertIn("Campaign", generator.requests[0].latest_customer_transcript)

    async def test_context_failure_does_not_call_groq_with_generic_persona(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        responses = []
        service.subscribe(responses.append)

        async def unavailable(_):
            return None

        service.set_context_provider(unavailable)
        await service.handle_transcript_event(_event("What does EchoAI do?", 10))
        self.assertEqual(generator.requests, [])
        self.assertEqual(responses, [])

    async def test_campaign_prompt_prioritizes_direct_question_and_truthfulness(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)

        async def provider(_):
            return {
                "campaign": {"product": "EchoAI", "audience": "BPOs", "goal": "Qualify", "context": "Pilot"},
                "current_node": {"id": "discovery", "goal": "Learn current workflow", "prompt": "Ask workflow."},
                "history": [],
                "approved_knowledge": [{"title": "Product", "content": "EchoAI automates voice sales and support."}],
                "approved_objection_response": "",
            }

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("What exactly is EchoAI?", 11))
        prompt = generator.requests[0].system_prompt
        self.assertIn("answer a direct customer question", prompt)
        self.assertIn("Do not invent or imply pricing", prompt)
        self.assertIn("EchoAI automates voice sales", prompt)
        self.assertIn("Keep the current stage", prompt)

    async def test_cognitive_context_is_sent_to_groq_as_tone_guidance(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)

        async def provider(_):
            return {
                "campaign": {"product": "EchoAI"},
                "current_node": {"id": "discovery", "goal": "Learn needs", "prompt": "Ask."},
                "history": [],
                "cognitive": {
                    "intent": "clarification", "sentiment": "negative", "emotion": "frustrated",
                    "response_guidance": "Use a concise, patient clarification.",
                },
            }

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("Can you repeat that?", 111))
        prompt = generator.requests[0].system_prompt
        self.assertIn("Live customer intent: clarification", prompt)
        self.assertIn("Live customer sentiment: negative", prompt)
        self.assertIn("Tone guidance: Use a concise, patient clarification.", prompt)

    async def test_sales_strategy_is_contextual_and_cannot_replace_campaign_grounding(self):
        generator = _Generator()
        service = ResponseGenerationService(_PersonaManager(), generator)

        async def provider(_):
            return {
                "campaign": {"product": "Approved product", "goal": "Understand needs"},
                "current_node": {"id": "discovery", "goal": "Learn needs", "prompt": "Ask one need question."},
                "history": [],
                "approved_knowledge": [{"title": "Approved facts", "content": "Only this fact is approved."}],
                "sales": {"objection_type": "price_budget", "buying_signal": "interest", "commitment_confirmed": False,
                          "recommended_strategy": "Acknowledge the budget concern without inventing price."},
            }

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("This sounds expensive but I am interested.", 112))
        prompt = generator.requests[0].system_prompt
        self.assertIn("Sales objection type: price_budget", prompt)
        self.assertIn("Sales response strategy: Acknowledge the budget concern", prompt)
        self.assertIn("Approved facts", prompt)
        self.assertIn("Never infer a price", prompt)

    async def test_groq_failure_emits_safe_reply_and_later_turn_still_works(self):
        generator = _FailsOnceGenerator()
        service = ResponseGenerationService(_PersonaManager(), generator)
        responses = []
        service.subscribe(responses.append)

        async def provider(_):
            return {"campaign": {"product": "EchoAI"}, "current_node": {"id": "discovery", "goal": "Learn needs", "prompt": "Ask."}, "history": []}

        service.set_context_provider(provider)
        await service.handle_transcript_event(_event("First question", 12))
        await service.handle_transcript_event(_event("Second question", 13))
        self.assertEqual(len(responses), 2)
        self.assertIn("trouble responding", responses[0].text)
        self.assertEqual(responses[1].text, "recovered reply")
