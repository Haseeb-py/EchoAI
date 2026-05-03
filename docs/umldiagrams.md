# EchoAI SDS — Complete Figures Reference
## PlantUML Diagrams + Screenshot Guidance

---

# PART A: PLANTUML DIAGRAMS (13 diagrams)
# Copy each block into https://www.plantuml.com/plantuml/uml/ or any PlantUML renderer

---

## FIGURE 3.1 — EchoAI Conceptual Three-Tier Architecture Diagram
**Where:** Chapter 3, Section 3.2 (after the paragraph ending "...protected resources.")
**Type:** Architecture / Component Diagram
**Size hint:** Wide landscape, ~700px wide

```plantuml
@startuml Figure_3_1_Three_Tier_Architecture
!theme plain
skinparam backgroundColor #FEFEFE
skinparam defaultFontName Arial
skinparam defaultFontSize 12
skinparam ArrowColor #444444
skinparam componentBorderColor #555555
skinparam packageBorderColor #888888
skinparam packageBackgroundColor #F5F8FF
skinparam componentBackgroundColor #EAF0FB

title EchoAI — Conceptual Three-Tier Architecture

package "Presentation Tier (Next.js Frontend)" as PT {
  [Browser / User Interface] as UI
  [Next.js Middleware\n(RBAC Gateway)] as MW
  [/dashboard — Agent View] as AV
  [/supervisor — Supervisor View] as SV
  [/admin — Admin View] as ADV
}

package "Application Tier (FastAPI Backend)" as AT {
  [Next.js API Proxy\n(/api/* → http://127.0.0.1:8000)] as PROXY
  [FastAPI REST Server\n(Uvicorn)] as FAST
  [Auth Module\n(routes/auth.py)] as AUTH
  [Script/Persona/Campaign Module\n(routes/admin.py)] as SPC
  [Dependency Guards\n(deps.py: get_current_user,\nget_current_admin)] as DEPS
}

package "Data Tier (SQLite via SQLAlchemy ORM)" as DT {
  database "echoai.db\n(SQLite)" as DB
  [SQLAlchemy ORM\n(models/)] as ORM
}

UI --> MW : All protected requests
MW --> AV : role=agent ✓
MW --> SV : role=supervisor ✓
MW --> ADV : role=admin ✓
MW --> PROXY : Authenticated requests
PROXY --> FAST : Rewrites /api/* to :8000
FAST --> AUTH
FAST --> SPC
FAST --> DEPS
AUTH --> ORM
SPC --> ORM
DEPS --> ORM
ORM --> DB

note right of MW
  Decodes JWT from cookie
  Checks role vs. route prefix
  Redirects to /login on failure
end note

note right of PROXY
  Configured in next.config.mjs
  Hides backend origin from browser
  Eliminates CORS issues
end note
@enduml
```

---

## FIGURE 3.2 — RBAC Request Flow: Frontend Middleware to Backend Auth Guard
**Where:** Chapter 3, Section 3.3.1 (after paragraph ending "...sensitive operations.")
**Type:** Sequence Diagram
**Size hint:** Portrait, ~600px wide

```plantuml
@startuml Figure_3_2_RBAC_Request_Flow
!theme plain
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 1.5
skinparam sequenceParticipantBorderColor #555555
skinparam sequenceLifeLineBorderColor #999999
skinparam sequenceBoxBorderColor #888888
skinparam noteBackgroundColor #FFFDE7
skinparam noteBorderColor #F9A825

title RBAC Request Flow: Frontend Middleware → Backend Auth Guard

actor "User Browser" as U
participant "Next.js\nMiddleware\n(middleware.ts)" as MW
participant "Next.js\nPage / Component" as PAGE
participant "FastAPI\nRoute Handler" as ROUTE
participant "get_current_user\n/ get_current_admin\n(deps.py)" as DEPS
database "SQLite DB" as DB

U -> MW : HTTP Request to /dashboard, /supervisor, or /admin
MW -> MW : Read echoai_token from cookie

alt No cookie found
  MW --> U : 302 Redirect → /login
else Cookie present
  MW -> MW : Decode JWT (no signature check)
  alt Token expired (exp < now)
    MW --> U : 302 Redirect → /login
  else Token valid
    MW -> MW : Extract role claim
    alt role mismatches route prefix
      MW --> U : 302 Redirect → /login
    else role matches
      MW -> PAGE : Forward request (render page)
      PAGE -> ROUTE : API call + Authorization: Bearer <token>
      ROUTE -> DEPS : Inject dependency
      DEPS -> DEPS : Verify JWT signature (PyJWT)
      DEPS -> DEPS : Check token expiry
      DEPS -> DB : Fetch user by id from sub claim
      DB --> DEPS : User record
      alt role != admin (for admin endpoints)
        DEPS --> ROUTE : Raise HTTP 403 Forbidden
        ROUTE --> PAGE : 403 Error response
      else Authorized
        DEPS --> ROUTE : Current user resolved
        ROUTE --> PAGE : 200 OK + data
        PAGE --> U : Render page with data
      end
    end
  end
end
@enduml
```

---

## FIGURE 3.3 — Activity Diagram: User Login and Authentication
**Where:** Chapter 3, Section 3.4.1.1 — Activity Diagram 1 (after "Activity Diagram 1: User Authentication Flow" heading)
**Type:** Activity Diagram
**Size hint:** Portrait, ~500px wide

