import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries, projects, tasks } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find running entry (ended_at is null)
    const runningEntry = await db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.userId, parseInt(session.user.id)),
        eq(timeEntries.orgId, session.user.orgId),
        isNull(timeEntries.endedAt)
      ),
      with: {
        project: true,
        task: true,
      },
    });

    // Convert Date objects to strings for JSON serialization
    const serializedEntry = runningEntry ? {
      ...runningEntry,
      startedAt: runningEntry.startedAt?.toISOString(),
      endedAt: runningEntry.endedAt?.toISOString(),
      createdAt: runningEntry.createdAt?.toISOString(),
      project: runningEntry.project ? {
        ...runningEntry.project,
        createdAt: runningEntry.project.createdAt?.toISOString(),
      } : null,
      task: runningEntry.task ? {
        ...runningEntry.task,
        createdAt: runningEntry.task.createdAt?.toISOString(),
      } : null,
    } : null;

    return NextResponse.json(serializedEntry);
  } catch (error) {
    console.error("Error fetching running entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}