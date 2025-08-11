"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function NaturalLanguageInput() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<{
    duration?: string;
    project?: string;
    task?: string;
    billable?: boolean;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    // TODO: Implement NL parsing
    console.log("Parsing:", input);
    setIsLoading(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Input
          placeholder="Try: 1h @ ACME — homepage — billable (sketches)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? "Parsing..." : "Parse"}
        </Button>
      </form>

      {parsedData && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Duration: {parsedData.duration}</Badge>
          <Badge variant="secondary">Project: {parsedData.project}</Badge>
          {parsedData.task && <Badge variant="secondary">Task: {parsedData.task}</Badge>}
          <Badge variant={parsedData.billable ? "default" : "outline"}>
            {parsedData.billable ? "Billable" : "Non-billable"}
          </Badge>
        </div>
      )}
    </div>
  );
}