```plantuml
@startuml Figure_3_3_Activity_Login
!theme plain
skinparam defaultFontName Arial
skinparam ActivityBackgroundColor #EAF0FB
skinparam ActivityBorderColor #3A6BC9
skinparam ActivityDiamondBackgroundColor #FFF9C4
skinparam ActivityDiamondBorderColor #F9A825
skinparam ArrowColor #444444

title Activity Diagram: User Login and Authentication

start
:User navigates to /login page;
:System renders LoginForm\n(email + password fields);
:User fills in email and password;
:User submits the form;

:Client-side validation\n(email format, required fields);
if (Input valid?) then (No)
  :Show validation error on form field;
  stop
else (Yes)
  :POST /api/auth/login\n{email, password};
  :Show loading spinner;
  :FastAPI receives request;
  :Query SQLite for user by email;
  if (User record found?) then (No)
    :Return HTTP 401\nInvalid credentials;
    :Show error: "Invalid email or password";
    stop
  else (Yes)
    :verify_password(plain, hashed) via PassLib;
    if (Password matches?) then (No)
      :Return HTTP 401\nInvalid credentials;
      :Show error: "Invalid email or password";
      stop
    else (Yes)
      :Check user.status;
      if (status == active?) then (No — locked or inactive)
        :Return HTTP 403\nAccount locked / inactive;
        :Show error on form;
        stop
      else (Yes)
        :create_access_token\n{sub: email, role, user_id, exp};
        :Return 200 OK\n{access_token, user};
        :Store token in localStorage (echoai_token);
        :Store token in cookie (echoai_token);
        :getRoleDefaultRoute(role);
        if (role == admin?) then (Yes)
          :Redirect to /admin;
        else if (role == supervisor?) then (Yes)
          :Redirect to /supervisor;
        else (agent)
          :Redirect to /dashboard;
        endif
        stop
      endif
    endif
  endif
endif
@enduml
```

---

## FIGURE 3.4 — Activity Diagram: Admin Campaign and Script Setup Flow
**Where:** Chapter 3, Section 3.4.1.1 — Activity Diagram 2 (after "Activity Diagram 2: Campaign Creation and Script Setup" heading)
**Type:** Activity Diagram
**Size hint:** Portrait, ~520px wide

```plantuml
@startuml Figure_3_4_Activity_Campaign_Setup
!theme plain
skinparam defaultFontName Arial
skinparam ActivityBackgroundColor #EAF0FB
skinparam ActivityBorderColor #3A6BC9
skinparam ActivityDiamondBackgroundColor #FFF9C4
skinparam ActivityDiamondBorderColor #F9A825
skinparam ArrowColor #444444

title Activity Diagram: Admin Campaign and Script Setup Flow

start
:Admin navigates to Campaigns page (/admin);
:Admin enters campaign details\n(name, description, product info, target audience);
:Click "Save Draft";
:Draft written to localStorage\n(key: echoai_campaign_draft);
:Campaign card appears with "Draft" badge;

:Admin navigates to Script and Persona Setup page;
:System reads echoai_campaign_draft\nand pre-populates context fields;

fork
  :Scripts Tab;
  :Create or upload calling script;
  :POST /api/admin/scripts\n{name, content};
  :Script saved to SQLite;
fork again
  :Personas Tab;
  :Define voice persona\n(professional, empathetic, assertive, or friendly);
  :POST /api/admin/personas\n{name, tone, description};
  :Persona saved to SQLite;
fork again
  :Campaign Context Tab;
  :Fill product description,\ntarget audience, call goals;
end fork

:System computes readiness score\n(script + persona + context completeness);

if (Readiness score == 100%?) then (No)
  :Activate button remains disabled;
  :Admin fills remaining required fields;
  goto :System computes readiness score\n(script + persona + context completeness);
else (Yes)
  :Activate button becomes enabled;
  :Admin clicks "Activate Campaign";
  :POST /api/admin/campaigns/{id}/activate;
  :Campaign status: draft → active;
  :Campaign available for agent use;
  stop
endif
@enduml
```

---

## FIGURE 3.5 — Activity Diagram: Admin User Management (Create, Lock, Reset)
**Where:** Chapter 3, Section 3.4.1.1 — Activity Diagram 3 (after "Activity Diagram 3: Admin User Management" heading)
**Type:** Activity Diagram
**Size hint:** Wide landscape, ~750px wide

```plantuml
@startuml Figure_3_5_Activity_User_Management
!theme plain
skinparam defaultFontName Arial
skinparam ActivityBackgroundColor #EAF0FB
skinparam ActivityBorderColor #3A6BC9
skinparam ActivityDiamondBackgroundColor #FFF9C4
skinparam ActivityDiamondBorderColor #F9A825
skinparam ArrowColor #444444
skinparam swimlaneBorderColor #999999

title Activity Diagram: Admin User Management (Create, Lock, Reset)

|Admin|
start
:Navigate to User Access page (/admin);
:GET /api/admin/users;
:User table loads with all accounts;

:Admin selects an action;

|Create User|
fork
  :Click "Create User";
  :Modal opens with form\n(email, password, role, full_name);
  :Fill form and submit;
  :POST /api/admin/users\n(Authorization: Bearer admin_token);
  :Backend hashes password (bcrypt);
  :INSERT user row (status=active);
  :201 Created returned;
  :Table refreshes — new user visible;

|Lock / Unlock User|
fork again
  :Click "Lock" on active user;
  :PUT /api/admin/users/{id}\n{status: "locked"};
  :Status badge updates to "Locked";
  :User cannot authenticate;
  :Admin clicks "Unlock" later;
  :PUT /api/admin/users/{id}\n{status: "active"};
  :Status badge updates to "Active";

|Deactivate User|
fork again
  :Click "Deactivate" on active user;
  :PUT /api/admin/users/{id}\n{status: "inactive"};
  :Status badge updates to "Inactive";
  :User cannot authenticate;

|Reset Password|
fork again
  :Click "Reset Password" on user row;
  :POST /api/admin/users/{id}/reset-password;
  :Temporary password generated;
  :Temp password returned to admin\nin confirmation modal;

|Admin|
end fork

:UI table reflects new user state immediately;
stop
@enduml
```

---

## FIGURE 3.6 — EchoAI Class Diagram (Core Entities)
**Where:** Chapter 3, Section 3.4.1.2 (after "Figure 3.6" caption)
**Type:** Class Diagram
**Size hint:** Wide landscape, ~800px wide

