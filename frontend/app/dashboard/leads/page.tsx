"use client";

import { useState } from "react";
import { Search, Filter, Phone, MessageSquare, Calendar, MapPin, Building2, ExternalLink, Clock, MoreVertical, CheckCircle2 } from "lucide-react";
import Link from "next/link";

interface Lead {
    id: string;
    customerName: string;
    customerPhone: string;
    requestedLocality: string;
    budget: string;
    otherReqs: string;
    interestedPropertyId: string;
    interestedPropertyTitle: string | null;
    appointmentDate: string | null;
    status: "Upcoming Visit" | "Visited" | "Negotiating" | "Browsing (No Visit)" | "Closed";
    leadScore: "High" | "Medium" | "Low";
}

const MOCK_LEADS: Lead[] = [
    {
        id: "L1",
        customerName: "Rahul Sharma",
        customerPhone: "+91 98765 43210",
        requestedLocality: "Baner",
        budget: "₹80L - ₹90L",
        otherReqs: "3 BHK, Semi-Furnished, High Floor",
        interestedPropertyId: "1",
        interestedPropertyTitle: "Luxury 3 BHK Apartment",
        appointmentDate: "Today, 4:00 PM",
        status: "Upcoming Visit",
        leadScore: "High"
    },
    {
        id: "L2",
        customerName: "Priya Desai",
        customerPhone: "+91 91234 56789",
        requestedLocality: "Hinjewadi",
        budget: "Up to ₹40,000/mo (Rent)",
        otherReqs: "2 BHK or Office, Fully Furnished",
        interestedPropertyId: "2",
        interestedPropertyTitle: "Premium Office Space",
        appointmentDate: "Tomorrow, 11:30 AM",
        status: "Upcoming Visit",
        leadScore: "Medium"
    },
    {
        id: "L3",
        customerName: "Sneha Patil",
        customerPhone: "+91 95555 44444",
        requestedLocality: "Kothrud",
        budget: "₹60L",
        otherReqs: "1 BHK, Near Metro Station",
        interestedPropertyId: "",
        interestedPropertyTitle: null,
        appointmentDate: null,
        status: "Browsing (No Visit)",
        leadScore: "Low"
    },
    {
        id: "L4",
        customerName: "Amit Patel",
        customerPhone: "+91 90000 11111",
        requestedLocality: "Wakad / Baner",
        budget: "₹1.2 Cr - 1.5 Cr",
        otherReqs: "Ready to move, 4 BHK Villa",
        interestedPropertyId: "1",
        interestedPropertyTitle: "Luxury 3 BHK Apartment", // Example fallback
        appointmentDate: "July 18, 10:00 AM",
        status: "Visited",
        leadScore: "High"
    }
];

export default function LeadsPage() {
    const [leads] = useState<Lead[]>(MOCK_LEADS);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const statuses = ["All", "Upcoming Visit", "Browsing (No Visit)", "Visited", "Negotiating", "Closed"];

    const filtered = leads.filter(l =>
        (l.customerName.toLowerCase().includes(search.toLowerCase()) || l.customerPhone.includes(search)) &&
        (statusFilter === "All" || l.status === statusFilter)
    );

    return (
        <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Active Leads</h1>
                    <p className="text-foreground/60 text-sm mt-1 max-w-lg">
                        Clients interacting with your WhatsApp AI. Monitor ongoing chats and confirmed property visits.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                    <input
                        type="text"
                        placeholder="Search name or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <Filter className="h-4 w-4 text-foreground/40 flex-shrink-0" />
                    {statuses.map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === s
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-card border border-border text-foreground/70 hover:border-primary/50"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {filtered.map(lead => (
                    <div key={lead.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:border-primary/30 transition-all">
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Left: User Info */}
                            <div className="flex-shrink-0 lg:w-1/4">
                                <div className="flex items-start gap-4">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                        {lead.customerName[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{lead.customerName}</h3>
                                        <p className="text-foreground/60 text-sm flex items-center gap-1.5 mt-0.5">
                                            <Phone className="h-3 w-3" /> {lead.customerPhone}
                                        </p>
                                        <div className="mt-3 flex gap-2">
                                            <button className="h-8 w-8 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500 hover:text-white transition-colors flex items-center justify-center pointer" title="WhatsApp Message">
                                                <MessageSquare className="h-4 w-4" />
                                            </button>
                                            <button className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white transition-colors flex items-center justify-center" title="Call">
                                                <Phone className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden lg:block w-px bg-border my-2" />

                            {/* Middle: AI Context & Requirements */}
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        AI Extracted Requirements
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 text-foreground/80">
                                            <MapPin className="h-3 w-3 text-foreground/40" /> {lead.requestedLocality}
                                        </span>
                                        <span className="bg-background border border-border px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 text-foreground/80">
                                            <Building2 className="h-3 w-3 text-foreground/40" /> {lead.budget}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-foreground/70 bg-muted/50 p-2.5 rounded-lg border border-border/50">
                                    "{lead.otherReqs}"
                                </p>
                            </div>

                            <div className="hidden lg:block w-px bg-border my-2" />

                            {/* Right: Property & Action */}
                            <div className="flex-shrink-0 lg:w-1/3 flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-bold text-foreground/50 uppercase tracking-wider mb-2">
                                        Property Context
                                    </p>
                                    {lead.interestedPropertyId && lead.interestedPropertyTitle ? (
                                        <Link href={`/dashboard/properties/${lead.interestedPropertyId}`} className="group flex items-start gap-3 bg-secondary/20 hover:bg-secondary/40 p-2.5 rounded-xl transition-colors border border-transparent hover:border-secondary/50 truncate">
                                            <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Building2 className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">{lead.interestedPropertyTitle}</p>
                                                <span className="text-xs text-primary flex items-center gap-1 mt-0.5">
                                                    View Listing <ExternalLink className="h-3 w-3" />
                                                </span>
                                            </div>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3 bg-muted/50 p-2.5 rounded-xl border border-dashed border-border/60">
                                            <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Search className="h-5 w-5 text-foreground/40" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-foreground/70">Still searching...</p>
                                                <span className="text-[11px] text-foreground/50">Bot is recommending listings</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                                    <div className="flex items-center gap-2">
                                        {lead.appointmentDate ? (
                                            <>
                                                <Clock className="h-4 w-4 text-orange-500" />
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-foreground/40 leading-tight">Appointment</p>
                                                    <p className="text-sm font-bold">{lead.appointmentDate}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <MessageSquare className="h-4 w-4 text-primary/50" />
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-foreground/40 leading-tight">Chat Status</p>
                                                    <p className="text-sm font-semibold text-foreground/60 italic">Chat in progress...</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div>
                                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-sm ${lead.status === "Upcoming Visit" ? "bg-orange-500/10 text-orange-600 border-orange-500/20" :
                                                lead.status === "Visited" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                                                    lead.status === "Negotiating" ? "bg-purple-500/10 text-purple-600 border-purple-500/20" :
                                                        lead.status === "Browsing (No Visit)" ? "bg-foreground/10 text-foreground/60 border-border" :
                                                            "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-foreground/40 bg-card rounded-3xl border border-dashed border-border">
                        <Calendar className="h-12 w-12 mb-3 opacity-30" />
                        <p className="font-medium">No confirmed visits yet</p>
                        <p className="text-sm">Wait for your AI bot to schedule appointments.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
