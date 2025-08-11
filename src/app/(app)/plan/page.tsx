import { requireManagerAuth } from "@/lib/authz";
import { WeeklyGrid } from "@/components/plan/weekly-grid";
import { PlanFilters } from "@/components/plan/plan-filters";

export default async function PlanPage() {
  await requireManagerAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Resource Planning</h1>
        <PlanFilters />
      </div>

      <div className="bg-white rounded-lg border">
        <WeeklyGrid />
      </div>
    </div>
  );
}