// Shared domain types used by more than one app. Page-specific row shapes
// (per-query column selections) stay local to their pages.

export type ApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
