import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { db } from "@/lib/db";
import { timeEntries, projects, tasks } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const { projectId, taskId, note, startTime, endTime } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project (same organization)
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.orgId, user.orgId)
      ),
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // If taskId provided, verify it belongs to the project
    if (taskId) {
      const task = await db.query.tasks.findFirst({
        where: and(
          eq(tasks.id, taskId),
          eq(tasks.projectId, projectId),
          eq(tasks.orgId, user.orgId)
        ),
      });

      if (!task) {
        return NextResponse.json({ error: "Task not found or access denied" }, { status: 404 });
      }
    }

    // Create time entry
    const [timeEntry] = await db.insert(timeEntries).values({
      userId: parseInt(user.id),
      orgId: user.orgId,
      projectId: parseInt(projectId),
      taskId: taskId ? parseInt(taskId) : null,
      note: note || null,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    }).returning();

    return NextResponse.json(timeEntry);

  } catch (error) {
    console.error("Error creating time entry:", error);
    if (error instanceof Error && error.message.includes("required")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const projectId = searchParams.get("projectId");

    const whereConditions = [eq(timeEntries.orgId, user.orgId)];

    // Users can only see their own entries unless they're managers
    if (user.role === "member") {
      whereConditions.push(eq(timeEntries.userId, parseInt(user.id)));
    }

    if (projectId) {
      whereConditions.push(eq(timeEntries.projectId, parseInt(projectId)));
    }

    if (startDate) {
      whereConditions.push(eq(timeEntries.startTime, new Date(startDate)));
    }

    const entries = await db.query.timeEntries.findMany({
      where: and(...whereConditions),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        project: {
          columns: {
            id: true,
            name: true,
          },
          with: {
            client: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        task: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [desc(timeEntries.startTime)],
      limit: 100,
    });

    return NextResponse.json(entries);

  } catch (error) {
    console.error("Error fetching time entries:", error);
    if (error instanceof Error && error.message.includes("required")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 });
  }
}