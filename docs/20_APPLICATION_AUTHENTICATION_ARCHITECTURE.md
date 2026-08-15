# NIET Dissertation Management System — Application Authentication & Foundation Architecture

**Document ID:** `DOC-20-APP-AUTH-ARCHITECTURE`  
**File Path:** [`docs/20_APPLICATION_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/20_APPLICATION_AUTHENTICATION_ARCHITECTURE.md)  
**Document Status:** AUTHORITATIVE APPLICATION BASELINE (PHASE 5C-1)  
**Last Revised:** 2026-08-16  
**Governing Documents:** [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md), [`docs/02_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/02_ARCHITECTURE.md), [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md), [`docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/16_IDENTITY_AUTHENTICATION_ARCHITECTURE.md), [`docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/17_RBAC_RLS_BEHAVIORAL_TEST_MATRIX.md), [`docs/19_DEVELOPMENT_IDENTITY_AND_SEED_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/19_DEVELOPMENT_IDENTITY_AND_SEED_MODEL.md)  

---

## 1. Executive Summary & Purpose

This document establishes the canonical **Next.js 14/15 App Router application foundation, Supabase SSR client architecture, server-side identity resolver, and role-aware route protection layer** for the NIET Dissertation Management System.

### Core Architectural Invariants:
1. **Never Connect Next.js Directly to PostgreSQL:** The web application accesses data exclusively through the Supabase Client / Server SDK (`@supabase/ssr`), preserving PostgreSQL Row Level Security (RLS) enforcement on all requests.
2. **Three-Tier Identity Model:**
   - **Database Fixtures (Phase 5B):** Synthetic database records for offline testing.
   - **Local Development Auth (Phase 5C):** Local Supabase GoTrue Auth issuing real JWTs.
   - **Production Auth:** Microsoft Entra ID (OIDC SSO) linked to Supabase Auth.
3. **Defense-in-Depth Authorization:** Application guards (`requireRole()`, `requireDepartmentAccess()`) provide server route protection, while PostgreSQL RLS remains the unbypassable final enforcement boundary.
4. **Zero Client Role Trust:** Roles and permissions are resolved exclusively from server queries to `public.user_role_assignments` and never accepted from browser headers, forms, or client cookies.

---

## 2. End-to-End Application Architecture

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

---

## 3. Supabase Client Architecture

The repository enforces strict separation between browser and server execution contexts:

### 3.1 Browser Client (`src/lib/supabase/client.ts`)
- Utilizes `createBrowserClient` from `@supabase/ssr`.
- Reads only public environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- **Security Rule:** Never imports or references `SUPABASE_SERVICE_ROLE_KEY`.

### 3.2 Server Client (`src/lib/supabase/server.ts`)
- Utilizes `createServerClient` from `@supabase/ssr`.
- Safely reads and manages HTTP-only authentication cookies via Next.js `cookies()` header utilities.
- Used across Server Components, Server Actions, and Route Handlers.

### 3.3 Session Refresh Middleware (`src/middleware.ts` & `src/lib/supabase/middleware.ts`)
- Intercepts incoming requests to refresh expired OAuth / JWT session tokens.
- Passes updated session cookies downstream in response headers.
- Automatically protects the `/app` route segment by redirecting unauthenticated visitors to `/login`.

---

## 4. Identity & Session Resolution Flow

```
Microsoft Entra ID (OIDC) / Local Supabase Auth
                   │
                   ▼
       auth.users (UUID, Email)
                   │
                   ▼
     public.users (Profile, Active Status)
                   │
                   ▼
public.user_role_assignments (Role Grants, Scopes)
                   │
                   ▼
    student_profiles / faculty_profiles
                   │
                   ▼
         Typed AppSession Model
```

### 4.1 Canonical Identity Invariant
$$\text{auth.users.id} = \text{public.users.id}$$

The identity resolver (`getCurrentUser()`) queries `public.users` matching `auth.uid()`. If an authenticated account has no corresponding record in `public.users`, it fails closed (`null`), preventing unregistered accounts from bypassing access gates.

### 4.2 Typed `AppSession` Model (`src/types/database.types.ts`)
```typescript
export interface AppSession {
  authUser: {
    id: string;
    email?: string;
  };
  appUser: User;
  roles: UserRoleAssignment[];
  activeRole: RoleType | null;
  activeDepartmentId: string | null;
  studentProfile: StudentProfile | null;
  facultyProfile: FacultyProfile | null;
}
```

---

## 5. Server Authorization Guards (`src/lib/auth/guards.ts`)

| Guard Function | Target Responsibility | Failure Behavior |
|---|---|---|
| `requireAuthenticatedUser()` | Enforces active session & `public.users` mapping. | Redirects to `/login` |
| `requireRole(role)` | Enforces specific role grant (e.g., `HOD`, `DC`). | Redirects to `/unauthorized?requiredRole=...` |
| `requireAnyRole([roles])` | Enforces membership in authorized role set. | Redirects to `/unauthorized?allowedRoles=...` |
| `requireDepartmentAccess(deptId)` | Enforces departmental tenancy or global Admin. | Redirects to `/unauthorized?reason=cross_department_denied` |

---

## 6. Route Structure & Shell Scope

```
src/app/
├── (auth)/
│   ├── auth/
│   │   ├── callback/route.ts   # OAuth code exchange & session establishment
│   │   └── logout/route.ts     # Supabase signOut & session termination
│   └── login/page.tsx          # Institutional SSO entry point
├── app/
│   └── page.tsx                # Authenticated Application Shell (Session & RLS verified)
├── unauthorized/page.tsx       # Access Denied / Insufficient role alert
├── globals.css                 # Institutional Design Tokens
├── layout.tsx                  # Root Layout
├── page.tsx                    # Landing redirect (to /app or /login)
├── loading.tsx                 # Global Loading State
└── error.tsx                   # Global Error Boundary
```

---

## 7. Environment Configuration Architecture

```env
# Application Environment
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Public Supabase Client (Anon Key Only)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Production Supabase Target:
# NEXT_PUBLIC_SUPABASE_URL=https://gumznxfcjueecsutopek.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key_here
```

---

## 8. Automated Testing & Verification

The application-level test suite (`tests/auth.test.ts`) verifies 9 critical security and session requirements with **100% PASS**:

1. **Unauthenticated Request:** Denied and returns null session.
2. **Authenticated Session:** Resolves user identity, roles, and profiles.
3. **Identity Invariant:** Confirms `auth.uid() = public.users.id`.
4. **Role Resolution:** Loaded strictly from `public.user_role_assignments`.
5. **No Client Role Spoofing:** Rejects forged client role claims.
6. **Session Destruction:** Invokes Supabase Auth `signOut()`.
7. **Unmapped Account Handling:** Fails closed safely if `public.users` missing.
8. **Role Set Matching:** `requireAnyRole()` grants authorized and denies unauthorized.
9. **Tenancy Isolation:** `requireDepartmentAccess()` blocks cross-department access.
