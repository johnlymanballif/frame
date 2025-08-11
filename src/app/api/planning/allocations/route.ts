import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { allocations, users, projects } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { startOfWeek, addWeeks, format } from "date-fns";
import { z } from "zod";

const getAllocationsSchema = z.object({
  startWeek: z.string().optional(),
  weeks: z.number().min(1).max(12).optional(),
  userId: z.number().optional(),
  projectId: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can view team allocations
    if (session.user.role === "member") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = getAllocationsSchema.parse({
      startWeek: searchParams.get("startWeek") || undefined,
      weeks: searchParams.get("weeks") ? parseInt(searchParams.get("weeks")!) : 5,
      userId: searchParams.get("userId") ? parseInt(searchParams.get("userId")!) : undefined,
      projectId: searchParams.get("projectId") ? parseInt(searchParams.get("projectId")!) : undefined,
    });

    // Default to current week if not specified
    const startDate = query.startWeek 
      ? startOfWeek(new Date(query.startWeek), { weekStartsOn: session.user.organization?.weekStart === "Sun" ? 0 : 1 })
      : startOfWeek(new Date(), { weekStartsOn: session.user.organization?.weekStart === "Sun" ? 0 : 1 });

    const endDate = addWeeks(startDate, query.weeks);

    // Get all team members
    const teamMembers = await db.query.users.findMany({
      where: and(
        eq(users.orgId, session.user.orgId),
        eq(users.active, true),
        query.userId ? eq(users.id, query.userId) : undefined
      ),
      orderBy: (users, { asc }) => [asc(users.name)],
    });

    // Get all active projects
    const activeProjects = await db.query.projects.findMany({
      where: and(
        eq(projects.orgId, session.user.orgId),
        eq(projects.status, "active"),
        query.projectId ? eq(projects.id, query.projectId) : undefined
      ),
      with: {
        client: true,
      },
      orderBy: (projects, { asc }) => [asc(projects.name)],
    });

    // Get allocations for the period
    const allocationsData = await db.query.allocations.findMany({
      where: and(
        eq(allocations.orgId, session.user.orgId),
        gte(allocations.weekStartDate, format(startDate, "yyyy-MM-dd")),
        lte(allocations.weekStartDate, format(endDate, "yyyy-MM-dd")),
        query.userId ? eq(allocations.userId, query.userId) : undefined,
        query.projectId ? eq(allocations.projectId, query.projectId) : undefined
      ),
      with: {
        user: true,
        project: {
          with: {
            client: true,
          },
        },
      },
    });

    // Generate week headers
    const weekHeaders = [];
    for (let i = 0; i < query.weeks; i++) {
      const weekStart = addWeeks(startDate, i);
      weekHeaders.push({
        weekStart: format(weekStart, "yyyy-MM-dd"),
        label: format(weekStart, "MMM dd"),
        isCurrentWeek: format(new Date(), "yyyy-MM-dd") === format(weekStart, "yyyy-MM-dd"),
      });
    }

    // Organize data by user and week
    const gridData = teamMembers.map(user => {
      const userCapacity = 40; // Default 40h/week, could be customizable
      
      const weeks = weekHeaders.map(week => {
        const weekAllocations = allocationsData.filter(
          allocation => 
            allocation.userId === user.id && 
            allocation.weekStartDate === week.weekStart
        );

        const totalPlanned = weekAllocations.reduce(
          (sum, allocation) => sum + (parseFloat(allocation.plannedHours?.toString() || "0")), 
          0
        );

        return {
          weekStart: week.weekStart,
          allocations: weekAllocations.map(allocation => ({
            id: allocation.id,
            projectId: allocation.projectId,
            project: allocation.project,
            plannedHours: parseFloat(allocation.plannedHours?.toString() || "0"),
          })),
          totalPlanned,
          capacity: userCapacity,
          variance: userCapacity - totalPlanned,
          utilizationPercent: Math.round((totalPlanned / userCapacity) * 100),
        };
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
        },
        capacity: userCapacity,
        weeks,
        totalPlanned: weeks.reduce((sum, week) => sum + week.totalPlanned, 0),
        averageUtilization: Math.round(
          weeks.reduce((sum, week) => sum + week.utilizationPercent, 0) / weeks.length
        ),
      };
    });

    return NextResponse.json({
      gridData,
      weekHeaders,
      projects: activeProjects,
      period: {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        weeks: query.weeks,
      },
    });
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const upsertAllocationSchema = z.object({
  userId: z.number(),
  projectId: z.number(),
  weekStartDate: z.string(),
  plannedHours: z.number().min(0).max(80),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers can modify allocations
    if (session.user.role === "member") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = upsertAllocationSchema.parse(body);

    // Check if allocation already exists
    const existingAllocation = await db.query.allocations.findFirst({
      where: and(
        eq(allocations.orgId, session.user.orgId),
        eq(allocations.userId, data.userId),
        eq(allocations.projectId, data.projectId),
        eq(allocations.weekStartDate, data.weekStartDate)
      ),
    });

    let result;
    if (existingAllocation) {
      // Update existing allocation
      if (data.plannedHours === 0) {
        // Delete if planned hours is 0
        await db
          .delete(allocations)
          .where(eq(allocations.id, existingAllocation.id));
        result = { deleted: true };
      } else {
        // Update existing
        const [updated] = await db
          .update(allocations)
          .set({
            plannedHours: data.plannedHours.toString(),
          })
          .where(eq(allocations.id, existingAllocation.id))
          .returning();
        result = updated;
      }
    } else if (data.plannedHours > 0) {
      // Create new allocation only if planned hours > 0
      const [created] = await db
        .insert(allocations)
        .values({
          orgId: session.user.orgId,
          userId: data.userId,
          projectId: data.projectId,
          weekStartDate: data.weekStartDate,
          plannedHours: data.plannedHours.toString(),
        })
        .returning();
      result = created;
    } else {
      result = { message: "No allocation created for 0 hours" };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error upserting allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}