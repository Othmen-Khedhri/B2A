# B2A Smart-Resource — Project Brief for Claude Code

> **Project type:** End-of-Studies Project (PFE) for B2A, a Tunisian accounting firm  
> **Timeline:** Feb 10 – Jun 10, 2026 (16 weeks, Agile Scrum, 2-week sprints)  
> **Stack:** MERN (MongoDB 6+, Express 4.x, React 18, Node.js 20 LTS)  
> **Status:** Active development — Phase 3 (Development) is in progress

---

## What This App Does

**B2A Smart-Resource** is an internal management platform that centralizes data from B2A's currently fragmented tools into a single system. The core goal is to shift the firm from *reactive* (discovering problems after the fact) to *proactive* (detecting issues before they become critical).

**The three problems it solves:**
1. No real-time budget tracking → projects discovered 30–40 days after going over budget
2. Intuitive, error-prone budget estimation → 43% of projects over budget, +22% average overrun
3. Manual, inefficient staff assignments → 15–20 min per assignment, 3–4 hrs/week wasted

---

## ⚠️ Data Source — Excel Only

**All data enters the system through Excel file uploads. There is no Sage integration, no live API connection, no direct link to any external system.**

B2A's existing tools (Teams, Sage) export data to Excel. Users upload those Excel files into the platform. The app parses them with SheetJS and stores the results in MongoDB. That is the entire data pipeline.

| Data type | Origin | How it enters the app |
|---|---|---|
| Timesheets (hours per person per project) | Microsoft Teams export | Excel upload |
| Billing amounts & costs per project | Sage export | Excel upload |
| Project budgets (hours + cost) | Manual Excel | Excel upload |
| Leave / absence records | Teams/HR export | Excel upload |

**No live sync. No Sage API. No direct DB connections to external systems.**  
Every metric, report, alert, and calculation is derived exclusively from parsed Excel imports.

---

## ⚠️ Project Objectives (Client Clarification — Priority Override)

### Objective 1 — Budget Estimation Precision
Tracking must be done in **both hours AND cost AND profitability per project** — not hours alone.
Every budget view, alert, and report must show:
- Hours consumed vs budget hours
- Cost consumed vs budget cost (from Sage Excel export)
- Real gross margin = invoiced amount − real cost (both sourced from Excel)

### Objective 2 — Early Overrun Detection
Detect overruns in **hours AND in cost/profitability**, not just hours.
Pace Index must be computed for both dimensions independently.

### Objective 3 — Burnout Prevention (NEW)
The platform must actively monitor and surface signals of employee burnout risk:
- Flag collaborators with sustained high load (>55h/week over multiple consecutive weeks)
- Warn when a collaborator has had no leave for an extended period
- Highlight workload imbalance across the team (some overloaded, others underutilized)
- Surface burnout risk in the staff dashboard with a clear visual indicator
- Feeds into assignment decisions — never auto-assign a flagged collaborator without manager override

---

## Modules

### ✅ Module 1 — Proactive Tracking (Pace Index) `[IN SCOPE - BUILD NOW]`
Replaces monthly manual Excel reconciliation with automated budget consumption monitoring — tracked in **both hours and cost**.

**Dual Pace Index — compute both independently:**
```
Pace Index (hours) = (% hours budget consumed) / (% time elapsed)
Pace Index (cost)  = (% cost budget consumed)  / (% time elapsed)
```
A project can be on track in hours but over budget in cost (e.g. senior staff assigned instead of juniors). Both must be shown side by side.

| Pace Index | Meaning | Color |
|---|---|---|
| < 1.0 | On track or ahead | 🟢 Green |
| 1.0 – 1.2 | Slight drift, watch it | 🟠 Orange |
| > 1.2 | Overrun likely, act now | 🔴 Dark Orange/Red |

**Per-project profitability (derived entirely from Excel imports):**
```
Gross Margin      = Invoice amount − Real cost
Margin %          = Gross Margin / Invoice amount
Effective cost/hr = Real cost / hours worked
```

