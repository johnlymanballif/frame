import { requireManagerAuth } from "@/lib/authz";
import { ProjectCards } from "@/components/profit/project-cards";
import { ProfitFilters } from "@/components/profit/profit-filters";

export default async function ProfitPage() {
  await requireManagerAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Project Profitability</h1>
        <ProfitFilters />
      </div>

      <ProjectCards />
    </div>
  );
}