"use client";

import { Users, TrendingUp, Calendar, Flame } from "lucide-react";

interface Lead {
  status: "Upcoming Visit" | "Visited" | "Negotiating" | "Browsing (No Visit)" | "Closed" | "Lost (Not Interested)";
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-primary/30 hover:-translate-y-1 hover:shadow-xl transition-all group block"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm sm:text-base font-bold text-foreground/80 truncate mr-1">{s.label}</span>
            <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl ${s.bg} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
              <s.icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${s.color}`} />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight">{s.value}</p>
          <p className="text-[10px] sm:text-xs text-foreground/50 mt-1 flex items-center gap-1 truncate">
            {s.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
