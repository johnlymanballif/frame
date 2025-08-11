// Role-Based Access Control (RBAC) utilities
import { hasManagerAccess, hasOwnerAccess } from "./authz";

export interface User {
  id: string;
  role: "member" | "manager" | "owner";
  orgId: number;
  email?: string;
  name?: string;
}

export interface RBACContext {
  user: User;
  resource?: string;
  action?: string;
}

// Permission definitions
export const PERMISSIONS = {
  // Time entries
  TIME_ENTRY_CREATE: "time:entry:create",
  TIME_ENTRY_READ_OWN: "time:entry:read:own", 
  TIME_ENTRY_READ_ALL: "time:entry:read:all",
  TIME_ENTRY_UPDATE_OWN: "time:entry:update:own",
  TIME_ENTRY_UPDATE_ALL: "time:entry:update:all",
  TIME_ENTRY_DELETE_OWN: "time:entry:delete:own",
  TIME_ENTRY_DELETE_ALL: "time:entry:delete:all",

  // Projects
  PROJECT_CREATE: "project:create",
  PROJECT_READ: "project:read",
  PROJECT_UPDATE: "project:update",
  PROJECT_DELETE: "project:delete",

  // Planning
  PLANNING_READ: "planning:read",
  PLANNING_WRITE: "planning:write",

  // Profitability
  PROFIT_READ_BASIC: "profit:read:basic",
  PROFIT_READ_DETAILED: "profit:read:detailed",

  // Team management
  TEAM_READ: "team:read",
  TEAM_MANAGE: "team:manage",

  // Organization
  ORG_READ: "org:read",
  ORG_UPDATE: "org:update",
} as const;

// Role-based permission mapping
export const ROLE_PERMISSIONS = {
  member: [
    PERMISSIONS.TIME_ENTRY_CREATE,
    PERMISSIONS.TIME_ENTRY_READ_OWN,
    PERMISSIONS.TIME_ENTRY_UPDATE_OWN,
    PERMISSIONS.TIME_ENTRY_DELETE_OWN,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.ORG_READ,
  ],
  manager: [
    // All member permissions
    ...ROLE_PERMISSIONS?.member || [],
    // Plus manager permissions
    PERMISSIONS.TIME_ENTRY_READ_ALL,
    PERMISSIONS.TIME_ENTRY_UPDATE_ALL,
    PERMISSIONS.PLANNING_READ,
    PERMISSIONS.PLANNING_WRITE,
    PERMISSIONS.PROFIT_READ_BASIC,
    PERMISSIONS.PROFIT_READ_DETAILED,
    PERMISSIONS.TEAM_READ,
    PERMISSIONS.PROJECT_CREATE,
    PERMISSIONS.PROJECT_UPDATE,
  ],
  owner: [
    // All manager permissions  
    ...ROLE_PERMISSIONS?.manager || [],
    // Plus owner permissions
    PERMISSIONS.TIME_ENTRY_DELETE_ALL,
    PERMISSIONS.PROJECT_DELETE,
    PERMISSIONS.TEAM_MANAGE,
    PERMISSIONS.ORG_UPDATE,
  ],
};

// Fix the circular reference by defining member permissions inline
ROLE_PERMISSIONS.member = [
  PERMISSIONS.TIME_ENTRY_CREATE,
  PERMISSIONS.TIME_ENTRY_READ_OWN,
  PERMISSIONS.TIME_ENTRY_UPDATE_OWN,
  PERMISSIONS.TIME_ENTRY_DELETE_OWN,
  PERMISSIONS.PROJECT_READ,
  PERMISSIONS.ORG_READ,
];

ROLE_PERMISSIONS.manager = [
  ...ROLE_PERMISSIONS.member,
  PERMISSIONS.TIME_ENTRY_READ_ALL,
  PERMISSIONS.TIME_ENTRY_UPDATE_ALL,
  PERMISSIONS.PLANNING_READ,
  PERMISSIONS.PLANNING_WRITE,
  PERMISSIONS.PROFIT_READ_BASIC,
  PERMISSIONS.PROFIT_READ_DETAILED,
  PERMISSIONS.TEAM_READ,
  PERMISSIONS.PROJECT_CREATE,
  PERMISSIONS.PROJECT_UPDATE,
];

ROLE_PERMISSIONS.owner = [
  ...ROLE_PERMISSIONS.manager,
  PERMISSIONS.TIME_ENTRY_DELETE_ALL,
  PERMISSIONS.PROJECT_DELETE,
  PERMISSIONS.TEAM_MANAGE,
  PERMISSIONS.ORG_UPDATE,
];

