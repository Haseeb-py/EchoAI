"""Audio subscription lifecycle regression tests."""

import unittest
from unittest.mock import AsyncMock

from echoai_voice.core.stt_app import SttVoiceApplication, start_stt_call, stop_stt_call
from echoai_voice.providers.livekit.audio_source import AudioSource


class _LiveKit:
    def __init__(self):
        self.status = type("Status", (), {"call_id": "call-1"})()
        self.connect = AsyncMock()
        self.disconnect = AsyncMock()
        self.mark_listening = lambda: None


class SttLifecycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_start_stop_restart_registers_exactly_one_audio_callback(self):
        source = AudioSource()
        livekit = _LiveKit()
        base = type("Base", (), {"livekit": livekit, "audio_source": source})()
        provider = type("Provider", (), {"bind_call_id": lambda self, _: None, "start": AsyncMock(), "stop": AsyncMock()})()
        fallback = type("Fallback", (), {"cancel_all": AsyncMock()})()
        app = SttVoiceApplication(base=base, transcript_bus=object(), stt_provider=provider, fallback_service=fallback)

        await start_stt_call(app)
        await start_stt_call(app)
        self.assertEqual(len(source._subscribers), 1)
        await stop_stt_call(app)
        self.assertEqual(len(source._subscribers), 0)
        await start_stt_call(app)
        self.assertEqual(len(source._subscribers), 1)
