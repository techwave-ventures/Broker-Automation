"use client";

import { BotMessageSquare, Circle, Settings2, Zap, Phone, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { HeaderSetter } from "@/components/layout/HeaderContext";

const BOT_FEATURES = [
    { id: "auto_qualify", label: "Auto-qualify leads", description: "Automatically score and qualify incoming leads based on budget and intent.", enabled: true },
    { id: "schedule_viewings", label: "Schedule viewings", description: "Let the bot book site visits directly in your calendar.", enabled: true },
    { id: "property_recommend", label: "Property recommendations", description: "Suggest matching properties based on buyer preferences.", enabled: true },
    { id: "follow_up", label: "Follow-up reminders", description: "Automatically follow up with cold leads after 48 hours.", enabled: false },
    { id: "multilingual", label: "Multilingual support", description: "Respond in Hindi, Marathi, and English automatically.", enabled: false },
];

export default function WhatsAppAIPage() {
    const [features, setFeatures] = useState(BOT_FEATURES);
    const [masterEnabled, setMasterEnabled] = useState(true);
    const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    // Real-time analytics state
    const [analytics, setAnalytics] = useState({
        msgsToday: 0,
        leadsGenerated: 0,
        autoQualified: 0,
        viewingsBooked: 0
    });

    const fetchConfigAndAnalytics = async () => {
        try {
            // Fetch bot config
            const res = await fetch("/api/bot-configs");
            if (res.ok) {
                const data = await res.json();
                setMasterEnabled(data.is_auto_reply_enabled ?? true);
                setDisplayPhoneNumber(data.display_phone_number ?? "");
                setFeatures([
                    { id: "auto_qualify", label: "Auto-qualify leads", description: "Automatically score and qualify incoming leads based on budget and intent.", enabled: data.auto_qualify ?? true },
                    { id: "schedule_viewings", label: "Schedule viewings", description: "Let the bot book site visits directly in your calendar.", enabled: data.schedule_viewings ?? true },
                    { id: "property_recommend", label: "Property recommendations", description: "Suggest matching properties based on buyer preferences.", enabled: data.property_recommend ?? true },
                    { id: "follow_up", label: "Follow-up reminders", description: "Automatically follow up with cold leads after 48 hours.", enabled: data.is_auto_follow_up_enabled ?? true },
                    { id: "multilingual", label: "Multilingual support", description: "Respond in Hindi, Marathi, and English automatically.", enabled: data.multilingual ?? false },
                ]);
            }

            // Fetch real-time analytics
            const analyticRes = await fetch("/api/analytics");
            if (analyticRes.ok) {
                const analyticData = await analyticRes.json();
                setAnalytics({
                    msgsToday: analyticData.kpis?.totalConversations?.value ?? 0,
                    leadsGenerated: analyticData.kpis?.totalLeads?.value ?? 0,
                    autoQualified: analyticData.kpis?.qualifiedLeads?.value ?? 0,
                    viewingsBooked: analyticData.kpis?.viewingsScheduled?.value ?? 0
                });
            }
        } catch (err) {
            console.error("Failed to load bot config or analytics:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigAndAnalytics();
    }, []);

    const saveConfig = async (updatedFields: any) => {
        setSaving(true);
        try {
            const res = await fetch("/api/bot-configs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedFields),
            });
            if (res.ok) {
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 2000);
            }
        } catch (err) {
            console.error("Failed to save bot config:", err);
        } finally {
            setSaving(false);
        }
    };

    const toggle = (id: string) => {
        setFeatures((prev) => {
            const updated = prev.map((feat) => feat.id === id ? { ...feat, enabled: !feat.enabled } : feat);

            // Map list of features back to backend fields
            const payload: any = {};
            updated.forEach(f => {
                if (f.id === 'follow_up') {
                    payload['is_auto_follow_up_enabled'] = f.enabled;
                } else {
                    payload[f.id] = f.enabled;
                }
            });
            saveConfig(payload);

            return updated;
        });
    };

    const toggleMaster = () => {
        const nextValue = !masterEnabled;
        setMasterEnabled(nextValue);
        saveConfig({ is_auto_reply_enabled: nextValue });
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex items-center gap-3 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Loading AI settings...</span>
                </div>
            </div>
        );
    }

    const hasConnectedPhone = !!displayPhoneNumber;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            <HeaderSetter
                title="Roofiyo Bot"
                subtitle="Configure your AI assistant behavior and integrations"
            />

            {savedNotice && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-4 py-2 rounded-xl text-sm font-semibold animate-fade-in w-fit">
                    Saved successfully!
                </div>
            )}

            {/* Status card */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                            <BotMessageSquare className="h-8 w-8 text-accent" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-lg">Roofiyo Assistant</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <Circle className={`h-2.5 w-2.5 fill-accent text-accent ${masterEnabled ? 'animate-pulse text-emerald-500 fill-emerald-500' : 'text-foreground/30 fill-foreground/30'}`} />
                                <span className="text-sm text-foreground/75 font-medium">
                                    {masterEnabled ? "Online & Responding" : "Paused"}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block mr-2">
                            <p className="text-xs text-foreground/50 font-medium">AI Status</p>
                            <p className={`font-bold text-sm ${masterEnabled ? 'text-emerald-500' : 'text-foreground/45'}`}>
                                {masterEnabled ? 'ACTIVE' : 'INACTIVE'}
                            </p>
                        </div>
                        <button
                            onClick={toggleMaster}
                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-250 ${masterEnabled
                                ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white"
                                }`}
                        >
                            {masterEnabled ? "Pause Bot" : "Activate Bot"}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                    {[
                        { label: "Msgs Today", value: masterEnabled ? analytics.msgsToday.toString() : "0" },
                        { label: "Leads Generated", value: analytics.leadsGenerated.toString() },
                        { label: "Auto-Qualified", value: analytics.autoQualified.toString() },
                        { label: "Viewings Booked", value: analytics.viewingsBooked.toString() },
                    ].map((s) => (
                        <div key={s.label} className="text-center">
                            <p className="text-xl font-bold">{s.value}</p>
                            <p className="text-xs text-foreground/50 mt-0.5">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Channels & Features in same row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Channels */}
                <div className="lg:col-span-1">
                    <div className="bg-card border border-border rounded-2xl p-6 h-full">
                        <h2 className="font-semibold mb-4 flex items-center gap-2">
                            <Phone className="h-5 w-5 text-primary" />
                            Active Channels
                        </h2>
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-background">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Phone className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">WhatsApp Business</p>
                                <p className="text-xs text-foreground/50 truncate">
                                    {hasConnectedPhone ? `+${displayPhoneNumber}` : "No phone number connected"}
                                </p>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${hasConnectedPhone ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive'}`}>
                                {hasConnectedPhone ? "Connected" : "Disconnected"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Bot Features */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden flex flex-col justify-between">
                    <div>
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
                                        role="switch"
                                        aria-checked={feat.enabled}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
                                            feat.enabled ? "bg-primary" : "bg-secondary border border-border"
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                                feat.enabled ? "translate-x-6" : "translate-x-1"
                                            }`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
