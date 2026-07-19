"use client";

import { useState } from "react";
import { User, Mail, Phone, Building, Shield, Bell, Camera, CheckCircle2 } from "lucide-react";

export default function ProfilePage() {
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
    const [loading, setLoading] = useState(false);

    // Core Profile State
    const [profile, setProfile] = useState({
        firstName: "Vishal",
        lastName: "Auti",
        email: "vishal@sunriserealty.com",
        phone: "+91 9876543210",
        company: "Sunrise Realty Group",
        role: "Senior Agent",
    });

    const [password, setPassword] = useState({
        current: "",
        new: "",
        confirm: ""
    });

    const [notifications, setNotifications] = useState({
        whatsappLeads: true,
        emailSummary: true,
        marketing: false,
    });

    const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const triggerToast = (msg: string) => {
        setToast({ msg, type: "success" });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            triggerToast("Profile updated successfully!");
        }, 800);
    };

    return (
        <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto relative min-h-[80vh]">

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in bg-card text-foreground px-4 py-3 rounded-xl shadow-xl border border-primary/20 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="font-semibold text-sm">{toast.msg}</span>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
                <p className="text-foreground/60 text-sm mt-1">
                    Manage your personal information and preferences
                </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">

                {/* Left Column: Avatar & Quick Stats */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card border border-border p-6 rounded-3xl shadow-sm text-center">
                        <div className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer">
                            <div className="w-full h-full rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-black shadow-lg">
                                {profile.firstName[0]}{profile.lastName[0]}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                <Camera className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h2>
                        <p className="text-sm text-foreground/50 font-medium mb-4">{profile.role} at {profile.company}</p>
                        <span className="inline-block bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                            Pro Plan Active
                        </span>
                    </div>

                    {/* Notification Preferences Setup */}
                    <div className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Bell className="h-5 w-5 text-primary" />
                            <h3 className="font-bold">Notifications</h3>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">WhatsApp Leads</p>
                                <p className="text-xs text-foreground/50">Instant message on new lead</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={notifications.whatsappLeads} onChange={(e) => setNotifications({ ...notifications, whatsappLeads: e.target.checked })} className="sr-only peer" />
                                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">Email Summaries</p>
                                <p className="text-xs text-foreground/50">Weekly performance report</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={notifications.emailSummary} onChange={(e) => setNotifications({ ...notifications, emailSummary: e.target.checked })} className="sr-only peer" />
                                <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Forms */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Basic Info Form */}
                    <form onSubmit={handleSaveProfile} className="bg-card border border-border p-6 md:p-8 rounded-3xl shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <User className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-bold">Personal Information</h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-5 mb-6">
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">First Name</label>
                                <input required type="text" name="firstName" value={profile.firstName} onChange={handleProfileChange} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Last Name</label>
                                <input required type="text" name="lastName" value={profile.lastName} onChange={handleProfileChange} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                    <input required type="email" name="email" value={profile.email} onChange={handleProfileChange} className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                    <input required type="text" name="phone" value={profile.phone} onChange={handleProfileChange} className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Company / Agency Name</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                    <input required type="text" name="company" value={profile.company} onChange={handleProfileChange} className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" disabled={loading} className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-transform active:scale-95 flex items-center justify-center min-w-[120px]">
                                {loading ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Save Changes"}
                            </button>
                        </div>
                    </form>

                    {/* Change Password Form */}
                    <form onSubmit={(e) => { e.preventDefault(); triggerToast("Password updated!"); setPassword({ current: "", new: "", confirm: "" }) }} className="bg-card border border-border p-6 md:p-8 rounded-3xl shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <Shield className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-bold">Security</h3>
                        </div>

                        <div className="space-y-4 mb-6 max-w-md">
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Current Password</label>
                                <input required type="password" value={password.current} onChange={(e) => setPassword({ ...password, current: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">New Password</label>
                                <input required type="password" value={password.new} onChange={(e) => setPassword({ ...password, new: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-foreground/70 block mb-1.5">Confirm New Password</label>
                                <input required type="password" value={password.confirm} onChange={(e) => setPassword({ ...password, confirm: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-primary/50 text-sm" />
                            </div>
                        </div>

                        <div className="flex justify-start">
                            <button type="submit" className="px-6 py-3 bg-accent/10 border border-accent/20 text-accent font-semibold rounded-xl text-sm hover:bg-accent hover:text-accent-foreground transition-colors active:scale-95">
                                Update Password
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
}
