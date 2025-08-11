import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const switchTimerSchema = z.object({
  fromEntryId: z.number(),
  toProjectId: z.number(),
  toTaskId: z.number().optional(),
  note: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fromEntryId, toProjectId, toTaskId, note } = switchTimerSchema.parse(body);

    // Get the current running entry
    const currentEntry = await db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.id, fromEntryId),
        eq(timeEntries.userId, parseInt(session.user.id)),
        eq(timeEntries.orgId, session.user.orgId)
      ),
    });

    if (!currentEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    if (currentEntry.endedAt) {
      return NextResponse.json(
        { error: "Timer is already stopped" },
        { status: 400 }
      );
    }

    const now = new Date();
    const startedAt = new Date(currentEntry.startedAt);
    const elapsedSeconds = (now.getTime() - startedAt.getTime()) / 1000;

    // If less than 15 seconds elapsed, merge into new entry instead of creating separate entries
    if (elapsedSeconds < 15) {
      // Delete the barely-started entry and create new one with same start time
      await db.delete(timeEntries).where(eq(timeEntries.id, fromEntryId));

      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          orgId: session.user.orgId,
          userId: parseInt(session.user.id),
          projectId: toProjectId,
          taskId,
          startedAt: currentEntry.startedAt, // Keep original start time
          note: note || null,
          billable: true,
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
    } else {
      // Stop current entry and create new one
      const minutes = Math.floor(elapsedSeconds / 60);

      // Stop current entry
      await db
        .update(timeEntries)
        .set({
          endedAt: now,
          minutes: Math.max(1, minutes),
        })
        .where(eq(timeEntries.id, fromEntryId));

      // Start new entry
      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          orgId: session.user.orgId,
          userId: parseInt(session.user.id),
          projectId: toProjectId,
          taskId,
          startedAt: now,
          note: note || null,
          billable: true,
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
    }
  } catch (error) {
    console.error("Error switching timer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}