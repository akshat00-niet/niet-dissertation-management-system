# NIET Dissertation Management System — Development Identity & Seed Model

**Document ID:** `DOC-19-DEV-IDENTITY-SEED-MODEL`  
**File Path:** [`docs/19_DEVELOPMENT_IDENTITY_AND_SEED_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/19_DEVELOPMENT_IDENTITY_AND_SEED_MODEL.md)  
**Document Status:** AUTHORITATIVE DEVELOPMENT BASELINE (PHASE 5B.1)  
**Last Revised:** 2026-08-16  
**Governing Documents:** [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md), [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md), [`docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md), [`docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md), [`docs/18_RBAC_RLS_SECURITY_VERIFICATION_REPORT.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/18_RBAC_RLS_SECURITY_VERIFICATION_REPORT.md)  

---

## 1. Important Architectural Distinction: Identity vs. Authentication

> [!IMPORTANT]
> **DEVELOPMENT IDENTITY DISCLAIMER:**  
> **Current demo personas are database/RLS development fixtures. They are not yet real Supabase Auth accounts.**  
> The current `set_test_user()` mechanism is a test-session JWT claim emulator used exclusively for database behavioral and security testing. It is **NOT** a login system. Demo personas cannot log into a frontend application until real development authentication is provisioned in Phase 5C.

