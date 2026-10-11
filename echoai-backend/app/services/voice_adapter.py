"""Temporary Deepgram/Groq adapter. Replace this module when the 3A pipeline lands."""

import base64
import json
from typing import Literal

import httpx
from pydantic import BaseModel, Field, ValidationError

from app.core.config import settings


class VoiceProviderError(RuntimeError):
    pass


class ToxicLanguageFinding(BaseModel):
    phrase: str = Field(min_length=1)
    speaker: str = Field(min_length=1)


class ExtractedLeadDetails(BaseModel):
    """Only record facts explicitly stated during the call; empty means unknown."""
    contact_details: list[str] = []
    stated_needs: list[str] = []
    timeline: str = ""
    budget_context: str = ""
    decision_maker_context: str = ""


class PostCallAnalysis(BaseModel):
    """The minimal structured result required before a call can be finalized."""
    summary: str
    start_sentiment: Literal["positive", "neutral", "negative"]
    end_sentiment: Literal["positive", "neutral", "negative"]
    overall_sentiment: Literal["positive", "neutral", "negative"]
    intent: str
    outcome: str
    toxic_language: list[ToxicLanguageFinding]
    objections: list[str]
    extracted_lead_details: ExtractedLeadDetails
    follow_up_recommendation: str


def _require_groq_config() -> None:
    if not settings.groq_api_key:
        raise VoiceProviderError("Groq is not configured")


def _require_deepgram_config() -> None:
    if not settings.deepgram_api_key:
        raise VoiceProviderError("Deepgram is not configured")


async def transcribe_audio(audio: bytes, content_type: str) -> str:
    _require_deepgram_config()
    headers = {"Authorization": f"Token {settings.deepgram_api_key}", "Content-Type": content_type}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(
            "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true",
            headers=headers,
            content=audio,
        )
    if response.is_error:
        raise VoiceProviderError(f"Deepgram transcription failed ({response.status_code})")
    try:
        return response.json()["results"]["channels"][0]["alternatives"][0]["transcript"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise VoiceProviderError("Deepgram returned an unreadable transcription") from error


async def generate_reply(prompt: str) -> str:
    _require_groq_config()
    payload = {"model": settings.groq_model, "messages": [{"role": "user", "content": prompt}], "temperature": 0.3, "max_tokens": 220}
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post("https://api.groq.com/openai/v1/chat/completions", headers={"Authorization": f"Bearer {settings.groq_api_key}"}, json=payload)
    if response.is_error:
        raise VoiceProviderError(f"Groq reply generation failed ({response.status_code})")
    try:
        return response.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise VoiceProviderError("Groq returned an unreadable reply") from error


async def synthesize_audio(text: str) -> str:
    _require_deepgram_config()
    headers = {"Authorization": f"Token {settings.deepgram_api_key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en&encoding=mp3", headers=headers, json={"text": text})
    if response.is_error:
        raise VoiceProviderError(f"Deepgram speech synthesis failed ({response.status_code})")
    return base64.b64encode(response.content).decode("ascii")


async def analyze_call(prompt: str) -> dict:
    # Analysis is structured data, not a short conversational reply. Reusing
    # generate_reply's 220-token limit was causing valid calls to fall back to
    # "analysis unavailable" when Groq truncated the required JSON fields.
    _require_groq_config()
    payload = {
        "model": settings.groq_model,
        "messages": [
            {"role": "system", "content": "Return exactly one JSON object. Do not use Markdown or commentary."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 850,
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"}, json=payload,
            )
    except httpx.HTTPError as error:
        raise VoiceProviderError("Groq post-call analysis request failed") from error
    if response.is_error:
        raise VoiceProviderError(f"Groq post-call analysis failed ({response.status_code})")
    try:
        raw = response.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError) as error:
        raise VoiceProviderError("Groq returned an unreadable post-call analysis") from error
    return parse_analysis_response(raw)


def parse_analysis_response(raw: str) -> dict:
    """Accept a JSON object with or without a Markdown fence from the LLM."""
    content = raw.strip()
    if content.startswith("```"):
        lines = content.splitlines()
        if len(lines) >= 2 and lines[-1].strip() == "```":
            content = "\n".join(lines[1:-1]).strip()
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as error:
        raise VoiceProviderError("Groq did not return valid post-call analysis JSON") from error
    if not isinstance(parsed, dict):
        raise VoiceProviderError("Groq returned post-call analysis in an invalid format")
    try:
        return PostCallAnalysis.model_validate(parsed).model_dump()
    except ValidationError as error:
        raise VoiceProviderError("Groq returned incomplete or invalid post-call analysis") from error
