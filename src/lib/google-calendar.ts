import { google } from "googleapis";
import { getSession } from "./authz";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface TimeEntryCalendarEvent {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  projectName: string;
  taskName?: string;
}

class GoogleCalendarService {
  private getAuth() {
    return new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );
  }

  private async getCalendarClient(accessToken: string) {
    const auth = this.getAuth();
    auth.setCredentials({ access_token: accessToken });
    return google.calendar({ version: "v3", auth });
  }

  async createTimeEntryEvent(
    accessToken: string,
    timeEntry: TimeEntryCalendarEvent
  ): Promise<string | null> {
    try {
      const calendar = await this.getCalendarClient(accessToken);
      
      const event = {
        summary: `[Frame] ${timeEntry.summary}`,
        description: this.formatTimeEntryDescription(timeEntry),
        start: {
          dateTime: timeEntry.startTime.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: timeEntry.endTime.toISOString(),
          timeZone: "UTC",
        },
        colorId: "4", // Blue color for work events
        source: {
          title: "Frame Time Tracking",
          url: process.env.NEXTAUTH_URL,
        },
      };

      const result = await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
      });

      return result.data.id || null;
    } catch (error) {
      console.error("Error creating calendar event:", error);
      return null;
    }
  }

  async updateTimeEntryEvent(
    accessToken: string,
    eventId: string,
    timeEntry: TimeEntryCalendarEvent
  ): Promise<boolean> {
    try {
      const calendar = await this.getCalendarClient(accessToken);
      
      const event = {
        summary: `[Frame] ${timeEntry.summary}`,
        description: this.formatTimeEntryDescription(timeEntry),
        start: {
          dateTime: timeEntry.startTime.toISOString(),
          timeZone: "UTC",
        },
        end: {
          dateTime: timeEntry.endTime.toISOString(),
          timeZone: "UTC",
        },
      };

      await calendar.events.update({
        calendarId: "primary",
        eventId: eventId,
        requestBody: event,
      });

      return true;
    } catch (error) {
      console.error("Error updating calendar event:", error);
      return false;
    }
  }

  async deleteTimeEntryEvent(accessToken: string, eventId: string): Promise<boolean> {
    try {
      const calendar = await this.getCalendarClient(accessToken);
      
      await calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      });

      return true;
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      return false;
    }
  }

  async getCalendarEvents(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    try {
      const calendar = await this.getCalendarClient(accessToken);
      
      const result = await calendar.events.list({
        calendarId: "primary",
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: "startTime",
      });

      return (result.data.items || []).map(event => ({
        id: event.id || "",
        summary: event.summary || "Untitled",
        description: event.description,
        start: {
          dateTime: event.start?.dateTime || event.start?.date || "",
          timeZone: event.start?.timeZone || "UTC",
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date || "",
          timeZone: event.end?.timeZone || "UTC",
        },
        attendees: event.attendees?.map(attendee => ({
          email: attendee.email || "",
          displayName: attendee.displayName,
        })),
      }));
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return [];
    }
  }

  async suggestTimeEntries(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    event: CalendarEvent;
    suggestedProject?: string;
    suggestedTask?: string;
    confidence: number;
  }>> {
    try {
      const events = await this.getCalendarEvents(accessToken, startDate, endDate);
      
      return events
        .filter(event => {
          // Filter out Frame-created events and all-day events
          return !event.summary.includes("[Frame]") && 
                 event.start.dateTime && 
                 event.end.dateTime;
        })
        .map(event => {
          const suggestion = this.analyzeEventForTimeEntry(event);
          return {
            event,
            ...suggestion,
          };
        })
        .filter(suggestion => suggestion.confidence > 0.3); // Only show high-confidence suggestions
    } catch (error) {
      console.error("Error generating time entry suggestions:", error);
      return [];
    }
  }

  private formatTimeEntryDescription(timeEntry: TimeEntryCalendarEvent): string {
    const lines = [
      `Project: ${timeEntry.projectName}`,
    ];
    
    if (timeEntry.taskName) {
      lines.push(`Task: ${timeEntry.taskName}`);
    }
    
    if (timeEntry.description) {
      lines.push(`Notes: ${timeEntry.description}`);
    }
    
    const duration = (timeEntry.endTime.getTime() - timeEntry.startTime.getTime()) / (1000 * 60 * 60);
    lines.push(`Duration: ${duration.toFixed(1)} hours`);
    lines.push("");
    lines.push("Generated by Frame Time Tracking");
    
    return lines.join("\n");
  }

  private analyzeEventForTimeEntry(event: CalendarEvent): {
    suggestedProject?: string;
    suggestedTask?: string;
    confidence: number;
  } {
    const title = event.summary.toLowerCase();
    const description = (event.description || "").toLowerCase();
    const content = `${title} ${description}`;
    
    // Simple keyword matching for project suggestions
    const projectKeywords = {
      "acme": ["acme", "homepage", "website", "redesign"],
      "techstart": ["techstart", "brand", "identity", "logo"],
    };
    
    const taskKeywords = {
      "design": ["design", "mockup", "prototype", "ui", "ux"],
      "meeting": ["meeting", "call", "sync", "standup", "review"],
      "development": ["dev", "code", "implementation", "build"],
      "research": ["research", "analysis", "discovery", "user research"],
    };
    
    let suggestedProject: string | undefined;
    let suggestedTask: string | undefined;
    let confidence = 0;
    
    // Check for project matches
    for (const [project, keywords] of Object.entries(projectKeywords)) {
      const matches = keywords.filter(keyword => content.includes(keyword));
      if (matches.length > 0) {
        suggestedProject = project;
        confidence += matches.length * 0.3;
      }
    }
    
    // Check for task matches
    for (const [task, keywords] of Object.entries(taskKeywords)) {
      const matches = keywords.filter(keyword => content.includes(keyword));
      if (matches.length > 0) {
        suggestedTask = task;
        confidence += matches.length * 0.2;
      }
    }
    
    // Boost confidence for meeting patterns
    if (event.attendees && event.attendees.length > 1) {
      confidence += 0.2;
    }
    
    // Duration-based confidence
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (durationHours >= 0.25 && durationHours <= 8) {
      confidence += 0.1;
    }
    
    return {
      suggestedProject,
      suggestedTask,
      confidence: Math.min(confidence, 1.0),
    };
  }
}

export const googleCalendar = new GoogleCalendarService();