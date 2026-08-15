# Dissertation Lifecycle & Workflow State Machines

**STATUS: DRAFT**

> [!WARNING]
> **CRITICAL WARNING**: Undocumented assumptions must NOT be treated as requirements. Workflow states, valid transitions, guards, trigger events, and side-effects must be formally specified here before state handling code is written.

---

## 1. Document Purpose

This document provides the authoritative state machine specifications governing the lifecycles of dissertations, proposals, evaluations, reviews, and related workflow objects in the system.

## 2. Information Contained in this Document

This document will define:
- **Lifecycle States**: Complete enumeration of all permissible lifecycle states for each workflow entity.
- **Allowed Transitions**: Deterministic state transitions detailing source state, target state, and triggering event.
- **Transition Guards & Conditions**: Pre-conditions, permission checks, and validation rules required before a transition is permitted.
- **Side-Effects & Post-Transition Actions**: Automated actions dispatched upon transition (e.g., notification dispatch, timestamping, snapshot generation, status broadcasting).
- **Visual State Transition Diagrams**: Finite state machine (FSM) diagrams illustrating normal flows, revisions, rejections, and terminal states.

---

*Note: Specific states and transitions will be mapped out once academic workflow requirements are finalized.*
