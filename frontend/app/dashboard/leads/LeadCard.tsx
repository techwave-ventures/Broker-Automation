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
} from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

export interface Lead {
  key: string;
  customerName: string;
  customerPhone: string;
  requestedLocality?: string;
  budget?: string;
  otherReqs?: string;
  interestedPropertyId?: string;
  interestedPropertyTitle?: string | null;
  appointmentDate?: string | null;
  status: "Upcoming Visit" | "Visited" | "Negotiating" | "Browsing (No Visit)" | "Closed";
  leadScore: "High" | "Medium" | "Low";
}

interface Props {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (id: string, status: Lead["status"]) => Promise<void>;
  animIndex?: number;
}

const STATUSES: Lead["status"][] = [
  "Browsing (No Visit)",
  "Upcoming Visit",
  "Visited",
  "Negotiating",
  "Closed",
];

const statusStyle: Record<Lead["status"], string> = {
  "Upcoming Visit": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "Visited": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Negotiating": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Browsing (No Visit)": "bg-foreground/8 text-foreground/60 border-border",
  "Closed": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
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
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (dStr === todayStr) return `Today, ${timeStr}`;
  if (dStr === tomorrowStr) return `Tomorrow, ${timeStr}`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + ", " + timeStr;
}

export function LeadCard({ lead, onEdit, onDelete, onStatusChange, animIndex = 0 }: Props) {
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
          className="pt-3 border-t border-border/50 animate-fade-in flex flex-col gap-4"
          onClick={(e) => e.stopPropagation()}
        >
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

          {/* Property & Appointment — stacks on mobile, side-by-side on md+ */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Interested Property */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground/40 uppercase tracking-widest mb-2">
                Interested Property
              </p>
              {lead.interestedPropertyId && lead.interestedPropertyTitle ? (
                <Link
                  href={`/dashboard/properties/${lead.interestedPropertyId}`}
                  className="group flex items-start gap-3 bg-secondary/10 hover:bg-secondary/20 p-3 rounded-xl transition-colors border border-transparent hover:border-secondary/30"
                >
                  <div className="h-9 w-9 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">
                      {lead.interestedPropertyTitle}
                    </p>
                    <span className="text-xs text-primary flex items-center gap-1 mt-1">
                      View Listing <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
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

            {/* Appointment & Actions */}
            <div className="flex items-center justify-between gap-3 md:flex-col md:items-end md:justify-start md:w-auto md:min-w-[140px]">
              <div className="flex items-center gap-2 min-w-0">
                {lead.appointmentDate ? (
                  <>
                    <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-bold text-foreground/40 leading-none mb-0.5">Appt</p>
                      <p className="text-sm font-bold truncate">{formatAppointment(lead.appointmentDate)}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 text-primary/40 flex-shrink-0" />
                    <p className="text-sm font-medium text-foreground/50 italic">Chat active</p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onEdit(lead)}
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-muted hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center text-foreground/50"
                  title="Edit lead"
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
        </div>
      )}
    </div>
  );
}
