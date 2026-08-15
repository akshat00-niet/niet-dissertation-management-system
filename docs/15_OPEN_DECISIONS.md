# NIET Dissertation Management System — Open Decisions & Architectural Decision Records

**Document ID:** `DOC-15-DECISIONS`  
**File Path:** [`docs/15_OPEN_DECISIONS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/15_OPEN_DECISIONS.md)  
**Document Status:** ARCHITECTURE FREEZE BASELINE (PHASE 3K)  
**Last Revised:** 2026-08-15  
**Governing Baselines:** [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md), [`docs/01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md), [`docs/02_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/02_ARCHITECTURE.md), [`docs/03_DOMAIN_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/03_DOMAIN_MODEL.md), [`docs/04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md), [`docs/05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md), [`docs/06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md), [`docs/07_API_CONTRACTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/07_API_CONTRACTS.md), [`docs/08_AUDIT_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/08_AUDIT_MODEL.md), [`docs/09_FILE_STORAGE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/09_FILE_STORAGE.md), [`docs/10_NOTIFICATION_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/10_NOTIFICATION_MODEL.md), [`docs/11_UI_DESIGN_SYSTEM.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/11_UI_DESIGN_SYSTEM.md), [`docs/12_ACCESSIBILITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/12_ACCESSIBILITY.md), [`docs/13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md), and [`docs/14_TEST_PLAN.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/14_TEST_PLAN.md)  
**Institution:** Noida Institute of Engineering & Technology (NIET), Greater Noida  
**Target Program:** M.Tech / M.Tech Integrated Dissertation Lifecycle  

---

## 1. Document Purpose & Governance Mandate

This document serves as the **Authoritative Open Decisions Register & Architectural Decision Records (ADR) Catalog** for the NIET Dissertation Management System (DMS). It establishes the formal boundary between:
1. **LOCKED Institutional Decisions:** Rules and architectural invariants formally confirmed by NIET stakeholders.
2. **OPEN Decisions:** Academic, policy, or technical choices that are intentionally unresolved and must be decided by designated institutional authorities.
3. **V1 EXCLUSIONS (Non-Goals):** Features explicitly forbidden from implementation in Version 1.
4. **FUTURE Capabilities:** Architectural roadmap items preserved for post-V1 institutional expansion.
5. **IMPLEMENTATION DECISIONS:** Technical realization choices delegated to developers under strict architectural bounds.

> [!CAUTION]
> **CRITICAL IMPLEMENTATION SAFETY INVARIANT**:  
> **"Implementation must not invent this policy."**  
> Any AI agent, software engineer, or contractor implementing the NIET DMS must **NEVER** fabricate academic rules, grade formulas, quorum thresholds, or administrative rights for any item marked `OPEN`. Where an unconfirmed policy is encountered, the implementation must utilize the documented safe prototype default and leave the runtime parameters database-configurable.

---

## 2. Documentation Authority Hierarchy

All decision reconciliations and conflict resolutions strictly obey the 7-tier priority hierarchy defined in [`docs/00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md):

```
Priority 1: LOCKED ACADEMIC DECISIONS (Institutional & Faculty Confirmed)
   │
   ▼
Priority 2: ARCHITECTURE FREEZE (docs/02_ARCHITECTURE.md)
   │
   ▼
Priority 3: DATABASE SCHEMA (docs/06_DATABASE_SCHEMA.md)
   │
   ▼
Priority 4: RBAC / SECURITY RULES (docs/04_RBAC_MATRIX.md & docs/13_SECURITY.md)
   │
   ▼
Priority 5: UI/UX SPECIFICATIONS (docs/11_UI_DESIGN_SYSTEM.md)
   │
   ▼
Priority 6: IMPLEMENTATION DECISIONS (Source Code, Libraries, Frameworks)
   │
   ▼
Priority 7: AI-GENERATED ASSUMPTIONS (Lowest Authority — NEVER overrides higher tiers)
```

