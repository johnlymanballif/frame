import { getCurrentUser, hasManagerAccess } from "@/lib/authz";
import { db } from "@/lib/db";
import { TimeEntriesExport } from "@/components/export/time-entries-export";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

export default async function ExportPage() {
  const user = await getCurrentUser();
  const isManager = hasManagerAccess(user.role);

  // Get projects and users for export filters
  const projects = await db.query.projects.findMany({
    where: (projects, { eq }) => eq(projects.orgId, user.orgId),
    columns: { id: true, name: true },
    orderBy: (projects, { asc }) => [asc(projects.name)],
  });

  const users = isManager
    ? await db.query.users.findMany({
        where: (users, { eq }) => eq(users.orgId, user.orgId),
        columns: { id: true, name: true, email: true },
        orderBy: (users, { asc }) => [asc(users.name)],
      })
    : [{ id: user.id, name: user.name, email: user.email }];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data Export</h1>
        <p className="text-gray-600">
          Export your time tracking data for reporting, backup, and analysis
        </p>
      </div>

      <Tabs defaultValue="time-entries" className="space-y-6">
        <TabsList>
          <TabsTrigger value="time-entries">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Time Entries
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="time-entries">
          <TimeEntriesExport projects={projects} users={users} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Project Summary Report</span>
                </CardTitle>
                <CardDescription>
                  Export detailed project summaries with time breakdown by team member
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Project Reports</h3>
                  <p className="text-sm">
                    Generate comprehensive project reports with time allocation, budgets, and team performance
                  </p>
                  <div className="mt-4 text-xs text-gray-400">
                    Coming soon - Advanced reporting features
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>Timesheet Reports</span>
                </CardTitle>
                <CardDescription>
                  Export formatted timesheets ready for client billing and payroll
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Timesheet Export</h3>
                  <p className="text-sm">
                    Generate professional timesheets with customizable formatting for billing and payroll
                  </p>
                  <div className="mt-4 text-xs text-gray-400">
                    Coming soon - Timesheet templates and formatting options
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Profitability Reports</span>
                </CardTitle>
                <CardDescription>
                  Export detailed profitability analysis for projects and clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500">
                  <Download className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">Financial Reports</h3>
                  <p className="text-sm">
                    Analyze project profitability with cost tracking, billing rates, and margin analysis
                  </p>
                  <div className="mt-4 text-xs text-gray-400">
                    {isManager
                      ? "Coming soon - Advanced financial reporting"
                      : "Manager access required for financial reports"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}