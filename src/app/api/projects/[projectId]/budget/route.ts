import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const updateBudgetSchema = z.object({
  budgetType: z.enum(["hours", "amount"]).optional(),
  budgetValue: z.number().min(0).optional(),
  defaultBillRateCents: z.number().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can update budgets
    if (session.user.role === "member") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const projectId = parseInt(params.projectId);
    const body = await request.json();
    const updates = updateBudgetSchema.parse(body);

    // Verify project belongs to user's organization
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.orgId, session.user.orgId)
      ),
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Update the project
    const updateData: Partial<Pick<typeof projects.$inferInsert, "budgetType" | "budgetValue" | "defaultBillRateCents">> = {} as any;
    if (updates.budgetType !== undefined) updateData.budgetType = updates.budgetType;
    if (updates.budgetValue !== undefined) updateData.budgetValue = updates.budgetValue;
    if (updates.defaultBillRateCents !== undefined) updateData.defaultBillRateCents = updates.defaultBillRateCents;

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId))
      .returning();

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project budget:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}