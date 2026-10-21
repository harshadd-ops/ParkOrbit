import { NextRequest, NextResponse } from "next/server";
import {
  createReport,
  readDb,
  resolveReportAsAdmin,
  updatePlatformConfigAsAdmin,
} from "@/lib/db";
import { resolveRequestUser } from "@/lib/auth-server";

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    reports: db.reports,
    config: db.config,
    listings: db.listings,
    bookings: db.bookings,
    payments: db.payments,
  });
}

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
    const report = createReport(actor.id, {
      targetType: body.targetType || "listing",
      targetId: body.targetId,
      targetTitle: body.targetTitle,
      reasonCategory: body.reasonCategory || "suspicious_listing",
      description: body.description,
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to submit report.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = resolveRequestUser(req);
    if (!actor) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }
    const body = await req.json();
    if (body.action === "update_config") {
      const config = updatePlatformConfigAsAdmin(actor.id, {
        commissionRatePercent:
          body.commissionRatePercent !== undefined
            ? Number(body.commissionRatePercent)
            : undefined,
        driverServiceFeePercent:
          body.driverServiceFeePercent !== undefined
            ? Number(body.driverServiceFeePercent)
            : undefined,
        featuredListingMonthlyInr:
          body.featuredListingMonthlyInr !== undefined
            ? Number(body.featuredListingMonthlyInr)
            : undefined,
        proHostSubscriptionInr:
          body.proHostSubscriptionInr !== undefined
            ? Number(body.proHostSubscriptionInr)
            : undefined,
      });
      return NextResponse.json({ config });
    }

    const updated = resolveReportAsAdmin(actor.id, body.reportId, {
      status: body.status,
      adminNotes: body.adminNotes,
      flagListing: body.flagListing,
    });
    return NextResponse.json({ report: updated });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Moderation update failed.";
    const status = message.startsWith("FORBIDDEN") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
