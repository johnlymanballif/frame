"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, 
  Edit2, 
  Trash2, 
  Scissors, 
  RotateCcw 
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, subDays } from "date-fns";
import { MobileTimeEntry } from "./mobile-time-entry";

interface TimeEntry {
  id: number;
  startedAt: string;
  endedAt: string | null;
  minutes: number | null;
  note: string | null;
  billable: boolean;
  project: {
    id: number;
    name: string;
    client?: {
      name: string;
    };
  };
  task?: {
    id: number;
    name: string;
  };
}

interface TimeEntriesData {
  entries: TimeEntry[];
  totals: {
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
  };
  period: {
    view: string;
    startDate: string;
    endDate: string;
  };
}

export function TimeEntries() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState("today");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<TimeEntriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  // Load data when tab or date changes
  useEffect(() => {
    if (session?.user) {
      loadEntries();
      loadProjects();
    }
  }, [session, activeTab, currentDate]);

  // Load tasks when editing entry project changes
  useEffect(() => {
    if (editingEntry?.project.id) {
      loadTasks(editingEntry.project.id);
    }
  }, [editingEntry?.project.id]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: activeTab,
        date: currentDate.toISOString(),
      });

      const response = await fetch(`/api/time/entries?${params}`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      toast.error("Failed to load time entries");
      console.error("Error loading entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const projects = await response.json();
        setProjects(projects);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const loadTasks = async (projectId: number) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const tasks = await response.json();
        setTasks(tasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const handleUpdateEntry = async (entryId: number, updates: any) => {
    try {
      const response = await fetch(`/api/time/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success("Entry updated");
        loadEntries();
        setEditingEntry(null);
      } else {
        toast.error("Failed to update entry");
      }
    } catch (error) {
      toast.error("Failed to update entry");
      console.error("Error updating entry:", error);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    try {
      const response = await fetch(`/api/time/entries/${entryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Entry deleted");
        loadEntries();
      } else {
        toast.error("Failed to delete entry");
      }
    } catch (error) {
      toast.error("Failed to delete entry");
      console.error("Error deleting entry:", error);
    }
  };

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "0:00";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}:${mins.toString().padStart(2, "0")}`;
  };

  const navigateDate = (direction: "prev" | "next") => {
    const days = activeTab === "week" ? 7 : 1;
    setCurrentDate(prev => 
      direction === "next" 
        ? addDays(prev, days)
        : subDays(prev, days)
    );
  };

  const renderTimeEntry = (entry: TimeEntry) => (
    <TableRow key={entry.id}>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {entry.project.client?.name && `${entry.project.client.name} - `}
            {entry.project.name}
          </span>
          {entry.task && (
            <span className="text-sm text-gray-600">{entry.task.name}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col text-sm">
          <span>{format(new Date(entry.startedAt), "HH:mm")}</span>
          {entry.endedAt && (
            <span className="text-gray-600">
              - {format(new Date(entry.endedAt), "HH:mm")}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4" />
          <span>{formatTime(entry.minutes)}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={entry.billable ? "default" : "secondary"}>
          {entry.billable ? "Billable" : "Non-billable"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-sm text-gray-600">
          {entry.note || "No note"}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingEntry(entry)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteEntry(entry.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );

  const renderEditDialog = () => (
    <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>
        {editingEntry && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Project</label>
              <Select
                value={editingEntry.project.id.toString()}
                onValueChange={(value) => {
                  const project = projects.find(p => p.id === parseInt(value));
                  if (project) {
                    setEditingEntry({
                      ...editingEntry,
                      project,
                      task: undefined, // Clear task when project changes
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.client?.name && `${project.client.name} - `}
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Task (optional)</label>
              <Select
                value={editingEntry.task?.id?.toString() || "no-task"}
                onValueChange={(value) => {
                  const task = tasks.find(t => t.id === parseInt(value));
                  setEditingEntry({
                    ...editingEntry,
                    task: value && value !== "no-task" ? task : undefined,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-task">No task</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>
                      {task.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input
                type="number"
                min="1"
                value={editingEntry.minutes || 0}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  minutes: parseInt(e.target.value) || 0,
                })}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Note</label>
              <Textarea
                value={editingEntry.note || ""}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  note: e.target.value,
                })}
                placeholder="What did you work on?"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editingEntry.billable}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  billable: e.target.checked,
                })}
              />
              <label className="text-sm">Billable</label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setEditingEntry(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdateEntry(editingEntry.id, {
                  projectId: editingEntry.project.id,
                  taskId: editingEntry.task?.id || null,
                  minutes: editingEntry.minutes,
                  note: editingEntry.note,
                  billable: editingEntry.billable,
                })}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      {/* Mobile Time Entry - Only show on mobile */}
      <div className="lg:hidden">
        <MobileTimeEntry 
          projects={projects} 
          onEntryAdded={loadEntries}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Today&apos;s Entries</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate("prev")}
                  >
                    ←
                  </Button>
                  <span className="text-sm font-medium">
                    {format(currentDate, "MMM dd, yyyy")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate("next")}
                  >
                    →
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Today
                  </Button>
                </div>
              </div>
              {data && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">{data.totals.totalHours}h</span>
                    <span className="text-gray-600 ml-1">total</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-600">{data.totals.billableHours}h</span>
                    <span className="text-gray-600 ml-1">billable</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{data.totals.nonBillableHours}h</span>
                    <span className="text-gray-600 ml-1">non-billable</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Loading entries...</p>
              ) : data?.entries.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map(renderTimeEntry)}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500">No time entries for this day.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>This Week</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate("prev")}
                  >
                    ←
                  </Button>
                  <span className="text-sm font-medium">
                    Week of {format(currentDate, "MMM dd, yyyy")}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateDate("next")}
                  >
                    →
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    This Week
                  </Button>
                </div>
              </div>
              {data && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">{data.totals.totalHours}h</span>
                    <span className="text-gray-600 ml-1">total</span>
                  </div>
                  <div>
                    <span className="font-medium text-green-600">{data.totals.billableHours}h</span>
                    <span className="text-gray-600 ml-1">billable</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">{data.totals.nonBillableHours}h</span>
                    <span className="text-gray-600 ml-1">non-billable</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Loading entries...</p>
              ) : data?.entries.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map(renderTimeEntry)}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500">No time entries for this week.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {renderEditDialog()}
    </div>
  );
}