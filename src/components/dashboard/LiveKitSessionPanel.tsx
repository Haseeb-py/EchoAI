"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Radio } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";
import { apiGet, apiPost } from "@/lib/api-client";
import { getStoredAuthToken } from "@/lib/auth";

type VoiceSession = { id: string; call_id: string; room_name: string; status: string; livekit_url: string; participant_token: string };
type VoiceEvent = { id: number; type: string; data: Record<string, unknown> };
type LiveVoice = { session: { listening: string; speaking: string; persona: { name: string; voice: string; speech_rate: number } }; events: VoiceEvent[] };
type CognitiveState = { intent: string; sentiment: string; emotion: string; intent_confidence?: number; emotion_confidence?: number; inference_ms?: number };
type SalesState = { objection_type: string; buying_signal: string; commitment_confirmed: boolean; recommended_strategy?: string; inference_ms?: number };

export function LiveKitSessionPanel({ callId }: { callId: string | null }) {
  const roomRef = useRef<Room | null>(null);
  const audioHostRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [message, setMessage] = useState("Connect the authenticated audio transport when the voice worker is available.");
  const [events, setEvents] = useState<VoiceEvent[]>([]);
  const [live, setLive] = useState<LiveVoice["session"] | null>(null);
  const [cognitive, setCognitive] = useState<CognitiveState | null>(null);
  const [sales, setSales] = useState<SalesState | null>(null);

  useEffect(() => {
    if (!callId || state !== "connected") return;
    let after = 0;
    let cancelled = false;
    const poll = async () => {
      try {
        const update = await apiGet<LiveVoice>(`/api/voice/sessions/${callId}/live?after=${after}`, getStoredAuthToken());
        if (cancelled) return;
        setLive(update.session);
        if (update.events.length) {
          after = update.events[update.events.length - 1].id;
          setEvents((current) => [...current, ...update.events].slice(-40));
          const latestCognitive = [...update.events].reverse().find((event) => event.type === "cognitive");
          if (latestCognitive) setCognitive(latestCognitive.data as CognitiveState);
          const latestSales = [...update.events].reverse().find((event) => event.type === "sales");
          if (latestSales) setSales(latestSales.data as SalesState);
        }
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Live voice events are unavailable.");
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 800);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [callId, state]);

  // An unmount or browser refresh only ends the local transport. It must not
  // terminalize a call, because the same active call may legitimately reconnect.
  useEffect(() => () => { roomRef.current?.disconnect(); roomRef.current = null; }, []);

  const connect = async () => {
    if (!callId) {
      setMessage("Start an EchoAI call first, then connect its real-time audio transport.");
      return;
    }
    try {
      setState("connecting");
      const session = await apiPost<VoiceSession>("/api/voice/sessions", { call_id: callId }, getStoredAuthToken());
      const room = new Room({ adaptiveStream: true, dynacast: true });
      room.on(RoomEvent.Disconnected, () => { roomRef.current = null; setState("idle"); });
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind !== Track.Kind.Audio || !audioHostRef.current) return;
        const element = track.attach();
        element.autoplay = true;
        audioHostRef.current.replaceChildren(element);
        void element.play().catch(() => setMessage("Audio is connected. Use the browser's audio permission control to enable playback."));
      });
      await room.connect(session.livekit_url, session.participant_token);
      await room.localParticipant.setMicrophoneEnabled(true, { echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      roomRef.current = room;
      setState("connected");
      setMessage(`Connected to secure room ${session.room_name.slice(0, 22)}... Waiting for the Module 3A worker.`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Unable to connect the real-time audio transport.");
    }
  };

  const transcript = events.filter((event) => (event.type === "transcript" && Boolean(event.data.is_final)) || event.type === "response");
  const latency = events.filter((event) => event.type === "latency").slice(-3);

  return (
    <section className="mt-4 rounded-[18px] border border-[#8fdde0]/16 bg-[#8fdde0]/[0.045] p-4">
      <div ref={audioHostRef} className="hidden" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fdde0]">LiveKit transport</div>
          <p className="mt-1 text-[12px] leading-5 text-white/58">{message}</p>
        </div>
        {state !== "connected" ? (
          <button type="button" disabled={!callId || state === "connecting"} onClick={() => void connect()} className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#8fdde0] px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#10262a] disabled:cursor-not-allowed disabled:opacity-40">
            {state === "connecting" ? <AudioLines size={14} className="animate-pulse" /> : <Radio size={14} />}
            {state === "connecting" ? "Connecting" : "Connect audio"}
          </button>
        ) : null}
      </div>
      {live ? <div className="mt-3 grid gap-2 text-[11px] text-white/65 sm:grid-cols-3"><div>State: <span className="text-[#8fdde0]">{live.listening} / {live.speaking}</span></div><div>Persona: <span className="text-white">{live.persona.name}</span></div><div>Voice: <span className="text-white">{live.persona.voice}</span></div></div> : null}
      {cognitive ? <div className="mt-3 grid gap-2 rounded-[12px] border border-[#b9b7ff]/16 bg-[#b9b7ff]/[0.05] p-3 text-[11px] text-white/68 sm:grid-cols-4"><div><span className="text-white/42">Intent</span><div className="mt-1 font-semibold capitalize text-white">{cognitive.intent}</div></div><div><span className="text-white/42">Sentiment</span><div className="mt-1 font-semibold capitalize text-white">{cognitive.sentiment}</div></div><div><span className="text-white/42">Emotion</span><div className="mt-1 font-semibold capitalize text-white">{cognitive.emotion}</div></div><div><span className="text-white/42">Detection</span><div className="mt-1 font-semibold text-white">{typeof cognitive.inference_ms === "number" ? `${cognitive.inference_ms.toFixed(1)} ms` : "Available"}</div></div></div> : null}
      {sales ? <div className="mt-3 grid gap-2 rounded-[12px] border border-[#f6c56f]/16 bg-[#f6c56f]/[0.05] p-3 text-[11px] text-white/68 sm:grid-cols-3"><div><span className="text-white/42">Objection</span><div className="mt-1 font-semibold capitalize text-white">{sales.objection_type.replaceAll("_", " ")}</div></div><div><span className="text-white/42">Buying signal</span><div className="mt-1 font-semibold capitalize text-white">{sales.buying_signal}</div></div><div><span className="text-white/42">Commitment</span><div className="mt-1 font-semibold text-white">{sales.commitment_confirmed ? "Stated" : "Not confirmed"}</div></div>{sales.recommended_strategy ? <div className="sm:col-span-3 text-white/52">Strategy: {sales.recommended_strategy}</div> : null}</div> : null}
      {events.some((event) => event.type === "barge_in") ? <div className="mt-3 rounded-[9px] bg-amber-300/10 px-3 py-2 text-[11px] text-amber-100">Customer interruption detected — prior audio cancelled.</div> : null}
      {transcript.length ? <div className="mt-3 max-h-44 space-y-2 overflow-y-auto rounded-[12px] border border-white/[0.06] bg-black/20 p-3">{transcript.map((event) => <div key={event.id} className="text-[12px] leading-5 text-white/72"><span className="mr-2 text-[9px] font-semibold uppercase tracking-[.12em] text-[#8fdde0]">{event.type === "response" ? "EchoAI" : "Customer"}</span>{String(event.data.text || "")}</div>)}</div> : null}
      {latency.length ? <div className="mt-3 text-[10px] text-white/46">Latency: {latency.map((event) => `${String(event.data.checkpoint)} ${String(event.data.elapsed_ms)}ms`).join(" · ")}</div> : null}
    </section>
  );
}