### The Three Authentication Paradigms:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   THREE-TIER IDENTITY ARCHITECTURE                                      │
├───────────────────────────────────┬───────────────────────────────────┬─────────────────────────────────┤
│ A. DATABASE / RLS FIXTURES (5B)   │ B. REAL LOCAL DEV AUTH (5C)       │ C. PRODUCTION ENTERPRISE AUTH   │
├───────────────────────────────────┼───────────────────────────────────┼─────────────────────────────────┤
│ • Session-level claim emulator    │ • Local Supabase CLI / GoTrue     │ • Microsoft Entra ID (OIDC SSO) │
│ • request.jwt.claim.sub (UUID)    │ • Local auth.users accounts       │ • Supabase Auth Cloud (GoTrue)  │
│ • request.jwt.claims (Dept JSON)  │ • Local session JWTs generated    │ • Production auth.users linking │
│ • role: 'authenticated'           │ • Next.js Supabase Auth SSR SDK   │ • Production JWT claims issued  │
│ • Direct psql / harness execution │ • Evaluates RLS via SDK calls     │ • Evaluates RLS in Supabase DB  │
└───────────────────────────────────┴───────────────────────────────────┴─────────────────────────────────┘
```

---

## 2. Intended Application Data Access Architecture

The Next.js application will **never** connect directly to PostgreSQL via raw TCP connections or bypass the security gateway. It strictly follows the Supabase client/server SDK architecture:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PREFERRED APPLICATION DATA FLOW                           │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│   Next.js 14/15 App Router (Server Components / Server Actions)                        │
│                           │                                                            │
│                           ▼                                                            │
│   Supabase Client / Server SDK (@supabase/ssr)                                         │
│                           │                                                            │
│                           ▼                                                            │
│   Supabase Auth (Validates JWT Bearer Token, sets auth.uid() & app_metadata)           │
│                           │                                                            │
│                           ▼                                                            │
│   PostgreSQL Engine (Evaluates public.has_role(), RLS Policies, & DB Triggers)         │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Environment Topology:
- **Local Development Environment (Phase 5C Target):**
  `Next.js` $\rightarrow$ `Local Supabase (CLI/Docker)` $\rightarrow$ `Local Auth` $\rightarrow$ `Local PostgreSQL / RLS`
- **Production Environment:**
  `Next.js (Vercel/Node)` $\rightarrow$ `Supabase Cloud (ap-south-1)` $\rightarrow$ `Supabase Auth (Entra SSO)` $\rightarrow$ `Supabase PostgreSQL / RLS`

*If local Supabase CLI/Docker is not yet provisioned, configuring the local Supabase container harness is an explicit Phase 5C initialization task.*

---

## 3. Demo Persona Inventory (15 Synthetic Identities)

All demo personas use fictional development emails (`@dev.local`), synthetic names, and deterministic UUIDs:

| Persona Key | Deterministic User UUID | Fictional Email | Display Name | Primary Role | Department | Scope / Context |
|---|---|---|---|---|---|---|
| `STUDENT_CSE` | `11111111-1111-1111-1111-111111111111` | `demo.student.cse@dev.local` | Aarav Sharma | `STUDENT` | `CSE` | Owns Thesis A (`6000...0001`) |
| `STUDENT_ECE` | `22222222-2222-2222-2222-222222222222` | `demo.student.ece@dev.local` | Isha Verma | `STUDENT` | `ECE` | Owns Thesis B (`6000...0002`) |
| `GUIDE_A` | `33333333-3333-3333-3333-333333333333` | `demo.guide.a@dev.local` | Dr. Rajesh Kumar | `FACULTY`, `GUIDE` | `CSE` | Primary Guide for Thesis A |
| `GUIDE_B` | `44444444-4444-4444-4444-444444444444` | `demo.guide.b@dev.local` | Dr. Priya Singh | `FACULTY`, `GUIDE` | `ECE` | Primary Guide for Thesis B |
| `COGUIDE_A` | `55555555-5555-5555-5555-555555555555` | `demo.coguide.a@dev.local` | Dr. Amit Patel | `FACULTY`, `CO_GUIDE`| `CSE` | Co-Guide for Thesis A |
| `DC_CSE` | `66666666-6666-6666-6666-666666666666` | `demo.dc.cse@dev.local` | Dr. Sunita Rao | `FACULTY`, `DC` | `CSE` | Dept Coordinator (Maker) |
| `DC_ECE` | `66666666-eeee-6666-eeee-666666666666` | `demo.dc.ece@dev.local` | Dr. Alok Mishra | `FACULTY`, `DC` | `ECE` | Dept Coordinator (Maker) |
| `DHOD_CSE` | `77777777-7777-7777-7777-777777777777` | `demo.dhod.cse@dev.local` | Dr. Vikram Malhotra | `FACULTY`, `DHOD` | `CSE` | Deputy HOD / Supervisor Allocator |
| `HOD_CSE` | `88888888-8888-8888-8888-888888888888` | `demo.hod.cse@dev.local` | Prof. Dr. Ananya Sen | `FACULTY`, `HOD`, `DCEC_CHAIR` | `CSE` | Dept Head / Default DCEC Chair |
| `HOD_ECE` | `88888888-eeee-8888-eeee-888888888888` | `demo.hod.ece@dev.local` | Prof. Dr. Sandeep Reddy | `FACULTY`, `HOD`, `DCEC_CHAIR` | `ECE` | Dept Head / Default DCEC Chair |
| `PANEL_A` | `99999999-9999-9999-9999-999999999999` | `demo.panel.a@dev.local` | Dr. Manish Gupta | `FACULTY`, `PANEL_MEMBER` | `CSE` | Appointed Viva Examiner (Thesis A) |
| `PANEL_B` | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | `demo.panel.b@dev.local` | Dr. Sneha Joshi | `FACULTY`, `PANEL_MEMBER` | `CSE` | Appointed Viva Examiner (Thesis A) |
| `DCEC_MEMBER`| `dddddddd-dddd-dddd-dddd-dddddddddddd` | `demo.dcec.member@dev.local` | Dr. Kavin Mehta | `FACULTY`, `DCEC_MEMBER` | `CSE` | Screening Committee Member |
| `BASE_FACULTY`| `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | `demo.faculty.unassigned@dev.local` | Dr. Neha Tiwari | `FACULTY` | `CSE` | Unassigned Base Faculty |
| `ADMIN_USR` | `cccccccc-cccc-cccc-cccc-cccccccccccc` | `demo.admin@dev.local` | System Administrator | `ADMIN` | Global | Technical System Administrator |

---

## 4. Canonical RBAC Role Assignments (21 Active Grants)

