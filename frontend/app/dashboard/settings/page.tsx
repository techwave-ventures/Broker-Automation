"use client";

import { useState } from "react";
import {
    BotMessageSquare, Bell, CreditCard, Shield, Trash2, ChevronRight,
    CheckCircle2, Smartphone, QrCode, Zap, Globe, Lock, LogOut, RefreshCw,
    ToggleLeft, ToggleRight, Info
} from "lucide-react";

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? "bg-primary" : "bg-border"}`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
        </button>
    );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-base font-bold">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-6 py-4 border-b border-border/50 last:border-0">
            <div className="min-w-0">
                <p className="font-semibold text-sm">{label}</p>
                {description && <p className="text-xs text-foreground/50 mt-0.5 leading-relaxed">{description}</p>}
            </div>
            <div className="flex-shrink-0">{children}</div>
        </div>
    );
}

export default function SettingsPage() {
    const [toast, setToast] = useState<string | null>(null);

    // WhatsApp Bot
    const [botConnected] = useState(true);
    const [autoReply, setAutoReply] = useState(true);
    const [language, setLanguage] = useState("English");

    // AI Behaviour
    const [sendPropertyLinks, setSendPropertyLinks] = useState(true);
    const [autoFollowUp, setAutoFollowUp] = useState(true);
    const [followUpDelay, setFollowUpDelay] = useState("24");
    const [tone, setTone] = useState("Professional");

    // Notifications
    const [notifNewLead, setNotifNewLead] = useState(true);
    const [notifAppointment, setNotifAppointment] = useState(true);
    const [notifWeeklyReport, setNotifWeeklyReport] = useState(false);

    const triggerToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 relative">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in bg-card px-5 py-3.5 rounded-xl shadow-2xl border border-primary/20 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                    <span className="font-semibold text-sm">{toast}</span>
                </div>
            )}

            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-foreground/50 mt-1">Manage your PropBot AI workspace and integrations.</p>
            </div>

            {/* ── 1. WhatsApp Bot Connection ── */}
            <SectionCard title="WhatsApp Bot" icon={Smartphone}>
                {/* Connection Status */}
                <div className={`flex items-center gap-4 p-4 rounded-2xl border mb-6 ${botConnected ? "bg-emerald-500/5 border-emerald-500/20" : "bg-destructive/5 border-destructive/20"}`}>
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${botConnected ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                        <Smartphone className={`h-6 w-6 ${botConnected ? "text-emerald-500" : "text-destructive"}`} />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold">{botConnected ? "Bot Connected" : "Not Connected"}</p>
                        <p className="text-sm text-foreground/60">{botConnected ? "+91 98765 43210 — Sunrise Realty WhatsApp" : "Scan the QR code below to connect your WhatsApp"}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${botConnected ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                        {botConnected ? "● Live" : "Offline"}
                    </span>
                </div>

                {!botConnected && (
                    <div className="flex flex-col items-center bg-muted/50 border border-dashed border-border rounded-2xl p-8 mb-6">
                        <QrCode className="h-32 w-32 text-foreground/20 mb-3" />
                        <p className="text-sm font-medium text-foreground/60">Scan with WhatsApp on your phone</p>
                    </div>
                )}

                <SettingRow label="Auto-Reply on WhatsApp" description="Bot automatically responds to incoming messages 24/7.">
                    <ToggleSwitch checked={autoReply} onChange={setAutoReply} />
                </SettingRow>

                <SettingRow label="Bot Response Language" description="Language the bot uses when communicating with customers.">
                    <select
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-background border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        {["English", "Hindi", "Marathi", "Hinglish"].map(l => <option key={l}>{l}</option>)}
                    </select>
                </SettingRow>

                <div className="mt-4 flex gap-3">
                    <button
                        onClick={() => triggerToast("Reconnecting WhatsApp bot...")}
                        className="px-4 py-2.5 bg-muted border border-border rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-foreground/10 transition-colors"
                    >
                        <RefreshCw className="h-4 w-4" /> Reconnect
                    </button>
                    <button className="px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/20 transition-colors">
                        <Globe className="h-4 w-4" /> Test Bot Response
                    </button>
                </div>
            </SectionCard>

            {/* ── 2. AI Behaviour ── */}
            <SectionCard title="AI Behaviour" icon={BotMessageSquare}>
                <SettingRow label="Auto-send Property Links" description="Bot automatically generates and sends property listing links based on customer requirements.">
                    <ToggleSwitch checked={sendPropertyLinks} onChange={setSendPropertyLinks} />
                </SettingRow>

                <SettingRow label="Auto Follow-up" description="Automatically send a follow-up message after the lead has clicked the property link but hasn't confirmed a visit.">
                    <ToggleSwitch checked={autoFollowUp} onChange={setAutoFollowUp} />
                </SettingRow>

                {autoFollowUp && (
                    <SettingRow label="Follow-up Delay" description="Time to wait before sending a follow-up message.">
                        <select
                            value={followUpDelay}
                            onChange={e => setFollowUpDelay(e.target.value)}
                            className="px-3 py-2 rounded-lg bg-background border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="6">After 6 hours</option>
                            <option value="12">After 12 hours</option>
                            <option value="24">After 24 hours</option>
                            <option value="48">After 48 hours</option>
                        </select>
                    </SettingRow>
                )}

                <SettingRow label="Bot Communication Tone" description="Determines how formal or casual the AI is when talking to customers.">
                    <div className="flex gap-2">
                        {["Professional", "Friendly", "Concise"].map(t => (
                            <button
                                key={t}
                                onClick={() => setTone(t)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${tone === t ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border hover:border-primary/50"}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </SettingRow>

                <div className="mt-2 flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 p-3 rounded-xl">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        The AI is trained on your current property listings. When you add a new property it becomes available to the bot within minutes.
                    </p>
                </div>

                <div className="mt-4 flex justify-end">
                    <button onClick={() => triggerToast("AI behaviour saved!")} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-transform active:scale-95">
                        Save AI Settings
                    </button>
                </div>
            </SectionCard>

            {/* ── 3. Notifications ── */}
            <SectionCard title="Notifications" icon={Bell}>
                <SettingRow label="New Lead Alert" description="Get notified instantly via email when a new lead is confirmed.">
                    <ToggleSwitch checked={notifNewLead} onChange={setNotifNewLead} />
                </SettingRow>
                <SettingRow label="Appointment Scheduled" description="Receive an email when a client books a property visit.">
                    <ToggleSwitch checked={notifAppointment} onChange={setNotifAppointment} />
                </SettingRow>
                <SettingRow label="Weekly Performance Report" description="A summary of your leads, visits, and bot engagement each Monday.">
                    <ToggleSwitch checked={notifWeeklyReport} onChange={setNotifWeeklyReport} />
                </SettingRow>
                <div className="mt-4 flex justify-end">
                    <button onClick={() => triggerToast("Notification preferences saved!")} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary/90 transition-transform active:scale-95">
                        Save Preferences
                    </button>
                </div>
            </SectionCard>

            {/* ── 4. Subscription ── */}
            <SectionCard title="Subscription & Billing" icon={CreditCard}>
                <div className="flex items-center gap-5 p-5 bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 rounded-2xl mb-6">
                    <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Zap className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-lg">Pro Plan</p>
                            <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-black rounded-full uppercase tracking-wider">Active</span>
                        </div>
                        <p className="text-sm text-foreground/60">₹2,999 / month · Renews on Aug 19, 2026</p>
                    </div>
                    <button className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors">
                        Manage
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    {[
                        { label: "Properties", used: 12, max: 50 },
                        { label: "AI Conversations", used: 241, max: 500 },
                        { label: "Team Members", used: 1, max: 5 },
                    ].map(item => (
                        <div key={item.label} className="bg-muted/40 p-4 rounded-2xl border border-border">
                            <p className="text-xs font-bold text-foreground/40 uppercase tracking-wider mb-2">{item.label}</p>
                            <p className="text-xl font-black">{item.used}<span className="text-sm font-medium text-foreground/50">/{item.max}</span></p>
                            <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${(item.used / item.max) * 100}%` }} />
                            </div>
                        </div>
                    ))}
                </div>
                <button className="w-full py-3 border-2 border-dashed border-border rounded-2xl text-sm font-bold text-foreground/60 hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2">
                    <CreditCard className="h-4 w-4" /> Update Payment Method
                </button>
            </SectionCard>

            {/* ── 5. Security ── */}
            <SectionCard title="Security" icon={Lock}>
                <SettingRow label="Two-Factor Authentication" description="Add an extra layer of security to your account.">
                    <button className="px-4 py-2 bg-muted border border-border rounded-xl text-sm font-bold hover:bg-foreground/10 transition-colors flex items-center gap-2">
                        <Shield className="h-4 w-4" /> Enable 2FA
                    </button>
                </SettingRow>
                <SettingRow label="Active Sessions" description="1 active session — Chrome on Windows 11">
                    <button className="px-4 py-2 bg-muted border border-border rounded-xl text-sm font-bold hover:bg-foreground/10 transition-colors">
                        View All
                    </button>
                </SettingRow>
                <SettingRow label="Sign Out All Devices" description="Immediately end all other active sessions.">
                    <button className="px-4 py-2 bg-destructive/10 text-red-500 border border-destructive/20 rounded-xl text-sm font-bold hover:bg-destructive/20 transition-colors flex items-center gap-2">
                        <LogOut className="h-4 w-4" /> Sign Out All
                    </button>
                </SettingRow>
            </SectionCard>

            {/* ── 6. Danger Zone ── */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-5 border-b border-red-500/20">
                    <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-red-500" />
                    </div>
                    <h2 className="text-base font-bold text-red-600">Danger Zone</h2>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-6">
                        <div>
                            <p className="font-semibold text-sm text-red-600">Delete All Leads</p>
                            <p className="text-xs text-foreground/50 mt-0.5">Permanently remove all leads from your account. This cannot be undone.</p>
                        </div>
                        <button className="flex-shrink-0 px-4 py-2 border border-red-500/30 rounded-xl text-red-500 text-sm font-bold hover:bg-red-500/10 transition-colors">
                            Delete Leads
                        </button>
                    </div>
                    <hr className="border-red-500/20" />
                    <div className="flex items-center justify-between gap-6">
                        <div>
                            <p className="font-semibold text-sm text-red-600">Delete Account</p>
                            <p className="text-xs text-foreground/50 mt-0.5">Permanently delete your agency account, all listings, and all data. This action is irreversible.</p>
                        </div>
                        <button className="flex-shrink-0 px-4 py-2 border border-red-500/30 rounded-xl text-red-500 text-sm font-bold hover:bg-red-500/10 transition-colors">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
