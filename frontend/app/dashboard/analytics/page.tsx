"use client";

import { useEffect, useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    Users,
    MessageSquare,
    Building2,
    CalendarCheck,
} from "lucide-react";
import type { AnalyticsData } from "@/lib/api";
import { fetchAnalytics } from "@/lib/api";

function formatNumber(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return String(n);
}

const KPI_META = [
    { key: "totalLeads" as const, label: "Total Leads", icon: Users },
    { key: "qualifiedLeads" as const, label: "Qualified Leads", icon: Building2 },
    { key: "totalConversations" as const, label: "Total Conversations", icon: MessageSquare },
    { key: "viewingsScheduled" as const, label: "Viewings Scheduled", icon: CalendarCheck },
];

function KPISkeleton() {
    return (
        <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
            <div className="h-3 w-24 bg-foreground/10 rounded mb-4" />
            <div className="h-7 w-16 bg-foreground/10 rounded mb-2" />
            <div className="h-3 w-20 bg-foreground/10 rounded" />
        </div>
    );
}

export default function AnalyticsPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics().then((d) => {
            setData(d);
            setLoading(false);
        });
    }, []);

    const weeklyData = data?.weeklyData ?? [];
    const maxLeads = weeklyData.length ? Math.max(...weeklyData.map((d) => d.leads), 1) : 1;
    const maxConv = weeklyData.length ? Math.max(...weeklyData.map((d) => d.conversations), 1) : 1;

    return (
        <div className="p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                <p className="text-foreground/60 text-sm mt-1">Performance overview for the last 30 days</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {loading
                    ? Array.from({ length: 4 }).map((_, i) => <KPISkeleton key={i} />)
                    : KPI_META.map(({ key, label, icon: Icon }) => {
                        const kpi = data?.kpis[key];
                        const value = kpi?.value ?? 0;
                        const change = kpi?.change ?? "0%";
                        const up = kpi?.up ?? true;
                        return (
                            <div key={key} className="bg-card border border-border rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-foreground/60 font-medium">{label}</span>
                                    <Icon className="h-4 w-4 text-foreground/30" />
                                </div>
                                <p className="text-2xl font-bold">{formatNumber(value)}</p>
                                <span
                                    className={`text-xs font-semibold flex items-center gap-1 mt-1 ${up ? "text-accent" : "text-red-500"
                                        }`}
                                >
                                    {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {change} vs last month
                                </span>
                            </div>
                        );
                    })}
            </div>

            {/* Bar Chart */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold mb-6">Weekly Activity</h2>
                {loading ? (
                    <div className="h-48 flex items-end gap-3 animate-pulse">
                        {[60, 90, 45, 110, 75, 50, 100].map((h, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className="w-full bg-foreground/10 rounded-t-lg" style={{ height: `${h}px` }} />
                                <div className="h-2 w-6 bg-foreground/10 rounded" />
                            </div>
                        ))}
                    </div>
                ) : weeklyData.length === 0 ? (
                    <p className="text-foreground/40 text-sm text-center py-12">No activity in the last 7 days</p>
                ) : (
                    <>
                        <div className="flex items-end gap-3 h-48">
                            {weeklyData.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="w-full flex gap-1 items-end" style={{ height: "160px" }}>
                                        {/* Conversations bar */}
                                        <div
                                            className="flex-1 bg-primary/20 rounded-t-lg hover:bg-primary/40 transition-colors relative group"
                                            style={{ height: `${(d.conversations / maxConv) * 100}%`, minHeight: d.conversations > 0 ? "4px" : "0" }}
                                        >
                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-foreground/60 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                                {d.conversations}
                                            </span>
                                        </div>
                                        {/* Leads bar */}
                                        <div
                                            className="flex-1 bg-primary rounded-t-lg hover:bg-primary/90 transition-colors relative group"
                                            style={{ height: `${(d.leads / maxLeads) * 100}%`, minHeight: d.leads > 0 ? "4px" : "0" }}
                                        >
                                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-primary font-semibold opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                                {d.leads}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-foreground/50">{d.day}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-6 mt-4 text-xs font-medium text-foreground/60">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm bg-primary" />
                                <span>Leads</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-sm bg-primary/20" />
                                <span>Conversations</span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Top Performing Properties */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="font-semibold">Top Performing Listings</h2>
                </div>
                <div className="divide-y divide-border">
                    {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                                <div className="h-5 w-5 bg-foreground/10 rounded" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-40 bg-foreground/10 rounded" />
                                    <div className="h-2 w-24 bg-foreground/10 rounded" />
                                </div>
                                <div className="space-y-2 text-right">
                                    <div className="h-3 w-16 bg-foreground/10 rounded" />
                                    <div className="h-2 w-12 bg-foreground/10 rounded" />
                                </div>
                            </div>
                        ))
                    ) : !data?.topProperties?.length ? (
                        <p className="text-foreground/40 text-sm text-center py-12">No listing data yet.</p>
                    ) : (
                        data.topProperties.map((p, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4">
                                <span className="text-foreground/30 font-bold text-lg w-6">{i + 1}</span>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{p.name}</p>
                                    <p className="text-xs text-foreground/50">{p.conv} conversations</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm text-primary">{p.leads} leads</p>
                                    <p className="text-xs text-accent">{p.rate} CVR</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