```plantuml
@startuml Figure_3_6_Class_Diagram
!theme plain
skinparam defaultFontName Arial
skinparam classBackgroundColor #EAF0FB
skinparam classBorderColor #3A6BC9
skinparam classHeaderBackgroundColor #3A6BC9
skinparam classHeaderFontColor #FFFFFF
skinparam enumBackgroundColor #FFF9C4
skinparam enumBorderColor #F9A825
skinparam ArrowColor #444444
skinparam noteBorderColor #999999

title EchoAI Class Diagram — Core Entities

enum Role {
  agent
  supervisor
  admin
}

enum UserStatus {
  active
  locked
  inactive
}

enum CampaignStatus {
  draft
  active
  paused
  completed
}

enum ScriptStatus {
  draft
  active
}

class User {
  +id: INTEGER  <<PK>>
  +email: VARCHAR(255)  <<UNIQUE>>
  +hashed_password: VARCHAR(255)
  +role: Role
  +status: UserStatus
  +full_name: VARCHAR(255)
  +created_at: DATETIME
  +updated_at: DATETIME
  --
  +get_password_hash()
  +verify_password()
}

class Script {
  +id: INTEGER  <<PK>>
  +name: VARCHAR(255)
  +content: TEXT
  +campaign_id: INTEGER  <<FK>>
  +status: ScriptStatus
  +created_by: INTEGER  <<FK>>
  +created_at: DATETIME
  +updated_at: DATETIME
}

class Persona {
  +id: INTEGER  <<PK>>
  +name: VARCHAR(255)
  +tone: VARCHAR(100)
  +description: TEXT
  +campaign_id: INTEGER  <<FK>>
  +is_active: BOOLEAN
  +created_by: INTEGER  <<FK>>
  +created_at: DATETIME
}

class Campaign {
  +id: INTEGER  <<PK>>
  +name: VARCHAR(255)  <<UNIQUE>>
  +product_description: TEXT
  +target_audience: TEXT
  +call_goals: TEXT
  +status: CampaignStatus
  +script_id: INTEGER  <<FK>>
  +persona_id: INTEGER  <<FK>>
  +created_by: INTEGER  <<FK>>
  +created_at: DATETIME
  +updated_at: DATETIME
}

User "1" --> "0..*" Script : creates (created_by)
User "1" --> "0..*" Persona : creates (created_by)
User "1" --> "0..*" Campaign : creates (created_by)
Campaign "0..*" --> "0..1" Script : uses (script_id)
Campaign "0..*" --> "0..1" Persona : uses (persona_id)
User --> Role
User --> UserStatus
Campaign --> CampaignStatus
Script --> ScriptStatus
@enduml
```

---

## FIGURE 3.7 — Sequence Diagram: Login and JWT Token Issuance
**Where:** Chapter 3, Section 3.4.1.3 — Sequence Diagram 1 (after "Figure 3.7" caption, before Table 3.2)
**Type:** Sequence Diagram
**Note:** Table 3.2 already documents the steps — this diagram is the visual version of it
**Size hint:** Wide, ~750px wide

```plantuml
@startuml Figure_3_7_Sequence_Login
!theme plain
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 1.5
skinparam sequenceParticipantBorderColor #3A6BC9
skinparam sequenceParticipantBackgroundColor #EAF0FB
skinparam sequenceLifeLineBorderColor #999999
skinparam sequenceBoxBackgroundColor #F5F8FF
skinparam noteBackgroundColor #FFFDE7
skinparam noteBorderColor #F9A825
skinparam databaseBackgroundColor #FFF3E0
skinparam databaseBorderColor #FB8C00

title Sequence Diagram: Login and JWT Token Issuance

actor "User\n(Browser)" as U
participant "LoginForm\nComponent" as LF
participant "src/lib/auth.ts" as AUTH
participant "Next.js\nAPI Proxy\n(next.config.mjs)" as PROXY
participant "FastAPI\n/api/auth/login" as FAST
participant "PassLib\n(bcrypt)" as PASS
participant "PyJWT" as JWT
database "SQLite DB" as DB
participant "Next.js\nRouter" as ROUTER

U -> LF : Submit form (email, password)
LF -> LF : Client-side validation
LF -> AUTH : loginWithPassword(email, password)
AUTH -> PROXY : POST /api/auth/login\n{email, password}
PROXY -> FAST : Forward → http://127.0.0.1:8000/api/auth/login

FAST -> DB : SELECT * FROM users WHERE email = ?
DB --> FAST : User record

alt User not found
  FAST --> PROXY : 401 {detail: "Invalid credentials"}
  PROXY --> AUTH : 401
  AUTH --> LF : Error response
  LF --> U : Show "Invalid email or password"
else User found
  FAST -> PASS : verify_password(plain, hashed_password)
  PASS --> FAST : True / False

  alt Password mismatch
    FAST --> PROXY : 401 {detail: "Invalid credentials"}
    PROXY --> AUTH : 401
    AUTH --> LF : Error response
    LF --> U : Show "Invalid email or password"
  else Password correct
    FAST -> FAST : Check user.status == "active"

    alt status is locked or inactive
      FAST --> PROXY : 403 {detail: "Account is locked/inactive"}
      PROXY --> AUTH : 403
      AUTH --> LF : Error response
      LF --> U : Show account status error
    else status == active
      FAST -> JWT : create_access_token\n{sub: email, role, user_id, exp}
      JWT --> FAST : Signed JWT string

      FAST --> PROXY : 200 {access_token, user}
      PROXY --> AUTH : 200 response
      AUTH -> AUTH : Store token in localStorage\n(key: echoai_token)
      AUTH -> AUTH : Store token in cookie\n(key: echoai_token)
      AUTH --> LF : Return user object
      LF -> ROUTER : getRoleDefaultRoute(role)
      ROUTER --> U : Redirect to /admin | /supervisor | /dashboard
    end
  end
end
@enduml
```

---

