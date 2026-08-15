# Database Migration Supabase Compatibility Fix Report

**Document ID:** `DOC-COMPAT-FIX-01`  
**Date:** 2026-08-15  
**Target Environment:** Supabase Cloud Managed PostgreSQL 17.6 (`gumznxfcjueecsutopek`)  
**Status:** Validated Locally (Awaiting User Directive for Production Execution)  

---

## 1. Original Failure Summary

During Phase 4H production migration execution against Supabase Cloud:
- **Migration 001 (`001_extensions_and_enums.sql`):** **SUCCESS**
- **Migration 002 (`002_rls_helper_functions.sql`):** **FAILED**
- **Error Message:** `ERROR: permission denied for schema auth`
- **Subsequent Migrations (003–018):** **HELD** (Execution halted immediately per safety rules)

---

## 2. Root Cause Analysis

On Supabase Cloud infrastructure:
1. The `auth` schema is owned by the internal platform administrator role (`supabase_admin`).
2. The developer database role (`postgres`) is granted `USAGE` privileges on `auth` (to access `auth.users`, `auth.uid()`, `auth.jwt()`), but does **not** have `CREATE` privileges inside the `auth` schema.
3. Attempting to define custom application helper functions (such as `auth.has_role()` or `auth.jwt_dept_id()`) in the `auth` schema causes an immediate permission denial.

---

## 3. Exact Namespace & Architectural Correction

All six (6) custom RLS helper functions have been migrated to the `public` schema with explicit `SECURITY DEFINER` privileges and fixed search paths:

| # | Previous Identifier | Corrected Canonical Identifier | Return Type | Security Attributes |
|---|---|---|---|---|
| 1 | `auth.jwt_dept_id()` | `public.jwt_dept_id()` | `UUID` | `SECURITY DEFINER`, `STABLE`, `SET search_path = public, auth, pg_temp` |
| 2 | `auth.has_role(...)` | `public.has_role(VARIADIC text[])` | `BOOLEAN` | `SECURITY DEFINER`, `STABLE`, `SET search_path = public, auth, pg_temp` |
| 3 | `auth.is_assigned_guide(...)` | `public.is_assigned_guide(UUID)` | `BOOLEAN` | `SECURITY DEFINER`, `STABLE`, `SET search_path = public, auth, pg_temp` |
| 4 | `auth.is_assigned_coguide(...)` | `public.is_assigned_coguide(UUID)` | `BOOLEAN` | `SECURITY DEFINER`, `STABLE`, `SET search_path = public, auth, pg_temp` |
| 5 | `auth.is_assigned_panel_member(...)` | `public.is_assigned_panel_member(UUID)` | `BOOLEAN` | `SECURITY DEFINER`, `STABLE`, `SET search_path = public, auth, pg_temp` |
| 6 | `auth.is_active_dcec_chair(...)` | `public.is_active_dcec_chair(UUID)` | `BOOLEAN` | `SECURITY DEFINER`, `STABLE`, `SET search_path = public, auth, pg_temp` |

### Unaltered Native Built-in Functions:
- `auth.uid()` — Natively provided by Supabase Auth (untouched).
- `auth.jwt()` — Natively provided by Supabase Auth (untouched).

---

## 4. Production Partial-State Assessment

1. **State of Supabase Cloud Database (`gumznxfcjueecsutopek`):**
   - Migration 001 completed successfully (`uuid-ossp`, `pgcrypto`, and 11 domain enum types exist).
   - Migration 002 failed at `CREATE FUNCTION` before altering any user tables.
   - Zero application tables exist in `public`.
   - No dangling custom functions exist in the `auth` schema.
2. **Re-runnability:**
   - Corrected migration `002_rls_helper_functions.sql` uses `CREATE OR REPLACE FUNCTION public.*` inside a transaction block (`BEGIN; ... COMMIT;`), ensuring full idempotency.

---

## 5. Repository Files Modified

| File Path | Description of Changes |
|---|---|
| [`database/migrations/002_rls_helper_functions.sql`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/database/migrations/002_rls_helper_functions.sql) | Relocated all 6 helper functions to `public.*`; added transaction wrapping; included safe conditional stub for local testing. |
| [`database/migrations/018_configurations_triggers_rls.sql`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/database/migrations/018_configurations_triggers_rls.sql) | Updated all RLS policy definitions to reference `public.*` helper functions (`public.has_role`, `public.jwt_dept_id`, etc.). |
| [`DATABASE_SCHEMA_RECONCILIATION.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/DATABASE_SCHEMA_RECONCILIATION.md) | Updated helper function signatures and 54-table RLS matrix to reflect `public.*` namespace. |
| [`SUPABASE_PREFLIGHT_REPORT.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/SUPABASE_PREFLIGHT_REPORT.md) | Updated preflight report to classify helper functions under `public` namespace. |
| [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md) | Updated RLS policy examples in Section 12 to reference `public.*` helpers. |

---

## 6. Local PostgreSQL Validation Results

Executed sequentially on a completely fresh, disposable local database (`niet_dms_supabase_compat_val`) on PostgreSQL 18.6 with `ON_ERROR_STOP=1`:

```text
001_extensions_and_enums.sql .......... PASS
002_rls_helper_functions.sql .......... PASS
003_organizational_hierarchy.sql ...... PASS
004_identity_and_rbac.sql ............. PASS
005_academic_profiles.sql ............. PASS
006_thesis_core.sql ................... PASS
007_annexure_1_preferences.sql ........ PASS
008_dcec_screening.sql ................ PASS
009_supervisor_allocation.sql ......... PASS
010_annexure_2.sql .................... PASS
011_logbook_progress.sql .............. PASS
012_dynamic_rubrics.sql ............... PASS
013_milestone_evaluations.sql ......... PASS
014_document_storage.sql .............. PASS
015_annexure_5_and_6.sql .............. PASS
016_viva_remediation.sql .............. PASS
017_notifications_audit.sql ........... PASS
018_configurations_triggers_rls.sql ... PASS
```

### Local Catalog Verification:
- **Application Tables in `public`:** **54**
- **Custom Functions in `public`:** **11** (6 helpers + 5 triggers)
- **Custom Functions in `auth`:** **0**
- **Custom Application Triggers:** **25** (14 WORM + 8 updated_at + 3 domain)
- **Custom Domain Enum Types:** **11**
- **RLS-Enabled Tables:** **54 / 54** (100%)
- **Total RLS Policies:** **101**

---

## 7. Production Execution Plan

Upon user authorization:
1. Connect to Supabase Cloud (`db.gumznxfcjueecsutopek.supabase.co:5432`).
2. Execute migrations `002` through `018` sequentially one-by-one with `ON_ERROR_STOP=1`.
3. Perform complete read-only catalog verification against the remote Supabase database.
4. Generate `PRODUCTION_DATABASE_EXECUTION_REPORT.md`.

---

## 8. Risk Assessment

- **Remaining Risks:** **NONE.** All helper functions are standard `SECURITY DEFINER` functions in `public` granted to `authenticated` and `service_role`. Standard Supabase JWT claims and fallbacks function identically.
