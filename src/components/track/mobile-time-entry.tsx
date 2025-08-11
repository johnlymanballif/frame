"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  Clock, 
  Calendar,
  CheckCircle2,
  XCircle,
  Zap,
  Timer
} from "lucide-react";
import { format, addMinutes, startOfToday, set } from "date-fns";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
  client?: {
    name: string;
  };
}

interface Task {
  id: number;
  name: string;
}

interface MobileTimeEntryProps {
  projects: Project[];
  onEntryAdded: () => void;
}

export function MobileTimeEntry({ projects, onEntryAdded }: MobileTimeEntryProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entryData, setEntryData] = useState({
    projectId: "",
    taskId: "",
    startTime: format(new Date(), "HH:mm"),
    duration: "",
    note: "",
    billable: true,
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const quickDurations = [
    { label: "15 min", minutes: 15, icon: "⚡" },
    { label: "30 min", minutes: 30, icon: "⏰" },
    { label: "1 hour", minutes: 60, icon: "🕐" },
    { label: "2 hours", minutes: 120, icon: "🕑" },
    { label: "4 hours", minutes: 240, icon: "🕓" },
    { label: "8 hours", minutes: 480, icon: "🕗" },
  ];

  const commonNotes = [
    "Meeting",
    "Development",
    "Code review",
    "Bug fixes",
    "Testing",
    "Documentation",
    "Client communication",
    "Planning",
  ];

  const handleSubmit = async () => {
    if (!entryData.projectId || !entryData.duration) {
      toast.error("Please select a project and duration");
      return;
    }

    setLoading(true);

    try {
      const [hours, minutes] = entryData.startTime.split(':');
      const startedAt = set(new Date(entryData.date), {
        hours: parseInt(hours),
        minutes: parseInt(minutes),
        seconds: 0,
        milliseconds: 0,
      });
      
      const durationMinutes = parseInt(entryData.duration);
      const endedAt = addMinutes(startedAt, durationMinutes);

      const payload = {
        projectId: parseInt(entryData.projectId),
        taskId: entryData.taskId ? parseInt(entryData.taskId) : undefined,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        note: entryData.note,
        billable: entryData.billable,
        minutes: durationMinutes,
      };

      const response = await fetch("/api/time/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create time entry");
      }

      // Reset form
      setEntryData({
        projectId: "",
        taskId: "",
        startTime: format(new Date(), "HH:mm"),
        duration: "",
        note: "",
        billable: true,
        date: format(new Date(), "yyyy-MM-dd"),
      });

      setShowDialog(false);
      onEntryAdded();
      toast.success("Time entry added successfully");
    } catch (error) {
      console.error("Error creating time entry:", error);
      toast.error("Failed to add time entry");
    } finally {
      setLoading(false);
    }
  };

  const setQuickDuration = (minutes: number) => {
    setEntryData(prev => ({ ...prev, duration: minutes.toString() }));
  };

  const setQuickNote = (note: string) => {
    setEntryData(prev => ({ 
      ...prev, 
      note: prev.note ? `${prev.note}, ${note}` : note 
    }));
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        className="w-full h-14 text-lg font-medium touch-manipulation"
        size="lg"
      >
        <Plus className="w-6 h-6 mr-2" />
        Add Time Entry
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Add Time Entry</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={entryData.date}
                  onChange={(e) => setEntryData(prev => ({ ...prev, date: e.target.value }))}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={entryData.startTime}
                  onChange={(e) => setEntryData(prev => ({ ...prev, startTime: e.target.value }))}
                  className="h-12"
                />
              </div>
            </div>

            {/* Project Selection */}
            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select
                value={entryData.projectId}
                onValueChange={(value) => setEntryData(prev => ({ ...prev, projectId: value, taskId: "" }))}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{project.name}</span>
                        {project.client && (
                          <span className="text-xs text-gray-500">{project.client.name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick Duration Presets */}
            <div className="space-y-2">
              <Label>Duration *</Label>
              <div className="grid grid-cols-3 gap-2">
                {quickDurations.map((preset) => (
                  <Button
                    key={preset.minutes}
                    variant={entryData.duration === preset.minutes.toString() ? "default" : "outline"}
                    size="sm"
                    className="h-12 text-sm font-medium touch-manipulation"
                    onClick={() => setQuickDuration(preset.minutes)}
                  >
                    <span className="mr-2">{preset.icon}</span>
                    <div className="flex flex-col">
                      <span>{preset.label}</span>
                    </div>
                  </Button>
                ))}
              </div>
              
              {/* Custom Duration */}
              <div className="space-y-2">
                <Label htmlFor="customDuration" className="text-sm">Or enter custom minutes:</Label>
                <Input
                  id="customDuration"
                  type="number"
                  placeholder="Minutes..."
                  value={entryData.duration}
                  onChange={(e) => setEntryData(prev => ({ ...prev, duration: e.target.value }))}
                  className="h-12"
                />
              </div>
            </div>

            {/* Billable Toggle */}
            <div className="space-y-2">
              <Label>Billable</Label>
              <div className="flex space-x-2">
                <Button
                  variant={entryData.billable ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-12 touch-manipulation"
                  onClick={() => setEntryData(prev => ({ ...prev, billable: true }))}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Billable
                </Button>
                <Button
                  variant={!entryData.billable ? "default" : "outline"}
                  size="sm"
                  className="flex-1 h-12 touch-manipulation"
                  onClick={() => setEntryData(prev => ({ ...prev, billable: false }))}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Non-billable
                </Button>
              </div>
            </div>

            {/* Quick Note Presets */}
            <div className="space-y-2">
              <Label>Quick Notes</Label>
              <div className="grid grid-cols-2 gap-2">
                {commonNotes.map((note) => (
                  <Button
                    key={note}
                    variant="outline"
                    size="sm"
                    className="h-10 text-sm touch-manipulation"
                    onClick={() => setQuickNote(note)}
                  >
                    {note}
                  </Button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="note">Description</Label>
              <Textarea
                id="note"
                placeholder="What did you work on?"
                value={entryData.note}
                onChange={(e) => setEntryData(prev => ({ ...prev, note: e.target.value }))}
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Summary */}
            {entryData.duration && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Entry Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span className="font-medium">{entryData.duration} minutes ({(parseInt(entryData.duration) / 60).toFixed(1)}h)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>End Time:</span>
                    <span className="font-medium">
                      {format(addMinutes(
                        set(new Date(), {
                          hours: parseInt(entryData.startTime.split(':')[0]),
                          minutes: parseInt(entryData.startTime.split(':')[1])
                        }),
                        parseInt(entryData.duration || "0")
                      ), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <Badge variant={entryData.billable ? "default" : "secondary"}>
                      {entryData.billable ? "Billable" : "Non-billable"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={loading}
              className="flex-1 h-12 touch-manipulation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !entryData.projectId || !entryData.duration}
              className="flex-1 h-12 touch-manipulation"
            >
              {loading ? (
                <>
                  <Timer className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Add Entry
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}