---

## 3. Decision Classification Taxonomy

Every item in this register is classified under exactly one of five canonical statuses:

| Classification | Meaning | Authority Needed to Change |
| :--- | :--- | :--- |
| **`LOCKED`** | Formally confirmed by NIET institutional authorities; frozen into architecture; must be implemented exactly as specified. | NIET Academic Council / HOD Committee |
| **`OPEN`** | Unresolved institutional policy or parameter; documented with explicit safe prototype default; no developer may invent a rule. | Designated Institutional Authority |
| **`V1 EXCLUDED`** | Explicit non-goal for Version 1; strictly forbidden from implementation to prevent scope creep. | Project Governance Committee |
| **`FUTURE`** | Planned architectural enhancement preserved for future releases post-V1. | Institutional Roadmap Committee |
| **`IMPLEMENTATION DECISION`** | Technical realization detail left to developers within the frozen architectural bounds. | Technical Lead / Core Developers |

---

## 4. Master Open Decisions Register (Institutional & Policy)

The following eighteen (18) decisions are formally **OPEN**. For each item, the implementation mandate is: **"Implementation must not invent this policy."**

| Decision ID | Decision Description | Current State & Safe Prototype Default | Why It Matters | Affected Documents | Authority Needed | Implementation Impact | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `OD-001` | **DCEC Quorum & Formal Voting Mechanism** | Default: Single-signoff by DC (Maker) + DCEC Chair (Checker). No minimum quorum or voting ratio enforced. | Determines whether DCEC approval requires multiple faculty votes or a single Chair sign-off. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/04_RBAC_MATRIX.md`<br>`docs/05_STATE_MACHINES.md` | NIET Academic Council / DCEC Committee | *Implementation must not invent this policy.* Implement single-chair approval workflow; support future multi-vote expansion via configurable committee flags. | `OPEN` |
| `OD-002` | **Final Dissertation Overall Grade Formula** | Default: Dynamic weighted calculation engine driven by database configuration. Formula weights are runtime parameters. | Determines exact mathematical contribution of P3, Annexure 6 (Supervisor), and Viva Panel scores to the final transcript mark. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/03_DOMAIN_MODEL.md`<br>`docs/06_DATABASE_SCHEMA.md` | NIET Dean Academics / HOD Committee | *Implementation must not invent this policy.* ONLY P3 among milestones enters the calculation. Build configurable formula evaluator; do not hardcode fixed percentages (e.g. 40/30/30). | `OPEN` |
| `OD-003` | **Formal Failure, Extension & Re-Viva Penalty Policy** | Default: Instantiates `ReVivaCycle` (Cycle 2) under same `ThesisId`. No automated academic dismissal or financial penalty calculated. | Governs allowable maximum attempts, extension timelines, and fees when oral defense is failed. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/05_STATE_MACHINES.md`<br>`docs/14_TEST_PLAN.md` | NIET Academic Council / Examination Cell | *Implementation must not invent this policy.* Technical architecture supports infinite remediation cycles; administrative limits must be enforced manually by HOD until formalized. | `OPEN` |
| `OD-004` | **Production Data Retention & Archiving Duration** | Default: 1-year rolling retention for Prototype V1. | Determines legal duration for keeping dissertation manuscripts, similarity reports, and audit logs. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/08_AUDIT_MODEL.md`<br>`docs/09_FILE_STORAGE.md` | NIET Legal / Institutional IT | *Implementation must not invent this policy.* Store retention timestamps in database; do not implement automated purge cron jobs in V1 without formal retention sign-off. | `OPEN` |
| `OD-005` | **Production File Upload Size & Storage Quota Limits** | Default: 5 MB per file limit for Prototype V1 (Zero-budget cloud tier). | Dictates per-student storage allocation and maximum manuscript PDF file size. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/09_FILE_STORAGE.md`<br>`docs/13_SECURITY.md` | Institutional IT / Cloud Ops | *Implementation must not invent this policy.* Enforce 5 MB in V1; drive limit from `system_configurations` table so it can be increased in production without redeployment. | `OPEN` |
| `OD-006` | **Annexure 6 Post-Defense Disclosure Policy** | Default: Permanently locked against student view in all states, including post-graduation. | Determines if confidential supervisor evaluation remains hidden forever or unlocks upon graduation. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/04_RBAC_MATRIX.md`<br>`docs/13_SECURITY.md` | NIET Academic Governance | *Implementation must not invent this policy.* Enforce 100% student denial across all tiers. If policy changes post-V1, adjust RLS and API filters via formal migration. | `OPEN` |
| `OD-007` | **Panel Selection Criteria & Conflict-of-Interest Governance** | Default: HOD manually appoints 2-member panel. Conflict-of-interest check: Guide cannot serve as panel member on own student. | Prevents academic bias during final oral defense evaluation. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/04_RBAC_MATRIX.md`<br>`docs/06_DATABASE_SCHEMA.md` | NIET Academic Council | *Implementation must not invent this policy.* Enforce database check: `panel_faculty_id != thesis.guide_faculty_id`. Advanced departmental eligibility rules remain manual. | `OPEN` |
| `OD-008` | **Academic Calendar Deadlines & Penalty Schedules** | Default: Manual milestone scheduling by Department Coordinator (DC). No automated late fines. | Governs semester submission deadlines, grace periods, and late submission penalties. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/05_STATE_MACHINES.md` | Dean Academics / Academic Calendar Committee | *Implementation must not invent this policy.* Model deadline timestamps in `milestones`; do not hardcode automatic academic penalty triggers in V1. | `OPEN` |
| `OD-009` | **Institutional Identity Provider Integration (SAML / OAuth)** | Default: Pre-seeded accounts in PostgreSQL database with secure session cookies. Mock SSO enabled. | Defines authentication integration with campus Active Directory, Google Workspace, or Microsoft 365. | `docs/00_PROJECT_MASTER.md`<br>`docs/02_ARCHITECTURE.md`<br>`docs/13_SECURITY.md`<br>`docs/14_TEST_PLAN.md` | NIET Institutional IT / ERP Team | *Implementation must not invent this policy.* Architecture is provider-agnostic. Use local cookie-based sessions for V1; preserve SAML/OAuth integration hooks. | `OPEN` |
| `OD-010` | **Official ERP Database Synchronization Protocol** | Default: Standalone relational database with pre-seeded CSV/SQL batch ingestion scripts. | Dictates bi-directional student registration and grade sync with NIET campus ERP. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/02_ARCHITECTURE.md` | NIET ERP Committee | *Implementation must not invent this policy.* V1 operates standalone. Direct live ERP integration is an explicit V1 Non-Goal. | `OPEN` |
| `OD-011` | **Production Cloud Hosting Infrastructure & Tenancy** | Default: Free-tier developer cloud (Supabase / Neon / Vercel) optimized for ₹0 initial prototype deployment. | Governs on-premise institutional deployment vs. managed public cloud compliance. | `docs/00_PROJECT_MASTER.md`<br>`docs/02_ARCHITECTURE.md`<br>`docs/13_SECURITY.md` | NIET IT Infrastructure Committee | *Implementation must not invent this policy.* Adhere to cloud-agnostic architecture (standard PostgreSQL, standard S3-compatible storage, portable Docker runtime). | `OPEN` |
| `OD-012` | **Target Recovery Point (RPO) & Recovery Time Objective (RTO)** | Default: Automated daily database backups with point-in-time recovery where supported by host. | Establishes formal disaster recovery SLAs for institutional dissertation assets. | `docs/00_PROJECT_MASTER.md`<br>`docs/01_REQUIREMENTS.md`<br>`docs/02_ARCHITECTURE.md`<br>`docs/13_SECURITY.md` | NIET IT Security / Infrastructure | *Implementation must not invent this policy.* Maintain standard daily backup procedures; formal enterprise RPO/RTO SLAs deferred to production hosting contract. | `OPEN` |
| `OD-013` | **Institutional SMTP Gateway & SMS Notification Channel** | Default: In-app notification center. Email dispatch via standard SMTP environment configuration. | Governs official institutional sender address (`dms@niet.co.in`) and SMS gateway integration. | `docs/00_PROJECT_MASTER.md`<br>`docs/02_ARCHITECTURE.md`<br>`docs/10_NOTIFICATION_MODEL.md` | NIET Communications / IT Cell | *Implementation must not invent this policy.* Core workflow depends on in-app notifications. External email dispatch is secondary; SMS gateway is deferred. | `OPEN` |
| `OD-014` | **Co-Guide Access to Annexure 6** | Default: Co-Guide is **BLOCKED** from Annexure 6 by default. Primary Guide holds exclusive scoring authority. | Clarifies whether Co-Guide submits separate Annexure 6, co-signs, or has zero access. | `docs/01_REQUIREMENTS.md`<br>`docs/04_RBAC_MATRIX.md`<br>`docs/13_SECURITY.md`<br>`docs/14_TEST_PLAN.md` | NIET HOD Committee / Dean Academics | *Implementation must not invent this policy.* Keep Co-Guide access blocked in V1 authorization matrix (`REQ-OD-004`). If policy mandates co-signing, update RBAC. | `OPEN` |
| `OD-015` | **Production Cross-Cohort Title Uniqueness Scope** | Default: Case-insensitive uniqueness within active academic cohort. Historical cross-cohort is manual. | Determines whether title uniqueness is enforced across active cohort only or against 10-year historical catalog. | `docs/01_REQUIREMENTS.md`<br>`docs/06_DATABASE_SCHEMA.md`<br>`docs/14_TEST_PLAN.md` | NIET Academic Council / Library Cell | *Implementation must not invent this policy.* Enforce unique index `uq_theses_normalized_title_cohort` for active cohort in V1; full catalog search deferred to future indexing. | `OPEN` |
| `OD-016` | **Session Idle Timeout & Absolute Expiry Duration** | Default: 24-hour absolute session duration with sliding idle timeout managed by application session store. | Balances usability during lengthy evaluation sessions with institutional session security. | `docs/07_API_CONTRACTS.md`<br>`docs/13_SECURITY.md`<br>`docs/14_TEST_PLAN.md` | NIET IT Security Officer | *Implementation must not invent this policy.* Implement configurable session parameters in server environment configuration (`SESSION_MAX_AGE_SEC`). | `OPEN` |
| `OD-017` | **Automated Server-Side Malware Scanning on File Uploads** | Default: File validation via size checks, extension checks, and magic-byte inspection. No live ClamAV hook in V1. | Protects institutional storage from executable payload or malware injection. | `docs/09_FILE_STORAGE.md`<br>`docs/13_SECURITY.md`<br>`docs/14_TEST_PLAN.md` | NIET Cybersecurity Team | *Implementation must not invent this policy.* V1 enforces strict non-executable MIME magic-byte checks; live antivirus stream scanning deferred to post-V1 infrastructure. | `OPEN` |
| `OD-018` | **Rate Limiting Thresholds for Sensitive Operations** | Default: Standard rate limiting framework in API gateway with baseline thresholds (10 failed logins/min, 20 uploads/hr). | Mitigates brute-force attacks, scraping, and denial-of-service on critical endpoints. | `docs/07_API_CONTRACTS.md`<br>`docs/13_SECURITY.md`<br>`docs/14_TEST_PLAN.md` | NIET IT Security / Web Team | *Implementation must not invent this policy.* Thresholds must be adjustable via environment variables (`RATE_LIMIT_LOGIN_MAX`, `RATE_LIMIT_API_MAX`). | `OPEN` |

---

## 5. Architectural Decision Records (ADR Catalog)

The following ten (10) architectural decisions represent the frozen foundational baselines established across Phases 2A through 3J:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              FROZEN ADR CATALOG (PHASE 2-3)                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ ADR-001: Core Technology Stack & Modular Runtime Architecture (Next.js / TypeScript)   │
│ ADR-002: Relational PostgreSQL Schema with Database-Enforced Invariants & 3NF          │
│ ADR-003: Multi-Layered Contextual Authorization & Dynamic Relational Binding           │
│ ADR-004: Strict Architectural Separation of Technical Admin & Academic Approvers       │
│ ADR-005: Multi-Department Institutional Hierarchy & Cross-Department Scoping          │
│ ADR-006: Annexure 6 Confidential Supervisor Evaluation Multi-Layer Defense-in-Depth    │
│ ADR-007: Manual D.HOD Guide Allocation with Hard Capacity Constraints (<= 3)           │
│ ADR-008: Viva Failure Remediation Cycle with Immutable Thesis Identifier Stability     │
│ ADR-009: Milestone Evaluation Grade Contribution Exclusivity (P3 Only)                 │
│ ADR-010: Dynamic 4-Column Rubrics with Immutable Version Pinning                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### ADR-001: Core Technology Stack & Modular Runtime Architecture
- **Status:** `LOCKED` (Accepted)
- **Context:** System requires zero-budget prototype feasibility (₹0 initial cost), high developer ergonomics, modern responsive institutional UI, and zero proprietary lock-in.
- **Decision:** Fullstack TypeScript using Next.js (App Router), React 18+, Node.js runtime, PostgreSQL 15+, TailwindCSS/Vanilla CSS design system, and S3-compatible private object storage.
- **Alternatives Considered:** Python/Django (rejected: slower frontend iteration for complex interactive rubrics), Java/Spring Boot (rejected: high memory footprint, violates free cloud hosting feasibility).
- **Consequences:** Unified TypeScript type safety from DB models to React components; rapid UI iteration; completely portable to institutional on-premise servers.

### ADR-002: Relational PostgreSQL Schema with Database-Enforced Invariants & 3NF
- **Status:** `LOCKED` (Accepted)
- **Context:** Academic dissertation workflows represent legal institutional transcripts requiring strict ACID compliance, referential integrity, and immutability.
- **Decision:** PostgreSQL 15+ normalized to Third Normal Form (3NF) with UUIDv4 primary keys, database-level check constraints (`chk_guide_allocations_distinct_supervisors`, `chk_evaluations_score_range`), and Row-Level Security (RLS) policies.
- **Alternatives Considered:** NoSQL / Document Store (MongoDB) (rejected: update anomalies, lack of multi-table ACID transactions across state transitions).
- **Consequences:** Relational guarantees defend academic rules even if API validation fails; historical evaluation scorecards are write-once append-only.

### ADR-003: Multi-Layered Contextual Authorization & Dynamic Relational Binding
- **Status:** `LOCKED` (Accepted)
- **Context:** Academic authority depends on specific thesis relationships, departmental tenancy, active delegations, and workflow states, not static role strings.
- **Decision:** Evaluates multi-factor authorization predicate: $\text{Authorized} = f(\text{Identity}, \text{Role}, \text{Tenancy}, \text{RelationalBinding}, \text{Delegation}, \text{WorkflowState})$. Enforced at UI, API Middleware, Domain Service, and Database (RLS).
- **Alternatives Considered:** Naive static RBAC (e.g. `user.role === 'GUIDE'`) (rejected: allows Guides to access unrelated students' dissertations).
- **Consequences:** Completely prevents Broken Object Level Authorization (BOLA) and IDOR vulnerabilities.

### ADR-004: Strict Architectural Separation of Technical Admin & Academic Approvers
- **Status:** `LOCKED` (Accepted)
- **Context:** System administrators must maintain infrastructure, user accounts, and configuration without possessing authority to alter academic outcomes.
- **Decision:** `ROLE_ADMIN` possesses **ZERO** academic approval, allocation, evaluation, or grading authority. `DCEC_CHAIR_APPROVE` is strictly reserved for academic heads (`ROLE_HOD` or delegated `ROLE_DHOD`).
- **Alternatives Considered:** Superuser god-mode where Admin can override any state (rejected: violates institutional governance and academic integrity).
- **Consequences:** Clean separation of duties; administrative tampering with grades or approvals is programmatically blocked at API and database tiers.

### ADR-005: Multi-Department Institutional Hierarchy & Cross-Department Scoping
- **Status:** `LOCKED` (Accepted)
- **Context:** NIET comprises multiple schools and departments. The system must support institution-wide deployment and interdisciplinary research.
- **Decision:** Hierarchical multi-tenancy: $\text{Institution} \rightarrow \text{School} \rightarrow \text{Department} \rightarrow \text{Program} \rightarrow \text{Academic Session} \rightarrow \text{Batch} \rightarrow \text{Section}$. Cross-department Guides and Panel evaluators supported via explicit scoped assignments.
- **Alternatives Considered:** Hardcoded single-department CSE application (rejected: unscalable, requires separate deployments per department).
- **Consequences:** Supports institutional scale; clean departmental data isolation.

### ADR-006: Annexure 6 Confidential Supervisor Evaluation Multi-Layer Defense-in-Depth
- **Status:** `LOCKED` (Accepted)
- **Context:** Faculty supervisor evaluation contains sensitive candidate appraisals and viva recommendations that must remain strictly confidential.
- **Decision:** Six-layer defense-in-depth lockout: UI (zero DOM elements), API (403 for student callers), Authorization Engine, Database (RLS blocks row reads), Storage (pre-signed URL generator rejects student context), and Notification (content minimization).
- **Alternatives Considered:** Simple UI tab hiding (rejected: critical security vulnerability; students can bypass via dev tools or direct API calls).
- **Consequences:** Absolute student confidentiality guaranteed across all technical attack vectors.

### ADR-007: Manual D.HOD Guide Allocation with Hard Capacity Constraints ($\le 3$)
- **Status:** `LOCKED` (Accepted)
- **Context:** Supervisor allocation requires balancing faculty workload, student preferences, and institutional research domain alignment.
- **Decision:** D.HOD is the sole allocating authority in V1. System displays student's 4 ranked preferences alongside live faculty capacity loads. Hard constraints enforce: $\text{GuideLoad} \le 3$, $\text{CoGuideLoad} \le 3$, and $\text{Guide} \neq \text{Co-Guide}$. No faculty accept/decline step.
- **Alternatives Considered:** Automated AI allocation (rejected: non-goal for V1), Faculty self-selection/bidding (rejected: leads to unbalanced loads and institutional friction).
- **Consequences:** Deterministic, authoritative allocation workflow; complete allocation audit history.

### ADR-008: Viva Failure Remediation Cycle with Immutable Thesis Identifier Stability
- **Status:** `LOCKED` (Accepted)
- **Context:** Students who fail final oral defense or require major revisions must undergo structured remediation without destroying their academic history.
- **Decision:** Defense failure instantiates `ReVivaCycle` (Cycle index = 2) under the exact same immutable `ThesisId` (UUID). Historical Attempt 1 scorecards and panel remarks remain permanently preserved in append-only storage.
- **Alternatives Considered:** Creating a brand-new thesis record upon failure (rejected: fragments student history, breaks longitudinal auditability).
- **Consequences:** Seamless historical reconstructability; stable URLs and database foreign keys across re-viva attempts.

### ADR-009: Milestone Evaluation Grade Contribution Exclusivity (P3 Only)
- **Status:** `LOCKED` (Accepted)
- **Context:** Progress Presentations P1 and P2 serve as early diagnostic and formative feedback checkpoints, whereas P3 evaluates the final pre-submission manuscript.
- **Decision:** P1 (/100), P2 (/100), and P3 (/100) are evaluated via dynamic 4-column rubrics. However, **ONLY P3** contributes to the final dissertation grade calculation. P1 and P2 remain formative historical records.
- **Alternatives Considered:** Averaging P1 + P2 + P3 (rejected: penalizes early exploratory phases, contradicts NIET faculty evaluation policy).
- **Consequences:** Encourages exploratory research in early stages; clear mathematical grading boundary.

### ADR-010: Dynamic 4-Column Rubrics with Immutable Version Pinning
- **Status:** `LOCKED` (Accepted)
- **Context:** Academic evaluation criteria evolve across academic sessions, but past evaluations must remain tied to the rubric version under which they were scored.
- **Decision:** Rubrics feature dynamic criteria with 4 achievement tiers totaling max 100 marks. Published rubrics are assigned sequential version IDs. Evaluations store an immutable foreign key `rubric_version_id`.
- **Alternatives Considered:** Overwriting active rubric template (rejected: silently alters historical evaluation criteria and weights).
- **Consequences:** Departmental flexibility in updating rubrics; 100% legal integrity for historical student transcripts.

---

## 6. V1 Boundaries: Locked Requirements vs. Excluded Non-Goals vs. Future Roadmap

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 V1 SCOPE BOUNDARY MATRIX                               │
├──────────────────────────────┬───────────────────────────────┬─────────────────────────┤
│ LOCKED V1 REQUIREMENTS       │ V1 EXCLUDED NON-GOALS         │ FUTURE ROADMAP (POST-V1)│
├──────────────────────────────┼───────────────────────────────┼─────────────────────────┤
│ • 14-Phase dissertation flow │ • Automated AI Guide matching │ • Live Turnitin API     │
│ • Manual D.HOD allocation    │ • AI auto-grading / scoring   │ • Bi-directional ERP    │
│ • 4 Ranked Guide preferences │ • Custom plagiarism engine    │ • SAML 2.0 / SSO IdP    │
│ • Hard capacity loads (<=3)  │ • Custom AI detection engine  │ • Multi-factor auth     │
│ • Guide != Co-Guide          │ • Built-in WebRTC video server│ • Enterprise SIEM log   │
│ • Dual supervisor endorsement│ • Admin academic overrides    │ • Automated ClamAV scan │
│ • P1/P2/P3 (/100); P3 final  │ • Invented external examiner  │ • SMS notification gate │
│ • 4-Column dynamic rubrics   │ • Invented voting / quorum    │ • AI matching assistant │
│ • Annexure 6 student lockout │ • Direct live ERP integration │ • 10-year catalog index │
│ • 2-Member viva panel        │ • Production SAML SSO         │ • Multi-campus scale    │
│ • ReVivaCycle remediation    │ • Self-registration for users │ • Advanced analytics    │
│ • Immutable audit trail WORM │ • Student Annexure 6 access   │ • Hardware HSM storage  │
└──────────────────────────────┴───────────────────────────────┴─────────────────────────┘
```

