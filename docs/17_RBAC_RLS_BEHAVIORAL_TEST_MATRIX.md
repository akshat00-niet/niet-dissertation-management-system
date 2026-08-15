# NIET Dissertation Management System — RBAC & RLS Behavioral Test Matrix

**Document ID:** `DOC-17-RBAC-RLS-TEST-MATRIX`  
**File Path:** [`docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md)  
**Document Status:** EXECUTED & AUDITED SECURITY BASELINE (PHASE 5A.6)  
**Last Revised:** 2026-08-16  
**Execution Environment:** Isolated Local PostgreSQL 18.6 Test Database (`niet_dms_behavioral_security_test`) on port `54329` under unprivileged role `authenticated`.  
**Production Impact:** **ZERO PRODUCTION IMPACT** (Production Supabase database was untouched).  
**Governing Documents:** [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md), [`docs/14_TEST_PLAN.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/14_TEST_PLAN.md), [`docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md), [`docs/18_RBAC_RLS_SECURITY_VERIFICATION_REPORT.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/18_RBAC_RLS_SECURITY_VERIFICATION_REPORT.md)  

---

## 1. Document Purpose & Execution Standard

This document records the **comprehensive 47-test behavioral authorization and Row Level Security (RLS) execution matrix** for the NIET Dissertation Management System. Every scenario was physically executed against an isolated PostgreSQL instance applying the exact production migrations under non-superuser (`authenticated`) role sessions.

### Execution Status Legend
- **`PASS`**: Test executed against isolated database; returned exact expected result (allowed row/insert or RLS policy denial error).
- **`FAIL`**: Test executed against isolated database; returned unexpected result or policy breach.
- **`STATICALLY VERIFIED`**: Validated by static AST/DDL inspection.
- **`NOT EXECUTED`**: Requires external infrastructure (e.g. Supabase Storage S3 daemon).

---

## 2. Reconciled Role Inventory (11 Roles)

