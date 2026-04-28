# Project Report — Admin Dashboard (B2A Resource & Project Management Platform)

---

## TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Models & Schemas](#4-database-models--schemas)
5. [Backend — API Routes & Controllers](#5-backend--api-routes--controllers)
6. [Frontend — Pages & Features](#6-frontend--pages--features)
7. [Machine Learning Microservice](#7-machine-learning-microservice)
8. [Authentication & Security](#8-authentication--security)
9. [Email Notifications & Cron Jobs](#9-email-notifications--cron-jobs)
10. [Data Import & Processing](#10-data-import--processing)
11. [Pace Index Calculation Logic](#11-pace-index-calculation-logic)
12. [Timesheet Parsing Logic](#12-timesheet-parsing-logic)
13. [Internationalization (i18n)](#13-internationalization-i18n)
14. [Order of Implementation](#14-order-of-implementation)
15. [Implementation Status](#15-implementation-status)

---

## 1. PROJECT OVERVIEW

**Project Name**: Admin Dashboard — B2A Resource & Project Management Platform
**Type**: Full-Stack Web Application with Machine Learning Integration
**Target Users**: Admins, Managers, and Collaborators at a consulting firm (B2A)

### Purpose

The platform centralizes the management of:
- Annual client budgets and hour allocations
- Collaborator timesheets and workload
- Project profitability and pace tracking
- ML-based project hour and cost estimation
- Staff HR records, leaves, and burnout monitoring
- Client relationship management
- Admin audit trails and import history

### Key Business Goals

- Track how many hours are consumed vs. allocated (internal and billed) per client per month
- Project end-of-year performance and flag clients at financial risk
- Reduce manual tracking by automating Excel imports and email reminders
- Use historical project data to give data-driven estimates for new projects

---

## 2. SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│   React 19 + Vite + TypeScript + Tailwind CSS           │
│   Port: 5173 (dev) / served from Express (prod)         │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP REST (Axios)
                        ▼
┌─────────────────────────────────────────────────────────┐
│              BACKEND — Node.js / Express                 │
│   TypeScript + Mongoose + JWT + Multer + Nodemailer      │
│   Port: 5000                                             │
│                                                          │
│   ┌────────────────────────────────────────────────┐     │
│   │  Spawns ML process on startup (child_process)   │     │
│   └──────────────────┬─────────────────────────────┘     │
└──────────────────────┼──────────────────────────────────┘
                        │ HTTP (localhost)
                        ▼
┌─────────────────────────────────────────────────────────┐
│              ML MICROSERVICE — FastAPI / Python          │
│   Scikit-learn + Pandas + NumPy + Uvicorn               │
│   Port: 8000                                             │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                    DATABASE                              │
│   MongoDB (Mongoose ODM)                                 │
│   15 collections                                         │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **ML as Child Process** — The Python FastAPI ML server is spawned directly by Node.js on startup using `child_process`. This keeps the ML tightly coupled to the backend lifecycle.
2. **Lazy-loaded React Routes** — All dashboard pages are code-split with `React.lazy()` to keep the initial bundle lightweight.
3. **Quantile Regression for Hours** — Instead of a single point estimate, the ML predicts q10, q50, and q90 for hours, providing a realistic confidence interval.
4. **Role-based Access Control** — JWT tokens carry role claims (admin, manager, collaborator, worker); the `authorize()` middleware gates every sensitive route.
5. **SPA Fallback** — Express is configured with a catch-all rewrite so React Router handles all frontend paths in production.

---

## 3. TECHNOLOGY STACK

### 3.1 Frontend

| Technology | Version | Role |
|---|---|---|
| React | 19.2.0 | UI framework |
| React Router | 7.13.0 | Client-side routing |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.3.1 | Build tool / dev server |
| Tailwind CSS | 4.2.0 | Utility-first styling |
| Recharts | 3.8.0 | Data visualization (charts) |
| Axios | 1.13.5 | HTTP client |
| React Dropzone | 15.0.0 | File upload UI |
| Lucide React | 0.575.0 | Icon library |

### 3.2 Backend

| Technology | Version | Role |
|---|---|---|
| Node.js | LTS | Runtime |
| Express | 5.2.1 | HTTP server / routing |
| TypeScript | 6.0.3 | Type safety |
| Mongoose | 9.2.1 | MongoDB ODM |
| bcryptjs | 3.0.3 | Password hashing |
| jsonwebtoken | 9.0.3 | JWT authentication |
| Multer | 2.1.1 | Multipart file upload |
| XLSX | 0.18.5 | Excel file parsing |
| Nodemailer | 8.0.3 | Email notifications |
| dotenv | 17.3.1 | Environment config |
| CORS | 2.8.6 | Cross-origin policy |

### 3.3 Machine Learning (Python)

| Technology | Version | Role |
|---|---|---|
| FastAPI | 0.115.0 | REST API for ML |
| Uvicorn | 0.30.6 | ASGI server |
| Scikit-learn | 1.6.1 | ML model training |
| Pandas | 2.2.3 | Data manipulation |
| NumPy | 2.2.5 | Numerical operations |
| Pydantic | 2.9.2 | Request/response validation |
| openpyxl | 3.1.5 | Excel I/O |

### 3.4 Infrastructure

| Technology | Role |
|---|---|
| MongoDB | Primary database |
| Node child_process | ML process management |
| Nodemailer + SMTP | Email delivery |
| Node-cron | Scheduled jobs |

---

## 4. DATABASE MODELS & SCHEMAS

### 4.1 Expert (users collection)

Represents a collaborator or admin user.

| Field | Type | Description |
|---|---|---|
| name | String | Full name |
| email | String | Login email (unique) |
| password | String | bcrypt hash (12 rounds) |
| role | Enum | admin / manager / collaborator / worker |
| level | String | Junior / Senior / Expert |
| cin | String | National ID |
| cnss | String | Social security number |
| gender | Enum | Homme / Femme |
| birthDate | Date | Date of birth |
| address | String | Home address |
| hireDate | Date | Contract start date |
| contractType | String | CDI / CDD / etc. |
| specializations | String[] | Areas of expertise |
| coutHoraire | Number | Hourly rate (TND) |
| currentLoad | Number | Current active hours |
| totalHours | Number | Total logged hours |
| flagged | Boolean | Burnout flag |
| flagReasons | String[] | Reasons for flag |
| flaggedAt | Date | When flag was set |

### 4.2 AnnualBudget

Represents the budget allocated to one client for one year.

| Field | Type | Description |
|---|---|---|
| year | Number | Budget year |
| clientName | String | Client name |
| primaryCollab | String | Main responsible collaborator |
| secondaryCollab | String | Backup collaborator |
| internalHours | Number | Hours/month budgeted internally (B2A) |
| clientHours | Number | Hours/month billed to client |
| financialBudget | Number | Total financial budget (TND) |

Unique index: `(year, clientName)`

### 4.3 Timesheet

Represents one collaborator's timesheet for one month.

| Field | Type | Description |
|---|---|---|
| collabId | ObjectId | Reference to Expert |
| collabName | String | Collaborator name |
| month | Number | 1–12 |
| year | Number | Calendar year |
| entries | ITimesheetEntry[] | Array of time entries |

**ITimesheetEntry sub-document:**

| Field | Type | Description |
|---|---|---|
| clientName | String | Parsed: everything before first `-` in Client/Affaire |
| mission | String | Parsed: everything after first `-` |
| prestation | String | Audit / Compta / Tax / etc. |
| date | Date | Work date |
| hours | Number | Hours consumed |
| detail | String | Optional note |

Unique index: `(collabId, month, year)`

### 4.4 Project

Represents an active or completed project/mission.

| Field | Type | Description |
|---|---|---|
| name | String | Project name |
| clientName | String | Client name |
| clientId | ObjectId | Reference to Client |
| type | String | Mission type |
| budgetHours | Number | Estimated hours budget |
| budgetCost | Number | Estimated cost budget |
| hoursConsumed | Number | Actual hours consumed |
| costConsumed | Number | Actual cost incurred |
| invoicedAmount | Number | Amount invoiced |
| paceIndexHours | Number | Hours pace ratio |
| paceIndexCost | Number | Cost pace ratio |
| grossMargin | Number | Profit in TND |
| marginPercent | Number | Profit percentage |
| status | Enum | active / completed / on-hold / cancelled |
| responsiblePartnerId | ObjectId | Reference to Expert |
| assignedStaff | ObjectId[] | References to Experts |
| externalId | String | Import key (for deduplication) |
| segment | String | Business segment |
| notes | String | Free-text notes |
| collaboratorsRaw | String | Raw collab string from Excel |

### 4.5 Affectation

Represents the assignment of an expert to a project.

| Field | Type | Description |
|---|---|---|
| expertId | ObjectId | Reference to Expert |
| expertName | String | Expert name |
| projectId | ObjectId | Reference to Project |
| projectName | String | Project name |
| clientName | String | Client name |
| type | String | Mission type |
| status | String | active / inactive |
| externalId | String | Import key |

Unique index: `(expertId, projectId)`

### 4.6 Client

Represents a firm client.

| Field | Type | Description |
|---|---|---|
| name | String | Client name |
| sector | String | Industry sector |
| phone | String | Contact phone |
| email | String | Contact email |
| address | String | Physical address |
| notes | String | Internal notes |
| SIRET | String | Business registration |
| vatRegime | String | VAT regime |
| legalForm | String | Legal structure |
| closureDate | Date | Fiscal year-end |
| assignedTo | ObjectId | Reference to Expert |
| idGrpIntTeams | String | Internal team group ID |

### 4.7 EstimationProject

Stores historical projects used for ML training and reference lookup.

| Field | Type | Description |
|---|---|---|
| client | String | Client name |
| type | String | Mission type |
| sector | String | Industry sector |
| complexity | Enum | Faible / Moyenne / Élevée / Critique |
| budgetHT | Number | Estimated budget (TND) |
| hBudget | Number | Estimated hours |
| hReal | Number | Actual hours |
| coutReel | Number | Actual cost |
| marge | Number | Profit (TND) |
| rentPct | Number | Profitability % |
| overBudget | Boolean | True if actual > estimated |
| source | Enum | project / upload |

### 4.8 AuditLog

Tracks every state-changing admin action.

| Field | Type | Description |
|---|---|---|
| userId | ObjectId | Who performed the action |
| userName | String | Display name |
| action | String | create / update / delete / import |
| resource | String | Collection affected |
| resourceId | ObjectId | Document affected |
| details | Object | Before/after snapshot |
| ip | String | Request IP address |
| createdAt | Date | Timestamp |

### 4.9 ImportHistory

Logs every file import attempt.

| Field | Type | Description |
|---|---|---|
| userId | ObjectId | Who imported |
| userName | String | Display name |
| fileName | String | Original file name |
| fileType | String | projects / budgets / timesheets / clients |
| recordCount | Number | Rows processed |
| importErrors | String[] | Row-level error messages |
| status | Enum | success / partial / failed |
| createdAt | Date | Timestamp |

### 4.10 Other Models

| Model | Purpose |
|---|---|
| Leave | Time-off requests (collab, dates, type, status) |
| LoginAttempt | Tracks failed login attempts per IP |
| BlacklistedToken | Revoked JWT tokens (for secure logout) |
| BillingEntry | Invoice line items per project |
| TimeEntry | Individual daily time log entries |
| EstimationMeta | ML model metadata (training date, version, metrics) |

---

## 5. BACKEND — API ROUTES & CONTROLLERS

### 5.1 Authentication (`/api/auth`)

| Method | Path | Description |
|---|---|---|
| POST | /login | User login, returns JWT + refresh token |
| POST | /refresh | Refresh expired access token |
| POST | /logout | Blacklist current token |
| POST | /forgot-password | Generate and email password reset link |
| POST | /reset-password/:token | Set new password via token |
| GET | /me | Current authenticated user profile |

### 5.2 Annual Budget (`/api/budget`)

| Method | Path | Description |
|---|---|---|
| POST | /import | Upload and parse `liste des budgets.xlsx`, upsert to DB |
| GET | /:year | Get all client budgets for a given year |
| GET | /:year/:clientName | Get single client's budget details |

### 5.3 Timesheets (`/api/timesheets`)

| Method | Path | Description |
|---|---|---|
| POST | /upload | Upload Excel timesheet for a collab (multipart) |
| GET | /:year/:month | All timesheets for a given month |
| GET | /:year/:month/:collabId | Specific collab's timesheet |
| GET | /client/:clientName/:year | Hours consumed by client across all months |
| GET | /status/:year/:month | Which collabs have/haven't submitted |
| DELETE | /:id | Remove a timesheet record |

### 5.4 Pace Index (`/api/pace-index`)

| Method | Path | Description |
|---|---|---|
| GET | /overview/:year | All clients' pace metrics for a year (summary) |
| GET | /:year/:clientName | Full monthly breakdown + projections for one client |

### 5.5 Projects (`/api/projects`)

| Method | Path | Description |
|---|---|---|
| GET | / | List all projects |
| POST | /import | Bulk import projects from Excel |
| GET | /pace | Pace index report across all projects |
| POST | /pace/notify | Trigger pace alert emails |

### 5.6 Staff / Experts (`/api/staff`)

| Method | Path | Description |
|---|---|---|
| GET | / | List all collaborators |
| POST | / | Create new expert record |
| GET | /:id | Expert details |
| PUT | /:id | Update expert profile |

### 5.7 Clients (`/api/clients`)

| Method | Path | Description |
|---|---|---|
| GET | / | List all clients |
| POST | / | Create new client |
| GET | /:id | Client detail |
| POST | /import | Import clients from Excel |

### 5.8 Affectations (`/api/affectations`)

| Method | Path | Description |
|---|---|---|
| GET | / | All affectations |
| GET | /by-expert | Filter by expert ID |
| GET | /by-project | Filter by project ID |
| POST | /rebuild | Recalculate from timesheet data |

### 5.9 Estimation — ML (`/api/estimations`)

| Method | Path | Description |
|---|---|---|
| GET | /historical | List past projects for reference |
| GET | /collaborators-context | Available resources / expert pool |
| POST | /predict | Predict hours + cost for new project |
| POST | /import | Import historical project data for training |
| POST | /retrain | Merge new data and retrain all ML models |

### 5.10 Dashboard (`/api/dashboard`)

| Method | Path | Description |
|---|---|---|
| GET | /stats | High-level overview KPIs |
| GET | /notifications | Active alerts (missing timesheets, over-pace clients) |
| GET | /budget-stats/:year | Budget performance metrics by year |

### 5.11 Notifications (`/api/notifications`)

| Method | Path | Description |
|---|---|---|
| POST | /timesheet-reminder | Manually trigger timesheet reminder email |
| POST | /pace-alert | Notify admins of pace breach |

### 5.12 Admin (`/api/audit-logs`, `/api/import`)

| Method | Path | Description |
|---|---|---|
| GET | /audit-logs | Paginated action history |
| POST | /import | General file import endpoint |
| GET | /import/history | Import log listing |

---

## 6. FRONTEND — PAGES & FEATURES

### Routes Map

| Route | Component | Description |
|---|---|---|
| /login | LoginPage | Email + password login |
| /forgot-password | ForgotPasswordPage | Request reset link |
| /reset-password/:token | ResetPasswordPage | New password form |
| /dashboard | Overview | Executive summary |
| /dashboard/projects | ProjectsList | Annual budget client list |
| /dashboard/projects/:id | ProjectDetail | Client detail: missions, pace, financials |
| /dashboard/staff | StaffList | Collaborator directory |
| /dashboard/staff/:id | StaffProfile | Individual HR + workload |
| /dashboard/assignments | Assignments | Affectation matrix + workload views |
| /dashboard/timesheets | Timesheets | Upload and review timesheets |
| /dashboard/clients | ClientsList | Client directory |
| /dashboard/clients/:id | ClientDetail | Client profile + history |
| /dashboard/estimation | EstimationPage | ML-based project estimation tool |
| /dashboard/import | ImportPage | Excel import wizard |
| /dashboard/audit-logs | AuditLogs | Admin action history |
| /dashboard/profile | Profile | Admin user settings |
| /dashboard/team-builder | TeamBuilder | Team composition tool |

All dashboard routes are protected by authentication. All lazy-loaded for performance.

---

### 6.1 Overview Page

**Purpose**: Executive summary of the current state of the firm.

**Sections**:
- **Annual Budget Summary**: Current year, total active clients, total internal hours budget vs. consumed YTD, total client billed hours vs. consumed YTD, overall profit/gain YTD
- **Pace Index Overview**: Overall health indicator (green/yellow/red), year-end projection status, best-performing client (most gain), worst-performing client (most loss/risk)
- **Current Month Snapshot**: Month progress bar, total hours consumed this month across all clients, timesheets received vs. pending (which collabs have not submitted), alert count for missing timesheets
- **Collab Overview**: Total active collabs this month, most loaded / least loaded collab, total hours logged this month
- **Alerts & Notifications Panel**: Missing timesheet uploads, clients approaching internal hours limit, clients in danger zone (close to exceeding client hours)

---

### 6.2 Projects Section (Annual Budget)

**Purpose**: Track all client engagements and their budget consumption.

#### Budget List Page (`/dashboard/projects`)

Each client card shows:
- Client name, primary & secondary collab
- Internal hours/month vs. client hours/month
- Financial budget value
- Current health status (green/yellow/red badge)
- Quick pace index preview

#### Client Detail Page (`/dashboard/projects/:id`)

**Missions Tab**
- All missions performed for this client
- Per mission: mission name, prestation type, total hours consumed
- Per collab within a mission: collab name, date worked, hours worked
- Cumulative hours per collab on that mission

**Pace Index Tab**
- Past months card: consumed vs. internal vs. client hours, status badge, gain/loss, running total
- Current month card: hours so far, progress bar vs. internal & client budget, projected end-of-month, alert if trending over
- Future months card: projected hours, predicted status, expected gain/loss
- Top summary bar: overall pace score, YTD gain/loss, year-end projection, health indicator
- Notification button: manually trigger timesheet reminder email for this client

**Financial Tab**
- Total billed to client YTD
- Total actual cost (consumed hours × collab hourly rate)
- Profit margin and margin percentage

---

### 6.3 Assignments Section (Affectation)

**Purpose**: Visualize and manage workload distribution across all collaborators and clients.

**Views**:

**Matrix View**
- Grid: rows = collabs, columns = clients/missions
- Cells = hours worked by that collab on that client/mission for selected month
- Color-coded by workload intensity
- Row totals (collab total hours), column totals (client total hours)

**Workload View**
- Visual workload bar per collab
- Flag overloaded or underutilized collabs

**Heatmap**
- Across months of the year: intensity of work per collab per client
- Spot seasonal patterns

**Collab Profile Card**
- Click a collab → see all missions across all clients for selected month
- Hours per day breakdown

**Distribution Chart**
- Pie/bar chart: how each collab's time is distributed across clients

**Month Navigator**
- Flip between months to compare affectations over time

---

### 6.4 Timesheets Section

**Purpose**: Upload, review, and manage collaborator timesheets.

**Timesheet Upload**
- Select collab from dropdown
- Upload their Excel timesheet file
- Preview parsed data before confirming
- Validation: flag unusual entries (missing dates, zero hours, etc.)

**Individual Timesheet View**
- Calendar-style view of the month
- Days worked highlighted, hours per day, client/mission per day
- Per-entry detail: date, client, mission, prestation, hours, notes
- Monthly summary: total hours, breakdown per client, breakdown per mission
- Status: flag missing days, unusual hours, total vs. contracted hours

**Admin Controls**
- Upload / edit / correct / approve timesheets per collab
- Export to PDF or Excel
- Navigate between months (history)
- Alert if collab timesheet not submitted by month-end

---

### 6.5 Estimation Page

**Purpose**: Data-driven project hour and cost estimation for new engagements.

**Inputs**:
- Client, sector, mission type, complexity (Faible / Moyenne / Élevée / Critique)
- Estimated budget (TND), estimated hours, team size, duration, start month

**Outputs**:
- Hours range: min (q10), likely (q50), max (q90)
- Cost range: min / max
- Overrun rate: % of similar projects that went over budget
- Average margin %
- 5 similar historical projects with details (actual vs. estimated hours, margin, over-budget flag)
- Confidence level: high / medium / low (based on pool size)

**Retrain Button**: Admin can upload new historical project data and trigger model retraining directly from the UI.

---

### 6.6 Import Page

**Purpose**: Excel data import wizard for bulk data loading.

**Import Types**:
- Projects (`externalId`-based deduplication, upsert)
- Annual Budgets (by year + client name)
- Timesheets (per collab, per month)
- Clients (name-based deduplication)

**Features**:
- Drag-and-drop file upload
- Row-by-row validation and error reporting
- Partial success: imported N / M rows, show failed rows
- Import history log

---

### 6.7 Staff Section

**Purpose**: HR management for all collaborators.

**Staff List**
- Directory of all experts with role, level, and specializations
- Burnout flag indicator

**Staff Profile**
- Full HR details: personal info, contract, hire date
- Current workload, total hours YTD
- Assigned projects and clients this month
- Leave history

---

### 6.8 Audit Logs Page

**Purpose**: Full traceability of admin actions.

- Paginated table of all create/update/delete/import events
- Filter by user, action type, resource type, date range
- Each entry: who, what, on which record, and when

---

## 7. MACHINE LEARNING MICROSERVICE

### Overview

A Python FastAPI service spawned as a child process by the Node.js backend on startup. It provides ML-based project estimation and supports retraining on new data.

**Startup**: Node calls `uvicorn main:app --host 0.0.0.0 --port 8000` via `child_process.spawn`.
**Model storage**: pickle files in `server/ml/models/`
**Training data**: `server/ml/data/processed.csv`

### 7.1 Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /predict | Predict hours and cost for a new project |
| POST | /retrain | Merge new Excel data and retrain all models |
| GET | /health | Service health check |

### 7.2 Prediction Request (PredictRequest)

```json
{
  "client": "string",
  "sector": "string",
  "type": "string",
  "complexity": "Faible | Moyenne | Élevée | Critique",
  "budgetHT": 0,
  "hBudget": 0,
  "teamSize": 0,
  "durationMonths": 0,
  "startMonth": 0
}
```

### 7.3 Prediction Response (PredictResponse)

```json
{
  "hours_min": 0,
  "hours_likely": 0,
  "hours_max": 0,
  "cost_min": 0,
  "cost_max": 0,
  "overrun_rate": 0.0,
  "avg_margin_pct": 0.0,
  "confidence": "high | medium | low",
  "similar_projects": [
    {
      "client": "string",
      "sector": "string",
      "type": "string",
      "hBudget": 0,
      "hReal": 0,
      "marginPercent": 0,
      "overBudget": false
    }
  ]
}
```

### 7.4 Models Trained

| Model | Algorithm | Target |
|---|---|---|
| hours_q10 | GradientBoostingRegressor (alpha=0.05) | Hours — minimum estimate |
| hours_q50 | GradientBoostingRegressor (alpha=0.50) | Hours — median / likely |
| hours_q90 | GradientBoostingRegressor (alpha=0.95) | Hours — maximum estimate |
| model_cost | GradientBoostingRegressor | Budget Réel (actual cost, TND) |
| knn | KNeighborsRegressor (k=6) | Similar project lookup (5 closest) |
| scaler | StandardScaler | Feature normalization |

### 7.5 Feature Engineering

**Categorical features** (one-hot encoded):
- Complexity (Faible / Moyenne / Élevée / Critique)
- Segment, Secteur, Type de Mission, Période Contrat

**Numeric features** (scaled):
- Budget estimate (TND), hours estimate, team size, duration, start month, start quarter

**Training data**:
- Only completed projects (`Statut == "Terminé"`)
- Outliers removed (>3 standard deviations from mean)
- 85/15 train/test split

### 7.6 Model Evaluation Metrics

| Metric | Description |
|---|---|
| MAE | Mean Absolute Error |
| MAPE | Mean Absolute Percentage Error |
| R² | Coefficient of determination |
| Coverage | % of test points between q10 and q90 |

---

## 8. AUTHENTICATION & SECURITY

### Authentication Flow

1. User submits email + password to `POST /api/auth/login`
2. Server validates credentials against bcrypt hash (12 salt rounds)
3. Server returns short-lived JWT access token + refresh token
4. Client stores tokens; Axios attaches `Authorization: Bearer <token>` header on every request
5. On expiry, client calls `POST /api/auth/refresh`
6. On logout, access token is added to `BlacklistedToken` collection

### Authorization

- Route-level middleware: `protect` validates JWT
- Resource-level middleware: `authorize("admin", "manager")` checks role claim
- Roles: `admin` > `manager` > `collaborator` > `worker`

### Security Measures

| Measure | Implementation |
|---|---|
| Password hashing | bcryptjs, 12 salt rounds |
| Token invalidation | BlacklistedToken MongoDB collection |
| Login throttling | LoginAttempt model tracks failed attempts |
| Rate limiting | Applied to `/forgot-password` endpoint |
| Audit logging | All state-changing operations logged |
| Input validation | Mongoose schema validation + Pydantic (ML) |
| CORS | Restricted to known origins |

---

## 9. EMAIL NOTIFICATIONS & CRON JOBS

### Monthly Timesheet Reminder (Automated)

- **Schedule**: Last day of each month at 09:00
- **Logic**: Check which collaborators have not yet had timesheets uploaded for the current month
- **Action**: Send email to all admins listing missing collaborators
- **Technology**: `node-cron` scheduler + Nodemailer

### Manual Triggers

| Trigger | Description |
|---|---|
| Notification button (Pace Index tab) | Manually send timesheet reminder for one client |
| `POST /api/notifications/timesheet-reminder` | API endpoint for manual trigger |
| `POST /api/notifications/pace-alert` | Notify admins of pace breach for a client |

### Email Configuration

- SMTP via Nodemailer
- Environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

---

## 10. DATA IMPORT & PROCESSING

### Supported File Formats

- `.xlsx` and `.xls` (parsed with the XLSX library)

### Import Types & Logic

#### Projects Import
- Column detection tolerates different header naming conventions
- Deduplication key: `externalId`
- On match: upsert (update existing record)
- On no match: insert new project
- Expert assignment: pre-loaded expert list is matched against `collaboratorsRaw` per row
- Error handling: per-row errors collected, import continues; final status is `success`, `partial`, or `failed`

#### Annual Budget Import
- File: `liste des budgets.xlsx`
- Deduplication key: `(year, clientName)`
- Upsert semantics

#### Timesheet Import
- Admin selects collaborator at upload time (not from file)
- Month/Year derived from the `Date` column
- Client name parsed: everything before the first `-` in the `Client/Affaire` column
- Mission parsed: everything after the first `-`
- Deduplication key: `(collabId, month, year)` — re-upload replaces existing

#### Client Import
- Name-based deduplication
- Maps Excel columns to Client schema fields

### Post-Import Actions

- Expert `currentLoad` recalculated from timesheet data
- Affectations rebuilt from project assignments
- Import event logged to `ImportHistory`
- Audit log entry created

---

## 11. PACE INDEX CALCULATION LOGIC

### Per-Month Formula

```
internal_gain = internalHours - consumedHours
  → positive = hours saved, negative = overrun

client_gain = clientHours - consumedHours
  → positive = billable profit, negative = billable loss

pace = consumedHours / internalHours
  → < 1 : under pace (good)
  → = 1 : on track
  → > 1 : over pace (bad)
```

### Current Month Projection

```
expectedByNow = (daysElapsed / totalWorkingDays) × internalHours
Compare actualConsumed with expectedByNow
→ if actualConsumed >> expectedByNow: alert
```

### Future Months Projection

```
avgPace = mean(pace values of elapsed months)
projectedConsumption = avgPace × internalHours  (per future month)
```

### Health Indicator

| Status | Condition | Color |
|---|---|---|
| On track | consumed ≤ internalHours | Green |
| Warning | consumed > internalHours AND consumed ≤ clientHours | Yellow |
| Over budget | consumed > clientHours | Red |

### Pace Index API Response (`GET /api/pace-index/:year/:clientName`)

```json
{
  "clientName": "string",
  "year": 2025,
  "internalHours": 0,
  "clientHours": 0,
  "months": [
    {
      "month": 1,
      "status": "past | current | future",
      "consumedHours": 0,
      "internalGain": 0,
      "clientGain": 0,
      "pace": 0,
      "healthIndicator": "green | yellow | red",
      "projected": false,
      "projectedConsumption": 0
    }
  ],
  "ytdSummary": {
    "totalConsumed": 0,
    "totalInternalGain": 0,
    "totalClientGain": 0,
    "overallHealth": "green | yellow | red",
    "yearEndProjection": 0
  }
}
```

---

## 12. TIMESHEET PARSING LOGIC

### Excel Column Mapping

| Excel Column | Mapped Field | Parsing Rule |
|---|---|---|
| Client/Affaire | clientName + mission | clientName = before first `-`; mission = after first `-` |
| Prestation | prestation | Direct string |
| Date | date | Parsed to JavaScript Date |
| Consommé | hours | Handle both number and string formats |
| Détail | detail | Optional free-text |
| *(selected at upload)* | collabId + collabName | Not from file; provided by admin |
| *(derived from Date)* | month + year | Extracted from date values |

### Validation Rules

- Skip rows with missing or zero hours
- Flag entries where hours > 24 for a single day
- Flag entries with unrecognized date formats
- Flag entries missing the `-` separator in `Client/Affaire`
- Total hours per collab per month are verified against contracted hours

---

## 13. INTERNATIONALIZATION (i18n)

The application supports multiple languages via a React `LanguageContext`.

- Language context: `client/src/context/LanguageContext.tsx`
- Supported languages: French (default), English, Arabic
- Language toggle available in the top-right Header component
- All UI labels, status messages, and navigation items are driven by the active language

---

## 14. ORDER OF IMPLEMENTATION

| Step | Task |
|---|---|
| 1 | Database models: AnnualBudget, Timesheet |
| 2 | Backend: Budget import & GET API |
| 3 | Backend: Timesheet upload, parsing & API |
| 4 | Backend: Pace index calculation API |
| 5 | Backend: Email notification cron job |
| 6 | Frontend: Projects section — budget list + client detail |
| 7 | Frontend: Timesheets section |
| 8 | Frontend: Affectation section redesign |
| 9 | Frontend: Overview section update |
| 10 | ML: Feature engineering and model training |
| 11 | ML: FastAPI prediction and retrain endpoints |
| 12 | Frontend: Estimation page |
| 13 | Frontend: Import wizard |
| 14 | Authentication: JWT, refresh, logout, password reset |
| 15 | Admin: Audit logs, import history |
| 16 | Internationalization (i18n) |
| 17 | Production build: SPA fallback, env config |

---

## 15. IMPLEMENTATION STATUS

### Backend

| Feature | Status |
|---|---|
| Authentication (login, refresh, logout, reset) | Done |
| Annual Budget import & API | Done |
| Timesheet upload, parsing & API | Done |
| Pace Index calculation API | Done |
| Projects import & API | Done |
| Affectations rebuild from timesheets | Done |
| Client import & API | Done |
| Staff (Expert) CRUD | Done |
| Dashboard stats API | Done |
| Email notification cron job | Done |
| Audit logging middleware | Done |
| Import history logging | Done |
| Expert load pre-computation (performance) | Done |

### Machine Learning

| Feature | Status |
|---|---|
| Data preprocessing pipeline | Done |
| Hours quantile regression (q10/q50/q90) | Done |
| Cost prediction model | Done |
| Similar projects KNN | Done |
| Model evaluation metrics | Done |
| FastAPI /predict endpoint | Done |
| FastAPI /retrain endpoint | Done |
| Node.js child process spawn | Done |

### Frontend

| Feature | Status |
|---|---|
| Login / forgot password / reset password | Done |
| Dashboard Overview | Done |
| Projects list + client detail (missions, pace, financial tabs) | Done |
| Assignments matrix + workload views | Done |
| Timesheets upload + review | Done |
| Estimation page | Done |
| Import wizard (projects, budgets, timesheets, clients) | Done |
| Staff list + profiles | Done |
| Client list + profiles | Done |
| Audit logs page | Done |
| Internationalization (FR / EN / AR) | Done |
| Sidebar navigation | Done |
| Header with language toggle | Done |
| SPA fallback for React Router | Done |