**Automatic email alerts (sent only once per threshold, on both hours AND cost axes):**
- **75%** — Warning: consumption approaching limit, prepare renegotiation
- **90%** — Urgent: immediate client renegotiation required
- **100%** — Critical: block new assignments, require manager sign-off

### ✅ Module 3 — Capacity Dashboard & Admin `[IN SCOPE - BUILD NOW]`
Four dashboard sections:

1. **Project Overview** — all projects with name, client, budget hours, hours consumed, Pace Index (hours + cost), status, responsible partner, assigned staff, dates. Filterable by status / partner / type / client. Sortable by Pace Index / consumption % / end date.
2. **Project Detail View** — consumption chart (actual vs planned, in hours and cost), assigned staff with hours, alert history, comments, documents.
3. **Staff Overview** — collaborators by level (Junior / Mid / Senior / Partner), current monthly load, real-time availability, burnout risk flag.
4. **Assignment Matrix** — visual grid of who works on what, reassignment UI with availability/level/burnout checks, conflict detection (on leave, at max capacity, burnout-flagged).

**8 auto-generated management reports (confirmed by client):**

| # | Report | Data source | Frequency |
|---|---|---|---|
| 1 | **Top 10 most profitable projects** | Billing + hours from Excel imports | Real-time |
| 2 | **Top 10 over-budget projects** | Hours + cost vs budget from Excel | Real-time |
| 3 | **Billable hours / theoretical billable hours per collaborator** | timeEntries + capacity | Weekly |
| 4 | **Portfolio profitability by manager** | Margin aggregated by responsible partner | Monthly |
| 5 | **Timesheet reminder — collaborators** | timeEntries missing entries | Automatic |
| 6 | **Timesheet reminder — managers** | Pending validations >48h | Automatic |
| 7 | **Timesheet anomaly alerts** | >12h/day, >55h/week, <15h/week | Real-time |
| 8 | **Burnout risk dashboard** | Load history, leave history, workload spread | Real-time |

**Burnout prevention — signals to compute from imported Excel data:**
- Consecutive weeks with >55h logged
- No approved leave in the last N weeks (threshold TBD with client)
- Workload imbalance across the team
- Collaborator flagged → shown in assignment matrix, blocks auto-assignment without manager override

**4 timesheet alert types:**
| Alert | Trigger | Recipient |
|---|---|---|
| Missing entry | No timesheet J+2 after week end | Collaborator (daily until done) |
| Pending validation | In review for 48h | Manager (daily until validated) |
| Excessive hours | >12h/day OR >55h/week | Manager + Direction (immediate) |
| Insufficient hours | <15h/week during active period | Manager + Direction (end of week) |

### ⏸ Module 2 — AI Budget Estimation `[PHASE 2 - NOT IN SCOPE YET]`
Predictive budget recommendations based on historical data. Deferred until the database has enough history. Do not build this now.

---

## Tech Stack

| Layer | Tech | Version |
|---|---|---|
| Frontend | React | 18.x |
| Backend | Node.js + Express | 20 LTS + 4.x |
| Database | MongoDB | 6.0+ |
| Excel Parsing | SheetJS (xlsx) | 0.18.x |
| Email | SendGrid | — |
| Auth | JWT | 8h access token, 7d refresh |
| Monitoring | Sentry | — |
| Frontend deploy | Vercel | — |
| Backend deploy | Railway or Render (Docker) | — |
| DB hosting | MongoDB Atlas (M10 cluster, 3-node replica) | — |

---

## Database Collections

| Collection | Purpose |
|---|---|
| `experts` | Staff profiles: level, specializations, current load, total hours, burnout flags |
| `projects` | Mission data: budget hours, budget cost, consumption, Pace Index (hours + cost), alerts sent, responsible partner |
| `timeEntries` | Individual time logs parsed from Excel: staff, project, date, hours, validation status |
| `conges` | Leave records parsed from Excel: staff, dates, type, days |
| `clients` | Client registry: name, sector, project history |
| `importHistory` | Import audit trail: date, user, file name, record count, errors |
| `billingEntries` | Billing and cost data parsed from Excel (Sage exports): project, invoiced amount, cost, period |

