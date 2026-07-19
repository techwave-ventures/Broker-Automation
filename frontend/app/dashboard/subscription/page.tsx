import { Crown, Check, Zap, ArrowRight } from "lucide-react";

const plans = [
    {
        name: "Starter",
        price: "₹999",
        period: "/ month",
        description: "Perfect for individual agents",
        features: [
            "Up to 5 property listings",
            "100 AI conversations/mo",
            "WhatsApp bot",
            "Basic analytics",
            "Email support",
        ],
        cta: "Get Started",
        highlighted: false,
    },
    {
        name: "Pro",
        price: "₹2,499",
        period: "/ month",
        description: "For growing agencies",
        features: [
            "Up to 50 property listings",
            "Unlimited conversations",
            "WhatsApp + Website bot",
            "Advanced analytics",
            "Lead scoring & qualification",
            "Auto-schedule viewings",
            "Priority support",
        ],
        cta: "Upgrade to Pro",
        highlighted: true,
        badge: "Current Plan",
    },
    {
        name: "Enterprise",
        price: "₹7,499",
        period: "/ month",
        description: "For large real estate companies",
        features: [
            "Unlimited listings",
            "Unlimited conversations",
            "All channels",
            "Custom bot training",
            "CRM integrations",
            "Team accounts (5 users)",
            "Dedicated account manager",
        ],
        cta: "Contact Sales",
        highlighted: false,
    },
];

export default function SubscriptionPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Subscription</h1>
                    <p className="text-foreground/60 text-sm mt-1">Manage your plan and billing</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Crown className="h-4 w-4" />
                    Pro Plan — Active
                </div>
            </div>

            {/* Current usage */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold mb-4">Current Usage</h2>
                <div className="space-y-4">
                    {[
                        { label: "Property Listings", used: 24, total: 50 },
                        { label: "AI Conversations", used: 8951, total: null },
                        { label: "Team Members", used: 1, total: 1 },
                    ].map((u) => (
                        <div key={u.label}>
                            <div className="flex justify-between text-sm mb-1.5">
                                <span className="text-foreground/70">{u.label}</span>
                                <span className="font-medium">
                                    {u.used}{u.total ? ` / ${u.total}` : " (unlimited)"}
                                </span>
                            </div>
                            {u.total && (
                                <div className="h-2 bg-border rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all"
                                        style={{ width: `${(u.used / u.total) * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Plans */}
            <div>
                <h2 className="font-semibold mb-4">Choose a Plan</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative bg-card border rounded-2xl p-6 flex flex-col ${plan.highlighted
                                    ? "border-primary shadow-[0_0_0_1px_hsl(var(--color-primary,#2563eb))] ring-1 ring-primary"
                                    : "border-border"
                                }`}
                        >
                            {plan.badge && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                                        {plan.badge}
                                    </span>
                                </div>
                            )}
                            <div className="mb-6">
                                <h3 className="font-bold text-lg">{plan.name}</h3>
                                <p className="text-foreground/50 text-sm mt-0.5">{plan.description}</p>
                                <div className="mt-4">
                                    <span className="text-3xl font-extrabold">{plan.price}</span>
                                    <span className="text-foreground/50 text-sm">{plan.period}</span>
                                </div>
                            </div>

                            <ul className="space-y-2.5 flex-1">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                                        <Check className="h-4 w-4 text-accent flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                className={`mt-6 w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${plan.highlighted
                                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                        : "bg-background border border-border text-foreground hover:border-primary/50"
                                    }`}
                            >
                                {plan.highlighted && <Zap className="h-4 w-4" />}
                                {plan.cta}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Billing details */}
            <div className="bg-card border border-border rounded-2xl p-6">
                <h2 className="font-semibold mb-4">Billing Details</h2>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-foreground/60">Next billing date</span>
                        <span className="font-medium">August 19, 2026</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-foreground/60">Payment method</span>
                        <span className="font-medium">•••• •••• •••• 4242</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-foreground/60">Amount</span>
                        <span className="font-medium">₹2,499 / month</span>
                    </div>
                </div>
                <button className="mt-4 text-sm text-primary hover:underline">
                    Update billing info →
                </button>
            </div>
        </div>
    );
}
