"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, Calendar as CalendarIcon, FileText, Database } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface TimeEntriesExportProps {
  projects: Project[];
  users: User[];
}

export function TimeEntriesExport({ projects, users }: TimeEntriesExportProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [selectedProject, setSelectedProject] = useState("all");
  const [selectedUser, setSelectedUser] = useState("all");
  const [exportFormat, setExportFormat] = useState("csv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "today":
        setStartDate(now);
        setEndDate(now);
        break;
      case "yesterday":
        const yesterday = subDays(now, 1);
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case "last7days":
        setStartDate(subDays(now, 7));
        setEndDate(now);
        break;
      case "last30days":
        setStartDate(subDays(now, 30));
        setEndDate(now);
        break;
      case "thisMonth":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(now), 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
    }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError("Please select start and end dates");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        format: exportFormat,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        projectId: selectedProject,
        userId: selectedUser,
      });

      const response = await fetch(`/api/export/time-entries?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `time-entries-${format(new Date(), "yyyy-MM-dd")}.${exportFormat}`;

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Time entries exported successfully as ${filename}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Export failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Export Time Entries</span>
        </CardTitle>
        <CardDescription>
          Export time tracking data as CSV or JSON files for reporting and backup
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Date Range Buttons */}
        <div>
          <Label className="text-sm font-medium">Quick Date Ranges</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "last7days", label: "Last 7 days" },
              { key: "last30days", label: "Last 30 days" },
              { key: "thisMonth", label: "This month" },
              { key: "lastMonth", label: "Last month" },
            ].map((range) => (
              <Button
                key={range.key}
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateRange(range.key)}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Date Range Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="endDate">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="projectFilter">Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="userFilter">User</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Export Format */}
        <div>
          <Label htmlFor="exportFormat">Export Format</Label>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>CSV (Comma-separated values)</span>
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4" />
                  <span>JSON (JavaScript Object Notation)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={loading || !startDate || !endDate}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Exporting...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export Time Entries</span>
            </div>
          )}
        </Button>

        {/* Export Info */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <h4 className="font-medium mb-2">Export includes:</h4>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Date, start time, end time, and duration</li>
            <li>User information and project details</li>
            <li>Task names and descriptions</li>
            <li>Billable status and timestamps</li>
            <li>Client information when available</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}