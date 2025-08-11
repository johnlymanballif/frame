import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

const startTimerSchema = z.object({
  projectId: z.number(),
  taskId: z.number().optional(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, taskId, note } = startTimerSchema.parse(body);

    // Check if there's already a running entry
    const existingEntry = await db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.userId, parseInt(session.user.id)),
        eq(timeEntries.orgId, session.user.orgId),
        isNull(timeEntries.endedAt)
      ),
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: "Timer is already running" },
        { status: 400 }
      );
    }

    // Create new running entry
    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        orgId: session.user.orgId,
        userId: parseInt(session.user.id),
        projectId,
        taskId,
        startedAt: new Date(),
        note: note || null,
        billable: true, // Default to billable, can be changed later
      })
      .returning();

    // Get the entry with related data
    const entryWithRelations = await db.query.timeEntries.findFirst({
      where: eq(timeEntries.id, newEntry.id),
      with: {
        project: true,
        task: true,
      },
    });

    return NextResponse.json(entryWithRelations);
  } catch (error) {
    console.error("Error starting timer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}