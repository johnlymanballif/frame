import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, timeEntries, users, projectUserRateOverrides, projectRoleRateOverrides } from "@/lib/db/schema";
import { eq, and, sum, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    // Get all active projects for the organization
    const projectsQuery = db.query.projects.findMany({
      where: and(
        eq(projects.orgId, session.user.orgId),
        eq(projects.status, "active"),
        projectId ? eq(projects.id, parseInt(projectId)) : undefined
      ),
      with: {
        client: true,
      },
      orderBy: (projects, { asc }) => [asc(projects.name)],
    });

    const projectsList = await projectsQuery;
    
    // Calculate profitability for each project
    const projectsWithProfitability = await Promise.all(
      projectsList.map(async (project) => {
        // Get all time entries for this project
        const entries = await db.query.timeEntries.findMany({
          where: and(
            eq(timeEntries.projectId, project.id),
            eq(timeEntries.orgId, session.user.orgId)
          ),
          with: {
            user: true,
            task: true,
          },
        });

        // Calculate burn hours and cost
        let burnHours = 0;
        let totalCostCents = 0;
        let totalRevenueCents = 0;

        for (const entry of entries) {
          if (entry.minutes) {
            const hours = entry.minutes / 60;
            burnHours += hours;

            // Calculate cost (using user's cost rate)
            if (entry.user.costRateCents) {
              totalCostCents += hours * entry.user.costRateCents;
            }

            // Calculate revenue (only for billable entries)
            if (entry.billable) {
              const billRate = await getBillRate(project.id, entry.userId, entry.user.role);
              totalRevenueCents += hours * billRate;
            }
          }
        }

        // Calculate remaining budget and margins
        let remainingBudget = 0;
        let budgetHealth: "Healthy" | "Tight" | "Over" = "Healthy";

        if (project.budgetType && project.budgetValue) {
          if (project.budgetType === "hours") {
            remainingBudget = project.budgetValue - burnHours;
            const budgetPercent = (remainingBudget / project.budgetValue) * 100;
            
            if (budgetPercent < 0) budgetHealth = "Over";
            else if (budgetPercent < 25) budgetHealth = "Tight";
            else budgetHealth = "Healthy";
          } else if (project.budgetType === "amount") {
            remainingBudget = project.budgetValue - totalRevenueCents;
            const budgetPercent = (remainingBudget / project.budgetValue) * 100;
            
            if (budgetPercent < 0) budgetHealth = "Over";
            else if (budgetPercent < 25) budgetHealth = "Tight";
            else budgetHealth = "Healthy";
          }
        }

        const grossMarginCents = totalRevenueCents - totalCostCents;
        const grossMarginPercent = totalRevenueCents > 0 
          ? (grossMarginCents / totalRevenueCents) * 100 
          : 0;

        // Calculate EHR (Effective Hourly Rate) - total revenue / total hours
        const effectiveHourlyRate = burnHours > 0 ? totalRevenueCents / burnHours : 0;

        // Return different data based on user role
        const baseData = {
          id: project.id,
          name: project.name,
          client: project.client,
          budgetType: project.budgetType,
          burnHours: Math.round(burnHours * 10) / 10,
          budgetHealth,
          isRetainer: project.isRetainer,
        };

        if (session.user.role === "member") {
          // Members only see limited information
          return {
            ...baseData,
            budgetHealthOnly: true,
          };
        } else {
          // Managers and owners see full financial data
          return {
            ...baseData,
            budgetValue: project.budgetValue,
            burnAmount: project.budgetType === "amount" ? totalRevenueCents : null,
            remainingBudget,
            totalRevenueCents,
            totalCostCents,
            grossMarginCents,
            grossMarginPercent: Math.round(grossMarginPercent * 10) / 10,
            effectiveHourlyRate: Math.round(effectiveHourlyRate),
            defaultBillRateCents: project.defaultBillRateCents,
            entryCount: entries.length,
          };
        }
      })
    );

    return NextResponse.json({
      projects: projectsWithProfitability,
      summary: {
        totalProjects: projectsWithProfitability.length,
        healthyProjects: projectsWithProfitability.filter(p => p.budgetHealth === "Healthy").length,
        tightProjects: projectsWithProfitability.filter(p => p.budgetHealth === "Tight").length,
        overBudgetProjects: projectsWithProfitability.filter(p => p.budgetHealth === "Over").length,
      },
    });
  } catch (error) {
    console.error("Error fetching project profitability:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to get the appropriate bill rate for a user on a project
async function getBillRate(projectId: number, userId: number, userRole: string): Promise<number> {
  // Check for user-specific override first
  const userOverride = await db.query.projectUserRateOverrides.findFirst({
    where: and(
      eq(projectUserRateOverrides.projectId, projectId),
      eq(projectUserRateOverrides.userId, userId)
    ),
  });

  if (userOverride) {
    return userOverride.billRateCents;
  }

  // Check for role-specific override
  const roleOverride = await db.query.projectRoleRateOverrides.findFirst({
    where: and(
      eq(projectRoleRateOverrides.projectId, projectId),
      eq(projectRoleRateOverrides.roleName, userRole)
    ),
  });

  if (roleOverride) {
    return roleOverride.billRateCents;
  }

  // Fall back to project default rate
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });

  return project?.defaultBillRateCents || 0;
}