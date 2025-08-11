import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { format } from "date-fns";
import Papa from "papaparse";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const exportFormat = url.searchParams.get("format") || "csv"; // csv or json
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");
    const projectId = url.searchParams.get("projectId");
    const userId = url.searchParams.get("userId");

    // Build query conditions
    let whereConditions = [eq(timeEntries.orgId, session.user.orgId)];

    if (startDate) {
      whereConditions.push(gte(timeEntries.startedAt, new Date(startDate)));
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // End of day
      whereConditions.push(lte(timeEntries.startedAt, endDateObj));
    }

    if (projectId && projectId !== "all") {
      whereConditions.push(eq(timeEntries.projectId, parseInt(projectId)));
    }

    if (userId && userId !== "all") {
      whereConditions.push(eq(timeEntries.userId, parseInt(userId)));
    }

    // Fetch time entries with related data
    const entries = await db.query.timeEntries.findMany({
      where: and(...whereConditions),
      with: {
        user: {
          columns: { name: true, email: true }
        },
        project: {
          columns: { name: true },
          with: {
            client: {
              columns: { name: true }
            }
          }
        },
        task: {
          columns: { name: true }
        }
      },
      orderBy: [desc(timeEntries.startedAt)],
      limit: 10000, // Reasonable limit for exports
    });

    // Format data for export
    const exportData = entries.map((entry) => {
      const duration = entry.minutes || 0;
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      const formattedDuration = `${hours}:${minutes.toString().padStart(2, '0')}`;

      return {
        Date: format(entry.startedAt, "yyyy-MM-dd"),
        "Start Time": format(entry.startedAt, "HH:mm"),
        "End Time": entry.endedAt ? format(entry.endedAt, "HH:mm") : "",
        Duration: formattedDuration,
        "Duration (Minutes)": duration,
        "Duration (Hours)": Number((duration / 60).toFixed(2)),
        User: entry.user.name,
        "User Email": entry.user.email,
        Client: entry.project.client?.name || "",
        Project: entry.project.name,
        Task: entry.task?.name || "",
        Description: entry.note || "",
        Billable: entry.billable ? "Yes" : "No",
        "Created At": format(entry.createdAt, "yyyy-MM-dd HH:mm:ss"),
      };
    });

    // Generate filename
    const dateRange = startDate && endDate 
      ? `${format(new Date(startDate), "yyyy-MM-dd")}_to_${format(new Date(endDate), "yyyy-MM-dd")}`
      : format(new Date(), "yyyy-MM-dd");
    
    const filename = `time-entries-${dateRange}`;

    if (exportFormat === "json") {
      return NextResponse.json(exportData, {
        headers: {
          "Content-Disposition": `attachment; filename="${filename}.json"`,
          "Content-Type": "application/json",
        },
      });
    }

    // Default to CSV
    const csv = Papa.unparse(exportData, {
      header: true,
      skipEmptyLines: true,
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
      },
    });

  } catch (error) {
    console.error("Error exporting time entries:", error);
    return NextResponse.json({ 
      error: "Failed to export time entries" 
    }, { status: 500 });
  }
}