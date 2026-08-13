# EchoAI Backend (FastAPI + SQLite)

This backend covers two modules for the 30% FYP submission:
- Auth: signup/login with bcrypt + JWT
- Admin: scripts, personas, and campaign context + activation

## Quick start

1) Create and activate a Python virtual environment.
2) Install dependencies:

```
pip install -r requirements.txt
```

3) Copy environment settings:

```
copy .env.example .env
```

4) Run the server:

```
uvicorn app.main:app --reload
```

`app.main` is the only supported server entry point. `app.main_mvp` remains a
compatibility alias for older local commands and does not add any extra routes.

## API

Base URL: http://localhost:8000

- POST /api/auth/signup
- POST /api/auth/login
- GET /api/admin/scripts
- POST /api/admin/scripts
- GET /api/admin/scripts/{script_id}
- PUT /api/admin/scripts/{script_id}
- DELETE /api/admin/scripts/{script_id}
- GET /api/admin/personas
- POST /api/admin/personas
- GET /api/admin/personas/{persona_id}
- PUT /api/admin/personas/{persona_id}
- DELETE /api/admin/personas/{persona_id}
- GET /api/admin/campaigns
- POST /api/admin/campaigns
- GET /api/admin/campaigns/{campaign_id}
- PUT /api/admin/campaigns/{campaign_id}
- DELETE /api/admin/campaigns/{campaign_id}
- POST /api/admin/campaigns/{campaign_id}/activate
- POST /api/admin/campaigns/{campaign_id}/pause
- POST /api/admin/campaigns/{campaign_id}/complete
- POST /api/admin/campaigns/{campaign_id}/archive
- POST /api/calls
- POST /api/calls/{call_id}/turns
- GET /api/calls/{call_id}/analysis-prompt
- POST /api/calls/{call_id}/complete
- GET /api/calls/{call_id}
- GET /api/calls?status_filter=completed
- GET /api/admin/analytics/campaigns
- GET /api/admin/reports/calls.csv
- GET /api/admin/leads
- POST /api/admin/leads
- PUT /api/admin/leads/{lead_id}
- GET /api/supervisor/alerts
- POST /api/supervisor/alerts/{alert_id}/acknowledge
- POST /api/supervisor/alerts/{alert_id}/resolve
- POST /api/supervisor/alerts/{alert_id}/takeover
- GET /api/supervisor/campaigns
- GET /api/supervisor/performance
- GET /api/supervisor/preferences
- PUT /api/supervisor/preferences
- GET /api/agent/leads
- GET /api/agent/leads/{lead_id}
- PUT /api/agent/leads/{lead_id}
- GET /api/knowledge
- POST /api/knowledge
- PUT /api/knowledge/{entry_id}
- DELETE /api/knowledge/{entry_id}
- POST /api/voice/calls/{call_id}/audio-turn
- POST /api/voice/calls/{call_id}/text-turn
- POST /api/voice/calls/{call_id}/complete-analysis

## Production 3A Integration

The `/api/voice/*` routes are temporary browser-bridge endpoints. The production Deepgram/Llama 3.1 pipeline should use the core endpoints instead:

1. `POST /api/calls` with an active `campaign_id` and assigned `lead_id`.
2. `POST /api/calls/{call_id}/turns` for every finalized customer and generated AI transcript segment.
3. Start with sequence `0` or `1`, then always use the response's `next_sequence` for the next segment. This preserves ordered call state.
4. Use the returned `llm_prompt`, retrieval context, objection guidance, and escalation result to create the live reply.
5. `GET /api/calls/{call_id}/analysis-prompt`, run one structured post-call LLM analysis, then `POST /api/calls/{call_id}/complete` with `outcome`, `summary`, `analysis`, and `follow_up_recommendation`.

The production pipeline must preserve campaign lifecycle rules: only active campaigns start calls; paused campaigns allow existing calls to finish; completed and archived campaigns are historical records.

## Notes

- SQLite database file is stored at ./echoai.db by default.
- Change DATABASE_URL in .env to switch to PostgreSQL later.

## Tests

Run the isolated backend workflow checks from `echoai-backend/`:

```powershell
py -3 -m unittest discover -s tests -v
```
