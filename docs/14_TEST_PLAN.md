# NIET Dissertation Management System — Quality Assurance & Test Plan

**Document ID:** `DOC-14-TEST`  
**File Path:** [`docs/14_TEST_PLAN.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/14_TEST_PLAN.md)  
**Document Status:** ARCHITECTURE FREEZE BASELINE (PHASE 3J)  
**Last Revised:** 2026-08-15  
**Governing Baselines:** [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md), [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md), [`docs/02_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/02_ARCHITECTURE.md), [`docs/03_DOMAIN_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/03_DOMAIN_MODEL.md), [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/07_API_CONTRACTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/07_API_CONTRACTS.md), [`docs/08_AUDIT_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/08_AUDIT_MODEL.md), [`docs/09_FILE_STORAGE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/09_FILE_STORAGE.md), [`docs/10_NOTIFICATION_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/10_NOTIFICATION_MODEL.md), [`docs/11_UI_DESIGN_SYSTEM.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/11_UI_DESIGN_SYSTEM.md), [`docs/12_ACCESSIBILITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/12_ACCESSIBILITY.md), and [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md)  
**Institution:** Noida Institute of Engineering & Technology (NIET), Greater Noida  
**Target Program:** M.Tech / M.Tech Integrated Dissertation Lifecycle  

---

## 1. Document Purpose & Testing Strategy

This document establishes the authoritative, production-grade **Quality Assurance & Verification Test Plan** for the NIET Dissertation Management System (DMS). It specifies the verification strategies, test execution levels, requirements traceability matrix, negative security test suites, state machine validation criteria, database integrity tests, accessibility verification, and release gating criteria required to ensure zero-defect academic workflow execution, ironclad data confidentiality, and legal compliance.

> [!CAUTION]
> **DOCUMENTATION-ONLY ARTIFACT**: This document specifies test methodologies, scenarios, cases, and acceptance boundaries. No test execution code, test runner configurations, SQL seeds, or application packages are created during this phase.

### 1.1 Core Testing Principles

1. **Test Before Release (Shift-Left Verification):** Every academic rule, authorization boundary, state transition, and schema constraint must be covered by deterministic automated and manual test specifications before release.
2. **Deterministic Academic Workflow Verification:** Academic workflows (proposal screening, supervisor allocation, title baselining, milestone presentations, oral defense, and grade compilation) represent institutional legal records and must execute with 100% determinism.
3. **Rigorous Negative Testing at Security Boundaries:** Authorization mechanisms, IDOR defenses, role separations (`ADMIN ≠ DCEC_CHAIR`), and confidential isolation boundaries (Annexure 6 Student Lockout) must be aggressively validated through adversarial negative test cases.
4. **Historical Record Preservation Verification:** Any operation that modifies academic state (revisions, reallocations, re-viva remediation cycles, rubric updates) must be verified to ensure past snapshots and audit trails are never overwritten or deleted.
5. **Strict Isolation of Open Decisions:** Unresolved institutional policy decisions (e.g., exact final grade formula, DCEC voting quorum, SAML SSO provider) must **NEVER** be hard-coded into test suites as settled facts. Tests depending on open decisions are marked as `OPEN` testing dependencies.

---

## 2. Test Levels & Execution Hierarchy

The testing architecture defines twelve (12) distinct verification levels:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                TESTING LEVEL HIERARCHY                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Unit Tests (UT)            : Domain entities, rubric calculations, pure predicates  │
│ 2. Integration Tests (IT)     : Service-to-DB transactions, event emitters, adapters  │
│ 3. Database Tests (DBT)       : Constraints, RLS policies, cascades, check rules       │
│ 4. API Contract Tests (ACT)   : Request/response schemas, envelopes, HTTP status codes │
│ 5. Authorization Tests (AUT)  : Multi-factor predicate, contextual bindings, role keys│
│ 6. State Machine Tests (SMT)  : Legal transitions, guard enforcement, illegal blocks   │
│ 7. File Storage Tests (FST)   : MIME verification, magic bytes, signed token security  │
│ 8. Notification Tests (NT)    : Recipient resolution, channel dispatch, minimization   │
│ 9. Audit Logging Tests (ALT)  : WORM append-only integrity, actor context, delta logs  │
│ 10. Security Tests (SEC)      : OWASP Top 10, IDOR, privilege escalation, XSS, SQLi   │
│ 11. Accessibility Tests (A11Y): WCAG 2.1 AA, keyboard traps, ARIA, screen readers     │
│ 12. End-to-End Tests (E2E)    : Complete multi-role user journeys across 14 phases     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

| Test Level | Scope of Verification | Primary Tools / Methodologies |
| :--- | :--- | :--- |
| **Unit Tests (UT)** | Business logic functions, scoring algorithms, validation helpers, rubric total checkers. | Automated unit runner (Jest/Vitest) in isolated memory. |
| **Integration Tests (IT)** | Service layer interactions, ACID transaction rollbacks, event handlers. | Integration runner against local test database container. |
| **Database Tests (DBT)** | Check constraints, foreign keys, unique indexes, PostgreSQL RLS policies. | pgTAP / automated DB test runner against test schema. |
| **API Contract Tests (ACT)** | OpenAPI schema conformance, `ApiResponse<T>` / `ApiErrorResponse` envelopes. | Supertest / HTTP test harness validating JSON contracts. |
| **Authorization Tests (AUT)** | Relational binding checks, tenancy isolation, permission matrices. | Automated authorization matrix test suite. |
| **State Machine Tests (SMT)** | 22 thesis states, transition matrix execution, illegal state skips. | Deterministic FSM transition test harness. |
| **File Storage Tests (FST)** | 5 MB upload limits, magic-byte inspection, signed URL expiry, path traversal. | Mock S3 / Storage integration harness. |
| **Notification Tests (NT)** | Event-to-notification mapping, unread counters, student data exclusion. | In-memory event bus and notification queue assertions. |
| **Audit Logging Tests (ALT)** | Transactional capture, pre/post deltas, zero `UPDATE`/`DELETE` grants. | Database assertion on `audit_events` table following actions. |
| **Security Tests (SEC)** | IDOR, XSS, CSRF, parameter tampering, Annexure 6 penetration vectors. | Security test suite & automated vulnerability scan. |
| **Accessibility Tests (A11Y)** | WCAG 2.1 AA contrast, keyboard navigation, focus management, screen reader tags. | axe-core, Pa11y, manual assistive technology walkthroughs. |
| **End-to-End Tests (E2E)** | Full 14-phase dissertation lifecycle spanning Student, Guide, DC, DHOD, HOD, Panel. | Playwright multi-role browser automation test scripts. |

---

## 3. Requirements Traceability Matrix (RTM)

All test cases trace directly to locked requirements documented in [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md). No requirement identifiers are invented.

