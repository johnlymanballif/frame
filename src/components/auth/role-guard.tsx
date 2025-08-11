"use client";

import { useSession } from "next-auth/react";
import { ReactNode } from "react";
import { hasManagerAccess, hasOwnerAccess } from "@/lib/auth-utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

interface RoleGuardProps {
  children: ReactNode;
  requiredRole?: "member" | "manager" | "owner";
  fallback?: ReactNode;
  allowRoles?: ("member" | "manager" | "owner")[];
}

export function RoleGuard({ 
  children, 
  requiredRole, 
  allowRoles,
  fallback 
}: RoleGuardProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!session?.user) {
    return fallback || (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Authentication required to view this content.
        </AlertDescription>
      </Alert>
    );
  }

  const userRole = session.user.role;
  let hasAccess = false;

  if (allowRoles) {
    hasAccess = allowRoles.includes(userRole);
  } else if (requiredRole) {
    switch (requiredRole) {
      case "owner":
        hasAccess = hasOwnerAccess(userRole);
        break;
      case "manager":
        hasAccess = hasManagerAccess(userRole);
        break;
      case "member":
        hasAccess = true; // All roles include member access
        break;
      default:
        hasAccess = false;
    }
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return fallback || (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          {requiredRole 
            ? `${requiredRole} role required to view this content.`
            : "Insufficient permissions to view this content."
          }
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

// Convenience components for common role checks
export function ManagerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <RoleGuard requiredRole="manager" fallback={fallback}>{children}</RoleGuard>;
}

export function OwnerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return <RoleGuard requiredRole="owner" fallback={fallback}>{children}</RoleGuard>;
}

// Hook for role-based conditional rendering
export function useRoleAccess() {
  const { data: session } = useSession();
  
  if (!session?.user) {
    return {
      isAuthenticated: false,
      isMember: false,
      isManager: false,
      isOwner: false,
      role: null,
    };
  }

  const role = session.user.role;
  
  return {
    isAuthenticated: true,
    isMember: true, // All roles have member access
    isManager: hasManagerAccess(role),
    isOwner: hasOwnerAccess(role),
    role,
  };
}