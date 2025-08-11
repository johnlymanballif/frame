"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronLeft, ChevronRight, Users, Calendar, Target, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { addWeeks, subWeeks, format } from "date-fns";

interface Project {
  id: number;
  name: string;
  client?: {
    name: string;
  };
}

interface Allocation {
  id: number;
  projectId: number;
  project: Project;
  plannedHours: number;
}

interface WeekData {
  weekStart: string;
  allocations: Allocation[];
  totalPlanned: number;
  capacity: number;
  variance: number;
  utilizationPercent: number;
}

interface UserGridData {
  user: {
    id: number;
    name: string;
    role: string;
  };
  capacity: number;
  weeks: WeekData[];
  totalPlanned: number;
  averageUtilization: number;
}

interface WeekHeader {
  weekStart: string;
  label: string;
  isCurrentWeek: boolean;
}

interface GridData {
  gridData: UserGridData[];
  weekHeaders: WeekHeader[];
  projects: Project[];
  period: {
    startDate: string;
    endDate: string;
    weeks: number;
  };
}

export function WeeklyGrid() {
  const { data: session } = useSession();
  const [data, setData] = useState<GridData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weeksToShow, setWeeksToShow] = useState(5);
  const [editingCell, setEditingCell] = useState<{
    userId: number;
    weekStart: string;
    projectId?: number;
  } | null>(null);
  const [allocationHours, setAllocationHours] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [editingInline, setEditingInline] = useState<{
    userId: number;
    weekStart: string;
    projectId: number;
    currentValue: string;
  } | null>(null);

  useEffect(() => {
    if (session?.user) {
      loadPlanningData();
    }
  }, [session, currentWeek, weeksToShow]);

  const loadPlanningData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startWeek: currentWeek.toISOString(),
        weeks: weeksToShow.toString(),
      });

      const response = await fetch(`/api/planning/allocations?${params}`);
      if (response.ok) {
        const data = await response.json();
        setData(data);
      } else if (response.status === 403) {
        toast.error("Access denied. Manager role required.");
      }
    } catch (error) {
      toast.error("Failed to load planning data");
      console.error("Error loading planning data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (userId: number, weekStart: string, projectId?: number) => {
    if (!data) return;
    
    setEditingCell({ userId, weekStart, projectId });
    
    if (projectId) {
      // Editing existing allocation
      const user = data.gridData.find(u => u.id === userId);
      const week = user?.weeks.find(w => w.weekStart === weekStart);
      const allocation = week?.allocations.find(a => a.projectId === projectId);
      
      if (allocation) {
        setAllocationHours(allocation.plannedHours.toString());
        setSelectedProject(projectId.toString());
      }
    } else {
      // Adding new allocation
      setAllocationHours("");
      setSelectedProject("");
    }
  };

  const handleSaveAllocation = async () => {
    if (!editingCell || !data) return;

    const hours = parseFloat(allocationHours) || 0;
    const projectId = parseInt(selectedProject);

    if (!projectId && hours > 0) {
      toast.error("Please select a project");
      return;
    }

    try {
      const response = await fetch("/api/planning/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editingCell.userId,
          projectId: editingCell.projectId || projectId,
          weekStartDate: editingCell.weekStart,
          plannedHours: hours,
        }),
      });

      if (response.ok) {
        toast.success(hours === 0 ? "Allocation removed" : "Allocation saved");
        loadPlanningData();
        setEditingCell(null);
        setAllocationHours("");
        setSelectedProject("");
      } else {
        toast.error("Failed to save allocation");
      }
    } catch (error) {
      toast.error("Failed to save allocation");
      console.error("Error saving allocation:", error);
    }
  };

  const navigateWeeks = (direction: "prev" | "next") => {
    setCurrentWeek(prev => 
      direction === "next" 
        ? addWeeks(prev, 1)
        : subWeeks(prev, 1)
    );
  };

  const getUtilizationColor = (percent: number) => {
    if (percent <= 80) return "text-green-600";
    if (percent <= 100) return "text-yellow-600";
    return "text-red-600";
  };

  const getUtilizationBadgeVariant = (percent: number) => {
    if (percent <= 80) return "secondary";
    if (percent <= 100) return "default";
    return "destructive";
  };

  const getCapacityBarColor = (percent: number) => {
    if (percent <= 80) return "bg-green-500";
    if (percent <= 100) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getCapacityBarBg = (percent: number) => {
    if (percent <= 80) return "bg-green-100";
    if (percent <= 100) return "bg-yellow-100";
    return "bg-red-100";
  };

  const hasConflict = (percent: number) => percent > 100;

  const quickAllocate = async (userId: number, weekStart: string, projectId: number, percentage: number) => {
    const user = data?.gridData.find(u => u.user.id === userId);
    const week = user?.weeks.find(w => w.weekStart === weekStart);
    if (!user || !week) return;

    const hours = Math.round((week.capacity * percentage / 100) * 2) / 2; // Round to nearest 0.5

    try {
      const response = await fetch("/api/planning/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          weekStartDate: weekStart,
          plannedHours: hours,
        }),
      });

      if (response.ok) {
        toast.success(`Allocated ${hours}h (${percentage}%)`);
        loadPlanningData();
      } else {
        toast.error("Failed to save allocation");
      }
    } catch (error) {
      toast.error("Failed to save allocation");
    }
  };

  const handleInlineEdit = async (userId: number, weekStart: string, projectId: number, newHours: string) => {
    const hours = parseFloat(newHours) || 0;

    try {
      const response = await fetch("/api/planning/allocations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          projectId,
          weekStartDate: weekStart,
          plannedHours: hours,
        }),
      });

      if (response.ok) {
        toast.success(hours === 0 ? "Allocation removed" : "Allocation updated");
        loadPlanningData();
        setEditingInline(null);
      } else {
        toast.error("Failed to save allocation");
      }
    } catch (error) {
      toast.error("Failed to save allocation");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading planning data...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Manager role required to view resource planning.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center justify-center space-x-2 lg:space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeeks("prev")}
            className="h-10 px-3 lg:h-9 lg:px-2"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium text-sm lg:text-base">
            Week of {format(currentWeek, "MMM dd, yyyy")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateWeeks("next")}
            className="h-10 px-3 lg:h-9 lg:px-2"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-center space-x-2">
          <Select
            value={weeksToShow.toString()}
            onValueChange={(value) => setWeeksToShow(parseInt(value))}
          >
            <SelectTrigger className="w-32 h-10 lg:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 weeks</SelectItem>
              <SelectItem value="5">5 weeks</SelectItem>
              <SelectItem value="8">8 weeks</SelectItem>
              <SelectItem value="12">12 weeks</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(new Date())}
            className="h-10 px-4 lg:h-9 lg:px-3"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Team Members</p>
                <p className="text-lg font-semibold">{data.gridData.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Planning Period</p>
                <p className="text-lg font-semibold">{weeksToShow} weeks</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Avg Utilization</p>
                <p className="text-lg font-semibold">
                  {Math.round(
                    data.gridData.reduce((sum, user) => sum + user.averageUtilization, 0) / 
                    data.gridData.length
                  )}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planning Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Allocation Grid</CardTitle>
          <p className="text-sm text-gray-600">
            Click on cells to add or edit allocations. Hours are shown per week.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48 sticky left-0 bg-white z-10 border-r">Team Member</TableHead>
                  <TableHead className="w-32">Capacity Bar</TableHead>
                  <TableHead className="w-24">Avg Util%</TableHead>
                  {data.weekHeaders.map((week) => (
                    <TableHead key={week.weekStart} className="text-center min-w-32">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-medium">{week.label}</span>
                        {week.isCurrentWeek && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Current
                          </Badge>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.gridData.map((userRow) => (
                  <TableRow key={userRow.user.id}>
                    <TableCell className="sticky left-0 bg-white z-10 border-r">
                      <div className="flex flex-col">
                        <span className="font-medium">{userRow.user.name}</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {userRow.user.role}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-full space-y-1">
                        <div className={`h-3 rounded-full ${getCapacityBarBg(userRow.averageUtilization)} overflow-hidden`}>
                          <div 
                            className={`h-full ${getCapacityBarColor(userRow.averageUtilization)} transition-all duration-300`}
                            style={{ width: `${Math.min(userRow.averageUtilization, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">{userRow.totalPlanned}h</span>
                          <span className={`font-semibold ${hasConflict(userRow.averageUtilization) ? 'text-red-600' : 'text-gray-900'}`}>
                            {userRow.averageUtilization}%
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Badge 
                          variant={getUtilizationBadgeVariant(userRow.averageUtilization)}
                          className="text-xs"
                        >
                          {userRow.averageUtilization}%
                        </Badge>
                        {hasConflict(userRow.averageUtilization) && (
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    {userRow.weeks.map((week) => (
                      <TableCell key={week.weekStart} className="p-3 min-w-44 lg:p-2 lg:min-w-40">
                        <div className="space-y-2">
                          {/* Capacity Bar */}
                          <div className="space-y-1">
                            <div className={`h-3 rounded-full ${getCapacityBarBg(week.utilizationPercent)} overflow-hidden lg:h-2`}>
                              <div 
                                className={`h-full ${getCapacityBarColor(week.utilizationPercent)} transition-all duration-300`}
                                style={{ width: `${Math.min(week.utilizationPercent, 100)}%` }}
                              />
                              {week.utilizationPercent > 100 && (
                                <div className="h-full bg-red-600 opacity-60" style={{ width: `${week.utilizationPercent - 100}%` }} />
                              )}
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">{week.totalPlanned}h / {week.capacity}h</span>
                              <div className="flex items-center space-x-1">
                                <span className={`text-xs font-semibold ${getUtilizationColor(week.utilizationPercent)}`}>
                                  {week.utilizationPercent}%
                                </span>
                                {hasConflict(week.utilizationPercent) && (
                                  <AlertTriangle className="w-3 h-3 text-red-500" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Existing allocations */}
                          {week.allocations.map((allocation) => (
                            <div
                              key={allocation.id}
                              className="flex items-center justify-between bg-blue-50 rounded px-3 py-2 cursor-pointer hover:bg-blue-100 group touch-manipulation lg:px-2 lg:py-1"
                            >
                              <span className="text-sm font-medium truncate flex-1 mr-2 lg:text-xs">
                                {allocation.project.name}
                              </span>
                              {editingInline?.userId === userRow.user.id && 
                               editingInline?.weekStart === week.weekStart && 
                               editingInline?.projectId === allocation.projectId ? (
                                <input
                                  type="number"
                                  className="w-14 text-sm font-mono text-right bg-white border rounded px-2 py-1 lg:w-12 lg:text-xs lg:px-1 lg:py-0"
                                  value={editingInline.currentValue}
                                  onChange={(e) => setEditingInline({...editingInline, currentValue: e.target.value})}
                                  onBlur={() => {
                                    handleInlineEdit(userRow.user.id, week.weekStart, allocation.projectId, editingInline.currentValue);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleInlineEdit(userRow.user.id, week.weekStart, allocation.projectId, editingInline.currentValue);
                                    } else if (e.key === 'Escape') {
                                      setEditingInline(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className="text-sm font-mono cursor-pointer hover:bg-white rounded px-2 py-1 touch-manipulation lg:text-xs lg:px-1 lg:py-0"
                                  onClick={() => setEditingInline({
                                    userId: userRow.user.id,
                                    weekStart: week.weekStart,
                                    projectId: allocation.projectId,
                                    currentValue: allocation.plannedHours.toString()
                                  })}
                                >
                                  {allocation.plannedHours}h
                                </span>
                              )}
                            </div>
                          ))}
                          
                          {/* Quick allocation presets */}
                          {week.allocations.length === 0 && (
                            <div className="space-y-1">
                              <div className="flex space-x-1">
                                {[25, 50, 75, 100].map(percent => {
                                  const hours = Math.round((week.capacity * percent / 100) * 2) / 2;
                                  return (
                                    <Button
                                      key={percent}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 h-8 text-xs px-1 touch-manipulation lg:h-6"
                                      onClick={() => {
                                        if (data?.projects.length > 0) {
                                          quickAllocate(userRow.user.id, week.weekStart, data.projects[0].id, percent);
                                        }
                                      }}
                                      disabled={!data?.projects.length}
                                    >
                                      {percent}%
                                      <span className="text-xs ml-1">({hours}h)</span>
                                    </Button>
                                  );
                                })}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-8 text-xs border-dashed border touch-manipulation lg:h-6"
                                onClick={() => handleCellClick(userRow.user.id, week.weekStart)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Custom
                              </Button>
                            </div>
                          )}

                          {/* Add more allocation when some exist */}
                          {week.allocations.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full h-5 text-xs border-dashed border opacity-50 hover:opacity-100"
                              onClick={() => handleCellClick(userRow.user.id, week.weekStart)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Allocation Dialog */}
      <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCell?.projectId ? "Edit" : "Add"} Allocation
            </DialogTitle>
          </DialogHeader>
          {editingCell && data && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Team Member</label>
                <div className="text-sm text-gray-600">
                  {data.gridData.find(u => u.user.id === editingCell.userId)?.user.name}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Week</label>
                <div className="text-sm text-gray-600">
                  Week of {format(new Date(editingCell.weekStart), "MMM dd, yyyy")}
                </div>
              </div>

              {!editingCell.projectId && (
                <div>
                  <label className="text-sm font-medium">Project</label>
                  <Select value={selectedProject} onValueChange={setSelectedProject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.projects.map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.client?.name && `${project.client.name} - `}
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Planned Hours</label>
                <Input
                  type="number"
                  min="0"
                  max="80"
                  step="0.5"
                  value={allocationHours}
                  onChange={(e) => setAllocationHours(e.target.value)}
                  placeholder="e.g., 8"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter 0 to remove this allocation
                </p>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingCell(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveAllocation}>
                  Save Allocation
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}