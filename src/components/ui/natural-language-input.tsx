"use client";

import { useId, useState, useRef } from "react";
import { Wand2, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface NaturalLanguageInputProps {
  onSuccess?: () => void;
}

export default function NaturalLanguageInput({ onSuccess }: NaturalLanguageInputProps) {
  const id = useId();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session?.user) return;

    setIsProcessing(true);
    try {
      // Parse natural language input (simplified for demo)
      const parsed = parseTimeEntry(input.trim());
      
      if (parsed) {
        // Create time entry
        const response = await fetch("/api/time-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: parsed.projectId,
            taskId: parsed.taskId,
            note: parsed.note,
            startTime: parsed.startTime,
            endTime: parsed.endTime,
          }),
        });

        if (response.ok) {
          setInput("");
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
          onSuccess?.();
          
          // Refresh the page to show new time entry
          router.refresh();
        }
      }
    } catch (error) {
      console.error("Error creating time entry:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setInput("");
      inputRef.current?.blur();
    }
  };

  // Simple natural language parser (this would be more sophisticated in production)
  const parseTimeEntry = (text: string) => {
    // Examples:
    // "2 hours on ACME homepage design"
    // "worked 1.5h on logo design for TechStart"
    // "30 minutes wireframes yesterday"
    
    const timeMatch = text.match(/(\d+(?:\.\d+)?)\s*(h|hour|hours|m|min|minutes)/i);
    const projectMatch = text.match(/(acme|techstart)/i);
    
    if (timeMatch) {
      const duration = parseFloat(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      const minutes = unit.startsWith('h') ? duration * 60 : duration;
      
      const now = new Date();
      const startTime = new Date(now.getTime() - minutes * 60 * 1000);
      
      return {
        projectId: projectMatch ? (projectMatch[1].toLowerCase() === 'acme' ? 1 : 2) : 1,
        taskId: undefined,
        note: text,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
      };
    }
    
    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="relative mx-auto w-full max-w-xs">
      <Input
        ref={inputRef}
        id={id}
        className="peer h-8 ps-8 pe-10 text-sm"
        placeholder="2h on ACME design..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isProcessing}
      />
      <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center justify-center ps-2 peer-disabled:opacity-50">
        {isProcessing ? (
          <Loader2 size={16} className="animate-spin" />
        ) : showSuccess ? (
          <Check size={16} className="text-green-600" />
        ) : (
          <Wand2 size={16} />
        )}
      </div>
      <div className="text-muted-foreground pointer-events-none absolute inset-y-0 end-0 flex items-center justify-center pe-2">
        <kbd className="text-muted-foreground/70 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
          ⏎
        </kbd>
      </div>
    </form>
  );
}