# Implementation Phases

This file explains what to build first, what depends on what, and how to split work between team members.

Note:
`Onboarding wizard` and `CRM / Lead Management` are still part of the EchoAI implementation plan. Their current frontend code has been removed temporarily, but they remain in scope for a later build pass.

## Phase 1: Access and Lead Foundation
Goal: Make the product usable from first visit to lead handling.

Screens:
1. Landing page
2. Signup and login
3. Authentication states
4. Onboarding wizard
5. CRM and lead management
6. Lead detail
7. Lead scoring
8. Persona engine

Reusable components to finalize in this phase:
1. `AuthShell`
2. `TopHeader`
3. `StatusBadge`
4. `LeadTable`
5. `ScoreChip`
6. `InsightPanel`

Definition of done:
1. User can sign in and complete onboarding
2. Lead list and lead detail both work with shared components
3. Scoring and persona views follow design system

---

## Phase 2: Live Operations
Goal: Support active call workflow and real-time monitoring.

Screens:
1. Agent dashboard
2. Live call cockpit
3. Alerts and objection detection
4. Alerts and objection monitor
5. Objection library
6. Smart followups
7. Call review and QA
8. Supervisor dashboard

Reusable components to finalize in this phase:
1. `Sidebar`
2. `CommandBar`
3. `LiveCallCard`
4. `AlertTimeline`
5. `ObjectionCard`
6. `TranscriptPanel`
7. `QAScoreCard`

Definition of done:
1. Call controls and live indicators are consistent
2. Alerts and objection flows are connected
3. Supervisor can track agent/call quality views

---

## Phase 3: Intelligence, Admin, and Hardening
Goal: Reporting, governance, and complete system-state coverage.

Screens:
1. Analytics dashboard
2. Reports and exports
3. Security and admin
4. System states

Reusable components to finalize in this phase:
1. `ChartCard`
2. `DateRangeFilter`
3. `ExportModal`
4. `PermissionMatrix`
5. `AuditLogTable`
6. `SystemStateBlocks` (empty/loading/error/offline/no-access)

Definition of done:
1. Analytics and exports use unified data cards
2. Admin and permission views are production-ready
3. Every screen has complete state handling

---

## Suggested Team Split (2 People)
1. Partner A: screen implementation and layout fidelity
2. Partner B: reusable components and shared states

Weekly sync checklist:
1. Validate design consistency
2. Resolve component API changes
3. Track blockers and dependencies
4. Keep a single source-of-truth in `echoai/src`
