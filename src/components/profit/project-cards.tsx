"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ManagerOnly, useRoleAccess } from "@/components/auth/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Target, 
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3,
  Percent
} from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
  client?: {
    name: string;
  };
  budgetType?: "hours" | "amount";
  budgetValue?: number;
  burnHours: number;
  burnAmount?: number;
  remainingBudget?: number;
  totalRevenueCents?: number;
  totalCostCents?: number;
  grossMarginCents?: number;
  grossMarginPercent?: number;
  effectiveHourlyRate?: number;
  defaultBillRateCents?: number;
  budgetHealth: "Healthy" | "Tight" | "Over";
  budgetHealthOnly?: boolean;
  isRetainer: boolean;
  entryCount?: number;
}

interface ProfitabilityData {
  projects: Project[];
  summary: {
    totalProjects: number;
    healthyProjects: number;
    tightProjects: number;
    overBudgetProjects: number;
  };
}

export function ProjectCards() {
  const { data: session } = useSession();
  const { isManager, isOwner } = useRoleAccess();
  const [data, setData] = useState<ProfitabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [budgetType, setBudgetType] = useState<"hours" | "amount">("hours");
  const [budgetValue, setBudgetValue] = useState("");
  const [billRate, setBillRate] = useState("");

  useEffect(() => {
    if (session?.user) {
      loadProfitabilityData();
    }
  }, [session]);

  const loadProfitabilityData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/projects/profitability");
      if (response.ok) {
        const data = await response.json();
        setData(data);
      }
    } catch (error) {
      toast.error("Failed to load profitability data");
      console.error("Error loading profitability data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setBudgetType(project.budgetType || "hours");
    setBudgetValue(project.budgetValue?.toString() || "");
    setBillRate(project.defaultBillRateCents ? (project.defaultBillRateCents / 100).toString() : "");
  };

  const handleSaveProject = async () => {
    if (!editingProject) return;

    try {
      const response = await fetch(`/api/projects/${editingProject.id}/budget`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          budgetType,
          budgetValue: parseFloat(budgetValue) || 0,
          defaultBillRateCents: Math.round((parseFloat(billRate) || 0) * 100),
        }),
      });

      if (response.ok) {
        toast.success("Project settings updated");
        loadProfitabilityData();
        setEditingProject(null);
      } else {
        toast.error("Failed to update project settings");
      }
    } catch (error) {
      toast.error("Failed to update project settings");
      console.error("Error updating project:", error);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const getBudgetHealthColor = (health: string) => {
    switch (health) {
      case "Healthy": return "text-green-600";
      case "Tight": return "text-yellow-600";
      case "Over": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getBudgetHealthIcon = (health: string) => {
    switch (health) {
      case "Healthy": return <CheckCircle className="w-4 h-4" />;
      case "Tight": return <AlertTriangle className="w-4 h-4" />;
      case "Over": return <TrendingDown className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getBudgetHealthBadgeVariant = (health: string) => {
    switch (health) {
      case "Healthy": return "secondary";
      case "Tight": return "default";
      case "Over": return "destructive";
      default: return "outline";
    }
  };

  const renderProjectCard = (project: Project) => {
    const isManager = session?.user.role !== "member";

    return (
      <Card key={project.id} className="relative">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">
                {project.client?.name && (
                  <span className="text-sm text-gray-500">
                    {project.client.name} • 
                  </span>
                )}
                {project.name}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-2">
                <div className={`flex items-center space-x-1 ${getBudgetHealthColor(project.budgetHealth)}`}>
                  {getBudgetHealthIcon(project.budgetHealth)}
                  <Badge variant={getBudgetHealthBadgeVariant(project.budgetHealth)}>
                    {project.budgetHealth}
                  </Badge>
                </div>
                {project.isRetainer && (
                  <Badge variant="outline">Retainer</Badge>
                )}
              </div>
            </div>
            {isManager && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditProject(project)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Hours Burned */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">Hours Logged</span>
              </div>
              <span className="font-semibold">{project.burnHours}h</span>
            </div>

            {/* Budget Information - Manager only */}
            {isManager && !project.budgetHealthOnly && (
              <>
                {project.budgetType === "hours" && project.budgetValue && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-600">Budget</span>
                    </div>
                    <span className="font-semibold">
                      {project.budgetValue}h
                      {project.remainingBudget !== undefined && (
                        <span className={`ml-2 text-sm ${project.remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ({project.remainingBudget >= 0 ? "+" : ""}{Math.round(project.remainingBudget * 10) / 10}h)
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {project.budgetType === "amount" && project.budgetValue && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600">Budget</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(project.budgetValue)}
                      {project.remainingBudget !== undefined && (
                        <span className={`ml-2 text-sm ${project.remainingBudget >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ({project.remainingBudget >= 0 ? "+" : ""}{formatCurrency(project.remainingBudget)})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Revenue */}
                {project.totalRevenueCents !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600">Revenue</span>
                    </div>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(project.totalRevenueCents)}
                    </span>
                  </div>
                )}

                {/* Cost */}
                {project.totalCostCents !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-600">Cost</span>
                    </div>
                    <span className="font-semibold text-red-600">
                      {formatCurrency(project.totalCostCents)}
                    </span>
                  </div>
                )}

                {/* Gross Margin */}
                {project.grossMarginCents !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-600">Gross Margin</span>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${project.grossMarginCents >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(project.grossMarginCents)}
                      </div>
                      {project.grossMarginPercent !== undefined && (
                        <div className={`text-xs ${project.grossMarginPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                          ({project.grossMarginPercent >= 0 ? "+" : ""}{project.grossMarginPercent}%)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Effective Hourly Rate */}
                {project.effectiveHourlyRate !== undefined && project.burnHours > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Percent className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-600">EHR</span>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(project.effectiveHourlyRate)}/h
                    </span>
                  </div>
                )}

                {/* Entry Count */}
                {project.entryCount !== undefined && (
                  <div className="text-center pt-2 border-t">
                    <span className="text-xs text-gray-500">
                      {project.entryCount} time {project.entryCount === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Member view - simplified */}
            {project.budgetHealthOnly && (
              <div className="text-center pt-2 border-t">
                <p className="text-sm text-gray-600">
                  Project status information available to managers
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>Loading...</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Data Available</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {session?.user.role !== "member" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Projects</p>
                  <p className="text-lg font-semibold">{data.summary.totalProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Healthy</p>
                  <p className="text-lg font-semibold text-green-600">{data.summary.healthyProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Tight</p>
                  <p className="text-lg font-semibold text-yellow-600">{data.summary.tightProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">Over Budget</p>
                  <p className="text-lg font-semibold text-red-600">{data.summary.overBudgetProjects}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Project Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.projects.map(renderProjectCard)}
      </div>

      {data.projects.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-600">No Projects Found</p>
            <p className="text-gray-500">Create your first project to start tracking profitability.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project Budget & Rates</DialogTitle>
          </DialogHeader>
          {editingProject && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Project</label>
                <div className="text-sm text-gray-600">
                  {editingProject.client?.name && `${editingProject.client.name} • `}
                  {editingProject.name}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Budget Type</label>
                <Select value={budgetType} onValueChange={(value: "hours" | "amount") => setBudgetType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Fixed Hours</SelectItem>
                    <SelectItem value="amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">
                  Budget {budgetType === "hours" ? "Hours" : "Amount ($)"}
                </label>
                <Input
                  type="number"
                  min="0"
                  step={budgetType === "hours" ? "1" : "100"}
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  placeholder={budgetType === "hours" ? "e.g., 120" : "e.g., 15000"}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Default Bill Rate ($/hour)</label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={billRate}
                  onChange={(e) => setBillRate(e.target.value)}
                  placeholder="e.g., 125"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingProject(null)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveProject}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}