"use client";

import { useState, useEffect, useCallback } from "react";
import { X, User, Phone, MapPin, DollarSign, FileText, Building2, Calendar, ChevronDown } from "lucide-react";
import type { LeadPayload, PropertyOption } from "@/lib/api";

export interface LeadFormData {
  customerName: string;
  customerPhone: string;
  requestedLocality: string;
  budget: string;
  otherReqs: string;
  interestedPropertyId: string;
  appointmentDate: string;
  status: "Upcoming Visit" | "Visited" | "Negotiating" | "Browsing (No Visit)" | "Closed" | "Lost (Not Interested)";
  leadScore: "High" | "Medium" | "Low";
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LeadPayload) => Promise<void>;
  initial?: Partial<LeadFormData>;
  properties: PropertyOption[];
  mode: "create" | "edit";
}

const STATUSES: LeadFormData["status"][] = [
  "Browsing (No Visit)",
  "Upcoming Visit",
  "Visited",
  "Negotiating",
  "Closed",
  "Lost (Not Interested)",
];

const SCORES: LeadFormData["leadScore"][] = ["High", "Medium", "Low"];

const empty: LeadFormData = {
  customerName: "",
  customerPhone: "",
  requestedLocality: "",
  budget: "",
  otherReqs: "",
  interestedPropertyId: "",
  appointmentDate: "",
  status: "Browsing (No Visit)",
  leadScore: "Low",
};

export function LeadModal({ open, onClose, onSubmit, initial, properties, mode }: Props) {
  const [form, setForm] = useState<LeadFormData>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial ? { ...empty, ...initial } : empty);
      setError("");
    }
  }, [open, initial]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const set = useCallback(<K extends keyof LeadFormData>(key: K, val: LeadFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) { setError("Customer name is required"); return; }
    if (!form.customerPhone.trim()) { setError("Phone number is required"); return; }

    setSubmitting(true);
    setError("");
    try {
      const payload: LeadPayload = {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        requestedLocality: form.requestedLocality,
        budget: form.budget,
        otherReqs: form.otherReqs,
        interestedPropertyId: form.interestedPropertyId,
        appointmentDate: form.appointmentDate,
        status: form.status,
        leadScore: form.leadScore,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer — full screen on mobile, right panel on sm+ */}
      <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto z-50 w-full sm:w-[min(100vw,480px)] bg-card sm:border-l border-border shadow-2xl flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-border flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold">
              {mode === "create" ? "Add New Lead" : "Edit Lead"}
            </h2>
            <p className="text-xs text-foreground/50 mt-0.5 truncate">
              {mode === "create"
                ? "Manually add a lead from a call or referral"
                : "Update lead details and status"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-muted hover:bg-border transition-colors flex items-center justify-center flex-shrink-0 ml-3"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">

          {/* Name + Phone — stack on tiny screens, side-by-side on xs+ */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide flex items-center gap-1.5">
                <User className="h-3 w-3" /> Name *
              </label>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => set("customerName", e.target.value)}
                placeholder="Rahul Sharma"
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> Phone *
              </label>
              <input
                type="tel"
                value={form.customerPhone}
                onChange={(e) => set("customerPhone", e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>

          {/* Locality + Budget */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Locality
              </label>
              <input
                type="text"
                value={form.requestedLocality}
                onChange={(e) => set("requestedLocality", e.target.value)}
                placeholder="Baner, Pune"
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> Budget
              </label>
              <input
                type="text"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="₹80L – ₹1Cr"
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              />
            </div>
          </div>

          {/* Requirements */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Requirements
            </label>
            <textarea
              value={form.otherReqs}
              onChange={(e) => set("otherReqs", e.target.value)}
              placeholder="3 BHK, semi-furnished, high floor, near metro..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none"
            />
          </div>

          {/* Interested Property */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide flex items-center gap-1.5">
              <Building2 className="h-3 w-3" /> Interested Property
            </label>
            <div className="relative">
              <select
                value={form.interestedPropertyId}
                onChange={(e) => set("interestedPropertyId", e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none"
              >
                <option value="">None — Still Browsing</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} — {p.locality}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
            </div>
          </div>

          {/* Appointment Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="h-3 w-3" /> Appointment Date &amp; Time
            </label>
            {(() => {
              let dStr = "";
              let hStr = "12";
              let mStr = "00";
              let ap = "PM";

              if (form.appointmentDate) {
                const dt = new Date(form.appointmentDate);
                if (!isNaN(dt.getTime())) {
                  // Keep as local date string to match user's local timezone picking
                  dStr = form.appointmentDate.split("T")[0];
                  if (!dStr.includes("-")) {
                    dStr = dt.toISOString().split("T")[0];
                  }

                  const h = dt.getHours();
                  const m = dt.getMinutes();
                  mStr = m === 0 ? "00" : (m < 15 ? "00" : (m < 30 ? "15" : (m < 45 ? "30" : "45"))); // rough align to options
                  ap = h >= 12 ? "PM" : "AM";
                  const h12 = h % 12 || 12;
                  hStr = h12.toString().padStart(2, "0");
                }
              }

              const handleChange = (part: "date" | "hour" | "minute" | "ampm", val: string) => {
                let newD = part === "date" ? val : dStr;
                if (!newD) {
                  set("appointmentDate", "");
                  return;
                }

                let newH = part === "hour" ? val : hStr;
                let newM = part === "minute" ? val : mStr;
                let newAp = part === "ampm" ? val : ap;

                const dateObj = new Date(newD);
                if (isNaN(dateObj.getTime())) return;

                let h24 = parseInt(newH, 10);
                if (newAp === "PM" && h24 !== 12) h24 += 12;
                if (newAp === "AM" && h24 === 12) h24 = 0;

                dateObj.setHours(h24, parseInt(newM, 10), 0, 0);
                set("appointmentDate", dateObj.toISOString());
              };

              return (
                <div className="flex flex-col gap-3">
                  <input
                    type="date"
                    value={dStr}
                    onChange={(e) => handleChange("date", e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  />
                  <div className="flex gap-1.5 flex-1 items-center">
                    <div className="relative flex-1 min-w-[70px]">
                      <select value={hStr} onChange={(e) => handleChange("hour", e.target.value)} className="w-full pl-3 pr-7 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none font-medium">
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/50" />
                    </div>
                    <span className="font-black text-foreground/40">:</span>
                    <div className="relative flex-1 min-w-[70px]">
                      <select value={mStr} onChange={(e) => handleChange("minute", e.target.value)} className="w-full pl-3 pr-7 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none font-medium">
                        {["00", "15", "30", "45"].map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/50" />
                    </div>
                    <div className="relative flex-1 min-w-[70px]">
                      <select value={ap} onChange={(e) => handleChange("ampm", e.target.value)} className="w-full pl-3 pr-7 py-2.5 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none font-bold">
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/60" />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Status + Lead Score */}
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">Status</label>
              <div className="relative">
                <select
                  value={form.status}
                  onChange={(e) => set("status", e.target.value as LeadFormData["status"])}
                  className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">Lead Score</label>
              <div className="flex gap-2">
                {SCORES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("leadScore", s)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${form.leadScore === s
                      ? s === "High"
                        ? "bg-amber-500 text-white border-amber-500"
                        : s === "Medium"
                          ? "bg-primary text-white border-primary"
                          : "bg-foreground/20 text-foreground border-border"
                      : "bg-background border-border text-foreground/50 hover:border-foreground/30"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </form>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {submitting ? "Saving…" : mode === "create" ? "Add Lead" : "Save Changes"}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out forwards;
        }
      `}</style>
    </>
  );
}
