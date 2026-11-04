/**
 * Role-Based Permission Checking Utility
 *
 * Implements the permission matrix from the design document and provides
 * utilities for checking permissions and wrapping server actions.
 */

/** Role type matching the Prisma enum */
export type Role = 'Associate' | 'SME' | 'POC' | 'Manager' | 'Senior_Leader' | 'Admin';

/** Session type for server action wrappers */
export interface Session {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    teamId: string | null;
  };
}

// ─── Action Constants ────────────────────────────────────────────────────────

export const LOG_TIME = 'log_time';
export const VIEW_OWN_DATA = 'view_own_data';
export const VIEW_CLIMATE = 'view_climate';
export const USE_MATCHMAKER = 'use_matchmaker';
export const SUBMIT_REQUEST = 'submit_request';
export const APPROVE_OWN_TEAM = 'approve_own_team';
export const APPROVE_CROSS_TEAM = 'approve_cross_team';
export const OVERRIDE_DECISION = 'override_decision';
export const MANAGE_USERS = 'manage_users';
export const SYSTEM_CONFIG = 'system_config';
export const IMPORT_EXPORT = 'import_export';
export const MANAGE_PROCESSES = 'manage_processes';

// ─── Permission Matrix ───────────────────────────────────────────────────────

/**
 * Permission matrix defining which roles can perform which actions.
 * Maps each action to the set of roles that are allowed to perform it.
 */
const PERMISSION_MATRIX: Record<string, Role[]> = {
  [LOG_TIME]: ['Associate', 'SME', 'POC', 'Manager', 'Senior_Leader', 'Admin'],
  [VIEW_OWN_DATA]: ['Associate', 'SME', 'POC', 'Manager', 'Senior_Leader', 'Admin'],
  [VIEW_CLIMATE]: ['SME', 'POC', 'Manager', 'Senior_Leader', 'Admin'],
  [USE_MATCHMAKER]: ['SME', 'POC', 'Manager', 'Senior_Leader', 'Admin'],
  [SUBMIT_REQUEST]: ['SME', 'POC', 'Manager', 'Senior_Leader', 'Admin'],
  [APPROVE_OWN_TEAM]: ['Manager', 'Senior_Leader', 'Admin'],
  [APPROVE_CROSS_TEAM]: ['Senior_Leader', 'Admin'],
  [OVERRIDE_DECISION]: ['Senior_Leader', 'Admin'],
  [MANAGE_USERS]: ['Admin'],
  [SYSTEM_CONFIG]: ['Admin'],
  [IMPORT_EXPORT]: ['Admin'],
  [MANAGE_PROCESSES]: ['Admin'],
};

// ─── Permission Checking ─────────────────────────────────────────────────────

/**
 * Checks whether a given role has permission to perform a specific action.
 *
 * @param role - The user's role
 * @param action - The action to check permission for
 * @returns true if the role is allowed to perform the action
 */
export function hasPermission(role: Role, action: string): boolean {
  const allowedRoles = PERMISSION_MATRIX[action];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.includes(role);
}

/**
 * Returns all actions that a given role is permitted to perform.
 *
 * @param role - The user's role
 * @returns Array of action strings the role can perform
 */
export function getPermittedActions(role: Role): string[] {
  return Object.entries(PERMISSION_MATRIX)
    .filter(([, roles]) => roles.includes(role))
    .map(([action]) => action);
}

// ─── Server Action Wrapper ───────────────────────────────────────────────────

/**
 * Wraps a server action with role-based permission checking.
 * Checks the current session's role against the allowed roles before executing.
 *
 * @param allowedRoles - Array of roles permitted to execute this action
 * @param action - The server action to execute if permission is granted
 * @returns A wrapped function that checks permissions before executing
 * @throws Error if no session exists or role is not permitted
 */
export function withPermission<T>(
  allowedRoles: Role[],
  action: (session: Session) => Promise<T>
): () => Promise<T> {
  return async () => {
    // Dynamic import to avoid pulling next-auth into test environments
    const { auth } = await import('@/lib/auth');
    const session = await auth();

    if (!session || !session.user) {
      throw new Error('Access Denied: No active session.');
    }

    const userRole = session.user.role as Role;

    if (!allowedRoles.includes(userRole)) {
      throw new Error('Access Denied: Insufficient permissions.');
    }

    return action(session as unknown as Session);
  };
}
