"use client";

import {
  Phone,
  MessageSquare,
  MapPin,
  Building2,
  ExternalLink,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bed,
  Bath,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";
import type { Property } from "@/lib/properties";
import type { SiteVisit } from "@/lib/api";
import { useState, useRef, useEffect } from "react";

export interface Lead {
  key: string;
  customerName: string;
  customerPhone: string;
  category?: "Residential" | "Commercial" | "Land" | null;
  requestedLocality?: string;
  budget?: string;
  otherReqs?: string;
  status: "Upcoming Visit" | "Visited" | "Negotiating" | "Browsing (No Visit)" | "Closed" | "Lost (Not Interested)";
  leadScore: "High" | "Medium" | "Low";
  created_at?: string;
  visits?: SiteVisit[];
}

interface Props {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (id: string, status: Lead["status"]) => Promise<void>;
  animIndex?: number;
  properties?: Property[];
}

const STATUSES: Lead["status"][] = [
  "Browsing (No Visit)",
  "Upcoming Visit",
  "Visited",
  "Negotiating",
  "Closed",
  "Lost (Not Interested)",
];

const statusStyle: Record<Lead["status"], string> = {
  "Upcoming Visit": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Visited": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Negotiating": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Browsing (No Visit)": "bg-foreground/8 text-foreground/60 border-border",
  "Closed": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  "Lost (Not Interested)": "bg-red-500/10 text-red-600 border-red-500/20",
};

const scoreStyle: Record<Lead["leadScore"], string> = {
  High: "bg-amber-500/15 text-amber-600 border-amber-400/30",
  Medium: "bg-primary/10 text-primary border-primary/20",
  Low: "bg-foreground/8 text-foreground/40 border-border",
};

// Color gradient for avatar by name
const avatarGradients = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-cyan-500 to-sky-600",
];

function getAvatarGradient(name: string) {
  const idx = name.charCodeAt(0) % avatarGradients.length;
  return avatarGradients[idx];
}

