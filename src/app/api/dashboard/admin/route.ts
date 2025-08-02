import { NextRequest, NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboard/dashboardService";
import { verifySession } from "@/lib/auth/session";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Extract session token from cookies
    const sessionToken = request.cookies.get("baikuntha-session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized - No session token" },
        { status: 401 }
      );
    }

    // Verify session and check admin role
    const session = await verifySession(sessionToken);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Invalid session" },
        { status: 401 }
      );
    }

    if (session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    console.log("Fetching admin metrics...");
    const metrics = await dashboardService.getAdminMetrics();
    console.log("Admin metrics fetched successfully:", metrics);

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Failed to fetch admin dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
