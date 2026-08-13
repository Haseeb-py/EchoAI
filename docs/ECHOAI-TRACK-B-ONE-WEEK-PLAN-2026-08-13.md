# EchoAI Track B One-Week Plan

**Date:** 2026-08-13  
**Purpose:** Forward execution baseline and implementation record for the EchoAI FYP as of Thursday, August 13, 2026. This document maps the one-week implementation plan to the official SDS module structure and frontend screen inventory so newer chats and contributors can follow one clear source of truth.

## Planning Position

This document does not replace the historical status snapshot in `PROJECT-CHECKPOINT.md`. It defines the implementation baseline for the next one-week build window.

The framing for this week is:
- Modules 1 and 2 are already complete and remain documented as complete.
- Module 3 is split operationally into `3A Voice I/O` and `3B Conversation State & Script Flow`.
- Track B owns Modules `3B`, `4`, `5`, and `6` for this week.
- Modules `7` and `8` remain part of the official project scope and are not dropped, but they are teammate-owned or downstream integration targets for this build window.

## Implementation Record: August 13, 2026

Track B baseline implementation is complete for the current MVP. The completed work is intentionally backend-driven and retains campaign history after completion and archival.

### Completed Track B scope

- Module 3B: persisted calls, transcript turns, ordered script-node progression, prompt assembly, call detail views, and the temporary Deepgram/Groq bridge contract.
- Module 4: prompt-engineered post-call summary, start/end/overall sentiment, intent, objection, toxicity, outcome, and follow-up persistence.
- Module 5: campaign-first and global-second published knowledge retrieval, approved script objection entries, and grounding supplied in the live LLM prompt.
- Module 6: persisted rule-based escalation alerts, acknowledgement, takeover requests, resolution notes, and audit events.
- Lifecycle retention: `draft -> active -> paused -> completed -> archived`; campaign deletion is rejected and archived history remains present in analytics, CRM, and CSV export.
- Frontend operational screens: Admin M7 setup/knowledge/campaign lifecycle, Agent campaign launcher/voice lab/history/CRM/detail screens, and Supervisor dashboard/activity/campaigns/alerts/escalations/call cockpit/performance/preferences.
- Hardening: isolated backend workflow tests, canonical FastAPI entry point, and removal of the hidden browser live-call simulation engine from active layouts.

### Current handoff boundary

The temporary voice adapter is a compatibility bridge, not the final 3A implementation. It uses `POST /api/calls`, `POST /api/calls/{call_id}/turns`, and call completion endpoints that the teammate's streaming Deepgram STT/TTS and Llama 3.1 pipeline should keep using. Replacing the adapter must not change the Track B lifecycle, retrieval, escalation, or post-call persistence contracts.

### Remaining project work

- Teammate-owned Module 3A production streaming voice pipeline replacement.
- Teammate-owned Modules 7 and 8 implementation beyond the persisted Track B contracts already supplied.
- Production hardening: formal migrations for non-SQLite deployment, broader API/frontend test coverage, deployment configuration, and end-to-end browser microphone testing.
- Retire legacy un-routed local simulation source files only after confirming no external demo or coursework dependency still imports them.

## Official SDS Module Mapping

### Module 1: Security and Access Control
- Status: Complete
- Scope this week: No new module-level build ownership
- Notes:
  - Keep the current JWT, RBAC, account-status gating, and admin user-management foundation unchanged.
  - New APIs added this week must continue to respect existing RBAC behavior.

### Module 2: Script and Persona Setup
- Status: Complete foundation, extended as a dependency
- Scope this week:
  - Extend the existing admin setup concept to support node-based script authoring.
  - Support campaign-linked objection entries and knowledge base content.
- Notes:
  - This is not a new standalone module for the week.
  - It is the configuration dependency for Track B work.

### Module 3: Voice-Enabled Conversational Interface
- Status: Split by ownership for practical delivery
- Ownership this week:
  - `3A Voice I/O` - teammate-owned
  - `3B Conversation State & Script Flow` - Track B owned
