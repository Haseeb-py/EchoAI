"""Transcript-driven response generation for the temporary Groq integration."""

from __future__ import annotations

import asyncio
import logging
import re
from contextlib import suppress
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from echoai_voice.models.response_events import GeneratedResponseChunkEvent, GeneratedResponseEvent
from echoai_voice.models.responses import ConversationTurn, ResponseRequest, ResponseGenerator
from echoai_voice.models.transcript import TranscriptEvent
from echoai_voice.services.conversation_history import ConversationHistoryStore
from echoai_voice.services.persona_manager import PersonaManager
from echoai_voice.models.latency import LatencyCheckpointName
from echoai_voice.services.latency_tracker import LatencyTracker

logger = logging.getLogger(__name__)

ResponseSubscriber = Callable[[GeneratedResponseEvent], Awaitable[None] | None]
ResponseChunkSubscriber = Callable[[GeneratedResponseChunkEvent], Awaitable[None] | None]
ContextProvider = Callable[[TranscriptEvent], Awaitable[dict[str, Any] | None]]


def resolve_agent_name_placeholders(text: str, display_name: str) -> str:
    """Resolve only authoring placeholders that explicitly mean agent name."""
    # Supports [Name], [Your Name], case variants, {name}, {agent_name},
    # {{name}}, and {{agentName}} without touching unrelated placeholders.
    text = re.sub(r"\[\s*(?:your\s+)?name\s*\]", display_name, text, flags=re.I)
    return re.sub(r"\{\{?\s*(?:agent[_\s-]*)?name\s*\}?\}", display_name, text, flags=re.I)


