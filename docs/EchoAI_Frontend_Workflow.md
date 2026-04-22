# EchoAI — Frontend Workflow Documentation

> **Based on Software Requirements Specification (SRS)**
> Abdul Haseeb | Muhammad Ehtisham Younas
> Supervisor: Dr. Samera Batool
> COMSATS University Islamabad — BS Data Science (2023–2027)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall System Workflow](#2-overall-system-workflow)
3. [Login & Authentication — Mockup M1](#3-login--authentication--mockup-m1)
4. [Agent Workflow](#4-agent-workflow)
5. [Supervisor Workflow](#5-supervisor-workflow)
6. [Administrator Workflow](#6-administrator-workflow)
7. [Screen Inventory & Role Access Matrix](#7-screen-inventory--role-access-matrix)
8. [Non-Functional Requirements Affecting the Frontend](#8-non-functional-requirements-affecting-the-frontend)
9. [Summary](#9-summary)

---

## 1. Introduction

EchoAI is an **AI-powered voice sales and support system** designed for Business Process Outsourcing (BPO) environments. The platform deploys AI voice agents to autonomously handle real-time voice conversations with customers, while human supervisors maintain oversight and intervene only when escalation is needed.

This document presents the **complete frontend workflow** of EchoAI derived directly from the Software Requirements Specification (SRS). It covers every screen in the system, the navigation paths between screens, and the specific features and interactions available to each of the three user roles: Agent, Supervisor, and Administrator.

---

### 1.1 System Modules

The EchoAI platform consists of **eight core modules**:

| Module | Name | Description |
|--------|------|-------------|
| Module 1 | Security and Access Control | User authentication and RBAC |
| Module 2 | Script and Persona Setup | Sales scripts and AI persona configuration |
| Module 3 | Voice-Enabled Conversational Interface | STT/TTS pipeline |
| Module 4 | Cognitive Intelligence and Emotion Engine | NLP and sentiment analysis |
| Module 5 | Dynamic Sales and Objection Handling Agent | Objection detection and counter-scripts |
| Module 6 | Intelligent Escalation and Supervisor Alerts | Human-in-the-loop takeover |
| Module 7 | Predictive Lead Scoring and Analytics | 0–100 lead scoring and dashboards |
| Module 8 | CRM and Lead Management System | Lead database, AI summaries, follow-ups |

---

### 1.2 User Roles

The SRS defines **three distinct user classes** with different scopes of access and responsibility:

| Role | Primary Responsibility | Access Scope |
|------|----------------------|--------------|
| **Agent** | Import leads, launch AI call sessions, manage post-call lead data. Does not conduct calls directly — all voice interactions are handled by the AI. One Agent can manage hundreds of concurrent AI-handled calls. | Call monitoring, CRM, personal analytics |
| **Supervisor** | Monitor active AI calls in real time, send whisper messages to agents, take over high-risk calls when escalation is triggered. Has access to call transcripts and team analytics. | All active calls, team analytics, escalation alerts |
| **Administrator** | Full system configuration: users, scripts, personas, campaigns, knowledge base. Full access to all features and analytics. | Full system access |

---

### 1.3 Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Frontend | Next.js 14.2 + TypeScript | React-based SSR framework |
| Frontend | Tailwind CSS | Utility-first UI styling |
| Backend | Python 3.11 + FastAPI | AI/ML and REST API layer |
| Voice | Deepgram + OpenAI Whisper | Speech-to-Text and Text-to-Speech |
| AI/ML | Groq API + HuggingFace + VADER | LLM inference, sentiment analysis |
| Database | PostgreSQL 14+ | Persistent data storage |
| Real-time | Redis + LiveKit (WebRTC) | Caching, queuing, real-time audio |
| Telephony | Twilio Programmable Voice | Outbound calls to customer phone numbers |

---

## 2. Overall System Workflow

The diagram below describes the complete end-to-end workflow of EchoAI from initial system configuration through to post-call analytics. All three roles interact with the system at different stages of this flow.

### 2.1 Flow Description

**Step 1 — Configuration:**
The Administrator configures the system by creating scripts, setting AI personas, and activating campaigns via the Script & Persona Setup screen (M7). Campaign context (product name, goals) is mandatory before a campaign can go live.

**Step 2 — Session Launch:**
The Agent logs in, reviews the Agent Dashboard (M2), and launches a campaign calling session. The system automatically dispatches concurrent AI workers up to the configured call limit against the assigned lead list.

**Step 3 — AI Conversations:**
The AI handles all voice interactions autonomously using the STT-NLP-TTS pipeline via Deepgram and Groq API. Real-time text-based sentiment analysis (VADER + HuggingFace) runs continuously throughout each call.

**Step 4 — Monitoring:**
The Agent monitors live calls on the Call Interface (M3), watching the transcript and sentiment indicator. The Supervisor monitors all active calls simultaneously on the Supervisor Dashboard (M4), sorted by sentiment severity.

**Step 5 — Escalation:**
If the customer's sentiment crosses the negative threshold, an escalation alert fires automatically to the Supervisor Dashboard. The Supervisor can send a private whisper message to the Agent or click **Takeover** to assume direct control of the call.

**Step 6 — Post-Call Processing:**
When a call ends, the system automatically:
- Generates an AI summary with key points and next actions
- Computes a lead score (0–100) using rule-based criteria
- Saves all data to the CRM database

**Step 7 — Lead Management:**
The Agent reviews leads in the CRM (M6), opens individual Lead Details (M8) to read transcripts and scores, updates lead statuses, and schedules follow-up reminders.

**Step 8 — Analytics:**
All call data feeds into the Analytics Dashboard (M5), scoped by role: personal view for Agents, team view for Supervisors, and unrestricted global view for Administrators.

---

## 3. Login & Authentication — Mockup M1

The Login Page is the **single entry point** for all three user roles. The system uses Role-Based Access Control (RBAC) to detect the role from the backend credentials and automatically redirects users to their appropriate dashboard.

### 3.1 Screen Elements

- Email input field (standard email format validation)
- Password input field (minimum 8 characters)
- Login button — triggers RBAC role detection and redirect
- Forgot Password link — sends recovery email to registered address
- Account lockout message — displayed after 5 failed attempts

### 3.2 Functional Requirements (M1)

| Feature | Functional Requirement | Business Rule |
|---------|----------------------|---------------|
| User Login | FR-1: System shall allow secure login with email and password credentials. | Email must follow standard format; password minimum 8 characters. |
| Forgot Password | FR-2: System shall allow password reset via recovery process. | Only registered users can initiate; reset link sent to registered email. |
| Authentication | FR-3: System shall block users after 5 failed login attempts. | Account locked after 5 attempts; requires Admin unlock to restore. |
| Session Timeout | FR-4: System shall auto-logout users after 30 minutes of inactivity. | Session cleared and user redirected to login page after timeout. |

### 3.3 Post-Login Navigation

```
Agent credentials       → Agent Dashboard (M2)
Supervisor credentials  → Supervisor Dashboard (M4)
Administrator credentials → Script & Persona Setup (M7)
```

---

## 4. Agent Workflow

The Agent is responsible for importing lead lists, launching AI-managed call sessions, and managing all post-call lead data. Critically, **the Agent does not conduct calls directly** — all voice interactions are handled autonomously by the AI. A single Agent can oversee hundreds of concurrent AI-handled calls simultaneously.

```
Login (M1)
    ↓
Agent Dashboard (M2)
    ↓ [Launch Session]
Call Interface — Monitor (M3)
    ↓ [Call Ends]
CRM / Lead Management (M6)
    ↓ [Click Lead Row]
Lead Details (M8)
    ↓
Analytics Dashboard (M5)
```

---

### 4.1 Agent Dashboard — Mockup M2

The Agent Dashboard is the home screen immediately after login. It provides a real-time summary of call activity and lead pipeline status, and is the starting point for launching new campaign sessions.

| UI Element | Description | Functional Requirement |
|------------|-------------|----------------------|
| Active Calls Counter | Real-time count of all active AI-managed calls with status updates and filter options. | FR-1: Call status must update in real time. |
| Start New Session Button | Launches a campaign calling session; dispatches multiple AI workers concurrently against the assigned lead list. | FR-2: Session launch dispatches AI workers up to concurrent call limit. |
| Call History Table | Recent calls with outcomes and duration, filterable by date range. Updated after each call ends. | FR-3: History filterable by date range. |
| Lead Overview Panel | Total leads count and current conversion rate calculated from call outcomes and lead scores. | FR-4: Lead metrics from call outcomes and scores. |

---

### 4.2 Call Interface — Mockup M3 (Agent View)

The Call Interface allows the Agent to **monitor** what the AI is doing in real time during an active call. This is a **monitoring screen — not a calling screen**. The Agent observes the transcript, sentiment, and active script while the AI manages the conversation.

| UI Element | Description | Functional Requirement |
|------------|-------------|----------------------|
| Live Transcript Panel | Near-real-time STT output of the full conversation between the AI and the customer. | FR-1: Near real-time speech recognition updates. |
| Sentiment Indicator | Current customer sentiment badge: Positive, Neutral, or Negative, updated in real time by NLP analysis. | FR-2: Sentiment updated in real time. |
| Script Display Panel | Current section of the sales script the AI is executing; advances automatically with conversation flow. | FR-4: Script advances based on conversation flow. |
| Call Controls | Mute, Hold, and End Call buttons. Ending a call triggers automatic AI summary generation and lead scoring. | FR-3: End call triggers summary and lead scoring. |
| Objection Overlay | Appears when an objection is detected; shows objection category (price/trust/timing/authority) and the counter-script being deployed by the AI. | Module 5: Automated objection detection and response. |

---

### 4.3 CRM / Lead Management Dashboard — Mockup M6

After calls complete, the Agent manages all lead data from this central CRM view. All lead records and AI summaries are auto-populated from call outcomes — **no manual data entry is required** for basic lead capture.

| UI Element | Description | Functional Requirement |
|------------|-------------|----------------------|
| Leads List Table | All leads with name, contact details, and status (Hot/Warm/Cold), sorted by latest interaction. | FR-1: Sorted by latest interaction. |
| Search Bar | Search leads by name or contact number; results returned within 2 seconds. | FR-2: Results within 2 seconds. |
| Status Filter | Filter by Hot, Warm, or Cold based on predefined lead score thresholds. | FR-3: Categories follow predefined thresholds. |
| Update Lead Status | Manual status override by authorized users only. | FR-4: Only authorized users can modify. |
| View AI Summary | Auto-generated post-call summary per lead showing key points and recommended next actions. | FR-5: Auto-generated after each call. |
| Schedule Follow-Up | Date/time reminder for a lead; both date and time are required fields. | FR-6: Follow-ups require date and time. |

---

### 4.4 Lead Details Page — Mockup M8

Opened by clicking any row in the CRM, this screen provides the deepest view of a single lead including all historical call data.

| UI Element | Description | Functional Requirement |
|------------|-------------|----------------------|
| Lead Info Panel | Full contact details, product interest, and current lead status, fetched in real time. | FR-1: Data fetched in real time. |
| Call Transcript Viewer | Complete transcript of every past call with this lead, stored securely. | FR-2: Transcripts stored securely. |
| Sentiment Score | Sentiment result per interaction, updated each time a call occurs. | FR-3: Sentiment updated per interaction. |
| Lead Score (0–100) | Rule-based score calculated from call interaction data including sentiment and objection outcomes. | FR-4: Score from predefined rule-based criteria. |
| Interaction History | Chronological history of all interactions. Not deletable by Agents. | FR-5: Not deletable by agents. |

---

### 4.5 Analytics Dashboard — Mockup M5 (Agent View)

The Agent sees a **personal performance view** limited to their own call and conversion data.

| UI Element | Description |
|------------|-------------|
| Call Volume Chart | Trend of personal calls over a selected time period, filterable by date range. |
| Sentiment Distribution | Proportion of personal calls categorized as positive, neutral, or negative. |
| Lead Conversion Funnel | Personal funnel: Contacted → Qualified → Nurture → Converted → Lost. |
| Performance Metrics | Personal calls handled and conversion rate calculated from call outcomes and lead scores. |

---

## 5. Supervisor Workflow

The Supervisor monitors all active AI-managed calls in real time, provides guidance through private whisper messages, and can take over calls when escalation is required. The Supervisor Dashboard is the primary screen and **refreshes every 5 seconds**, with calls sorted by sentiment severity so the most at-risk calls always appear at the top of the list.

```
Login (M1)
    ↓
Supervisor Dashboard (M4)
    ↓ [Click Call Row]
Call Monitoring View (M3 — Supervisor View)
    ├─ [Whisper] → Send private message to Agent
    └─ [Takeover] → Assume direct call control
    ↓
Analytics Dashboard (M5)
CRM / Lead Details (M6 + M8) — Full read/edit access
```

---

### 5.1 Supervisor Dashboard — Mockup M4

The command center for the Supervisor role. Provides a live overview of all ongoing AI calls across the entire team, with automatic priority ordering by sentiment risk.

| UI Element | Description | Functional Requirement |
|------------|-------------|----------------------|
| Active Calls List | All active calls with agent name and sentiment score. Refreshes every 5 seconds, sorted by sentiment severity (most negative first). | FR-1: Updates every 5 seconds, sorted by severity. |
| Call Monitoring Button | Click any call to open the live monitoring view with full real-time transcript. | FR-2: Opens monitoring view with real-time transcript. |
| Whisper Message Input | Send a private text message to the Agent during a live call. Visible only to the Agent, never the customer. | FR-3: Messages visible only to agent. |
| Takeover Button | One-click button on high-risk calls to initiate a supervisor takeover through interface controls. | FR-4: Takeover enabled through interface controls. |
| Escalation Alert Cards | Highlighted cards for calls that have breached the negative sentiment threshold, requiring immediate attention. | Module 6: Real-time alerts for flagged calls. |

---

### 5.2 Call Monitoring View — Mockup M3 (Supervisor View)

The same Call Interface screen used by Agents, but with **additional supervisor-exclusive controls**. The Supervisor can monitor any call passively without the Agent or customer being notified, or actively intervene.

| UI Element | Description |
|------------|-------------|
| Live Transcript | Real-time transcript identical to the Agent view. |
| Sentiment Indicator | Current customer sentiment shown in real time. |
| Whisper Message Box | Private coaching message sent directly to the Agent mid-call. Customer cannot hear or see this message. |
| Takeover Button | Assumes direct control of the call when escalation protocol is required. |

---

### 5.3 Analytics Dashboard — Mockup M5 (Supervisor View)

The Supervisor sees the same Analytics Dashboard as Agents but **scoped to show all agents' combined data**. The Supervisor can identify underperforming agents, track team-wide sentiment trends, and monitor the overall pipeline health.

---

### 5.4 CRM and Lead Details (M6 + M8)

The Supervisor has **full read and edit access** to all leads across all agents, allowing oversight of the complete lead pipeline and the ability to review any call outcome in the team.

---

## 6. Administrator Workflow

The Administrator manages the **entire system configuration**. As specified in the SRS (CO-4), the platform supports only three predefined user roles and does not allow custom role creation. The Admin has unrestricted access to all features and all data in the system.

```
Login (M1)
    ↓
Script & Persona Setup (M7)
    ├─ Upload/Edit Scripts
    ├─ Configure AI Personas
    ├─ Set Campaign Context
    └─ Activate Campaign
    ↓
User Management (RBAC Module)
    ├─ Create/Edit Users
    ├─ Unlock Accounts
    └─ Deactivate Users
    ↓
Analytics Dashboard (M5) — Global unrestricted view
CRM / Lead Details (M6 + M8) — Full unrestricted access
```

---

### 6.1 Script & Persona Setup — Mockup M7

This is the **core configuration screen** for the Administrator and the starting point for all system activity. No campaign can go live until the Admin has completed this setup. Campaign context is mandatory before activation.

| UI Element | Description | Functional Requirement |
|------------|-------------|----------------------|
| Upload Script | Upload and store sales scripts in supported text-based file formats. | FR-1: Supported formats include text-based files. |
| Script Editor | Edit existing scripts directly in the browser; changes saved in real time. | FR-2: Changes saved in real time. |
| Persona Selector | Select AI tone per campaign: Friendly, Professional, or Empathetic. | FR-3: Persona applied per campaign. |
| Campaign Context Form | Define product name, campaign goals, and call context. Mandatory before campaign activation. | FR-4: Campaign context mandatory before activation. |
| Assign Script to Campaign | Link a script to a campaign. Each campaign must have at least one assigned script. | FR-5: Each campaign must have at least one script. |
| Activate Campaign | Makes the campaign available for Agents to launch from their dashboard. | Module 2: Campaign activation. |

---

### 6.2 User Management

Derived from Module 1 (Security and Access Control), this screen allows the Administrator to manage all platform users. This is the **only role** that can create users and unlock locked accounts.

| UI Element | Description |
|------------|-------------|
| User List Table | All registered Agents and Supervisors with role, status (active/inactive), and last login time. |
| Create New User | Form: name, email, role (Agent or Supervisor), and initial password setup. |
| Edit User | Update an existing user's details or role assignment. |
| Unlock Account | Re-enable accounts locked after 5 failed login attempts. Only the Admin can perform this. |
| Deactivate User | Disable a user account without deleting their historical data. |

---

### 6.3 Analytics Dashboard — Mockup M5 (Admin View)

The Admin sees the **fully unrestricted global analytics view** with data from all agents, all campaigns, and all time periods. This is the highest-level view in the entire system.

| UI Element | Description |
|------------|-------------|
| Call Volume Chart | System-wide call volume trends across all agents and campaigns. |
| Sentiment Distribution | Aggregate sentiment proportions across all system calls. |
| Lead Conversion Funnel | End-to-end funnel combining all campaigns and agents. |
| Agent Performance Table | Per-agent breakdown: calls handled, conversion rate, escalation frequency. |

---

### 6.4 CRM and Lead Details (M6 + M8)

The Administrator has **unrestricted full access** to the entire CRM database across every agent and campaign, allowing auditing of any lead, data correction, and complete interaction history review.

---

## 7. Screen Inventory & Role Access Matrix

The SRS defines **8 primary mockups (M1–M8)** plus one additional screen derived from the RBAC module.

| # | Screen Name | Mockup | Agent | Supervisor | Admin |
|---|-------------|--------|-------|------------|-------|
| 1 | Login Page | M1 | ✅ Yes | ✅ Yes | ✅ Yes |
| 2 | Agent Dashboard | M2 | ✅ Yes | ❌ No | ❌ No |
| 3 | Call Interface / Monitor | M3 | ✅ Yes | ✅ Yes | ❌ No |
| 4 | Supervisor Dashboard | M4 | ❌ No | ✅ Yes | ❌ No |
| 5 | Analytics Dashboard | M5 | Personal | Team | Global |
| 6 | CRM / Lead Management | M6 | ✅ Yes | ✅ Yes | ✅ Yes |
| 7 | Script & Persona Setup | M7 | ❌ No | ❌ No | ✅ Yes |
| 8 | Lead Details Page | M8 | ✅ Yes | ✅ Yes | ✅ Yes |
| 9 | User Management | RBAC Module | ❌ No | ❌ No | ✅ Yes |

> **Note:** The Call Interface (M3) serves a dual purpose — Agents use it to monitor individual AI calls in real time, while Supervisors use the same screen with additional whisper message and takeover controls overlaid. The Analytics Dashboard (M5) is accessible by all roles but the data is automatically scoped: Agents see only their own metrics, Supervisors see their team, and Admins see the full system.

---

## 8. Non-Functional Requirements Affecting the Frontend

The SRS specifies several non-functional requirements that directly shape the design, responsiveness, and security behaviour of the frontend.

### 8.1 Performance Requirements

- Dashboard shall load within **3 seconds** on a 10 Mbps internet connection (PER-2)
- System targets low-latency voice responses dependent on external service performance (PER-1)
- CRM search results must be returned within **2 seconds** (FR-2, M6)
- Supervisor Dashboard active call list refreshes every **5 seconds** automatically (FR-1, M4)

### 8.2 Usability Requirements

- A new user shall complete onboarding within **10 minutes** without prior system knowledge (USE-1)
- Users shall access key insights in **3 clicks or fewer** from the main dashboard (USE-2)
- All insights shall be in plain language, free of technical jargon (USE-3)

### 8.3 Security Requirements

- User credentials stored using **bcrypt** hashing algorithms (SEC-1)
- Sessions automatically expire after **30 minutes** of inactivity (SEC-2)
- All data transmission encrypted using **HTTPS / TLS 1.2+** (SEC-3)
- Account locked after **5 failed login attempts**; requires Admin unlock (FR-3, M1)

### 8.4 Platform & Compatibility Constraints

- Optimised for **desktop and laptop** use. Mobile compatibility not guaranteed in v1.0 (UI-2)
- Requires stable high-speed internet; latency or packet loss degrades voice quality (LI-3)
- Client devices must have a **microphone and speakers or headphones** (HW-2)
- **English language only** in version 1.0 (LI-4)

---

## 9. Summary

EchoAI's frontend comprises **9 distinct screens** organised around **3 clearly separated role-based workflows**. The system follows a clean sequential flow: Administrators configure the system once, Agents launch and oversee AI-driven call sessions, and Supervisors maintain real-time oversight with the ability to intervene at any point via escalation.

| Role | Primary Screens | Core Action |
|------|----------------|-------------|
| **Agent** | Dashboard (M2), Call Interface (M3), CRM (M6), Lead Details (M8), Analytics (M5) | Launch AI call sessions; manage post-call lead data and follow-ups |
| **Supervisor** | Supervisor Dashboard (M4), Call Monitor (M3), Analytics (M5), CRM (M6) | Monitor live calls; whisper to agents; take over escalated calls |
| **Administrator** | Script & Persona Setup (M7), User Management, Analytics (M5), CRM (M6) | Configure scripts, personas, campaigns; manage user accounts |

### Key Screens

**Call Interface (M3)** is the most technically complex screen in the system, combining:
- Real-time WebRTC audio via **LiveKit**
- Live STT transcription from **Deepgram**
- Continuous sentiment analysis from **VADER and HuggingFace**
- Automatic objection detection overlays

It is the operational heart of EchoAI and the primary touchpoint through which both Agents and Supervisors interact with active AI-managed calls.

**Script & Persona Setup (M7)** is the configuration heart of the system — nothing can function without the Admin first completing campaign setup here.

Together, these two screens represent the core value proposition of EchoAI: intelligent AI-driven voice conversations that can be **fully configured, monitored, and controlled** by human teams.

---

*EchoAI SRS — Frontend Workflow Documentation*
