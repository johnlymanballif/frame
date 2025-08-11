import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasManagerAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/rates/users - Get all users with their rates (for managers)
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!hasManagerAccess(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const teamUsers = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.orgId, user.orgId),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        costRateCents: true,
        billRateCents: true,
        active: true,
      },
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    return NextResponse.json(teamUsers);
  } catch (error) {
    console.error("Error fetching user rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch user rates" },
      { status: 500 }
    );
  }
}

// PUT /api/rates/users - Update user rates (for managers)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!hasManagerAccess(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { userId, costRateCents, billRateCents } = await request.json();

    if (!userId || costRateCents == null || billRateCents == null) {
      return NextResponse.json(
        { error: "Missing required fields: userId, costRateCents, billRateCents" },
        { status: 400 }
      );
    }

    // Verify the user belongs to the same organization
    const targetUser = await db.query.users.findFirst({
      where: (users, { eq, and }) => and(
        eq(users.id, userId),
        eq(users.orgId, user.orgId)
      ),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update the user's rates
    const [updatedUser] = await db
      .update(users)
      .set({
        costRateCents: parseInt(costRateCents),
        billRateCents: parseInt(billRateCents),
      })
      .where(and(eq(users.id, userId), eq(users.orgId, user.orgId)))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        costRateCents: users.costRateCents,
        billRateCents: users.billRateCents,
        active: users.active,
      });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user rates:", error);
    return NextResponse.json(
      { error: "Failed to update user rates" },
      { status: 500 }
    );
  }
}