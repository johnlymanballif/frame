import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, projects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projectId = parseInt(params.projectId);

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

    // Get all active tasks for the project
    const projectTasks = await db.query.tasks.findMany({
      where: and(
        eq(tasks.projectId, projectId),
        eq(tasks.orgId, session.user.orgId),
        eq(tasks.active, true)
      ),
      orderBy: (tasks, { asc }) => [asc(tasks.name)],
    });

    return NextResponse.json(projectTasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}