import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session?.user) {
    redirect("/auth/signin");
  }

  return session.user;
}

export function hasManagerAccess(role: string): boolean {
  return role === "manager" || role === "owner";
}

export function hasOwnerAccess(role: string): boolean {
  return role === "owner";
}

export async function requireAuth() {
  const user = await getCurrentUser();
  return user;
}

export async function requireManagerAuth() {
  const user = await getCurrentUser();
  
  if (!hasManagerAccess(user.role)) {
    throw new Error("Manager access required");
  }
  
  return user;
}

export async function requireOwnerAuth() {
  const user = await getCurrentUser();
  
  if (!hasOwnerAccess(user.role)) {
    throw new Error("Owner access required");
  }
  
  return user;
}

// Middleware for API routes
export function withAuth<T extends any[], R>(
  handler: (user: any, ...args: T) => R
) {
  return async (...args: T): Promise<R> => {
    const user = await requireAuth();
    return handler(user, ...args);
  };
}

export function withManagerAuth<T extends any[], R>(
  handler: (user: any, ...args: T) => R
) {
  return async (...args: T): Promise<R> => {
    const user = await requireManagerAuth();
    return handler(user, ...args);
  };
}

export function withOwnerAuth<T extends any[], R>(
  handler: (user: any, ...args: T) => R
) {
  return async (...args: T): Promise<R> => {
    const user = await requireOwnerAuth();
    return handler(user, ...args);
  };
}