"use client";

import Link from "next/link";
import { BotMessageSquare, Mail, Lock, User, Building2, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function SignupPage() {
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            window.location.href = "/dashboard";
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            {/* Background Grid */}
            <div
                className="fixed inset-0 opacity-[0.04]"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, #2563eb 1px, transparent 1px), linear-gradient(to bottom, #2563eb 1px, transparent 1px)",
                    backgroundSize: "64px 64px",
                }}
            />

            <div className="w-full max-w-md relative animate-fade-in-up">
                <div className="bg-card border border-border rounded-3xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse-glow mb-4">
                            <BotMessageSquare className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
                        <p className="text-foreground/60 text-sm mt-1">
                            Start automating your property sales today
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="firstName" className="text-sm font-medium text-foreground/80">
                                    First name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                    <input
                                        id="firstName"
                                        type="text"
                                        required
                                        placeholder="Vishal"
                                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-shadow"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="lastName" className="text-sm font-medium text-foreground/80">
                                    Last name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                    <input
                                        id="lastName"
                                        type="text"
                                        required
                                        placeholder="Auti"
                                        className="w-full pl-10 pr-3 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-shadow"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="agency" className="text-sm font-medium text-foreground/80">
                                Agency / Company
                            </label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                <input
                                    id="agency"
                                    type="text"
                                    placeholder="Sunrise Real Estate"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-shadow"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-foreground/80">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="you@example.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-shadow"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-foreground/80">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/40" />
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-shadow"
                                />
                            </div>
                        </div>

                        <button
                            id="signup-submit"
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create account <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>

                        <p className="text-xs text-foreground/50 text-center">
                            By creating an account, you agree to our{" "}
                            <span className="underline cursor-pointer text-foreground/70">Terms of Service</span>{" "}
                            and{" "}
                            <span className="underline cursor-pointer text-foreground/70">Privacy Policy</span>.
                        </p>
                    </form>

                    <div className="mt-6 text-center text-sm text-foreground/60">
                        Already have an account?{" "}
                        <Link href="/auth/login" className="text-primary font-medium hover:underline">
                            Sign in
                        </Link>
                    </div>
                </div>

                <p className="text-center text-xs text-foreground/40 mt-4">
                    <Link href="/" className="hover:text-foreground/60 transition-colors">
                        ← Back to homepage
                    </Link>
                </p>
            </div>
        </div>
    );
}