@dataclass(slots=True)
class ResponseGenerationService:
    """Consume final customer transcript events and generate AI responses."""

    persona_manager: PersonaManager
    response_generator: ResponseGenerator
    history_store: ConversationHistoryStore = field(default_factory=ConversationHistoryStore)
    latency_tracker: LatencyTracker | None = None
    _subscribers: list[ResponseSubscriber] = field(default_factory=list)
    _stream_subscribers: list[ResponseChunkSubscriber] = field(default_factory=list)
    _call_id: str = "pending-call"
    _next_turn_id: int = 1
    # Deepgram can finalize short phrase fragments before the speaker has
    # completed a thought. Let the final transcript settle briefly so a later
    # fragment replaces it before expensive LLM/TTS work begins.
    # Flux already performs turn detection. Keep only a tiny coalescing window
    # for trailing final events instead of adding a noticeable response pause.
    finalization_delay_seconds: float = 0.12
    _generation: int = field(default=0, init=False)
    _active_response_task: asyncio.Task[None] | None = field(default=None, init=False)
    _context_provider: ContextProvider | None = field(default=None, init=False)
    _accepted_final_turns: set[tuple[str, int]] = field(default_factory=set, init=False)
    _opening_calls: set[str] = field(default_factory=set, init=False)

    def set_context_provider(self, provider: ContextProvider | None) -> None:
        self._context_provider = provider

    def bind_call_id(self, call_id: str | None) -> None:
        """Bind the active call identifier to generated response events."""

        if call_id:
            self._call_id = call_id

    def hydrate_history(self, history: list[dict[str, Any]]) -> None:
        """Restore only persisted turns for the currently bound call."""

        self.history_store.replace([
            ConversationTurn(speaker=str(item.get("speaker", "customer")), text=str(item.get("text", "")))
            for item in history[-8:]
            if str(item.get("text", "")).strip()
        ])

    def subscribe(self, callback: ResponseSubscriber) -> None:
        """Register a subscriber for generated responses."""

        self._subscribers.append(callback)

    def subscribe_stream(self, callback: ResponseChunkSubscriber) -> None:
        """Register a subscriber for incremental response text."""

        self._stream_subscribers.append(callback)

    def reset(self) -> None:
        """Reset conversation history for a new call."""

        self._generation += 1
        if self._active_response_task is not None:
            self._active_response_task.cancel()
            self._active_response_task = None
        self.history_store.clear()
        self._next_turn_id = 1
        self._accepted_final_turns.clear()

    @property
    def has_active_response(self) -> bool:
        """Return whether response generation or one of its subscribers is active."""

        task = self._active_response_task
        return task is not None and not task.done()

    def submit_transcript_event(self, event: TranscriptEvent) -> None:
        """Schedule a final customer turn without blocking the STT receive loop."""

        if event.speaker != "customer" or not event.is_final or not event.text.strip():
            return
        if not self._accept_final_turn(event):
            return

        previous_task = self._active_response_task
        if previous_task is not None and not previous_task.done():
            previous_task.cancel()

        self._generation += 1
        generation = self._generation
        task = asyncio.create_task(
            self._generate_after_finalization(event, generation),
            name=f"response-generation-turn-{event.turn_id}",
        )
        self._active_response_task = task
        task.add_done_callback(self._response_task_done)

    async def _generate_after_finalization(
        self, event: TranscriptEvent, generation: int
    ) -> None:
        """Wait briefly for a trailing final transcript before answering."""

        await asyncio.sleep(self.finalization_delay_seconds)
        if generation != self._generation:
            return
        await self._generate_for_event(event, generation)

    async def handle_transcript_event(self, event: TranscriptEvent) -> None:
        """Handle transcript events and generate responses only for final customer turns."""

        if event.speaker != "customer" or not event.is_final or not event.text.strip():
            return
        if not self._accept_final_turn(event):
            return

        self._generation += 1
        await self._generate_for_event(event, self._generation)

    def _accept_final_turn(self, event: TranscriptEvent) -> bool:
        """Accept one logical finalized STT turn exactly once per call.

        Deepgram and transport retries retain the provider's turn index.  That
        index is the idempotency boundary; transcript text is deliberately not
        used because a customer can legitimately repeat a phrase later.
        """

        key = (event.call_id or self._call_id, event.turn_id)
        if key in self._accepted_final_turns:
            logger.info("event=duplicate_final_ignored call_id=%s turn_id=%s", key[0], key[1])
            return False
        self._accepted_final_turns.add(key)
        logger.info("event=final_turn_accepted call_id=%s turn_id=%s", key[0], key[1])
        return True

    async def generate_opening_instruction(self, instruction: str, call_id: str) -> None:
        """Generate the outbound greeting without creating a fake customer turn.

        Opening delivery is an AI action.  Treating it as STT customer input
        used to persist an invented transcript and could move the script.
        """

        # Last trust boundary before the generated opening is streamed to TTS:
        # sanitize authoring placeholders using the active frozen persona.
        name = self.persona_manager.get_active_persona().display_name
        instruction = resolve_agent_name_placeholders(instruction, name)
        if call_id in self._opening_calls:
            logger.info("event=duplicate_opening_ignored call_id=%s", call_id)
            return
        self._opening_calls.add(call_id)
        self.bind_call_id(call_id)
        self._generation += 1
        event = TranscriptEvent(
            call_id=call_id,
            turn_id=0,
            speaker="system",
            text=("Start the outbound call now. Follow this approved opening "
                  f"instruction exactly in meaning: {instruction}"),
            is_final=True,
            confidence=1.0,
            timestamp_start=datetime.now(timezone.utc),
            timestamp_end=datetime.now(timezone.utc),
        )
        await self._generate_for_event(
            event, self._generation, fetch_context=False, append_customer=False,
        )

    async def cancel_current_response(self) -> bool:
        """Invalidate and cancel response work so interrupted output cannot become stale audio."""

        self._generation += 1
        task = self._active_response_task
        if task is None or task.done():
            return False

        logger.info("Cancelling active response work after customer speech started.")
        task.cancel()
        # Give cancellation one event-loop turn without allowing a slow provider
        # that suppresses CancelledError to delay barge-in handling. The generation
        # token above still prevents any late result from being emitted.
        await asyncio.sleep(0)
        return True

    async def wait_until_idle(self) -> None:
        """Wait for currently scheduled response work to finish."""

        task = self._active_response_task
        if task is not None:
            with suppress(asyncio.CancelledError):
                await task

    async def _generate_for_event(
        self,
        event: TranscriptEvent,
        generation: int,
        *,
        fetch_context: bool = True,
        append_customer: bool = True,
    ) -> None:
        """Generate and emit one response if it has not been invalidated."""

        self.bind_call_id(event.call_id)
        persona = self.persona_manager.get_active_persona()
        context = await self._context_provider(event) if fetch_context and self._context_provider else None
        if generation != self._generation:
            return
        # A live campaign turn is only safe to generate after its authenticated
        # backend context was persisted and returned.  Never fall back to an
        # ungrounded generic persona when that boundary is unavailable.
        if fetch_context and self._context_provider and context is None:
            # Context is the campaign trust boundary. A backend failure must
            # remain visible instead of being disguised as a generic response.
            logger.warning("event=response_skipped_missing_campaign_context call_id=%s turn_id=%s", event.call_id, event.turn_id)
            return
        prior_history = self.history_store.snapshot()
        if context and context.get("history"):
            persisted_history = list(context["history"][-8:])
            # The backend persists this finalized customer turn before it
            # returns context. It belongs in latest_customer_transcript, not
            # twice in the message list.
            if (
                persisted_history
                and str(persisted_history[-1].get("speaker")) == "customer"
                and str(persisted_history[-1].get("text", "")).strip() == event.text.strip()
            ):
                persisted_history.pop()
            prior_history = tuple(ConversationTurn(speaker=str(item.get("speaker", "customer")), text=str(item.get("text", ""))) for item in persisted_history)
        if append_customer:
            self.history_store.append_customer(event.text.strip())
        stage = context.get("current_node") if context else None
        campaign = context.get("campaign") if context else None
        campaign_instructions = ""
        if context:
            knowledge = context.get("approved_knowledge") or []
            approved_sources = "\n".join(
                f"- {item.get('title', 'Approved knowledge')}: {item.get('content', '')}"
                for item in knowledge if isinstance(item, dict)
            )
            objection_guidance = str(context.get("approved_objection_response") or "")
            cognitive = context.get("cognitive") or {}
            sales = context.get("sales") or {}
            stage_prompt = str(stage.get("prompt", "") if stage else "")
            import re
            stage_prompt = re.sub(r"\[\s*(?:your\s+)?name\s*\]", persona.display_name, stage_prompt, flags=re.I)
            stage_prompt = re.sub(r"\{\{?\s*(?:agent[_\s-]*)?name\s*\}?\}", persona.display_name, stage_prompt, flags=re.I)
            campaign_instructions = (
                "\n\nCAMPAIGN INSTRUCTIONS (higher priority than generic persona wording):\n"
                f"Campaign product: {campaign.get('product', '') if campaign else ''}\n"
                f"Audience: {campaign.get('audience', '') if campaign else ''}\n"
                f"Campaign goal: {campaign.get('goal', '') if campaign else ''}\n"
                f"Campaign context: {campaign.get('context', '') if campaign else ''}\n"
                f"Current stage id: {stage.get('id', '') if stage else ''}\n"
                f"Current stage goal: {stage.get('goal', '') if stage else ''}\n"
                f"Current stage instruction: {stage_prompt}\n"
                f"Approved knowledge:\n{approved_sources or 'No approved information was retrieved.'}\n"
                f"Approved objection guidance: {objection_guidance or 'None.'}\n"
                f"Live customer intent: {cognitive.get('intent', 'unknown')}\n"
                f"Live customer sentiment: {cognitive.get('sentiment', 'neutral')}\n"
                f"Live customer emotion: {cognitive.get('emotion', 'unknown')}\n"
                f"Tone guidance: {cognitive.get('response_guidance', 'Use the campaign persona.')}\n"
                f"Sales objection type: {sales.get('objection_type', 'none')}\n"
                f"Buying signal: {sales.get('buying_signal', 'none')}\n"
                f"Confirmed commitment: {sales.get('commitment_confirmed', False)}\n"
                f"Sales response strategy: {sales.get('recommended_strategy', 'Use the current approved stage.')}\n"
                f"Grounded optional suggestions: {sales.get('upsell_suggestions', [])}\n"
                "Priority rules: answer a direct customer question or instruction first, using only "
                "approved knowledge and campaign facts, then resume the current stage if appropriate. "
                "Keep the current stage when answering an unrelated question. Do not invent or imply "
                "pricing, paid/free status, discounts, contract terms, integrations, availability, or "
                "performance guarantees. If approved information is missing, say briefly that you do not "
                "have that detail. Do not push email, a portal, or a follow-up when the customer wants to "
                "discuss the matter on this call. Follow the current stage only after answering the customer. "
                "Do not advance to another stage until the customer supplies the required information. "
                "A buying signal is interest, not proof of a completed sale. Never infer a price, discount, "
                "guarantee, policy, availability, or product fact from sales guidance. Respect any stop-contact request immediately."
            )
        request = ResponseRequest(
            persona_id=persona.id,
            system_prompt=persona.system_prompt + campaign_instructions,
            latest_customer_transcript=event.text.strip(),
            temperature=persona.llm.temperature,
            conversation_history=prior_history,
        )
        turn_id = event.turn_id
        self._next_turn_id = max(self._next_turn_id, turn_id + 1)
        self._record_latency(LatencyCheckpointName.RESPONSE_GENERATION_STARTED, event.call_id, turn_id)
        logger.info("event=response_generation_started call_id=%s turn_id=%s generation_id=%s persona=%s", event.call_id, turn_id, generation, persona.id)
        parts: list[str] = []
        sequence = 0
        try:
            async for text_chunk in self.response_generator.stream(request):
                if generation != self._generation:
                    logger.info("event=stale_response_discarded call_id=%s turn_id=%s generation_id=%s", event.call_id, turn_id, generation)
                    return
                if not text_chunk:
                    continue
                parts.append(text_chunk)
                if sequence == 0:
                    self._record_latency(LatencyCheckpointName.FIRST_RESPONSE_CHUNK, event.call_id, turn_id)
                await self._emit_stream(
                    GeneratedResponseChunkEvent(
                        call_id=self._call_id,
                        turn_id=turn_id,
                        persona_id=persona.id,
                        text=text_chunk,
                        sequence=sequence,
                        is_final=False,
                        timestamp=datetime.now(timezone.utc),
                    )
                )
                sequence += 1
        except Exception:
            if generation == self._generation:
                logger.warning("event=groq_response_failed call_id=%s turn_id=%s", event.call_id, turn_id)
                await self._emit_safe_recovery(event, generation, persona_id=persona.id)
            return

        if generation != self._generation:
            return
        await self._emit_stream(
            GeneratedResponseChunkEvent(
                call_id=self._call_id,
                turn_id=turn_id,
                persona_id=persona.id,
                text="",
                sequence=sequence,
                is_final=True,
                timestamp=datetime.now(timezone.utc),
            )
        )
        generated_text = "".join(parts).strip()
        if not generated_text or generation != self._generation:
            return
        self._record_latency(LatencyCheckpointName.RESPONSE_TEXT_COMPLETED, event.call_id, turn_id)
        response_event = GeneratedResponseEvent(
            call_id=self._call_id,
            turn_id=turn_id,
            persona_id=persona.id,
            text=generated_text,
            timestamp=datetime.now(timezone.utc),
        )
        await self._emit(response_event)
        if generation == self._generation:
            self.history_store.append_ai(generated_text)

    async def _emit_safe_recovery(
        self, event: TranscriptEvent, generation: int, *, persona_id: str | None = None,
    ) -> None:
        """Speak a deterministic, non-promissory failure response via normal TTS."""
        if generation != self._generation:
            return
        text = "I’m sorry, I’m having trouble responding right now. Please repeat that in a moment."
        persona = self.persona_manager.get_active_persona()
        identity = persona_id or persona.id
        await self._emit_stream(GeneratedResponseChunkEvent(
            call_id=self._call_id, turn_id=event.turn_id, persona_id=identity,
            text=text, sequence=0, is_final=False, timestamp=datetime.now(timezone.utc),
        ))
        await self._emit_stream(GeneratedResponseChunkEvent(
            call_id=self._call_id, turn_id=event.turn_id, persona_id=identity,
            text="", sequence=1, is_final=True, timestamp=datetime.now(timezone.utc),
        ))
        if generation != self._generation:
            return
        response = GeneratedResponseEvent(
            call_id=self._call_id, turn_id=event.turn_id, persona_id=identity,
            text=text, timestamp=datetime.now(timezone.utc),
        )
        await self._emit(response)
        if generation == self._generation:
            self.history_store.append_ai(text)

    def _record_latency(
        self,
        name: LatencyCheckpointName,
        call_id: str,
        turn_id: int,
    ) -> None:
        if self.latency_tracker is not None:
            self.latency_tracker.record(name, call_id, turn_id)

    async def _emit_stream(self, event: GeneratedResponseChunkEvent) -> None:
        tasks: list[asyncio.Task[object]] = []
        for subscriber in tuple(self._stream_subscribers):
            result = subscriber(event)
            if asyncio.iscoroutine(result):
                tasks.append(asyncio.create_task(result))
        if tasks:
            await asyncio.gather(*tasks)

    def _response_task_done(self, task: asyncio.Task[None]) -> None:
        if self._active_response_task is task:
            self._active_response_task = None
        if task.cancelled():
            return
        error = task.exception()
        if error is not None:
            logger.error(
                "Scheduled response generation failed",
                exc_info=(type(error), error, error.__traceback__),
            )

    async def _emit(self, event: GeneratedResponseEvent) -> None:
        tasks: list[asyncio.Task[object]] = []
        for subscriber in tuple(self._subscribers):
            result = subscriber(event)
            if asyncio.iscoroutine(result):
                tasks.append(asyncio.create_task(result))
        if tasks:
            await asyncio.gather(*tasks)
