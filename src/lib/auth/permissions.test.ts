import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  getPermittedActions,
  VIEW_CLIMATE,
  USE_MATCHMAKER,
  SUBMIT_REQUEST,
  APPROVE_OWN_TEAM,
  APPROVE_CROSS_TEAM,
  OVERRIDE_DECISION,
  MANAGE_USERS,
  SYSTEM_CONFIG,
  IMPORT_EXPORT,
  MANAGE_PROCESSES,
} from './permissions';

describe('permissions', () => {
  describe('hasPermission', () => {
    // SME permissions
    it('SME can view climate', () => {
      expect(hasPermission('SME', VIEW_CLIMATE)).toBe(true);
    });

    it('SME can use matchmaker', () => {
      expect(hasPermission('SME', USE_MATCHMAKER)).toBe(true);
    });

    it('SME can submit requests', () => {
      expect(hasPermission('SME', SUBMIT_REQUEST)).toBe(true);
    });

    it('SME cannot approve own team', () => {
      expect(hasPermission('SME', APPROVE_OWN_TEAM)).toBe(false);
    });

    it('SME cannot manage users', () => {
      expect(hasPermission('SME', MANAGE_USERS)).toBe(false);
    });

    // POC permissions (same as SME)
    it('POC can view climate', () => {
      expect(hasPermission('POC', VIEW_CLIMATE)).toBe(true);
    });

    it('POC cannot approve own team', () => {
      expect(hasPermission('POC', APPROVE_OWN_TEAM)).toBe(false);
    });

    // Manager permissions
    it('Manager can approve own team', () => {
      expect(hasPermission('Manager', APPROVE_OWN_TEAM)).toBe(true);
    });

    it('Manager cannot approve cross team', () => {
      expect(hasPermission('Manager', APPROVE_CROSS_TEAM)).toBe(false);
    });

    it('Manager cannot override decisions', () => {
      expect(hasPermission('Manager', OVERRIDE_DECISION)).toBe(false);
    });

    it('Manager cannot manage users', () => {
      expect(hasPermission('Manager', MANAGE_USERS)).toBe(false);
    });

    // Senior_Leader permissions
    it('Senior_Leader can approve cross team', () => {
      expect(hasPermission('Senior_Leader', APPROVE_CROSS_TEAM)).toBe(true);
    });

    it('Senior_Leader can override decisions', () => {
      expect(hasPermission('Senior_Leader', OVERRIDE_DECISION)).toBe(true);
    });

    it('Senior_Leader cannot manage users', () => {
      expect(hasPermission('Senior_Leader', MANAGE_USERS)).toBe(false);
    });

    // Admin permissions
    it('Admin can manage users', () => {
      expect(hasPermission('Admin', MANAGE_USERS)).toBe(true);
    });

    it('Admin can do system config', () => {
      expect(hasPermission('Admin', SYSTEM_CONFIG)).toBe(true);
    });

    it('Admin can import/export', () => {
      expect(hasPermission('Admin', IMPORT_EXPORT)).toBe(true);
    });

    it('Admin can manage processes', () => {
      expect(hasPermission('Admin', MANAGE_PROCESSES)).toBe(true);
    });

    it('Admin can do everything', () => {
      const allActions = [
        VIEW_CLIMATE, USE_MATCHMAKER, SUBMIT_REQUEST,
        APPROVE_OWN_TEAM, APPROVE_CROSS_TEAM, OVERRIDE_DECISION,
        MANAGE_USERS, SYSTEM_CONFIG, IMPORT_EXPORT, MANAGE_PROCESSES,
      ];
      for (const action of allActions) {
        expect(hasPermission('Admin', action)).toBe(true);
      }
    });

    // Unknown action
    it('returns false for unknown actions', () => {
      expect(hasPermission('Admin', 'unknown_action')).toBe(false);
    });
  });

  describe('getPermittedActions', () => {
    it('returns 3 actions for SME', () => {
      const actions = getPermittedActions('SME');
      expect(actions).toHaveLength(3);
      expect(actions).toContain(VIEW_CLIMATE);
      expect(actions).toContain(USE_MATCHMAKER);
      expect(actions).toContain(SUBMIT_REQUEST);
    });

    it('returns 3 actions for POC', () => {
      const actions = getPermittedActions('POC');
      expect(actions).toHaveLength(3);
    });

    it('returns 4 actions for Manager', () => {
      const actions = getPermittedActions('Manager');
      expect(actions).toHaveLength(4);
      expect(actions).toContain(APPROVE_OWN_TEAM);
    });

    it('returns 6 actions for Senior_Leader', () => {
      const actions = getPermittedActions('Senior_Leader');
      expect(actions).toHaveLength(6);
      expect(actions).toContain(APPROVE_CROSS_TEAM);
      expect(actions).toContain(OVERRIDE_DECISION);
    });

    it('returns 10 actions for Admin', () => {
      const actions = getPermittedActions('Admin');
      expect(actions).toHaveLength(10);
    });
  });
});
