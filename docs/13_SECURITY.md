# NIET Dissertation Management System — Security Architecture

**Document ID:** `DOC-13-SEC`  
**File Path:** [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md)  
**Document Status:** ARCHITECTURE FREEZE BASELINE (PHASE 3I)  
**Last Revised:** 2026-08-15  
**Governing Baselines:** [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md), [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md), [`docs/02_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/02_ARCHITECTURE.md), [`docs/03_DOMAIN_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/03_DOMAIN_MODEL.md), [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/07_API_CONTRACTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/07_API_CONTRACTS.md), [`docs/08_AUDIT_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/08_AUDIT_MODEL.md), [`docs/09_FILE_STORAGE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/09_FILE_STORAGE.md), [`docs/10_NOTIFICATION_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/10_NOTIFICATION_MODEL.md), [`docs/11_UI_DESIGN_SYSTEM.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/11_UI_DESIGN_SYSTEM.md), and [`docs/12_ACCESSIBILITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/12_ACCESSIBILITY.md)  
**Institution:** Noida Institute of Engineering & Technology (NIET), Greater Noida  
**Target Program:** M.Tech / M.Tech Integrated Dissertation Platform  

---

## 1. Document Purpose & Security Objectives

This document establishes the definitive **Security Architecture** for the NIET Dissertation Management System (DMS). It defines conceptual threat models, trust boundaries, authentication requirements, authorization paradigms, RBAC security enforcement, resource-level access control, storage security, API security, audit security, input/output security, and all operational security requirements necessary to protect academic integrity, institutional data, and individual privacy.

> [!CAUTION]
> This is a DOCUMENTATION-ONLY phase. No application code, SQL, credentials, API keys, database tables, or packages have been created. Only `docs/13_SECURITY.md` has been modified.

### 1.1 Core Security Objectives Tied to the DMS

| Objective | Definition | DMS Application |
| :--- | :--- | :--- |
| **Confidentiality** | Prevent unauthorized disclosure of sensitive information. | Annexure 6 (Confidential Supervisor Evaluation) is permanently inaccessible to student candidates. Cross-student thesis data is fully isolated. |
| **Integrity** | Guarantee that data is accurate, complete, and untampered. | Academic decisions (allocations, evaluations, approvals) are immutable once committed. Audit records are append-only. File SHA-256 checksums validate physical integrity. |
| **Availability** | Ensure the system is reliably accessible to authorized users. | No single points of failure in the critical academic workflow path. Prototype V1 targets free-tier availability; production targets formal RPO/RTO (OPEN). |
| **Authenticity** | Verify that actors are who they claim to be. | Every authenticated session is verified by the identity provider before academic context is granted. Delegated authority is time-bound and audited. |
| **Accountability** | Ensure all actions are attributable to a specific actor. | Every state-changing action generates an immutable audit record capturing actor identity, role, resource, and timestamp. No anonymous academic decisions. |
| **Least Privilege** | Grant only the minimum permissions required. | Roles grant no excess permissions. Admin ≠ DCEC Chair. Guide access is strictly contextual to assigned theses. |
| **Defense in Depth** | Apply multiple overlapping security controls. | Security enforced at UI layer, API middleware, domain service, database RLS, and storage access-token tiers. |
| **Fail-Safe Behavior** | Default to denial when authorization state is uncertain. | Unknown or ambiguous access decisions default to `403 Forbidden`. Co-Guide access to Annexure 6 defaults to blocked pending policy resolution. |

---

## 2. Trust Boundaries

The DMS architecture defines six conceptual trust boundaries. Every data flow that crosses a boundary must be validated and re-authorized at the receiving side.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                            CONCEPTUAL TRUST BOUNDARY MAP                               │
├──────────────────────────────────────────────────────────────────────────────────────  ┤
│                                                                                        │
│  [UNTRUSTED ZONE]                                                                      │
│  ┌───────────────────────────────────────────────────────────┐                         │
│  │  Browser / Client (Zero Trust)                            │                         │
│  │  • All inputs untrusted                                   │                         │
│  │  • No secrets, no privileged state                        │                         │
│  │  • Client-side logic is NOT a security boundary           │                         │
│  └────────────────────┬──────────────────────────────────────┘                         │
│                       │ HTTPS/TLS (TB-01: Client → Application)                        │
│  [SEMI-TRUSTED ZONE]  ▼                                                                │
│  ┌───────────────────────────────────────────────────────────┐                         │
│  │  Application / API Layer (Contextual Trust)               │                         │
│  │  • Authenticates session tokens                           │                         │
│  │  • Enforces RBAC and academic context                     │                         │
│  │  • Validates all inputs                                   │                         │
│  └────────────────────┬──────────────────────────────────────┘                         │
│                       │ Internal Service Calls (TB-02: App → Database)                 │
│  [TRUSTED INTERNAL ZONE]  ▼                                                            │
│  ┌───────────────────────────────────────────────────────────┐                         │
│  │  Relational Database (PostgreSQL)                         │                         │
│  │  • Row-Level Security enforces tenancy isolation          │                         │
│  │  • ACID transactions enforce academic state integrity     │                         │
│  └───────────────────────────────────────────────────────────┘                         │
│                                                                                        │
│                       │ Pre-Signed URL Generation (TB-03: App → Storage)              │
│  [TRUSTED STORAGE]    ▼                                                                │
│  ┌───────────────────────────────────────────────────────────┐                         │
│  │  Object Storage (S3-Compatible / Private Bucket)          │                         │
│  │  • Private-by-default; no public URLs                     │                         │
│  │  • Short-lived signed tokens (15 minutes max)             │                         │
│  └───────────────────────────────────────────────────────────┘                         │
│                                                                                        │
│  ┌───────────────────────────────────────────────────────────┐                         │
│  │  Authentication Provider (TB-04: App → Auth Provider)     │                         │
│  │  • Provider: OPEN (not yet locked)                        │                         │
│  │  • Session tokens verified server-side, never client-only │                         │
│  └───────────────────────────────────────────────────────────┘                         │
│                                                                                        │
│  ┌───────────────────────────────────────────────────────────┐                         │
│  │  Notification Provider (TB-05: App → Notification Layer)  │                         │
│  │  • One-way push: no secrets exposed                       │                         │
│  │  • Content minimization enforced before dispatch          │                         │
│  └───────────────────────────────────────────────────────────┘                         │
│                                                                                        │
│  ┌───────────────────────────────────────────────────────────┐                         │
│  │  Technical Administrators / Academic Authorities (TB-06)  │                         │
│  │  • Admin ≠ DCEC Chair (strictly separated)                │                         │
│  │  • Academic authorities verified by academic role context │                         │
│  └───────────────────────────────────────────────────────────┘                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

**Trust Boundary Summary:**

| TB-ID | From | To | Security Control |
| :--- | :--- | :--- | :--- |
| `TB-01` | Browser / Client | Application / API | HTTPS/TLS, Session token validation, Input sanitization |
| `TB-02` | Application Layer | PostgreSQL Database | Parameterized queries, RLS policies, Least-privilege DB roles |
| `TB-03` | Application Layer | Object Storage | Server-generated pre-signed tokens, Authorization pre-check |
| `TB-04` | Application Layer | Authentication Provider | Server-side token verification; provider: **OPEN** |
| `TB-05` | Application Layer | Notification Provider | Content minimization, no secrets in payloads |
| `TB-06` | Human Operators | Platform | Role-based access; Admin ≠ Academic authority |

---

## 3. Authentication Architecture

### 3.1 Authentication Requirements

Authentication establishes the verified identity of every platform actor before any academic context or permission is granted.

**Core Requirements:**
- `SEC-AUTH-001`: Every API endpoint (except the public health check) requires a valid, server-verified session.
- `SEC-AUTH-002`: Session tokens must be transmitted exclusively via `HttpOnly`, `Secure`, `SameSite=Lax` cookies. Tokens must never be stored in `localStorage`, `sessionStorage`, or exposed as URL query parameters.
- `SEC-AUTH-003`: The identity provider validates credentials and issues session tokens. The application server verifies token validity on every protected request.
- `SEC-AUTH-004`: Failed authentication attempts must be rate-limited and logged to the security incident stream. Exact thresholds: **OPEN**.
- `SEC-AUTH-005`: Session expiry policy: **OPEN** (exact idle timeout and absolute expiry duration not yet confirmed by institutional stakeholders).
- `SEC-AUTH-006`: Logout must invalidate the session server-side. Client-side cookie deletion alone is insufficient.
- `SEC-AUTH-007`: Reauthentication must be required before executing high-privilege destructive actions (e.g., thesis archiving, system configuration changes). Exact re-auth trigger list: **OPEN**.

### 3.2 Institutional Identity Integration

- `SEC-AUTH-008`: The system is designed to integrate with an institutional identity provider (SAML 2.0 / OAuth 2.0). Exact provider and protocol: **OPEN** (`OD-009` from `docs/00_PROJECT_MASTER.md`).
- `SEC-AUTH-009`: For prototype V1, pre-seeded faculty and student accounts are used with provider-managed credential storage. No plaintext passwords are stored or logged in any tier.
- `SEC-AUTH-010`: Single Sign-On (SSO) integration with the NIET institutional ERP is an explicit non-goal for V1. Production SSO specifications: **OPEN**.

### 3.3 Account Lifecycle

- `SEC-AUTH-011`: User accounts are provisioned exclusively by `ROLE_ADMIN`. Students and faculty cannot self-register.
- `SEC-AUTH-012`: Account deactivation must revoke all active sessions. Deactivated users must not be able to re-authenticate.
- `SEC-AUTH-013`: Account recovery mechanisms and password reset policies: **OPEN** (institutional policy not yet provided).

### 3.4 Credential Handling

- `SEC-AUTH-014`: Passwords must never be stored in plaintext. The authentication provider manages credential hashing. Where custom credential handling is unavoidable, industry-standard adaptive hashing algorithms (e.g., bcrypt, Argon2) must be used. Exact algorithm: **OPEN** (pending provider selection).
- `SEC-AUTH-015`: Passwords must never appear in audit logs, application diagnostic logs, HTTP request/response payloads, or API error messages.

---

## 4. Authorization Architecture

### 4.1 Multi-Dimensional Authorization Predicate

The DMS authorization model evaluates six dimensions simultaneously. Role alone is never sufficient:

$$\text{Authorized}(U, A, R) = \text{Authenticated}(U) \land \text{HasRole}(U, A) \land \text{ScopeValid}(U, R) \land \text{RelationshipBound}(U, R) \land \text{StatePermits}(R, A) \land \text{TemporallyActive}(U, R)$$

Where:
- `U` = Authenticated User
- `A` = Attempted Action (Permission)
- `R` = Target Resource

```
AUTHORIZATION DECISION PIPELINE
┌──────────────────────────────────────────────────────────────────────────────┐
│ Step 1 │ Identity Verified?          → Is the session token valid?           │
│ Step 2 │ Role Grants Permission?     → Does the user's role permit action A? │
│ Step 3 │ Department Scope Matches?   → Is the resource in the user's dept?   │
│ Step 4 │ Relational Binding Valid?   → Is the user the owner / guide / panel?│
│ Step 5 │ Delegation Active?          → Is an active, unexpired delegation?   │
│ Step 6 │ Workflow State Permits?     → Is the entity in the required state?  │
│        │ → ALL SIX must pass. Any failure → 403 Forbidden.                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> UI visibility is strictly a user-experience enhancement — never an authorization boundary. Every authorization decision is made server-side at the API layer and database layer independently of UI state.

### 4.2 Authorization Anti-Patterns Prohibited

- `SEC-AUTHZ-001`: Never authorize based on client-submitted role strings.
- `SEC-AUTHZ-002`: Never authorize based on browser storage values (localStorage, sessionStorage, cookies other than the HttpOnly session cookie).
- `SEC-AUTHZ-003`: Never authorize based on hidden HTML form fields.
- `SEC-AUTHZ-004`: Never rely on frontend route guards as security controls.
- `SEC-AUTHZ-005`: Never grant access solely because a resource identifier (UUID) is known — all resource access requires authorization (IDOR prevention).

---

## 5. RBAC Security Model

The DMS uses the role model defined in [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md). No new roles are created here. This section defines how RBAC is enforced securely.

### 5.1 Role Inventory (from `docs/04_RBAC_MATRIX.md`)

| Role Identifier | Scope | Security Notes |
| :--- | :--- | :--- |
| `ROLE_STUDENT` | Own thesis only | Permanently denied Annexure 6 access. Denied all other students' data. |
| `ROLE_FACULTY` | Base identity | No thesis access without explicit assignment. |
| `ROLE_GUIDE` | Assigned thesis only | Contextually bound to `Thesis.GuideFacultyId = User.FacultyId`. |
| `ROLE_CO_GUIDE` | Assigned thesis only | Contextually bound to `Thesis.CoGuideFacultyId = User.FacultyId`. |
| `ROLE_DC` | Department scope | Cannot execute `DCEC_CHAIR_APPROVE`. Maker role only. |
| `ROLE_DHOD` | Department scope | Sole allocation authority. Can hold `DCEC_CHAIR` via active delegation. |
| `ROLE_HOD` | Department scope | Default DCEC Chair. Academic head. Does NOT hold technical admin powers. |
| `ROLE_DCEC_MEMBER` | Department scope | Committee reviewer only. Cannot execute approvals. |
| `ROLE_DCEC_CHAIR` | Delegation-scoped | HOD by default; D.HOD only when `DCECDelegation` is active and unexpired. |
| `ROLE_PANEL_MEMBER` | Assigned viva only | Bound to `Thesis.PanelAssignments`. Cannot evaluate unassigned candidates. |
| `ROLE_ADMIN` | Platform technical | ZERO academic approval, allocation, evaluation, or endorsement authority. |

### 5.2 Role Assignment Security

- `SEC-RBAC-001`: Role assignment is performed exclusively by `ROLE_ADMIN` via the `ROLE_ASSIGN` permission. No self-promotion is possible.
- `SEC-RBAC-002`: DCEC Chair authority delegation is created exclusively by `ROLE_HOD` via `DELEGATION_CREATE`. Only a `ROLE_DHOD` within the same department may receive delegation.
- `SEC-RBAC-003`: Delegation expiry is enforced by the server at evaluation time. Expired delegations never grant elevated authority.
- `SEC-RBAC-004`: All role assignment and delegation operations generate mandatory, immutable audit records (per `docs/08_AUDIT_MODEL.md`).
- `SEC-RBAC-005`: Role revocation must immediately invalidate any active session permissions derived from the revoked role.

### 5.3 Least Privilege Enforcement

- No role grants permissions beyond its documented scope in `docs/04_RBAC_MATRIX.md`.
- Cross-department access is explicit, scoped, and audited. No implicit cross-department data leakage.
- `ROLE_ADMIN` cannot escalate to academic roles without a separate, explicit academic role assignment by an authorized HOD.

### 5.4 Conflicting Permission Resolution

- `SoD-01`: DC (Maker) cannot simultaneously hold DCEC Chair (Checker) authority on the same docket.
- `SoD-02`: Guide and Co-Guide on the same thesis must be distinct faculty members.
- `SoD-03`: A faculty member's Guide Load and Co-Guide Load are separately enforced at ≤ 3 per session.
- `SoD-04`: Technical `ROLE_ADMIN` cannot concurrently hold contextual academic assignments within the same session (pending formal conflict-of-interest resolution: **OPEN**).

---

## 6. Academic Authority Boundaries

> [!CAUTION]
> This is a LOCKED INSTITUTIONAL REQUIREMENT. It must not be weakened, merged, or re-interpreted.

```
CRITICAL SEPARATION INVARIANT
┌─────────────────────────────────────────────────────────────────────────┐
│  ROLE_ADMIN   ──────────────────  NEVER EQUALS  ──────────────────────  │
│  (Technical)                                     DCEC_CHAIR_APPROVE     │
│                                                  (Academic Authority)   │
│                                                                         │
│  This separation is enforced at:                                        │
│  • API middleware (role check before academic action)                   │
│  • Domain service layer (academic context validator)                    │
│  • Database Row-Level Security (role-based write policies)              │
│  • Audit log (actor role recorded on every approval event)              │
└─────────────────────────────────────────────────────────────────────────┘
```

- `SEC-ACAD-001`: `DCEC_CHAIR_APPROVE`, `DCEC_CHAIR_REVISE`, and `DCEC_CHAIR_REJECT` permissions are programmatically blocked for any session authenticated under `ROLE_ADMIN` only.
- `SEC-ACAD-002`: `SUPERVISOR_ALLOCATE` and `SUPERVISOR_REALLOCATE` are permanently blocked for `ROLE_ADMIN`. Allocation authority belongs exclusively to `ROLE_DHOD`.
- `SEC-ACAD-003`: Grade submission (`MILESTONE_EVALUATE`, `VIVA_EVALUATE`, `RESULT_SIGN_OFF`) is permanently blocked for `ROLE_ADMIN`.
- `SEC-ACAD-004`: Any future feature request that would grant administrative accounts academic approval authority must be rejected and recorded as a formal requirement conflict.

---

## 7. Resource-Level Authorization

Every resource access is evaluated against a relational binding predicate. Possessing a role alone is not sufficient.

### 7.1 Contextual Binding Predicates

| Role | Target Resource | Required Predicate |
| :--- | :--- | :--- |
| `ROLE_STUDENT` | Thesis, Annexures | `Thesis.StudentId = User.StudentId` |
| `ROLE_GUIDE` | Thesis, Endorsements, Annexure 6 | `Thesis.GuideFacultyId = User.FacultyId` |
| `ROLE_CO_GUIDE` | Thesis, Endorsements | `Thesis.CoGuideFacultyId = User.FacultyId` |
| `ROLE_PANEL_MEMBER` | Viva Defense, Rubric | `User.FacultyId ∈ Thesis.PanelAssignments` |
| `ROLE_DCEC_CHAIR (HOD)` | DCEC Cases | `Case.DepartmentId = User.DepartmentId` |
| `ROLE_DCEC_CHAIR (D.HOD)` | DCEC Cases | `Case.DepartmentId = User.DepartmentId ∧ IsDelegationActive(User)` |
| `ROLE_DC` | Docket Preparation | `Thesis.DepartmentId = User.DepartmentId` |
| `ROLE_DHOD` | Allocation Workbench | `Thesis.DepartmentId = User.DepartmentId` |

- `SEC-RLAZ-001`: Every API handler for a thesis-scoped resource must verify the relational binding against the database state before processing the request.
- `SEC-RLAZ-002`: Relational bindings are never trusted from client-submitted request bodies or query parameters. They are verified exclusively from the server-side database state.

---

## 8. Annexure 6 Security (MANDATORY MULTI-LAYER LOCKOUT)

> [!CAUTION]
> LOCKED INSTITUTIONAL REQUIREMENT — STUDENT ACCESS TO ANNEXURE 6 IS PERMANENTLY DENIED.
> This restriction must be enforced at every layer of the architecture simultaneously.

### 8.1 Annexure 6 Access Policy

- **Authorized Readers:** Primary Guide (contextual), HOD (departmental), DCEC Chair (departmental), Panel Members (contextual).
- **Permanently Denied:** Student Candidates — in all workflow states, before or after defense.
- **Co-Guide Access:** OPEN — blocked by default until institutional policy is confirmed (`REQ-OD-004`).
- **Admin Access:** Denied. `ROLE_ADMIN` does not appear in the `ANNEXURE_6_VIEW` permission grant.

### 8.2 Multi-Layer Enforcement Model

```
ANNEXURE 6 DEFENSE-IN-DEPTH LOCKOUT

Layer 1 — UI Layer:
  • Zero tabs, buttons, links, or navigation items referencing Annexure 6 in the student portal.
  • Per docs/11_UI_DESIGN_SYSTEM.md §11 (Security-Aware UX).

Layer 2 — API Layer:
  • GET /api/v1/theses/{id}/annexure-6 returns 403 Forbidden for ROLE_STUDENT regardless of state.
  • Per docs/07_API_CONTRACTS.md §1 (Annexure 6 Strict Access Isolation).

Layer 3 — Authorization Engine:
  • Role check: ROLE_STUDENT → ANNEXURE_6_VIEW → DENIED (static rule, no exceptions).
  • Relational binding check: only authorized guide/HOD/DCEC/panel contexts pass.

Layer 4 — Database / RLS:
  • Row-Level Security policies block student sessions from reading SUPERVISOR_EVAL_ANNEXURE_6
    document rows at the data tier.
  • ROLE_STUDENT database session cannot access document_versions for ANNEXURE_6 document type.

Layer 5 — Storage Access Token:
  • Pre-signed URL generation for SUPERVISOR_EVAL_ANNEXURE_6 objects refuses student session contexts.
  • Short-lived tokens (15 minutes) generated only after authorization passes layers 1–4.

Layer 6 — Notification Layer:
  • No notification payloads sent to students contain Annexure 6 content or identifiers.
  • Per docs/10_NOTIFICATION_MODEL.md (data minimization).
```

### 8.3 Student Cannot Obtain Annexure 6 Via

| Attack Vector | Mitigation |
| :--- | :--- |
| Hidden UI element inspection | No DOM elements referencing Annexure 6 in student portal build |
| Manipulated API request with student session | API returns 403; authorization layer rejects |
| Guessed document UUID | Storage requires authorization token, not URL knowledge |
| Direct object storage URL | Private bucket; no public access; signed token required |
| Notification payload | Notifications never include Annexure 6 content or identifiers |
| Browser developer tools | Session cookie is HttpOnly; no privileged data in JS context |
| Alternate API path | All document paths check document type + caller role |
| Modified request headers claiming Guide role | Server-side role is extracted from validated session, not request headers |

---

## 9. IDOR Prevention

Insecure Direct Object Reference (IDOR) is one of the highest-risk vulnerability classes for the DMS given that academic resources (theses, evaluations, documents) are individually addressable.

- `SEC-IDOR-001`: Possession of a resource UUID (e.g., `/thesis/uuid`, `/document/uuid`) never grants access. Every access attempt requires server-side authorization evaluation.
- `SEC-IDOR-002`: All storage object keys use non-sequential, non-guessable UUIDs. Departmental namespace prefixes are included for isolation: `{dept_id}/{session_id}/{thesis_id}/{uuid}`.
- `SEC-IDOR-003`: API pagination and listing endpoints apply tenant-scope and role-scope filters server-side. Students never receive thesis listings that include other students' records.
- `SEC-IDOR-004`: Error responses for unauthorized resource access return `403 Forbidden`, not `404 Not Found`, to prevent resource existence enumeration for known IDs (except in exceptional UX cases where resource non-existence is intentional and safe).
- `SEC-IDOR-005`: Document download endpoints re-evaluate authorization on every request. A previously authorized download URL does not persist authorization beyond its signed expiry.

---

## 10. Privilege Escalation Prevention

### 10.1 Escalation Attack Vectors & Mitigations

| Attack Scenario | Mitigation |
| :--- | :--- |
| Client submits modified role claim in request body | Server extracts role exclusively from validated server-side session |
| Client submits `userId` of another user | Server ignores client-supplied userId; uses session actor only |
| Client submits target `thesisId` of another student | Resource-level binding check rejects if student ≠ thesis owner |
| Client sets `status = APPROVED` directly | State transition endpoints validate current state; direct status writes are blocked |
| Client calls privileged endpoint with student session | Role check blocks at authorization middleware |
| Client manipulates delegation claim | Delegation is validated against live database records, not client-submitted data |
| Frontend route guard bypass | Server-side authorization is independent of frontend routing |

- `SEC-PRIV-001`: All authorization state (role, department, thesis relationships, active delegations) is read exclusively from the server-side database at request time.
- `SEC-PRIV-002`: No privileged state is derived from request headers, cookies other than the session cookie, query parameters, or request body fields.
- `SEC-PRIV-003`: Workflow state transitions are executed only through dedicated transition endpoints that validate the current state machine position server-side. No direct entity status field writes from client.

---

## 11. Session Security

- `SEC-SESS-001`: Session tokens are transmitted exclusively via `HttpOnly; Secure; SameSite=Lax` cookies. Exact cookie attributes will be finalized at implementation.
- `SEC-SESS-002`: Absolute session expiry: **OPEN** (institutional policy not yet confirmed).
- `SEC-SESS-003`: Inactivity timeout: **OPEN**.
- `SEC-SESS-004`: Server-side session invalidation is required on logout. Session store must support explicit session revocation.
- `SEC-SESS-005`: Concurrent session behavior (single active session vs. multi-session): **OPEN**.
- `SEC-SESS-006`: Compromised session response procedure: The platform must support emergency session revocation for all sessions belonging to a specific user by an authorized administrator.
- `SEC-SESS-007`: Token rotation (refresh token mechanics): **OPEN** — dependent on the identity provider selection.
- `SEC-SESS-008`: Sessions established under a delegated DCEC Chair context expire when the delegation expires, regardless of session token validity. The authorization engine checks delegation validity at request time.

---

## 12. Password & Credential Security

- `SEC-CRED-001`: Passwords must never be stored in plaintext at any tier.
- `SEC-CRED-002`: Passwords must never appear in application logs, audit logs, diagnostic streams, API responses, or error messages.
- `SEC-CRED-003`: Credential storage and hashing is delegated to the chosen authentication provider. Custom authentication implementations must use industry-standard adaptive hashing. Exact algorithm: **OPEN** (pending provider selection).
- `SEC-CRED-004`: Password reset and account recovery mechanisms: **OPEN** (institutional policy not yet confirmed).
- `SEC-CRED-005`: Default or temporary credentials issued at account provisioning must be marked as immediately expiring, requiring forced change on first login.

---

## 13. API Security

Governed jointly by [`docs/07_API_CONTRACTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/07_API_CONTRACTS.md) and this document.

### 13.1 API Security Requirements

- `SEC-API-001`: Every protected endpoint verifies the session token server-side before processing any request.
- `SEC-API-002`: Authorization is evaluated at the API handler level using the full multi-dimensional predicate (identity + role + department + relational binding + workflow state).
- `SEC-API-003`: Request bodies are validated against strict schemas before processing. Extra fields are ignored or rejected.
- `SEC-API-004`: Path parameters (e.g., `thesisId`, `documentId`) are type-validated (UUID format check) before database queries.
- `SEC-API-005`: Pagination parameters (`page`, `limit`, `cursor`) are validated for type, range, and safe defaults. Unbounded queries are rejected.
- `SEC-API-006`: Request size limits are enforced at the API gateway / server level. Exact limits: **OPEN** (5 MB for file uploads in prototype per `docs/09_FILE_STORAGE.md`).
- `SEC-API-007`: API error responses use the standard `ApiErrorResponse` envelope from `docs/07_API_CONTRACTS.md`. Internal stack traces, SQL errors, and database schema details must never appear in client-facing error payloads.
- `SEC-API-008`: Rate limiting is applied to sensitive endpoints (see Section 28). Exact limits: **OPEN**.
- `SEC-API-009`: Anti-IDOR checks are applied to every resource-scoped endpoint.
- `SEC-API-010`: All state-changing operations generate an audit record via the immutable audit trail (per `docs/08_AUDIT_MODEL.md`).
- `SEC-API-011`: The `X-Correlation-ID` header is used for distributed tracing. Correlation IDs must never expose internal implementation details.
- `SEC-API-012`: Idempotency keys are supported for critical state transition operations to prevent duplicate academic actions on network retries.

---

## 14. Input Validation

- `SEC-INP-001`: All input validation occurs server-side. Client-side validation is a UX enhancement only.
- `SEC-INP-002`: Text fields (thesis titles, comments, meeting notes, evaluation remarks) are validated for maximum length, character set constraints, and stripped of leading/trailing whitespace. HTML tags are not trusted.
- `SEC-INP-003`: UUID identifiers (thesisId, documentId, userId) are validated against the UUID v4 format before database queries.
- `SEC-INP-004`: Enumerated values (workflow states, roles, document types) are validated against allowlists. Any value not in the allowlist is rejected.
- `SEC-INP-005`: Pagination parameters are constrained to defined ranges. `limit` has a maximum of 100 per `docs/07_API_CONTRACTS.md`.
- `SEC-INP-006`: Sort field parameters are validated against an allowlist of permitted sort columns. Dynamic ORDER BY from user input is prohibited.
- `SEC-INP-007`: Uploaded file validation includes: file size check, MIME type verification against server-side magic bytes (not client-supplied Content-Type alone), file extension check. Final allowed MIME type allowlist: **OPEN** (PDF and common document formats expected; exact list pending).
- `SEC-INP-008`: Configuration values submitted through admin interfaces are validated for type, range, and data integrity before persistence.
- `SEC-INP-009`: Academic scoring values (rubric scores, milestone marks) are validated for numeric range and consistency before persistence.

---

## 15. Output Security

- `SEC-OUT-001`: All text content rendered in the browser is contextually encoded. User-supplied content (thesis titles, comments, notes) is treated as untrusted and HTML-encoded before rendering.
- `SEC-OUT-002`: The application must use a framework or templating engine that provides automatic HTML encoding by default. Raw HTML injection from user data is explicitly prohibited.
- `SEC-OUT-003`: Stored XSS prevention: academic text fields (thesis titles, evaluation comments, logbook entries) are stored as plain text and encoded on output. Rich text rendering requires explicit sanitization.
- `SEC-OUT-004`: Reflected XSS prevention: query parameters and path parameters echoed in responses are HTML-encoded.
- `SEC-OUT-005`: DOM XSS prevention: JavaScript code must not use `innerHTML`, `document.write`, or `eval()` with untrusted input.
- `SEC-OUT-006`: Filenames for document downloads must be sanitized before use in `Content-Disposition` headers. Path traversal sequences (`../`, `..\`) in filenames are strictly rejected.
- `SEC-OUT-007`: Document metadata (original filenames, uploader names) is treated as untrusted content and encoded in API responses.
- `SEC-OUT-008`: API responses must not expose internal database identifiers, table names, column names, or ORM metadata beyond what is contractually defined in `docs/07_API_CONTRACTS.md`.

---

## 16. File Security

Governed jointly by [`docs/09_FILE_STORAGE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/09_FILE_STORAGE.md) and this document.

- `SEC-FILE-001`: Server-side MIME type verification uses magic-byte inspection (reading the actual file header), not the client-supplied `Content-Type` header.
- `SEC-FILE-002`: File extension is validated against an allowlist in conjunction with the MIME type. Mismatched extension-MIME pairs are rejected. Final allowlist: **OPEN**.
- `SEC-FILE-003`: Path traversal in storage keys is prevented by constructing storage paths exclusively from server-generated UUIDs. User-supplied filenames are never used as storage keys.
- `SEC-FILE-004`: Object enumeration attacks are prevented by the unpredictable UUID-based storage key scheme combined with private bucket configuration.
- `SEC-FILE-005`: Unauthorized document replacement is blocked by resource ownership verification before any upload operation.
- `SEC-FILE-006`: Public bucket exposure is prohibited. All buckets are private-by-default. No public URL is ever generated for dissertation documents.
- `SEC-FILE-007`: Pre-signed download tokens have a maximum validity of 15 minutes. Tokens are generated only after server-side authorization passes all layers.
- `SEC-FILE-008`: Oversized upload protection: file size is validated both client-side (UX) and server-side (enforcement). The prototype V1 limit is 5 MB per file per `docs/09_FILE_STORAGE.md`. Production limits: **OPEN**.
- `SEC-FILE-009`: SHA-256 checksums are computed and stored for every uploaded file to detect content corruption or post-upload tampering.
- `SEC-FILE-010`: Malware/virus scanning integration: **OPEN** (noted as a security enhancement in `docs/09_FILE_STORAGE.md`; not confirmed for V1).

---

## 17. Storage Security

- `SEC-STOR-001`: All dissertation documents, annexures, evaluations, and supporting files are stored in private-by-default object storage. No public bucket or public URL is created.
- `SEC-STOR-002`: Server-generated pre-signed tokens are the only authorized mechanism for file access. Tokens are generated exclusively after authorization evaluation.
- `SEC-STOR-003`: Storage credentials (access keys, secret keys) are maintained exclusively as server-side environment variables. They are never embedded in client code, frontend bundles, or exposed via API responses.
- `SEC-STOR-004`: Storage object keys use the format: `{dept_id}/{session_id}/{thesis_id}/{uuid}` to enforce namespace isolation between departments and students.
- `SEC-STOR-005`: Different document sensitivity levels use distinct storage paths or access policies. Annexure 6 objects are isolated under a separate namespace where the authorization pre-check is doubly enforced.
- `SEC-STOR-006`: The application follows least-privilege for storage credentials: upload operations use upload-scoped credentials; download operations use read-scoped credentials where the provider supports it.
- `SEC-STOR-007`: Final storage provider selection: **OPEN** (Supabase Storage or S3-compatible identified as candidates; not yet locked per `docs/02_ARCHITECTURE.md`).

---

## 18. Database Security

Governed jointly by [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md) and this document.

> [!NOTE]
> No SQL is created in this document. Requirements are expressed conceptually and will be realized during implementation.

- `SEC-DB-001`: Database access follows least-privilege. The application connects with a role that has permissions restricted to the operations it performs. No application-level `SUPERUSER` or `OWNER` privileges.
- `SEC-DB-002`: Row-Level Security (RLS) policies are a required implementation-level control to enforce tenant isolation and prevent cross-student data access at the database tier. Specific RLS policy definitions are implementation-level requirements, not documented here (no SQL in this phase).
- `SEC-DB-003`: All queries use parameterized statements or ORM-generated safe queries. No string-concatenated SQL is permitted.
- `SEC-DB-004`: Database audit tables (`audit_events`) must not grant `UPDATE` or `DELETE` to the application user. Audit records are append-only.
- `SEC-DB-005`: Sensitive configuration tables and academic decision records require write-protection controls that allow only authorized roles to perform inserts.
- `SEC-DB-006`: ACID transaction integrity is required for all state machine transitions. Partial academic state updates are strictly prohibited.
- `SEC-DB-007`: Database credentials must be passed via environment variables only. No credentials are embedded in application source code or committed to version control.
- `SEC-DB-008`: Direct database access from client-side code is prohibited. All database operations are mediated by the server-side application layer.
- `SEC-DB-009`: Cross-student data access must be blocked at the RLS tier even if the API layer authorization is misconfigured. Defense-in-depth.

---

## 19. Data Classification

| Classification Level | Description | Examples in DMS |
| :--- | :--- | :--- |
| **Public** | Available to any visitor without authentication. | System health endpoint, public rubric templates (`RUBRIC_VIEW`). |
| **Institutional** | Available to all authenticated institutional users. | Department directory, faculty list, academic session calendar. |
| **Authenticated** | Available to users with a valid session in the appropriate role scope. | Thesis metadata, logbook entries, progress reports for assigned parties. |
| **Academic-Sensitive** | Restricted to specific contextual role assignments. | Milestone evaluation scores, viva defense feedback, panel compositions. |
| **Confidential** | Restricted by institutional policy to named roles only; student access denied. | **Annexure 6 (Confidential Supervisor Evaluation)** — permanently blocked from students. |
| **Security-Sensitive** | Internal system data that must never be exposed. | Session tokens, API secrets, database credentials, signing keys, audit metadata containing actor IPs. |

> [!IMPORTANT]
> Annexure 6 is classified as **Confidential**. This classification is derived from the locked institutional requirement `REQ-ANN6-002` and must not be downgraded.

---

## 20. Data Minimization

- `SEC-DMIN-001`: The system stores and processes only data necessary for the academic workflow, authorization evaluation, auditability, and operational requirements.
- `SEC-DMIN-002`: Notification payloads contain only the minimum information required to inform the recipient. Full evaluation content, scoring details, and document identifiers are not included in notification bodies.
- `SEC-DMIN-003`: Audit records capture actor identity, action, resource identifier, previous state, new state, and timestamp. They do not capture full document binary payloads, password values, or unnecessary personal data beyond what is required for accountability.
- `SEC-DMIN-004`: Application diagnostic logs must not contain personal identification information, session tokens, or academic content beyond what is required for debugging.
- `SEC-DMIN-005`: Browser storage (localStorage, sessionStorage) must not contain sensitive academic data, document contents, or authorization tokens beyond the session cookie.
- `SEC-DMIN-006`: Analytics and reporting pipelines must operate on aggregated, role-appropriate projections of academic data. Raw sensitive records must not be replicated to analytics stores without authorization controls.

---

## 21. Secrets Management

- `SEC-SEC-001`: The following must **NEVER** be committed to version control:
  - Database connection strings and passwords
  - JWT signing secrets and verification keys
  - OAuth 2.0 / SAML client secrets
  - Storage provider access keys and secret keys
  - SMTP credentials and API keys
  - Authentication provider service-role or admin keys
  - Any private key material

- `SEC-SEC-002`: All secrets are injected into the runtime environment exclusively via environment variables.
- `SEC-SEC-003`: `.env`, `.env.local`, `.env.production`, and similar environment files must be included in `.gitignore`. They must never be committed.
- `SEC-SEC-004`: Frontend-exposed configuration (e.g., public API base URL, public analytics identifiers) must be clearly documented as distinct from server-side secrets. No server-side secret must appear in the client bundle.
- `SEC-SEC-005`: Where the architecture uses a Backend-for-Frontend (BFF) pattern or Next.js server-side API routes, privileged credentials remain on the server side only.
- `SEC-SEC-006`: Secret rotation procedures and schedules: **OPEN** (dependent on provider and production infrastructure selection).

---

## 22. Environment Separation

| Environment | Purpose | Security Rules |
| :--- | :--- | :--- |
| **Development** | Local developer workstations. | Uses local/mock identity providers, seed databases, and test storage. Production secrets must never be used. |
| **Testing / Staging** | Integration and regression testing. | Uses isolated test databases and storage. Production secrets must not be used. Separate environment variables. |
| **Production** | Live institutional system. | Real secrets, real data, full RLS enforcement. No debug endpoints exposed. Security headers active. |

- `SEC-ENV-001`: Production environment secrets must never be used in development or testing environments.
- `SEC-ENV-002`: `.env` files must be excluded from version control in all environments.
- `SEC-ENV-003`: Debug endpoints, verbose error responses, and ORM query logging must be disabled in production.
- `SEC-ENV-004`: Staging environment must mirror production security configuration for realistic pre-deployment testing.

---

## 23. API Key & Public Configuration Security

- `SEC-KEY-001`: A clear distinction must be maintained between:
  - **Public Client Configuration** (e.g., API base URL, public project identifier): Safe to expose in browser bundles.
  - **Secret Server-Side Credentials** (e.g., service-role keys, database passwords, SMTP auth): Must never appear in browser bundles.
- `SEC-KEY-002`: Supabase service-role keys (or equivalent privileged provider keys), database passwords, storage access credentials, and JWT signing keys must remain exclusively server-side. Exposure in browser environments is a critical vulnerability.
- `SEC-KEY-003`: No API keys or credentials are created in this documentation phase.

---

## 24. CSRF Protection

- `SEC-CSRF-001`: CSRF risk evaluation is deferred until the authentication architecture is finalized. Exact CSRF mitigation strategy: **OPEN**.
- `SEC-CSRF-002`: If the final architecture uses `HttpOnly; SameSite=Strict` or `SameSite=Lax` session cookies, the CSRF risk is materially reduced for same-origin requests. Final determination pending provider and cookie configuration selection.
- `SEC-CSRF-003`: Where CSRF tokens are required, they must be server-generated, per-session, and validated server-side on all state-changing requests.
- `SEC-CSRF-004`: CSRF protection must not be bypassed for any state-changing API endpoint including academic workflow transitions.

---

## 25. XSS Protection

- `SEC-XSS-001`: **Stored XSS**: Academic text fields (thesis titles, evaluation comments, logbook meeting notes, DCEC revision remarks) are stored as plain text. They are HTML-encoded at render time. The ORM/database driver must not interpret stored text as executable content.
- `SEC-XSS-002`: **Reflected XSS**: All path parameters and query parameters echoed in API error responses or UI are HTML-encoded. No raw user input is reflected directly into HTML.
- `SEC-XSS-003`: **DOM XSS**: Client-side JavaScript must not assign untrusted data to `innerHTML`, `outerHTML`, `document.write()`, or pass it to `eval()`. Framework-safe equivalents (e.g., React's JSX text rendering) are used.
- `SEC-XSS-004`: A `Content-Security-Policy` header must be configured to restrict script sources to trusted origins. Final CSP policy: **OPEN** (implementation-level decision).
- `SEC-XSS-005`: Third-party scripts must not be loaded from untrusted CDNs without Subresource Integrity (SRI) hashes.

---

## 26. SQL Injection Protection

- `SEC-SQL-001`: All database queries must use parameterized statements, prepared statements, or ORM-generated safe queries. String concatenation into SQL queries is strictly prohibited.
- `SEC-SQL-002`: User-supplied values (search terms, filter values, sort fields) must never be interpolated directly into raw SQL strings.
- `SEC-SQL-003`: ORM query builders must use parameterized binding for all user-influenced values.
- `SEC-SQL-004`: Sort field parameters are validated against an explicit server-side allowlist before use in ORDER BY clauses.
- `SEC-SQL-005`: SQL error messages must never be propagated to client-facing API responses.

---

## 27. SSRF Protection

- `SEC-SSRF-001`: The V1 architecture does not require server-side fetching of arbitrary user-supplied URLs. This capability must not be introduced without explicit security review.
- `SEC-SSRF-002`: If external URL fetching is introduced in future versions (e.g., for similarity report webhook callbacks), the target URL domain must be validated against a strict allowlist.
- `SEC-SSRF-003`: Server-side HTTP clients used for provider integrations (e.g., notification webhooks) must be configured to reject connections to internal network address ranges (RFC 1918, loopback, link-local).

---

## 28. Rate Limiting

> [!NOTE]
> Exact rate limit thresholds are OPEN pending institutional and operational requirements. The operations below are identified as requiring rate limiting; specific numeric limits will be defined at implementation.

| Operation | Rationale | Exact Threshold |
| :--- | :--- | :--- |
| Authentication (login) | Brute-force credential attacks | **OPEN** |
| Account recovery / password reset | Abuse of recovery channel | **OPEN** |
| File upload | Storage abuse, bandwidth exhaustion | **OPEN** |
| Annexure submission | Duplicate submission spam prevention | **OPEN** |
| Notification read/acknowledge | API abuse prevention | **OPEN** |
| DCEC docket actions | Prevents repeated approval/rejection probing | **OPEN** |
| Audit log export | Expensive query protection | **OPEN** |
| Supervisor allocation | Prevents repeated conflicting allocation attempts | **OPEN** |
| Search/filter endpoints | Prevents enumeration attacks | **OPEN** |

Rate limiting must be implemented at the API gateway or application middleware level, not exclusively at the client side.

---

## 29. Abuse Prevention

- `SEC-ABUSE-001`: **Brute-Force Login**: Account lockout or progressive delay after repeated failed authentication attempts. Threshold: **OPEN**.
- `SEC-ABUSE-002`: **API Abuse**: Rate limiting and anomaly detection on high-frequency or unusual access patterns.
- `SEC-ABUSE-003`: **File Upload Abuse**: Enforced file size limits, MIME type checks, and per-user/per-session upload frequency limits.
- `SEC-ABUSE-004`: **Resource Enumeration**: Sequential/predictable ID enumeration is prevented by UUID-based identifiers and authorization checks on every access attempt.
- `SEC-ABUSE-005`: **Notification Spam**: Notification generation is triggered exclusively by server-side workflow events, not by client-initiated calls. Clients cannot directly create notification entries.
- `SEC-ABUSE-006`: **Repeated Workflow Actions**: State machine guard conditions and idempotency key support prevent repeated transition attempts from causing duplicate academic records.
- `SEC-ABUSE-007`: **Privilege Probing**: Repeated `403 Forbidden` responses from the same session are logged to the security incident stream. High-frequency probing patterns are flagged for review.

---

## 30. Audit Security

Governed jointly by [`docs/08_AUDIT_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/08_AUDIT_MODEL.md) and this document.

- `SEC-AUD-001`: Audit records capture: actor user ID, active role, delegation context, action code, target entity type, target entity UUID, previous state, new state, timestamp (server-generated UTC), client IP, user agent, and correlation ID.
- `SEC-AUD-002`: Audit records are append-only (`WORM` — Write Once Read Many). No `UPDATE` or `DELETE` grants exist for audit tables at the application user level.
- `SEC-AUD-003`: Audit emission and the corresponding business mutation occur in the same ACID database transaction. If audit emission fails, the business mutation rolls back.
- `SEC-AUD-004`: Audit records must not contain passwords, access tokens, API secrets, session tokens, or binary document payloads.
- `SEC-AUD-005`: Audit log viewing is restricted to `ROLE_ADMIN` and `ROLE_HOD` only (`AUDIT_LOG_VIEW` permission from `docs/04_RBAC_MATRIX.md`).
- `SEC-AUD-006`: Audit log export is restricted to `ROLE_ADMIN` and `ROLE_HOD` only (`AUDIT_REPORT_EXPORT` permission).
- `SEC-AUD-007`: Unauthorized access attempts (e.g., student attempting Annexure 6 access) are captured as security audit events and routed to the security incident log.
- `SEC-AUD-008`: Timestamp generation is exclusive to the database server clock. Client-supplied timestamps are untrusted and discarded.

---

## 31. Security of Academic Decisions

- `SEC-ACAD-DEC-001`: DCEC approval decisions (`DCEC_CHAIR_APPROVE`, `DCEC_CHAIR_REVISE`, `DCEC_CHAIR_REJECT`) generate mandatory immutable audit records with actor identity, timestamp, and action code.
- `SEC-ACAD-DEC-002`: Guide allocation and reallocation records are immutable. Historical supervisor assignments are preserved in perpetuity.
- `SEC-ACAD-DEC-003`: Evaluation scores (milestone P1/P2/P3, viva defense) once submitted cannot be silently overwritten. A formal correction mechanism requiring elevated authority and audit trail is required for any change.
- `SEC-ACAD-DEC-004`: Rubric version pinning ensures that evaluation results are permanently associated with the rubric version active at the time of scoring.
- `SEC-ACAD-DEC-005`: Final results and HOD sign-off are protected by terminal state locks in the workflow state machine.
- `SEC-ACAD-DEC-006`: Configuration changes (rubric parameters, academic thresholds) require `CONFIG_UPDATE` or `POLICY_MANAGE` permissions and generate audit records.

---

## 32. Workflow Security

Per [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md):

- `SEC-WF-001`: The server/backend validates every state transition. Clients cannot directly set workflow states by submitting `status = "APPROVED"` or any other state value.
- `SEC-WF-002`: Dedicated transition endpoints (e.g., `POST /api/v1/dcec/dockets/{id}/decide`) validate the current state, the actor's authorization, and the guard conditions before executing any transition.
- `SEC-WF-003`: State transitions are rejected if:
  - The entity is not in the required pre-condition state.
  - The actor's role/context does not authorize the transition.
  - Guard conditions (e.g., required endorsements, capacity limits) are not satisfied.
- `SEC-WF-004`: Viva failure cycles create new `ReVivaCycle` records under the same `ThesisId`. The primary thesis identity is never changed or deleted.
- `SEC-WF-005`: Terminal states (`ARCHIVED`, `PROPOSAL_REJECTED_TERMINAL`) are immutable. No transitions out of terminal states are permitted without formal administrative override (which itself requires audit records).

---

## 33. Configuration Security

- `SEC-CFG-001`: Rubric configuration and academic policy configuration require `CONFIG_UPDATE` or `POLICY_MANAGE` permissions. Only `ROLE_ADMIN` (technical config) and `ROLE_HOD` (academic policy) hold these permissions.
- `SEC-CFG-002`: Configuration changes generate audit records capturing the previous and new configuration state.
- `SEC-CFG-003`: Historical configuration versions must be reconstructable from audit records to allow retrospective verification that correct rubrics were applied at the time of evaluation.
- `SEC-CFG-004`: Runtime file size limits, upload quotas, and academic deadlines must be driven from database configuration, not hardcoded. Changes to these values follow the standard change-control and audit process.

---

## 34. Admin Security

- `SEC-ADMIN-001`: `ROLE_ADMIN` is restricted to technical platform operations: user account provisioning, department/program master data seeding, system parameter configuration, and audit log review.
- `SEC-ADMIN-002`: Admin accounts must use strong credentials and must follow the same session security requirements as all other users.
- `SEC-ADMIN-003`: Admin must not be granted `DCEC_CHAIR_APPROVE`, `SUPERVISOR_ALLOCATE`, `MILESTONE_EVALUATE`, `VIVA_EVALUATE`, or `RESULT_SIGN_OFF`.
- `SEC-ADMIN-004`: Admin activities are fully audited. All user management actions, configuration changes, and audit log exports generate audit records.
- `SEC-ADMIN-005`: Admin ≠ DCEC Chair. This is a locked invariant that must not be weakened. See Section 6.

---

## 35. Security-Aware UI

Per [`docs/11_UI_DESIGN_SYSTEM.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/11_UI_DESIGN_SYSTEM.md) §11:

- `SEC-UI-001`: The student portal UI contains zero references, tabs, buttons, or navigation elements pointing to Annexure 6.
- `SEC-UI-002`: UI rendering of actions (e.g., "Approve Proposal" button) is conditioned on server-provided session role data, not client-side assumptions.
- `SEC-UI-003`: Error messages visible to end users are generic and safe. They do not expose internal IDs, stack traces, SQL, database structure, or server details.
- `SEC-UI-004`: Internal resource UUIDs are not unnecessarily exposed in UI URLs or visible page elements where they provide no user value and increase enumeration risk.
- `SEC-UI-005`: UI restrictions on actions are a usability feature only. They are never treated as authorization boundaries.

---

## 36. Notification Security

Per [`docs/10_NOTIFICATION_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/10_NOTIFICATION_MODEL.md):

- `SEC-NOTIF-001`: Notification recipients are determined server-side based on authorized role assignments. Students never receive notifications containing Annexure 6 identifiers or content.
- `SEC-NOTIF-002`: Notification payloads are minimized to the information required to inform the recipient of the event. Full document contents, evaluation scores, and storage URLs are not included in notification bodies.
- `SEC-NOTIF-003`: Pre-signed storage URLs are never included in notification payloads. Recipients navigate to the application to retrieve documents through the authorized download flow.
- `SEC-NOTIF-004`: Notification delivery channels (email, in-app) must not bypass the standard resource authorization model. A notification about a document does not grant access to the document.

---

## 37. File Access Security

Per [`docs/09_FILE_STORAGE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/09_FILE_STORAGE.md):

Every document access evaluates the full authorization predicate:

$$\text{File Access Authorized} = \text{Identity} \land \text{Role} \land \text{Permission} \land \text{ResourceContext} \land \text{WorkflowState} \land \text{DocumentPolicy}$$

- `SEC-FACC-001`: Document download requests trigger server-side authorization evaluation before any signed token is generated.
- `SEC-FACC-002`: The document type (`SUPERVISOR_EVAL_ANNEXURE_6`) is a hard-blocked context for student sessions in all circumstances.
- `SEC-FACC-003`: Signed download tokens have a maximum validity of 15 minutes. They encode the specific document version and authorized caller identity.
- `SEC-FACC-004`: Pre-signed token generation for Annexure 6 document types is blocked for student sessions at the token-generation service layer, providing an additional layer beyond API authorization.

---

## 38. Logging Security

- `SEC-LOG-001`: Application logs must never contain:
  - Passwords or credential values
  - Session tokens or JWT values
  - API secrets or storage access keys
  - Database credentials
  - Binary document payloads
  - Complete Annexure 6 evaluation narratives
- `SEC-LOG-002`: Application logs may contain:
  - Correlation IDs for request tracing
  - Error codes and sanitized error messages
  - Actor user ID (UUID only, not PII beyond what is necessary)
  - Timestamp and endpoint path
- `SEC-LOG-003`: Log files must be stored securely and access-restricted. Log access follows least-privilege principles.
- `SEC-LOG-004`: The three distinct log domains (Legal Audit Trail, Security Incident Log, Technical Diagnostic Log) must remain separated per `docs/08_AUDIT_MODEL.md` §3.

---

## 39. Error Handling

- `SEC-ERR-001`: Client-facing error responses use the standard `ApiErrorResponse` envelope from `docs/07_API_CONTRACTS.md`. The `error.message` field contains a human-readable, safe description. It does not contain SQL, stack traces, or internal identifiers.
- `SEC-ERR-002`: Authentication failure returns `401 Unauthorized`.
- `SEC-ERR-003`: Authorization failure returns `403 Forbidden`. The error message does not reveal whether the resource exists or what specific permission is missing.
- `SEC-ERR-004`: Workflow state conflict returns `409 Conflict`.
- `SEC-ERR-005`: Validation failure returns `400 Bad Request` with field-level error details (safe to expose).
- `SEC-ERR-006`: Unhandled server errors return `500 Internal Server Error` with a generic message. Detailed technical diagnostics are written to the server-side log only.
- `SEC-ERR-007`: Error responses must not reveal the database type, ORM in use, table names, column names, or internal service topology.

---

## 40. Security Headers

> [!NOTE]
> Final header configuration is deferred to implementation. The following headers are identified as required and must be evaluated at implementation.

| Header | Purpose | V1 Requirement |
| :--- | :--- | :--- |
| `Content-Security-Policy` | Restricts script/resource loading to trusted origins; mitigates XSS. | Required. Exact policy: **OPEN**. |
| `X-Content-Type-Options: nosniff` | Prevents MIME-type sniffing attacks. | Required. |
| `X-Frame-Options: DENY` or `CSP frame-ancestors` | Prevents clickjacking via iframe embedding. | Required. |
| `Referrer-Policy: strict-origin-when-cross-origin` | Limits referrer header data leakage. | Required. |
| `Permissions-Policy` | Restricts access to browser features (camera, microphone, geolocation). | Required. Scope: **OPEN**. |
| `Strict-Transport-Security (HSTS)` | Forces HTTPS connections; prevents protocol downgrade. | Required for production. |
| `Cache-Control` | Prevents caching of authenticated/sensitive API responses. | Required for authenticated endpoints. |

---

## 41. Dependency Security

- `SEC-DEP-001`: Dependency inventory must be minimized. No packages are installed beyond what is necessary for the defined feature scope.
- `SEC-DEP-002`: All package dependencies must use a lock file (`package-lock.json` or `yarn.lock`) committed to version control to ensure reproducible builds.
- `SEC-DEP-003`: Automated vulnerability scanning (e.g., `npm audit`) must be run regularly against the dependency tree. Critical and high-severity vulnerabilities must be resolved before production deployment.
- `SEC-DEP-004`: Dependency versions must be pinned to specific versions or constrained version ranges to prevent silent upgrades that introduce vulnerabilities.
- `SEC-DEP-005`: No packages are installed in this documentation phase.

---

## 42. Supply Chain Security

- `SEC-CHAIN-001`: All production dependencies must be sourced from trusted, well-maintained open-source repositories with verifiable provenance.
- `SEC-CHAIN-002`: CDN-loaded scripts (if any) must use Subresource Integrity (SRI) hashes to prevent tampering.
- `SEC-CHAIN-003`: Inline scripts in HTML pages must be minimized. Where unavoidable, they must be reflected in the Content-Security-Policy `nonce` or `hash` directives.
- `SEC-CHAIN-004`: Production Docker images (if used) must be built from verified base images with known checksums. No unverified third-party images are used.
- `SEC-CHAIN-005`: Dependency additions to the project must be subject to security review before integration.

---

## 43. Security Threat Model

The following 20 threat scenarios are analyzed using: Threat, Asset at Risk, Impact, Likelihood, Primary Mitigation, and V1/Future status.

| # | Threat | Asset at Risk | Impact | Likelihood | Primary Mitigation | V1/Future |
| :-- | :--- | :--- | :--- | :--- | :--- | :--- |
| T-01 | **Unauthorized Student Access** to restricted academic data | Thesis data, evaluations, admin panels | High | High | Session authentication; role-based API authorization; RLS | V1 |
| T-02 | **Cross-Student Data Access** (student views another student's thesis) | Thesis, Annexures, documents | High | Medium | Resource-level binding predicate; RLS tenant isolation | V1 |
| T-03 | **IDOR** (resource accessed via guessed UUID) | Any thesis/document/evaluation record | High | High | UUID storage keys; server-side authorization on every access | V1 |
| T-04 | **Privilege Escalation** (user claims elevated role) | Academic decisions, approvals | Critical | Medium | Server-side role from session only; no client-side role trust | V1 |
| T-05 | **Admin Privilege Abuse** (admin approves academic items) | DCEC decisions, allocations, grades | Critical | Low | `ADMIN ≠ DCEC_CHAIR` architectural invariant enforced at API and DB | V1 |
| T-06 | **DCEC Authority Impersonation** (fabricated delegation) | DCEC approvals, title decisions | Critical | Low | Delegation verified against live DB records; immutable audit | V1 |
| T-07 | **Annexure 6 Exposure** to student | Confidential supervisor evaluation | Critical | High | 6-layer defense-in-depth lockout (UI, API, Auth, DB, Storage, Notification) | V1 |
| T-08 | **File Upload Abuse** (malicious files, oversized uploads) | Storage, server resources | Medium | Medium | MIME magic-byte check; file size limits; extension allowlist | V1 |
| T-09 | **Public Storage Exposure** (bucket misconfiguration) | All academic documents | High | Low | Private-by-default bucket configuration; no public URLs generated | V1 |
| T-10 | **Session Theft** (session cookie stolen) | Full user session and associated permissions | High | Medium | HttpOnly; Secure; SameSite cookie; server-side invalidation on logout | V1 |
| T-11 | **Credential Compromise** (password breach) | User accounts | High | Medium | Provider-managed hashing; no plaintext storage; rate-limited login | V1 |
| T-12 | **XSS** (stored/reflected/DOM) | User sessions, academic data integrity | High | Medium | Output encoding; CSP headers; framework-safe rendering | V1 |
| T-13 | **SQL Injection** | Database records, academic data | Critical | Low | Parameterized queries; ORM safe binding; input validation | V1 |
| T-14 | **CSRF** | State-changing operations | Medium | Low | SameSite cookies; CSRF token strategy: **OPEN** | V1/OPEN |
| T-15 | **API Abuse** (automated scraping, bulk requests) | System resources, data enumeration | Medium | Medium | Rate limiting; authentication requirement; anomaly logging | V1 |
| T-16 | **Brute-Force Authentication** | User credentials | High | High | Login rate limiting; account lockout; logging | V1 |
| T-17 | **Notification Leakage** (confidential info in notifications) | Annexure 6, evaluation scores | High | Low | Content minimization; notification recipient authorization | V1 |
| T-18 | **Audit Tampering** (modification of academic audit records) | Academic non-repudiation | Critical | Low | Append-only audit tables; no UPDATE/DELETE grants; DB-level protection | V1 |
| T-19 | **Workflow Manipulation** (bypassing state machine) | Academic decisions, approvals | Critical | Medium | Server-side state validation; transition endpoints; no direct status writes | V1 |
| T-20 | **Configuration Abuse** (unauthorized rubric/policy changes) | Academic integrity | High | Low | `CONFIG_UPDATE`/`POLICY_MANAGE` permission restriction; audit records | V1 |

---

## 44. Security Control Matrix

| Security Area | Control | Enforcement Layer | V1/Future | Requirement / Source |
| :--- | :--- | :--- | :--- | :--- |
| Authentication | Session token verification on every request | API Middleware | V1 | `SEC-AUTH-001` |
| Authentication | HttpOnly; Secure; SameSite cookie only | Cookie Configuration | V1 | `SEC-AUTH-002`, `docs/07_API_CONTRACTS.md` |
| Authentication | Server-side session invalidation on logout | Session Store | V1 | `SEC-AUTH-006` |
| Authentication | Rate limiting on login attempts | API Gateway / Middleware | V1 | `SEC-AUTH-004` |
| Authorization | Multi-dimensional predicate (role + context + state) | API Handler / Domain Service | V1 | `SEC-AUTHZ-001`, `docs/04_RBAC_MATRIX.md` |
| Authorization | No client-supplied role trust | API Middleware | V1 | `SEC-AUTHZ-001` |
| Authorization | Row-Level Security for tenant isolation | Database Tier | V1 | `SEC-DB-002`, `docs/06_DATABASE_SCHEMA.md` |
| RBAC | Admin ≠ DCEC Chair invariant | API + DB | V1 | `SEC-ACAD-001`, `docs/04_RBAC_MATRIX.md §3.11` |
| RBAC | Role assignment exclusively by Admin | Admin Service | V1 | `SEC-RBAC-001` |
| RBAC | Delegation validated at runtime | Authorization Engine | V1 | `SEC-RBAC-003`, `docs/04_RBAC_MATRIX.md §9` |
| Annexure 6 | Multi-layer student lockout | UI + API + Auth + DB + Storage + Notification | V1 | `REQ-ANN6-002`, `SEC-ANN6` |
| IDOR | Authorization on every resource access | API Handler | V1 | `SEC-IDOR-001` |
| IDOR | UUID-based unpredictable storage keys | Storage Service | V1 | `SEC-IDOR-002`, `docs/09_FILE_STORAGE.md` |
| Privilege Escalation | Role from server session only | API Middleware | V1 | `SEC-PRIV-001` |
| Privilege Escalation | State transition via dedicated endpoints | Domain Service | V1 | `SEC-PRIV-003`, `SEC-WF-001` |
| Session | HttpOnly cookie; server invalidation | Session Manager | V1 | `SEC-SESS-001`, `SEC-SESS-004` |
| Secrets | Environment variables; no version-control commits | DevOps / CI | V1 | `SEC-SEC-001`, `SEC-SEC-003` |
| File Security | Magic-byte MIME verification | Upload Service | V1 | `SEC-FILE-001` |
| File Security | Private storage; no public URLs | Storage Configuration | V1 | `SEC-STOR-001`, `docs/09_FILE_STORAGE.md` |
| File Security | 15-min pre-signed tokens with authz pre-check | Storage Token Service | V1 | `SEC-FILE-007` |
| File Security | SHA-256 checksum validation | Upload Service | V1 | `SEC-FILE-009` |
| Database | Parameterized queries / ORM safe binding | Application Layer | V1 | `SEC-SQL-001`, `SEC-DB-003` |
| Database | Append-only audit tables | Database Layer | V1 | `SEC-AUD-002`, `docs/08_AUDIT_MODEL.md` |
| Input Validation | Server-side schema validation | API Middleware | V1 | `SEC-INP-001` |
| Output Security | HTML encoding of user-supplied content | Rendering Layer | V1 | `SEC-OUT-001` |
| XSS | Content-Security-Policy header | HTTP Response Headers | V1 | `SEC-XSS-004` |
| XSS | Framework-safe DOM rendering | Frontend | V1 | `SEC-XSS-003` |
| Error Handling | Safe error envelopes; no internal data in errors | API Layer | V1 | `SEC-ERR-001` |
| Audit | Atomic transactional audit emission | Database / Service | V1 | `SEC-AUD-003`, `docs/08_AUDIT_MODEL.md` |
| Workflow | Server-side state machine validation | Domain Service | V1 | `SEC-WF-001`, `docs/05_STATE_MACHINES.md` |
| Security Headers | X-Content-Type-Options; X-Frame-Options; Referrer-Policy | HTTP Response | V1 | `SEC-HDR-*` |
| Rate Limiting | Login, upload, and sensitive endpoints | API Gateway | V1 | `SEC-ABUSE-001`, thresholds OPEN |
| Dependency | Lock files; vulnerability scanning | CI/CD Pipeline | V1 | `SEC-DEP-002`, `SEC-DEP-003` |
| MFA | Multi-factor authentication | Auth Provider | Future | Not required for V1 |
| Malware Scanning | Automated virus/malware scan on uploads | Storage Pre-Processing | Future/OPEN | `SEC-FILE-010` |
| SIEM Integration | Security event correlation and alerting | Infrastructure | Future | N/A V1 |

---

## 45. Security Rollback & Recovery

- `SEC-RECOV-001`: Database backup strategy and recovery point objective (RPO): **OPEN** (institutional production policy not yet confirmed per `docs/00_PROJECT_MASTER.md §15`).
- `SEC-RECOV-002`: Recovery time objective (RTO): **OPEN**.
- `SEC-RECOV-003`: Backup integrity verification must be periodically tested. Untested backups are not a recovery guarantee.
- `SEC-RECOV-004`: Compromised account recovery requires: (1) immediate session revocation by admin, (2) credential reset, (3) security incident log review for unauthorized actions, (4) assessment of any academic records touched during the compromise window.
- `SEC-RECOV-005`: Secret rotation (storage keys, JWT secrets, SMTP credentials) must be executable without requiring application redeployment where possible. Exact rotation procedures: **OPEN**.
- `SEC-RECOV-006`: Emergency session revocation for a specific user must be executable by an authorized admin as a first-response action.

---

## 46. Incident Response Considerations

> [!NOTE]
> The following are architectural recommendations only. No formal institutional incident-response policy exists yet. These are not prescriptive procedures.

| Incident Type | Recommended First-Response Actions |
| :--- | :--- |
| **Compromised Account** | Revoke all active sessions for the account; reset credentials; review audit log for actions taken during compromise window; notify affected parties. |
| **Leaked Credential** (API key, DB password) | Immediately rotate the affected credential; revoke associated sessions/tokens; audit for unauthorized use; commit no new code until secret is removed from version history. |
| **Data Exposure** (unintended data visible to unauthorized actor) | Identify the affected resource; revoke unauthorized access; assess scope; preserve evidence in audit log; notify institution. |
| **Storage Exposure** (bucket misconfiguration) | Re-apply private-by-default bucket policy; revoke any public URLs; audit for unauthorized downloads; assess scope of exposure. |
| **Malicious Upload** | Quarantine the uploaded file; block further access; investigate upload event in audit log; assess whether other files were affected. |
| **Unauthorized Academic Decision** | Preserve the audit record as evidence; escalate to HOD and institutional governance; assess whether decision can be reversed under institutional policy. |
| **Audit Tampering Attempt** | Trigger security alert; preserve all available evidence; assess database access logs for unauthorized `UPDATE`/`DELETE` activity; escalate to institutional security. |

---

## 47. Zero-Cost Security Architecture

The project operates initially at ₹0 cost. Security controls are designed to be feasible within this constraint:

- `SEC-ZERO-001`: Essential security (authentication, authorization, RBAC, TLS, parameterized queries, output encoding, private storage, audit logging) does not depend on paid services.
- `SEC-ZERO-002`: Free tiers of cloud providers (authentication providers, storage providers, database hosts) are used for V1. Free tier availability is not guaranteed permanently; migration paths must remain available.
- `SEC-ZERO-003`: Security controls are implemented at the application and data layers, not assumed from a paid security product.
- `SEC-ZERO-004`: Open-source security tooling (vulnerability scanners, static analysis) is preferred over commercial alternatives for V1.
- `SEC-ZERO-005`: Provider free-tier security feature sets (RLS, private buckets, encrypted at rest) are used where available. If a security-critical feature requires a paid tier, this must be flagged as a project risk.

---

## 48. Security Testing Categories

The following security test categories are defined. No tests have been executed in this documentation phase.

1. **Authentication Testing**: Verify session establishment, token validation, session expiry, and logout invalidation.
2. **Authorization Testing**: Verify multi-dimensional predicate enforcement across all protected endpoints.
3. **RBAC Testing**: Verify role-permission matrix enforcement; test each role for correct grant/deny behavior.
4. **IDOR Testing**: Attempt access to resources via known/guessed UUIDs with unauthorized sessions.
5. **Privilege Escalation Testing**: Attempt to elevate permissions via client-submitted role values, request body manipulation, and header manipulation.
6. **Workflow Bypass Testing**: Attempt to submit invalid workflow states directly; bypass state machine guards.
7. **File Access Testing**: Verify authorization enforcement on document download; verify signed token expiry.
8. **Annexure 6 Access Testing**: Exhaustive testing of all known attack vectors for student Annexure 6 access (see Section 8.3).
9. **Input Validation Testing**: Test boundary values, type mismatches, SQL injection payloads, XSS payloads in all input fields.
10. **XSS Testing**: Test stored, reflected, and DOM-based XSS in all user-supplied text fields.
11. **SQL Injection Testing**: Test all database query paths with SQLi payloads.
12. **CSRF Testing**: Test state-changing requests from cross-origin contexts (pending CSRF strategy selection).
13. **Session Testing**: Test session fixation, session hijacking, concurrent session behavior.
14. **Rate-Limit Testing**: Verify rate limiting on login, upload, and sensitive endpoints.
15. **Secret Scanning**: Scan version control history and build artifacts for committed secrets.
16. **Dependency Scanning**: Run `npm audit` or equivalent against dependency tree.
17. **Storage Exposure Testing**: Verify private bucket configuration; attempt direct URL access to storage objects.

---

## 49. Security Test Matrix

| Test ID | Threat Addressed | Expected Result | Priority | V1/Future |
| :--- | :--- | :--- | :--- | :--- |
| `ST-001` | T-07: Annexure 6 student access | `403 Forbidden` at API layer for all ROLE_STUDENT sessions | Critical | V1 |
| `ST-002` | T-04: Privilege escalation via role spoofing | `403 Forbidden`; server ignores client-submitted role | Critical | V1 |
| `ST-003` | T-03: IDOR via UUID guessing | `403 Forbidden`; authorization check regardless of UUID knowledge | Critical | V1 |
| `ST-004` | T-05: Admin academic approval | `403 Forbidden` for Admin calling DCEC_CHAIR_APPROVE | Critical | V1 |
| `ST-005` | T-19: Workflow bypass via direct status write | `400` / `409` rejection; state machine guard enforced | Critical | V1 |
| `ST-006` | T-02: Cross-student data access | `403 Forbidden`; student cannot see another student's thesis | Critical | V1 |
| `ST-007` | T-12: Stored XSS in thesis title | Encoded output in UI; no script execution | High | V1 |
| `ST-008` | T-13: SQL injection in search/filter | Parameterized binding; no query manipulation | High | V1 |
| `ST-009` | T-10: Session token in localStorage | No session data in accessible browser storage | High | V1 |
| `ST-010` | T-16: Brute-force login | Rate limit triggers; account protection activates | High | V1 |
| `ST-011` | T-09: Public storage object access | Direct storage URL returns access denied | High | V1 |
| `ST-012` | T-18: Audit record modification | No UPDATE/DELETE on audit_events succeeds for app user | High | V1 |
| `ST-013` | T-07: Annexure 6 via notification | Notification payload contains no Annexure 6 content for student | High | V1 |
| `ST-014` | T-08: Malicious file upload (MIME spoofing) | Server rejects file with mismatched MIME/extension | High | V1 |
| `ST-015` | T-06: Expired delegation still used | `403 Forbidden` after delegation expiry | High | V1 |
| `ST-016` | T-11: Secret in version control | Secret scan returns zero findings in git history | Critical | V1 |
| `ST-017` | T-14: CSRF on state-changing endpoint | Protection mechanism active (pending OPEN CSRF strategy) | Medium | V1/OPEN |
| `ST-018` | T-17: Signed URL leaked to student for Annexure 6 | Token generation blocked for student context | Critical | V1 |
| `ST-019` | T-15: API enumeration attack | Rate limiting triggers; no excess resource list exposure | Medium | V1 |
| `ST-020` | T-20: Unauthorized config change | `403 Forbidden` for roles without CONFIG_UPDATE permission | High | V1 |

---

## 50. Open Security Questions

The following security decisions are formally unresolved. No engineer or AI agent may invent values for these items.

| Open Decision ID | Security Area | Unresolved Question | Current Fallback |
| :--- | :--- | :--- | :--- |
| `SEC-OD-001` | Authentication Provider | Which identity provider (Supabase Auth, NextAuth, SAML IdP, custom) will be used? | No provider connected. Architecture is provider-agnostic. |
| `SEC-OD-002` | Institutional SSO | Exact SAML 2.0 / OAuth 2.0 integration specs for NIET institutional identity. | Mock / pre-seeded accounts for prototype V1. |
| `SEC-OD-003` | Session Expiry | Exact idle timeout and absolute session expiry durations. | Not set. Dependent on provider defaults until resolved. |
| `SEC-OD-004` | Account Recovery | Institutional password reset and account recovery policy. | No recovery mechanism in prototype V1. |
| `SEC-OD-005` | Rate Limiting Thresholds | Exact numeric limits for login, upload, and API operations. | No thresholds defined. Require operational data and policy confirmation. |
| `SEC-OD-006` | CSRF Strategy | Exact CSRF protection mechanism (SameSite cookies, CSRF tokens, double-submit). | Deferred to implementation; dependent on auth provider cookie behavior. |
| `SEC-OD-007` | Content-Security-Policy | Exact CSP directive set for production deployment. | No CSP in prototype. Required before production. |
| `SEC-OD-008` | Storage Provider | Final storage provider (Supabase Storage, Cloudflare R2, AWS S3, on-premise). | Architecture is provider-agnostic with S3-compatible API assumed. |
| `SEC-OD-009` | Malware Scanning | Whether automated malware/virus scanning is required for V1 or deferred to future. | No scanning in prototype V1. |
| `SEC-OD-010` | Production Retention | Data retention duration for audit logs, documents, and academic records. | Not defined. Per `docs/00_PROJECT_MASTER.md §15` (OD-004). |
| `SEC-OD-011` | Production File Limits | Final production file size and storage quota limits. | 5 MB per file for prototype per `docs/09_FILE_STORAGE.md`. |
| `SEC-OD-012` | Co-Guide Annexure 6 | Whether Co-Guide may view/co-sign Annexure 6. | Blocked by default (`REQ-OD-004` in `docs/04_RBAC_MATRIX.md`). |
| `SEC-OD-013` | Formal Security Audit | Whether a formal third-party penetration test or security audit is required before production. | Not planned for prototype. Recommended before institutional rollout. |
| `SEC-OD-014` | Token Rotation | Exact refresh token rotation mechanism and strategy. | Deferred to provider selection. |
| `SEC-OD-015` | HSTS Policy | HSTS max-age, preload, and includeSubDomains configuration. | Required for production. Exact policy OPEN. |

---

## 51. Future Security Features (Post-V1)

The following security capabilities are recognized in the system roadmap but are **explicitly excluded from V1**. They must not be treated as V1 requirements unless explicitly confirmed by institutional stakeholders.

| Future Feature | Description | Reason Deferred |
| :--- | :--- | :--- |
| `FUT-SEC-MFA` | Multi-Factor Authentication (TOTP, push notification, hardware keys) | Not required by confirmed V1 requirements; adds significant auth complexity. |
| `FUT-SEC-ANOMALY` | Advanced behavioral anomaly detection (unusual login locations, time-based access patterns) | Requires telemetry infrastructure beyond V1 scope. |
| `FUT-SEC-SIEM` | SIEM integration (Security Information & Event Management aggregation) | Enterprise capability beyond zero-budget prototype. |
| `FUT-SEC-MALWARE` | Automated server-side malware/virus scanning on file uploads | Requires paid scanning service or server-side ClamAV infrastructure. |
| `FUT-SEC-PENTEST` | Formal third-party penetration testing engagement | Professional service; recommended pre-production but not prototype. |
| `FUT-SEC-ANALYTICS` | Security analytics dashboards and threat intelligence | Post-V1 operational capability. |
| `FUT-SEC-HSM` | Hardware Security Module for cryptographic key storage | Enterprise key management beyond V1 scope. |
| `FUT-SEC-SSO-SAML` | Full SAML 2.0 SSO integration with NIET institutional IdP | Deferred pending institutional identity provider confirmation (`OD-009`). |
| `FUT-SEC-DLP` | Data Loss Prevention controls | Enterprise capability beyond V1 scope. |

---

## 52. Anti-Hallucination & Governance Verification

### Final Verification Checklist

- [x] **No academic policy invented:** All referenced academic rules are sourced from `docs/00_PROJECT_MASTER.md` and `docs/01_REQUIREMENTS.md`.
- [x] **No new role invented:** Only roles from `docs/04_RBAC_MATRIX.md` are referenced.
- [x] **No new permission invented:** Only permissions from `docs/04_RBAC_MATRIX.md` are referenced.
- [x] **No authentication provider selected:** Provider is marked `OPEN (SEC-OD-001)`.
- [x] **No API key created:** Confirmed zero credentials generated.
- [x] **No credentials created:** Confirmed zero credentials generated.
- [x] **No external service connected:** No provider connections made.
- [x] **No SQL created:** All database security requirements are stated as conceptual requirements only.
- [x] **No database modified:** No DDL, DML, or migrations created.
- [x] **No application code created:** Zero React components, route handlers, or source files created.
- [x] **No UI created:** Zero UI pages or components created.
- [x] **No packages installed:** Zero packages added to the project.
- [x] **Annexure 6 student denial preserved:** Multi-layer lockout documented in Section 8; `REQ-ANN6-002` enforced.
- [x] **Admin ≠ DCEC Chair preserved:** Section 6 and Section 34 enforce this critical invariant.
- [x] **Unresolved decisions remain OPEN:** Section 50 documents 15 formally open security questions.
- [x] **Future security features remain separate from V1:** Section 51 documents 9 explicitly deferred features.
- [x] **Only `docs/13_SECURITY.md` modified:** Confirmed. No other documents were changed.

---

*Prepared by Antigravity — Phase 3I Security Architecture*
