import { NextRequest, NextResponse } from "next/server";
import { addBlockedPeriod, removeBlockedPeriod } from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth-server";

export async function POST(
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
    const block = addBlockedPeriod(actor.id, id, {
      startTime: body.startTime,
      endTime: body.endTime,
      reason: body.reason,
    });
    return NextResponse.json({ block }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to block period.";
    const status = message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
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
    const { searchParams } = new URL(req.url);
    const blockId = searchParams.get("blockId");
    if (!blockId) {
      return NextResponse.json({ error: "blockId required." }, { status: 400 });
    }
    removeBlockedPeriod(actor.id, id, blockId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to remove block.";
    const status = message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
