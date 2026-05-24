# B2A Smart-Resource

A full-stack resource management platform for B2A, a Tunisian accounting and consulting firm. Replaces manually maintained Excel spreadsheets with a unified, role-based web application covering staff, clients, projects, timesheets, budgets, and ML-powered estimation.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Authentication & Security](#authentication--security)
5. [Data Models](#data-models)
6. [Known Issues](#known-issues)
7. [Environment Variables](#environment-variables)
8. [Running the Project](#running-the-project)

---

## Tech Stack

### Frontend

| Package | Version | Role |
|---|---|---|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.3.1 | Build tool and dev server |
| Tailwind CSS | 4.2.0 | Utility-first styling |
| React Router DOM | 7.13.0 | Client-side routing with lazy loading |
| Axios | 1.13.5 | HTTP client with JWT interceptors |
| Recharts | 3.8.0 | Charts (bar, pie, area) |
| lucide-react | 0.575.0 | SVG icon library |
| react-dropzone | 15.0.0 | Drag-and-drop file upload zones |

### Backend

| Package | Version | Role |
|---|---|---|
| Node.js | 20 | Runtime |
| Express | 5.2.1 | REST API framework |
| TypeScript | 6.0.3 | Type safety |
| Mongoose | 9.2.1 | MongoDB ODM with schema validation |
| jsonwebtoken | 9.0.3 | JWT signing and verification |
| bcryptjs | 3.0.3 | Password hashing (cost factor 12) |
| multer | 2.1.1 | File upload handling (avatars, Excel files) |
| nodemailer | 8.0.3 | Email relay via Gmail SMTP |
| xlsx (SheetJS) | 0.18.5 | In-memory Excel parsing and generation |
| archiver | 7.0.1 | ZIP file streaming to browser |
| dotenv | 17.3.1 | Environment variable loading |

### ML Microservice

| Technology | Role |
|---|---|
| Python 3.11.9 | Runtime |
| FastAPI | HTTP layer exposing `/predict`, `/retrain`, `/health` |
| scikit-learn | Gradient Boosting regression models + KNN |
| pandas | Training pipeline and feature engineering |
| joblib | Atomic model file save/load |
| openpyxl | Reading the historical estimation Excel dataset |
| seed_and_train.py | CLI script: seeds `processed.csv` from `raw.xlsx` and triggers a full model retrain |

### Infrastructure

| Tool | Role |
|---|---|
| MongoDB Atlas | Document database with automated backups |
| Nginx | Reverse proxy, static SPA serving, gzip, HTTPS |
| PM2 | Process manager — auto-start, crash restart, zero-downtime reload |
| Let's Encrypt / Certbot | HTTPS certificate auto-renewal |
| GitHub Actions | Lint on push + SSH deploy on merge to release branch |

---

## Architecture

Three-tier, four-component architecture:

```
Browser (React SPA)
        │  HTTPS
        ▼
    Nginx (port 443)
        │  /api/*  reverse proxy
        ▼
  Node.js / Express (port 5000)
        │  internal HTTP
        ├──────────────────────► FastAPI ML service (port 8000, internal only)
        │
        ▼
  MongoDB Atlas
```

- The browser never talks directly to the database.
- The ML service is never exposed to the public internet.
- The Node server spawns the Python process at startup and stops it cleanly on shutdown.
- Node startup sequence: spawn ML → connect MongoDB → recalculate workloads → mount middleware → mount routes → start cron → listen on port 5000.

---

## Features

### Dashboard

5 sections on the main overview page:

1. **Budget Stats Panel** — collapsible; KPI cards (active clients, YTD consumed, YTD client gain, current-month hours), pace health summary (green / yellow / red), current-month timesheet submission progress bar
2. **KPI Row** — over-budget client count, active collaborators + burnout count, YTD gain
3. **Top 10 Most Profitable** — clients ranked by YTD client-hour gain with avg pace
4. **Top 10 Over-Budget** — clients ranked by overrun severity with avg pace
5. **Manager Profitability Grid** — per-partner YTD gain, avg pace, client count, overrun rate

**Notification Bell** — refreshes every 5 minutes; covers four alert types: over-budget projects, pending timesheets, burnout-risk staff, and at-risk projects; each notification is individually dismissible with persistence via `localStorage`

**Help Guide** — floating `?` button; bilingual chat panel matching queries against 14 topic areas in EN and FR

---

### Authentication

- Two-token scheme: access token (8 h) + refresh token (7 days)
- Silent token refresh via Axios response interceptor — user never sees a mid-session prompt
- Device fingerprint: `SHA256(ip + user-agent)` embedded in refresh token (can be disabled via `ENABLE_DEVICE_FINGERPRINT=false`)
- Brute-force lock: 5 failed attempts → 15-minute account lock
- Inactivity timeout: 15 minutes of no activity → automatic logout
- Cross-tab logout via `BroadcastChannel("b2a_auth")` — one logout closes all open tabs simultaneously
- Token blacklisting on logout and password reset

---

### Staff Management

- Four level tabs: Junior / Mid / Senior / Partner
- Each profile: account info, HR/contract data (hourly rate, hire date, contract type), personal data (CIN, CNSS, civil status)
- Workload indicator and burnout flag per expert
- Avatar upload (JPEG/PNG/WebP, 500 KB limit)

---

### Client Management

- Full legal metadata: SIRET, legal form, VAT regime and effective date, fiscal year closing date, operational status, country, client portal, extranet references, Teams group ID
- 13 sectors each with a distinct colour used consistently across all views
- Bulk import: idempotent — rows with a known external ID are updated, not duplicated

---

### Project Management

- Budget tracked in hours and cost; consumption in hours and cost; invoiced amount, gross margin, margin %, effective cost per hour
- Project-level pace index formula:
  ```
  elapsedRatio = clamp((now - start) / (end - start), 0.05, 1.0)
  paceIndex    = (hoursConsumed / budgetHours) / elapsedRatio
  ```
- Pace colour coding: green < 0.8 · yellow 0.8–1.0 · orange 1.0–1.2 · red > 1.2
- Four threshold alerts at 50 %, 75 %, 90 %, and 110 % of budget — each fires exactly once per project

---

### Assignments

Five view modes switchable from the same page:

| View | What it shows |
|---|---|
| **Matrix** | Expert × project assignment grid |
| **Workload** | Per-expert load bar |
| **Heatmap** | Collab × month hours over a full year; cell intensity scales from grey (0 h) to green to gold |
| **Collabs** | Per-collaborator breakdown |
| **Supervisors** | Per-supervisor summary |

---

### Timesheets

- Upload format: five columns — `Client/Affaire`, `Prestation`, `Date`, `Consommé`, `Détail`
- Client name parsed from everything before the first hyphen in `Client/Affaire`; mission name from everything after
- Re-upload for an existing month replaces cleanly — no duplicates
- Submission status table with submitted / pending badges per collaborator per month
- Monthly reminder email fires automatically on the last day of each month at 09:00

---

### Annual Budget Import

- Per-client annual budget: financial amount (TND) + planned internal hours per month + planned billed client hours per month
- Re-import is safe — existing entries are upserted, not duplicated
- These figures are the reference point for all client-level pace index calculations

---

### Client-Level Pace Index

Answers *"will this annual contract finish within budget?"* (the project-level index answers *"is this mission consuming its budget too fast?"*).

- Monthly pace ratio: `consumed hours ÷ planned internal hours`
- Health thresholds: green ≤ 0.85 · yellow 0.86–1.0 · red > 1.0
- Year-end projection:
  ```
  projectedYearEnd = ytdConsumed + avgPace × internalHours × remainingMonths
  surplusHours     = totalClientHours − projectedYearEnd
  profitTND        = surplusHours × (financialBudget / totalClientHours)
  ```
- Three-tab client detail: **Missions** (collapsible by mission) · **Pace Index** (health + projection) · **Financial** (consumed vs. billed bar, cumulative surplus area, collaborator cost donut)

---

### ML Budget Estimator

Input: mission type, sector, complexity, team mix (Junior/Mid/Senior/Manager counts), strict-deadline toggle, and optional fields (duration, estimated budget, estimated hours, segment, contract period).

Five model artefacts per prediction:

| Artefact | Output |
|---|---|
| `model_hours_q10.pkl` | Optimistic hour estimate (Q10) |
| `model_hours_q50.pkl` | Most-likely hour estimate (Q50) |
| `model_hours_q90.pkl` | Pessimistic hour estimate (Q90) |
| `model_cost.pkl` | Predicted project cost in TND |
| `knn.pkl` | 6 most similar past projects |

- All models: Gradient Boosting Regression, 85/15 train/test split, 10 % outlier trimming
- Confidence level: high (≥ 6 similar projects) · medium (≥ 3) · low (< 3)
- Falls back to rule-based estimate if the ML service is unreachable
- Auto-retrain triggers when 10 new projects are completed (`EstimationMeta.completedSinceRetrain`)

---

### Team Builder

- Select a mission type → returns all collaborators with hourly rate and experience flag (derived from past assignments on the same mission type)
- Filters: level (All / Junior / Mid / Senior / Partner), experienced only, free-text search
- Live summary panel: count, average hourly rate, experience breakdown, level composition, cost preview for 40 / 80 / 120 / 160 h

---

### File Parser

- Accepts raw `.xlsx` workbooks with multiple sheets, merged cells, and irregular headers
- Previews sheet names and row counts before processing
- Two transformations per sheet: **Split** (one file per sheet) and **Merge** (continuation rows merged into the row above, separated by pipe)
- Output packaged as a ZIP streamed directly to the browser — no temporary files written to disk

---

### Role-Based Access Control

| Role | Access |
|---|---|
| **Admin** | Full platform access including user management |
| **Manager** | Budget views, assignments, reports |
| **Collaborator** | Own timesheet and projects only |
| **Worker** | No login — tracked for workload and timesheet purposes; no credentials required |

- Every route: JWT validation + role check
- The sidebar never renders links the current role cannot access
- Worker accounts use a sparse unique index on `email` — multiple workers can exist without one

---

### Audit Trail

- Every state-changing action logged: actor, timestamp, IP, user agent, field-level diff (old → new)
- 10 tracked categories: login, failed login, create, update, delete, import, email sent, password reset, and more
- Fire-and-forget write — audit logging never blocks the primary operation
- 365-day TTL index — records auto-deleted after one year
- Full filter UI: date range, action type, resource, user; CSV export

---

## Authentication & Security

| Mechanism | Detail |
|---|---|
| Token storage | `sessionStorage` — cleared on tab close, no cross-tab leakage |
| Refresh token | 7-day validity; device fingerprint `SHA256(ip + user-agent)` blocks stolen tokens on new devices |
| Brute-force | 5 wrong passwords → 15-minute lock stored in `LoginAttempt` collection |
| Token blacklist | Logout and password reset invalidate the token server-side via `BlacklistedToken` collection |
| Cross-tab logout | `BroadcastChannel("b2a_auth")` — one logout closes all open tabs |
| RBAC | Four roles — Admin, Manager, Collaborator, Worker; middleware checks role on every protected route |
| Password hashing | bcrypt cost factor 12 on Mongoose `pre-save` hook |
| Secrets | JWT keys and SMTP credentials loaded exclusively from environment variables — never committed |

---

## Data Models

| Model | Collection | Purpose |
|---|---|---|
| `Expert` | `experts` | Staff profiles: account info, HR data, personal data, workload, burnout flags |
| `Project` | `projects` | Missions: budget hours/cost, consumption, invoiced amount, margin, pace index |
| `Client` | `clients` | Client records: contact info, full legal metadata, sector |
| `Affectation` | `affectations` | Expert–project assignment records derived from time entries |
| `TimeEntry` | `timeentries` | Individual logged hours per expert per project |
| `BillingEntry` | `billingentries` | Billing records driving margin calculations |
| `Leave` | `leaves` | Leave records (annual, sick, exceptional) per expert |
| `AuditLog` | `auditlogs` | Immutable log of every state-changing action; 365-day TTL |
| `EstimationProject` | `estimationprojects` | Historical project data used as ML training set |
| `EstimationMeta` | `estimationmetas` | ML model metadata: last retrain date, completions since retrain |
| `ImportHistory` | `importhistories` | Log of every Excel import: file, type, status, row-level errors |
| `BlacklistedToken` | `blacklistedtokens` | Revoked JWT tokens (logout / password reset) |
| `LoginAttempt` | `loginattempts` | Brute-force tracking per account |
| `AnnualBudget` | `annualbudgets` | Per-client annual budget: financial amount (TND) + planned hours per month |
| `Timesheet` | `timesheets` | Monthly timesheet submission records per expert |

---

## Known Issues

| # | Location | Issue |
|---|---|---|
| 1 | `loadRecalculator.ts` | `currentLoad` aggregates all-time hours, not just the current calendar month |
| 2 | `ProjectDetail.tsx` | Response shape mismatch: backend returns `{ project, timeEntries, staffHours, monthlyHours }` but frontend reads it as a flat project object |
| 3 | `Assignments.tsx`, `Staff.tsx`, `StaffProfile.tsx` | Avatar URLs hardcoded to `http://localhost:5000` |
| 4 | `AuditLogs.tsx` | Pagination is capped at 7 pages — pages 8 and beyond are unreachable |
| 5 | `loadRecalculator.ts` + `Expert.ts` | Burnout flag logic (`burnoutFlags`) is never executed — the field exists but is never set |
| 6 | `authController.ts` | Device fingerprint causes session failures for mobile users on 4G/5G; set `ENABLE_DEVICE_FINGERPRINT=false` in `server/.env` as a workaround |

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GMAIL_USER=...
GMAIL_PASS=...
CLIENT_URL=https://your-domain.com
ENABLE_DEVICE_FINGERPRINT=false
```

### Client (`client/.env`)

```env
VITE_API_URL=
```

---

## Running the Project

### Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB Atlas cluster (or local MongoDB)

### Development

```bash
# Backend
cd server
npm install
npm run dev

# Frontend (separate terminal)
cd client
npm install
npm run dev

# ML service (separate terminal)
cd server/ml
pip install -r requirements.txt
uvicorn main:app --port 8000
```

> In production the Node server spawns the ML process automatically — no manual Python launch needed.

### Production

```bash
# Build frontend
cd client && npm run build

# Build and start backend with PM2
cd server && npm run build
pm2 start dist/index.js --name b2a-api
```
