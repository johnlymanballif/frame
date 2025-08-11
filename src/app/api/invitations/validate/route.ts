import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // Find invitation with organization and inviter details
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        isNull(invitations.acceptedAt)
      ),
      with: {
        organization: {
          columns: { name: true }
        },
        invitedByUser: {
          columns: { name: true, email: true }
        }
      },
    });

    if (!invitation) {
      return NextResponse.json({ 
        error: "Invitation not found or already accepted" 
      }, { status: 404 });
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json({ 
        error: "Invitation has expired" 
      }, { status: 400 });
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationName: invitation.organization.name,
      inviterName: invitation.invitedByUser.name || invitation.invitedByUser.email,
      expiresAt: invitation.expiresAt,
    });

  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json({ 
      error: "Internal server error" 
    }, { status: 500 });
  }
}