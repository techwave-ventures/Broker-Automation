"use client";

import { Users, TrendingUp, Calendar, Flame } from "lucide-react";

interface Lead {
  status: "Upcoming Visit" | "Visited" | "Negotiating" | "Browsing (No Visit)" | "Closed";
  leadScore: "High" | "Medium" | "Low";
  appointmentDate?: string | null;
}

interface Props {
  leads: Lead[];
}

export function LeadsStats({ leads }: Props) {
  const total = leads.length;
  const high = leads.filter((l) => l.leadScore === "High").length;
  const closed = leads.filter((l) => l.status === "Closed").length;
  const convRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  // Visits today: appointment date within today
  const todayStr = new Date().toDateString();
  const visitsToday = leads.filter((l) => {
    if (!l.appointmentDate) return false;
    return new Date(l.appointmentDate).toDateString() === todayStr;
  }).length;

  const stats = [
    {
      label: "Total Leads",
      value: String(total),
      sub: "in your pipeline",
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "High Priority",
      value: String(high),
      sub: "hot prospects",
      icon: Flame,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Visits Today",
      value: String(visitsToday),
      sub: "appointments",
      icon: Calendar,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Conversion",
      value: `${convRate}%`,
      sub: `${closed} deals closed`,
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:shadow-md transition-shadow"
        >
          <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
            <s.icon className={`h-5 w-5 ${s.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none">{s.value}</p>
            <p className="text-[11px] text-foreground/50 mt-0.5 font-medium">{s.label}</p>
            <p className="text-[10px] text-foreground/35 truncate">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
