---
name: Submission lifecycle (drafts, deletion, admin visibility)
description: How draft/deletable submission statuses are enforced across admin and user-facing routes in Anvikshiki
---

Anvikshiki submissions use a status enum that includes "DRAFT" alongside the admin workflow statuses (RECEIVED, UNDER_REVIEW, REVISION_REQUESTED, ACCEPTED, REJECTED, PUBLISHED, ARCHIVED).

- Drafts must never be visible to admins. Any admin-facing query against submissions (list, filters, dashboard counts) must explicitly exclude `status = "DRAFT"` — a status filter value of "DRAFT" itself should be rejected/ignored server-side, not just hidden client-side.
- User deletion/editing is allowed for "pre-approval" statuses (DRAFT, RECEIVED, UNDER_REVIEW, REVISION_REQUESTED, REJECTED) but blocked once a submission reaches ACCEPTED, PUBLISHED, or ARCHIVED — those are considered final/admin-owned states.
- **Why:** users should be able to iterate freely and self-serve delete anything not yet finalized by admin action, but once admin has accepted/published something it becomes part of the permanent record and must not be user-mutable.
- **How to apply:** when adding new submission-related admin queries or user mutation endpoints, reuse this same status partition rather than re-deriving it — keep both lists (draft-exclusion for admin, deletable-status set for users) in sync if the enum changes.