## FIGURE 3.8 — Sequence Diagram: Admin User Creation
**Where:** Chapter 3, Section 3.4.1.3 — Sequence Diagram 2 (after "Figure 3.8" caption)
**Type:** Sequence Diagram
**Size hint:** Wide, ~720px wide

```plantuml
@startuml Figure_3_8_Sequence_Admin_User_Creation
!theme plain
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 1.5
skinparam sequenceParticipantBorderColor #3A6BC9
skinparam sequenceParticipantBackgroundColor #EAF0FB
skinparam sequenceLifeLineBorderColor #999999
skinparam databaseBackgroundColor #FFF3E0
skinparam databaseBorderColor #FB8C00
skinparam noteBackgroundColor #FFFDE7
skinparam noteBorderColor #F9A825

title Sequence Diagram: Admin User Creation

actor "Administrator" as A
participant "UserManagement\nPage\n(React)" as PAGE
participant "src/lib/auth.ts\nsignupWithPassword()" as AUTH
participant "Next.js\nAPI Proxy" as PROXY
participant "FastAPI\n/api/admin/users" as FAST
participant "get_current_admin\n(deps.py)" as DEP
participant "PassLib\n(bcrypt)" as PASS
database "SQLite DB" as DB

A -> PAGE : Click "Create User" button
PAGE -> PAGE : Open Create User modal
A -> PAGE : Fill form (email, password, role, full_name)
A -> PAGE : Submit form

PAGE -> AUTH : signupWithPassword({email, password, role, full_name})
AUTH -> PROXY : POST /api/admin/users\nAuthorization: Bearer <admin_token>
PROXY -> FAST : Forward request

FAST -> DEP : get_current_admin(token)
DEP -> DEP : Verify JWT signature (PyJWT)
DEP -> DEP : Decode claims: role == "admin"?

alt role != admin
  DEP --> FAST : Raise HTTP 403 Forbidden
  FAST --> PROXY : 403 {detail: "Not enough permissions"}
  PROXY --> AUTH : 403
  AUTH --> PAGE : Error
  PAGE --> A : Show permission error
else Admin confirmed
  DEP --> FAST : current_user (admin)
  FAST -> PASS : get_password_hash(password)
  PASS --> FAST : bcrypt hash

  FAST -> DB : INSERT INTO users\n{email, hashed_password, role, full_name, status="active"}
  
  alt Email already exists
    DB --> FAST : IntegrityError (UNIQUE constraint)
    FAST --> PROXY : 409 {detail: "Email already registered"}
    PROXY --> AUTH : 409
    AUTH --> PAGE : Conflict error
    PAGE --> A : Show "Email address already in use"
  else Insert success
    DB --> FAST : New user row with id
    FAST --> PROXY : 201 Created {user: {id, email, role, status}}
    PROXY --> AUTH : 201
    AUTH --> PAGE : Success response
    PAGE -> PAGE : Close modal
    PAGE -> PROXY : GET /api/admin/users (refresh table)
    PROXY -> FAST : GET /api/admin/users
    FAST -> DB : SELECT * FROM users
    DB --> FAST : All user records
    FAST --> PROXY : 200 [{...users}]
    PROXY --> PAGE : Updated user list
    PAGE --> A : New user visible in table with "Active" badge
  end
end
@enduml
```

---

## FIGURE 3.9 — Sequence Diagram: Script and Persona Configuration Save
**Where:** Chapter 3, Section 3.4.1.3 — Sequence Diagram 3 (after "Figure 3.9" caption)
**Type:** Sequence Diagram
**Size hint:** Wide, ~720px wide

```plantuml
@startuml Figure_3_9_Sequence_Script_Persona_Save
!theme plain
skinparam defaultFontName Arial
skinparam sequenceArrowThickness 1.5
skinparam sequenceParticipantBorderColor #3A6BC9
skinparam sequenceParticipantBackgroundColor #EAF0FB
skinparam sequenceLifeLineBorderColor #999999
skinparam databaseBackgroundColor #FFF3E0
skinparam databaseBorderColor #FB8C00

title Sequence Diagram: Script and Persona Configuration Save

actor "Administrator" as A
participant "ScriptPersonaSetup\nComponent (React)" as SP
participant "Next.js\nAPI Proxy" as PROXY
participant "FastAPI\n/api/admin/scripts\n/api/admin/personas" as FAST
participant "Pydantic v2\nValidator" as PYD
participant "get_current_admin\n(deps.py)" as DEP
database "SQLite DB" as DB

== Script Save ==

A -> SP : Fill script name + content
A -> SP : Click "Save Script"
SP -> PROXY : POST /api/admin/scripts\n{name, content}\nAuthorization: Bearer <admin_token>
PROXY -> FAST : Forward request
FAST -> DEP : Verify admin token
DEP --> FAST : Admin confirmed
FAST -> PYD : Validate ScriptCreate schema\n{name: required, content: required}
PYD --> FAST : Valid
FAST -> DB : INSERT INTO scripts\n{name, content, status="draft", created_by=admin_id}
DB --> FAST : Script row {id, name, content, status}
FAST --> PROXY : 201 Created {id, name, content, status, created_at}
PROXY --> SP : 201 response
SP -> SP : Add script card to list
SP --> A : Script visible in Scripts tab

== Persona Save ==

A -> SP : Fill persona name, tone, description
A -> SP : Click "Save Persona"
SP -> PROXY : POST /api/admin/personas\n{name, tone, description}\nAuthorization: Bearer <admin_token>
PROXY -> FAST : Forward request
FAST -> DEP : Verify admin token
DEP --> FAST : Admin confirmed
FAST -> PYD : Validate PersonaCreate schema\n{name: required, tone: required}
PYD --> FAST : Valid
FAST -> DB : INSERT INTO personas\n{name, tone, description, is_active=true, created_by=admin_id}
DB --> FAST : Persona row {id, name, tone}
FAST --> PROXY : 201 Created {id, name, tone, description, is_active}
PROXY --> SP : 201 response
SP -> SP : Add persona card to list
SP -> SP : Recompute readiness score
SP --> A : Persona visible in Personas tab\nReadiness score updated
@enduml
```

