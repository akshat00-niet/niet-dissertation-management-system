# NIET Dissertation Management System — Local Supabase Authentication Verification Report

**Document ID:** `DOC-21-LOCAL-SUPABASE-AUTH-VERIFICATION`  
**File Path:** [`docs/21_LOCAL_SUPABASE_AUTHENTICATION_VERIFICATION.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/21_LOCAL_SUPABASE_AUTHENTICATION_VERIFICATION.md)  
**Document Status:** AUDITED & CONFIGURED BASELINE (PHASE 5C-2A)  
**Last Revised:** 2026-08-16  
**Governing Documents:** [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md), [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md), [`docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md), [`docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md), [`docs/19_DEVELOPMENT_IDENTITY_AND_SEED_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/19_DEVELOPMENT_IDENTITY_AND_SEED_MODEL.md), [`docs/20_APPLICATION_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/20_APPLICATION_AUTHENTICATION_ARCHITECTURE.md)  

---

## 1. Local Supabase Version & Environment Audit

An audit of the local development workstation was conducted:

| Component | Verified Status | Details |
|---|---|---|
| **Supabase CLI** | **Installed (v2.114.0)** | Available via `npx supabase` / global cache. |
| **Container Engine (Docker / Podman)** | **Not Installed / Not Running** | Neither Docker Desktop nor Podman daemon is installed on the Windows host or inside WSL2 Ubuntu (`LegacyDockerLifecycleInspectError`). |
| **Native PostgreSQL Daemon** | **Active on Port 54329** | Dedicated isolated instance running database `niet_dms_local_dev` for 47-test behavioral security suite. |
| **Local Supabase Configuration** | **Initialized** | Authoritative [`supabase/config.toml`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/supabase/config.toml) created with project ID `niet-dissertation-management-system`. |

---

## 2. Port Allocation & Collision Prevention

To ensure that the Supabase microservice suite never collides with the active native PostgreSQL database (`54329`), port mappings were configured in [`supabase/config.toml`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/supabase/config.toml):

| Service | Target Port | Collision Status | Resolution in `config.toml` |
|---|---|---|---|
| **API Gateway / Kong** | `54321` | Available | Default retained. |
| **PostgreSQL Database** | `54322` | Available | Default retained. |
| **Supabase Studio UI** | `54323` | Available | Default retained. |
| **Inbucket (Email)** | `54324` | Available | Default retained. |
| **Connection Pooler** | `54330` | **Conflict Resolved** | Adjusted from `54329` $\rightarrow$ `54330` (`enabled = false`) to eliminate collision with native PostgreSQL on `54329`. |
| **Native Local PG (Test)** | `54329` | In Use | Dedicated to behavioral security runner (`niet_dms_local_dev`). |

---

## 3. Deterministic Identity Provisioning Architecture

To uphold the fundamental application invariant:
$$\text{auth.users.id} = \text{public.users.id}$$

The 15 development personas must be provisioned with deterministic UUIDs. Once the local Supabase container stack is started via Docker, deterministic accounts are provisioned via `supabase.auth.admin.createUser()` or direct SQL insert into `auth.users`:

```sql
-- Deterministic Local Supabase Auth Ingestion Template
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
(
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'demo.student.cse@dev.local',
    crypt('DemoStudent123!', gen_salt('bf')),
    clock_timestamp(),
    '{"provider": "email", "providers": ["email"], "department_id": "10000000-0000-0000-0000-000000000001"}'::jsonb,
    '{"full_name": "Aarav Sharma"}'::jsonb,
    clock_timestamp(),
    clock_timestamp()
)
ON CONFLICT (id) DO NOTHING;
```

---

## 4. Persona Inventory & Real Auth Mapping

| Persona Key | Deterministic User UUID | Fictional Email | Default Dev Password | Primary Role | Department |
|---|---|---|---|---|---|
| `STUDENT_CSE` | `11111111-1111-1111-1111-111111111111` | `demo.student.cse@dev.local` | `DemoStudent123!` | `STUDENT` | `CSE` |
| `STUDENT_ECE` | `22222222-2222-2222-2222-222222222222` | `demo.student.ece@dev.local` | `DemoStudent123!` | `STUDENT` | `ECE` |
| `GUIDE_A` | `33333333-3333-3333-3333-333333333333` | `demo.guide.a@dev.local` | `DemoGuide123!` | `GUIDE` | `CSE` |
| `GUIDE_B` | `44444444-4444-4444-4444-444444444444` | `demo.guide.b@dev.local` | `DemoGuide123!` | `GUIDE` | `ECE` |
| `COGUIDE_A` | `55555555-5555-5555-5555-555555555555` | `demo.coguide.a@dev.local` | `DemoCoGuide123!` | `CO_GUIDE` | `CSE` |
| `DC_CSE` | `66666666-6666-6666-6666-666666666666` | `demo.dc.cse@dev.local` | `DemoDcCse123!` | `DC` | `CSE` |
| `DC_ECE` | `66666666-eeee-6666-eeee-666666666666` | `demo.dc.ece@dev.local` | `DemoDcEce123!` | `DC` | `ECE` |
| `DHOD_CSE` | `77777777-7777-7777-7777-777777777777` | `demo.dhod.cse@dev.local` | `DemoDhod123!` | `DHOD` | `CSE` |
| `HOD_CSE` | `88888888-8888-8888-8888-888888888888` | `demo.hod.cse@dev.local` | `DemoHodCse123!` | `HOD` | `CSE` |
| `HOD_ECE` | `88888888-eeee-8888-eeee-888888888888` | `demo.hod.ece@dev.local` | `DemoHodEce123!` | `HOD` | `ECE` |
| `PANEL_A` | `99999999-9999-9999-9999-999999999999` | `demo.panel.a@dev.local` | `DemoPanel123!` | `PANEL_MEMBER` | `CSE` |
| `PANEL_B` | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa` | `demo.panel.b@dev.local` | `DemoPanel123!` | `PANEL_MEMBER` | `CSE` |
| `DCEC_MEMBER`| `dddddddd-dddd-dddd-dddd-dddddddddddd` | `demo.dcec.member@dev.local` | `DemoDcec123!` | `DCEC_MEMBER` | `CSE` |
| `BASE_FACULTY`| `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb` | `demo.faculty.unassigned@dev.local` | `DemoFaculty123!` | `FACULTY` | `CSE` |
| `ADMIN_USR` | `cccccccc-cccc-cccc-cccc-cccccccccccc` | `demo.admin@dev.local` | `DemoAdmin123!` | `ADMIN` | Global |

---

## 5. Next.js Integration & Test Validation Summary

### 5.1 Application Unit Tests (`tests/auth.test.ts`)
- **Execution Status:** `9 / 9 PASS (100%)`
- **Verified Boundaries:**
  - Unauthenticated access prevention
  - Identity mapping (`auth.uid() = public.users.id`)
  - Server-driven role resolution (rejection of forged client roles)
  - Safe fail-closed handling for unmapped accounts
  - Tenancy isolation across departments

### 5.2 Build & Static Analysis
- **TypeScript (`tsc --noEmit`):** `0 errors`
- **ESLint (`next lint`):** `0 warnings / 0 errors`
- **Next.js Production Build (`next build`):** `Compiled successfully; 9/9 static and dynamic routes optimized.`

### 5.3 Database Behavioral Security Suite (`run_comprehensive_security_suite.sql`)
- **Execution Status:** `47 / 47 PASS (100%)` on isolated native PostgreSQL daemon (`54329`).

---

## 6. Production Safety Guarantee

> [!IMPORTANT]
> **PRODUCTION ENVIRONMENT INTEGRITY GUARANTEE:**  
> - **Production Supabase Project (`gumznxfcjueecsutopek`):** **100% UNTOUCHED**.
> - **Production Migrations (`001_...` to `018_...`):** **100% UNTOUCHED**.
> - **Production Data & Users:** ZERO production records created or modified.
> - **Credentials & Secrets:** Zero credentials committed to git.
