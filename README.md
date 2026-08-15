# NIET Dissertation Management System

## Project Overview

The **NIET Dissertation Management System** is a platform designed to manage, coordinate, review, and track academic dissertations across their entire lifecycle for Noida Institute of Engineering and Technology (NIET).

## Source of Truth

The `docs/` directory serves as the **single authoritative source of truth** for all project specifications, architecture, domain logic, data models, workflows, and access controls.

> [!WARNING]
> **CRITICAL RULE**: The application must **NOT** be implemented based on undocumented assumptions. All features, architecture, database schemas, role permissions, and workflows must be formally documented and approved in the respective specification documents before implementation begins.

## Documentation Index

The specification is structured across the following documents:

| Document | Description | Status |
| :--- | :--- | :--- |
| [`00_PROJECT_MASTER.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/00_PROJECT_MASTER.md) | Master overview, guidelines, and document roadmap | `DRAFT` |
| [`01_REQUIREMENTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/01_REQUIREMENTS.md) | Functional and non-functional requirements | `DRAFT` |
| [`02_ARCHITECTURE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/02_ARCHITECTURE.md) | System architecture and technology stack specifications | `DRAFT` |
| [`03_DOMAIN_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/03_DOMAIN_MODEL.md) | Core domain entities, relations, and business logic | `DRAFT` |
| [`04_RBAC_MATRIX.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/04_RBAC_MATRIX.md) | Role-Based Access Control and permissions matrix | `DRAFT` |
| [`05_STATE_MACHINES.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/05_STATE_MACHINES.md) | Dissertation lifecycle states, transitions, and guards | `DRAFT` |
| [`06_DATABASE_SCHEMA.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/06_DATABASE_SCHEMA.md) | Database schema, tables, constraints, and indexes | `DRAFT` |
| [`07_API_CONTRACTS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/07_API_CONTRACTS.md) | API endpoints, payloads, schemas, and contracts | `DRAFT` |
| [`08_AUDIT_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/08_AUDIT_MODEL.md) | Audit trail, event logging, and compliance tracking | `DRAFT` |
| [`09_FILE_STORAGE.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/09_FILE_STORAGE.md) | Document storage, naming, security, and retrieval | `DRAFT` |
| [`10_NOTIFICATION_MODEL.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/10_NOTIFICATION_MODEL.md) | Notification triggers, channels, and delivery rules | `DRAFT` |
| [`11_UI_DESIGN_SYSTEM.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/11_UI_DESIGN_SYSTEM.md) | Design tokens, component specs, and styling standards | `DRAFT` |
| [`12_ACCESSIBILITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/12_ACCESSIBILITY.md) | Accessibility standards and compliance guidelines | `DRAFT` |
| [`13_SECURITY.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/13_SECURITY.md) | Security policies, auth mechanisms, and protection | `DRAFT` |
| [`14_TEST_PLAN.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/14_TEST_PLAN.md) | QA strategy, test methodologies, and acceptance criteria | `DRAFT` |
| [`15_OPEN_DECISIONS.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/15_OPEN_DECISIONS.md) | Architectural and product decision log (ADR) | `DRAFT` |
| [`CHANGELOG.md`](file:///c:/Users/user/Desktop/niet-dissertation-management-system/docs/CHANGELOG.md) | Chronological record of changes to specifications | `DRAFT` |

## Repository Structure

```text
niet-dissertation-management-system/
├── docs/                 # Authoritative project specifications
├── assets/               # Official brand and illustration assets (pending provision)
├── database/             # Database migration, seed, and policy definitions
│   ├── migrations/
│   ├── seeds/
│   └── policies/
├── src/                  # Application source code (to be initialized after specs)
├── tests/                # Automated test suites
├── public/               # Public static assets
├── .env.example          # Template for environment configuration
├── README.md             # Project introduction and documentation index
└── package.json          # Package manifest
```