---

## FIGURE 3.10 — State Transition Diagram: User Account Status Lifecycle
**Where:** Chapter 3, Section 3.4.1.4 — State Diagram 1 (after "Figure 3.10" caption)
**Type:** State Diagram
**Size hint:** Portrait, ~480px wide

```plantuml
@startuml Figure_3_10_State_User_Account
!theme plain
skinparam defaultFontName Arial
skinparam stateBackgroundColor #EAF0FB
skinparam stateBorderColor #3A6BC9
skinparam stateArrowColor #444444
skinparam noteBackgroundColor #FFFDE7
skinparam noteBorderColor #F9A825

title State Transition Diagram: User Account Status Lifecycle

[*] --> Pending : Admin submits\nCreate User form

state Pending {
  : Account created, not yet confirmed
}

Pending --> Active : POST /api/admin/users\n201 Created — account initialized

state Active {
  : Can authenticate (login)
  : Can access role routes
  : Password reset allowed
}

Active --> Locked : Admin clicks Lock\nPUT .../{id} {status: "locked"}
Active --> Inactive : Admin clicks Deactivate\nPUT .../{id} {status: "inactive"}
Active --> Active : Admin resets password\nPOST .../{id}/reset-password

state Locked {
  : Cannot authenticate
  : Login returns 403 Account Locked
  : All sessions effectively invalid
}

state Inactive {
  : Cannot authenticate
  : Login returns 403 Account Inactive
  : Requires admin to reactivate
}

Locked --> Active : Admin clicks Unlock\nPUT .../{id} {status: "active"}
Inactive --> Active : Admin reactivates\nPUT .../{id} {status: "active"}

Locked --> [*] : Permanently removed\n(future: DELETE endpoint)
Inactive --> [*] : Permanently removed\n(future: DELETE endpoint)

note right of Active
  Default state when
  account is first created
end note

note right of Locked
  Temporary suspension.
  Configuration preserved.
  Reversible by admin.
end note

note right of Inactive
  Permanent suspension.
  Requires explicit
  admin reactivation.
end note
@enduml
```

---

## FIGURE 3.11 — State Transition Diagram: Campaign Lifecycle
**Where:** Chapter 3, Section 3.4.1.4 — State Diagram 2 (after "Figure 3.11" caption)
**Type:** State Diagram
**Size hint:** Portrait, ~480px wide

```plantuml
@startuml Figure_3_11_State_Campaign_Lifecycle
!theme plain
skinparam defaultFontName Arial
skinparam stateBackgroundColor #EAF0FB
skinparam stateBorderColor #3A6BC9
skinparam stateArrowColor #444444
skinparam noteBackgroundColor #FFFDE7
skinparam noteBorderColor #F9A825

title State Transition Diagram: Campaign Lifecycle

[*] --> Draft : Admin creates campaign\nPOST /api/admin/campaigns

state Draft {
  : Script and Persona being configured
  : Readiness score < 100%
  : Activate button disabled
  : Campaign context in localStorage
}

Draft --> Draft : Admin edits script,\npersona, context fields\n(PUT /api/admin/scripts, personas)

Draft --> Active : Readiness == 100%,\nAdmin clicks Activate\nPOST .../campaigns/{id}/activate

state Active {
  : Available for agent call operations
  : Script/Persona locked in
  : Live metrics displayed (future)
  : Agents see campaign in dashboard
}

Active --> Paused : Admin clicks Pause\nPOST .../campaigns/{id}/pause

state Paused {
  : Operations suspended
  : Configuration preserved
  : Agents cannot use campaign
}

Paused --> Active : Admin clicks Resume\nPOST .../campaigns/{id}/activate

Active --> Completed : Target call volume reached\nor campaign end date passed

state Completed {
  : No longer accepting calls
  : Historical data preserved
  : Read-only state
}

Completed --> Archived : System auto-archives\n(future sprint)

state Archived {
  : Cannot be modified directly
  : Available for reporting only
}

Archived --> [*]

note left of Draft
  echoai_campaign_draft
  written to localStorage
  during setup phase
end note

note right of Active
  Campaign data available
  to agents via
  /api/admin/campaigns
end note
@enduml
```

---

## FIGURE 3.12 — Entity Relationship Diagram (ERD)
**Where:** Chapter 3, Section 3.5.3 (after "Figure 3.12" caption)
**Type:** ERD / Entity Diagram
**Size hint:** Wide landscape, ~750px wide

