import { NextRequest, NextResponse } from "next/server";
import { requireManagerAuth } from "@/lib/authz";
import { googleCalendar } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const user = await requireManagerAuth();
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const accessToken = searchParams.get("accessToken"); // In production, this would come from the user's stored tokens
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }
    
    if (!accessToken) {
      return NextResponse.json(
        { error: "Google Calendar access token required" },
        { status: 400 }
      );
    }
    
    const suggestions = await googleCalendar.suggestTimeEntries(
      accessToken,
      new Date(startDate),
      new Date(endDate)
    );
    
    return NextResponse.json(suggestions);
    
  } catch (error) {
    console.error("Error getting calendar suggestions:", error);
    if (error instanceof Error && error.message.includes("required")) {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to fetch calendar suggestions" },
      { status: 500 }
    );
  }
}