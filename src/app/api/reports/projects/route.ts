import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasManagerAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { timeEntries, projects, users, tasks } from "@/lib/db/schema";
import { eq, and, gte, lte, sql, isNull, desc } from "drizzle-orm";
import { format } from "date-fns";

interface ProjectReportQuery {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  userId?: string;
  groupBy?: 'project' | 'user' | 'date';
}

// GET /api/reports/projects - Get project reports with time summaries
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!hasManagerAccess(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const projectId = searchParams.get("projectId");
    const userId = searchParams.get("userId");
    const groupBy = searchParams.get("groupBy") || "project";

    // Build where conditions
    const whereConditions = [eq(timeEntries.orgId, user.orgId)];

    if (startDate) {
      whereConditions.push(gte(timeEntries.startedAt, new Date(startDate)));
    }

    if (endDate) {
      whereConditions.push(lte(timeEntries.startedAt, new Date(endDate)));
    }

    if (projectId) {
      whereConditions.push(eq(timeEntries.projectId, parseInt(projectId)));
    }

    if (userId) {
      whereConditions.push(eq(timeEntries.userId, parseInt(userId)));
    }

    // Only include completed entries (with endedAt)
    whereConditions.push(sql`${timeEntries.endedAt} IS NOT NULL`);

    // Get detailed time entries
    const entries = await db.query.timeEntries.findMany({
      where: and(...whereConditions),
      with: {
        project: {
          with: {
            client: true,
          },
        },
        user: true,
        task: true,
      },
      orderBy: [desc(timeEntries.startedAt)],
    });

    // Calculate summaries based on groupBy parameter
    let summaries: any[] = [];

    if (groupBy === "project") {
      const projectSummaries = new Map();

      entries.forEach((entry) => {
        const key = entry.project.id;
        if (!projectSummaries.has(key)) {
          projectSummaries.set(key, {
            project: entry.project,
            totalMinutes: 0,
            billableMinutes: 0,
            nonBillableMinutes: 0,
            entryCount: 0,
            users: new Set(),
            dateRange: {
              start: entry.startedAt,
              end: entry.startedAt,
            },
          });
        }

        const summary = projectSummaries.get(key);
        const minutes = entry.minutes || 0;
        
        summary.totalMinutes += minutes;
        summary.entryCount += 1;
        summary.users.add(entry.user.name);
        
        if (entry.billable) {
          summary.billableMinutes += minutes;
        } else {
          summary.nonBillableMinutes += minutes;
        }

        // Update date range
        if (entry.startedAt < summary.dateRange.start) {
          summary.dateRange.start = entry.startedAt;
        }
        if (entry.startedAt > summary.dateRange.end) {
          summary.dateRange.end = entry.startedAt;
        }
      });

      summaries = Array.from(projectSummaries.values()).map(summary => ({
        ...summary,
        users: Array.from(summary.users),
        totalHours: Math.round((summary.totalMinutes / 60) * 100) / 100,
        billableHours: Math.round((summary.billableMinutes / 60) * 100) / 100,
        nonBillableHours: Math.round((summary.nonBillableMinutes / 60) * 100) / 100,
      }));

    } else if (groupBy === "user") {
      const userSummaries = new Map();

      entries.forEach((entry) => {
        const key = entry.user.id;
        if (!userSummaries.has(key)) {
          userSummaries.set(key, {
            user: entry.user,
            totalMinutes: 0,
            billableMinutes: 0,
            nonBillableMinutes: 0,
            entryCount: 0,
            projects: new Set(),
            dateRange: {
              start: entry.startedAt,
              end: entry.startedAt,
            },
          });
        }

        const summary = userSummaries.get(key);
        const minutes = entry.minutes || 0;
        
        summary.totalMinutes += minutes;
        summary.entryCount += 1;
        summary.projects.add(entry.project.name);
        
        if (entry.billable) {
          summary.billableMinutes += minutes;
        } else {
          summary.nonBillableMinutes += minutes;
        }

        // Update date range
        if (entry.startedAt < summary.dateRange.start) {
          summary.dateRange.start = entry.startedAt;
        }
        if (entry.startedAt > summary.dateRange.end) {
          summary.dateRange.end = entry.startedAt;
        }
      });

      summaries = Array.from(userSummaries.values()).map(summary => ({
        ...summary,
        projects: Array.from(summary.projects),
        totalHours: Math.round((summary.totalMinutes / 60) * 100) / 100,
        billableHours: Math.round((summary.billableMinutes / 60) * 100) / 100,
        nonBillableHours: Math.round((summary.nonBillableMinutes / 60) * 100) / 100,
      }));

    } else if (groupBy === "date") {
      const dateSummaries = new Map();

      entries.forEach((entry) => {
        const dateKey = format(new Date(entry.startedAt), "yyyy-MM-dd");
        if (!dateSummaries.has(dateKey)) {
          dateSummaries.set(dateKey, {
            date: dateKey,
            totalMinutes: 0,
            billableMinutes: 0,
            nonBillableMinutes: 0,
            entryCount: 0,
            projects: new Set(),
            users: new Set(),
          });
        }

        const summary = dateSummaries.get(dateKey);
        const minutes = entry.minutes || 0;
        
        summary.totalMinutes += minutes;
        summary.entryCount += 1;
        summary.projects.add(entry.project.name);
        summary.users.add(entry.user.name);
        
        if (entry.billable) {
          summary.billableMinutes += minutes;
        } else {
          summary.nonBillableMinutes += minutes;
        }
      });

      summaries = Array.from(dateSummaries.values())
        .map(summary => ({
          ...summary,
          projects: Array.from(summary.projects),
          users: Array.from(summary.users),
          totalHours: Math.round((summary.totalMinutes / 60) * 100) / 100,
          billableHours: Math.round((summary.billableMinutes / 60) * 100) / 100,
          nonBillableHours: Math.round((summary.nonBillableMinutes / 60) * 100) / 100,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    // Calculate overall totals
    const totals = entries.reduce((acc, entry) => {
      const minutes = entry.minutes || 0;
      acc.totalMinutes += minutes;
      acc.entryCount += 1;
      
      if (entry.billable) {
        acc.billableMinutes += minutes;
      } else {
        acc.nonBillableMinutes += minutes;
      }
      
      return acc;
    }, {
      totalMinutes: 0,
      billableMinutes: 0,
      nonBillableMinutes: 0,
      entryCount: 0,
    });

    const overallTotals = {
      ...totals,
      totalHours: Math.round((totals.totalMinutes / 60) * 100) / 100,
      billableHours: Math.round((totals.billableMinutes / 60) * 100) / 100,
      nonBillableHours: Math.round((totals.nonBillableMinutes / 60) * 100) / 100,
    };

    return NextResponse.json({
      summaries,
      totals: overallTotals,
      entries: entries.map(entry => ({
        id: entry.id,
        startedAt: entry.startedAt,
        endedAt: entry.endedAt,
        minutes: entry.minutes,
        hours: entry.minutes ? Math.round((entry.minutes / 60) * 100) / 100 : 0,
        note: entry.note,
        billable: entry.billable,
        project: {
          id: entry.project.id,
          name: entry.project.name,
          client: entry.project.client?.name,
        },
        user: {
          id: entry.user.id,
          name: entry.user.name,
        },
        task: entry.task ? {
          id: entry.task.id,
          name: entry.task.name,
        } : null,
      })),
      metadata: {
        totalEntries: entries.length,
        dateRange: entries.length > 0 ? {
          start: entries[entries.length - 1].startedAt,
          end: entries[0].startedAt,
        } : null,
        groupBy,
        filters: {
          startDate,
          endDate,
          projectId,
          userId,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching project reports:", error);
    return NextResponse.json(
      { error: "Failed to fetch project reports" },
      { status: 500 }
    );
  }
}