import { describe, it, expect } from 'vitest';
import { validateActionPermission, PermissionViolationError } from '../../src/infrastructure/security/permission-guard';
import { AuditActorType } from '../../src/domain/types';

describe('Permission Guard (Section 3: GREEN, YELLOW, RED)', () => {
  it('allows autonomous AI worker to perform GREEN actions', () => {
    expect(() =>
      validateActionPermission('RESEARCH_RUN', AuditActorType.AI_WORKER, false)
    ).not.toThrow();
    expect(() =>
      validateActionPermission('DRAFT_GENERATION', AuditActorType.AI_WORKER, false)
    ).not.toThrow();
  });

  it('prevents autonomous AI worker from performing YELLOW actions without owner approval', () => {
    expect(() =>
      validateActionPermission('PUBLISH_POST', AuditActorType.AI_WORKER, false)
    ).toThrow(PermissionViolationError);

    expect(() =>
      validateActionPermission('UPDATE_CHANNEL_TITLE', AuditActorType.AI_WORKER, false)
    ).toThrow(PermissionViolationError);
  });

  it('allows authenticated owner to perform YELLOW actions', () => {
    expect(() =>
      validateActionPermission('PUBLISH_POST', AuditActorType.OWNER, true)
    ).not.toThrow();
  });

  it('strictly blocks non-owners from RED actions', () => {
    expect(() =>
      validateActionPermission('UPDATE_CREDENTIALS', AuditActorType.ADMIN, false)
    ).toThrow(PermissionViolationError);
    expect(() =>
      validateActionPermission('PERMANENT_DELETE_DATA', AuditActorType.AI_WORKER, false)
    ).toThrow(PermissionViolationError);
  });
});