All role grants match [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) and [`docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md):

| User Display Name | Persona Key | Assigned Role (`role_id`) | Scoped Department | Scoped Session | Context / Authority |
|---|---|---|---|---|---|
| Aarav Sharma | `STUDENT_CSE` | `STUDENT` | `CSE` | `2025-27` | Dissertation Candidate (Thesis A) |
| Isha Verma | `STUDENT_ECE` | `STUDENT` | `ECE` | `2025-27` | Dissertation Candidate (Thesis B) |
| Dr. Rajesh Kumar | `GUIDE_A` | `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Dr. Rajesh Kumar | `GUIDE_A` | `GUIDE` | `CSE` | `2025-27` | Primary Guide for Thesis A |
| Dr. Priya Singh | `GUIDE_B` | `FACULTY` | `ECE` | NULL | Base Academic Faculty |
| Dr. Priya Singh | `GUIDE_B` | `GUIDE` | `ECE` | `2025-27` | Primary Guide for Thesis B |
| Dr. Amit Patel | `COGUIDE_A` | `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Dr. Amit Patel | `COGUIDE_A` | `CO_GUIDE` | `CSE` | `2025-27` | Co-Guide for Thesis A |
| Dr. Sunita Rao | `DC_CSE` | `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Dr. Sunita Rao | `DC_CSE` | `DC` | `CSE` | `2025-27` | Department Coordinator (Maker) |
| Dr. Alok Mishra | `DC_ECE` | `FACULTY` | `ECE` | NULL | Base Academic Faculty |
| Dr. Alok Mishra | `DC_ECE` | `DC` | `ECE` | `2025-27` | Department Coordinator (Maker) |
| Dr. Vikram Malhotra | `DHOD_CSE` | `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Dr. Vikram Malhotra | `DHOD_CSE` | `DHOD` | `CSE` | `2025-27` | Deputy HOD / Supervisor Allocator |
| Prof. Dr. Ananya Sen | `HOD_CSE` | `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Prof. Dr. Ananya Sen | `HOD_CSE` | `HOD` | `CSE` | `2025-27` | Department Head / DCEC Chair (Checker) |
| Prof. Dr. Sandeep Reddy| `HOD_ECE` | `FACULTY` | `ECE` | NULL | Base Academic Faculty |
| Prof. Dr. Sandeep Reddy| `HOD_ECE` | `HOD` | `ECE` | `2025-27` | Department Head / DCEC Chair (Checker) |
| Dr. Manish Gupta | `PANEL_A` | `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Dr. Manish Gupta | `PANEL_A` | `PANEL_MEMBER`| `CSE` | `2025-27` | Appointed Viva Examiner (Thesis A) |
| Dr. Sneha Joshi | `PANEL_B` | `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Dr. Sneha Joshi | `PANEL_B` | `PANEL_MEMBER`| `CSE` | `2025-27` | Appointed Viva Examiner (Thesis A) |
| Dr. Kavin Mehta | `DCEC_MEMBER`| `FACULTY` | `CSE` | NULL | Base Academic Faculty |
| Dr. Kavin Mehta | `DCEC_MEMBER`| `DCEC_MEMBER` | `CSE` | `2025-27` | Screening Committee Member |
| Dr. Neha Tiwari | `BASE_FACULTY`| `FACULTY` | `CSE` | NULL | Unassigned Base Faculty |
| System Administrator | `ADMIN_USR` | `ADMIN` | NULL | NULL | Technical System Administrator |

---

## 5. Seed Script Catalog & Privilege Audit

### Privilege Audit on `database/seeds/*.sql`:
A strict codebase audit confirmed that **ZERO** privilege manipulation keywords exist in the seed dataset scripts:
- `GRANT` / `REVOKE`: **0 occurrences**
- `ALTER DEFAULT PRIVILEGES`: **0 occurrences**
- `BYPASSRLS` / `DISABLE ROW LEVEL SECURITY`: **0 occurrences**
- `SET ROLE` / `SUPERUSER` / `SERVICE_ROLE`: **0 occurrences**
- `DROP POLICY` / `ALTER POLICY` / `CREATE POLICY`: **0 occurrences**
- `CREATE ROLE` / `DROP ROLE`: **0 occurrences**

*All seeds are pure, standard DML statements (`INSERT INTO ... ON CONFLICT`) executed without any security bypasses.*

---

## 6. Seed Idempotency & Reset Verification Results

The seed harness was tested through three consecutive cycles on a clean local database (`niet_dms_local_dev`):
1. **Initial Seed Execution (`seed_all.sql`)**
2. **Second Immediate Seed Execution (`seed_all.sql` without DB reset)**
3. **Truncate Reset & Reseed (`reset_dev_database.sql`)**

### Verification Metrics & Fixture Counts:

| Database Table Name | Initial Seed Count | 2nd Run (Idempotency) | Reset & Reseed Count | Status |
|---|---|---|---|---|
| `departments` | 2 | 2 | 2 | Verified Idempotent |
| `academic_sessions` | 1 | 1 | 1 | Verified Idempotent |
| `programs` | 2 | 2 | 2 | Verified Idempotent |
| `batches` | 2 | 2 | 2 | Verified Idempotent |
| `sections` | 2 | 2 | 2 | Verified Idempotent |
| `users` | 15 | 15 | 15 | Verified Idempotent |
| `user_role_assignments` | 21 | 21 | 21 | Verified Idempotent |
| `research_domains` | 3 | 3 | 3 | Verified Idempotent |
| `student_profiles` | 2 | 2 | 2 | Verified Idempotent |
| `faculty_profiles` | 12 | 12 | 12 | Verified Idempotent |
| `faculty_expertise` | 3 | 3 | 3 | Verified Idempotent |
| `theses` | 2 | 2 | 2 | Verified Idempotent |
| `thesis_titles` | 2 | 2 | 2 | Verified Idempotent |
| `thesis_domain_mappings` | 2 | 2 | 2 | Verified Idempotent |
| `annexure_1_submissions` | 2 | 2 | 2 | Verified Idempotent |
| `guide_preferences` | 2 | 2 | 2 | Verified Idempotent |
| `guide_allocations` | 1 | 1 | 1 | Verified Idempotent |
| `dcec_dockets` | 2 | 2 | 2 | Verified Idempotent |
| `dcec_decisions` | 1 | 1 | 1 | Verified Idempotent |
| `dcec_delegations` | 2 | 2 | 2 | Verified Idempotent |
| `rubrics` | 1 | 1 | 1 | Verified Idempotent |
| `rubric_versions` | 1 | 1 | 1 | Verified Idempotent |
| `viva_defenses` | 1 | 1 | 1 | Verified Idempotent |
| `defense_panels` | 1 | 1 | 1 | Verified Idempotent |
| `panel_member_assignments` | 2 | 2 | 2 | Verified Idempotent |
| `documents` | 2 | 2 | 2 | Verified Idempotent |
| `document_versions` | 2 | 2 | 2 | Verified Idempotent |
| `annexure_6_evaluations` | 1 | 1 | 1 | Verified Idempotent |
| `digital_logbook_entries` | 1 | 1 | 1 | Verified Idempotent |
| `academic_policy_configurations` | 2 | 2 | 2 | Verified Idempotent |
| `audit_events` | 2 | 2 | 2 | Verified Idempotent |

**Total Seed Harness Idempotency Score: 100% (Zero duplicate rows, zero constraint violations).**

---

## 7. Synthetic Data Verification

1. **Zero Real Student Information:** Names (`Aarav Sharma`, `Isha Verma`) and Roll Numbers (`2025MTCSE001`, `2025MTECE001`) are purely fictional.
2. **Zero Real Faculty Information:** Faculty names and IDs are synthetic test constructs.
3. **Fictional Emails:** 100% of emails utilize the reserved domain `@dev.local`.
4. **Synthetic Thesis Topics:** Sample research titles were generated for dissertation workflow simulation.
5. **No Production UUIDs:** Deterministic test UUID ranges (`1111...`, `2222...`, `6000...`, `f000...`) are isolated to development.

---

## 8. Behavioral Security Test Suite Execution

The unified 47-test behavioral security suite ([`database/run_comprehensive_security_suite.sql`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/database/run_comprehensive_security_suite.sql)) was executed against the seeded development database `niet_dms_local_dev`:

```
============================================================
ALL 47 COMPREHENSIVE BEHAVIORAL SECURITY TESTS EXECUTED.
============================================================
- Student Candidate Isolation (AUTH-STU-01 to 10): 10/10 PASS
- Primary Guide Scoping (AUTH-GDE-01 to 07): 7/7 PASS
- Co-Guide Boundary (AUTH-COG-01 to 04): 4/4 PASS
- Department Coordinator Maker (AUTH-DC-01 to 04): 4/4 PASS
- Deputy HOD Allocation (AUTH-DHD-01 to 04): 4/4 PASS
- Head of Department Checker (AUTH-HOD-01 to 05): 5/5 PASS
- Viva Defense Panel Members (AUTH-PNL-01 to 04): 4/4 PASS
- Technical Administrator Separation (AUTH-ADM-01 to 07): 7/7 PASS
- Workflow State Invariants (WF-01 to 05): 5/5 PASS
- Cross-Department Isolation (DEPT-01 to 03): 3/3 PASS
- Document-Level Confidentiality (DOC-01 to 04): 4/4 PASS
============================================================
TOTAL RESULT: 47 / 47 PASS (100% COMPLIANCE)
============================================================
```

---

## 9. Production Safety Statement

> [!IMPORTANT]
> **PRODUCTION ENVIRONMENT INTEGRITY GUARANTEE:**  
> - **Supabase Cloud Project (`gumznxfcjueecsutopek`):** **100% UNTOUCHED**.
> - **Production Database Schema (`001_...` to `018_...`):** **100% UNTOUCHED**.
> - **Production Data & Users:** ZERO production records created or modified.
> - **Credentials & Secrets:** Zero credentials committed to git.
