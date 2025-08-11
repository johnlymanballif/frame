import { NextRequest, NextResponse } from "next/server";
import { requireManagerAuth } from "@/lib/authz";
import { db } from "@/lib/db";
import { invitations, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { emailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const user = await requireManagerAuth();
    const body = await request.json();
    
    const { email, role = "member" } = body;
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    
    if (!["member", "manager", "owner"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.orgId, user.orgId)
      ),
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists in your organization" },
        { status: 400 }
      );
    }
    
    // Check if invitation already exists
    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.email, email),
        eq(invitations.orgId, user.orgId)
      ),
    });
    
    if (existingInvitation && !existingInvitation.acceptedAt) {
      return NextResponse.json(
        { error: "Invitation already sent to this email" },
        { status: 400 }
      );
    }
    
    // Generate invitation token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Create invitation
    const [invitation] = await db.insert(invitations).values({
      orgId: user.orgId,
      email,
      role: role as "member" | "manager" | "owner",
      invitedBy: parseInt(user.id),
      token,
      expiresAt,
    }).returning();
    
    // Send invitation email
    const inviteLink = `${process.env.NEXTAUTH_URL}/auth/invite/${token}`;
    
    const emailSent = await emailService.sendInvitation(
      email,
      user.organization?.name || "Your Organization",
      user.name || "A team member",
      inviteLink,
      role
    );
    
    if (!emailSent) {
      // If email failed, clean up the invitation
      await db.delete(invitations).where(eq(invitations.id, invitation.id));
      return NextResponse.json(
        { error: "Failed to send invitation email" },
        { status: 500 }
      );
    }
    
    console.log(`Invitation sent to ${email}`);
    
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      }
    });
    
  } catch (error) {
    console.error("Error creating invitation:", error);
    if (error instanceof Error && error.message.includes("required")) {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  try {
    const user = await requireManagerAuth();
    
    // Get pending invitations for the organization
    const pendingInvitations = await db.query.invitations.findMany({
      where: and(eq(invitations.orgId, user.orgId), isNull(invitations.acceptedAt)),
      with: {
        invitedByUser: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
    });
    
    return NextResponse.json(pendingInvitations);
    
  } catch (error) {
    console.error("Error fetching invitations:", error);
    if (error instanceof Error && error.message.includes("required")) {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}