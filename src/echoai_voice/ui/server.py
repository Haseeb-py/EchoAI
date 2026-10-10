"""Standalone Phase 7 development UI server."""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import json
import os
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from echoai_voice.ui.controller import VoiceUiController

STATIC_DIR = Path(__file__).with_name("static")
controller = VoiceUiController()
managed_controllers: dict[str, VoiceUiController] = {}


class PersonaSelection(BaseModel):
    persona_id: str


class ManagedSessionStart(BaseModel):
    call_id: str
    room_name: str
    participant_identity: str
    persona_id: str | None = None
    persona: dict[str, object] | None = None
    opening_instruction: str | None = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    if controller.is_running:
        await controller.end_call()
    for managed in tuple(managed_controllers.values()):
        if managed.is_running:
            await managed.end_call()


app = FastAPI(
    title="EchoAI Module 3A Development UI",
    version="0.1.0",
    lifespan=lifespan,
)
app.mount("/assets", StaticFiles(directory=STATIC_DIR), name="assets")


@app.get("/", include_in_schema=False)
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/state")
async def state() -> dict[str, object]:
    return controller.snapshot()


@app.get("/api/personas")
async def personas() -> list[dict[str, object]]:
    return controller.list_personas()


@app.put("/api/persona")
async def select_persona(selection: PersonaSelection) -> dict[str, object]:
    try:
        return controller.select_persona(selection.persona_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown persona") from None


@app.post("/api/calls/start")
async def start_call() -> dict[str, object]:
    try:
        return await controller.start_call()
    except Exception:
        raise HTTPException(
            status_code=503, detail="Unable to start the real voice pipeline"
        ) from None


@app.post("/api/calls/credentials")
async def call_credentials() -> dict[str, str]:
    """Issue browser credentials before the slower server pipeline startup."""

    try:
        return controller.browser_credentials()
    except Exception:
        raise HTTPException(
            status_code=503, detail="Unable to prepare the LiveKit browser session"
        ) from None


@app.post("/api/calls/end")
async def end_call() -> dict[str, object]:
    try:
        return await controller.end_call()
    except Exception:
        raise HTTPException(
            status_code=500, detail="Unable to stop the voice pipeline cleanly"
        ) from None


def _require_internal_secret(value: str | None) -> None:
    expected = os.getenv("ECHOAI_INTERNAL_VOICE_SECRET", "")
    if not expected or value != expected:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid internal voice-service credential")


@app.post("/api/internal/sessions/start")
async def start_managed_session(payload: ManagedSessionStart, x_echoai_voice_secret: str | None = Header(default=None)) -> dict[str, object]:
    """Start one isolated Module 3A worker in EchoAI's call-specific room."""

    _require_internal_secret(x_echoai_voice_secret)
    existing = managed_controllers.get(payload.call_id)
    if existing and existing.is_running:
        return existing.snapshot()
    if existing:
        await existing.end_call()
    managed = VoiceUiController(
        room_name=payload.room_name,
        call_id=payload.call_id,
        participant_identity=payload.participant_identity,
        persona_config=payload.persona,
        opening_instruction=payload.opening_instruction,
    )
    if payload.persona_id:
        try:
            managed.select_persona(payload.persona_id)
        except KeyError:
            # EchoAI persona UUIDs are resolved by the integration adapter later;
            # keep the safe local default while the call transport starts.
            pass
    managed_controllers[payload.call_id] = managed
    try:
        return await managed.start_call()
    except Exception:
        managed_controllers.pop(payload.call_id, None)
        raise HTTPException(status_code=503, detail="Unable to start the managed voice session") from None


@app.post("/api/internal/sessions/{call_id}/end")
async def end_managed_session(call_id: str, x_echoai_voice_secret: str | None = Header(default=None)) -> dict[str, object]:
    _require_internal_secret(x_echoai_voice_secret)
    managed = managed_controllers.pop(call_id, None)
    if not managed:
        return {"call_id": call_id, "status": "ended"}
    await managed.end_call()
    return {"call_id": call_id, "status": "ended"}


@app.get("/api/internal/sessions/{call_id}/live")
async def managed_session_live(call_id: str, after: int = 0, x_echoai_voice_secret: str | None = Header(default=None)) -> dict[str, object]:
    _require_internal_secret(x_echoai_voice_secret)
    managed = managed_controllers.get(call_id)
    if not managed:
        raise HTTPException(status_code=404, detail="Managed voice session not found")
    return {"session": managed.snapshot(), "events": managed.events_since(after)}


@app.get("/api/events")
async def events() -> StreamingResponse:
    queue = controller.subscribe_events()

    async def stream():
        try:
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=15)
                except TimeoutError:
                    yield ": keep-alive\n\n"
                    continue
                payload = json.dumps(event["data"], separators=(",", ":"))
                yield f"event: {event['type']}\ndata: {payload}\n\n"
        finally:
            controller.unsubscribe_events(queue)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def main() -> None:
    """Run the standalone local development server."""

    import uvicorn

    uvicorn.run(
        app,
        host=os.getenv("ECHOAI_UI_HOST", "127.0.0.1"),
        port=int(os.getenv("ECHOAI_UI_PORT", "8080")),
        reload=False,
    )


if __name__ == "__main__":
    main()
