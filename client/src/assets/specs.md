# B2A Smart-Resource — Full Project Specifications

> **Version:** 1.0 — April 2026
> **Stack:** React 19 + Vite (frontend) · Node.js + Express 5 (backend) · MongoDB Atlas · FastAPI (ML microservice)
> **Author:** Othmen Khedhri

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Directory Structure](#2-directory-structure)
3. [Technology Stack](#3-technology-stack)
4. [Environment Variables](#4-environment-variables)
5. [Database Models](#5-database-models)
6. [API Routes](#6-api-routes)
7. [Authentication & Session](#7-authentication--session)
8. [Frontend Pages & Components](#8-frontend-pages--components)
9. [React Context Providers](#9-react-context-providers)
10. [File Upload Handling](#10-file-upload-handling)
11. [Excel Import Formats](#11-excel-import-formats)
12. [ML Microservice](#12-ml-microservice)
13. [Pace Monitoring & Alerts](#13-pace-monitoring--alerts)
14. [Audit Logging](#14-audit-logging)
15. [Utility Functions](#15-utility-functions)
16. [Build & Deployment](#16-build--deployment)

---

## 1. Project Overview

**B2A Smart-Resource** is a full-stack admin dashboard built for an accounting / consulting firm (B2A). It manages:

- **Staff (Experts):** HR records, roles, levels, hourly rates, workload, burnout tracking
- **Projects:** Budget, pace monitoring, margin tracking, pace alerts
- **Clients:** Full client directory with legal/tax metadata
- **Assignments (Affectations):** Expert ↔ Project mapping
- **Time Entries / Billing / Leave:** Imported from Excel; drive all live metrics
- **Budget Estimation:** ML-powered project cost & hours prediction using historical data
- **Team Builder:** Build a team for a given mission type based on real hourly rates and past experience
- **Audit Trail:** Immutable 365-day log of every action in the system

The frontend communicates with a Node.js/Express backend via REST API. A separate Python FastAPI microservice handles ML predictions. All data lives in MongoDB Atlas.

---

## 2. Directory Structure

```
admin-dash/
├── client/                             # React 19 frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx                     # Root router — lazy-loads all pages
│   │   ├── main.tsx                    # ReactDOM.createRoot entry point
│   │   ├── index.css                   # Global CSS + Tailwind base
│   │   ├── assets/
│   │   │   └── specs.md                # ← This file
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── ForgotPassword.tsx
│   │   │   │   ├── ResetPassword.tsx
│   │   │   │   └── ProtectedRoute.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── DashboardLayout.tsx   # Sidebar + Header shell
│   │   │   │   │   ├── Sidebar.tsx           # Collapsible nav sidebar
│   │   │   │   │   └── Header.tsx            # Top bar: theme toggle, language, user
│   │   │   │   ├── overview/
│   │   │   │   │   └── Overview.tsx          # /dashboard — KPI cards + charts
│   │   │   │   ├── projects/
│   │   │   │   │   ├── ProjectsList.tsx      # /dashboard/projects
│   │   │   │   │   ├── ProjectDetail.tsx     # /dashboard/projects/:id
│   │   │   │   │   └── ProjectPace.tsx       # /dashboard/pace
│   │   │   │   ├── staff/
│   │   │   │   │   ├── Staff.tsx             # /dashboard/staff
│   │   │   │   │   └── StaffProfile.tsx      # /dashboard/staff/:id
│   │   │   │   ├── clients/
│   │   │   │   │   ├── Clients.tsx           # /dashboard/clients
│   │   │   │   │   └── ClientProfile.tsx     # /dashboard/clients/:id
│   │   │   │   ├── assignments/
│   │   │   │   │   └── Assignments.tsx       # /dashboard/assignments
│   │   │   │   ├── import/
│   │   │   │   │   └── ImportPage.tsx        # /dashboard/import
│   │   │   │   ├── estimation/
│   │   │   │   │   ├── Estimation.tsx        # /dashboard/estimation
│   │   │   │   │   └── historicalData.ts     # Static types + constants
│   │   │   │   ├── teambuilder/
│   │   │   │   │   └── TeamBuilder.tsx       # /dashboard/team-builder
│   │   │   │   ├── audit/
│   │   │   │   │   └── AuditLogs.tsx         # /dashboard/audit-logs (admin only)
│   │   │   │   └── profile/
│   │   │   │       └── AdminProfile.tsx      # /dashboard/profile
│   │   │   └── ui/
│   │   │       ├── DatePicker.tsx
│   │   │       ├── MonthPicker.tsx
│   │   │       └── Toaster.tsx
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── ThemeContext.tsx
│   │   │   ├── LanguageContext.tsx
│   │   │   └── ToastContext.tsx
│   │   └── services/
│   │       └── api.ts                        # Axios instance with token refresh interceptor
│   ├── package.json
│   ├── vite.config.ts                        # Proxy /api → http://localhost:5000
│   └── tsconfig.json
│
├── server/                             # Node.js + Express 5 backend (TypeScript)
│   ├── src/
│   │   ├── index.ts                    # Express app entry — DB connect, middleware, routes
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts       # protect() + authorize(...roles)
│   │   ├── models/
│   │   │   ├── Expert.ts               # Staff / users
│   │   │   ├── Project.ts              # Projects
│   │   │   ├── Client.ts               # Clients
│   │   │   ├── Affectation.ts          # Expert-Project assignments
│   │   │   ├── TimeEntry.ts            # Logged hours
│   │   │   ├── BillingEntry.ts         # Invoiced amount + real cost
│   │   │   ├── Leave.ts                # Leave requests
│   │   │   ├── AuditLog.ts             # Audit trail (TTL 365 days)
│   │   │   ├── EstimationProject.ts    # ML training data
│   │   │   ├── EstimationMeta.ts       # Retrain metadata
│   │   │   ├── ImportHistory.ts        # File import logs
│   │   │   ├── BlacklistedToken.ts     # Invalidated JWTs
│   │   │   └── LoginAttempt.ts         # Brute-force protection
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── projectController.ts
│   │   │   ├── staffController.ts
│   │   │   ├── clientController.ts
│   │   │   ├── affectationController.ts
│   │   │   ├── dashboardController.ts
│   │   │   ├── importController.ts
│   │   │   ├── leaveController.ts
│   │   │   ├── auditLogController.ts
│   │   │   ├── paceController.ts
│   │   │   ├── estimationController.ts
│   │   │   └── projectImportController.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── projectRoutes.ts
│   │   │   ├── staffRoutes.ts
│   │   │   ├── clientRoutes.ts
│   │   │   ├── affectationRoutes.ts
│   │   │   ├── dashboardRoutes.ts
│   │   │   ├── importRoutes.ts
│   │   │   ├── leaveRoutes.ts
│   │   │   ├── auditLogRoutes.ts
│   │   │   └── estimationRoutes.ts
│   │   └── utils/
│   │       ├── auditLogger.ts
│   │       ├── loadRecalculator.ts
│   │       ├── affectationSync.ts
│   │       ├── projectConsistency.ts
│   │       └── projectDataRepair.ts
│   ├── ml/                             # Python FastAPI ML microservice
│   │   ├── main.py                     # FastAPI server — /predict, /retrain, /health
│   │   ├── train.py                    # Model training pipeline
│   │   ├── preprocessing.py            # Feature engineering
│   │   ├── evaluate.py                 # Model validation metrics
│   │   ├── data/
│   │   │   ├── raw.xlsx                # Historical project data
│   │   │   └── processed.csv           # Cached feature-engineered dataset
│   │   ├── models/                     # Saved .pkl model artifacts
│   │   │   ├── scaler.pkl
│   │   │   ├── model_hours_q10.pkl     # 10th-percentile quantile regressor
│   │   │   ├── model_hours_q50.pkl     # Median quantile regressor
│   │   │   ├── model_hours_q90.pkl     # 90th-percentile quantile regressor
│   │   │   ├── model_cost.pkl          # Cost predictor
│   │   │   ├── knn.pkl                 # K-nearest neighbors (similar projects)
│   │   │   ├── feature_cols.pkl        # Feature column list
│   │   │   └── df_meta.pkl             # Metadata for similar project lookup
│   │   ├── requirements.txt
│   │   └── .venv311/
│   ├── uploads/
│   │   └── avatars/                    # Staff profile pictures
│   └── .env
```

---

## 3. Technology Stack

### Client (Frontend)

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.2.0 | UI framework |
| react-dom | 19.2.0 | DOM renderer |
| react-router-dom | 7.13.0 | Client-side routing |
| axios | 1.13.5 | HTTP client with interceptors |
| tailwindcss | 4.2.0 | Utility-first CSS |
| lucide-react | 0.575.0 | Icon library |
| recharts | 3.8.0 | Charts (line, bar, pie, area) |
| react-dropzone | 15.0.0 | Drag-and-drop file upload |
| vite | 7.3.1 | Build tool + dev server |
| typescript | 5.9.3 | Type safety |

### Server (Backend)

| Package | Version | Purpose |
|---------|---------|---------|
| express | 5.2.1 | HTTP framework |
| mongoose | 9.2.1 | MongoDB ODM |
| jsonwebtoken | 9.0.3 | JWT signing/verification |
| bcryptjs | 3.0.3 | Password hashing (salt rounds: 12) |
| multer | 2.1.1 | File upload middleware |
| nodemailer | 8.0.3 | SMTP email (password resets, alerts) |
| xlsx | 0.18.5 | Excel file parsing |
| cors | 2.8.6 | Cross-origin resource sharing |
| dotenv | 17.3.1 | Environment variable loading |
| typescript | 5.9.3 | Type safety |
| ts-node-dev | 2.0.0 | Dev server with hot reload |

### ML Microservice (Python)

| Package | Purpose |
|---------|---------|
| fastapi | REST API framework |
| uvicorn | ASGI server |
| scikit-learn | GradientBoostingRegressor, NearestNeighbors, StandardScaler |
| pandas | Data manipulation |
| openpyxl | Excel file reading |
| joblib | Model artifact serialization (.pkl) |

---

## 4. Environment Variables

### Server (`server/.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>
CLIENT_URL=http://localhost:5173
JWT_ACCESS_SECRET=<secret>             # Signs 8-hour access tokens
JWT_REFRESH_SECRET=<secret>            # Signs 7-day refresh tokens
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<email>
EMAIL_PASS=<password>
ML_API_URL=http://127.0.0.1:8000       # Python FastAPI microservice base URL
```

### Client (Vite)

No `.env` file needed in development. Vite proxies `/api` → `http://localhost:5000` via `vite.config.ts`.

---

## 5. Database Models

### Expert (`users` collection)

```typescript
{
  // Auth
  email:                  String (unique, sparse, lowercase)
  password:               String (bcrypt, select: false)
  resetPasswordToken:     String (select: false)
  resetPasswordExpires:   Date   (select: false)

  // Identity
  name:                   String (required)
  role:                   "admin" | "manager" | "collaborator" | "worker"
  level:                  "Junior" | "Mid" | "Senior" | "Partner"
  academicLevel:          String
  specializations:        String[]
  avatarUrl:              String

  // Financials
  coutHoraire:            Number  // hourly billing rate in TND

  // Workload
  currentLoad:            Number  // hours this active period
  totalHours:             Number  // lifetime hours logged

  // Burnout
  burnoutFlags: {
    flagged:   Boolean
    reasons:   String[]
    flaggedAt: Date
  }

  // HR
  cin:              String
  cnss:             String
  gender:           String
  dateOfBirth:      Date
  placeOfBirth:     String
  address:          String
  civilStatus:      String
  children:         Number
  hireDate:         Date
  contractType:     String
  contractEndDate:  Date
  department:       String
  positionCategory: String
  expStartDate:     Date

  // Timestamps (auto)
  createdAt: Date
  updatedAt: Date
}
// Index: { level: 1, currentLoad: -1 }
```

### Project (`projects` collection)

```typescript
{
  // Core
  name:        String (required)
  type:        String
  status:      "active" | "completed" | "on-hold" | "cancelled"
  startDate:   Date
  endDate:     Date

  // Client link
  clientId:    ObjectId (ref: Client)
  clientName:  String

  // Budget
  budgetHours:     Number
  budgetCost:      Number
  hoursConsumed:   Number  // sum of TimeEntry.hours
  costConsumed:    Number  // sum of TimeEntry.hours × expert.coutHoraire
  invoicedAmount:  Number  // sum of BillingEntry.invoicedAmount

  // Pace (recomputed by dashboardController on every stats call)
  paceIndexHours:  Number  // (hoursConsumed / budgetHours) / elapsedRatio
  paceIndexCost:   Number  // (costConsumed / budgetCost)  / elapsedRatio
  // elapsedRatio = clamp((now - startDate) / (endDate - startDate), 0.05, 1)
  // Both capped at 5

  // Profitability
  grossMargin:           Number  // invoicedAmount - costConsumed
  marginPercent:         Number  // grossMargin / invoicedAmount × 100
  effectiveCostPerHour:  Number  // costConsumed / hoursConsumed

  // Responsible partner
  responsiblePartnerId:    ObjectId (ref: Expert)
  responsiblePartnerName:  String

  // Assigned staff
  assignedStaff:     ObjectId[] (ref: Expert)
  collaboratorsRaw:  String  // pipe-separated names from Excel import

  // Alerts already sent
  alertsSent: [{
    threshold:  Number
    axis:       "hours" | "cost"
    sentAt:     Date
  }]

  // Import metadata
  externalId:         String
  segment:            String
  notes:              String
  validatedByManager: Boolean

  // Timestamps
  createdAt: Date
  updatedAt: Date
}
// Index: { status: 1, paceIndexHours: -1 }
```

### Client (`clients` collection)

```typescript
{
  // Core
  name:    String (required)
  sector:  String
  phone:   String
  email:   String
  address: String
  notes:   String

  // Excel import fields
  siret:          String
  espaceClient:   String  // portal URL
  espaceExtranet: String  // extranet URL
  formeJuridique: String  // legal structure
  tvaRegime:      String
  tvaDate:        Date
  dateCloture:    Date    // fiscal year closing date
  etat:           String  // active / inactive
  pays:           String
  assignedTo:     String  // internal responsible
  externalId:     String
  idGrpIntTeams:  String  // Microsoft Teams group ID

  createdAt: Date
  updatedAt: Date
}
// Index: { name: 1 }, { externalId: 1, sparse: true }
```

### Affectation (`affectations` collection)

```typescript
{
  expertId:    ObjectId (ref: Expert, required)
  expertName:  String (required)
  projectId:   ObjectId (ref: Project, required)
  projectName: String (required)
  clientName:  String
  externalId:  String
  type:        String  // project type (e.g., "Audit légal")
  status:      String  // "active" | "inactive"
  assignedAt:  Date

  createdAt: Date
  updatedAt: Date
}
// Unique index: { expertId: 1, projectId: 1 }
// Index: { projectId: 1 }, { expertId: 1 }
```

### TimeEntry (`timeEntries` collection)

```typescript
{
  expertId:          ObjectId (ref: Expert)
  expertName:        String
  projectId:         ObjectId (ref: Project)
  projectName:       String
  date:              Date
  hours:             Number
  validationStatus:  "pending" | "validated" | "rejected"
  importId:          ObjectId (ref: ImportHistory)

  createdAt: Date
  updatedAt: Date
}
// Index: { projectId: 1, date: -1 }, { expertId: 1, date: -1 }
```

### BillingEntry (`billingEntries` collection)

```typescript
{
  projectId:      ObjectId (ref: Project)
  projectName:    String
  invoicedAmount: Number
  realCost:       Number
  period:         String  // "YYYY-MM" or free text
  importId:       ObjectId (ref: ImportHistory)

  createdAt: Date
}
// Index: { projectId: 1, period: -1 }
```

### Leave (`leaves` collection)

```typescript
{
  expertId:   ObjectId (ref: Expert)
  expertName: String
  dateStart:  Date
  dateEnd:    Date
  days:       Number
  type:       "Annuel" | "Maladie" | "Exceptionnel"
  approved:   Boolean
  notes:      String
  importId:   ObjectId (ref: ImportHistory)

  createdAt: Date
}
// Index: { expertId: 1, dateStart: 1 }, { dateStart: 1, dateEnd: 1 }
```

### AuditLog (`auditlogs` collection)

```typescript
{
  userId:       ObjectId (ref: Expert, nullable)
  userName:     String
  userRole:     String
  action:       "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGIN_FAILED" |
                "LOGOUT" | "IMPORT" | "EXPORT" | "EMAIL_SENT" |
                "PASSWORD_RESET" | "PASSWORD_FORGOT"
  resource:     "project" | "client" | "expert" | "leave" | "timeEntry" |
                "auth" | "import" | "paceAlert"
  resourceId:   String
  resourceName: String
  description:  String
  changes: [{
    field:    String
    oldValue: Mixed
    newValue: Mixed
  }]
  ipAddress:  String
  userAgent:  String
  metadata:   Mixed
  createdAt:  Date
}
// TTL index: createdAt, expireAfterSeconds: 31536000 (365 days)
// Index: { action: 1 }, { resource: 1 }, { userId: 1 }, { createdAt: -1 }
```

### EstimationProject (`estimationProjects` collection)

```typescript
{
  projectId:       ObjectId (ref: Project, unique, sparse)  // null for imported rows
  client:          String
  type:            String   // mission type
  budgetHT:        Number
  hBudget:         Number   // estimated hours
  hReal:           Number   // actual hours
  coutReel:        Number   // actual cost
  marge:           Number   // margin in TND
  rentPct:         Number   // margin %
  overBudget:      Boolean
  sector:          String
  complexity:      "Faible" | "Moyenne" | "Élevée" | "Critique"
  collabPrincipal: String   // responsible partner name
  source:          "project" | "upload"

  createdAt: Date
  updatedAt: Date
}
// Index: { projectId: 1 sparse }, { type: 1 }, { sector: 1 }, { complexity: 1 }
```

### EstimationMeta

```typescript
{
  completedSinceRetrain: Number  // triggers auto-retrain at 10
  lastRetrainedAt:       Date
}
// Single document, upserted
```

### ImportHistory (`importhistories` collection)

```typescript
{
  date:         Date
  userId:       ObjectId (ref: Expert)
  userName:     String
  fileName:     String
  fileType:     "timesheets" | "billing" | "leave"
  recordCount:  Number
  importErrors: String[]
  status:       "success" | "partial" | "failed"

  createdAt: Date
}
```

### BlacklistedToken (auto-deletes on `expiresAt`)

```typescript
{
  token:     String (unique)
  expiresAt: Date  // TTL index — document deleted when reached
}
```

### LoginAttempt (auto-deletes 15 min after last attempt)

```typescript
{
  email:       String (unique)
  count:       Number   // resets on successful login
  lockedUntil: Date | null
  updatedAt:   Date     // TTL base
}
// Lock logic: count >= 5 → lockedUntil = now + 15 min
```

---

## 6. API Routes

### Auth (`/api/auth`)

| Method | Path | Protected | Roles | Description |
|--------|------|-----------|-------|-------------|
| POST | `/login` | No | — | `{email, password}` → `{accessToken, refreshToken, user}` |
| POST | `/refresh` | No | — | `{refreshToken}` → `{accessToken}` |
| POST | `/logout` | Bearer | any | Blacklist refreshToken, clear session |
| GET | `/me` | Bearer | any | Return current user object |
| POST | `/forgot-password` | No | — | Send password-reset email (1h token) |
| POST | `/reset-password/:token` | No | — | Validate token, update hashed password |

### Dashboard (`/api/dashboard`)

| Method | Path | Protected | Description |
|--------|------|-----------|-------------|
| GET | `/stats` | Bearer | Recompute + return all KPIs, charts data, alerts |

### Projects (`/api/projects`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | any | List all with filters (status, overbudget, search) |
| GET | `/:id` | any | Full project detail |
| POST | `/` | admin, manager | Create project |
| PUT | `/:id` | admin, manager | Update project + audit diff |
| DELETE | `/:id` | admin | Delete project |
| GET | `/pace` | any | Pace report (projects near/over budget) |
| POST | `/pace/notify` | admin, manager | Send email alerts for flagged projects |
| POST | `/import` | admin, manager | Bulk import from Excel |
| POST | `/repair-data` | admin | Recompute all project metrics from raw data |

### Staff (`/api/staff`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | any | List all staff |
| GET | `/:id` | any | Full profile |
| POST | `/` | admin | Create staff (hashes password) |
| PUT | `/:id` | admin | Update staff |
| DELETE | `/:id` | admin | Delete staff |
| POST | `/:id/avatar` | admin, manager | Upload avatar image (500 KB max) |
| POST | `/recalculate-loads` | admin | Recompute currentLoad + totalHours from TimeEntries |

### Clients (`/api/clients`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | any | List all clients |
| GET | `/:id` | any | Client profile |
| POST | `/` | admin, manager | Create client |
| PUT | `/:id` | admin, manager | Update client |
| DELETE | `/:id` | admin | Delete client |
| POST | `/import` | admin, manager | Bulk import from Excel |

### Affectations (`/api/affectations`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | any | All assignments (filter by expertId or projectId) |
| GET | `/by-expert` | any | Grouped by expert |
| GET | `/by-project` | any | Grouped by project |
| POST | `/rebuild` | admin | Wipe and rebuild from TimeEntries |

### Leaves (`/api/leaves`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/` | any | List all leave requests |
| POST | `/` | admin, manager | Create leave entry |
| PUT | `/:id` | admin, manager | Update |
| DELETE | `/:id` | admin | Delete |

### Import (`/api/import`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | `/` | admin | Import Excel file (timesheets / billing / leave) |
| GET | `/history` | any | List all imports with status + errors |

### Audit Logs (`/api/audit-logs`) — Admin only

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Paginated list with filters (user, action, resource, date range) |
| GET | `/stats` | `{totalEvents, logins, imports, byAction}` |

### Estimations (`/api/estimations`)

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/historical` | any | All EstimationProject records |
| GET | `/collaborators-context` | any | `?projectType=X` → staff with rates + experience flag |
| POST | `/predict` | any | Run ML prediction (or local fallback) |
| POST | `/import` | admin | Upload Excel to extend training dataset |
| POST | `/retrain` | admin | Sync completed projects → retrain ML models |

---

## 7. Authentication & Session

### Token Strategy

- **Access Token:** JWT signed with `JWT_ACCESS_SECRET`, expires in **8 hours**
  - Payload: `{ id, role, email }`
  - Sent as `Authorization: Bearer <token>` on every protected request

- **Refresh Token:** JWT signed with `JWT_REFRESH_SECRET`, expires in **7 days**
  - Payload: `{ id, fp }` where `fp = SHA256(ip + user-agent)` (device fingerprint)
  - Stored in `sessionStorage` (tab-scoped, cleared on tab close)
  - Invalidated on logout via `BlacklistedToken` collection

### Axios Interceptor (`services/api.ts`)

1. Every request attaches `Authorization: Bearer <accessToken>`
2. On **401 response**: interceptor queues request, calls `POST /api/auth/refresh`
3. If refresh succeeds → replaces token, retries original request
4. If refresh fails → clear session, redirect to `/login`

### Login Flow

```
1. POST /api/auth/login { email, password }
2. Server checks LoginAttempt (max 5 fails / 15-min lock)
3. Fetch Expert by email; compare password with bcrypt
4. Generate accessToken + refreshToken
5. Log AuditLog: action=LOGIN
6. Return { accessToken, refreshToken, user } → stored in sessionStorage
```

### Logout Flow

```
1. POST /api/auth/logout { refreshToken }
2. Add refreshToken to BlacklistedToken
3. Clear sessionStorage
4. BroadcastChannel("auth") posts "LOGOUT" → other tabs redirect to /login
```

### Inactivity Timeout (client-side)

- **15 minutes** of no activity (mousemove, keydown, scroll, touchstart)
- On timeout: `sessionStorage.setItem("sessionExpiredReason", "inactivity")`, redirect to `/login`
- Login page reads reason and shows "Session expired due to inactivity" message

---

## 8. Frontend Pages & Components

### Route Map

| Route | Component | Auth | Notes |
|-------|-----------|------|-------|
| `/` | → `/login` | — | Redirect |
| `/login` | Login | No | Email + password |
| `/forgot-password` | ForgotPassword | No | |
| `/reset-password/:token` | ResetPassword | No | |
| `/dashboard` | Overview | Yes | KPI dashboard |
| `/dashboard/projects` | ProjectsList | Yes | |
| `/dashboard/projects/:id` | ProjectDetail | Yes | |
| `/dashboard/pace` | ProjectPace | Yes | |
| `/dashboard/staff` | Staff | Yes | |
| `/dashboard/staff/:id` | StaffProfile | Yes | |
| `/dashboard/clients` | Clients | Yes | |
| `/dashboard/clients/:id` | ClientProfile | Yes | |
| `/dashboard/assignments` | Assignments | Yes | |
| `/dashboard/import` | ImportPage | Yes | |
| `/dashboard/estimation` | Estimation | Yes | |
| `/dashboard/team-builder` | TeamBuilder | Yes | |
| `/dashboard/audit-logs` | AuditLogs | Yes | admin only |
| `/dashboard/profile` | AdminProfile | Yes | |

All dashboard routes are wrapped in `ProtectedRoute` and `DashboardLayout`. Pages are **lazy-loaded** with `React.lazy()` + `Suspense` to reduce initial bundle size.

### Overview (`/dashboard`)
- KPI cards: total projects, over-budget count, staff count, burnout flags
- Charts: top projects by pace index, project status breakdown (pie)
- Recent pace alerts table
- Data: `GET /api/dashboard/stats`

### Projects List (`/dashboard/projects`)
- Columns: name, client, type, status, budget hours/cost, pace index, margin %
- Filters: status, search by name, over-budget toggle
- Actions: create modal, edit modal, delete confirmation, view detail link
- Export to CSV/PDF

### Project Detail (`/dashboard/projects/:id`)
- Sections: budget progress bars (hours + cost), assigned staff, timeline, alert history
- Inline edit form for budget, dates, team, responsible partner
- Shows effective cost/hour and gross margin

### Project Pace (`/dashboard/pace`)
- Table of all active projects with pace index (hours + cost)
- Color coding: green < 0.8, yellow 0.8–1.0, orange 1.0–1.2, red > 1.2
- "Send alerts" button triggers email notifications to responsible partners

### Staff (`/dashboard/staff`)
- Grouped by role (admin, manager, collaborator, worker)
- Columns: avatar, name, level, specializations, current load, total hours, burnout badge
- Add / edit / delete modals
- Burnout flag indicator (flagged = red badge)

### Staff Profile (`/dashboard/staff/:id`)
- Full HR record display + edit
- Work stats: current load, total hours, active projects
- Specializations list

### Clients (`/dashboard/clients`) + Client Profile
- Standard CRUD table with search
- Profile: contact info + all legal/tax fields (SIRET, VAT regime, fiscal year closing, portal links, Teams group ID)

### Assignments (`/dashboard/assignments`)
- Expert × Project assignment matrix
- Shows all affectations grouped by expert and by project

### Import (`/dashboard/import`)
- Drag-and-drop file upload (react-dropzone)
- File type selector: timesheets / billing / leave
- Import history table with status and error details

### Estimation (`/dashboard/estimation`)
- **Left panel (inputs):** mission type, sector, complexity, staff mix counts (Junior/Mid/Manager), strict deadline toggle
- **Right panel (results):** hours range (min/likely/max), cost range, overrun risk %, avg margin %, similar projects table
- Calls `POST /api/estimations/predict` → ML microservice → returns `{hoursMin, hoursLikely, hoursMax, costMin, costMax, confidence, similarCount, similarProjects[]}`
- Falls back to local algorithm if ML is unreachable
- Admin controls: upload new Excel training data, trigger retrain
- Confidence levels: high (≥6 similar projects), medium (3–5), low (<3)

### Team Builder (`/dashboard/team-builder`)
- **Purpose:** Build a project team based on hourly rates (`coutHoraire`) and past experience with a given mission type
- **Mission type dropdown:** updates the experience badges live
- **Collaborator list (left):**
  - Search by name
  - Filter by level (All / Junior / Mid / Senior / Partner)
  - Filter by experience (All / Has exp. / New)
  - Each row: avatar initial, name, level badge, `coutHoraire` rate, experience badge (e.g., `3× exp.` or `new`)
  - Experience is derived from Affectation records — if expert worked on a project of the same `type`, they have experience
  - Click to select/deselect
- **Team panel (right):**
  - Stats: selected count, avg hourly rate, with/without experience count
  - Level breakdown with progress bars
  - Cost preview for 40/80/120/160h projects using `hours × avgRate × selectedCount`
  - Selected team list with individual remove buttons

### Audit Logs (`/dashboard/audit-logs`) — admin only
- Paginated table: user, action, resource, description, date/time
- Filters: user, action type, resource type, date range
- Detail modal: field-level diff (old → new values)

### Admin Profile (`/dashboard/profile`)
- View/edit logged-in user's own profile
- Change password form

---

## 9. React Context Providers

### AuthContext

**Provides:** `{ user, isLoading, login, logout }`

| Detail | Value |
|--------|-------|
| Token storage | `sessionStorage` (tab-isolated) |
| Inactivity timeout | 15 minutes |
| Auto-refresh | Axios interceptor on 401 |
| Cross-tab sync | `BroadcastChannel("auth")` |
| User shape | `{ id, name, email, role, level, avatarUrl }` |

### ThemeContext

**Provides:** `{ theme, toggleTheme }`

- Persisted in `localStorage`
- Sets `data-theme` attribute and `.dark` class on `<html>`
- Suppresses CSS transitions during switch (no flash)
- Values: `"light"` | `"dark"`

### LanguageContext

**Provides:** `{ lang, setLang, t(key) }`

- **559 translation keys** in English (en) and French (fr)
- Persisted in `localStorage`, defaults to `"fr"`
- Used via `t("nav.projects")`, `t("overview.totalProjects")`, etc.
- Fallback: returns English value if key missing in current lang

### ToastContext

**Provides:** `{ toasts, toast, dismiss }`

- `toast(message, type)` — types: `success | error | info | warning`
- Auto-dismisses after **4 seconds** (exit animation: 220ms)
- Rendered by `<Toaster />` component fixed at bottom-right

---

## 10. File Upload Handling

### Avatar Upload (`POST /api/staff/:id/avatar`)

- **Storage:** Multer `diskStorage` → `server/uploads/avatars/`
- **Filename:** `avatar-{timestamp}-{random}.{ext}`
- **Max size:** 500 KB
- **Allowed MIME:** `image/jpeg`, `image/png`, `image/webp`
- **Stored as:** URL path in `Expert.avatarUrl`
- **Served at:** `GET /uploads/avatars/<filename>` (Express static)

### Excel Imports (memory, never touches disk)

| Endpoint | Multer | Parsed by | Creates |
|----------|--------|-----------|---------|
| `POST /api/import` | memoryStorage | XLSX.js | TimeEntry / BillingEntry / Leave |
| `POST /api/clients/import` | memoryStorage | XLSX.js | Client |
| `POST /api/projects/import` | memoryStorage | XLSX.js | Project |
| `POST /api/estimations/import` | memoryStorage | XLSX.js | EstimationProject |

All imports log to `ImportHistory` with `status: success | partial | failed` and any row-level errors.

---

## 11. Excel Import Formats

### Timesheets

| Column | Type | Notes |
|--------|------|-------|
| Expert Name | String | Must match existing Expert.name |
| Project Name | String | Must match existing Project.name |
| Date | Date | DD/MM/YYYY or Excel serial |
| Hours | Number | Decimal hours worked |

### Billing

| Column | Type | Notes |
|--------|------|-------|
| Project Name | String | |
| Period | String | "YYYY-MM" or free text |
| Invoiced Amount | Number | TND |
| Real Cost | Number | TND |

### Leave

| Column | Type | Notes |
|--------|------|-------|
| Expert Name | String | |
| Date Start | Date | |
| Date End | Date | |
| Days | Number | |
| Type | String | Annuel / Maladie / Exceptionnel |

### Clients (bulk import)

| Column | Notes |
|--------|-------|
| Nom (required) | Company name |
| Secteur | Industry sector |
| Téléphone | |
| Email | |
| Adresse | |
| SIRET | French business ID |
| Forme Juridique | SA, SARL, SAS, etc. |
| TVA Régime | |
| Date Clôture | Fiscal year closing |
| Pays | Country |
| ExternalId | Unique key for upserts |
| idGrpIntTeams | Teams group ID |

### Historical Estimation Data (ML training)

| Column | Notes |
|--------|-------|
| ID Projet | |
| Nom du Client | |
| Type de Mission | |
| Secteur d'Activité | |
| Heures Estimées | Budgeted hours |
| Heures Réelles | Actual hours |
| Budget Estimé (TND) | |
| Budget Réel (TND) | Actual cost |
| Durée (mois) | Project duration in months |
| Segment | TPE / PME / Grande Entreprise / etc. |
| Validé Par Manager | true/false |
| Noms Collaborateurs | Pipe-separated names |
| Statut | Must be "Terminé" to be included |
| Date Début | |
| Période de Contrat | Annuel / Mensuel / Trimestriel / etc. |

---

## 12. ML Microservice

**Location:** `server/ml/`
**Runtime:** Python 3.11 + FastAPI + uvicorn
**Port:** 8000 (internal, called only from Node.js)

### Endpoints

| Method | Path | Input | Output |
|--------|------|-------|--------|
| POST | `/predict` | `PredictRequest` | `PredictResponse` |
| POST | `/retrain` | Excel file (multipart) | `{status, rows_trained}` |
| GET | `/health` | — | `{status, models_loaded}` |

### PredictRequest

```python
{
  type_mission:    str   # e.g. "Audit légal"
  secteur:         str   # e.g. "Technologie & IT"
  complexity:      str   # "Faible" | "Moyenne" | "Élevée" | "Critique"
  nb_junior:       int
  nb_senior:       int   # mid-level
  nb_manager:      int   # senior/partner
  strict_deadline: bool
}
```

### PredictResponse

```python
{
  hours_min:        float  # 10th-percentile prediction
  hours_likely:     float  # median prediction
  hours_max:        float  # 90th-percentile prediction
  cost_min:         float
  cost_max:         float
  overrun_rate:     float  # % of similar projects that went over budget
  avg_margin_pct:   float
  confidence:       "high" | "medium" | "low"
  nb_similar:       int
  similar_projects: list[SimilarProject]
}
```

### Model Architecture

| Model | Algorithm | Predicts |
|-------|-----------|---------|
| `model_hours_q10.pkl` | GradientBoostingRegressor (α=0.05) | Optimistic hours |
| `model_hours_q50.pkl` | GradientBoostingRegressor (α=0.50) | Most-likely hours |
| `model_hours_q90.pkl` | GradientBoostingRegressor (α=0.95) | Pessimistic hours |
| `model_cost.pkl` | GradientBoostingRegressor | Actual project cost |
| `knn.pkl` | NearestNeighbors (k=6, euclidean) | Find 5 most similar past projects |
| `scaler.pkl` | StandardScaler | Feature normalization |

### Feature Engineering (`preprocessing.py`)

**Numeric features:**
- `complexity_num` — 1 (Faible) → 4 (Critique)
- `nb_collaborateurs` — parsed from pipe-separated names
- `duration_months` — project duration
- `budget_est` — budgeted cost
- `hours_est` — estimated hours
- `hours_per_month` — hours / duration
- `budget_per_hour` — budget / hours
- `start_month` — 1–12
- `start_quarter` — 1–4
- `valide_manager` — 0 or 1

**Categorical (one-hot encoded):**
- `segment` — TPE, PME, Startup, Grande Entreprise, Multinationale, Association (6)
- `secteur` — 12 sectors
- `type_mission` — 13 mission types
- `periode_contrat` — Annuel, Mensuel, Trimestriel, Semestriel, Ponctuel (5)

**Data filtering:** Only `Statut = "Terminé"`, with valid hours + budget + type + sector. Outliers beyond 3σ removed.

### Auto-Retrain Trigger

When a project is marked `status = "completed"` on the backend:
1. `incrementCompletedAndMaybeRetrain(projectId)` is called
2. Counter `EstimationMeta.completedSinceRetrain` increments
3. At **10 new completions** → `syncFromCompletedProjects()` runs automatically:
   - Reads all completed projects
   - Builds training records (hReal, sector, type, complexity, margin, overBudget)
   - Upserts into `EstimationProject` collection
   - Resets counter + updates `lastRetrainedAt`

### Confidence Levels

| Level | Condition |
|-------|-----------|
| `high` | ≥ 30 similar projects in same type + sector |
| `medium` | ≥ 10 similar projects |
| `low` | < 10 similar projects |

---

## 13. Pace Monitoring & Alerts

### Pace Index Formula

```
elapsedRatio = clamp((now - startDate) / (endDate - startDate), 0.05, 1.0)
paceIndexHours = (hoursConsumed / budgetHours) / elapsedRatio
paceIndexCost  = (costConsumed  / budgetCost)  / elapsedRatio
Both values capped at 5.0 to prevent extreme outliers.
```

**Interpretation:**
- `< 0.8` — Under pace (ahead of schedule)
- `0.8–1.0` — On track
- `1.0–1.2` — Slightly over pace (yellow alert)
- `1.2–1.5` — Over pace (orange)
- `> 1.5` — Critical (red)

### Alert Thresholds

Alerts sent when pace index crosses: **50%, 75%, 90%, 110%**

Each alert is recorded in `Project.alertsSent[]` to avoid duplicate sends.

### Sending Alerts

`POST /api/projects/pace/notify`:
1. Find all active projects where `paceIndexHours > threshold` and alert not already sent
2. Send email via Nodemailer to responsible partner
3. Log in `AuditLog`: action=`EMAIL_SENT`, resource=`paceAlert`
4. Append to `Project.alertsSent[]`

---

## 14. Audit Logging

### What gets logged

| Action | Trigger |
|--------|---------|
| `LOGIN` | Successful login |
| `LOGIN_FAILED` | Failed login attempt |
| `LOGOUT` | Explicit logout |
| `CREATE` | Project, client, staff, leave created |
| `UPDATE` | Any resource updated (field diff included) |
| `DELETE` | Any resource deleted |
| `IMPORT` | Excel file import completed |
| `EMAIL_SENT` | Pace alert email sent |
| `PASSWORD_FORGOT` | /forgot-password requested |
| `PASSWORD_RESET` | /reset-password completed |

### Field Diff

`diffChanges(oldDoc, newDoc)` compares fields and returns `[{ field, oldValue, newValue }]`.
Excluded fields: `password`, `resetPasswordToken`, `resetPasswordExpires`, `__v`.

### Retention

TTL index: `createdAt` + `expireAfterSeconds: 31536000` (365 days). MongoDB auto-deletes old logs.

---

## 15. Utility Functions

### `auditLogger.ts` — `logAudit(req, opts)`

Fire-and-forget audit write. Never throws — errors only logged to `console.error`.

```typescript
logAudit(req, {
  action:       "UPDATE",
  resource:     "project",
  resourceId:   project._id,
  resourceName: project.name,
  description:  "Project budget updated",
  changes:      diffChanges(oldProject, updatedProject),
})
```

### `loadRecalculator.ts` — `recalculateAllLoads()`

1. Aggregates `TimeEntry.hours` grouped by `expertId`
2. Bulk-updates `Expert.currentLoad` and `Expert.totalHours`
3. Called after every timesheet import or explicitly via `POST /api/staff/recalculate-loads`

### `affectationSync.ts` — `rebuildAllAffectations()`

1. Deletes all existing `Affectation` records
2. Aggregates unique `(expertId, projectId)` pairs from `TimeEntry`
3. Recreates `Affectation` documents with project + client metadata
4. Called via `POST /api/affectations/rebuild`

### `projectDataRepair.ts` — `repairAllProjects()`

1. Fetches every project
2. Re-aggregates `TimeEntry` hours and `coutHoraire` per expert
3. Recomputes `costConsumed`, `paceIndexHours`, `paceIndexCost`, `grossMargin`, `marginPercent`, `effectiveCostPerHour`
4. Bulk-saves updated projects
5. Called via `POST /api/projects/repair-data`

---

## 16. Build & Deployment

### Development

```bash
# Frontend (port 5173)
cd client && npm run dev

# Backend (port 5000)
cd server && npm run dev

# ML microservice (port 8000)
cd server/ml && uvicorn main:app --reload --port 8000
```

### Production Build

```bash
# Client
cd client && npm run build   # → client/dist/

# Server
cd server && npm run build   # → server/dist/
node server/dist/index.js
```

### Vite Proxy (`vite.config.ts`)

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:5000',
    '/uploads': 'http://localhost:5000',
  }
}
```

### Typical Deployment Stack

| Layer | Technology |
|-------|-----------|
| Frontend hosting | CDN (Vercel, Netlify) or Nginx static |
| Backend server | Node.js on VPS / cloud (PM2 or Docker) |
| ML service | Python on same VPS (internal, not public) |
| Database | MongoDB Atlas (cloud) |
| Email | Gmail SMTP or SendGrid |
| File storage | Local `uploads/` or S3 |

### Key Design Decisions

1. **Session storage (not localStorage)** for tokens — tokens die when tab closes, preventing cross-tab session leakage
2. **Device fingerprint on refresh tokens** — IP + User-Agent hash prevents token theft on new device
3. **Fire-and-forget audit logging** — never blocks request flow, errors silently swallowed
4. **ML as a sidecar** — Node.js calls Python FastAPI on localhost; if ML is down, local statistical fallback runs in the browser
5. **Auto-retrain at 10 completions** — keeps the ML model fresh without manual intervention
6. **Pace index capped at 5** — prevents extreme outlier projects from distorting the dashboard view
7. **React.lazy() on all dashboard pages** — reduces initial JS bundle significantly (pages load on first navigation)
8. **BroadcastChannel for logout sync** — one logout in any tab immediately signs out all other tabs in the same origin

---

*End of specifications.*
