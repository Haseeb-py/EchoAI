"""Regression coverage for Deepgram final-turn retry handling."""

import unittest
from pathlib import Path

from echoai_voice.config.settings import AppSettings
from echoai_voice.providers.deepgram.stt_provider import DeepgramStreamingSttProvider
from echoai_voice.services.transcript_event_bus import TranscriptEventBus
class SttFinalDeduplicationTests(unittest.IsolatedAsyncioTestCase):
    async def test_replayed_flux_end_of_turn_publishes_one_logical_final(self):
        bus = TranscriptEventBus()
        received = []
        bus.subscribe(received.append)
        settings = AppSettings(
            deepgram_api_key="", groq_api_key="", groq_model="", whisper_model="",
            livekit_url="", livekit_api_key="", livekit_api_secret="", default_tts_provider="deepgram",
            default_tts_voice="voice", persona_dir=Path("."), low_confidence_threshold=0.72,
            log_level="INFO", echoai_backend_url="http://127.0.0.1:8000", echoai_internal_voice_secret="test",
        )
        provider = DeepgramStreamingSttProvider(settings=settings, transcript_bus=bus, fallback_service=None)
        provider.bind_call_id("call-1")
        final = {
            "type": "TurnInfo", "event": "EndOfTurn", "turn_index": 4, "transcript": "Can you repeat that?",
            "words": [{"confidence": 0.99}], "audio_window_start": 0, "audio_window_end": 1,
        }
        for _ in range(4):
            await provider.handle_flux_message(final)
        self.assertEqual(len(received), 1)
        self.assertEqual(received[0].turn_id, 5)
