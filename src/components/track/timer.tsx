"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator } from "@/components/ui/select";
import { Play, Pause, Square, Plus } from "lucide-react";
import { toast } from "sonner";
import { NewProjectDialog } from "./new-project-dialog";

interface RunningEntry {
  id: number;
  projectId: number;
  taskId?: number;
  startedAt: Date;
  note: string;
  project: {
    name: string;
  };
  task?: {
    name: string;
  };
}

export function Timer() {
  const { data: session } = useSession();
  const [runningEntry, setRunningEntry] = useState<RunningEntry | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [note, setNote] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (runningEntry) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const started = new Date(runningEntry.startedAt).getTime();
        const elapsed = Math.floor((now - started) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [runningEntry]);

  // Load running entry on component mount
  useEffect(() => {
    loadRunningEntry();
    loadProjects();
  }, []);

  const loadRunningEntry = async () => {
    if (!session?.user) return;

    try {
      const response = await fetch("/api/time/running");
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setRunningEntry(data);
          setSelectedProject(data.projectId.toString());
          setSelectedTask(data.taskId?.toString() || "");
          setNote(data.note || "");
        }
      }
    } catch (error) {
      console.error("Error loading running entry:", error);
    }
  };

  const loadProjects = async () => {
    if (!session?.user) return;

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

  const loadTasks = async (projectId: string) => {
    if (!projectId) {
      setTasks([]);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  // Load tasks when project changes
  useEffect(() => {
    if (selectedProject) {
      loadTasks(selectedProject);
    }
  }, [selectedProject]);

  const startTimer = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/time/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: parseInt(selectedProject),
          taskId: selectedTask && selectedTask !== "no-task" ? parseInt(selectedTask) : undefined,
          note,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start timer");
      }

      const data = await response.json();
      setRunningEntry(data);
      toast.success("Timer started");
    } catch (error) {
      toast.error("Failed to start timer");
      console.error("Error starting timer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!runningEntry) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/time/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: runningEntry.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to stop timer");
      }

      setRunningEntry(null);
      setElapsedTime(0);
      setNote("");
      toast.success("Timer stopped");
    } catch (error) {
      toast.error("Failed to stop timer");
      console.error("Error stopping timer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const switchProject = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }

    if (runningEntry) {
      // Stop current timer and start new one
      setIsLoading(true);
      try {
        const response = await fetch("/api/time/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromEntryId: runningEntry.id,
            toProjectId: parseInt(selectedProject),
            toTaskId: selectedTask ? parseInt(selectedTask) : undefined,
            note,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to switch timer");
        }

        const data = await response.json();
        setRunningEntry(data);
        toast.success("Switched to new project");
      } catch (error) {
        toast.error("Failed to switch timer");
        console.error("Error switching timer:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      startTimer();
    }
  };

  const handleProjectChange = (value: string) => {
    if (value === "new-project") {
      setShowNewProjectDialog(true);
    } else {
      setSelectedProject(value);
    }
  };

  const handleProjectCreated = (newProject: any) => {
    // Add the new project to the projects list
    setProjects((prev: any) => [...prev, newProject]);
    // Select the newly created project
    setSelectedProject(newProject.id.toString());
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:flex items-center space-x-4">
        {/* Timer Display */}
        <div className="flex items-center space-x-2">
          <div className="text-2xl font-mono font-bold min-w-[80px]">
            {formatTime(elapsedTime)}
          </div>
          {runningEntry && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>

        {/* Project Selection */}
        <div className="flex items-center space-x-2">
          <Select value={selectedProject} onValueChange={handleProjectChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project: { id: number; name: string }) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
              {projects.length > 0 && <SelectSeparator />}
              <SelectItem value="new-project" className="text-blue-600 font-medium">
                <div className="flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span>Create New Project</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Task Selection */}
          <Select value={selectedTask} onValueChange={setSelectedTask}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Task (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-task">No task</SelectItem>
              {tasks.map((task: { id: number; name: string }) => (
                <SelectItem key={task.id} value={task.id.toString()}>
                  {task.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Note Input */}
        <Input
          placeholder="What are you working on?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="flex-1 max-w-md"
        />

        {/* Timer Controls */}
        <div className="flex items-center space-x-2">
          {!runningEntry ? (
            <Button
              onClick={startTimer}
              disabled={isLoading || !selectedProject}
              size="sm"
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          ) : (
            <>
              <Button
                onClick={switchProject}
                disabled={isLoading || !selectedProject}
                variant="outline"
                size="sm"
              >
                Switch
              </Button>
              <Button
                onClick={stopTimer}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <Square className="w-4 h-4 mr-1" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden space-y-4">
        {/* Timer Display - Large and prominent */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center space-x-3 bg-white rounded-lg p-6 shadow-sm border">
            <div className="text-4xl sm:text-5xl font-mono font-bold text-gray-900">
              {formatTime(elapsedTime)}
            </div>
            {runningEntry && (
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            )}
          </div>
          {runningEntry && (
            <p className="text-sm text-gray-600 mt-2">
              {runningEntry.project.name}{runningEntry.task && ` • ${runningEntry.task.name}`}
            </p>
          )}
        </div>

        {/* Project and Task Selection */}
        <div className="space-y-3">
          <div>
            <Select value={selectedProject} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder="Select project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project: { id: number; name: string }) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
                {projects.length > 0 && <SelectSeparator />}
                <SelectItem value="new-project" className="text-blue-600 font-medium">
                  <div className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span>Create New Project</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder="Task (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-task">No task</SelectItem>
                {tasks.map((task: { id: number; name: string }) => (
                  <SelectItem key={task.id} value={task.id.toString()}>
                    {task.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Note Input */}
        <Input
          placeholder="What are you working on?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full h-12 text-base"
        />

        {/* Timer Controls - Large touch targets */}
        <div className="flex gap-3">
          {!runningEntry ? (
            <Button
              onClick={startTimer}
              disabled={isLoading || !selectedProject}
              className="flex-1 h-12 text-base"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Start Timer
            </Button>
          ) : (
            <>
              <Button
                onClick={switchProject}
                disabled={isLoading || !selectedProject}
                variant="outline"
                className="flex-1 h-12 text-base"
                size="lg"
              >
                Switch
              </Button>
              <Button
                onClick={stopTimer}
                disabled={isLoading}
                variant="outline"
                className="flex-1 h-12 text-base"
                size="lg"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>

      {/* New Project Dialog */}
      <NewProjectDialog
        open={showNewProjectDialog}
        onOpenChange={setShowNewProjectDialog}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
}