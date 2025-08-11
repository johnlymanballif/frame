import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateEntrySchema = z.object({
  projectId: z.number().optional(),
  taskId: z.number().optional().nullable(),
  minutes: z.number().min(1).optional(),
  note: z.string().optional().nullable(),
  billable: z.boolean().optional(),
  startedAt: z.string().optional(),
});

const splitEntrySchema = z.object({
  splitAtMinutes: z.number().min(1),
  firstEntryMinutes: z.number().min(1),
  secondEntry: z.object({
    projectId: z.number().optional(),
    taskId: z.number().optional().nullable(),
    note: z.string().optional().nullable(),
    billable: z.boolean().optional(),
  }),
});

export async function PATCH(
  request: NextRequest,
  context: any
) {
  try {
    const { params } = context as { params: { entryId: string } };
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entryId = parseInt(params.entryId);
    const body = await request.json();
    const updates = updateEntrySchema.parse(body);

    // Get the existing entry to verify ownership
    const existingEntry = await db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.id, entryId),
        eq(timeEntries.orgId, session.user.orgId)
      ),
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    // Check if user can edit this entry (own entry or manager)
    const canEdit = existingEntry.userId === parseInt(session.user.id) || 
                   session.user.role !== "member";

    if (!canEdit) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    // Prepare update data
    const updateData: Partial<typeof timeEntries.$inferInsert> = {};
    if (updates.projectId !== undefined) updateData.projectId = updates.projectId;
    if (updates.taskId !== undefined) updateData.taskId = updates.taskId;
    if (updates.minutes !== undefined) updateData.minutes = updates.minutes;
    if (updates.note !== undefined) updateData.note = updates.note;
    if (updates.billable !== undefined) updateData.billable = updates.billable;
    if (updates.startedAt !== undefined) {
      updateData.startedAt = new Date(updates.startedAt);
      // Recalculate end time if we have minutes
      if (existingEntry.minutes) {
        updateData.endedAt = new Date(new Date(updates.startedAt).getTime() + existingEntry.minutes * 60 * 1000);
      }
    }

    // Update the entry
    const [updatedEntry] = await db
      .update(timeEntries)
      .set(updateData)
      .where(eq(timeEntries.id, entryId))
      .returning();

    // Get the updated entry with relations
    const entryWithRelations = await db.query.timeEntries.findFirst({
      where: eq(timeEntries.id, updatedEntry.id),
      with: {
        project: {
          with: {
            client: true,
          },
        },
        task: true,
      },
    });

    return NextResponse.json(entryWithRelations);
  } catch (error) {
    console.error("Error updating time entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    const { params } = context as { params: { entryId: string } };
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entryId = parseInt(params.entryId);

    // Get the existing entry to verify ownership
    const existingEntry = await db.query.timeEntries.findFirst({
      where: and(
        eq(timeEntries.id, entryId),
        eq(timeEntries.orgId, session.user.orgId)
      ),
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: "Time entry not found" },
        { status: 404 }
      );
    }

    // Check if user can delete this entry (own entry or manager)
    const canDelete = existingEntry.userId === parseInt(session.user.id) || 
                     session.user.role !== "member";

    if (!canDelete) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 }
      );
    }

    await db.delete(timeEntries).where(eq(timeEntries.id, entryId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    const { params } = context as { params: { entryId: string } };
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entryId = parseInt(params.entryId);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "split") {
      const body = await request.json();
      const splitData = splitEntrySchema.parse(body);

      // Get the existing entry
      const existingEntry = await db.query.timeEntries.findFirst({
        where: and(
          eq(timeEntries.id, entryId),
          eq(timeEntries.orgId, session.user.orgId)
        ),
      });

      if (!existingEntry || !existingEntry.minutes) {
        return NextResponse.json(
          { error: "Time entry not found or incomplete" },
          { status: 404 }
        );
      }

      // Check permissions
      const canEdit = existingEntry.userId === parseInt(session.user.id) || 
                     session.user.role !== "member";

      if (!canEdit) {
        return NextResponse.json(
          { error: "Permission denied" },
          { status: 403 }
        );
      }

      // Update the original entry
      const originalStartTime = new Date(existingEntry.startedAt);
      const splitTime = new Date(originalStartTime.getTime() + splitData.splitAtMinutes * 60 * 1000);
      
      await db
        .update(timeEntries)
        .set({
          minutes: splitData.firstEntryMinutes,
          endedAt: splitTime,
        })
        .where(eq(timeEntries.id, entryId));

      // Create the second entry
      const secondEntryMinutes = existingEntry.minutes - splitData.firstEntryMinutes;
      const secondEndTime = new Date(splitTime.getTime() + secondEntryMinutes * 60 * 1000);

      const [newEntry] = await db
        .insert(timeEntries)
        .values({
          orgId: session.user.orgId,
          userId: existingEntry.userId,
          projectId: splitData.secondEntry.projectId || existingEntry.projectId,
          taskId: splitData.secondEntry.taskId !== undefined ? splitData.secondEntry.taskId : existingEntry.taskId,
          startedAt: splitTime,
          endedAt: secondEndTime,
          minutes: secondEntryMinutes,
          note: splitData.secondEntry.note !== undefined ? splitData.secondEntry.note : existingEntry.note,
          billable: splitData.secondEntry.billable !== undefined ? splitData.secondEntry.billable : existingEntry.billable,
        })
        .returning();

      // Get both entries with relations
      const [originalEntry, splitEntry] = await Promise.all([
        db.query.timeEntries.findFirst({
          where: eq(timeEntries.id, entryId),
          with: {
            project: { with: { client: true } },
            task: true,
          },
        }),
        db.query.timeEntries.findFirst({
          where: eq(timeEntries.id, newEntry.id),
          with: {
            project: { with: { client: true } },
            task: true,
          },
        }),
      ]);

      return NextResponse.json({ originalEntry, splitEntry });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error in time entry action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}