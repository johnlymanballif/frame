import { getCurrentUser, hasManagerAccess } from "@/lib/authz";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectReports } from "@/components/reports/project-reports";
import { TimeSheetReports } from "@/components/reports/timesheet-reports";
import { 
  BarChart3,
  FileText,
  Clock,
  DollarSign,
  TrendingUp
} from "lucide-react";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  const isManager = hasManagerAccess(user.role);

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500">You need manager or owner permissions to view reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-gray-600">Analyze time tracking data and generate detailed reports</p>
      </div>

      <Tabs defaultValue="projects" className="space-y-6">
        <TabsList>
          <TabsTrigger value="projects">
            <BarChart3 className="w-4 h-4 mr-2" />
            Project Reports
          </TabsTrigger>
          <TabsTrigger value="timesheets">
            <FileText className="w-4 h-4 mr-2" />
            Timesheets
          </TabsTrigger>
          <TabsTrigger value="overview">
            <TrendingUp className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
          <ProjectReports />
        </TabsContent>

        <TabsContent value="timesheets" className="space-y-6">
          <TimeSheetReports />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours This Week</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">42.5</div>
                <p className="text-xs text-muted-foreground">
                  +20.1% from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">38.2</div>
                <p className="text-xs text-muted-foreground">
                  90% billable ratio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  +2 new this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">
                  All active this week
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quick Insights</CardTitle>
              <CardDescription>
                Key metrics and trends for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Most Productive Day</span>
                  <span className="font-medium">Thursday (8.2 hrs avg)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Top Project by Hours</span>
                  <span className="font-medium">Website Redesign (45.2 hrs)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Average Session Length</span>
                  <span className="font-medium">2.3 hours</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Billability Rate</span>
                  <span className="font-medium">89.7%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}