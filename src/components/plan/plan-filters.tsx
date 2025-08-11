"use client";

import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

export function PlanFilters() {
  return (
    <Button variant="outline" size="sm">
      <Filter className="w-4 h-4 mr-2" />
      Filters
    </Button>
  );
}