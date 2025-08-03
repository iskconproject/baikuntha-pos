import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAuth } from "@/lib/auth/middleware";
import { authService } from "@/services/auth/authService";
import { getLocalDb } from "@/lib/db/connection";
import { users } from "@/lib/db/schema";
import { changePinSchema } from "@/lib/validation/user";

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req, user) => {
    try {
      const db = getLocalDb();
      const body = await req.json();

      // Validate request body
      const validation = changePinSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid input",
            details: validation.error.errors.map((err) => err.message),
          },
          { status: 400 }
        );
      }

      const { currentPin, newPin } = validation.data;

      // Get current user data
      const currentUser = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      if (currentUser.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Verify current PIN
      const isCurrentPinValid = await authService.verifyPin(
        currentPin,
        currentUser[0].pinHash
      );
      if (!isCurrentPinValid) {
        return NextResponse.json(
          { error: "Current PIN is incorrect" },
          { status: 400 }
        );
      }

      // Hash new PIN
      const newPinHash = await authService.hashPin(newPin);

      // Update PIN in database
      await db
        .update(users)
        .set({
          pinHash: newPinHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      return NextResponse.json({
        success: true,
        message: "PIN changed successfully",
      });
    } catch (error) {
      console.error("Change PIN API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
}