| Requirement ID | Requirement Title & Focus | Primary Test Level | Key Verification Scope |
| :--- | :--- | :--- | :--- |
| `REQ-ORG-001` | Multi-department organizational hierarchy | DBT, AUT | Tenancy scoping (Institution -> School -> Dept -> Section). |
| `REQ-ORG-002` | Cross-department faculty access | AUT, ACT | Scoped interdisciplinary guide and panel access permissions. |
| `REQ-ANN1-001` | Annexure 1 Proposal & 4 Ranked Preferences | UT, ACT, SMT | Validates exactly 4 distinct faculty selections, proposal submission. |
| `REQ-ANN1-002` | Unique Thesis Title within active cohort | DBT, ACT | Case-insensitive title uniqueness constraint enforcement. |
| `REQ-ANN1-003` | Annexure 1 Transition to Submitted State | SMT, ALT | State transition to `ANNEXURE_1_SUBMITTED`, audit record creation. |
| `REQ-DCEC-001` | DCEC Maker-Checker Workflow | AUT, SMT | DC prepares docket (Maker); DCEC Chair decides (Checker). |
| `REQ-DCEC-002` | Default DCEC Chair is HOD | AUT, ACT | HOD inherits `ROLE_DCEC_CHAIR` capabilities by default. |
| `REQ-DCEC-003` | Delegated DCEC Chair to D.HOD | AUT, SMT | Active `DCECDelegation` grants Chair power to D.HOD. |
| `REQ-DCEC-004` | Admin Lacks Academic Approval Rights | AUT, SEC | `ROLE_ADMIN` cannot execute `DCEC_CHAIR_APPROVE`. |
| `REQ-DCEC-005` | DCEC Screening Decisions (Approve/Revise/Reject)| SMT, NT | Transitions to Approved, Revision, or Terminal Rejection. |
| `REQ-ALLOC-001` | Allocation Timing (Post-Annexure 1 Approval) | SMT, AUT | Guide allocation blocked until `APPROVED_FOR_ALLOCATION`. |
| `REQ-ALLOC-002` | D.HOD Sole Allocation Authority | AUT, SMT | Only `ROLE_DHOD` can allocate supervisors in V1. |
| `REQ-ALLOC-003` | Exactly 1 Guide and 1 Co-Guide | UT, DBT | Schema and business rule requires 1 primary Guide and 1 Co-Guide. |
| `REQ-ALLOC-004` | Guide Hard Capacity Limit ($\le 3$) | UT, DBT, SMT | Blocks allocation if Guide's active load reaches 3. |
| `REQ-ALLOC-005` | Co-Guide Hard Capacity Limit ($\le 3$) | UT, DBT, SMT | Blocks allocation if Co-Guide's active load reaches 3. |
| `REQ-ALLOC-006` | Distinct Guide and Co-Guide ($\text{Guide} \neq \text{Co-Guide}$) | UT, DBT | Check constraint blocks identical faculty for Guide and Co-Guide. |
| `REQ-ALLOC-007` | No Faculty Acceptance/Decline Workflow | SMT, ACT | Allocation is immediately authoritative upon D.HOD assignment. |
| `REQ-ALLOC-008` | 4 Preferences Displayed on Workbench | ACT, E2E | D.HOD interface renders student's 4 ranked choices and loads. |
| `REQ-ALLOC-009` | Allocation Audit Logging & History | ALT, DBT | Immutable logging of allocations and reallocations with reason. |
| `REQ-ANN2-001` | Collaborative Formulation Space | AUT, ACT | Workspace accessible only to Student, Guide, and Co-Guide. |
| `REQ-ANN2-002` | Annexure 2 Dual Supervisor Endorsement | SMT, ACT | Requires both Guide and Co-Guide endorsements before DCEC review. |
| `REQ-ANN2-003` | Annexure 2 DCEC Title Approval | SMT, AUT | DCEC Chair approval unlocks research execution and logbook. |
| `REQ-ANN4-001` | Digital Logbook Online & Offline Modes | ACT, DBT | Captures meeting mode, metadata, agenda, action items. |
| `REQ-ANN4-002` | Online Logbook URL/Platform Metadata | UT, ACT | Validates URL, platform, agenda, target date for online meetings. |
| `REQ-ANN4-003` | Offline Logbook Location/Room Metadata | UT, ACT | Validates room number/location, agenda, target date for offline. |
| `REQ-ANN4-005` | Logbook Verification & Revision Cycle | SMT, ALT | Student submits -> Supervisor verifies (locks) or returns (unlocks). |
| `REQ-PROG-001` | Periodic Weekly/Monthly Progress Updates | ACT, SMT | Submissions with milestone status and file attachments. |
| `REQ-PROG-002` | Supervisor Progress Acknowledgement | ACT, NT | Guides review, comment upon, and acknowledge progress updates. |
| `REQ-EVAL-001` | Three Milestone Presentations (P1, P2, P3) | SMT, ACT | Scheduling and scoring checkpoints for P1, P2, and P3. |
| `REQ-EVAL-002` | P1 Scored Out of 100 (/100) | UT, DBT | Scale validation $0..100$ for Progress Presentation 1. |
| `REQ-EVAL-003` | P2 Scored Out of 100 (/100) | UT, DBT | Scale validation $0..100$ for Progress Presentation 2. |
| `REQ-EVAL-004` | P3 Scored Out of 100 (/100) | UT, DBT | Scale validation $0..100$ for Progress Presentation 3. |
| `REQ-EVAL-005` | Only P3 Contributes to Final Grade | UT, SMT | Verification that P1 and P2 do not contribute to final grade calc. |
| `REQ-EVAL-006` | Dynamic 4-Column Rubrics | UT, ACT | Rubrics require 4 performance tiers per criterion, total = 100. |
| `REQ-EVAL-007` | Rubric Version Pinning | DBT, SMT | Evaluations link to immutable `RubricVersionId`; immune to updates. |
| `REQ-ANN5-001` | Final Submission Package (PDF + Similarity) | FST, SMT | Requires final manuscript PDF and Turnitin similarity certificate. |
| `REQ-ANN5-002` | Similarity Benchmarks ($<10\%$ Plag, $0\%$ AI) | UT, ACT | Enforces validation thresholds on entered similarity metrics. |
| `REQ-ANN5-004` | Supervisor Endorsement of Annexure 5 | SMT, AUT | Guide & Co-Guide sign off on manuscript before panel formation. |
| `REQ-ANN6-001` | Confidential Supervisor Evaluation (Annexure 6)| SMT, AUT | Primary Guide submits confidential scoring and recommendation. |
| `REQ-ANN6-002` | Student Lockout from Annexure 6 | SEC, AUT, DBT | 100% negative test verification: Student blocked at all layers. |
| `REQ-PANEL-001` | 2-Member Expert Viva Defense Panel | DBT, SMT | Panel constituted with exactly 2 appointed evaluators. |
| `REQ-VIVA-001` | Final Viva Oral Defense Scoring | SMT, ACT | Panel scores defense via rubric; records composite outcome. |
| `REQ-VIVA-002` | Four Formal Defense Outcomes | UT, SMT | Validates `PASSED`, `PASSED_WITH_MINOR_REVISIONS`, `MAJOR_REVISIONS_REQUIRED`, `FAILED`. |
| `REQ-VIVA-003` | Viva Failure Re-Evaluation Cycle | SMT, E2E | Defense failure instantiates `ReVivaCycle` (Cycle index = 2). |
| `REQ-VIVA-004` | Thesis ID Immutability Across Cycles | DBT, SMT | Verifies `ThesisId` remains identical across re-viva remediation. |
| `REQ-ARCH-001` | HOD Final Administrative Sign-Off | SMT, AUT | HOD signs off on completed dissertation and corrections. |
| `REQ-ARCH-002` | Final Result Transcript Compilation | UT, SMT | Final transcript generated from approved composite scores. |
| `REQ-ARCH-003` | Institutional Archiving & Lock | SMT, DBT | Thesis transitions to `ARCHIVED`; all records become read-only. |
| `REQ-NFR-SEC-001`| Least-Privilege Contextual Authorization | AUT, SEC | Verifies token, role, department, and relational binding. |
| `REQ-NFR-SEC-002`| Confidential Data Isolation via RLS | DBT, SEC | PostgreSQL RLS prevents student sessions from reading Annexure 6. |
| `REQ-NFR-SEC-003`| OWASP Top 10 Hardening | SEC | SQLi, XSS, CSRF, IDOR, and broken object authorization suites. |
| `REQ-NFR-SEC-004`| Zero Secrets in Code / Bundles | SEC | Static security scan verifies zero credentials in client assets. |
| `REQ-NFR-PERF-001`| Page FCP $\le 1.5$ seconds | PERF | Dashboard render performance benchmarks. |
| `REQ-NFR-PERF-002`| API p95 Latency $\le 300\text{ ms}$ | PERF | Transactional API latency benchmarks under load. |
| `REQ-NFR-PERF-003`| 500+ Concurrent Sessions During Defense | PERF | Concurrent milestone evaluation load simulation. |
| `REQ-NFR-REL-001`| 1-Year Prototype Document Retention | FST, DBT | Prototype retention policy and timestamp verification. |
| `REQ-NFR-A11Y-001`| WCAG 2.1 Level AA Compliance | A11Y | Automated axe-core scans and manual keyboard/ARIA verification. |
| `REQ-NFR-A11Y-002`| Responsive Layouts (Desktop to Tablet) | UI, A11Y | Viewport breakpoint verification (320px to 1440px+). |

---

## 4. Authentication Test Suite

