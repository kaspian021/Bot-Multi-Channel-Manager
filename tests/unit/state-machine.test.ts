import { describe, it, expect } from 'vitest';
import { canTransition, validateTransition, InvalidStateTransitionError } from '../../src/domain/state-machine';
import { DraftStatus } from '../../src/domain/types';

describe('State Machine Transitions (Section 23)', () => {
  it('allows valid progressive workflow transitions', () => {
    expect(canTransition(DraftStatus.DISCOVERED, DraftStatus.QUALIFIED)).toBe(true);
    expect(canTransition(DraftStatus.QUALIFIED, DraftStatus.FACT_CHECKED)).toBe(true);
    expect(canTransition(DraftStatus.FACT_CHECKED, DraftStatus.DRAFTED)).toBe(true);
    expect(canTransition(DraftStatus.DRAFTED, DraftStatus.PENDING_APPROVAL)).toBe(true);
    expect(canTransition(DraftStatus.PENDING_APPROVAL, DraftStatus.APPROVED)).toBe(true);
    expect(canTransition(DraftStatus.APPROVED, DraftStatus.SCHEDULED)).toBe(true);
    expect(canTransition(DraftStatus.SCHEDULED, DraftStatus.PUBLISHED)).toBe(true);
    expect(canTransition(DraftStatus.PUBLISHED, DraftStatus.ARCHIVED)).toBe(true);
  });

  it('allows alternative branching paths (REJECT, NEEDS_EDIT, CANCEL)', () => {
    expect(canTransition(DraftStatus.PENDING_APPROVAL, DraftStatus.REJECTED)).toBe(true);
    expect(canTransition(DraftStatus.PENDING_APPROVAL, DraftStatus.NEEDS_EDIT)).toBe(true);
    expect(canTransition(DraftStatus.NEEDS_EDIT, DraftStatus.DRAFTED)).toBe(true);
    expect(canTransition(DraftStatus.SCHEDULED, DraftStatus.CANCELLED)).toBe(true);
  });

  it('strictly rejects invalid state transitions', () => {
    // Cannot jump directly from DISCOVERED to PUBLISHED
    expect(canTransition(DraftStatus.DISCOVERED, DraftStatus.PUBLISHED)).toBe(false);
    expect(() => validateTransition(DraftStatus.DISCOVERED, DraftStatus.PUBLISHED)).toThrow(
      InvalidStateTransitionError
    );

    // Cannot jump from REJECTED directly to PUBLISHED
    expect(canTransition(DraftStatus.REJECTED, DraftStatus.PUBLISHED)).toBe(false);
    expect(() => validateTransition(DraftStatus.REJECTED, DraftStatus.PUBLISHED)).toThrow(
      InvalidStateTransitionError
    );
  });
});
