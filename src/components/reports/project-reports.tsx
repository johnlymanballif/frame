"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  RefreshCw, 
  BarChart3, 
  Clock, 
  DollarSign,
  Calendar,
  Users,
  Filter
} from "lucide-react";
import { format } from "date-fns";

interface ProjectSummary {
  project: {
    id: number;
    name: string;
    client?: {
      name: string;
    };
  };
  totalHours: number;
  billableHours: number;
  nonBillableHours: number;
  entryCount: number;
  users: string[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface ReportData {
  summaries: ProjectSummary[];
  totals: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    entryCount: number;
  };
  entries: any[];
  metadata: {
    totalEntries: number;
    dateRange: {
      start: Date;
      end: Date;
    } | null;
    groupBy: string;
    filters: any;
  };
}

export function ProjectReports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    projectId: "",
    userId: "",
    groupBy: "project",
  });

  // Load initial data
  useEffect(() => {
    loadProjects();
    loadUsers();
    // Set default date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    setFilters(prev => ({
      ...prev,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    }));
  }, []);

  // Load report when filters change
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadReportData();
    }
  }, [filters]);

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/rates/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const response = await fetch(`/api/reports/projects?${params}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Error loading report data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportToCSV = () => {
    if (!reportData?.summaries) return;
    
    const csvData = reportData.summaries.map(summary => ({
      Project: summary.project.name,
      Client: summary.project.client?.name || "",
      "Total Hours": summary.totalHours,
      "Billable Hours": summary.billableHours,
      "Non-Billable Hours": summary.nonBillableHours,
      "Entry Count": summary.entryCount,
      "Team Members": summary.users.join(", "),
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Report Filters</span>
          </CardTitle>
          <CardDescription>
            Configure the date range and grouping for your project reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="projectFilter">Project</Label>
              <Select
                value={filters.projectId}
                onValueChange={(value) => handleFilterChange("projectId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project: any) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userFilter">Team Member</Label>
              <Select
                value={filters.userId}
                onValueChange={(value) => handleFilterChange("userId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Members" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="groupBy">Group By</Label>
              <Select
                value={filters.groupBy}
                onValueChange={(value) => handleFilterChange("groupBy", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="user">Team Member</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            <Button onClick={loadReportData} disabled={loading}>
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-2" />
              )}
              {loading ? "Loading..." : "Generate Report"}
            </Button>
            {reportData && (
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totals.totalHours}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.totals.entryCount} entries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totals.billableHours}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.totals.totalHours > 0 
                    ? Math.round((reportData.totals.billableHours / reportData.totals.totalHours) * 100)
                    : 0}% billable
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non-Billable</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totals.nonBillableHours}</div>
                <p className="text-xs text-muted-foreground">
                  Internal & overhead time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Date Range</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {reportData.metadata.dateRange 
                    ? `${Math.ceil((new Date(reportData.metadata.dateRange.end).getTime() - new Date(reportData.metadata.dateRange.start).getTime()) / (1000 * 60 * 60 * 24))} days`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Report period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {filters.groupBy === "project" ? "Project Summary" : 
                 filters.groupBy === "user" ? "Team Member Summary" : "Daily Summary"}
              </CardTitle>
              <CardDescription>
                Detailed breakdown by {filters.groupBy}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {filters.groupBy === "project" ? "Project" : 
                         filters.groupBy === "user" ? "Team Member" : "Date"}
                      </TableHead>
                      {filters.groupBy === "project" && <TableHead>Client</TableHead>}
                      <TableHead className="text-right">Total Hours</TableHead>
                      <TableHead className="text-right">Billable</TableHead>
                      <TableHead className="text-right">Non-Billable</TableHead>
                      <TableHead className="text-right">Entries</TableHead>
                      <TableHead>
                        {filters.groupBy === "project" ? "Team Members" : "Projects"}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.summaries.map((summary: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {filters.groupBy === "project" ? summary.project?.name :
                           filters.groupBy === "user" ? summary.user?.name :
                           format(new Date(summary.date), "MMM dd, yyyy")}
                        </TableCell>
                        {filters.groupBy === "project" && (
                          <TableCell>
                            {summary.project?.client?.name ? (
                              <Badge variant="secondary">{summary.project.client.name}</Badge>
                            ) : (
                              <span className="text-gray-400">No client</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-medium">
                          {summary.totalHours}h
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {summary.billableHours}h
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {summary.nonBillableHours}h
                        </TableCell>
                        <TableCell className="text-right">
                          {summary.entryCount}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(filters.groupBy === "project" ? summary.users : summary.projects)
                              ?.slice(0, 3)
                              ?.map((item: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                            {(filters.groupBy === "project" ? summary.users?.length : summary.projects?.length) > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{(filters.groupBy === "project" ? summary.users?.length : summary.projects?.length) - 3} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!reportData && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Generated</h3>
              <p className="text-gray-500">Select your filters and click "Generate Report" to view project analytics.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