### 6.1 Explicit V1 Non-Goals (Forbidden in V1)
1. **Automated / AI-Driven Guide Allocation:** No algorithmic auto-matching of students to guides is permitted in V1. Allocation is strictly manual by D.HOD.
2. **AI-Based Academic Grading or Decision-Making:** All screening, endorsement, scoring, and defense decisions must be made by verified human faculty members.
3. **Proprietary Plagiarism / AI Scanner:** DMS does not build an internal scanner. It stores authenticated Turnitin/DrillBit certificates uploaded by students.
4. **Built-in WebRTC Video Conferencing:** DMS does not host video streams. It captures meeting metadata and third-party links (Google Meet, Zoom, Teams).
5. **System Administrator Academic Overrides:** Technical admins cannot approve proposals, allocate supervisors, or modify grades under any circumstances.
6. **Direct Live ERP Database Synchronization:** V1 operates as an independent authoritative system. Data sync is performed via pre-seeded batch imports.
7. **User Self-Registration:** All student and faculty accounts are provisioned exclusively by administrative pre-seeding.

---

## 7. Conflict Detection & Resolution Log

The authoritative documentation baseline (Docs 00 through 14) was audited for contradictory requirements. The following findings are recorded:

| Conflict ID | Issue / Topic | Document A Citation | Document B Citation | Hierarchy Resolution | Final Authoritative Baseline |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `CONF-01` | **Milestone Grade Weightage** | Legacy informal notes suggested averaging all milestone scores (P1 + P2 + P3). | `docs/00_PROJECT_MASTER.md` §8.3 & `docs/01_REQUIREMENTS.md` `REQ-EVAL-005`: **Only P3 contributes to final grade.** | Priority 1 (Locked Academic Decisions) overrides legacy notes. | **LOCKED:** Only P3 contributes to final grade calculation. P1 and P2 are formative diagnostics. |
| `CONF-02` | **Supervisor Allocation Workflow** | Historical discussions proposed a Guide accept/decline workflow. | `docs/00_PROJECT_MASTER.md` §7 & `docs/01_REQUIREMENTS.md` `REQ-ALLOC-007`: Allocation by D.HOD is immediately authoritative. | Priority 1 (Locked Academic Decisions) overrides historical proposals. | **LOCKED:** No faculty accept/decline workflow in V1. Allocation by D.HOD is immediately binding. |
| `CONF-03` | **Annexure 6 Student Visibility** | General UI design principle of transparency could imply showing all evaluation sheets. | `docs/00_PROJECT_MASTER.md` §11 & `docs/01_REQUIREMENTS.md` `REQ-ANN6-002`: Student access permanently blocked. | Priority 1 (Institutional Governance) and Priority 4 (Security Rules) enforce absolute denial. | **LOCKED:** Student access to Annexure 6 is 100% blocked at all layers in perpetuity. |
| `CONF-04` | **System Admin Academic Powers** | Standard web application admin dashboards often include full CRUD on all domain entities. | `docs/00_PROJECT_MASTER.md` §8.1 & `docs/04_RBAC_MATRIX.md` §3.11: `ADMIN ≠ DCEC_CHAIR`. | Priority 1 and Priority 4 enforce separation of duties. | **LOCKED:** Admin technical role possesses ZERO academic approval or grade modification authority. |

---

## 8. Implementation Safety Checklist for Future Phases

Prior to writing application code, database migrations, or API handlers, development teams and AI agents must verify conformance with this checklist:

- [x] **No academic policy invented:** All academic rules trace directly to locked requirements in `docs/00_PROJECT_MASTER.md` and `docs/01_REQUIREMENTS.md`.
- [x] **No open decision hardcoded:** All 18 items in Section 4 are treated as `OPEN` and driven by runtime database configuration.
- [x] **Safe prototype defaults used:** Prototype operations utilize documented safe fallbacks (e.g. 5 MB file limits, single-chair DCEC signoff, pre-seeded accounts).
- [x] **All V1 non-goals respected:** Zero AI matching, zero proprietary plagiarism engines, zero admin academic overrides.
- [x] **Strict security invariants enforced:** Annexure 6 student lockout and `ADMIN ≠ DCEC_CHAIR` separation enforced at all software layers.
- [x] **Complete documentation freeze achieved:** Docs 00 through 15 form an unshakeable, fully reconciled architectural foundation.

---

*Prepared by Antigravity — Phase 3K Final Open Decisions Register*  
*NIET Dissertation Management System Architecture Freeze v1 Complete.*
