import Link from "next/link";
import {
    Building2,
    Users,
    MessageSquare,
    TrendingUp,
    ArrowUpRight,
    BotMessageSquare,
    Circle,
    FileText
} from "lucide-react";
import { fetchProperties, fetchLeads, fetchChats, getSessionUser, fetchWabas, fetchTemplates, fetchPhones } from "@/lib/api";
import { HeaderSetter } from "@/components/layout/HeaderContext";

const statusColors: Record<string, string> = {
    new: "bg-primary text-primary-foreground",
    qualified: "bg-accent text-accent-foreground",
    viewing: "bg-orange-500 text-white",
    closed: "bg-emerald-500 text-white"
};

export default async function DashboardPage() {
    const user = await getSessionUser();
    const displayName = user?.name || (user?.email ? user.email.split('@')[0] : "Local Dev User");

    // Fetch dynamic database counts
    const [properties, leads, chats, wabas, phones] = await Promise.all([
        fetchProperties(),
        fetchLeads(),
        fetchChats(),
        fetchWabas(),
        fetchPhones()
    ]);

    let templateCount = 0;
    if (wabas && wabas.length > 0) {
        try {
            const templates = await fetchTemplates(wabas[0].waba_id);
            templateCount = templates.length;
        } catch (e) {
            console.error(e);
        }
    }

    const activeLeadsCount = leads.filter((l: any) => l.status !== 'Closed').length;
    const closedLeadsCount = leads.filter((l: any) => l.status === 'Closed').length;
    const conversionRate = leads.length > 0
        ? ((closedLeadsCount / leads.length) * 100).toFixed(1) + '%'
        : '0.0%';

    const stats = [
        {
            label: "Total Properties",
            value: String(properties.length),
            change: "Live listings",
            icon: Building2,
            color: "text-primary",
            bg: "bg-primary/10",
            href: "/dashboard/properties",
        },
        {
            label: "Active Leads",
            value: String(activeLeadsCount),
            change: `${leads.length - activeLeadsCount} closed`,
            icon: Users,
            color: "text-accent",
            bg: "bg-accent/10",
            href: "/dashboard/leads",
        },
        {
            label: "Conversations",
            value: String(chats.length),
            change: "AI & Human chats",
            icon: MessageSquare,
            color: "text-secondary",
            bg: "bg-secondary/10",
            href: "/dashboard/conversations",
        },
        {
            label: "Templates",
            value: String(templateCount),
            change: "Message templates",
            icon: FileText,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            href: "/dashboard/templates",
        },
    ];

    const recentLeadsMapped = leads.slice(0, 5).map((lead: any) => {
        let statusKey = 'new';
        if (lead.status === 'Visited' || lead.status === 'Negotiating' || lead.status === 'Upcoming Visit') {
            statusKey = 'qualified';
        } else if (lead.status === 'Closed') {
            statusKey = 'closed';
        }

        let displayTime = 'recent';
        if (lead.created_at) {
            const diffMs = Date.now() - new Date(lead.created_at).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 60) displayTime = `${diffMins}m ago`;
            else {
                const diffHrs = Math.floor(diffMins / 60);
                if (diffHrs < 24) displayTime = `${diffHrs}h ago`;
                else displayTime = new Date(lead.created_at).toLocaleDateString();
            }
        }

        return {
            name: lead.customerName,
            query: lead.visits?.[0]?.property_title || lead.requestedLocality || 'Browsing Properties',
            time: displayTime,
            status: statusKey
        };
    });

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <HeaderSetter
                title="Overview"
            />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => {
                    const content = (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm sm:text-base font-bold text-foreground/80 truncate mr-1">{stat.label}</span>
                                <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-xl ${stat.bg} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                                    <stat.icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${stat.color}`} />
                                </div>
                            </div>
                            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{stat.value}</p>
                            <p className="text-[10px] sm:text-xs text-foreground/50 mt-1 flex items-center gap-1 truncate">
                                <ArrowUpRight className="h-3 w-3 text-accent flex-shrink-0" />
                                {stat.change}
                            </p>
                        </>
                    );

                    const className = "bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-primary/30 hover:-translate-y-1 hover:shadow-xl transition-all group block cursor-pointer";

                    if (stat.href) {
                        return (
                            <Link key={i} href={stat.href} className={className}>
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <div key={i} className={className.replace("cursor-pointer", "")}>
                            {content}
                        </div>
                    );
                })}
            </div>

            {/* Recent Leads + Bot Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Recent Leads */}
                <div className="lg:col-span-2 xl:col-span-3 bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">Recent Leads</h2>
                        <Link href="/dashboard/leads" className="text-xs text-primary hover:underline flex items-center gap-1">
                            View all <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-border">
                        {recentLeadsMapped.map((lead, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-border/30 transition-colors">
                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                                    {(lead.name?.[0] || 'L')}
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

                {/* Right Column: Status Cards */}
                <div className="space-y-6">
                    {/* Bot Status */}
                    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">AI Bot Status</h2>
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

                    {/* WhatsApp Health & Limits */}
                    {phones && phones.length > 0 && (
                        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
                            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">WhatsApp Health</h2>
                            {phones.map((phone: any) => {
                                let qualityColor = "text-foreground/80 bg-foreground/10";
                                if (phone.quality_rating === "GREEN" || phone.quality_rating === "HIGH") {
                                    qualityColor = "text-emerald-500 bg-emerald-500/10";
                                } else if (phone.quality_rating === "YELLOW" || phone.quality_rating === "MEDIUM") {
                                    qualityColor = "text-amber-500 bg-amber-500/10";
                                } else if (phone.quality_rating === "RED" || phone.quality_rating === "LOW") {
                                    qualityColor = "text-red-500 bg-red-500/10";
                                }

                                let statusColor = "text-foreground/60";
                                if (phone.status === "CONNECTED") {
                                    statusColor = "text-emerald-500 font-semibold";
                                } else if (phone.status === "FLAGGED") {
                                    statusColor = "text-amber-500 font-semibold";
                                } else if (phone.status === "RESTRICTED") {
                                    statusColor = "text-red-500 font-semibold";
                                }

                                return (
                                    <div key={phone.phone_id} className="space-y-4 border-b border-border/50 last:border-0 pb-4 last:pb-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-foreground/80">
                                                {String(phone.display_phone_number || phone.phone_id).startsWith('+') ? '' : '+'}{phone.display_phone_number || phone.phone_id}
                                            </span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${qualityColor}`}>
                                                Quality: {phone.quality_rating}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs sm:text-sm">
                                                <span className="text-foreground/60">Phone Status</span>
                                                <span className={statusColor}>{phone.status}</span>
                                            </div>
                                            <div className="flex justify-between text-xs sm:text-sm">
                                                <span className="text-foreground/60">Messaging Limit</span>
                                                <span className="font-semibold text-foreground/80">{phone.messaging_limit}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