Governed by [`docs/02_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/02_ARCHITECTURE.md) and [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md).

```
AUTHENTICATION TEST BOUNDARIES
┌──────────────────────────────┬─────────────────────────────────────────────────────────┐
│ Target Area                  │ Verification Objective                                  │
├──────────────────────────────┼─────────────────────────────────────────────────────────┤
│ Valid Credential Flow        │ Authenticated session cookie established (HttpOnly).    │
│ Invalid Credential Flow      │ 401 Unauthorized returned; generic message; no leak.    │
│ Brute-Force Rate Limiting    │ Rapid failed logins trigger rate limit (threshold OPEN).│
│ Session Invalidation         │ Logout terminates session server-side; cookie cleared.  │
│ Session Expiration           │ Expired token rejected with 401 on protected route.     │
│ Pre-Seeded Accounts          │ Pre-seeded Student, Faculty, Admin logins function.     │
│ Passwordless / SSO Mock      │ Prototype identity verification without credentials.    │
└──────────────────────────────┴─────────────────────────────────────────────────────────┘
```

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-AUTH-001` | Authentication | Pre-seeded user exists with valid credentials | Submit login request with valid credentials | `200 OK`, `dms_session` cookie set with `HttpOnly; Secure; SameSite=Lax`, user profile returned | P0 |
| `TC-AUTH-002` | Authentication | Pre-seeded user exists | Submit login request with invalid password | `401 Unauthorized`, error code `AUTH_INVALID_CREDENTIALS`, no session cookie issued | P0 |
| `TC-AUTH-003` | Authentication | User has active authenticated session | Submit logout request `POST /api/v1/auth/logout` | `200 OK`, session invalidated server-side, cookie cleared, subsequent API calls return `401` | P0 |
| `TC-AUTH-004` | Authentication | Active session token exists | Simulate token expiration timestamp | Subsequent request returns `401 Unauthorized`, requires re-authentication | P1 |
| `TC-AUTH-005` | Authentication | Unauthenticated caller | Attempt access to protected endpoint `GET /api/v1/theses` | `401 Unauthorized`, response envelope conforms to `ApiErrorResponse` | P0 |
| `TC-AUTH-006` | Authentication | Pre-seeded user | Submit 10 consecutive failed login attempts | Request 11 returns `429 Too Many Requests`, incident logged to security stream *(Threshold: OPEN)* | P1 |
| `TC-AUTH-007` | Authentication | Admin deactivates user account | Deactivated user attempts API request with previous token | `401 Unauthorized`, session revoked upon account status check | P1 |

---

## 5. Role-Based Access Control (RBAC) Test Suite

Governed strictly by [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md).

> [!IMPORTANT]
> **CRITICAL SEPARATION TO VERIFY**: `ROLE_ADMIN` possesses **ZERO** academic approval, allocation, evaluation, or endorsement authority. Tests must guarantee Admin cannot execute `DCEC_CHAIR_APPROVE`, `SUPERVISOR_ALLOCATE`, or submit grades.

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-RBAC-001` | RBAC | Authenticated as `ROLE_STUDENT` | Attempt calling `GET /api/v1/theses/{otherStudentThesisId}` | `403 Forbidden`, `ACCESS_DENIED`, cross-student read blocked | P0 |
| `TC-RBAC-002` | RBAC | Authenticated as `ROLE_STUDENT` | Attempt calling `GET /api/v1/theses/{ownThesisId}/annexure-6` | `403 Forbidden`, `ANNEXURE_6_RESTRICTED`, student permanently denied | P0 |
| `TC-RBAC-003` | RBAC | Authenticated as `ROLE_FACULTY` (not assigned) | Attempt endorsing Annexure 2 on unassigned thesis | `403 Forbidden`, `RELATIONAL_BINDING_REQUIRED`, action rejected | P0 |
| `TC-RBAC-004` | RBAC | Authenticated as `ROLE_DC` (Maker) | Attempt executing `POST /api/v1/dcec/dockets/{id}/decide` (Approve) | `403 Forbidden`, `PERMISSION_DENIED` (`DCEC_CHAIR_APPROVE` required) | P0 |
| `TC-RBAC-005` | RBAC | Authenticated as `ROLE_ADMIN` (Technical) | Attempt executing `POST /api/v1/dcec/dockets/{id}/decide` (Approve) | `403 Forbidden`, Admin strictly prohibited from academic approvals | P0 |
| `TC-RBAC-006` | RBAC | Authenticated as `ROLE_ADMIN` | Attempt executing `POST /api/v1/allocations/assign` | `403 Forbidden`, Admin strictly prohibited from supervisor allocation | P0 |
| `TC-RBAC-007` | RBAC | Authenticated as `ROLE_HOD` (DCEC Chair) | Execute `POST /api/v1/dcec/dockets/{id}/decide` (Approve) | `200 OK`, decision recorded, state transitions to `APPROVED_FOR_ALLOCATION` | P0 |
| `TC-RBAC-008` | RBAC | Authenticated as `ROLE_DHOD` with active delegation | Execute `POST /api/v1/dcec/dockets/{id}/decide` (Approve) | `200 OK`, delegation verified, decision committed | P0 |
| `TC-RBAC-009` | RBAC | Authenticated as `ROLE_DHOD` with EXPIRED delegation | Execute `POST /api/v1/dcec/dockets/{id}/decide` (Approve) | `403 Forbidden`, `DELEGATION_EXPIRED`, approval blocked | P0 |
| `TC-RBAC-010` | RBAC | Authenticated as `ROLE_GUIDE` (assigned) | Submit Annexure 6 confidential evaluation | `201 Created`, Annexure 6 committed, student access blocked | P0 |
| `TC-RBAC-011` | RBAC | Authenticated as `ROLE_PANEL_MEMBER` (unassigned) | Attempt submitting viva score for unassigned thesis | `403 Forbidden`, caller not in appointed 2-member panel | P0 |
| `TC-RBAC-012` | RBAC | Authenticated as `ROLE_ADMIN` | Call `POST /api/v1/rubrics` (create rubric template) | `201 Created`, rubric draft created (Admin holds technical rubric power)| P1 |

---

## 6. Resource-Level Authorization & Anti-IDOR Test Suite

Governed by [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/07_API_CONTRACTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/07_API_CONTRACTS.md), and [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md).

```
RESOURCE-LEVEL AUTHORIZATION VALIDATION MATRIX
┌──────────────────────────────┬───────────────────────────────┬─────────────────────────┐
│ Resource Entity              │ Relational Binding Rule       │ Unauthorized Action     │
├──────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ Thesis Aggregate Root        │ StudentId == CurrentUser.Id   │ Other student → 403     │
│ Annexure 2 Title Docket      │ Guide/CoGuide == CurrentUser  │ Other faculty → 403     │
│ Annexure 4 Digital Logbook   │ Assigned Guide/CoGuide        │ Other faculty → 403     │
│ Annexure 6 Confidential Eval │ Primary Guide of Record Only  │ Student / Admin → 403   │
│ Viva Defense Scorecard       │ Appointed 2-Member Panel      │ Non-panel faculty → 403 │
│ Department Allocation Queue  │ DepartmentId == User.DeptId   │ Other dept DHOD → 403   │
└──────────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-IDOR-001` | IDOR | Student A knows valid UUID of Student B's Annexure 1 | Student A requests `GET /api/v1/annexures/annexure-1/{uuidB}` | `403 Forbidden`, resource not returned | P0 |
| `TC-IDOR-002` | IDOR | Student A knows valid UUID of own Annexure 6 record | Student A requests `GET /api/v1/annexures/annexure-6/{uuid}` | `403 Forbidden`, Annexure 6 access blocked unconditionally | P0 |
| `TC-IDOR-003` | IDOR | Faculty A knows valid UUID of Faculty B's assigned thesis | Faculty A attempts `POST /api/v1/theses/{idB}/logbook/entries/{entry}/verify` | `403 Forbidden`, unassigned supervisor cannot verify logs | P0 |
| `TC-IDOR-004` | IDOR | D.HOD from Department X | Attempts supervisor allocation on Department Y thesis | `403 Forbidden`, cross-department allocation blocked | P0 |
| `TC-IDOR-005` | IDOR | Authenticated user manipulates `studentId` in request payload | Submits Annexure 1 with `studentId = {otherUserUUID}` | Server extracts actor from session cookie, ignores payload `studentId` | P0 |
| `TC-IDOR-006` | IDOR | Caller requests non-existent UUID `00000000-0000-0000-0000-000000000000` | `GET /api/v1/theses/{uuid}` | `404 Not Found` with standard `ApiErrorResponse` envelope | P2 |

---

## 7. State Machine Transition Test Suite

Governed strictly by [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md).

```
STATE MACHINE TRANSITION TEST MAP
┌──────────────────────────────────────┬─────────────────────────────────────────────────┐
│ Legal Transition Path                │ Guard Conditions Verified                       │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ DRAFT_PROPOSAL → ANNEXURE_1_SUBMITTED│ Exactly 4 distinct Guide preferences selected   │
│ ANNEXURE_1_SUBMITTED → DCEC_SCREENING│ DC verification checklist complete              │
│ DCEC_SCREENING → APPROVED_ALLOCATION │ DCEC Chair approval authority verified          │
│ APPROVED_ALLOCATION → SUPERVISORS_SET│ Guide != Co-Guide; Guide Load <= 3; Co-Guide<=3 │
│ SUPERVISORS_SET → ANNEXURE_2_SUBMIT  │ Collaborative formulation workspace complete    │
│ ANNEXURE_2_SUBMIT → ANN2_ENDORSED    │ Both Guide and Co-Guide endorsements recorded   │
│ ANN2_ENDORSED → ANN2_DCEC_APPROVED   │ DCEC Chair title approval committed             │
│ ANN2_DCEC_APPROVED → RESEARCH_ACTIVE │ Unlocks logbook and milestone scheduling        │
│ RESEARCH_ACTIVE → P1/P2/P3 EVALUATED │ 4-column rubric scored /100; version pinned     │
│ P3_COMPLETED → ANNEXURE_5_SUBMITTED  │ Final manuscript PDF + Turnitin cert (<10% plag)│
│ ANNEXURE_5_SUBMITTED → ANN6_PENDING  │ Dual supervisor endorsements completed          │
│ ANN6_PENDING → PANEL_CONSTITUTED     │ Confidential guide score submitted (Student BLK)│
│ PANEL_CONSTITUTED → VIVA_DEFENSE     │ 2-member panel appointed; venue scheduled       │
│ VIVA_DEFENSE → RE_VIVA_INITIATED     │ Viva Failed; ReVivaCycle created (Same ThesisId)│
│ VIVA_DEFENSE → HOD_FINAL_SIGN_OFF    │ Viva Passed; composite grade compiled           │
│ HOD_FINAL_SIGN_OFF → ARCHIVED        │ Institutional archive lock; transcript sealed   │
└──────────────────────────────────────┴─────────────────────────────────────────────────┘
```

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-SMT-001` | State Machine | Thesis in `DRAFT_PROPOSAL` | Student submits with 3 preferences | Rejection `400 Bad Request`, requires exactly 4 distinct preferences | P0 |
| `TC-SMT-002` | State Machine | Thesis in `DRAFT_PROPOSAL` | Student submits with 4 distinct preferences | State transitions to `ANNEXURE_1_SUBMITTED`, audit record written | P0 |
| `TC-SMT-003` | State Machine | Thesis in `ANNEXURE_1_SUBMITTED` | Student attempts direct transition to `VIVA_DEFENSE_SCHEDULED` | `400 Bad Request` / `409 Conflict`, illegal transition blocked | P0 |
| `TC-SMT-004` | State Machine | Thesis in `DCEC_SCREENING_QUEUE` | DCEC Chair approves proposal | State transitions to `APPROVED_FOR_ALLOCATION` | P0 |
| `TC-SMT-005` | State Machine | Thesis in `DCEC_SCREENING_QUEUE` | DCEC Chair requests revision | State transitions to `ANNEXURE_1_REVISION`, unlocks for student | P0 |
| `TC-SMT-006` | State Machine | Thesis in `DCEC_SCREENING_QUEUE` | DCEC Chair rejects proposal | State transitions to `PROPOSAL_REJECTED_TERMINAL` (terminal) | P0 |
| `TC-SMT-007` | State Machine | Thesis in `PROPOSAL_REJECTED_TERMINAL` | Attempt submitting revised Annexure 1 on same docket | `409 Conflict`, terminal state is permanently immutable | P0 |
| `TC-SMT-008` | State Machine | Thesis in `ANNEXURE_2_SUBMITTED` | Guide endorses, Co-Guide has NOT endorsed | State transitions to `ANNEXURE_2_GUIDE_ENDORSED` (not yet DCEC ready) | P1 |
| `TC-SMT-009` | State Machine | Thesis in `ANNEXURE_2_GUIDE_ENDORSED` | Co-Guide endorses | State transitions to `ANNEXURE_2_SUPERVISOR_ENDORSED`, queues for DCEC | P1 |
| `TC-SMT-010` | State Machine | Thesis in `RESEARCH_EXECUTION` | Attempt submitting Annexure 5 before P3 completion | `409 Conflict`, Annexure 5 requires P3 completed state | P0 |
| `TC-SMT-011` | State Machine | Thesis in `ANNEXURE_5_SUPERVISOR_ENDORSED` | Supervisor endorsements complete | Automated trigger transitions state to `ANNEXURE_6_PENDING` | P0 |
| `TC-SMT-012` | State Machine | Thesis in `ARCHIVED` | Any user attempts update to thesis title or scores | `409 Conflict`, archived thesis is permanently read-only | P0 |

---

## 8. Complete 14-Phase Thesis Workflow Test Suite

Governed by [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) and [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-WF-001` | Workflow: Phase 1-2 | Student enrolled | Student submits Annexure 1 with Title, Abstract, 4 Preferences | Proposal submitted into DC verification queue | P0 |
| `TC-WF-002` | Workflow: Phase 3 | Annexure 1 submitted | DC verifies docket -> DCEC Chair approves | Docket clears screening, moves to D.HOD allocation workbench | P0 |
| `TC-WF-003` | Workflow: Phase 4 | Proposal in allocation queue | D.HOD assigns Guide and Co-Guide ($\text{loads} \le 3$) | Supervisors allocated, collaborative workspace initialized | P0 |
| `TC-WF-004` | Workflow: Phase 5-6 | Supervisors allocated | Student drafts Annexure 2 -> Both supervisors endorse -> DCEC approves | Title baselined, research phase and logbook unlocked | P0 |
| `TC-WF-005` | Workflow: Phase 7 | Research active | Student logs online meeting with URL -> Guide verifies | Logbook entry verified and locked against modifications | P1 |
| `TC-WF-006` | Workflow: Phase 8 | Research active | Student submits monthly progress report -> Supervisors ack | Progress recorded, milestone eligibility maintained | P1 |
| `TC-WF-007` | Workflow: Phase 9 | P1, P2 checkpoints | DC schedules presentations -> DCEC scores via rubric (/100) | P1 (/100) and P2 (/100) completed as diagnostic milestones | P1 |
| `TC-WF-008` | Workflow: Phase 9 | P3 checkpoint | DC schedules P3 -> Committee scores via rubric (/100) | P3 completed (/100), unlocks Annexure 5 final submission | P0 |
| `TC-WF-009` | Workflow: Phase 10 | P3 completed | Student uploads manuscript PDF and Turnitin cert ($<10\%$) | Annexure 5 submitted for supervisor endorsement | P0 |
| `TC-WF-010` | Workflow: Phase 11 | Annexure 5 endorsed | Guide completes Annexure 6 evaluation | Confidential score submitted, Student blocked, panel queue active | P0 |
| `TC-WF-011` | Workflow: Phase 12 | Annexure 6 completed | HOD appoints 2-member panel -> Oral defense conducted | Panel scores defense via rubric, submits composite outcome | P0 |
| `TC-WF-012` | Workflow: Phase 13 | Defense passed | HOD reviews compliance docket and signs off | Final grade compiled from P3, Guide, and Viva scores | P0 |
| `TC-WF-013` | Workflow: Phase 14 | Final sign-off complete | System executes archival lock | Dissertation permanently archived, transcript generated | P0 |

---

## 9. Departmental Continuation & Evaluation Committee (DCEC) Tests

Governed by [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) §8.1 and [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-DCEC-001` | DCEC | Annexure 1 in `ANNEXURE_1_SUBMITTED` | DC compiles docket and marks verification checklist | Docket transitions to `DCEC_SCREENING_QUEUE`, audit record logged | P0 |
| `TC-DCEC-002` | DCEC | Docket in `DCEC_SCREENING_QUEUE` | DC attempts executing `DCEC_CHAIR_APPROVE` | `403 Forbidden`, DC is Maker only, cannot execute Checker approval | P0 |
| `TC-DCEC-003` | DCEC | Docket in `DCEC_SCREENING_QUEUE` | System Admin attempts executing `DCEC_CHAIR_APPROVE` | `403 Forbidden`, Admin ≠ DCEC Chair architectural invariant enforced | P0 |
| `TC-DCEC-004` | DCEC | Docket in `DCEC_SCREENING_QUEUE` | HOD (default DCEC Chair) approves docket | `200 OK`, transitions to `APPROVED_FOR_ALLOCATION`, audit logged | P0 |
| `TC-DCEC-005` | DCEC | HOD creates delegation to D.HOD | D.HOD executes `DCEC_CHAIR_APPROVE` on active docket | `200 OK`, delegation verified from database, decision committed | P0 |
| `TC-DCEC-006` | DCEC | Delegation expired or revoked | D.HOD attempts `DCEC_CHAIR_APPROVE` | `403 Forbidden`, `DELEGATION_EXPIRED`, approval blocked | P0 |
| `TC-DCEC-007` | DCEC | Minimum quorum / voting mechanics | Execution of screening review | *OPEN TESTING DEPENDENCY*: Verify default single-chair sign-off | P1 |

---

## 10. Guide & Co-Guide Allocation Test Suite

Governed by [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) §8.2 and [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md) (`REQ-ALLOC-001` to `REQ-ALLOC-010`).

```
SUPERVISOR ALLOCATION CONSTRAINT MATRIX
┌──────────────────────────────┬───────────────────────────────┬─────────────────────────┐
│ Constraint Description       │ Boundary Rule                 │ Violation Outcome       │
├──────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ Guide Hard Load Limit        │ Active Guide Theses <= 3      │ Assignment blocked (400)│
│ Co-Guide Hard Load Limit     │ Active Co-Guide Theses <= 3   │ Assignment blocked (400)│
│ Distinct Supervisors         │ Guide != Co-Guide             │ Assignment blocked (400)│
│ Allocating Authority         │ D.HOD Only in V1              │ Other roles blocked(403)│
│ Faculty Accept/Decline       │ No acceptance step in V1      │ Immediately assigned    │
│ Reallocation Audit           │ Mandatory justification text  │ Reallocation logged     │
│ Automated / AI Matching      │ Strictly Non-Goal for V1      │ Excluded from V1        │
└──────────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-ALLOC-001` | Allocation | Thesis in `APPROVED_FOR_ALLOCATION` | D.HOD opens Allocation Workbench | 4 student preferences and real-time faculty loads displayed | P0 |
| `TC-ALLOC-002` | Allocation | Faculty member has Active Guide Load = 3 | D.HOD attempts assigning faculty as Guide on 4th thesis | `400 Bad Request`, `OVER_CAPACITY_LIMIT`, allocation blocked | P0 |
| `TC-ALLOC-003` | Allocation | Faculty member has Active Co-Guide Load = 3 | D.HOD attempts assigning faculty as Co-Guide on 4th thesis | `400 Bad Request`, `OVER_CAPACITY_LIMIT`, allocation blocked | P0 |
| `TC-ALLOC-004` | Allocation | Valid faculty members | D.HOD assigns same faculty as both Guide and Co-Guide | `400 Bad Request`, `IDENTICAL_SUPERVISOR_ASSIGNMENT`, blocked | P0 |
| `TC-ALLOC-005` | Allocation | Valid faculty (loads < 3) | D.HOD assigns distinct Guide and Co-Guide | `200 OK`, loads incremented, status `SUPERVISORS_ALLOCATED` | P0 |
| `TC-ALLOC-006` | Allocation | Faculty member assigned | Faculty checks for Accept/Decline prompt | No prompt exists; assignment is immediately authoritative | P0 |
| `TC-ALLOC-007` | Allocation | Supervised thesis active | D.HOD reallocates Guide with justification text | `200 OK`, allocation history record created, loads updated | P0 |
| `TC-ALLOC-008` | Allocation | Supervised thesis active | D.HOD attempts reallocation WITHOUT justification text | `400 Bad Request`, `JUSTIFICATION_REQUIRED`, reallocation blocked | P1 |
| `TC-ALLOC-009` | Allocation | Authenticated as Guide / Admin | Attempt calling `POST /api/v1/allocations/assign` | `403 Forbidden`, sole allocation authority belongs to D.HOD | P0 |

---

## 11. Annexure Lifecycle Test Suite (Annexures 1, 2, 4, 5, 6)

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-ANN-001` | Annexure 1 | Student drafting Annexure 1 | Submits duplicate Guide preference (e.g. Guide A as Pref 1 and Pref 2)| `400 Bad Request`, preferences must be 4 distinct faculty members | P0 |
| `TC-ANN-002` | Annexure 2 | Supervisors allocated | Student submits Annexure 2 with methodology and finalized title | Annexure 2 submitted, notifications dispatched to Guide & Co-Guide | P0 |
| `TC-ANN-003` | Annexure 4 | Annexure 2 approved | Student creates Online log entry with Google Meet URL and agenda | Entry saved in `LOGBOOK_ENTRY_SUBMITTED`, supervisor notified | P1 |
| `TC-ANN-004` | Annexure 4 | Logbook entry submitted | Guide returns entry with feedback remarks | Entry unlocked in `LOGBOOK_ENTRY_REVISION`, student notified | P1 |
| `TC-ANN-005` | Annexure 4 | Logbook entry resubmitted | Guide verifies entry | Entry locked in `LOGBOOK_ENTRY_VERIFIED`, cannot be edited | P1 |
| `TC-ANN-006` | Annexure 5 | P3 completed | Student uploads thesis PDF and Turnitin report ($<10\%$ similarity) | Annexure 5 package committed, awaiting supervisor endorsement | P0 |
| `TC-ANN-007` | Annexure 5 | P3 completed | Student enters plagiarism similarity = $15\%$ | `400 Bad Request`, exceeds institutional benchmark of $<10\%$ | P0 |
| `TC-ANN-008` | Annexure 6 | Annexure 5 endorsed | Primary Guide submits confidential score sheet and recommendation | Annexure 6 committed; defense panel queue unlocked | P0 |
| `TC-ANN-009` | Annexure 6 | Annexure 6 submitted | Student attempts direct API call `GET /api/v1/annexures/annexure-6/{id}` | `403 Forbidden`, student access denied at all times | P0 |
| `TC-ANN-010` | Annexure 6 | Annexure 6 submitted | Student inspects frontend DOM / network requests | Zero references, tokens, or endpoints for Annexure 6 exposed | P0 |

---

## 12. Milestone Evaluation & Progress Review Test Suite (P1, P2, P3)

Governed by [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) §8.3 and [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md) (`REQ-EVAL-001` to `REQ-EVAL-008`).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-EVAL-001` | Milestone | P1 scheduled | Evaluator submits score = 85/100 using active 4-column rubric | `200 OK`, P1 scored out of 100, diagnostic checkpoint completed | P0 |
| `TC-EVAL-002` | Milestone | P2 scheduled | Evaluator submits score = 92/100 using active 4-column rubric | `200 OK`, P2 scored out of 100, mid-term checkpoint completed | P0 |
| `TC-EVAL-003` | Milestone | P3 scheduled | Evaluator submits score = 88/100 using active 4-column rubric | `200 OK`, P3 scored out of 100, enables Annexure 5 preparation | P0 |
| `TC-EVAL-004` | Milestone | Evaluator scoring P1 | Submits score = 105 or -5 | `400 Bad Request`, score must be within $0..100$ | P0 |
| `TC-EVAL-005` | Milestone | Final grade calculation | Calculate composite score with P1=80, P2=90, P3=85 | Verification: ONLY P3 (85) enters final calculation; P1/P2 excluded | P0 |
| `TC-EVAL-006` | Milestone | Final grade formula | Execution of final grade compilation beyond P3 | *OPEN TESTING DEPENDENCY*: Formula parameters driven by config | P1 |

---

## 13. Dynamic Rubric Lifecycle Test Suite

Governed by [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) §8.5 and [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md) §10.

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-RUB-001` | Rubrics | Admin in Rubric Builder | Configures criterion with exactly 4 achievement tiers, total = 100 | Rubric version drafted with valid 4-column schema | P1 |
| `TC-RUB-002` | Rubrics | Admin in Rubric Builder | Configures criteria totaling 90 marks (not 100) | `400 Bad Request`, rubric criteria max marks must sum to 100 | P1 |
| `TC-RUB-003` | Rubrics | Rubric v1 published | P1 evaluation completed against Rubric v1 | Evaluation record pinned to `RubricVersionId = v1` | P0 |
| `TC-RUB-004` | Rubrics | Rubric v1 active | Admin publishes Rubric v2 with modified criterion weights | Rubric v2 becomes active; Rubric v1 transitions to historical | P0 |
| `TC-RUB-005` | Rubrics | Rubric v2 published | View past evaluation completed under Rubric v1 | Past evaluation retains exact Rubric v1 criteria and scores (unchanged)| P0 |

---

## 14. Viva Defense & Failure Remediation Cycle Test Suite

Governed by [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) §8.5 and [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md) §12.

```
VIVA DEFENSE RETRY / REMEDIATION WORKFLOW
┌────────────────────────────────────────────────────────────────────────┐
│ Viva Attempt 1 (Thesis UUID: e8a2... ; Cycle Index: 1)                │
│   ↓                                                                    │
│ Oral Defense Conducted → Outcome: FAILED / MAJOR_REVISIONS_REQUIRED    │
│   ↓                                                                    │
│ Remediation Triggered:                                                 │
│   • ThesisId REMAINS EXACTLY e8a2... (IMMUTABLE IDENTITY)              │
│   • ReVivaCycle created (Cycle Index = 2)                              │
│   • Historical Attempt 1 scorecard preserved in perpetuity             │
│   ↓                                                                    │
│ Student Prepares Revised Annexure 5 → Supervisors Re-Endorse           │
│   ↓                                                                    │
│ Viva Attempt 2 (Thesis UUID: e8a2... ; Cycle Index: 2)                │
│   ↓                                                                    │
│ Oral Defense Conducted → Outcome: PASSED → HOD Final Sign-off         │
└────────────────────────────────────────────────────────────────────────┘
```

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-VIVA-001` | Viva | 2-member panel appointed | Defense conducted, panel records outcome = `PASSED` | Transitions to `HOD_FINAL_SIGN_OFF`, final result compilation | P0 |
| `TC-VIVA-002` | Viva | 2-member panel appointed | Defense conducted, panel records outcome = `FAILED` | Transitions to `RE_VIVA_CYCLE_INITIATED`, cycle index incremented to 2 | P0 |
| `TC-VIVA-003` | Viva | Defense failed in Attempt 1 | Inspect `Thesis.id` after remediation cycle initiation | `Thesis.id` (UUID) remains strictly identical; previous ID preserved | P0 |
| `TC-VIVA-004` | Viva | Remediation cycle active | Query historical viva evaluation records for Attempt 1 | Attempt 1 score sheet, panel remarks, and failure outcome fully intact | P0 |
| `TC-VIVA-005` | Viva | Remediation cycle active | Student resubmits revised Annexure 5 -> Supervisors re-endorse | Revised manuscript submitted under Attempt 2 docket | P0 |
| `TC-VIVA-006` | Viva | Attempt 2 defense convened | Panel evaluates Attempt 2 defense -> records `PASSED` | Attempt 2 passes, moves to HOD sign-off, both attempts in audit log | P0 |

---

## 15. File Storage & Document Security Test Suite

Governed strictly by [`docs/09_FILE_STORAGE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/09_FILE_STORAGE.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-FILE-001` | File Storage | Student uploading Annexure 1 | Uploads valid PDF file of size 3.2 MB | `201 Created`, file stored with UUID key, SHA-256 hash recorded | P0 |
| `TC-FILE-002` | File Storage | Student uploading Annexure 1 | Uploads file of size 5.8 MB (exceeds prototype limit) | `400 Bad Request`, `FILE_TOO_LARGE`, exceeds 5 MB prototype limit | P0 |
| `TC-FILE-003` | File Storage | Attacker uploads executable `.exe` renamed to `.pdf` | Upload file with fake MIME header | `400 Bad Request`, `INVALID_FILE_TYPE`, magic-byte inspection fails | P0 |
| `TC-FILE-004` | File Storage | Attacker attempts path traversal | Upload file with filename `../../etc/passwd.pdf` | Sanitized to safe UUID storage key; path traversal defeated | P0 |
| `TC-FILE-005` | File Storage | Authorized user requests download | Call `GET /api/v1/documents/{id}/download` | `200 OK`, short-lived signed URL returned (validity $\le 15$ mins) | P0 |
| `TC-FILE-006` | File Storage | Signed download URL generated | Access signed URL after 16 minutes | `403 Forbidden` / `AccessDenied` from storage provider | P1 |
| `TC-FILE-007` | File Storage | Public bucket exposure test | Attempt direct unauthenticated HTTP GET on storage bucket URL | `403 Forbidden`, direct public access permanently disabled | P0 |
| `TC-FILE-008` | File Storage | Student revisions | Upload revised manuscript ($v2$) following feedback | New `document_versions` row created ($v2$), $v1$ preserved | P0 |

---

## 16. Notification Test Suite

Governed by [`docs/10_NOTIFICATION_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/10_NOTIFICATION_MODEL.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-NOTIF-001`| Notifications | Annexure 1 submitted | System emits `ANNEXURE_1_SUBMITTED` event | Notification created for Department Coordinator; unread count = 1 | P1 |
| `TC-NOTIF-002`| Notifications | Guide allocated by D.HOD | System emits `SUPERVISORS_ALLOCATED` event | Notifications dispatched to Student, assigned Guide, and Co-Guide | P1 |
| `TC-NOTIF-003`| Notifications | Guide submits Annexure 6 | System emits `ANNEXURE_6_SUBMITTED` event | Notification sent to HOD; **ZERO notification sent to Student** | P0 |
| `TC-NOTIF-004`| Notifications | Notification dispatched to user | User opens in-app notification and marks read | Unread count decrements; status transitions to `READ` | P2 |
| `TC-NOTIF-005`| Notifications | Notification payload generated | Inspect payload of milestone evaluation notice | Contains event summary and link; contains no secrets or raw tokens | P1 |

---

## 17. Audit Logging & Compliance Test Suite

Governed strictly by [`docs/08_AUDIT_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/08_AUDIT_MODEL.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-AUD-001` | Audit | DCEC Chair approves proposal | Action committed in transaction | `audit_events` row created with actor UUID, role, action, and UTC timestamp | P0 |
| `TC-AUD-002` | Audit | D.HOD reallocates supervisor | Action committed in transaction | `audit_events` captures previous Guide UUID and new Guide UUID | P0 |
| `TC-AUD-003` | Audit | Database connection established | Application user attempts `UPDATE audit_events SET action = ...` | `403 Forbidden` / SQL Error: zero UPDATE privileges on audit table | P0 |
| `TC-AUD-004` | Audit | Database connection established | Application user attempts `DELETE FROM audit_events` | `403 Forbidden` / SQL Error: zero DELETE privileges on audit table | P0 |
| `TC-AUD-005` | Audit | State mutation fails midway | State machine transition aborts due to validation error | Transaction rolls back; no orphan audit event committed | P0 |
| `TC-AUD-006` | Audit | Audit record generated | Inspect audit metadata payload | Passwords, JWT secrets, and document binary payloads are 100% absent | P0 |
| `TC-AUD-007` | Audit | Student attempts viewing audit log | Call `GET /api/v1/audit/events` | `403 Forbidden`, audit log view restricted to Admin and HOD only | P0 |

---

## 18. Database Integrity Test Suite

Governed by [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-DB-001` | Database | Same active academic session | Attempt inserting 2 theses with identical title (case-insensitive) | Unique constraint violation (`uq_theses_normalized_title_cohort`) | P0 |
| `TC-DB-002` | Database | Guide allocation insertion | Attempt inserting allocation with `guide_id == coguide_id` | Check constraint violation (`chk_guide_allocations_distinct_supervisors`)| P0 |
| `TC-DB-003` | Database | Milestone scorecard insertion | Attempt inserting score = -10 or score = 150 | Check constraint violation (`chk_evaluations_score_range`) | P0 |
| `TC-DB-004` | Database | Student database session | Query `document_versions` joined with Annexure 6 doc type | Row Level Security (RLS) returns 0 rows; student blocked at data tier | P0 |
| `TC-DB-005` | Database | Foreign key integrity | Attempt deleting user record referenced by active `theses.student_id`| Foreign key `ON DELETE RESTRICT` blocks deletion | P0 |
| `TC-DB-006` | Database | Timestamp generation | Insert operational entity record | Server clock generates `created_at` in UTC (`TIMESTAMPTZ`) | P1 |

---

## 19. API Contracts & Interface Test Suite

Governed by [`docs/07_API_CONTRACTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/07_API_CONTRACTS.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-API-001` | API | Valid authenticated request | Call `GET /api/v1/theses/{id}` | Response strictly conforms to `ApiResponse<ThesisDto>` JSON envelope | P1 |
| `TC-API-002` | API | Validation error on payload | Call `POST /api/v1/theses` with missing required title | `400 Bad Request`, conforms to `ApiErrorResponse` with details array | P1 |
| `TC-API-003` | API | Pagination request | Call `GET /api/v1/theses?page=1&limit=20` | Returns pagination metadata: `page`, `limit`, `totalRecords`, `totalPages`| P2 |
| `TC-API-004` | API | Pagination limit exceeded | Call `GET /api/v1/theses?limit=500` | Rejects or clamps limit to maximum allowable of 100 | P2 |
| `TC-API-005` | API | Traceability header | Submit request with `X-Correlation-ID: {uuid}` | Response echoes `X-Correlation-ID` header and meta field | P2 |

---

## 20. Security & Penetration Test Suite

Governed by [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-SEC-001` | Security | Student submitting thesis title | Injects `<script>alert('XSS')</script>` in title field | Stored as plain text, HTML-encoded upon render, no script executes | P0 |
| `TC-SEC-002` | Security | Search endpoint | Submits SQL injection payload `' OR 1=1; --` in query | Parameterized query handles input safely; no SQL injection | P0 |
| `TC-SEC-003` | Security | Authenticated Student session | Manipulates HTTP header `X-User-Role: ROLE_HOD` | Server derives role exclusively from session cookie; header ignored | P0 |
| `TC-SEC-004` | Security | Client script inspection | Inspect browser bundle and local storage | Zero private keys, service-role keys, or DB passwords exposed | P0 |
| `TC-SEC-005` | Security | Response headers | Inspect HTTP response headers on authenticated API | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` present | P1 |
| `TC-SEC-006` | Security | Cross-Site Request Forgery | Attempt cross-origin POST request with ambient credentials | Blocked by `SameSite=Lax/Strict` cookie policy / CSRF protection | P1 |

---

## 21. Accessibility (WCAG 2.1 AA) Test Suite

Governed by [`docs/12_ACCESSIBILITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/12_ACCESSIBILITY.md).

> [!NOTE]
> Testing confirms that accessibility specifications are comprehensively verified. No claim is made that unwritten code has passed these tests.

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-A11Y-001`| Accessibility | Dashboard loaded | Navigate entire interface using `Tab`, `Shift+Tab`, `Enter`, `Space` | All interactive elements reachable; focus indicator visible; no traps | P1 |
| `TC-A11Y-002`| Accessibility | Modal dialog opened | Press `Tab` continuously within modal | Focus trapped inside modal; `Escape` key closes modal and returns focus | P1 |
| `TC-A11Y-003`| Accessibility | Screen reader active | Navigate form fields with required inputs | Screen reader announces label, required state, and inline error hints | P1 |
| `TC-A11Y-004`| Accessibility | Color contrast evaluation | Automated axe-core scan on text and interactive elements | Contrast ratio $\ge 4.5:1$ for normal text, $\ge 3:1$ for large text | P1 |
| `TC-A11Y-005`| Accessibility | OS `prefers-reduced-motion` | Activate reduced motion setting in browser | Transitions and CSS animations disabled or reduced to non-distracting fade| P2 |
| `TC-A11Y-006`| Accessibility | Data tables rendered | Screen reader traverses evaluation rubric table | Table headers (`<th>`) correctly associated with cells via `scope="col/row"`| P1 |

---

## 22. Responsive UI/UX Test Suite

Governed by [`docs/11_UI_DESIGN_SYSTEM.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/11_UI_DESIGN_SYSTEM.md).

| Test ID | Area | Preconditions | Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-UI-001` | UI/UX | Mobile / Tablet viewport | Resize browser window to 768px (Tablet) and 375px (Mobile) | Layout shifts responsively, sidebar collapses to drawer, no horizontal overflow | P2 |
| `TC-UI-002` | UI/UX | Data loading state | Trigger slow network request on dashboard | Skeleton loaders render in place of content; layout shift prevented | P2 |
| `TC-UI-003` | UI/UX | Empty list state | View queue with 0 pending dockets | Informative empty state card renders with guidance message | P2 |
| `TC-UI-004` | UI/UX | Brand identity | Inspect header and login banner | NIET institutional navy/crimson color palette and logo render correctly | P2 |

---

## 23. Performance & Load Test Specifications

Governed by [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md) (`REQ-NFR-PERF-001` to `REQ-NFR-PERF-003`).

| Test ID | Area | Preconditions | Load / Target Action | Target Benchmark | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TC-PERF-001`| Performance | Standard broadband | Load student dashboard (cold & warm cache) | First Contentful Paint (FCP) $\le 1.5$ seconds | P2 |
| `TC-PERF-002`| Performance | 100 concurrent users | Execute transactional API calls (Annexure submission) | $p95$ response latency $\le 300\text{ ms}$ | P2 |
| `TC-PERF-003`| Performance | 500 concurrent sessions| Simulate peak milestone presentation evaluation window | System maintains 100% availability without unhandled 500 errors *(OPEN)* | P2 |
| `TC-PERF-004`| Performance | File upload | Upload 5 MB PDF manuscript | Upload completes within acceptable timeout without connection drop | P2 |

---

## 24. Regression Testing Strategy

Whenever modifications occur in the codebase, the following regression suites must be executed:

```
REGRESSION TRIGGER MATRIX
┌──────────────────────────────┬─────────────────────────────────────────────────────────┐
│ Change Category              │ Mandatory Regression Test Suites Required               │
├──────────────────────────────┼─────────────────────────────────────────────────────────┤
│ Database Schema Changes      │ DBT (Constraints & RLS) + SMT + ALT + ACT               │
│ RBAC / Permission Changes    │ AUT (Authorization Matrix) + SEC (Negative Pentest)     │
│ State Machine Logic Changes  │ SMT (All 22 States) + E2E 14-Phase Lifecycles           │
│ API Contract / Route Changes │ ACT (JSON Schema Conformance) + AUT + UT                │
│ Storage / Upload Handlers    │ FST (MIME & Limit Tests) + SEC (Path Traversal)         │
│ UI Component / Style Changes │ A11Y (axe-core Scans) + UI Responsive Breakpoints       │
└──────────────────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 25. Test Data & Synthetic Identity Strategy

1. **Zero Real Student PII:** Testing must use 100% synthetic user identities, roll numbers, and academic records. Real student personal data must never be loaded into testing or staging databases.
2. **Pre-Seeded Role Fixtures:**
   - `student_cse_01` (Student Candidate — CSE)
   - `student_cse_02` (Student Candidate — CSE)
   - `guide_fac_01` (Faculty — Current Active Guide Load = 2)
   - `guide_fac_at_cap` (Faculty — Current Active Guide Load = 3, at capacity)
   - `coguide_fac_01` (Faculty — Current Active Co-Guide Load = 1)
   - `dc_cse_01` (Department Coordinator — CSE)
   - `dhod_cse_01` (Deputy HOD — CSE)
   - `hod_cse_01` (Head of Department — CSE)
   - `panel_eval_01`, `panel_eval_02` (Appointed Viva Defense Panel Members)
   - `admin_tech_01` (Technical System Administrator)
3. **Deterministic Reset:** Integration and E2E test runs must execute against fresh, transaction-isolated database fixtures to guarantee repeatable test runs.

---

## 26. Dedicated Negative Security Test Suite

| Test ID | Negative Attack Scenario | Target Role / Action | Expected Result | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `TC-NEG-001` | Unauthorized student views another student's thesis | `ROLE_STUDENT` on other thesis UUID | `403 Forbidden` | P0 |
| `TC-NEG-002` | Student attempts accessing Annexure 6 evaluation | `ROLE_STUDENT` on Annexure 6 UUID | `403 Forbidden` | P0 |
| `TC-NEG-003` | Guide attempts accessing unassigned thesis logbook | `ROLE_GUIDE` on unassigned thesis | `403 Forbidden` | P0 |
| `TC-NEG-004` | Admin attempts approving DCEC screening docket | `ROLE_ADMIN` on DCEC approval route | `403 Forbidden` | P0 |
| `TC-NEG-005` | DC attempts executing final DCEC approval | `ROLE_DC` on DCEC approval route | `403 Forbidden` | P0 |
| `TC-NEG-006` | D.HOD attempts assigning Guide with Load > 3 | `ROLE_DHOD` allocating over-cap Guide | `400 Bad Request` | P0 |
| `TC-NEG-007` | D.HOD attempts assigning same person as Guide & Co-Guide | `ROLE_DHOD` on allocation | `400 Bad Request` | P0 |
| `TC-NEG-008` | Student attempts skipping from Proposal to Defense | `ROLE_STUDENT` calling defense route | `400 / 409 Conflict` | P0 |
| `TC-NEG-009` | Non-panel faculty attempts submitting viva score | `ROLE_FACULTY` on viva scoring route | `403 Forbidden` | P0 |
| `TC-NEG-010` | Caller attempts updating archived thesis record | Any role on `ARCHIVED` thesis | `409 Conflict` | P0 |
| `TC-NEG-011` | Attacker uploads malicious file with fake extension | Upload `.exe` disguised as `.pdf` | `400 Bad Request` | P0 |
| `TC-NEG-012` | Application user attempts deleting audit log record | Direct SQL delete on `audit_events` | `403 / Permission Denied`| P0 |

---

## 27. Environment Separation & Configuration

```
┌──────────────────────────────┬───────────────────────────────┬─────────────────────────┐
│ Environment                  │ Infrastructure Target         │ Security Configuration  │
├──────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ Development (Local)          │ Local container DB, mock S3   │ Synthetic test fixtures │
│ Testing / Staging (CI/CD)    │ Isolated cloud test database  │ Automated test runners  │
│ Production                   │ Institutional cloud / hosting │ Real institutional data │
└──────────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

- Production credentials and secrets must **NEVER** be present in testing environments.
- Staging environment must enforce identical Row-Level Security (RLS) policies and security headers as Production.

---

## 28. Defect Severity & Priority Classification

Defects identified during quality assurance are classified under four standard tiers:

- **`P0` (Critical Blocker):** Security vulnerability, authorization bypass, Annexure 6 data leak to student, Admin executing academic approval, database constraint failure, or complete blocker of critical academic workflow.
- **`P1` (High Severity):** Functional breakdown in a major workflow phase (e.g. logbook verification failure, rubric scoring mismatch, notification failure on critical handoff), or WCAG Level AA blocker.
- **`P2` (Normal Severity):** Minor functional defect with an operational workaround, edge-case UI glitch, or performance latency exceeding target.
- **`P3` (Minor / Cosmetic):** Typographic error, minor styling misalignment, or cosmetic enhancement not impacting academic workflow integrity.

---

## 29. Comprehensive Release Gating Criteria

A build cannot be promoted to Production unless it satisfies 100% of the following mandatory quality gates:

```
RELEASE GATING CHECKLIST
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ ] GATE-01: Zero open P0 (Critical) or P1 (High) defects.                             │
│ [ ] GATE-02: 100% pass rate on RBAC & Negative Authorization Test Suite.               │
│ [ ] GATE-03: Annexure 6 Student Lockout verified across UI, API, DB (RLS), & Storage.  │
│ [ ] GATE-04: Admin ≠ DCEC Chair Separation verified (Admin cannot approve proposals).  │
│ [ ] GATE-05: Complete 14-Phase dissertation lifecycle passes E2E verification.         │
│ [ ] GATE-06: Database constraint & RLS test suite passes with zero errors.             │
│ [ ] GATE-07: All state machine transition guards and illegal transition blocks pass.   │
│ [ ] GATE-08: File storage upload limit (5 MB) and MIME magic-byte validation verified. │
│ [ ] GATE-09: Audit log immutability and transactional capture verified.                │
│ [ ] GATE-10: Automated accessibility scan (axe-core) reveals zero WCAG AA violations.  │
│ [ ] GATE-11: Static security scan reveals zero credentials or secrets in code bundles. │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 30. Open Testing Questions

The following testing dependencies are formally **OPEN** pending institutional confirmation:

| Open Question ID | Testing Area | Unresolved Item | Current Test Strategy |
| :--- | :--- | :--- | :--- |
| `TEST-OD-001` | Authentication | Exact institutional Identity Provider (SAML / OAuth / Supabase Auth). | Test using pre-seeded accounts & mock provider. |
| `TEST-OD-002` | DCEC Governance | Minimum DCEC committee quorum and voting mechanics (`OD-001`). | Test locked single DCEC Chair sign-off; leave quorum open. |
| `TEST-OD-003` | Final Evaluation | Exact mathematical formula for final composite grade beyond P3 (`OD-002`). | Test configurable formula engine; formula weights OPEN. |
| `TEST-OD-004` | Viva Failure Policy | Institutional fee, extension timeline, and max attempts for re-viva (`OD-003`).| Test technical `ReVivaCycle` architecture; policies OPEN. |
| `TEST-OD-005` | Annexure 6 Co-Guide | Whether Co-Guide may view/co-sign Annexure 6 (`OD-004`). | Default test: Co-Guide blocked pending confirmation. |
| `TEST-OD-006` | Title Uniqueness | Cross-cohort institutional title uniqueness scope (`OD-005`). | Test active-cohort uniqueness constraint. |
| `TEST-OD-007` | Performance | Exact institutional SLA and production concurrent load targets. | Test prototype targets ($<1.5\text{s}$ FCP, $<300\text{ms}$ API). |
| `TEST-OD-008` | Penetration Testing | Third-party formal penetration testing requirement before launch. | Execute internal OWASP test suite; third-party audit OPEN. |

---

## 31. Future Testing Roadmap (Post-V1)

The following testing capabilities belong to post-V1 institutional expansion and are excluded from V1 scope:

1. **`FUT-TEST-AI`**: Testing automated AI-based Guide-Student matching algorithms.
2. **`FUT-TEST-PLAG`**: Direct live Turnitin / DrillBit API bidirectional integration testing.
3. **`FUT-TEST-ERP`**: Institutional ERP bidirectional synchronization load testing.
4. **`FUT-TEST-MFA`**: Multi-factor authentication (TOTP / SMS) penetration testing.
5. **`FUT-TEST-SCALE`**: Multi-campus high-throughput stress testing (10,000+ active candidates).

---

## 32. Anti-Hallucination & Specification Verification

- [x] **No requirement IDs invented:** All requirement IDs trace 1:1 to [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md).
- [x] **No academic policies invented:** Locked rules from [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) preserved exactly.
- [x] **No permissions invented:** Permissions trace 1:1 to [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md).
- [x] **No workflow states invented:** States trace 1:1 to [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md).
- [x] **No unresolved decisions silently resolved:** 8 open testing questions explicitly documented.
- [x] **No test results falsely claimed:** All test specifications define expected results for future execution.
- [x] **No application code, SQL, or API created:** Specification is 100% documentation.
- [x] **Only `docs/14_TEST_PLAN.md` modified:** Confirmed.

---

*Prepared by Antigravity — Phase 3J Quality Assurance & Test Plan*
