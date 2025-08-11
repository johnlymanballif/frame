import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "today"; // today | week
    const date = searchParams.get("date") ? new Date(searchParams.get("date")!) : new Date();
    const userId = searchParams.get("userId"); // For managers to view team entries

    // Check if requesting team member data (managers only)
    const targetUserId = userId && session.user.role !== "member" 
      ? parseInt(userId) 
      : parseInt(session.user.id);

    let startDate: Date;
    let endDate: Date;

    if (view === "week") {
      startDate = startOfWeek(date, { weekStartsOn: session.user.organization?.weekStart === "Sun" ? 0 : 1 });
      endDate = endOfWeek(date, { weekStartsOn: session.user.organization?.weekStart === "Sun" ? 0 : 1 });
    } else {
      startDate = startOfDay(date);
      endDate = endOfDay(date);
    }

    // Fetch time entries for the specified period
    const entries = await db.query.timeEntries.findMany({
      where: and(
        eq(timeEntries.userId, targetUserId),
        eq(timeEntries.orgId, session.user.orgId),
        gte(timeEntries.startedAt, startDate),
        lte(timeEntries.startedAt, endDate)
      ),
      with: {
        project: {
          with: {
            client: true,
          },
        },
        task: true,
      },
      orderBy: [desc(timeEntries.startedAt)],
    });

    // Calculate totals
    const totalMinutes = entries.reduce((sum, entry) => sum + (entry.minutes || 0), 0);
    const billableMinutes = entries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + (entry.minutes || 0), 0);

    return NextResponse.json({
      entries,
      totals: {
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        billableHours: Math.round((billableMinutes / 60) * 10) / 10,
        nonBillableHours: Math.round(((totalMinutes - billableMinutes) / 60) * 10) / 10,
      },
      period: {
        view,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}