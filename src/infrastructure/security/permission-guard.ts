// ==============================================================
// Permission Guard — Section 3 Specification (GREEN, YELLOW, RED)
// ==============================================================

import { PermissionLevel, AuditActorType } from '../../domain/types';

export class PermissionViolationError extends Error {
  constructor(
    public readonly action: string,
    public readonly requiredLevel: PermissionLevel,
    public readonly actorType: AuditActorType
  ) {
    super(
      `Permission Denied: Action '${action}' requires ${requiredLevel} permission. Actor '${actorType}' is not authorized.`
    );
    this.name = 'PermissionViolationError';
  }
}

export function validateActionPermission(
  action: string,
  actorType: AuditActorType,
  isOwnerAuthenticated: boolean
): void {
  // RED actions: Owner only
  const redActions = [
    'CHANGE_OWNER_IDENTITY',
    'ADD_ADMIN',
    'REMOVE_ADMIN',
    'UPDATE_CREDENTIALS',
    'PERMANENT_DELETE_DATA',
    'CONFIGURE_PAYMENTS',
  ];

  if (redActions.includes(action)) {
    if (actorType !== AuditActorType.OWNER || !isOwnerAuthenticated) {
      throw new PermissionViolationError(action, PermissionLevel.RED, actorType);
    }
    return;
  }

  // YELLOW actions: Owner approval required (autonomous worker cannot execute without owner approval)
  const yellowActions = [
    'PUBLISH_POST',
    'UPDATE_CHANNEL_TITLE',
    'UPDATE_CHANNEL_DESCRIPTION',
    'UPDATE_CHANNEL_PROFILE_IMAGE',
    'UPDATE_CONTENT_STRATEGY',
    'APPROVE_ADVERTISEMENT',
    'CHANGE_PUBLISHING_SCHEDULE',
  ];

  if (yellowActions.includes(action)) {
    if (actorType === AuditActorType.AI_WORKER) {
      throw new PermissionViolationError(action, PermissionLevel.YELLOW, actorType);
    }
    if (!isOwnerAuthenticated) {
      throw new PermissionViolationError(action, PermissionLevel.YELLOW, actorType);
    }
    return;
  }

  // GREEN actions: autonomous AI worker, admin, or owner can execute
}
