import Link from "next/link";
import {
    Building2,
    Users,
    MessageSquare,
    TrendingUp,
    ArrowUpRight,
    BotMessageSquare,
    Circle,
} from "lucide-react";

const stats = [
    {
        label: "Total Properties",
        value: "24",
        change: "+3 this week",
        icon: Building2,
        color: "text-primary",
        bg: "bg-primary/10",
    },
    {
        label: "Active Leads",
        value: "142",
        change: "+18 today",
        icon: Users,
        color: "text-accent",
        bg: "bg-accent/10",
    },
    {
        label: "Conversations",
        value: "1,204",
        change: "+89 today",
        icon: MessageSquare,
        color: "text-secondary",
        bg: "bg-secondary/10",
    },
    {
        label: "Conversion Rate",
        value: "6.4%",
        change: "+1.2% vs last week",
        icon: TrendingUp,
        color: "text-orange-500",
        bg: "bg-orange-500/10",
    },
];

const recentLeads = [
    { name: "Aarav Shah", query: "3 BHK in Baner", time: "2m ago", status: "new" },
    { name: "Priya Desai", query: "2 BHK under ₹60L", time: "18m ago", status: "qualified" },
    { name: "Rohan Mehta", query: "Villa in Koregaon Park", time: "1h ago", status: "viewing" },
    { name: "Sneha Patil", query: "Office space 1000 sqft", time: "3h ago", status: "new" },
    { name: "Karan Joshi", query: "Flat near Hinjewadi", time: "5h ago", status: "qualified" },
];

const statusColors: Record<string, string> = {
    new: "bg-primary text-primary-foreground",
    qualified: "bg-accent text-accent-foreground",
    viewing: "bg-orange-500 text-white",
};

export default function DashboardPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Good morning, Vishal 👋</h1>
                    <p className="text-foreground/60 text-sm mt-1">
                        Here&apos;s what&apos;s happening with your properties today.
                    </p>
                </div>
                <Link
                    href="/dashboard/properties/add"
                    className="hidden sm:flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all hover:scale-105"
                >
                    <Building2 className="h-4 w-4" />
                    Add Property
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div
                        key={i}
                        className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-colors group"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-foreground/60 font-medium">{stat.label}</span>
                            <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                        <p className="text-xs text-foreground/50 mt-1 flex items-center gap-1">
                            <ArrowUpRight className="h-3 w-3 text-accent" />
                            {stat.change}
                        </p>
                    </div>
                ))}
            </div>

            {/* Recent Leads + Bot Status */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Recent Leads */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="font-semibold">Recent Leads</h2>
                        <Link href="/dashboard/leads" className="text-xs text-primary hover:underline flex items-center gap-1">
                            View all <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-border">
                        {recentLeads.map((lead, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-border/30 transition-colors">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                                    {lead.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{lead.name}</p>
                                    <p className="text-xs text-foreground/50 truncate">{lead.query}</p>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[lead.status]}`}>
                                        {lead.status}
                                    </span>
                                    <span className="text-xs text-foreground/40">{lead.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bot Status */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                    <h2 className="font-semibold">AI Bot Status</h2>
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10 border border-accent/20">
                        <BotMessageSquare className="h-6 w-6 text-accent" />
                        <div>
                            <p className="text-sm font-semibold text-accent">Active & Running</p>
                            <p className="text-xs text-foreground/60">Responding on WhatsApp & Web</p>
                        </div>
                        <Circle className="h-2.5 w-2.5 fill-accent text-accent ml-auto animate-pulse" />
                    </div>
                    <div className="space-y-3">
                        {[
                            { label: "Avg. Response Time", value: "< 2s" },
                            { label: "Messages Today", value: "347" },
                            { label: "Auto-Qualified Leads", value: "18" },
                            { label: "Viewings Scheduled", value: "6" },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between text-sm">
                                <span className="text-foreground/60">{item.label}</span>
                                <span className="font-semibold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                    <Link
                        href="/dashboard/whatsapp-ai"
                        className="block text-center text-sm text-primary font-medium hover:underline"
                    >
                        Configure bot →
                    </Link>
                </div>
            </div>
        </div>
    );
}
