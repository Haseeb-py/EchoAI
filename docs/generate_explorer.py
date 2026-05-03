import json

def get_html_content():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EchoAI Codebase Explorer</title>
    <style>
        :root {
            --bg-dark: #0f172a;
            --bg-panel: #1e293b;
            --bg-hover: #334155;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #60a5fa;
            --border: #334155;
            --folder-color: #fbbf24;
            --file-color: #60a5fa;
            --success: #10b981;
            --warning: #f59e0b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif; }
        body { background-color: var(--bg-dark); color: var(--text-main); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

        header { background-color: var(--bg-panel); padding: 15px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); z-index: 10; }
        h1 { font-size: 1.5rem; font-weight: 600; display: flex; align-items: center; gap: 10px; }

        .tabs { display: flex; gap: 10px; }
        .tab-btn { background: transparent; border: 1px solid transparent; color: var(--text-muted); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
        .tab-btn:hover { background: var(--bg-hover); color: var(--text-main); }
        .tab-btn.active { background: var(--accent); color: white; }

        .search-container { position: relative; }
        .search-input { background: var(--bg-dark); border: 1px solid var(--border); color: white; padding: 8px 16px; border-radius: 20px; width: 250px; outline: none; transition: border-color 0.2s; }
        .search-input:focus { border-color: var(--accent); }

        .tab-content { display: none; flex: 1; height: calc(100vh - 70px); overflow: hidden; }
        .tab-content.active { display: flex; }

        #explorer-tab { display: flex; width: 100%; }
        .tree-container { width: 35%; min-width: 300px; border-right: 1px solid var(--border); padding: 20px; overflow-y: auto; background: var(--bg-dark); }
        .details-container { width: 65%; padding: 30px; background: var(--bg-panel); overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }

        ul.tree { list-style: none; padding-left: 20px; }
        ul.tree.root { padding-left: 0; }
        ul.tree li { margin: 5px 0; position: relative; }
        ul.tree li::before { content: ''; position: absolute; top: 15px; left: -15px; border-left: 1px solid var(--border); border-bottom: 1px solid var(--border); width: 10px; height: 15px; }
        ul.tree li::after { content: ''; position: absolute; top: 15px; bottom: -15px; left: -15px; border-left: 1px solid var(--border); }
        ul.tree li:last-child::after { display: none; }
        ul.tree.root > li::before, ul.tree.root > li::after { display: none; }

        .node { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; background: transparent; border: 1px solid transparent; border-radius: 6px; cursor: pointer; color: var(--text-main); font-size: 0.95rem; transition: all 0.2s; user-select: none; }
        .node:hover { background: var(--bg-hover); }
        .node.selected { background: rgba(59, 130, 246, 0.15); border-color: var(--accent); }
        .node.highlight { background: rgba(16, 185, 129, 0.2); border-color: var(--success); }

        .icon-folder { color: var(--folder-color); }
        .icon-file { color: var(--file-color); }
        .toggle-icon { display: inline-block; width: 12px; font-size: 0.8rem; color: var(--text-muted); transition: transform 0.2s; }
        .collapsed > ul { display: none; }
        .collapsed > .node .toggle-icon { transform: rotate(-90deg); }

        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); text-align: center; }
        .empty-state svg { width: 64px; height: 64px; margin-bottom: 20px; opacity: 0.5; }

        .card { background: var(--bg-dark); border: 1px solid var(--border); border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.2); animation: fadeIn 0.3s ease-out; margin-bottom: 20px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .detail-title { font-size: 1.8rem; margin-bottom: 10px; color: var(--accent); display: flex; align-items: center; gap: 10px; }
        
        .badge { display: inline-block; padding: 4px 8px; background: var(--bg-hover); color: var(--text-main); border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-right: 8px; }
        .badge.role { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
        .badge.dep { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }

        .section-heading { font-size: 1.2rem; margin: 25px 0 15px 0; color: #f8fafc; font-weight: 600; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
        .section-heading svg { color: var(--accent); }
        
        p.desc { line-height: 1.6; font-size: 1.05rem; color: #cbd5e1; margin-bottom: 15px;}
        
        .tech-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; }
        .tech-box { background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 15px; border-radius: 8px; }
        .tech-box strong { display: block; color: var(--accent-hover); margin-bottom: 5px; font-size: 0.95rem; }
        .tech-box span { font-size: 0.9rem; color: #94a3b8; }

        .content-scroll { width: 100%; height: 100%; overflow-y: auto; padding: 40px; background: var(--bg-dark); }
        .flow-container { display: flex; flex-direction: column; gap: 30px; max-width: 1000px; margin: 0 auto; }
        .flow-box { background: var(--bg-panel); border: 1px solid var(--border); padding: 25px; border-radius: 12px; }
        .flow-box h3 { color: var(--accent); margin-bottom: 15px; font-size: 1.4rem;}
        .arrow-down { text-align: center; font-size: 2rem; color: var(--text-muted); margin: -10px 0; }

        .guide-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; max-width: 1200px; margin: 0 auto; }
        .guide-box { background: var(--bg-panel); padding: 30px; border-radius: 12px; border: 1px solid var(--border); }
        .guide-box h2 { margin-bottom: 20px; font-size: 1.5rem; }
        .guide-text { line-height: 1.7; font-size: 1.05rem; color: #cbd5e1; }
        .guide-text ul { padding-left: 20px; margin-top: 10px; }
        .guide-text li { margin-bottom: 10px; }

        .workflow-step { margin-bottom: 15px; padding-left: 15px; border-left: 2px solid var(--border); }
        .workflow-step h4 { color: #f1f5f9; margin-bottom: 5px; }
        .workflow-step p { color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; }
    </style>
</head>
<body>

    <header>
        <h1>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-folder"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
            EchoAI Codebase Explorer
        </h1>
        <div class="search-container">
            <input type="text" id="searchInput" class="search-input" placeholder="Search components, logic...">
        </div>
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('explorer')">🧭 Components Explorer</button>
            <button class="tab-btn" onclick="switchTab('architecture')">🏗 Architecture & Flow</button>
            <button class="tab-btn" onclick="switchTab('guide')">📖 Deep Dive Guide</button>
        </div>
    </header>

    <!-- EXPLORER TAB -->
    <div id="explorer-tab" class="tab-content active">
        <div class="tree-container" id="tree-root"></div>
        <div class="details-container" id="details-panel">
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <h2>Select a component to view details</h2>
                <p>Click on any file to explore its full workflow, backend logic, and technology stack.</p>
            </div>
        </div>
    </div>

    <!-- ARCHITECTURE TAB -->
    <div id="architecture-tab" class="tab-content">
        <div class="content-scroll">
            <div class="flow-container">
                <h2 style="text-align:center; font-size: 2rem; margin-bottom: 20px;">System Architecture & Data Flow</h2>
                
                <div class="flow-box" style="border-left: 4px solid #3b82f6;">
                    <h3>1. Client Interface (Next.js 14)</h3>
                    <p class="guide-text">The frontend is segmented into three distinct dashboards: Admin, Supervisor, and Agent. Each dashboard comprises specialized React components built with Tailwind CSS. State is managed locally (React hooks) and globally (auth token in LocalStorage).</p>
                </div>
                <div class="arrow-down">↓</div>
                <div class="flow-box" style="border-left: 4px solid #a855f7;">
                    <h3>2. Next.js API Proxy & Middleware</h3>
                    <p class="guide-text"><code>middleware.ts</code> enforces Role-Based Access Control (RBAC) at the route level. Next.js natively proxies all requests prefixed with <code>/api/</code> to the FastAPI backend to avoid CORS conflicts.</p>
                </div>
                <div class="arrow-down">↓</div>
                <div class="flow-box" style="border-left: 4px solid #10b981;">
                    <h3>3. FastAPI Backend</h3>
                    <p class="guide-text">The Python backend receives proxy requests. <code>deps.py</code> intercepts them to validate the JWT token. Specific routers (e.g., <code>/routes/admin.py</code>) execute business logic, utilizing Pydantic schemas for data validation.</p>
                </div>
                <div class="arrow-down">↓</div>
                <div class="flow-box" style="border-left: 4px solid #fbbf24;">
                    <h3>4. SQLite Database (SQLAlchemy)</h3>
                    <p class="guide-text">The ORM translates Python models (Users, Campaigns, Scripts, Personas) into SQL queries. PassLib handles secure password hashing before persistence.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- GUIDE TAB -->
    <div id="guide-tab" class="tab-content">
        <div class="content-scroll">
            <div class="guide-grid">
                <div class="guide-box" style="border-color: #fbbf24;">
                    <h2 style="color: #fbbf24;">🧠 How to Navigate This App</h2>
                    <p class="guide-text">EchoAI uses an isolated dashboard pattern. The UI changes entirely depending on the role:</p>
                    <ul class="guide-text">
                        <li><strong>Admins</strong> access <code>/admin/*</code>. Their UI focuses on configuration, user management, script creation, and global settings.</li>
                        <li><strong>Supervisors</strong> access <code>/supervisor/*</code>. Their UI focuses on real-time monitoring, live call cockpits, and team performance metrics.</li>
                        <li><strong>Agents</strong> access <code>/dashboard/*</code>. Their UI is action-oriented: launching campaigns, talking to leads, and taking notes.</li>
                    </ul>
                </div>

                <div class="guide-box" style="border-color: #10b981;">
                    <h2 style="color: #10b981;">🛠️ Extending the Platform</h2>
                    <p class="guide-text">To add a new feature:</p>
                    <ul class="guide-text">
                        <li><strong>1. UI Layer:</strong> Add a new <code>.tsx</code> file in the appropriate folder (e.g., <code>src/components/supervisor/NewFeature.tsx</code>).</li>
                        <li><strong>2. Routing:</strong> Import and render your component inside a new Next.js route in <code>src/app/</code>.</li>
                        <li><strong>3. Data Layer:</strong> If the component needs dynamic data, replace the `localStorage` mock logic with a standard <code>fetch()</code> call to a FastAPI endpoint, passing the JWT token in the <code>Authorization</code> header.</li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <script>
        const codebaseData = {
            id: 'root', name: "EchoAI Frontend (src/)", type: "folder",
            children: [
                {
                    id: 'admin-folder', name: "components/admin", type: "folder",
                    children: [
                        {
                            id: 'AdminNavigation', name: "AdminNavigation.tsx", type: "file",
                            role: "Layout Component", deps: "Lucide React, Next.js Link",
                            desc: "Sidebar and Header navigation specific to the Admin portal.",
                            workflow: [
                                { title: "Initialization", desc: "Reads the current pathname to highlight the active menu item." },
                                { title: "Interaction", desc: "User clicks a menu item. Next.js router handles the client-side navigation without a full page reload." }
                            ],
                            logic: "Maintains UI state for mobile sidebar toggle. Contains no complex backend logic; purely presentational.",
                            tech: [
                                { name: "Lucide React", reason: "Provides consistent, scalable SVG icons across all navigation items." },
                                { name: "Tailwind CSS", reason: "Used for responsive hiding/showing of the sidebar on mobile devices." }
                            ]
                        },
                        {
                            id: 'UserManagementPage', name: "UserManagementPage.tsx", type: "file",
                            role: "Core View", deps: "FastAPI (/api/admin/users)",
                            desc: "The central hub for Role-Based Access Control (RBAC). Admins use this to create agents/supervisors and lock accounts.",
                            workflow: [
                                { title: "Page Load", desc: "Triggers a useEffect hook that calls the backend /api/admin/users endpoint to fetch the list of all registered team members." },
                                { title: "Create User", desc: "Admin fills out the form. The component validates the email and sends a POST request to the backend. The backend hashes the password and saves the user." },
                                { title: "Modify User", desc: "Admin clicks 'Lock' or 'Change Role'. A PUT request is sent to the backend to update the user's status field in the SQLite database." }
                            ],
                            logic: "The component manages complex local state for the UI (search filtering, open menus, loading states) while staying synchronized with the backend. It actively parses backend error messages and displays them in the AdminMessage component.",
                            tech: [
                                { name: "React useState/useMemo", reason: "useMemo is heavily utilized to optimize the client-side search filtering of the user table." },
                                { name: "Fetch API", reason: "Directly communicates with FastAPI. Injects the JWT token securely from localStorage." }
                            ]
                        },
                        {
                            id: 'ScriptPersonaSetup', name: "ScriptPersonaSetup.tsx", type: "file",
                            role: "Core View", deps: "FastAPI (/api/admin/scripts, /api/admin/personas)",
                            desc: "Interface for defining the AI's dialogue rules and vocal personality.",
                            workflow: [
                                { title: "Data Fetching", desc: "Retrieves existing Scripts and Personas from the database." },
                                { title: "Form Submission", desc: "When creating a Script, it gathers the prompt, objective, and fallback instructions, sending them as JSON to the backend." },
                                { title: "Persona Config", desc: "Captures voice settings (speed, pitch) and associates an ElevenLabs voice ID to a persona record." }
                            ],
                            logic: "Two distinct forms and tables live within this file. The logic separates the concepts: Scripts dictate 'What the AI says' while Personas dictate 'How the AI sounds'. Both rely on full CRUD API operations.",
                            tech: [
                                { name: "SQLAlchemy Models", reason: "The backend perfectly mirrors this UI with Script and Persona database models." }
                            ]
                        },
                        {
                            id: 'CampaignsPage', name: "CampaignsPage.tsx", type: "file",
                            role: "Core View", deps: "FastAPI (/api/admin/campaigns)",
                            desc: "Where Admins combine Scripts, Personas, and Lead lists into an actionable Campaign for Agents.",
                            workflow: [
                                { title: "Creation Flow", desc: "Admin names a campaign, selects a previously created Script from a dropdown, and assigns a Persona." },
                                { title: "Activation", desc: "Campaign status can be toggled between 'Draft' and 'Active'. Only active campaigns appear in the Agent's dashboard." }
                            ],
                            logic: "This screen orchestrates relational data. It fetches lists of scripts/personas to populate the form options, then creates a Campaign record that holds foreign keys to those selected items.",
                            tech: [
                                { name: "Relational DB Strategy", reason: "Demonstrates how the frontend handles relational database creation via REST API references." }
                            ]
                        },
                        {
                            id: 'GlobalAnalyticsPage', name: "GlobalAnalyticsPage.tsx", type: "file",
                            role: "Data View", deps: "Recharts, Mock Data",
                            desc: "Displays system-wide KPIs like total calls, overall sentiment, and agent efficiency.",
                            workflow: [
                                { title: "Visualization", desc: "Renders line charts and bar charts to display historical call volume and success rates." }
                            ],
                            logic: "Currently relies heavily on hardcoded mock data for the prototype. Future iterations will require a complex backend aggregation endpoint.",
                            tech: [
                                { name: "Recharts", reason: "Chosen for its highly customizable, React-native SVG charting capabilities." }
                            ]
                        },
                        {
                            id: 'SystemSettingsPage', name: "SystemSettingsPage.tsx", type: "file",
                            role: "Config View", deps: "Local State",
                            desc: "Configuration for external API keys (Twilio, ElevenLabs, OpenAI).",
                            workflow: [
                                { title: "Configuration", desc: "Admin inputs sensitive API keys." }
                            ],
                            logic: "Currently implemented as a mock interface. In production, these would be saved securely in an environment variable or encrypted vault, not local storage.",
                            tech: [
                                { name: "Security Architecture", reason: "Highlights the need for secure secret management in the next development phase." }
                            ]
                        }
                    ]
                },
                {
                    id: 'supervisor-folder', name: "components/supervisor", type: "folder",
                    children: [
                        {
                            id: 'SupervisorDashboardPage', name: "SupervisorDashboardPage.tsx", type: "file",
                            role: "Main Hub", deps: "Lucide React, Mock Data",
                            desc: "The command center for Supervisors to monitor high-level team metrics and immediate alerts.",
                            workflow: [
                                { title: "Overview", desc: "Displays instant KPIs like 'Active Agents', 'Calls Today', and 'Escalation Rate'." },
                                { title: "Alerts Panel", desc: "Shows a real-time feed of system warnings (e.g., 'Agent offline', 'Call dropped')." }
                            ],
                            logic: "Aggregates data from multiple domains (Agents, Calls, System). Currently mocked, but requires WebSockets in production for real-time KPI updates.",
                            tech: [
                                { name: "Tailwind Grid", reason: "Used extensively here to build complex, responsive bento-box style layouts." }
                            ]
                        },
                        {
                            id: 'CallCockpitPage', name: "CallCockpitPage.tsx", type: "file",
                            role: "Real-time View", deps: "Mock State",
                            desc: "A highly interactive screen allowing Supervisors to listen in on live calls and view streaming transcripts.",
                            workflow: [
                                { title: "Selection", desc: "Supervisor selects an active call from the list." },
                                { title: "Monitoring", desc: "The UI displays a simulated live transcript scrolling on the screen, along with real-time sentiment analysis gauges." },
                                { title: "Intervention", desc: "Provides buttons to 'Barge In' or 'Whisper' to the agent." }
                            ],
                            logic: "Simulates WebSocket stream data. The transcript array automatically pushes new simulated messages on an interval, mimicking the behavior of a live Twilio/Whisper stream.",
                            tech: [
                                { name: "State Intervals", reason: "Uses React `setInterval` hooks to mock real-time streaming data." },
                                { name: "Twilio Architecture", reason: "Designed specifically to interface with Twilio's live call streaming APIs in the future." }
                            ]
                        },
                        {
                            id: 'EscalationsPage', name: "EscalationsPage.tsx", type: "file",
                            role: "Action View", deps: "Local State",
                            desc: "A queue of calls where the AI failed or the customer demanded a human.",
                            workflow: [
                                { title: "Queue Management", desc: "Displays a list of escalated calls with high priority." },
                                { title: "Resolution", desc: "Supervisor clicks 'Take Over Call' or 'Assign to Senior Agent'." }
                            ],
                            logic: "Acts as a triage inbox. Manages an array of escalation objects, allowing the supervisor to change their status from 'Pending' to 'Resolved'.",
                            tech: [
                                { name: "Action Handlers", reason: "Focuses heavily on quick-action buttons and state mutation." }
                            ]
                        },
                        {
                            id: 'TeamActivityPage', name: "TeamActivityPage.tsx", type: "file",
                            role: "Monitoring View", deps: "Mock Data",
                            desc: "Shows the real-time status of every agent (In Call, Wrap-up, Idle, Offline).",
                            workflow: [
                                { title: "Presence Checking", desc: "Renders a list of agents with color-coded status badges." }
                            ],
                            logic: "This UI maps directly to a 'Presence System' concept, showing how long an agent has been in their current state.",
                            tech: [
                                { name: "Color Theory", reason: "Strict color coding (Green=Active, Yellow=Wrap, Red=Offline) for instant visual parsing." }
                            ]
                        }
                    ]
                },
                {
                    id: 'agent-folder', name: "components/dashboard", type: "folder",
                    children: [
                        {
                            id: 'AgentWorkflows', name: "AgentWorkflows.tsx", type: "file",
                            role: "Primary Interface", deps: "React State, Complex Mocking",
                            desc: "The largest and most complex frontend component. It is the actual workspace where an agent spends their entire day.",
                            workflow: [
                                { title: "Campaign Selection", desc: "Agent selects an active campaign from a dropdown." },
                                { title: "Dialing", desc: "Agent clicks 'Start Session'. The system simulates dialing numbers from a lead list." },
                                { title: "Live Call", desc: "When connected, the UI shifts to show the Lead's information, a real-time transcript of the AI talking, and the campaign script." },
                                { title: "Post-call", desc: "The agent takes notes, dispositions the call (e.g., 'Sale', 'Not Interested'), and moves to the next lead." }
                            ],
                            logic: "This file is essentially a massive state machine. It manages the flow between `IDLE` -> `DIALING` -> `CONNECTED` -> `WRAP_UP`. It heavily mocks the interactions that will eventually be handled by the Twilio Voice SDK and the ElevenLabs streaming pipeline.",
                            tech: [
                                { name: "React State Machine", reason: "Uses complex combined states to render completely different UI layouts depending on the call status." },
                                { name: "Glassmorphism UI", reason: "Uses intensive Tailwind blur and opacity classes to create a futuristic 'Cockpit' feel for the agent." }
                            ]
                        },
                        {
                            id: 'Sidebar', name: "Sidebar.tsx", type: "file",
                            role: "Navigation", deps: "Lucide React",
                            desc: "The agent's side navigation panel.",
                            workflow: [
                                { title: "Navigation", desc: "Allows switching between the main workflow, call history, and settings." }
                            ],
                            logic: "Simple presentational component.",
                            tech: [
                                { name: "CSS Transitions", reason: "Provides smooth hover effects and mobile flyout animations." }
                            ]
                        }
                    ]
                }
            ]
        };

        const icons = {
            folder: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-folder"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
            file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon-file"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
            toggle: `<span class="toggle-icon">▼</span>`
        };

        const nodeMap = new Map();

        function createTreeHTML(node, isRoot = false) {
            nodeMap.set(node.id, node);
            let html = `<ul class="tree ${isRoot ? 'root' : ''}" id="ul-${node.id}">`;
            const hasChildren = node.children && node.children.length > 0;
            const icon = node.type === 'folder' ? icons.folder : icons.file;
            const toggle = hasChildren ? icons.toggle : '<span style="width:12px;display:inline-block"></span>';

            html += `
                <li id="li-${node.id}">
                    <div class="node" id="node-${node.id}" onclick="handleNodeClick(event, '${node.id}', ${hasChildren})">
                        ${toggle} ${icon} <span class="node-name">${node.name}</span>
                    </div>
            `;

            if (hasChildren) {
                for (const child of node.children) {
                    html += createTreeHTML(child, false);
                }
            }

            html += `</li></ul>`;
            return html;
        }

        document.getElementById('tree-root').innerHTML = createTreeHTML(codebaseData, true);

        function handleNodeClick(e, id, hasChildren) {
            e.stopPropagation();
            if (hasChildren) {
                const li = document.getElementById(`li-${id}`);
                li.classList.toggle('collapsed');
            }
            document.querySelectorAll('.node').forEach(n => n.classList.remove('selected'));
            document.getElementById(`node-${id}`).classList.add('selected');
            renderDetails(id);
        }

        function renderDetails(id) {
            const node = nodeMap.get(id);
            const panel = document.getElementById('details-panel');

            if (node.type === 'folder') {
                panel.innerHTML = `
                    <div class="card">
                        <h2 class="detail-title">${icons.folder} ${node.name}</h2>
                        <p class="desc">A structural directory containing related UI components.</p>
                    </div>
                `;
                return;
            }

            let html = `
                <div class="card">
                    <h2 class="detail-title">${icons.file} ${node.name}</h2>
                    <div style="margin: 15px 0;">
                        <span class="badge role">Role: ${node.role}</span>
                        <span class="badge dep">Dependencies: ${node.deps}</span>
                    </div>
                    <p class="desc" style="font-size: 1.15rem; color: #fff;">${node.desc}</p>
                </div>
            `;

            if (node.workflow && node.workflow.length > 0) {
                html += `
                <div class="card">
                    <div class="section-heading">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        User Workflow
                    </div>
                    <div style="margin-top: 15px;">
                `;
                node.workflow.forEach((step, index) => {
                    html += `
                        <div class="workflow-step">
                            <h4>Step ${index + 1}: ${step.title}</h4>
                            <p>${step.desc}</p>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }

            if (node.logic) {
                html += `
                <div class="card">
                    <div class="section-heading">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                        Backend & Business Logic
                    </div>
                    <p class="desc">${node.logic}</p>
                </div>
                `;
            }

            if (node.tech && node.tech.length > 0) {
                html += `
                <div class="card">
                    <div class="section-heading">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                        Technology Rationale
                    </div>
                    <div class="tech-grid">
                `;
                node.tech.forEach(t => {
                    html += `
                        <div class="tech-box">
                            <strong>${t.name}</strong>
                            <span>${t.reason}</span>
                        </div>
                    `;
                });
                html += `</div></div>`;
            }

            panel.innerHTML = html;
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        }

        document.getElementById('searchInput').addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase();
            document.querySelectorAll('.node').forEach(nodeEl => {
                nodeEl.classList.remove('highlight');
                const name = nodeEl.querySelector('.node-name').innerText.toLowerCase();
                if (query && name.includes(query)) {
                    nodeEl.classList.add('highlight');
                    let parent = nodeEl.parentElement;
                    while (parent && parent.id !== 'tree-root') {
                        if (parent.tagName === 'LI') parent.classList.remove('collapsed');
                        parent = parent.parentElement;
                    }
                }
            });
        });

    </script>
</body>
</html>"""

if __name__ == "__main__":
    import os
    file_path = "e:/study/fyp/Updated/EchoAI/docs/EchoAI_Codebase_Explorer.html"
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(get_html_content())
    print("HTML File successfully generated and overwritten.")
