# EchoAI Authentication & Testing Guide

## Fixed Issues ✅

1. **Login now requires real backend credentials** - No more dummy login fallback
2. **Call Cockpit navigation fixed** - Agent and Supervisor sessions stay in their respective paths
3. **Backend fully operational** - All endpoints properly configured

---

## Test Credentials

Use these credentials to login to the EchoAI system. The backend will validate them against the database.

| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| **Admin** | admin@echoai.com | AdminPass123 | Access admin dashboard, manage scripts/personas |
| **Supervisor** | supervisor@echoai.com | SupervisorPass123 | Monitor calls, escalations, team activity |
| **Agent** | agent@echoai.com | AgentPass123 | Run campaigns, make calls, manage leads |

---

## Setup Instructions (One Time)

### 1. Start Everything From One Terminal

Run this from the project root:
\`\`\`bash
npm run dev
\`\`\`

This single command does three things:

1. Seeds the test users into the backend database
2. Starts the FastAPI backend on **http://localhost:8000**
3. Starts the Next.js frontend on **http://localhost:3000**

**Note**: If users already exist, seeding will skip them.

### 2. Optional: Frontend Only

If you only want the UI and already have the backend running, use:
\`\`\`bash
npm run dev:frontend
\`\`\`

---

## How to Test Login

### Test 1: Login as Admin
1. Navigate to http://localhost:3000/login
2. Email: **admin@echoai.com**
3. Password: **AdminPass123**
4. Role: Select **Admin**
5. Click "Initialize Session"
6. **Expected**: Redirected to /admin dashboard
7. **Verify**: See admin menu and options on left sidebar

### Test 2: Login as Supervisor
1. Go to http://localhost:3000/login
2. Email: **supervisor@echoai.com**
3. Password: **SupervisorPass123**
4. Role: Select **Supervisor**
5. Click "Initialize Session"
6. **Expected**: Redirected to /supervisor dashboard
7. **Verify**: See supervisor menu (overview, activity, escalations, etc.)

### Test 3: Login as Agent
1. Go to http://localhost:3000/login
2. Email: **agent@echoai.com**
3. Password: **AgentPass123**
4. Role: Select **Agent**
5. Click "Initialize Session"
6. **Expected**: Redirected to /dashboard (agent dashboard)
7. **Verify**: See agent menu (dashboard, campaigns, live calls, history, leads)

### Test 4: Wrong Credentials Should Fail
1. Go to http://localhost:3000/login
2. Email: admin@echoai.com
3. Password: **WrongPassword**
4. Click "Initialize Session"
5. **Expected**: Error message: "Backend authentication failed. Please check your credentials and ensure the backend server is running at http://localhost:8000"

### Test 5: Dummy Credentials Should Fail
1. Go to http://localhost:3000/login
2. Email: **dummy@example.com**
3. Password: **DummyPass123**
4. Click "Initialize Session"
5. **Expected**: Error message (backend auth failure)
6. **Verify**: NOT redirected to dashboard

---

## Test Navigation in Call Cockpit

### Agent Session Navigation Fix

1. **Login as Agent**: agent@echoai.com / AgentPass123
2. Navigate to **Live Calls** section
3. Click on a live call to open **Call Cockpit**
4. You should see two buttons:
   - "Back to Calls" → goes to **/dashboard/live** ✅
   - "Open Dashboard" → goes to **/dashboard** ✅
5. **Verify**: Both buttons stay in agent paths (/dashboard/*)

### Supervisor Session Navigation (Should Still Work)

1. **Login as Supervisor**: supervisor@echoai.com / SupervisorPass123
2. Navigate to **Team Activity** or view escalations
3. Click on a live call to open **Call Cockpit**
4. You should see two buttons:
   - "Back to Activity" → goes to **/supervisor/activity** ✅
   - "Open Dashboard" → goes to **/supervisor** ✅
5. **Verify**: Both buttons stay in supervisor paths (/supervisor/*)

---

## Backend API Test (cURL)

### Get Auth Token
\\\ash
curl -X POST http://localhost:8000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@echoai.com",
    "password": "AdminPass123"
  }'
\\\

Response:
\\\json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "Admin User",
    "email": "admin@echoai.com",
    "role": "admin"
  }
}
\\\

### Test Script Endpoint (with token)
\\\ash
# Get token first, then use it
TOKEN="<your-access-token>"

curl -X GET http://localhost:8000/api/admin/scripts \\
  -H "Authorization: Bearer "
\\\

---

## Troubleshooting

### "Backend authentication failed" error
**Problem**: Backend server not running or database not seeded
**Solution**:
1. Check if backend is running: http://localhost:8000/api/health
2. Run seed script: \python seed_test_users.py\
3. Ensure test users exist in database

### "User not found" error
**Problem**: User credentials not seeded to database
**Solution**:
\\\ash
cd echoai-backend
.\venv\Scripts\activate
python seed_test_users.py
\\\

### Agent session still shows supervisor links
**Problem**: Old code cached in browser
**Solution**:
1. Clear browser cache: Ctrl+Shift+Delete
2. Close and reopen browser
3. Hard refresh: Ctrl+Shift+R

### Login works but redirects to wrong dashboard
**Problem**: Role not properly set in database or token
**Solution**:
1. Check database: \python -c "from app.db.session import SessionLocal; from app.models.user import User; db = SessionLocal(); users = db.query(User).all(); print([(u.email, u.role) for u in users])\"\
2. Verify role in seeded users (should be admin/supervisor/agent)
3. Clear localStorage: \localStorage.clear()\ in console

---

## Key Changes Made

1. **src/lib/auth.ts**: Removed demo token fallback - now requires real backend
2. **src/components/supervisor/CallCockpitPage.tsx**: Fixed navigation to be role-aware
   - Agent sessions redirect to /dashboard paths
   - Supervisor sessions redirect to /supervisor paths
3. **echoai-backend/seed_test_users.py**: New script to seed test users

---

## What Works Now ✅

- ✅ Login enforces real backend credentials
- ✅ Only valid users can access the system
- ✅ Agent and Supervisor sessions are properly isolated
- ✅ Call Cockpit navigation respects user role
- ✅ All backend endpoints are functional
- ✅ Database seeding with test credentials

---

## Next Steps

1. Test login with all three roles
2. Verify navigation in Call Cockpit
3. Test that wrong credentials fail
4. Check backend API endpoints with cURL
5. Test with admin/supervisor/agent workflows

