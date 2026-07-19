"use client";

import { BotMessageSquare, Circle, MessageSquare, Settings2, Zap, Phone, Globe } from "lucide-react";
import { useState } from "react";

const BOT_FEATURES = [
    { id: "auto_qualify", label: "Auto-qualify leads", description: "Automatically score and qualify incoming leads based on budget and intent.", enabled: true },
    { id: "schedule_viewings", label: "Schedule viewings", description: "Let the bot book site visits directly in your calendar.", enabled: true },
    { id: "property_recommend", label: "Property recommendations", description: "Suggest matching properties based on buyer preferences.", enabled: true },
    { id: "follow_up", label: "Follow-up reminders", description: "Automatically follow up with cold leads after 48 hours.", enabled: false },
    { id: "multilingual", label: "Multilingual support", description: "Respond in Hindi, Marathi, and English automatically.", enabled: false },
];

export default function WhatsAppAIPage() {
    const [features, setFeatures] = useState(BOT_FEATURES);

    const toggle = (id: string) => {
        setFeatures((f) => f.map((feat) => feat.id === id ? { ...feat, enabled: !feat.enabled } : feat));
    };

    return (
        <div className="p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">WhatsApp AI Bot</h1>
                <p className="text-foreground/60 text-sm mt-1">Configure your AI assistant behavior and integrations</p>
            </div>

            {/* Status card */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                            <BotMessageSquare className="h-8 w-8 text-accent" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg">PropBot Assistant</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Circle className="h-2.5 w-2.5 fill-accent text-accent animate-pulse" />
                                <span className="text-sm text-accent font-medium">Online & Responding</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <p className="text-xs text-foreground/50">Response time</p>
                            <p className="font-bold text-primary">&lt; 2s avg</p>
                        </div>
                        <button className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary hover:text-white transition-colors">
                            Test Bot
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                    {[
                        { label: "Msgs Today", value: "347" },
                        { label: "Leads Generated", value: "18" },
                        { label: "Auto-Qualified", value: "11" },
                        { label: "Viewings Booked", value: "6" },
                    ].map((s) => (
                        <div key={s.label} className="text-center">
                            <p className="text-xl font-bold">{s.value}</p>
                            <p className="text-xs text-foreground/50 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Channels */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Active Channels
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                    {[
                        { icon: Phone, label: "WhatsApp Business", status: "Connected", number: "+91 98765 12345" },
                        { icon: Globe, label: "Website Chat Widget", status: "Active", number: "propbot.in/widget" },
                    ].map((ch, i) => (
                        <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-background">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <ch.icon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{ch.label}</p>
                                <p className="text-xs text-foreground/50 truncate">{ch.number}</p>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-accent/10 text-accent">{ch.status}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features toggles */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center gap-2">
                    <Settings2 className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Bot Features</h2>
                </div>
                <div className="divide-y divide-border">
                    {features.map((feat) => (
                        <div key={feat.id} className="flex items-center gap-4 px-6 py-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <Zap className={`h-4 w-4 ${feat.enabled ? "text-primary" : "text-foreground/30"}`} />
                                    <p className="font-medium text-sm">{feat.label}</p>
                                </div>
                                <p className="text-xs text-foreground/50 mt-0.5 ml-6">{feat.description}</p>
                            </div>
                            <button
                                id={`toggle-${feat.id}`}
                                onClick={() => toggle(feat.id)}
                                className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${feat.enabled ? "bg-primary" : "bg-border"}`}
                            >
                                <span
                                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${feat.enabled ? "translate-x-5" : "translate-x-0.5"}`}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Bot Instructions</h2>
                </div>
                <textarea
                    defaultValue="You are PropBot, a helpful real estate assistant for Sunrise Realty. Help buyers find the right property by understanding their budget, location, and requirements. Be polite, professional, and respond in the same language the user writes in. Always try to schedule a site visit after gathering the buyer's requirements."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm resize-none leading-relaxed"
                />
                <button className="mt-3 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                    Save Instructions
                </button>
            </div>
        </div>
    );
}