- `3A` scope:
  - Deepgram STT/TTS
  - live Llama 3.1 connection
  - sending finalized turns to the backend
- `3B` scope:
  - call state persistence
  - transcript-turn ingestion
  - script-node progression
  - prompt assembly using script context and retrieval context
  - approved reply generation for the live path

### Module 4: Cognitive Intelligence and Emotion Engine
- Status: Remaining, Track B owned
- MVP interpretation for this week:
  - implement post-call LLM analysis instead of separate classifiers
  - generate one structured analysis per completed call
- Required outputs:
  - call summary
  - sentiment at start of call
  - sentiment at end of call
  - overall sentiment
  - customer intent
  - call outcome
  - objection summary
  - toxic language findings
  - extracted lead details
  - follow-up recommendation

### Module 5: Dynamic Sales and Objection Handling Agent
- Status: Remaining, Track B owned
- Scope this week:
  - campaign-specific objection and FAQ/knowledge retrieval
  - global knowledge fallback after campaign search
  - prompt-grounded objection handling during the live call
  - deterministic fallback behavior when retrieval is weak or absent
- Notes:
  - No classifier-based objection system is planned for the MVP path.
  - The LLM remains the response generator, grounded by retrieved approved context.

### Module 6: Intelligent Escalation and Supervisor Alerts
- Status: Remaining, Track B owned
- Scope this week:
  - rule-based escalation triggers
  - alert creation and persistence
  - supervisor acknowledgement workflow
  - supervisor resolution workflow
  - takeover request and tracking
  - audit events around escalation decisions
- Live escalation triggers for the MVP:
  - customer requests a human
  - critical phrase is detected
  - repeated unresolved objection occurs
  - manual escalation is initiated

### Module 7: Predictive Lead Scoring and Analytics
- Status: Remaining, teammate-owned this week
- Scope handling for this document:
  - keep Module 7 explicitly in official project scope
  - do not mark it complete
  - Track B must persist the outputs Module 7 needs later
- Expected downstream inputs from Track B:
  - call outcomes
  - objection history
  - post-call analysis results
  - campaign and call lifecycle data

### Module 8: CRM and Lead Management System
- Status: Remaining, teammate-owned this week
- Scope handling for this document:
  - keep Module 8 explicitly in official project scope
  - do not mark it complete
  - Track B must persist the outputs Module 8 consumes
- Expected downstream inputs from Track B:
  - summaries
  - sentiments
  - extracted lead details
  - follow-up recommendations
  - per-call history linked to campaigns and leads

## Ownership Split For This Week

| Area | Owner | Status for week |
| --- | --- | --- |
| Module 1 | Shared / already built | Complete |
| Module 2 | Shared / already built | Complete foundation |
| Module 3A Voice I/O | Teammate | In progress |
| Module 3B Conversation State & Script Flow | Track B | Main build scope |
| Module 4 Cognitive Intelligence and Emotion Engine | Track B | Main build scope |
| Module 5 Objection Handling Agent | Track B | Main build scope |
| Module 6 Escalation and Supervisor Alerts | Track B | Main build scope |
| Module 7 Lead Scoring and Analytics | Teammate | In official scope, downstream dependency |
| Module 8 CRM and Lead Management | Teammate | In official scope, downstream dependency |

## Frontend Screen Mapping

The official frontend workflow remains valid. This week’s implementation should map to the screens below.

### Direct build-focus screens

#### M7 Script & Persona Setup
- Extend admin setup so campaigns can define:
  - flexible ordered script nodes
  - approved objection entries
  - campaign knowledge base entries
  - optional linkage to global knowledge content
- Keep current campaign setup behavior as the foundation.

#### M3 Call Interface / Monitor
- Backend-drive the operational state used by the live screen:
  - live transcript turns
  - current script node
  - next approved reply
  - objection context
  - escalation status
