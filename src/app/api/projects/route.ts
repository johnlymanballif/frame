import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, clients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active projects for the user's organization
    const orgProjects = await db.query.projects.findMany({
      where: and(
        eq(projects.orgId, session.user.orgId),
        eq(projects.status, "active")
      ),
      with: {
        client: true,
      },
      orderBy: (projects, { asc }) => [asc(projects.name)],
    });

    return NextResponse.json(orgProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, clientName, defaultBillRateCents } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    let clientId: number | null = null;

    // If client name provided, find or create client
    if (clientName) {
      // First check if client already exists
      const existingClient = await db.query.clients.findFirst({
        where: and(
          eq(clients.orgId, session.user.orgId),
          eq(clients.name, clientName)
        ),
      });

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client
        const [newClient] = await db
          .insert(clients)
          .values({
            orgId: session.user.orgId,
            name: clientName,
          })
          .returning();
        clientId = newClient.id;
      }
    }

    // Create the project
    const [newProject] = await db
      .insert(projects)
      .values({
        orgId: session.user.orgId,
        name,
        clientId,
        defaultBillRateCents: defaultBillRateCents ? parseInt(defaultBillRateCents) : null,
        status: "active" as const,
      })
      .returning();

    // Return the project with client info like GET endpoint
    const projectWithClient = await db.query.projects.findFirst({
      where: eq(projects.id, newProject.id),
      with: {
        client: true,
      },
    });

    return NextResponse.json(projectWithClient, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}