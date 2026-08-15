# NIET Dissertation Management System — RBAC & RLS Security Verification Report

**Document ID:** `DOC-18-SECURITY-VERIFICATION-REPORT`  
**File Path:** [`docs/18_RBAC_RLS_SECURITY_VERIFICATION_REPORT.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/18_RBAC_RLS_SECURITY_VERIFICATION_REPORT.md)  
**Execution Phase:** PHASE 5A.6 — SECURITY TEST HARNESS AUDIT & RECONCILIATION  
**Execution Timestamp:** 2026-08-16T00:57:47+05:30  
**Test Engine:** PostgreSQL 18.6 on x86_64-windows (Port `54329`, Database: `niet_dms_behavioral_security_test`)  
**Target Production Engine:** Supabase Managed Cloud (PostgreSQL 17.6 in `ap-south-1`)  
**Production Status:** **UNTOUCHED (ZERO PRODUCTION IMPACT)**  
**Governing Documents:** [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md), [`docs/14_TEST_PLAN.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/14_TEST_PLAN.md), [`docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md), [`docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md)  

---

## 1. Test Harness Architecture & Trustworthiness Audit

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              TEST HARNESS ARCHITECTURE AUDIT                           │
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ Dimension                     │ Audited Configuration & Verdict                        │
├───────────────────────────────┼────────────────────────────────────────────────────────┤
│ Test Role (`authenticated`)   │ rolsuper = FALSE, rolbypassrls = FALSE, rolcanlogin = F│
│ Table Ownership               │ All 54 tables owned by postgres; NOT test runner       │
│ RLS Status                    │ relrowsecurity = TRUE on all 54 tables                 │
│ Session Configuration         │ set_test_user() is SECURITY INVOKER; does not elevate  │
│ JWT / Sub Claim Resolution    │ Emulates PostgREST SET LOCAL request.jwt.claim.sub     │
│ Privilege Boundary            │ Test queries execute strictly as non-superuser         │
│ Harness Verdict               │ TRUSTWORTHY                                            │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

### 1.1 Authenticated Role Privilege Verification
Inspection of `pg_roles` confirmed the exact properties of the test execution role:
```sql
SELECT rolname, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = 'authenticated';
-- Result: authenticated | rolsuper = f | rolbypassrls = f | rolcreaterole = f | rolcreatedb = f
```
The test suite executes queries under a role that cannot bypass RLS.

### 1.2 Table Ownership & RLS Enforcement Verification
Inspection of `pg_class` confirmed:
1. Every table in schema `public` is owned by `postgres`.
2. Every table has `relrowsecurity = TRUE`.
3. When `authenticated` queries any table, PostgreSQL unconditionally evaluates the active RLS policy.

---

## 2. JWT & Identity Simulation Analysis

```
┌───────────────────────────────────────┬────────────────────────────────────────┐
│       LOCAL TEST IDENTITY HARNESS     │       REAL SUPABASE AUTH (GOTRUE)      │
├───────────────────────────────────────┼────────────────────────────────────────┤
│ • set_test_user(UUID, DEPT_ID)        │ • PostgREST parses incoming Bearer JWT │
│ • SET request.jwt.claim.sub = '<uuid>'│ • Sets request.jwt.claim.sub in session│
│ • SET request.jwt.claims = '{...}'    │ • Sets request.jwt.claims in session   │
│ • auth.uid() returns sub setting      │ • auth.uid() reads sub claim from JWT  │
│ • auth.jwt() returns claims JSONB     │ • auth.jwt() reads claims JSONB        │
└───────────────────────────────────────┴────────────────────────────────────────┘
```

The test harness uses the exact same session variable mechanism that Supabase PostgREST uses when handling incoming API requests.

---

## 3. Fixture Inventory (Development Personas)

All fixtures use deterministic test UUIDs and contain zero real institutional data:

