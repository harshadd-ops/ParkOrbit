import { NextRequest, NextResponse } from "next/server";
import { getListingDetails, updateListing } from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth-server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const details = getListingDetails(id);
  if (!details) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  return NextResponse.json(details);
}

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
    const updated = updateListing(actor.id, id, body);
    return NextResponse.json({ listing: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    const status = message.startsWith("FORBIDDEN")
      ? 403
      : message.startsWith("UNAUTHORIZED")
        ? 401
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
