import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const stopTimerSchema = z.object({
  entryId: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entryId } = stopTimerSchema.parse(body);

    // Get the entry to verify ownership and calculate minutes
    const entry = await db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.id, entryId),
        eq(timeEntries.userId, parseInt(session.user.id)),
        eq(timeEntries.orgId, session.user.orgId)
      ),
    });

    if (!entry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    if (entry.endedAt) {
      return NextResponse.json(
        { error: "Timer is already stopped" },
        { status: 400 }
      );
    }

    const endedAt = new Date();
    const startedAt = new Date(entry.startedAt);
    const minutes = Math.floor((endedAt.getTime() - startedAt.getTime()) / (1000 * 60));

    // Update the entry with end time and calculated minutes
    const [updatedEntry] = await db
      .update(timeEntries)
      .set({
        endedAt,
        minutes: Math.max(1, minutes), // Minimum 1 minute
      })
      .where(eq(timeEntries.id, entryId))
      .returning();

    return NextResponse.json(updatedEntry);
  } catch (error) {
    console.error("Error stopping timer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}