| Persona Key | User UUID | Assigned Roles | Department | Scope / Theses |
|---|---|---|---|---|
| `STUDENT_A` | `11111111-1111-1111-1111-111111111111` | `STUDENT` | `CSE` (`1000...0001`) | Owns Thesis A (`6000...0001`) |
| `STUDENT_B` | `22222222-2222-2222-2222-222222222222` | `STUDENT` | `CSE` (`1000...0001`) | Owns Thesis B (`6000...0002`) |
| `GUIDE_A` | `33333333-3333-3333-3333-333333333333` | `FACULTY`, `GUIDE` | `CSE` (`1000...0001`) | Primary Guide for Thesis A |
| `GUIDE_B` | `44444444-4444-4444-4444-444444444444` | `FACULTY`, `GUIDE` | `CSE` (`1000...0001`) | Primary Guide for Thesis B |
| `COGUIDE_A` | `55555555-5555-5555-5555-555555555555` | `FACULTY`, `CO_GUIDE` | `CSE` (`1000...0001`) | Co-Guide for Thesis A |
| `DC_CSE` | `66666666-6666-6666-6666-666666666666` | `FACULTY`, `DC` | `CSE` (`1000...0001`) | Dept Coordinator (Maker) |
| `DHOD_CSE` | `77777777-7777-7777-7777-777777777777` | `FACULTY`, `DHOD` | `CSE` (`1000...0001`) | Deputy HOD / Supervisor Allocator |
| `HOD_CSE` | `88888888-8888-8888-8888-888888888888` | `FACULTY`, `HOD`, `DCEC_CHAIR` | `CSE` (`1000...0001`) | Dept Head / Default DCEC Chair |
| `PANEL_A` | `99999999-9999-9999-9999-999999999999` | `FACULTY`, `PANEL_MEMBER` | `CSE` (`1000...0001`) | Appointed Examiner for Thesis A |
| `PANEL_B` | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | `FACULTY`, `PANEL_MEMBER` | `CSE` (`1000...0001`) | Appointed Examiner for Thesis A |
| `RANDOM_FAC` | `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | `FACULTY` | `CSE` (`1000...0001`) | Base faculty (Unassigned) |
| `ADMIN_USR` | `cccccccc-cccc-cccc-cccc-cccccccccccc` | `ADMIN` | Global / Technical | Technical System Administrator |

---

## 4. Reconciled 47-Test Execution Suite

| Test Group | Tests Planned | Tests Executed | Tests Passed | Pass Rate |
|---|:---:|:---:|:---:|:---:|
| 1. Student Candidate Isolation | 10 | 10 | 10 | 100% |
| 2. Primary Guide Assignment Scoping | 7 | 7 | 7 | 100% |
| 3. Co-Guide Access Boundary (OD-014) | 4 | 4 | 4 | 100% |
| 4. Department Coordinator (DC — Maker) | 4 | 4 | 4 | 100% |
| 5. Deputy HOD (DHOD — Allocation) | 4 | 4 | 4 | 100% |
| 6. Head of Department (HOD — Checker) | 5 | 5 | 5 | 100% |
| 7. Oral Defense Panel Members | 4 | 4 | 4 | 100% |
| 8. Technical Administrator Separation | 7 | 7 | 7 | 100% |
| 9. Workflow State Invariants | 5 | 5 | 5 | 100% |
| 10. Department Tenancy Isolation | 3 | 3 | 3 | 100% |
| 11. Document-Level Confidentiality | 4 | 4 | 4 | 100% |
| **TOTAL TEST BATTERY** | **47** | **47** | **47** | **100%** |

---

## 5. False-Positive Analysis & Denial Mechanism Verification

Every negative test (`DENY`) was analyzed to ensure it did NOT pass for a trivial or unrelated reason:

1. **Test `AUTH-STU-02` (Cross-Student Thesis Read):** Target Thesis B exists in database. Student A queries `id = Thesis B`. Returned **0 rows** strictly because `p_theses_select` evaluates `student_id = auth.uid()`.
2. **Test `AUTH-STU-06` (Cross-Student Annexure 1):** Student A submits valid columns for Thesis B. Database throws `ERROR: new row violates row-level security policy for table "annexure_1_submissions"`.
3. **Test `AUTH-STU-07` (Annexure 6 Lockout):** Annexure 6 record exists on Thesis A. Student A queries own thesis. Returned **0 rows** strictly because `public.has_role('STUDENT') = FALSE` failed.
4. **Test `AUTH-DC-02` (Maker Approving Docket):** Docket exists and is valid. DC attempts to insert decision. Throws RLS violation because DC is not active DCEC chair.
5. **Test `WF-03` (Revoked Delegation):** When active delegation is revoked, `public.is_active_dcec_chair()` returns `FALSE`, and decision insertion throws RLS violation.

---

## 6. PostgreSQL Version Note

- **Local Test Environment:** Scoop PostgreSQL 18.6 on Windows x86_64.
- **Supabase Cloud Production:** PostgreSQL 17.6 on Linux x86_64.
- **Assessment:** *Test environment PostgreSQL version differs from production; no relevant behavior difference identified for the tested security mechanisms (RLS, SECURITY DEFINER functions, session settings, triggers, constraints).*

---

## 7. Storage Testing Status

- **Database Document Metadata & Version RLS:** **EXECUTED & VERIFIED (100% PASS)**.
- **Supabase Storage S3 Objects:** **NOT EXECUTED — SUPABASE STORAGE ENVIRONMENT REQUIRED**.
  - Database RLS on `documents` and `document_versions` is completely verified.
  - Live HTTP binary object downloads depend on Supabase Storage API hooks, which will be verified during application integration.

---

## 8. Final Security Scope & Statement

> [!IMPORTANT]
> **FINAL SECURITY VERIFICATION STATEMENT:**  
> - **100% of the executed behavioral authorization tests passed in the isolated test environment (47/47 PASS).**
> - **Security verification is limited to the executed test scope.**
> - **Production Safety:** ZERO rows created, modified, or deleted in Supabase Cloud production (`gumznxfcjueecsutopek`). ZERO production schema, functions, triggers, or policies altered.