export function hasPermission(user: User, permission: string): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission as unknown as typeof PERMISSIONS[keyof typeof PERMISSIONS]);
}

export function canAccessResource(user: User, resourceOrgId: number): boolean {
  return user.orgId === resourceOrgId;
}

export function filterTimeEntriesByRole(user: User) {
  // Members can only see their own entries
  if (user.role === "member") {
    return { userId: parseInt(user.id) };
  }
  // Managers and owners can see all entries in their org
  return {};
}

export function filterProjectsByRole(user: User) {
  // All roles can see projects in their org
  return { orgId: user.orgId };
}

export function canModifyTimeEntry(user: User, entryUserId: number): boolean {
  if (hasPermission(user, PERMISSIONS.TIME_ENTRY_UPDATE_ALL)) {
    return true;
  }
  
  if (hasPermission(user, PERMISSIONS.TIME_ENTRY_UPDATE_OWN)) {
    return parseInt(user.id) === entryUserId;
  }
  
  return false;
}

export function canDeleteTimeEntry(user: User, entryUserId: number): boolean {
  if (hasPermission(user, PERMISSIONS.TIME_ENTRY_DELETE_ALL)) {
    return true;
  }
  
  if (hasPermission(user, PERMISSIONS.TIME_ENTRY_DELETE_OWN)) {
    return parseInt(user.id) === entryUserId;
  }
  
  return false;
}

export function canViewProfitability(user: User): boolean {
  return hasPermission(user, PERMISSIONS.PROFIT_READ_BASIC) || 
         hasPermission(user, PERMISSIONS.PROFIT_READ_DETAILED);
}

export function canViewDetailedProfitability(user: User): boolean {
  return hasPermission(user, PERMISSIONS.PROFIT_READ_DETAILED);
}

export function canManagePlanning(user: User): boolean {
  return hasPermission(user, PERMISSIONS.PLANNING_WRITE);
}

export function canManageTeam(user: User): boolean {
  return hasPermission(user, PERMISSIONS.TEAM_MANAGE);
}

export function canManageOrganization(user: User): boolean {
  return hasPermission(user, PERMISSIONS.ORG_UPDATE);
}

// Data filtering utilities
export interface DataFilter {
  where?: any;
  select?: any;
  with?: any;
}

export function applyRoleBasedFiltering(
  user: User, 
  resource: string, 
  baseFilter: DataFilter = {}
): DataFilter {
  const filter = { ...baseFilter };

  switch (resource) {
    case "time_entries":
      if (user.role === "member") {
        filter.where = {
          ...filter.where,
          userId: parseInt(user.id),
          orgId: user.orgId,
        };
      } else {
        filter.where = {
          ...filter.where,
          orgId: user.orgId,
        };
      }
      break;

    case "projects":
      filter.where = {
        ...filter.where,
        orgId: user.orgId,
      };
      break;

    case "profitability":
      if (!canViewDetailedProfitability(user)) {
        // Hide cost rates and detailed financial info for non-manager roles
        if (filter.select) {
          delete filter.select.costRateCents;
          delete filter.select.totalCostCents;
        }
      }
      filter.where = {
        ...filter.where,
        orgId: user.orgId,
      };
      break;

    default:
      // Default: organization-level filtering
      filter.where = {
        ...filter.where,
        orgId: user.orgId,
      };
  }

  return filter;
}

// Validation utilities
export function validateResourceAccess(user: User, resource: any): boolean {
  if (!resource) return false;
  
  // Check if resource belongs to user's organization
  if (resource.orgId && resource.orgId !== user.orgId) {
    return false;
  }

  // Check if user owns the resource (for member-level resources)
  if (user.role === "member" && resource.userId && resource.userId !== parseInt(user.id)) {
    return false;
  }

  return true;
}

export class RBACError extends Error {
  constructor(message: string, public statusCode: number = 403) {
    super(message);
    this.name = "RBACError";
  }
}

export function enforcePermission(user: User, permission: string) {
  if (!hasPermission(user, permission)) {
    throw new RBACError(`Permission ${permission} required`, 403);
  }
}

export function enforceResourceAccess(user: User, resource: any) {
  if (!validateResourceAccess(user, resource)) {
    throw new RBACError("Access denied to resource", 403);
  }
}