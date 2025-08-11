import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verificationTokens, users, invitations } from "@/lib/db/schema";
import { emailService } from "@/lib/email";
import { randomBytes } from "crypto";
import { eq, and, isNull } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists or has invitation
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    const pendingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.email, email),
        isNull(invitations.acceptedAt)
      ),
    });

    if (!existingUser && !pendingInvitation) {
      // For demo purposes, we'll create a verification token anyway
      // In production, you might want to show an error or create an invitation
      const defaultOrg = await db.query.organizations.findFirst();
      if (!defaultOrg) {
        return NextResponse.json({ error: "No organization available" }, { status: 400 });
      }
    }

    // Generate magic link token
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clean up any existing tokens for this email
    await db.delete(verificationTokens)
      .where(eq(verificationTokens.identifier, email));

    // Create new verification token
    await db.insert(verificationTokens).values({
      identifier: email,
      token,
      expires,
    });

    // Create magic link URL (prefer runtime origin to support Vercel Preview/Prod)
    const baseUrl = process.env.NEXTAUTH_URL || req.nextUrl.origin;
    const magicLinkUrl = `${baseUrl}/api/auth/verify-magic-link?token=${token}&email=${encodeURIComponent(email)}`;

    // Send magic link email
    const emailSent = await emailService.sendMagicLink(email, magicLinkUrl);

    if (!emailSent) {
      // Clean up token if email failed
      await db.delete(verificationTokens)
        .where(and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.token, token)
        ));
      
      return NextResponse.json({ 
        error: "Failed to send magic link email" 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Magic link sent successfully",
      email,
    });

  } catch (error) {
    console.error("Error sending magic link:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}