import {
    TrendingUp,
    TrendingDown,
    Users,
    MessageSquare,
    Building2,
    CalendarCheck,
} from "lucide-react";

const kpis = [
    { label: "Total Leads", value: "1,204", change: "+18%", up: true, icon: Users },
    { label: "Qualified Leads", value: "372", change: "+12%", up: true, icon: Building2 },
    { label: "Total Conversations", value: "8,951", change: "+24%", up: true, icon: MessageSquare },
    { label: "Viewings Scheduled", value: "86", change: "-4%", up: false, icon: CalendarCheck },
];

const weeklyData = [
    { day: "Mon", leads: 40, conversations: 120 },
    { day: "Tue", leads: 55, conversations: 180 },
    { day: "Wed", leads: 32, conversations: 95 },
    { day: "Thu", leads: 70, conversations: 240 },
    { day: "Fri", leads: 65, conversations: 210 },
    { day: "Sat", leads: 90, conversations: 310 },
    { day: "Sun", leads: 48, conversations: 155 },
];

const maxLeads = Math.max(...weeklyData.map((d) => d.leads));
const maxConv = Math.max(...weeklyData.map((d) => d.conversations));

export default function AnalyticsPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                <p className="text-foreground/60 text-sm mt-1">Performance overview for the last 30 days</p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div key={i} className="bg-card border border-border rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-foreground/60 font-medium">{kpi.label}</span>
                            <kpi.icon className="h-4 w-4 text-foreground/30" />
                        </div>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                        <span className={`text-xs font-semibold flex items-center gap-1 mt-1 ${kpi.up ? "text-accent" : "text-red-500"}`}>
                            {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {kpi.change} vs last month
                        </span>
                    </div>
                ))}
            </div>

            {/* Bar Chart */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold mb-6">Weekly Activity</h2>
                <div className="flex items-end gap-3 h-48">
                    {weeklyData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full flex gap-1 items-end" style={{ height: "160px" }}>
                                {/* Conversations bar */}
                                <div
                                    className="flex-1 bg-primary/20 rounded-t-lg hover:bg-primary/40 transition-colors relative group"
                                    style={{ height: `${(d.conversations / maxConv) * 100}%` }}
                                >
                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-foreground/60 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                                        {d.conversations}
                                    </span>
                                </div>
                                {/* Leads bar */}
                                <div
                                    className="flex-1 bg-primary rounded-t-lg hover:bg-primary/90 transition-colors relative group"
                                    style={{ height: `${(d.leads / maxLeads) * 100}%` }}
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
            </div>

            {/* Top Performing Properties */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="font-semibold">Top Performing Listings</h2>
                </div>
                <div className="divide-y divide-border">
                    {[
                        { name: "Luxury 3 BHK, Baner", leads: 42, conv: 128, rate: "32.8%" },
                        { name: "Spacious Villa, Koregaon Park", leads: 37, conv: 94, rate: "39.4%" },
                        { name: "Modern 2 BHK, Hinjewadi", leads: 29, conv: 87, rate: "33.3%" },
                        { name: "Premium Penthouse, Kalyani Nagar", leads: 24, conv: 61, rate: "39.3%" },
                    ].map((p, i) => (
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
                    ))}
                </div>
            </div>
        </div>
    );
}