- This remains the main live operational view for agent/supervisor monitoring.

#### M4 Supervisor Dashboard
- Backend-drive:
  - escalation alerts
  - severity/reason state
  - acknowledgement status
  - resolution state
  - takeover workflow state

### Integration-output target screens

#### M5 Analytics Dashboard
- Not the main build ownership for this week.
- Preserve and persist the data contract needed later by Module 7.

#### M6 CRM / Lead Management
- Not the main build ownership for this week.
- Persist the lead/call outputs Module 8 depends on.

#### M8 Lead Details
- Not the main build ownership for this week.
- Persist the detail data required for future drilldown:
  - call history
  - summaries
  - sentiment fields
  - objections
  - follow-up recommendations

## Core Design Rules

- Use flexible ordered script nodes as the canonical authoring model for the MVP.
- Retrieve knowledge from the campaign knowledge base first and the global knowledge base second.
- Use prompt engineering for:
  - objection handling
  - post-call sentiment extraction
  - toxic language findings
  - call summarization
- Do not use separate sentiment or toxicity classifiers in the one-week MVP path.
- Keep the live path simple and easy to debug.
- Favor transparent rule-based escalation logic over opaque model-driven routing.
- Campaign lifecycle must support long-term visibility:
  - `draft -> active -> paused -> completed -> archived`
- Archived campaigns must remain full read-only history:
  - visible to admins
  - queryable in analytics
  - available for exports
  - drillable into call and summary data

## Integration Contract With 3A

Track B assumes that the voice pipeline sends finalized turns to:

`POST /api/calls/{call_id}/turns`

The backend response for the live path should provide enough state for the voice loop and monitor screens to continue, including:
- current node state
- next node hint or transition result
- approved assistant reply
- retrieval context or grounded knowledge references
- objection guidance or match result
- escalation status and reason
- current call status

Track B also owns the backend finalization path that turns a completed call into persisted structured analysis for downstream Modules 7 and 8.

### Production 3A Replacement Contract

The production Deepgram STT/TTS and Llama 3.1 pipeline must use the core Track B endpoints below. It must not depend on the temporary `/api/voice/*` browser adapter.

1. Start a call with `POST /api/calls` using an active campaign and an assigned lead:

```json
{ "campaign_id": "campaign-id", "lead_id": "lead-id" }
```

2. Send every finalized transcript segment to `POST /api/calls/{call_id}/turns`. The first sequence may be `0` or `1`; every later customer, AI, supervisor, or system turn must use the `next_sequence` returned by the preceding request.

```json
{ "campaign_id": "campaign-id", "sequence": 0, "speaker": "customer", "transcript": "The price seems high." }
```

3. Use `llm_prompt`, `retrieval_context`, `approved_objection_response`, and `escalation` from the turn response to generate the grounded Llama reply. Persist that reply as an `ai` turn using the returned `next_sequence`; use the resulting response's `next_sequence` for the next customer segment.

4. When the call ends, request `GET /api/calls/{call_id}/analysis-prompt`, run the single post-call LLM analysis, and finalize with `POST /api/calls/{call_id}/complete`:

```json
{
  "outcome": "converted",
  "summary": "Concise factual call summary.",
  "analysis": {
    "start_sentiment": "neutral",
    "end_sentiment": "positive",
    "overall_sentiment": "positive",
    "intent": "purchase",
    "toxic_language": [],
    "objections": ["price"],
    "extracted_lead_details": {
      "contact_details": [],
      "stated_needs": ["pilot proposal"],
      "timeline": "",
      "budget_context": "",
      "decision_maker_context": ""
    }
  },
  "follow_up_recommendation": "Send the pilot proposal."
}
```

### Integration Invariants

