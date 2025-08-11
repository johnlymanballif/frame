"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  RefreshCw, 
  FileText, 
  Clock, 
  Calendar,
  User,
  Filter
} from "lucide-react";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

interface TimeEntry {
  id: number;
  startedAt: string;
  endedAt: string;
  minutes: number;
  hours: number;
  note: string;
  billable: boolean;
  project: {
    id: number;
    name: string;
    client?: string;
  };
  user: {
    id: number;
    name: string;
  };
  task?: {
    id: number;
    name: string;
  };
}

interface TimesheetData {
  entries: TimeEntry[];
  totals: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    entryCount: number;
  };
  metadata: {
    totalEntries: number;
    dateRange: {
      start: string;
      end: string;
    } | null;
    filters: Record<string, string>;
  };
}

export function TimeSheetReports() {
  const [timesheetData, setTimesheetData] = useState<TimesheetData | null>(null);
  const [projects, setProjects] = useState<Array<{ id: number; name: string }>>([]);
  const [users, setUsers] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"detailed" | "weekly" | "daily">("detailed");
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    projectId: "",
    userId: "",
  });

  // Load initial data
  useEffect(() => {
    loadProjects();
    loadUsers();
    // Set default date range (current week)
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
    
    setFilters(prev => ({
      ...prev,
      startDate: format(weekStart, "yyyy-MM-dd"),
      endDate: format(weekEnd, "yyyy-MM-dd"),
    }));
  }, []);

  // Load timesheet when filters change
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadTimesheetData();
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

  const loadTimesheetData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      
      // Always group by date for timesheet view
      params.append("groupBy", "date");

      const response = await fetch(`/api/reports/projects?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTimesheetData(data);
      }
    } catch (error) {
      console.error("Error loading timesheet data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const exportTimesheet = () => {
    if (!timesheetData?.entries) return;
    
    const csvData = timesheetData.entries.map(entry => ({
      Date: format(parseISO(entry.startedAt), "yyyy-MM-dd"),
      "Start Time": format(parseISO(entry.startedAt), "HH:mm"),
      "End Time": entry.endedAt ? format(parseISO(entry.endedAt), "HH:mm") : "",
      Duration: `${entry.hours}h`,
      Project: entry.project.name,
      Client: entry.project.client || "",
      Task: entry.task?.name || "",
      Description: entry.note || "",
      Billable: entry.billable ? "Yes" : "No",
      "Team Member": entry.user.name,
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheet-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getWeeklyView = () => {
    if (!timesheetData?.entries) return null;

    // Group entries by user and date
    const userWeeks = new Map();
    
    timesheetData.entries.forEach(entry => {
      const userId = entry.user.id;
      const date = format(parseISO(entry.startedAt), "yyyy-MM-dd");
      
      if (!userWeeks.has(userId)) {
        userWeeks.set(userId, {
          user: entry.user,
          dailyHours: new Map(),
          totalHours: 0,
        });
      }
      
      const userWeek = userWeeks.get(userId);
      const existingHours = userWeek.dailyHours.get(date) || 0;
      userWeek.dailyHours.set(date, existingHours + entry.hours);
      userWeek.totalHours += entry.hours;
    });

    // Generate week days
    const startDate = parseISO(filters.startDate);
    const endDate = parseISO(filters.endDate);
    const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

    return { userWeeks: Array.from(userWeeks.values()), weekDays };
  };

  const weeklyData = getWeeklyView();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-5 h-5" />
            <span>Timesheet Filters</span>
          </CardTitle>
          <CardDescription>
            Generate detailed timesheets for payroll and client billing
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
                  <SelectItem value="">All Projects</SelectItem>
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
                  <SelectItem value="">All Members</SelectItem>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="viewMode">View Mode</Label>
              <Select
                value={viewMode}
                onValueChange={(value: any) => setViewMode(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="detailed">Detailed Entries</SelectItem>
                  <SelectItem value="weekly">Weekly Summary</SelectItem>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mt-4">
            <Button onClick={loadTimesheetData} disabled={loading}>
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              {loading ? "Loading..." : "Generate Timesheet"}
            </Button>
            {timesheetData && (
              <Button variant="outline" onClick={exportTimesheet}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timesheet Results */}
      {timesheetData && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{timesheetData.totals.totalHours}</div>
                <p className="text-xs text-muted-foreground">
                  {timesheetData.totals.entryCount} entries
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Billable Hours</CardTitle>
                <Clock className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {timesheetData.totals.billableHours}
                </div>
                <p className="text-xs text-muted-foreground">
                  {timesheetData.totals.totalHours > 0 
                    ? Math.round((timesheetData.totals.billableHours / timesheetData.totals.totalHours) * 100)
                    : 0}% billable
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Non-Billable</CardTitle>
                <Clock className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {timesheetData.totals.nonBillableHours}
                </div>
                <p className="text-xs text-muted-foreground">
                  Internal time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Period</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {format(parseISO(filters.startDate), "MMM dd")} - {format(parseISO(filters.endDate), "MMM dd")}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.ceil((parseISO(filters.endDate).getTime() - parseISO(filters.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timesheet Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {viewMode === "detailed" ? "Detailed Timesheet" : 
                 viewMode === "weekly" ? "Weekly Summary" : "Daily Summary"}
              </CardTitle>
              <CardDescription>
                {viewMode === "detailed" ? "Complete time entry details" :
                 viewMode === "weekly" ? "Hours worked by team member and day" : "Daily hour summaries"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {viewMode === "detailed" && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Team Member</TableHead>
                        <TableHead>Billable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timesheetData.entries.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            {format(parseISO(entry.startedAt), "MMM dd")}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {format(parseISO(entry.startedAt), "HH:mm")} - {" "}
                            {entry.endedAt ? format(parseISO(entry.endedAt), "HH:mm") : "—"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.hours}h
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.project.name}</div>
                              {entry.project.client && (
                                <div className="text-xs text-gray-500">{entry.project.client}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {entry.task ? (
                              <Badge variant="outline">{entry.task.name}</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={entry.note}>
                              {entry.note || <span className="text-gray-400">No description</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{entry.user.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={entry.billable ? "default" : "secondary"}>
                              {entry.billable ? "Billable" : "Non-billable"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {viewMode === "weekly" && weeklyData && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Team Member</TableHead>
                        {weeklyData.weekDays.map((day) => (
                          <TableHead key={day.toISOString()} className="text-center">
                            {format(day, "EEE dd")}
                          </TableHead>
                        ))}
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {weeklyData.userWeeks.map((userWeek: any) => (
                        <TableRow key={userWeek.user.id}>
                          <TableCell className="font-medium">
                            {userWeek.user.name}
                          </TableCell>
                          {weeklyData.weekDays.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const hours = userWeek.dailyHours.get(dateKey) || 0;
                            return (
                              <TableCell key={day.toISOString()} className="text-center">
                                {hours > 0 ? `${hours}h` : "—"}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right font-medium">
                            {userWeek.totalHours}h
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!timesheetData && !loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Timesheet Generated</h3>
              <p className="text-gray-500">Select your filters and click "Generate Timesheet" to view detailed time entries.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}