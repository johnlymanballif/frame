"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export function CalendarSidebar() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Calendar Events</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">
            Connect Google Calendar to quickly log meetings and events.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}