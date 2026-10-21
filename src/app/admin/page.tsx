"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mc-eyebrow mb-2">
            <span className="mc-eyebrow-dot" />
            <span>TRUST, SAFETY & MARKETPLACE GOVERNANCE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-[-0.02em] text-[#141413]">
            Admin Moderation & Commission Console
          </h1>
          <p className="text-base text-[#595550] mt-1">
            Review community trust reports, suspend non-compliant listings, and
            configure platform take-rates.
          </p>
        </div>

        {user?.role !== "admin" && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-pill bg-black/5 border border-black/10 text-xs text-[#595550] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-[#CF4500]" />
            <span>Viewing as {user?.name || "Demo User"}. Use navbar switcher to activate Admin persona.</span>
          </div>
        )}
      </div>

      {/* Grid: Left 4 Cols Commission Config, Right 8 Cols Moderation Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Configurable Marketplace Commission Card */}
        <form
          onSubmit={handleSaveCommission}
          className="lg:col-span-4 bg-[#141413] text-[#F3F0EE] rounded-[28px] p-7 space-y-6 shadow-mc-floating"
        >
          <div className="mc-eyebrow text-[#F37338]">
            <span className="mc-eyebrow-dot" />
            <span>BUSINESS MODEL CONFIGURATION</span>
          </div>

          <div>
            <h2 className="text-2xl font-medium text-white">
              Marketplace Commission Rate
            </h2>
            <p className="text-xs text-[#A39E98] mt-1">
              Dynamically adjusts the platform service fee and net host payout
              across all new reservations.
            </p>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl border border-white/15 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#D0CBC5]">
              Current Live Take-Rate
            </span>
            <span
              data-testid="live-commission-rate"
              className="text-3xl font-bold text-[#F37338]"
            >
              {config.commissionRatePercent}%
            </span>
          </div>

          <div>
            <label
              htmlFor="commission-rate-input"
              className="block text-xs font-bold uppercase tracking-wider text-[#D0CBC5] mb-1.5"
            >
              Set New Commission % (0% – 35%)
            </label>
            <Input
              id="commission-rate-input"
              type="number"
              min="0"
              max="35"
              step="1"
              value={commissionInput}
              onChange={(e) => setCommissionInput(Number(e.target.value))}
              className="bg-white text-[#141413]"
            />
          </div>

          <Button
            type="submit"
            variant="consent"
            className="w-full"
            disabled={savingConfig}
          >
            {savingConfig
              ? "Updating Take-Rate..."
              : "Save Platform Commission"}
          </Button>
        </form>

        {/* Moderation Reports Queue */}
        <div className="lg:col-span-8 bg-[#FCFBFA] rounded-[28px] p-6 sm:p-8 border border-black/10 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-medium text-[#141413]">
                Trust & Safety Reports Queue ({reports.length})
              </h2>
              <p className="text-xs text-[#595550] mt-0.5">
                Investigate driver and host reports regarding listing accuracy
                or access issues.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="h-40 rounded-2xl bg-[#F3F0EE] animate-pulse" />
          ) : reports.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#F3F0EE]">
              <p className="text-sm text-[#595550]">
                No moderation reports in the queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 rounded-2xl bg-[#F3F0EE] border border-black/8 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          rep.status === "open"
                            ? "signal"
                            : rep.status === "resolved"
                              ? "default"
                              : "outline"
                        }
                      >
                        {rep.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-bold text-[#141413]">
                        Target: {rep.targetTitle}
                      </span>
                    </div>
                    <span className="text-xs text-[#736E68]">
                      Reported by {rep.reporterName} ·{" "}
                      {formatDateTime(rep.createdAt)}
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-bold text-[#CF4500]">
                      Reason: {rep.reasonCategory.replace("_", " ")}
                    </div>
                    <p className="text-xs text-[#595550] mt-1">
                      {rep.description}
                    </p>
                  </div>

                  {rep.adminNotes && (
                    <div className="text-xs text-[#1E7E48] font-medium bg-white p-2.5 rounded-xl">
                      Resolution: {rep.adminNotes}
                    </div>
                  )}

                  {rep.status === "open" && (
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() =>
                          handleModerateReport(rep.id, "resolved", false)
                        }
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve Report
                      </Button>

                      {rep.targetType === "listing" && (
                        <Button
                          size="sm"
                          variant="consent"
                          onClick={() =>
                            handleModerateReport(rep.id, "resolved", true)
                          }
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Flag & Suspend Listing
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          handleModerateReport(rep.id, "dismissed", false)
                        }
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
