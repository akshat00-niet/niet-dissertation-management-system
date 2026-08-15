# Domain Model Specification

**STATUS: DRAFT**

> [!WARNING]
> **CRITICAL WARNING**: Undocumented assumptions must NOT be treated as requirements. Domain entities, business objects, boundaries, and relationships must be formally defined herein before writing domain layer code or data models.

---

## 1. Document Purpose

This document provides the conceptual and logical domain models representing core business entities, relationships, aggregate roots, value objects, and domain invariants for dissertation management at NIET.

## 2. Information Contained in this Document

This document will define:
- **Core Domain Entities**: High-level domain concepts (e.g., Dissertation, Proposal, Review, EvaluationRubric, Committee, Milestone, SubmissionVersion).
- **Entity Relationships**: Cardinalities, associations, and ownership boundaries between domain concepts.
- **Aggregate Boundaries**: Grouping of related entities treated as single cohesive units for data consistency.
- **Value Objects & Types**: Immutable types and representations (e.g., AcademicYear, PlagiarismReport, ScoreDistribution).
- **Domain Invariants & Business Logic**: Rules that must always hold true across state modifications.

---

*Note: Domain entities and relationships will be detailed following requirements confirmation.*