```plantuml
@startuml Figure_3_12_ERD
!theme plain
skinparam defaultFontName Arial
skinparam EntityBackgroundColor #EAF0FB
skinparam EntityBorderColor #3A6BC9
skinparam ArrowColor #444444

title Entity Relationship Diagram — EchoAI Current Backend Schema

entity "**User**" as USER {
  *id : INTEGER <<PK, AUTO_INCREMENT>>
  --
  email : VARCHAR(255) <<UNIQUE, NOT NULL>>
  hashed_password : VARCHAR(255) <<NOT NULL>>
  role : VARCHAR(50) <<NOT NULL, DEFAULT 'agent'>>
  status : VARCHAR(50) <<NOT NULL, DEFAULT 'active'>>
  full_name : VARCHAR(255) <<NULLABLE>>
  created_at : DATETIME <<NOT NULL>>
  updated_at : DATETIME <<NOT NULL>>
}

entity "**Script**" as SCRIPT {
  *id : INTEGER <<PK, AUTO_INCREMENT>>
  --
  name : VARCHAR(255) <<NOT NULL>>
  content : TEXT <<NOT NULL>>
  campaign_id : INTEGER <<FK → Campaign.id, NULLABLE>>
  status : VARCHAR(50) <<DEFAULT 'draft'>>
  created_by : INTEGER <<FK → User.id, NOT NULL>>
  created_at : DATETIME <<NOT NULL>>
  updated_at : DATETIME <<NOT NULL>>
}

entity "**Persona**" as PERSONA {
  *id : INTEGER <<PK, AUTO_INCREMENT>>
  --
  name : VARCHAR(255) <<NOT NULL>>
  tone : VARCHAR(100) <<NOT NULL>>
  description : TEXT <<NULLABLE>>
  campaign_id : INTEGER <<FK → Campaign.id, NULLABLE>>
  is_active : BOOLEAN <<NOT NULL, DEFAULT TRUE>>
  created_by : INTEGER <<FK → User.id, NOT NULL>>
  created_at : DATETIME <<NOT NULL>>
}

entity "**Campaign**" as CAMPAIGN {
  *id : INTEGER <<PK, AUTO_INCREMENT>>
  --
  name : VARCHAR(255) <<NOT NULL, UNIQUE>>
  product_description : TEXT <<NULLABLE>>
  target_audience : TEXT <<NULLABLE>>
  call_goals : TEXT <<NULLABLE>>
  status : VARCHAR(50) <<DEFAULT 'draft'>>
  script_id : INTEGER <<FK → Script.id, NULLABLE>>
  persona_id : INTEGER <<FK → Persona.id, NULLABLE>>
  created_by : INTEGER <<FK → User.id, NOT NULL>>
  created_at : DATETIME <<NOT NULL>>
  updated_at : DATETIME <<NOT NULL>>
}

USER ||--o{ SCRIPT : "creates (created_by)"
USER ||--o{ PERSONA : "creates (created_by)"
USER ||--o{ CAMPAIGN : "creates (created_by)"
CAMPAIGN }o--o| SCRIPT : "uses (script_id)"
CAMPAIGN }o--o| PERSONA : "uses (persona_id)"

note bottom of CAMPAIGN
  Future entities to be added:
  Lead, CallRecord, AnalyticsEvent,
  KnowledgeItem, EscalationAlert
end note
@enduml
```

---

## FIGURE 4.3 — Middleware RBAC Logic Flow Diagram
**Where:** Chapter 4, Section 4.2.1.6 (after paragraph ending "...without a round-trip to the backend.")
**Type:** Flowchart / Activity Diagram
**Size hint:** Portrait, ~500px wide

```plantuml
@startuml Figure_4_3_Middleware_RBAC_Flow
!theme plain
skinparam defaultFontName Arial
skinparam ActivityBackgroundColor #EAF0FB
skinparam ActivityBorderColor #3A6BC9
skinparam ActivityDiamondBackgroundColor #FFF9C4
skinparam ActivityDiamondBorderColor #F9A825
skinparam ArrowColor #444444

title Middleware RBAC Logic Flow (middleware.ts)

start
:Incoming HTTP request;
:Path matches /dashboard,\n/supervisor, or /admin?;
if (Protected path?) then (No)
  :Allow — pass through to page;
  stop
else (Yes)
  :Read echoai_token from cookie;
  if (Cookie present?) then (No)
    :302 Redirect → /login;
    stop
  else (Yes)
    :Decode JWT payload\n(no signature verification);
    if (Token structure valid?) then (No)
      :302 Redirect → /login;
      stop
    else (Yes)
      :Check exp claim vs. Date.now();
      if (Token expired?) then (Yes)
        :302 Redirect → /login;
        stop
      else (No)
        :Extract role claim from payload;
        if (role == "agent") then (Yes)
          if (Path starts with /dashboard?) then (Yes)
            :Allow → render page;
            stop
          else (No)
            :302 Redirect → /login;
            stop
          endif
        else if (role == "supervisor") then (Yes)
          if (Path starts with /supervisor?) then (Yes)
            :Allow → render page;
            stop
          else (No)
            :302 Redirect → /login;
            stop
          endif
        else if (role == "admin") then (Yes)
          :Allow all protected paths\n(/admin, /supervisor, /dashboard);
          :Render page;
          stop
        else (unknown role)
          :302 Redirect → /login;
          stop
        endif
      endif
    endif
  endif
endif
@enduml
```

---
---

# PART B: NON-PLANTUML FIGURES (Screenshots + Design Reference)
# These need actual screenshots from your running application OR manual mockups

---

## FIGURE 3.13 — EchoAI Design System Color Palette and Typography Scale
**Where:** Chapter 3, Section 3.6.2 (after bullet list, before Chapter 4)
**Type:** Design reference image — create manually or as a simple graphic
**What to show:**
- Color swatches with hex values (from Table 4.4):
  - Primary Background: #0A0E1A (deep navy)
  - Surface/Card: #111827, #1F2937 (dark blue-gray)
  - Accent/Action: #3B82F6 → #2563EB (electric blue)
  - Success: #10B981 (emerald green)
  - Warning: #F59E0B (amber)
  - Error: #EF4444 (rose red)
  - Text Primary: #F9FAFB (near-white)
  - Text Secondary: #9CA3AF (light gray)
  - Border: #374151 (dark border)
- Typography: Show font used (Tailwind default, typically Inter or system-ui)
- Can be a simple color swatch grid with labels
**Suggested tool:** Figma, Canva, or a simple HTML color swatch page screenshot

---

## FIGURE 4.1 — Authentication Module: Code Structure in echoai-backend/app/
**Where:** Chapter 4, Section 4.2.1.1 (after paragraph ending "...database for every request.")
**Type:** Screenshot of your actual file tree
**What to show:** Terminal or VS Code explorer showing:
```
echoai-backend/
└── app/
    ├── main.py
    ├── core/
    │   ├── config.py         ← JWT secret, token expiry
    │   └── security.py       ← get_password_hash, verify_password, create_access_token
    ├── api/
    │   ├── deps.py           ← get_current_user, get_current_admin
    │   └── routes/
    │       ├── auth.py       ← POST /auth/login, POST /auth/signup
    │       └── admin.py      ← user/script/persona/campaign endpoints
    ├── models/
    │   └── user.py           ← User SQLAlchemy model
    └── schemas/
        └── user.py           ← UserCreate, UserResponse Pydantic schemas
```
**How to get it:** Run `tree echoai-backend/app/` in terminal and screenshot, or use VS Code sidebar

