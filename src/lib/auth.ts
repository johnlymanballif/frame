import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users, accounts, sessions, verificationTokens, invitations } from "./db/schema";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt", // Use JWT for credentials providers
  },
  providers: [
    // Demo credentials provider for quick testing
    CredentialsProvider({
      id: "demo",
      name: "Demo Account",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        
        // Only allow demo emails
        const demoEmails = ["owner@demo.com", "manager@demo.com", "designer@demo.com"];
        if (!demoEmails.includes(credentials.email)) return null;

        // Get user from database
        const user = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, credentials.email),
          with: {
            organization: true,
          },
        });

        if (!user) return null;

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          orgId: user.orgId,
          organization: user.organization,
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
    error: "/auth/error",
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      // If user is set (on sign in), store user data in token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.orgId = user.orgId;
        token.organization = user.organization;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any;
        session.user.orgId = token.orgId as number;
        session.user.organization = token.organization as any;
      }
      return session;
    },
    signIn: async ({ user, account }) => {
      if (!user.email) return false;

      // Always allow demo provider
      if (account?.provider === "demo") {
        return true;
      }

      // For email provider, check if user exists or has invitation
      if (account?.provider === "email") {
        const existingUser = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.email, user.email),
        });

        if (existingUser) {
          return true; // User exists, allow sign in
        }

        // Check for pending invitation
        const pendingInvitation = await db.query.invitations.findFirst({
          where: (invitations, { eq, and, isNull }) => and(
            eq(invitations.email, user.email),
            isNull(invitations.acceptedAt)
          ),
          with: {
            organization: true,
          },
        });

        if (pendingInvitation) {
          // Check if invitation is still valid
          if (new Date() <= pendingInvitation.expiresAt) {
            // Create user from invitation
            await db.insert(users).values({
              orgId: pendingInvitation.orgId,
              name: user.name || user.email?.split('@')[0] || "New User",
              email: user.email,
              role: pendingInvitation.role,
              costRateCents: 5000, // $50/hour default
            });

            // Mark invitation as accepted
            await db.update(invitations)
              .set({ acceptedAt: new Date() })
              .where((invitations, { eq }) => eq(invitations.id, pendingInvitation.id));

            return true;
          }
        }

        // For demo purposes, allow open registration to default org
        // In production, you'd want invite-only
        const defaultOrg = await db.query.organizations.findFirst();
        
        if (defaultOrg) {
          await db.insert(users).values({
            orgId: defaultOrg.id,
            name: user.name || user.email?.split('@')[0] || "New User",
            email: user.email,
            role: "member",
            costRateCents: 5000, // $50/hour default
          });
          return true;
        }
        
        return false; // No invitation and no default org
      }

      return false;
    },
  },
  debug: process.env.NODE_ENV === "development",
};

// Extended session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "member" | "manager" | "owner";
      orgId: number;
      organization?: {
        id: number;
        name: string;
        timezone: string;
        weekStart: "Mon" | "Sun";
      };
    };
  }

  interface User {
    role: "member" | "manager" | "owner";
    orgId: number;
  }
}