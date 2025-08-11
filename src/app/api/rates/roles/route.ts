import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasManagerAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { roleDefaultRates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/rates/roles - Get role default rates
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!hasManagerAccess(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rates = await db.query.roleDefaultRates.findMany({
      where: (roleDefaultRates, { eq }) => eq(roleDefaultRates.orgId, user.orgId),
      orderBy: (roleDefaultRates, { asc }) => [asc(roleDefaultRates.roleName)],
    });

    // Ensure we have rates for all roles, create defaults if missing
    const roleNames: ("member" | "manager" | "owner")[] = ["member", "manager", "owner"];
    const existingRoles = new Set(rates.map(r => r.roleName));
    
    const allRates = [...rates];
    
    for (const roleName of roleNames) {
      if (!existingRoles.has(roleName)) {
        // Create default rate for missing role
        const defaultRate = {
          orgId: user.orgId,
          roleName,
          costRateCents: getDefaultCostRate(roleName),
          billRateCents: getDefaultBillRate(roleName),
        };
        
        const [newRate] = await db
          .insert(roleDefaultRates)
          .values(defaultRate)
          .returning();
        
        allRates.push(newRate);
      }
    }

    return NextResponse.json(allRates.sort((a, b) => 
      roleNames.indexOf(a.roleName) - roleNames.indexOf(b.roleName)
    ));
  } catch (error) {
    console.error("Error fetching role default rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch role default rates" },
      { status: 500 }
    );
  }
}

// PUT /api/rates/roles - Update role default rates
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!hasManagerAccess(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { roleName, costRateCents, billRateCents } = await request.json();

    if (!roleName || costRateCents == null || billRateCents == null) {
      return NextResponse.json(
        { error: "Missing required fields: roleName, costRateCents, billRateCents" },
        { status: 400 }
      );
    }

    if (!["member", "manager", "owner"].includes(roleName)) {
      return NextResponse.json(
        { error: "Invalid role name" },
        { status: 400 }
      );
    }

    // Check if rate exists
    const existingRate = await db.query.roleDefaultRates.findFirst({
      where: (roleDefaultRates, { eq, and }) => and(
        eq(roleDefaultRates.orgId, user.orgId),
        eq(roleDefaultRates.roleName, roleName)
      ),
    });

    let updatedRate;

    if (existingRate) {
      // Update existing rate
      [updatedRate] = await db
        .update(roleDefaultRates)
        .set({
          costRateCents: parseInt(costRateCents),
          billRateCents: parseInt(billRateCents),
          updatedAt: new Date(),
        })
        .where(and(
          eq(roleDefaultRates.orgId, user.orgId),
          eq(roleDefaultRates.roleName, roleName)
        ))
        .returning();
    } else {
      // Create new rate
      [updatedRate] = await db
        .insert(roleDefaultRates)
        .values({
          orgId: user.orgId,
          roleName,
          costRateCents: parseInt(costRateCents),
          billRateCents: parseInt(billRateCents),
        })
        .returning();
    }

    return NextResponse.json(updatedRate);
  } catch (error) {
    console.error("Error updating role default rates:", error);
    return NextResponse.json(
      { error: "Failed to update role default rates" },
      { status: 500 }
    );
  }
}

function getDefaultCostRate(role: "member" | "manager" | "owner"): number {
  switch (role) {
    case "member": return 5000; // $50/hour
    case "manager": return 8000; // $80/hour
    case "owner": return 12000; // $120/hour
    default: return 5000;
  }
}

function getDefaultBillRate(role: "member" | "manager" | "owner"): number {
  switch (role) {
    case "member": return 10000; // $100/hour
    case "manager": return 15000; // $150/hour
    case "owner": return 20000; // $200/hour
    default: return 10000;
  }
}