import { NextRequest, NextResponse } from "next/server";
import { cancelBooking, checkinOrCompleteBooking } from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = resolveRequestUser(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const { action } = body;

    if (action === "cancel") {
      const result = cancelBooking(actor.id, id, body.reason);
      return NextResponse.json(result);
    }

    if (action === "checkin" || action === "complete") {
      const updated = checkinOrCompleteBooking(
        actor.id,
        id,
        action,
        body.checkinPin
      );
      return NextResponse.json({ booking: updated });
    }

    return NextResponse.json(
      { error: "Unsupported booking action." },
      { status: 400 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to update booking.";
    const status = message.startsWith("FORBIDDEN")
      ? 403
      : message.startsWith("UNAUTHORIZED")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
