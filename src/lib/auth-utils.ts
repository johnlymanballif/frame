// Client-side authentication utilities
// These functions don't import server-side modules

export function hasManagerAccess(role: string): boolean {
  return role === "manager" || role === "owner";
}

export function hasOwnerAccess(role: string): boolean {
  return role === "owner";
}

// Client-side role checking for components
export function checkManagerAccess(userRole?: string): boolean {
  if (!userRole) return false;
  return hasManagerAccess(userRole);
}

export function checkOwnerAccess(userRole?: string): boolean {
  if (!userRole) return false;
  return hasOwnerAccess(userRole);
}