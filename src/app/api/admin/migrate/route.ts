import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasOwnerAccess } from "@/lib/authz";
import { runLatestMigration } from "@/lib/run-migration";

// POST /api/admin/migrate - Run database migration (owner only)
export async function POST() {
  try {
    const user = await getCurrentUser();
    
    if (!hasOwnerAccess(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await runLatestMigration();
    
    if (result.success) {
      return NextResponse.json({ message: "Migration completed successfully" });
    } else {
      return NextResponse.json(
        { error: "Migration failed", details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      { error: "Migration failed" },
      { status: 500 }
    );
  }
}