"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import type { ModerationReport, PlatformConfig } from "@/lib/types";
import { toast } from "sonner";

export default function AdminModerationPage() {
  const { currentUser: user } = useAuth();
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [config, setConfig] = useState<PlatformConfig>({
    commissionRatePercent: 12,
    driverServiceFeePercent: 5,
    featuredListingMonthlyInr: 499,
    proHostSubscriptionInr: 1499,
    paymentMode: "simulated_test",
    payoutMode: "estimated_pending",
  });
  const [commissionInput, setCommissionInput] = useState<number>(12);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        if (data.config) {
          setConfig(data.config);
          setCommissionInput(data.config.commissionRatePercent);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleSaveCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "admin") {
      toast.error(
        "Please switch to the Nandini Sharma (Admin) persona to update platform commission."
      );
      return;
    }
    setSavingConfig(true);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_config",
          commissionRatePercent: commissionInput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not update commission rate.");
        return;
      }
      setConfig(data.config);
      toast.success(
        `Marketplace commission rate updated to ${data.config.commissionRatePercent}% across all future bookings.`
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleModerateReport = async (
    reportId: string,
    status: "resolved" | "dismissed",
    flagListing = false
  ) => {
    if (user?.role !== "admin") {
      toast.error(
        "Please switch to the Nandini Sharma (Admin) persona to moderate reports."
      );
      return;
    }
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          status,
          adminNotes: flagListing
            ? "Listing flagged & suspended from discovery by Trust & Safety."
            : `Report marked ${status} by Trust & Safety Admin.`,
          flagListing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Moderation action failed.");
        return;
      }
      toast.success(
        flagListing
          ? "Report resolved & target listing suspended from public search."
          : `Report marked as ${status}.`
      );
      await fetchAdminData();
    } catch {
      toast.error("Failed to update report.");
    }
  };

  const openReports = reports.filter((r) => r.status === "open");
  const closedReports = reports.filter((r) => r.status !== "open");

  if (user && user.role !== "admin") {
    return (
      <div className="mx-auto max-w-[720px] px-5 py-32 text-center">
        <h1 className="text-[36px]">Trust & safety console</h1>
        <p className="mt-3 text-slate">
          Switch to the Admin demo account (Nandini Sharma) in the dock below to see it.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 md:px-8 pt-12 md:pt-16">
      <p className="text-[16px] text-slate">Trust & safety</p>
      <h1 className="mt-1 text-[40px] md:text-[56px] leading-[1] tracking-[-0.03em]">
        Reports
      </h1>

      <div className="mt-14 grid lg:grid-cols-12 gap-10 items-start">
        <section className="lg:col-span-8">
          <h2 className="text-[22px]">
            Needs review <span className="text-slate">({openReports.length})</span>
          </h2>

          {loading ? (
            <div className="mt-6 h-40 rounded-stadium bg-lifted animate-pulse" />
          ) : openReports.length === 0 ? (
            <div className="mt-6 rounded-stadium bg-lifted p-10 text-center text-slate">
              <ShieldCheck className="size-6 mx-auto mb-3 text-ink" />
              All clear. No open reports.
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {openReports.map((rep) => (
                <li key={rep.id} className="rounded-stadium bg-white p-6 md:p-7 shadow-nav">
                  <div className="text-[13px] text-slate">
                    {rep.reasonCategory.replace(/_/g, " ")} · {rep.reporterName} ·{" "}
                    {formatDateTime(rep.createdAt)}
                  </div>
                  <h3 className="mt-2 text-[18px] font-medium">{rep.targetTitle}</h3>
                  <p className="mt-2 text-[15px] text-granite leading-[1.5]">{rep.description}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {rep.targetType === "listing" && (
                      <Button size="sm" onClick={() => handleModerateReport(rep.id, "resolved", true)}>
                        <ShieldAlert />
                        Suspend listing
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleModerateReport(rep.id, "resolved", false)}
                    >
                      <CheckCircle2 />
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleModerateReport(rep.id, "dismissed", false)}
                    >
                      <XCircle />
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {closedReports.length > 0 && (
            <>
              <h2 className="mt-16 text-[22px]">Closed</h2>
              <ul className="mt-4 divide-y divide-ink/10">
                {closedReports.map((rep) => (
                  <li key={rep.id} className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[15px] font-medium truncate">{rep.targetTitle}</div>
                      <div className="text-[13px] text-slate truncate">{rep.adminNotes}</div>
                    </div>
                    <span className="text-[13px] text-slate capitalize shrink-0">{rep.status}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <form
          onSubmit={handleSaveCommission}
          className="lg:col-span-4 lg:sticky lg:top-28 rounded-stadium bg-ink text-canvas p-7 md:p-8 space-y-6"
        >
          <div>
            <div className="text-[14px] text-canvas/60">Platform fee</div>
            <div data-testid="live-commission-rate" className="mt-2 text-[56px] font-medium leading-none tracking-[-0.03em]">
              {config.commissionRatePercent}%
            </div>
            <p className="mt-3 text-[14px] text-canvas/60">
              Taken from host earnings on every new booking.
            </p>
          </div>
          <div>
            <label htmlFor="commission-rate-input" className="block text-[13px] text-canvas/60 mb-2 pl-1">
              New rate (0–35%)
            </label>
            <Input
              id="commission-rate-input"
              type="number"
              min="0"
              max="35"
              step="1"
              value={commissionInput}
              onChange={(e) => setCommissionInput(Number(e.target.value))}
              className="border-transparent"
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            className="w-full bg-canvas border-canvas"
            disabled={savingConfig}
          >
            {savingConfig ? "Saving…" : "Update fee"}
          </Button>
        </form>
      </div>
    </div>
  );
}
