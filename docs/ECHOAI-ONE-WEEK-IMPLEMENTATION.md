# EchoAI One-Week Implementation Tracker

**Date:** 2026-08-13  
**Purpose:** Execution tracker for the complete FYP MVP, including both the Project Playbook pipeline and the unfinished work identified in `PROJECT-CHECKPOINT.md`.

## Baseline

The official playbook has nine work packages: Modules 1, 2, 3A, 3B, 4, 5, 6, 7, and 8. Modules 1 (Security & Access Control) and 2 (Script, Persona & Campaign Setup) are complete: **2/9 complete**.

| Package | Owner | Status | Completion evidence |
| --- | --- | --- | --- |
| 1. Security & Access Control | Shared | Complete | JWT, RBAC, account status, admin users |
| 2. Script, Persona & Campaign Setup | Shared | Complete | Persisted CRUD and activation |
| 3A. Voice I/O | Teammate | In progress | Deepgram STT/TTS plus Llama 3.1 connection |
| 3B. Conversation State & Script Flow | Track B | Remaining | JSON nodes and transcript-turn state |
| 4. Post-call Cognitive Analysis | Track B | Remaining | One Llama completion analysis |
| 5. Objection Agent | Track B | Remaining | Retrieved approved responses |
| 6. Escalation & Alerts | Track B | Remaining | Persisted supervisor workflow |
| 7. Lead Scoring & Analytics | Teammate | Remaining | Rule score and dashboards |
| 8. CRM & Lead Management | Teammate | Remaining | Leads, summaries and follow-ups |

## Scope and Design Rules

- Canonical script format is validated JSON nodes: `opening`, `discovery`, `pitch`, `objection`, `closing`.
- 3A posts finalized Deepgram turns to `POST /api/calls/{call_id}/turns`; the API returns state, approved objection guidance, reply and escalation status.
- Keep the live path fast: no real-time sentiment classifiers, VADER, Transformers, BERT, Redis, or WebSockets this week.
- Llama 3.1 produces reply text during the call and one structured post-call analysis: summary, start/end/overall sentiment, intent, outcome, objections, extracted lead details and follow-up recommendation.
- Live escalation uses transparent rules: human request, critical phrase, repeated unresolved objection, or manual escalation.
- SQLite is the FYP MVP store. Campaign lifecycle is `draft → active → paused → completed → archived`; archived campaigns are read-only and retained indefinitely with all historical metrics.

## Screen Target

30 routes exist: 4 public/auth, 11 admin, 8 supervisor, and 7 agent.

| Delivery point | Backend-backed screens | Remaining |
| --- | ---: | ---: |
| Current code | 8 | 22 |
| Track B complete | 22 | 8 |
| Track A and full integration complete | 30 | 0 |

Track B makes public/auth, admin setup/governance, all supervisor screens, and agent campaigns/live monitoring operational. Track A finishes agent dashboard/history/leads/call details plus admin analytics/CRM/reports.

## Work Sequence

1. Build SQLite entities and APIs for calls, turns, state, objection entries, alerts, leads, summaries, scores, follow-ups and audit events.
2. Implement 3B JSON-node progression and bounded call memory.
3. Implement objection CRUD, lightweight retrieval and deterministic reply fallback.
4. Implement rule-based escalation, supervisor acknowledgement/resolution/takeover request, and REST-backed screens.
5. Integrate 3A; complete scoring, CRM, summaries, follow-ups, analytics and CSV exports.
6. Resolve original checkpoint gaps: onboarding, shared lead source of truth, real live operations, admin hardening and all UI state handling.
7. Test RBAC, CRUD, turn ingestion, node progression, objection fallback, escalation, campaign archive, scoring, CRM and exports.

## Acceptance Demo

Admin creates a JSON-node script with approved objections and activates a campaign. A Deepgram transcript turn advances the script and grounds the response. A human request creates a supervisor alert. Closing the call produces one structured Llama analysis, a lead score, CRM summary and follow-up. The completed campaign is archived, remains visible in analytics, and exports to CSV.