---

## FIGURE 4.2 — Screenshot: Login Page (EchoAI Frontend)
**Where:** Chapter 4, Section 4.2.1.3 (after token payload paragraph)
**URL to screenshot:** http://localhost:3000/login
**What must be visible:** Email field, password field, submit button, EchoAI branding, dark theme

---

## FIGURE 4.4 — Screenshot: Script and Persona Setup, Admin Interface
**Where:** Chapter 4, Section 4.2.2.1 (after Script Management paragraph)
**URL to screenshot:** http://localhost:3000/admin → Script/Persona Setup
**What must be visible:** Three tabs (Scripts, Personas, Campaign Context), script list, editor textarea

---

## FIGURE 4.5 — Screenshot: Campaigns Page, Admin Interface
**Where:** Chapter 4, Section 4.2.2.3 (after Campaign Management paragraph)
**URL to screenshot:** http://localhost:3000/admin → Campaigns
**What must be visible:** Campaign cards with status badges (Draft/Active), readiness percentage, action buttons

---

## FIGURE 4.6 — Screenshot: EchoAI Landing Page
**Where:** Chapter 4, Section 4.3.1
**URL to screenshot:** http://localhost:3000/ (unauthenticated)
**What must be visible:** Marketing landing content, "Login" navigation link, EchoAI branding

---

## FIGURE 4.7 — Screenshot: Login Page with Form Validation
**Where:** Chapter 4, Section 4.3.1 (after Figure 4.6)
**URL to screenshot:** http://localhost:3000/login — deliberately submit empty/bad email
**What must be visible:** Red validation error message under email field (e.g., "Please enter a valid email address")

---

## FIGURE 4.8 — Screenshot: Agent Dashboard, Main Interface
**Where:** Chapter 4, Section 4.3.2
**URL to screenshot:** http://localhost:3000/dashboard (login as agent)
**What must be visible:** Live Call Panel, Lead Queue, Performance Metrics Bar, Script Prompter, AI Suggestion Feed

---

## FIGURE 4.9 — Screenshot: Supervisor Dashboard, Team Monitoring View
**Where:** Chapter 4, Section 4.3.3
**URL to screenshot:** http://localhost:3000/supervisor (login as supervisor)
**What must be visible:** Team Overview Grid of agent cards, Escalation Alert Panel, Performance Analytics Summary

---

## FIGURE 4.10 — Screenshot: Admin Overview Dashboard
**Where:** Chapter 4, Section 4.3.4.1
**URL to screenshot:** http://localhost:3000/admin (login as admin)
**What must be visible:** System-wide KPI cards, quick-access tiles to all admin sub-pages

---

## FIGURE 4.11 — Screenshot: User Access Management Page
**Where:** Chapter 4, Section 4.3.4.2
**URL to screenshot:** http://localhost:3000/admin → User Access
**What must be visible:** Sortable user table, role badges, status badges, Lock/Unlock/Deactivate buttons

---

## FIGURE 4.12 — Screenshot: Global Analytics Page
**Where:** Chapter 4, Section 4.3.4.6
**URL to screenshot:** http://localhost:3000/admin → Analytics
**What must be visible:** Call volume chart, sentiment distribution, conversion rate cards (mock data)

---

## FIGURE 4.13 — Screenshot: Login Page, Email/Password Fields and Submit
**Where:** Chapter 4, Section 4.5 — Authentication Screens
**Same as Figure 4.2** — can reuse the same screenshot or show a clean idle state (no errors)

---

## FIGURE 4.14 — Screenshot: Signup Page, Admin User Creation Form
**Where:** Chapter 4, Section 4.5 — Authentication Screens
**URL to screenshot:** http://localhost:3000/signup (must be logged in as admin to access)
**What must be visible:** Email, password, role selector, full_name fields, submit button

---

## FIGURE 4.15 — Screenshot: Agent Dashboard, Full Interface with Live Call Panel
**Where:** Chapter 4, Section 4.5 — Agent Screens
**Same as Figure 4.8** or a wider crop showing the full layout

---

## FIGURE 4.16 — Screenshot: Agent Dashboard, Script Prompter and AI Suggestions
**Where:** Chapter 4, Section 4.5 — Agent Screens
**URL to screenshot:** http://localhost:3000/dashboard — crop/focus on the right-side panels
**What must be visible:** Script Prompter with highlighted section + AI Suggestion Feed sidebar

---

## FIGURE 4.17 — Screenshot: Agent Dashboard, Lead Queue Panel
**Where:** Chapter 4, Section 4.5 — Agent Screens
**URL to screenshot:** http://localhost:3000/dashboard — crop/focus on Lead Queue
**What must be visible:** Lead list with score badges, contact details, quick-dial buttons

---

## FIGURE 4.18 — Screenshot: Supervisor Dashboard, Team Monitoring Grid
**Where:** Chapter 4, Section 4.5 — Supervisor Screens
**Same as Figure 4.9** or focus on the agent cards grid specifically

---

## FIGURE 4.19 — Screenshot: Supervisor Dashboard, Escalation Alert Panel
**Where:** Chapter 4, Section 4.5 — Supervisor Screens
**URL to screenshot:** http://localhost:3000/supervisor — focus on escalation panel
**What must be visible:** Live escalation feed with call details and "Take Over / Advise" buttons

---

## FIGURE 4.20 — Screenshot: Admin Overview Dashboard
**Where:** Chapter 4, Section 4.5 — Admin Screens
**Same as Figure 4.10**

---

## FIGURE 4.21 — Screenshot: User Access Management, User Table with Actions
**Where:** Chapter 4, Section 4.5 — Admin Screens
**Same as Figure 4.11** or a closer crop of the table itself

