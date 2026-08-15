# Role-Based Access Control (RBAC) Matrix

**STATUS: DRAFT**

> [!WARNING]
> **CRITICAL WARNING**: Undocumented assumptions must NOT be treated as requirements. Do not invent roles, permissions, or access control policies until they are formally established and documented here.

---

## 1. Document Purpose

This document serves as the authoritative definition of Role-Based Access Control (RBAC) rules, user roles, permission scopes, resource actions, and access policies governing the **NIET Dissertation Management System**.

## 2. Information Contained in this Document

This document will define:
- **System Roles**: Complete list of recognized institutional and administrative roles.
- **Granular Permissions**: Exhaustive catalog of permission strings/actions across entities and operations (e.g., create proposal, assign guide, submit review, approve defense, archive dissertation).
- **Role-Permission Matrix**: Comprehensive mapping of permissions assigned to each defined role.
- **Contextual / Object-Level Permissions**: Ownership and tenancy rules (e.g., student editing only their own draft dissertation; guide evaluating only assigned candidates).
- **Policy Enforcement Strategy**: How permissions are verified at API gateways, middleware, and database policy layers.

---

*Note: The definitive matrix of roles and permissions will be populated during the access control design phase.*
