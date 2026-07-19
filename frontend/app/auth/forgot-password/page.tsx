"use client";

import Link from "next/link";
import { BotMessageSquare, Mail, ArrowRight, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function ForgotPasswordPage() {
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSent(true);
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
                    <div className="flex flex-col items-center mb-8">
                        <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center animate-pulse-glow mb-4">
                            <BotMessageSquare className="h-7 w-7 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {sent ? "Check your inbox" : "Reset password"}
                        </h1>
                        <p className="text-foreground/60 text-sm mt-1 text-center">
                            {sent
                                ? "We've sent a reset link to your email."
                                : "Enter your email and we'll send you a reset link."}
                        </p>
                    </div>

                    {sent ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-accent" />
                            </div>
                            <Link
                                href="/auth/login"
                                className="text-primary font-medium hover:underline text-sm"
                            >
                                Back to sign in →
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
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

                            <button
                                id="reset-submit"
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                            >
                                {loading ? (
                                    <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        Send reset link <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm text-foreground/60">
                        <Link href="/auth/login" className="text-primary font-medium hover:underline">
                            ← Back to sign in
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