function formatAppointment(isoStr: string) {
  const d = new Date(isoStr);
  const todayStr = new Date().toDateString();
  const tomorrowStr = new Date(Date.now() + 86400000).toDateString();
  const dStr = d.toDateString();
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  if (dStr === todayStr) return `Today, ${timeStr}`;
  if (dStr === tomorrowStr) return `Tomorrow, ${timeStr}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + timeStr;
}

export function LeadCard({ lead, onEdit, onDelete, onStatusChange, animIndex = 0, properties }: Props) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setStatusOpen(false);
      }
    };
    if (statusOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [statusOpen]);

  const handleStatusSelect = async (s: Lead["status"]) => {
    setStatusOpen(false);
    if (s === lead.status) return;
    setUpdating(true);
    try {
      await onStatusChange(lead.key, s);
    } finally {
      setUpdating(false);
    }
  };

  const toggleExpanded = () => setExpanded(!expanded);

  const gradient = getAvatarGradient(lead.customerName);
  const initials = lead.customerName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Find next upcoming scheduled visit, otherwise fallback to the most recent one
  const sortedVisits = lead.visits ? [...lead.visits].sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()) : [];
  const upcomingVisit = sortedVisits.find(v => v.status === "Scheduled" && new Date(v.appointment_date) >= new Date()) || sortedVisits[0];
  const upcomingScheduledVisits = sortedVisits.filter(v => v.status === "Scheduled");
  const targetVisits = upcomingScheduledVisits.length > 0 ? upcomingScheduledVisits : (sortedVisits.length > 0 ? [sortedVisits[0]] : []);

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:border-primary/30 transition-all animate-fade-in-up flex flex-col gap-3 cursor-pointer"
      style={{ animationDelay: `${animIndex * 60}ms`, animationFillMode: "both" }}
      onClick={toggleExpanded}
    >
      {/* ── Top Bar / Short View ── */}
      <div className="flex items-start sm:items-center justify-between gap-2 min-w-0">
        {/* Left: Contact Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div
            className={`h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0 shadow-sm`}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base sm:text-lg leading-tight truncate">{lead.customerName}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
              <p className="text-foreground/60 text-xs sm:text-sm flex items-center gap-1 min-w-0">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{lead.customerPhone}</span>
              </p>
              {lead.category && (
                <span className="text-[10px] bg-secondary/15 text-secondary-foreground border border-secondary/20 font-bold px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {lead.category}
                </span>
              )}
              <span className={`inline-flex text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${scoreStyle[lead.leadScore]}`}>
                {lead.leadScore}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Status + Expand toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Quick Actions — visible on sm+ */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Link
              href={`/dashboard/conversations?phone=${encodeURIComponent(lead.customerPhone)}`}
              className="h-8 w-8 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-colors flex items-center justify-center"
              title="Open WhatsApp Conversation"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </Link>
            <a
              href={`tel:${lead.customerPhone}`}
              className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center"
              title="Call"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="hidden sm:block w-px bg-border h-6" />

          {/* Status Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setStatusOpen((o) => !o); }}
              disabled={updating}
              className={`text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border shadow-sm flex items-center gap-1 transition-opacity ${updating ? "opacity-50" : "hover:opacity-80"} ${statusStyle[lead.status]}`}
            >
              <span className="hidden xs:inline sm:inline truncate max-w-[80px] sm:max-w-none">{lead.status}</span>
              <span className="xs:hidden sm:hidden">•</span>
              <ChevronDown className="h-3 w-3 opacity-60 flex-shrink-0" />
            </button>

            {statusOpen && (
              <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl z-30 py-1 min-w-[160px]">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={(e) => { e.stopPropagation(); handleStatusSelect(s); }}
                    className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-muted transition-colors ${s === lead.status ? "text-primary font-bold" : "text-foreground/70"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-1 text-foreground/40 hover:text-foreground transition-colors" onClick={toggleExpanded}>
            {expanded ? <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5" /> : <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5" />}
          </div>
        </div>
      </div>

      {/* ── Status badge for mobile (shown inline below name on xs) ── */}
      <div className="sm:hidden flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-lg border ${statusStyle[lead.status]}`}>
          {lead.status}
        </span>
        <Link
          href={`/dashboard/conversations?phone=${encodeURIComponent(lead.customerPhone)}`}
          className="h-7 w-7 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-colors flex items-center justify-center"
          title="Open WhatsApp Conversation"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Link>
        <a
          href={`tel:${lead.customerPhone}`}
          className="h-7 w-7 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center"
          title="Call"
        >
          <Phone className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* ── Expanded View ── */}
      {expanded && (
        <div
          className="pt-3 border-t border-border/50 animate-fade-in flex flex-col gap-4 lg:gap-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Section: Split on Desktop */}
          <div className="flex flex-col md:flex-row gap-4 lg:gap-6">
            {/* ── Left Column: Requirements & Appointment ── */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Requirements */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Requirements
                </p>

                <div className="flex flex-wrap gap-2">
                  {lead.requestedLocality && (
                    <span className="bg-background border border-border px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 text-foreground/80">
                      <MapPin className="h-3.5 w-3.5 text-foreground/40 flex-shrink-0" />
                      {lead.requestedLocality}
                    </span>
                  )}
                  {lead.budget && (
                    <span className="bg-background border border-border px-2.5 py-1 rounded-lg text-xs sm:text-sm font-medium flex items-center gap-1.5 text-foreground/80">
                      <Building2 className="h-3.5 w-3.5 text-foreground/40 flex-shrink-0" />
                      {lead.budget}
                    </span>
                  )}
                  {!lead.requestedLocality && !lead.budget && (
                    <span className="text-sm text-foreground/40 italic">No requirements extracted yet</span>
                  )}
                </div>

                {lead.otherReqs && (
                  <div className="bg-muted/40 p-3 rounded-xl border border-border/50">
                    <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
                      &ldquo;{lead.otherReqs}&rdquo;
                    </p>
                  </div>
                )}
              </div>

              {/* Appointment */}
              <div className="mt-4 md:mt-auto md:border-t-0 pt-4 border-t border-border/50 md:pt-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {upcomingVisit ? (
                    <>
                      <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-foreground/40 leading-none mb-0.5">Appt</p>
                        <p className="text-sm font-bold truncate">{formatAppointment(upcomingVisit.appointment_date)}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4 text-primary/40 flex-shrink-0" />
                      <p className="text-sm font-medium text-foreground/50 italic">Chat active</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ── Right Column: Interested Property ── */}
            <div className="md:w-[280px] lg:w-[320px] flex-shrink-0 border-t border-border/50 md:border-transparent pt-4 md:pt-0">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest mb-2">
                Interested Property
              </p>

              {/* Mobile View (Small Card) */}
              <div className="md:hidden space-y-2">
                {targetVisits.length > 0 ? (
                  targetVisits.map((visit) => (
                    visit.property_id && visit.property_title ? (
                      <Link
                        key={visit.key || visit.property_id}
                        href={`/dashboard/properties/${visit.property_id}`}
                        className="group flex items-start gap-3 bg-secondary/10 hover:bg-secondary/20 p-3 rounded-xl transition-colors border border-transparent hover:border-secondary/30"
                      >
                        <div className="h-9 w-9 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">
                            {visit.property_title}
                          </p>
                          <span className="text-xs text-primary flex items-center gap-1 mt-1 font-semibold">
                            {formatAppointment(visit.appointment_date)} • View Listing <ExternalLink className="h-3 w-3" />
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <div key={visit.key} className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border border-dashed border-border/50">
                        <div className="h-9 w-9 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="h-4 w-4 text-foreground/30" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground/60">General Site Visit</p>
                          <span className="text-xs text-foreground/45 mt-0.5 block">{formatAppointment(visit.appointment_date)}</span>
                        </div>
                      </div>
                    )
                  ))
                ) : (
                  <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-xl border border-dashed border-border/50">
                    <div className="h-9 w-9 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-foreground/30" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground/60">Still Searching</p>
                      <span className="text-xs text-foreground/45 mt-0.5 block">Bot is recommending options</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop View (Full Property Card) */}
              <div className="hidden md:block space-y-3">
                {targetVisits.length > 0 ? (
                  targetVisits.map((visit) => {
                    const matchedProperty = visit.property_id && properties ? properties.find(p => p.id === visit.property_id) : null;
                    if (!matchedProperty) return null;

                    const price = matchedProperty.transactionType === "Sell" ? matchedProperty.expectedPrice : matchedProperty.monthlyRent;
                    const priceStr = price ? (price >= 10000000 ? `${(price / 10000000).toFixed(2)} Cr` : price >= 100000 ? `${(price / 100000).toFixed(2)} L` : price.toLocaleString()) : "Price on Request";

                    return (
                      <Link key={visit.key || visit.property_id} href={`/dashboard/properties/${matchedProperty.id}`} className="group block bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden relative">
                        <div className="relative h-32 w-full overflow-hidden bg-muted">
                          <img src={matchedProperty.image || ""} alt={matchedProperty.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          <div className="absolute top-2 right-2 flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-black/70 text-white backdrop-blur-md shadow-sm border border-white/20">
                              {matchedProperty.transactionType}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-primary text-primary-foreground shadow-sm">
                              {formatAppointment(visit.appointment_date)}
                            </span>
                          </div>
                        </div>
                        <div className="p-3.5 space-y-3">
                          <div>
                            <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{matchedProperty.title}</h3>
                            <p className="text-[11px] text-foreground/60 flex items-center gap-1 mt-0.5 font-medium truncate">
                              <MapPin className="h-3 w-3 flex-shrink-0" /> {matchedProperty.locality}, {matchedProperty.city}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-foreground/60 font-medium">
                            {matchedProperty.beds && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{matchedProperty.beds} Beds</span>}
                            {matchedProperty.baths && <span className="flex items-center gap-1 border-l border-border pl-3"><Bath className="h-3.5 w-3.5" />{matchedProperty.baths} Baths</span>}
                          </div>
                          <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                            <span className="font-extrabold text-primary flex items-center gap-0.5 text-sm">
                              <IndianRupee className="h-3 w-3 -mr-0.5" />
                              {priceStr}{matchedProperty.transactionType === "Rent" && " / mo"}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary group-hover:bg-primary group-hover:text-white transition-all bg-primary/10 px-2 py-1 rounded-md">
                              View
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="h-[180px] flex flex-col items-center justify-center gap-3 bg-muted/40 rounded-2xl border border-dashed border-border/50">
                    <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-foreground/30" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground/60">Still Searching</p>
                      <span className="text-xs text-foreground/45 mt-0.5 block">Bot is recommending options</span>
                    </div>
                  </div>
                )}
                {/* General visit booking fallback */}
                {targetVisits.length > 0 && targetVisits.every(v => !v.property_id) && (
                  <div className="h-[180px] flex flex-col items-center justify-center gap-3 bg-muted/40 rounded-2xl border border-dashed border-border/50">
                    <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-5 w-5 text-foreground/30" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground/60">General Site Visit</p>
                      <span className="text-xs text-foreground/45 mt-0.5 block">Scheduled for {formatAppointment(targetVisits[0].appointment_date)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visits History list */}
          {lead.visits && lead.visits.length > 0 && (
            <div className="border-t border-border/40 pt-3">
              <p className="text-xs font-bold text-foreground/45 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Site Visits History ({lead.visits.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                {lead.visits.map((v) => (
                  <div key={v.key} className="flex items-center justify-between bg-muted/30 p-2.5 rounded-xl border border-border/50 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <span className="font-bold block sm:inline">{formatAppointment(v.appointment_date)}</span>
                        {v.property_title && (
                          <span className="text-foreground/50 ml-0 sm:ml-1.5 block sm:inline truncate">— {v.property_title}</span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase border flex-shrink-0 ${
                      v.status === "Completed" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                      v.status === "Cancelled" ? "bg-red-500/10 text-red-600 border-red-500/20" :
                      "bg-orange-500/10 text-orange-600 border-orange-500/20"
                    }`}>
                      {v.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer - Actions & Date Added (Full Width) */}
          <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-3">
            {lead.created_at ? (
              <p className="text-[10px] text-foreground/40 font-medium">
                Added {new Date(lead.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at {new Date(lead.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
              </p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onEdit(lead)}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center text-foreground/50"
                title="Edit lead profile"
              >
                <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <button
                onClick={() => onDelete(lead)}
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-muted hover:bg-red-500/10 hover:text-red-500 transition-colors flex items-center justify-center text-foreground/50"
                title="Delete lead"
              >
                <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
