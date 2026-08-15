# Database Schema Specification

**STATUS: DRAFT**

> [!WARNING]
> **CRITICAL WARNING**: Undocumented assumptions must NOT be treated as requirements. Do not create database tables, columns, indexes, foreign keys, or migrations until the authoritative schema is formally defined and approved in this document.

---

## 1. Document Purpose

This document contains the authoritative database schema specification for the **NIET Dissertation Management System**, including table definitions, column types, constraints, foreign key relations, indexes, and database-level security policies.

## 2. Information Contained in this Document

This document will define:
- **Entity-Relationship (ER) Model**: Detailed relational diagram and entity associations.
- **Table Definitions**: Exact table names, column names, data types, nullability, and default values.
- **Integrity Constraints**: Primary keys, foreign key cascades/restrictions, unique constraints, and check constraints.
- **Indexing Strategy**: Indexes for performance optimization, search queries, and composite lookups.
- **Database Triggers & Functions**: Automated timestamp updates, audit log triggers, and calculated columns.
- **Row-Level Security (RLS) & Policies**: Specific database-level access rules and tenant isolation policies.

---

*Note: Database tables and migration scripts will be constructed strictly following the approval of this schema.*
