"""Regression tests for the independent structured post-call Groq request."""

import unittest
from types import SimpleNamespace
from unittest.mock import patch

from app.services.voice_adapter import VoiceProviderError, analyze_call


VALID_ANALYSIS = {
    "summary": "The customer described an overheating laptop.",
    "start_sentiment": "neutral", "end_sentiment": "negative", "overall_sentiment": "negative",
    "intent": "repair inquiry", "outcome": "follow_up", "toxic_language": [], "objections": [],
    "extracted_lead_details": {"contact_details": [], "stated_needs": ["Laptop repair"], "timeline": "", "budget_context": "", "decision_maker_context": ""},
    "follow_up_recommendation": "Provide the approved repair options.",
}


class _Response:
    is_error = False

    def json(self):
        import json
        return {"choices": [{"message": {"content": json.dumps(VALID_ANALYSIS)}}]}


class _Client:
    def __init__(self):
        self.kwargs = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def post(self, _url, **kwargs):
        self.kwargs = kwargs
        return _Response()


class _FailingClient(_Client):
    async def post(self, _url, **_kwargs):
        import httpx
        raise httpx.ConnectError("offline")


class VoiceAdapterAnalysisTests(unittest.IsolatedAsyncioTestCase):
    async def test_analysis_uses_structured_groq_request_without_deepgram(self):
        client = _Client()
        settings = SimpleNamespace(groq_api_key="configured", groq_model="analysis-model", deepgram_api_key="")
        with patch("app.services.voice_adapter.settings", settings), patch("app.services.voice_adapter.httpx.AsyncClient", return_value=client):
            result = await analyze_call("Analyze this completed call")
        self.assertEqual(result, VALID_ANALYSIS)
        self.assertEqual(client.kwargs["json"]["model"], "analysis-model")
        self.assertEqual(client.kwargs["json"]["max_tokens"], 850)
        self.assertEqual(client.kwargs["json"]["response_format"], {"type": "json_object"})

    async def test_network_failure_is_normalized_to_provider_error(self):
        settings = SimpleNamespace(groq_api_key="configured", groq_model="analysis-model", deepgram_api_key="")
        with patch("app.services.voice_adapter.settings", settings), patch("app.services.voice_adapter.httpx.AsyncClient", return_value=_FailingClient()):
            with self.assertRaises(VoiceProviderError):
                await analyze_call("Analyze this completed call")
