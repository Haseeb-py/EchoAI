# Operational MVP API

Run the backend with:

```powershell
uvicorn app.main:app --reload
```

`app.main` is the canonical application entry point. It includes the operational API alongside the existing authentication and admin APIs.

## 3A → 3B transcript handoff

1. Create a call with `POST /api/calls` using an active `campaign_id`.
2. Post every final Deepgram turn to `POST /api/calls/{call_id}/turns`.

```json
{
  "campaign_id": "campaign-id",
  "sequence": 1,
  "speaker": "customer",
  "transcript": "The price seems too high. Can I speak to a supervisor?",
  "is_final": true
}
```

The response includes the current script node, next node, matching approved objection response, campaign-first/global-second retrieved knowledge, escalation state, and an `llm_prompt`. Track 3A sends that prompt to Llama 3.1 and plays the resulting reply through Deepgram TTS.

## Completion and analysis handoff

When a call ends, 3A obtains the prompt-engineered analysis task from `GET /api/calls/{call_id}/analysis-prompt`, runs it through Llama 3.1, then persists the JSON result with `POST /api/calls/{call_id}/complete`.

```json
{
  "outcome": "follow_up_requested",
  "summary": "The customer asked for a pricing follow-up next week.",
  "analysis": {
    "start_sentiment": "neutral",
    "end_sentiment": "positive",
    "overall_sentiment": "positive",
    "intent": "evaluate pricing",
    "toxic_language": [],
    "objections": ["price"]
  },
  "follow_up_recommendation": "Send pricing options and schedule a call next week."
}
```

## Campaign retention

Campaigns follow `draft -> active -> paused -> completed -> archived`. Campaign deletion is intentionally rejected so completed and archived campaign history, including calls and statistics, remains available to admins.

## Knowledge base endpoints

- `GET /api/knowledge?campaign_id={optional-id}`
- `POST /api/knowledge` (admin)
- `PUT /api/knowledge/{entry_id}` (admin)
- `DELETE /api/knowledge/{entry_id}` (admin)

Only `published` knowledge is retrieved during live calls. Campaign-scoped entries are ranked ahead of global entries.

## Script node migration format

Until the original script CRUD endpoint is migrated, store this JSON in a script's existing `content` field:

```json
{
  "nodes": [
    {"id": "opening", "type": "opening", "goal": "Introduce the call", "prompt": "Introduce yourself and ask permission to continue.", "next_node_ids": ["discovery"]},
    {"id": "discovery", "type": "discovery", "goal": "Identify the customer need", "prompt": "Ask one discovery question.", "next_node_ids": ["pitch"]},
    {"id": "pitch", "type": "pitch", "goal": "Present the campaign offer", "prompt": "Connect the offer to the stated need.", "next_node_ids": ["closing"]},
    {"id": "closing", "type": "closing", "goal": "Agree the next action", "prompt": "Confirm the agreed next step.", "next_node_ids": []}
  ]
}
```

Admin objection endpoints are `POST` and `GET /api/admin/scripts/{script_id}/objections`.