- Calls may start only for an active campaign and a lead may have only one active call.
- A paused campaign blocks new calls but permits an existing call to finish.
- A completed campaign stops active calls; archived data remains read-only history.
- The backend rejects duplicate, skipped, and out-of-order turn sequences.
- Campaign-first published knowledge, global fallback knowledge, approved objections, and rule-based escalation remain backend-owned.
- The temporary `/api/voice/*` endpoints are only a compatibility bridge and are replaced by production 3A without changing Track B records or lifecycle rules.

## Acceptance Demo For The Week

The week is considered successful when the system can demonstrate the following end-to-end flow:

1. Admin creates or updates a campaign with flexible ordered script nodes.
2. Admin attaches approved objection content and campaign knowledge entries.
3. Campaign is activated and becomes available for call operations.
4. The live voice pipeline sends finalized transcript turns to the Track B backend.
5. Track B advances the conversation state, retrieves campaign/global knowledge, and returns the next approved reply.
6. A human-request or other escalation rule creates a supervisor alert visible in the monitoring flow.
7. When the call ends, one structured LLM analysis is generated and persisted.
8. The persisted outputs are available for downstream scoring, CRM, and future analytics screens.
9. The campaign can move to `completed` and then `archived` while remaining fully visible in read-only historical views.

## What This Document Intentionally Avoids

- It does not rewrite older project history.
- It does not replace `PROJECT-CHECKPOINT.md`.
- It does not mark Modules 7 or 8 complete or removed.
- It does not treat localStorage simulation as the final architecture.
- It does not collapse teammate-owned scope into Track B ownership.

## Strict SDS Completion Record

Status recorded on August 13, 2026 after implementation and verification.

| Official module | Strict completion status | Implemented evidence |
| --- | --- | --- |
| Module 2: Script and Persona Setup | Complete | Backend CRUD is wired to the admin setup screens. Activation validates ordered nodes and active references, then freezes script and persona snapshots so historical campaigns cannot drift. |
| Module 3B: Conversation State and Script Flow | Complete | Calls persist ordered turns, node state, recent memory, grounded prompts, and response/escalation context through the stable core call APIs. |
| Module 4: Cognitive Intelligence and Emotion Engine | Complete | One post-call LLM output is schema-validated and retained with summary, start/end/overall sentiment, intent, outcome, toxicity, objections, follow-up, and explicitly stated lead details. |
| Module 5: Dynamic Sales and Objection Handling Agent | Complete | Published campaign knowledge is retrieved before global knowledge with traceable source labels and relevance. Objection guidance has protected CRUD, node validation, and prompt grounding. |
| Module 6: Intelligent Escalation and Supervisor Alerts | Complete | Automatic rule triggers and explicit agent requests create persisted alerts; supervisor acknowledgement, takeover, resolution, polling-based monitoring, and the complete audit timeline are implemented. |

### Verification Record

- `npm run lint`: passed.
- `npm run build`: passed; all 30 frontend routes compiled and generated successfully.
- `py -3.14 -m pytest echoai-backend/tests/test_operational_workflows.py -q`: passed, `26 passed`.
- The backend suite uses a disposable SQLite database and covers campaign lifecycle/history, call sequencing, retrieval, objection guidance, post-call analysis parsing/persistence, manual and automatic escalations, RBAC, and downstream output contracts.

### Remaining External Dependency

Module 3 is only fully complete as an official end-to-end module after the teammate-owned production 3A streaming implementation is integrated. The existing Deepgram/Groq browser adapter is functional for demonstration and uses the stable Track B contracts, but it is intentionally not labeled as the final streaming pipeline.

## Assumptions and Defaults

- Date anchor: Thursday, August 13, 2026.
- The PDF playbook was not extracted in the current environment.
- This mapping is grounded in:
  - `docs/EchoAI_SDS_Revised.md`
  - `docs/EchoAI_Frontend_Workflow.md`
  - `docs/ECHOAI-ONE-WEEK-IMPLEMENTATION.md`
  - `docs/IMPLEMENTATION-PHASES.md`
  - `docs/PROJECT-CHECKPOINT.md`
- This file is the recommended canonical handoff document for new implementation chats before coding begins.