**Key MongoDB indexes:**
- `experts`: `{level: 1, currentLoad: -1}` — find available staff by level
- `projects`: `{status: 1, paceIndex: -1}` — dashboard active projects sorted by risk
- `timeEntries`: `{projectId: 1, date: -1}` and `{expertId: 1, date: -1}`
- `conges`: `{expertId: 1, dateStart: 1}` — quick availability check
- `billingEntries`: `{projectId: 1, period: -1}` — profitability queries

Target response time: **<200ms** for most queries.

---

## Auth & Roles

JWT-based auth. 3 roles:

| Role | Access |
|---|---|
| **Admin** | Full access, including Excel imports |
| **Manager / Partner** | Budget views, assignments, dashboard, reports |
| **Collaborator** | Own data only (personal timesheet, own projects) |

Security rules:
- Bcrypt password hashing (salt 12 rounds), never stored in plain text
- Financial data: admins + authorized managers only, never exposed in public API responses
- Uploaded Excel files: processed in memory, never persisted to disk, deleted after parsing
- HTTPS mandatory in production (SSL/TLS)
- Secrets in `.env`, never committed to Git

---

## Staff Assignment Logic

When assigning a collaborator, check three criteria in order:
1. **Availability:** current project load + approved leave dates (from Excel imports)
2. **Level match:** Junior / Mid / Senior / Partner must match what the mission requires
3. **Burnout flag:** if flagged, block auto-assignment and require explicit manager override

---

## Project Timeline

| Phase | Duration | Weeks | Key Deliverables |
|---|---|---|---|
| Preliminary Study | 2 wks | S1–S2 | System analysis, stakeholder interviews, validated spec |
| Design | 3 wks | S3–S5 | Architecture, UI/UX mockups, DB model, API specs |
| **Development** | **7 wks** | **S6–S12** | **All in-scope modules, Excel import pipeline, unit tests, CI** |
| Testing & Validation | 2 wks | S13–S14 | UAT with B2A, bug fixes, functional sign-off |
| Deployment | 1 wk | S15 | Production deploy, historical data migration, team training |
| Documentation | 1 wk | S16 | Full PFE report, technical docs, final presentation |

---

## Key Business Context

- **B2A** is a Tunisian accounting firm founded in 2007, Tunis. Services: audit, accounting, financial engineering, professional training.
- Current pain: 14 hrs/week lost on manual Excel reconciliation across 3 siloed systems (Teams, Sage, Excel).
- 43% of projects over budget. Average overrun: +22%. 70% of time entries have no budget attached.
- **Target after launch:** admin time down from 14h → 4h/week, overrun detection from 30 days → <7 days, renegotiation success rate from 5% → 65%.

---

## What to Build Next

Focus is on **Phase 3 (Development, weeks S6–S12)**. Priority order:

1. MongoDB schema + indexes for all collections (include `burnoutFlags` on `experts`)
2. Auth system (JWT, 3 roles, middleware)
3. Excel import pipeline — SheetJS parsers for all file types (timesheets, billing/cost, leave, project budgets) → validated → stored in respective collections + `importHistory`
4. Dual Pace Index calculation engine — hours axis AND cost axis (recalculates after each import)
5. Per-project profitability engine (gross margin, margin %, effective cost/hr — all from parsed data)
6. Alert system (SendGrid, anti-spam dedup in DB) — fires on both hours and cost thresholds
7. Burnout risk scoring engine (runs on `timeEntries` + `conges` after each import)
8. Dashboard API endpoints (projects list, project detail, staff overview, assignment matrix)
9. React frontend — all dashboard views + all 8 reports
10. Assignment conflict detection (leave + capacity + burnout flag)

**Do not start Module 2 (AI estimation).** Explicitly deferred to Phase 2.

**Never track hours in isolation** — every budget metric must have a parallel cost/profitability view, derived entirely from Excel data.