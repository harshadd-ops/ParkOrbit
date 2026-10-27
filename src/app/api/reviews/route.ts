import { NextRequest, NextResponse } from "next/server";
import { createReview } from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const actor = resolveRequestUser(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const review = createReview(actor.id, {
      bookingId: body.bookingId,
      rating: Number(body.rating),
      comment: body.comment,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit review.";
    const status = message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
