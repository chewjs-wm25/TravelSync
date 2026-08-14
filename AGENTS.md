# AI Agent Instructions & Guardrails (`AGENTS.md`)

This document defines the strict architectural boundaries, coding standards, project constraints, and execution rules for **Codex** (or any AI agent) working on the **TravelSync** repository.

---

## 📌 PROJECT SCOPE & CORE CONSTRAINTS

1. **Geographic Scope:** Travel planning features are strictly limited to **Malaysia** (e.g., location validations, search results, POIs, and itineraries).
2. **Architecture Priority:** Lightweight web application with a **frontend-first / client-side execution priority** where feasible.
3. **API Constraints:** All integrated third-party APIs must be **100% free** and **require no credit card** registration or activation.

---

## 🚨 MANDATORY SCOPE & DIRECTORY RESTRICTIONS

To maintain codebase safety and isolate feature development, **you are ONLY allowed to create or modify files inside the following target areas**:

1. **Database Schema:** `schema.sql` (Root SQL migration definition).
   * ⚠️ **TABLE RESTRICTION:** You are ONLY allowed to create, update, or append tables belonging to Module 02 (`trips`, `itineraries`, `itinerary_items`).
   * ❌ **NEVER** drop, alter, or modify database tables belonging to other modules.
2. **Presentation / UI Layer:** `app/02_Trip_Planning_&_Itinerary_Management/` (and its subdirectories).
3. **Business Logic Layer (BLL):** `business_logic_layer/02_Trip_Planning_&_Itinerary_Management/`
4. **Data Access Layer (DAL):** `data_access_layer/02_Trip_Planning_&_Itinerary_Management/`
5. **API Client Layer:** `api_layer/02_Trip_Planning_&_Itinerary_Management/`

---

## ⛔ ABSOLUTE PROHIBITIONS

* ❌ **DO NOT modify the development environment** setup or runtime configurations.
* ❌ **DO NOT install or add new dependency libraries** (`package.json`, `node_modules`). Use only existing pre-installed libraries.
* ❌ **DO NOT touch files** in `app/01_*`, `app/03_*`, `app/04_*`, `app/05_*` or any other module directory.
* ❌ **DO NOT modify root infrastructure config files** (`wrangler.json`, `tailwind.config.ts`, `package.json`, `tsconfig.json`) unless explicitly instructed by the developer.
* ❌ **DO NOT alter or delete SQL definitions** for tables outside Module 02 in `schema.sql`.

---

## ✅ PERMITTED ACTIONS

* ✔️ **Sub-Agent Delegation:** You are permitted to invoke or spawn specialized Sub-Agents to assist in planning, refactoring, or generating code to complete complex sub-tasks.

---

## 🔄 WORKFLOW & SESSION PROTOCOL

1. **Pre-Execution Check:** Always load and comply with the guardrails in `AGENTS.md` and the architecture spec in `database_erd.md` before generating or modifying code.
2. **Progress Synchronization:** Upon fully implementing and verifying a functional requirement (e.g., FR001), update `worldmap.md` to reflect its completed status.
3. **Automated Handoff Generation:** Whenever the user indicates session termination (e.g., "handoff", "wrap up", "end session") or upon completing a full requirement scope:
   - Generate or update `handoff.md`.
   - Include a summary of modified files, system state, and immediate next steps for the next prompt session.
   
---

## 🏗️ 4-TIER LAYERING ARCHITECTURE RULES

You must strictly enforce the single-responsibility flow between layers:

```text
[ Presentation Layer (app/02_...) ]
               │
               ▼
[ Business Logic Layer (business_logic_layer/02_...) ]
         ├──> [ Data Access Layer (data_access_layer/02_...) ] ──> D1 / KV Database
         └──> [ API Client Layer (api_layer/02_...) ]         ──> External Free APIs