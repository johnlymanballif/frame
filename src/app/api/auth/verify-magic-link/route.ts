import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationTokens, users, invitations } from "@/lib/db/schema";
import { signIn } from "next-auth/react";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const email = url.searchParams.get("email");

    if (!token || !email) {
      return NextResponse.redirect(new URL("/auth/signin?error=InvalidToken", req.url));
    }

    // Verify the token
    const verificationToken = await db.query.verificationTokens.findFirst({
      where: and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, token)
      ),
    });

    if (!verificationToken || new Date() > verificationToken.expires) {
      return NextResponse.redirect(new URL("/auth/signin?error=ExpiredToken", req.url));
    }

    // Delete the used token
    await db.delete(verificationTokens)
      .where(and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, token)
      ));

    // Check if user exists or create from invitation
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      // Check for pending invitation
      const pendingInvitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.email, email),
          isNull(invitations.acceptedAt)
        ),
      });

      if (pendingInvitation && new Date() <= pendingInvitation.expiresAt) {
        // Create user from invitation
        const [newUser] = await db.insert(users).values({
          orgId: pendingInvitation.orgId,
          name: email.split('@')[0],
          email: email,
          role: pendingInvitation.role,
          costRateCents: 5000, // Default $50/hour
        }).returning();

        // Mark invitation as accepted
        await db.update(invitations)
          .set({ acceptedAt: new Date() })
          .where(eq(invitations.id, pendingInvitation.id));

        user = newUser;
      } else {
        // Create user in default org (for demo)
        const defaultOrg = await db.query.organizations.findFirst();
        if (!defaultOrg) {
          return NextResponse.redirect(new URL("/auth/signin?error=NoOrganization", req.url));
        }

        const [newUser] = await db.insert(users).values({
          orgId: defaultOrg.id,
          name: email.split('@')[0],
          email: email,
          role: "member",
          costRateCents: 5000,
        }).returning();

        user = newUser;
      }
    }

    // Create a session by redirecting to NextAuth callback
    // Since we can't directly create a session in a GET handler, we'll use a workaround
    return NextResponse.redirect(
      new URL(`/api/auth/callback/credentials?email=${encodeURIComponent(email)}&userId=${user.id}`, req.url)
    );

  } catch (error) {
    console.error("Error verifying magic link:", error);
    return NextResponse.redirect(new URL("/auth/signin?error=VerificationError", req.url));
  }
}