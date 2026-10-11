"""Bounded, optional customer PCM cues; never an emotion verdict."""
from __future__ import annotations
import audioop
from dataclasses import dataclass

@dataclass(frozen=True)
class AcousticCues:
    available: bool
    energy: float = 0.0
    zero_crossing_rate: float = 0.0
    speaking_rate_wpm: float = 0.0
    cue: str = "unknown"

def extract_pcm16_cues(pcm16: bytes, sample_rate: int, channels: int, text: str = "") -> AcousticCues:
    # Bound CPU and memory to the most recent eight seconds; caller supplies
    # customer microphone audio only.
    if sample_rate <= 0 or channels <= 0 or len(pcm16) < sample_rate * channels * 2 // 2:
        return AcousticCues(False)
    raw = pcm16[-min(len(pcm16), sample_rate * channels * 2 * 8):]
    try:
        mono = raw if channels == 1 else audioop.tomono(raw, 2, 0.5, 0.5)
        rms = float(audioop.rms(mono, 2))
        samples = memoryview(mono).cast("h")
        if len(samples) < 2: return AcousticCues(False)
        crossings = sum((samples[i - 1] < 0) != (samples[i] < 0) for i in range(1, len(samples)))
        duration = len(samples) / sample_rate
        rate = len(text.split()) * 60 / duration if text and duration else 0.0
        # Cues are intentionally conservative: they support later review only.
        cue = "elevated_energy" if rms > 3500 else "rapid_speech" if rate > 190 else "steady"
        return AcousticCues(True, round(rms, 1), round(crossings / len(samples), 4), round(rate, 1), cue)
    except (audioop.error, ValueError, TypeError):
        return AcousticCues(False)