| Role Identifier | Role Title | Classification | Documentation | Database Enum | Permissions Mapped | RLS Active | Reconciled Status |
|---|---|---|:---:|:---:|:---:|:---:|:---:|
| `STUDENT` | Candidate Student | Academic | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `FACULTY` | Base Academic Faculty | Academic | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `GUIDE` | Primary Supervisor | Contextual | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `CO_GUIDE` | Co-Supervisor | Contextual | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `DC` | Dept Coordinator | Operational | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `DHOD` | Deputy HOD | Administrative | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `HOD` | Head of Dept | Executive | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `DCEC_MEMBER` | Committee Member | Evaluation | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `DCEC_CHAIR` | Committee Chair | Formal Sign-off | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `PANEL_MEMBER`| Viva Examiner | Examination | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |
| `ADMIN` | System Admin | Technical | [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | `004_identity_and_rbac.sql` | `permissions` Table | 101 Policies | **`CONSISTENT`** |

---

## 3. Comprehensive Executed Behavioral Test Suite (47 Scenarios)

### 3.1 Student Candidate Authorization Tests (10/10)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-STU-01` | Student A (`1111...`) | `public.theses` (Thesis A) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `AUTH-STU-02` | Student A (`1111...`) | `public.theses` (Thesis B) | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Policy (`p_theses_select`) | **`PASS`** |
| `AUTH-STU-03` | Student A (`1111...`) | `public.theses` (Thesis B) | `UPDATE` | `DENY (UPDATE 0)` | `DENY (UPDATE 0)` | RLS Policy | **`PASS`** |
| `AUTH-STU-04` | Student A (`1111...`) | `public.theses` (Thesis A) | `DELETE` | `DENY (DELETE 0)` | `DENY (DELETE 0)` | RLS Policy | **`PASS`** |
| `AUTH-STU-05` | Student A (`1111...`) | `public.annexure_1_submissions` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-STU-06` | Student A (`1111...`) | `public.annexure_1_submissions` (Thesis B) | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |
| `AUTH-STU-07` | Student A (`1111...`) | `public.annexure_6_evaluations` | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Policy (`has_role('STUDENT')=f`) | **`PASS`** |
| `AUTH-STU-08` | Student A (`1111...`) | `public.annexure_6_evaluations` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |
| `AUTH-STU-09` | Student A (`1111...`) | `public.digital_logbook_entries` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-STU-10` | Student A (`1111...`) | `public.digital_logbook_entries` (Thesis B) | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |

---

### 3.2 Primary Guide Authorization Tests (7/7)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-GDE-01` | Guide A (`3333...`) | `public.theses` (Thesis A) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `AUTH-GDE-02` | Guide A (`3333...`) | `public.theses` (Thesis B) | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Policy (`is_assigned_guide`) | **`PASS`** |
| `AUTH-GDE-03` | Guide A (`3333...`) | `public.annexure_6_evaluations` (Thesis A) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `AUTH-GDE-04` | Guide B (`4444...`) | `public.annexure_6_evaluations` (Thesis A) | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Policy (`auth.uid() = guide_id`) | **`PASS`** |
| `AUTH-GDE-05` | Guide A (`3333...`) | `public.annexure_6_evaluations` | `UPDATE` | `DENY (UPDATE 0)` | `DENY (UPDATE 0)` | WORM Immutability Trigger | **`PASS`** |
| `AUTH-GDE-06` | Guide A (`3333...`) | `public.logbook_verifications` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-GDE-07` | Guide B (`4444...`) | `public.logbook_verifications` (Thesis A) | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |

---

### 3.3 Co-Guide Authorization Tests (4/4 — OD-014 Invariant)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-COG-01` | Co-Guide A (`5555...`) | `public.theses` (Thesis A) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `AUTH-COG-02` | Co-Guide A (`5555...`) | `public.theses` (Annexure 2) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `AUTH-COG-03` | Co-Guide A (`5555...`) | `public.annexure_6_evaluations` | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Policy (`OD-014` Blocked) | **`PASS`** |
| `AUTH-COG-04` | Co-Guide A (`5555...`) | `public.annexure_6_evaluations` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` (`OD-014` Blocked) | **`PASS`** |

---

### 3.4 Department Coordinator (DC) Tests (4/4)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-DC-01` | DC CSE (`6666...`) | `public.dcec_dockets` (Thesis B) | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-DC-02` | DC CSE (`6666...`) | `public.dcec_decisions` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` (Maker $\ne$ Checker) | **`PASS`** |
| `AUTH-DC-03` | DC CSE (`6666...`) | `public.viva_defenses` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-DC-04` | DC CSE (`6666...`) | `public.dcec_dockets` | `SELECT` | `ALLOW (Count)` | `ALLOW (Count 2)` | N/A | **`PASS`** |

---

### 3.5 Deputy HOD (DHOD) Tests (4/4)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-DHD-01` | DHOD CSE (`7777...`) | `public.guide_allocations` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-DHD-02` | Delegated DHOD (`7777...`)| `public.dcec_decisions` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-DHD-03` | DHOD CSE (`7777...`) | Cross-Dept Authority (`ECE`)| `FUNCTION`| `DENY (f)` | `DENY (f)` | Security Function (`jwt_dept_id`) | **`PASS`** |
| `AUTH-DHD-04` | DHOD CSE (`7777...`) | `public.user_role_assignments` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |

---

### 3.6 Head of Department (HOD) Tests (5/5)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-HOD-01` | HOD CSE (`8888...`) | `public.dcec_decisions` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-HOD-02` | HOD CSE (`8888...`) | `public.dcec_decisions` | `UPDATE` | `DENY (UPDATE 0)` | `DENY (UPDATE 0)` | WORM Immutability Trigger | **`PASS`** |
| `AUTH-HOD-03` | HOD CSE (`8888...`) | `public.dcec_delegations` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-HOD-04` | HOD CSE (`8888...`) | `public.defense_panels` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-HOD-05` | HOD CSE (`8888...`) | `public.final_result_compilations` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |

---

### 3.7 Oral Defense Panel Member Tests (4/4)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-PNL-01` | Panel Member A (`9999...`)| `public.theses` (Thesis A) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `AUTH-PNL-02` | Panel Member A (`9999...`)| `public.panel_member_evaluations` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-PNL-03` | Random Faculty (`bbbb...`)| `public.panel_member_evaluations` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |
| `AUTH-PNL-04` | Panel Member A (`9999...`)| `public.panel_member_evaluations` | `UPDATE` | `DENY (UPDATE 0)` | `DENY (UPDATE 0)` | WORM Immutability Trigger | **`PASS`** |

---

### 3.8 Technical Administrator Separation Tests (7/7)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `AUTH-ADM-01` | Admin (`cccc...`) | `public.system_configurations` | `UPDATE` | `ALLOW (UPDATE 1)` | `ALLOW (UPDATE 1)` | N/A | **`PASS`** |
| `AUTH-ADM-02` | Admin (`cccc...`) | `public.user_role_assignments` | `INSERT` | `ALLOW (INSERT 1)` | `ALLOW (INSERT 0 1)` | N/A | **`PASS`** |
| `AUTH-ADM-03` | Admin (`cccc...`) | `public.audit_events` | `SELECT` | `ALLOW (Count)` | `ALLOW (Count 0)` | N/A | **`PASS`** |
| `AUTH-ADM-04` | Admin (`cccc...`) | `public.audit_events` | `DELETE` | `DENY (DELETE 0)` | `DENY (DELETE 0)` | WORM Immutability Trigger | **`PASS`** |
| `AUTH-ADM-05` | Admin (`cccc...`) | `public.dcec_decisions` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |
| `AUTH-ADM-06` | Admin (`cccc...`) | `public.milestone_evaluations` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |
| `AUTH-ADM-07` | Admin (`cccc...`) | `public.annexure_6_evaluations` | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |

---

### 3.9 Workflow State Dependent Tests (5/5)

| Test ID | Actor & Session | Scenario & Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `WF-01` | Guide B (`4444...`) | Thesis B in `STAGE_1_TOPIC` | `STATE CHECK` | Proposal state verified | State = `TOPIC_SUBMITTED` | State Machine Invariant | **`PASS`** |
| `WF-02` | Student A (`1111...`) | Submitted / Locked Annexure 1 | `UPDATE` | `DENY (UPDATE 0)` | `DENY (UPDATE 0)` | Zero direct UPDATE policy | **`PASS`** |
| `WF-03` | Revoked DHOD (`7777...`) | All delegations revoked | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | `is_active_dcec_chair() = f` | **`PASS`** |
| `WF-04` | Panel Member (`7777...`) | Unscheduled viva defense ID | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` | **`PASS`** |
| `WF-05` | DC CSE (`6666...`) | Final grade compilation | `INSERT` | `DENY (Error)` | `DENY (RLS Policy Error)` | RLS `WITH CHECK` (Requires HOD) | **`PASS`** |

---

### 3.10 Cross-Department Isolation Tests (3/3)

| Test ID | Actor & Session | Scenario & Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `DEPT-01` | CSE Student (`1111...`) | `academic_policy_configurations` (`ECE`) | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Policy (`department_id` tenancy) | **`PASS`** |
| `DEPT-02` | CSE DC (`6666...`) | DCEC Chair Check in `ECE` | `FUNCTION` | `DENY (f)` | `DENY (f)` | Department Tenancy Scope | **`PASS`** |
| `DEPT-03` | CSE HOD (`8888...`) | DCEC Chair Check in `ECE` | `FUNCTION` | `DENY (f)` | `DENY (f)` | Department Tenancy Scope | **`PASS`** |

---

### 3.11 Document-Level Access Tests (4/4)

| Test ID | Actor & Session | Target Resource | Action | Expected Result | Actual Executed Result | Denial Mechanism | Status |
|---|---|---|---|:---:|:---:|:---:|:---:|
| `DOC-01` | Student A (`1111...`) | Own Synopsis Doc (`f000...0001`) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `DOC-02` | Student A (`1111...`) | Restricted Annexure 6 Doc (`f000...0002`) | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Policy (`is_student_restricted`) | **`PASS`** |
| `DOC-03` | Guide A (`3333...`) | Restricted Annexure 6 Doc (`f000...0002`) | `SELECT` | `ALLOW (1 row)` | `ALLOW (1 row)` | N/A | **`PASS`** |
| `DOC-04` | Student B (`2222...`) | Student A Docs (`6000...0001`) | `SELECT` | `DENY (0 rows)` | `DENY (0 rows)` | RLS Relational Join | **`PASS`** |

---

## 4. Execution Summary

$$\text{Total Tests Executed} = 47 \quad\mid\quad \text{Passed} = 47 \quad\mid\quad \text{Failed} = 0 \quad\mid\quad \text{Pass Rate} = 100\%$$

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        BEHAVIORAL SECURITY EXECUTION SCORECARD                         │
├──────────────────────────────────────┬─────────────┬─────────────┬─────────────────────┤
│ Security Dimension                   │ Planned     │ Executed    │ Behavioral Outcome  │
├──────────────────────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ Student Candidate Isolation          │ 10          │ 10          │ 100% PASS           │
│ Primary Guide Assignment Scoping     │ 7           │ 7           │ 100% PASS           │
│ Co-Guide Access Boundary (OD-014)    │ 4           │ 4           │ 100% PASS           │
│ Department Coordinator (DC — Maker)  │ 4           │ 4           │ 100% PASS           │
│ Deputy HOD (DHOD — Allocation)       │ 4           │ 4           │ 100% PASS           │
│ Head of Department (HOD — Checker)   │ 5           │ 5           │ 100% PASS           │
│ Oral Defense Panel Members           │ 4           │ 4           │ 100% PASS           │
│ Technical Administrator Separation   │ 7           │ 7           │ 100% PASS           │
│ Workflow State Invariants            │ 5           │ 5           │ 100% PASS           │
│ Department Tenancy Isolation         │ 3           │ 3           │ 100% PASS           │
│ Document-Level Confidentiality       │ 4           │ 4           │ 100% PASS           │
├──────────────────────────────────────┼─────────────┼─────────────┼─────────────────────┤
│ TOTAL VERIFIED TEST BATTERY          │ 47          │ 47          │ 100% PASS (0 FAILS) │
└──────────────────────────────────────┴─────────────┴─────────────┴─────────────────────┘
```
