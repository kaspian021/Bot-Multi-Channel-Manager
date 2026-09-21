// ==============================================================
// State Machine Transitions — Section 23 Specification
// ==============================================================

import { DraftStatus } from './types';

export class InvalidStateTransitionError extends Error {
  constructor(public readonly from: DraftStatus, public readonly to: DraftStatus) {
    super(`Invalid draft state transition from '${from}' to '${to}'`);
    this.name = 'InvalidStateTransitionError';
  }
}

/**
 * Valid allowed transitions for ContentDraft state machine:
 * DISCOVERED -> QUALIFIED -> FACT_CHECKED -> DRAFTED -> PENDING_APPROVAL -> APPROVED -> SCHEDULED -> PUBLISHED
 * PENDING_APPROVAL -> REJECTED
 * PENDING_APPROVAL -> NEEDS_EDIT
 * NEEDS_EDIT -> DRAFTED
 * SCHEDULED -> CANCELLED
 * PUBLISHED -> ARCHIVED
 */
const ALLOWED_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  [DraftStatus.DISCOVERED]: [DraftStatus.QUALIFIED, DraftStatus.REJECTED],
  [DraftStatus.QUALIFIED]: [DraftStatus.FACT_CHECKED, DraftStatus.REJECTED],
  [DraftStatus.FACT_CHECKED]: [DraftStatus.DRAFTED, DraftStatus.REJECTED],
  [DraftStatus.DRAFTED]: [DraftStatus.PENDING_APPROVAL, DraftStatus.REJECTED],
  [DraftStatus.PENDING_APPROVAL]: [
    DraftStatus.APPROVED,
    DraftStatus.REJECTED,
    DraftStatus.NEEDS_EDIT,
  ],
  [DraftStatus.APPROVED]: [
    DraftStatus.SCHEDULED,
    DraftStatus.PUBLISHED, // Direct "Publish Now"
    DraftStatus.CANCELLED,
  ],
  [DraftStatus.NEEDS_EDIT]: [DraftStatus.DRAFTED, DraftStatus.PENDING_APPROVAL],
  [DraftStatus.SCHEDULED]: [DraftStatus.PUBLISHED, DraftStatus.CANCELLED],
  [DraftStatus.PUBLISHED]: [DraftStatus.ARCHIVED],
  [DraftStatus.REJECTED]: [DraftStatus.ARCHIVED, DraftStatus.DRAFTED], // Allows manual revival/re-draft
  [DraftStatus.CANCELLED]: [DraftStatus.APPROVED, DraftStatus.SCHEDULED, DraftStatus.ARCHIVED],
  [DraftStatus.ARCHIVED]: [],
};

export function canTransition(from: DraftStatus, to: DraftStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

export function validateTransition(from: DraftStatus, to: DraftStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}