---

## FIGURE 4.22 — Screenshot: User Access Management, Create User Modal
**Where:** Chapter 4, Section 4.5 — Admin Screens
**URL to screenshot:** http://localhost:3000/admin → User Access → click "Create User"
**What must be visible:** Open modal with email, password, role dropdown, name fields

---

## FIGURE 4.23 — Screenshot: Campaigns Page, Campaign Cards Grid
**Where:** Chapter 4, Section 4.5 — Admin Screens
**Same as Figure 4.5** or focus on the cards grid layout

---

## FIGURE 4.24 — Screenshot: Script and Persona Setup, Scripts Tab
**Where:** Chapter 4, Section 4.5 — Admin Screens
**URL to screenshot:** http://localhost:3000/admin → Script/Persona Setup → Scripts tab
**What must be visible:** Script list, "New Script" button, editor panel open

---

## FIGURE 4.25 — Screenshot: Script and Persona Setup, Personas Tab
**Where:** Chapter 4, Section 4.5 — Admin Screens
**URL to screenshot:** http://localhost:3000/admin → Script/Persona Setup → Personas tab
**What must be visible:** Persona cards with tone badges (Professional, Empathetic, etc.)

---

## FIGURE 4.26 — Screenshot: Knowledge Base Page, Item List with Filter
**Where:** Chapter 4, Section 4.5 — Admin Screens
**URL to screenshot:** http://localhost:3000/admin → Knowledge Base
**What must be visible:** Category-filtered list of knowledge items, search bar, toggle buttons

---

## FIGURE 4.27 — Screenshot: Global Analytics Dashboard
**Where:** Chapter 4, Section 4.5 — Admin Screens
**Same as Figure 4.12**

---

## FIGURE 4.28 — Screenshot: Leads and CRM Page
**Where:** Chapter 4, Section 4.5 — Admin Screens
**URL to screenshot:** http://localhost:3000/admin → Leads/CRM
**What must be visible:** Sortable lead table, color-coded score badges (red→green), lead detail panel

---

## FIGURE 4.29 — Screenshot: Security and Access, Event Log
**Where:** Chapter 4, Section 4.5 — Admin Screens
**URL to screenshot:** http://localhost:3000/admin → Security/Access
**What must be visible:** Simulated auth event log (timestamps, IPs, usernames), policy config panels

---

## FIGURE 4.30 — Screenshot: System Settings Page
**Where:** Chapter 4, Section 4.5 — Admin Screens
**URL to screenshot:** http://localhost:3000/admin → System Settings
**What must be visible:** Accordion sections for general info, notifications, integrations, API keys

---

# QUICK SUMMARY TABLE

| Figure | Type | How to Create |
|--------|------|---------------|
| 3.1 | Architecture Diagram | PlantUML above |
| 3.2 | Sequence Diagram | PlantUML above |
| 3.3 | Activity Diagram | PlantUML above |
| 3.4 | Activity Diagram | PlantUML above |
| 3.5 | Activity Diagram (Swimlane) | PlantUML above |
| 3.6 | Class Diagram | PlantUML above |
| 3.7 | Sequence Diagram | PlantUML above |
| 3.8 | Sequence Diagram | PlantUML above |
| 3.9 | Sequence Diagram | PlantUML above |
| 3.10 | State Diagram | PlantUML above |
| 3.11 | State Diagram | PlantUML above |
| 3.12 | ERD | PlantUML above |
| 3.13 | Color/Typography Reference | Manual (Figma/Canva) |
| 4.1 | Code Tree Screenshot | Terminal: tree echoai-backend/app/ |
| 4.2 | UI Screenshot | localhost:3000/login |
| 4.3 | Flow Diagram | PlantUML above |
| 4.4 | UI Screenshot | localhost:3000/admin → Script/Persona Setup |
| 4.5 | UI Screenshot | localhost:3000/admin → Campaigns |
| 4.6 | UI Screenshot | localhost:3000/ (unauthenticated) |
| 4.7 | UI Screenshot | localhost:3000/login (trigger validation) |
| 4.8 | UI Screenshot | localhost:3000/dashboard (as agent) |
| 4.9 | UI Screenshot | localhost:3000/supervisor (as supervisor) |
| 4.10 | UI Screenshot | localhost:3000/admin |
| 4.11 | UI Screenshot | localhost:3000/admin → User Access |
| 4.12 | UI Screenshot | localhost:3000/admin → Analytics |
| 4.13 | UI Screenshot | Reuse 4.2 |
| 4.14 | UI Screenshot | localhost:3000/signup (as admin) |
| 4.15 | UI Screenshot | Reuse 4.8 (full width) |
| 4.16 | UI Screenshot | localhost:3000/dashboard (Script Prompter crop) |
| 4.17 | UI Screenshot | localhost:3000/dashboard (Lead Queue crop) |
| 4.18 | UI Screenshot | Reuse 4.9 (Grid crop) |
| 4.19 | UI Screenshot | localhost:3000/supervisor (Escalation crop) |
| 4.20 | UI Screenshot | Reuse 4.10 |
| 4.21 | UI Screenshot | Reuse 4.11 (Table crop) |
| 4.22 | UI Screenshot | localhost:3000/admin → User Access → Create User modal open |
| 4.23 | UI Screenshot | Reuse 4.5 (Cards crop) |
| 4.24 | UI Screenshot | localhost:3000/admin → Script/Persona → Scripts tab |
| 4.25 | UI Screenshot | localhost:3000/admin → Script/Persona → Personas tab |
| 4.26 | UI Screenshot | localhost:3000/admin → Knowledge Base |
| 4.27 | UI Screenshot | Reuse 4.12 |
| 4.28 | UI Screenshot | localhost:3000/admin → Leads/CRM |
| 4.29 | UI Screenshot | localhost:3000/admin → Security/Access |
| 4.30 | UI Screenshot | localhost:3000/admin → System Settings |