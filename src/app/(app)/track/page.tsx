import { Timer } from "@/components/track/timer";
import { NaturalLanguageInput } from "@/components/track/natural-language-input";
import { TimeEntries } from "@/components/track/time-entries";
import { CalendarSidebar } from "@/components/track/calendar-sidebar";
import { MobileTimeEntry } from "@/components/track/mobile-time-entry";

export default function TrackPage() {
  return (
    <div className="space-y-6">
      {/* Timer Bar - Always visible */}
      <div className="bg-white rounded-lg border p-4">
        <Timer />
      </div>

      {/* Natural Language Input */}
      <div className="bg-white rounded-lg border p-4">
        <NaturalLanguageInput />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Entries - Today & Week Views */}
        <div className="lg:col-span-2 space-y-6">
          <TimeEntries />
        </div>

        {/* Calendar Sidebar */}
        <div className="space-y-6">
          <CalendarSidebar />
        </div>
      </div>
    </div>
  );
}