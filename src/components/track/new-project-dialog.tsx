"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated: (project: { id: number; name: string }) => void;
}

export function NewProjectDialog({ open, onOpenChange, onProjectCreated }: NewProjectDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    clientName: "",
    defaultBillRateCents: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
      };

      if (formData.clientName.trim()) {
        payload.clientName = formData.clientName.trim();
      }

      if (formData.defaultBillRateCents) {
        const rateCents = parseFloat(formData.defaultBillRateCents) * 100;
        if (!isNaN(rateCents) && rateCents >= 0) {
          payload.defaultBillRateCents = rateCents;
        }
      }

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create project");
      }

      const newProject = await response.json();
      
      // Reset form
      setFormData({
        name: "",
        clientName: "",
        defaultBillRateCents: "",
      });
      
      // Notify parent and close dialog
      onProjectCreated(newProject);
      onOpenChange(false);
      
      toast.success(`Project "${newProject.name}" created successfully`);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error(error.message || "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Create New Project</span>
          </DialogTitle>
          <DialogDescription>
            Add a new project to track time against. You can optionally specify a client and default billing rate.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              placeholder="Enter project name..."
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name (optional)</Label>
            <Input
              id="clientName"
              placeholder="Enter client name..."
              value={formData.clientName}
              onChange={(e) => handleInputChange("clientName", e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billRate">Default Billing Rate (optional)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <Input
                id="billRate"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="pl-8"
                value={formData.defaultBillRateCents}
                onChange={(e) => handleInputChange("defaultBillRateCents", e.target.value)}
                disabled={isLoading}
              />
            </div>
            <p className="text-xs text-gray-500">Per hour rate for billing calculations</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}