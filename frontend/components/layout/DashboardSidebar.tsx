"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BotMessageSquare,
    LayoutDashboard,
    Building2,
    Users,
    MessageSquare,
    BarChart3,
    Crown,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/properties", label: "Properties", icon: Building2 },
    { href: "/dashboard/leads", label: "Leads", icon: Users },
    { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/whatsapp-ai", label: "WhatsApp AI", icon: BotMessageSquare },
    { href: "/dashboard/subscription", label: "Subscription", icon: Crown },
];

export function DashboardSidebar({ user }: { user: { name: string | null; email: string | null; picture: string | null } | null }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (item: (typeof NAV_ITEMS)[0]) => {
        if (item.exact) return pathname === item.href;
        return pathname.startsWith(item.href);
    };

    return (
        <>
            {/* Mobile menu button */}
            <button
                id="sidebar-mobile-toggle"
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 h-9 w-9 rounded-xl bg-card border border-border flex items-center justify-center shadow-md"
            >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed lg:static top-0 left-0 h-full w-64 bg-card border-r border-border flex flex-col z-40 
          transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
            >
                {/* Logo */}
                <div className="h-16 flex items-center gap-3 px-6 border-b border-border flex-shrink-0">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center animate-pulse-glow">
                        <BotMessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">PropBot AI</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <div className="space-y-1">
                        {NAV_ITEMS.map((item) => {
                            const active = isActive(item);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                    ${active
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-foreground/70 hover:bg-border/60 hover:text-foreground"
                                        }
                  `}
                                >
                                    <item.icon className="h-4 w-4 flex-shrink-0" />
                                    {item.label}
                                    {item.label === "Leads" && (
                                        <span className="ml-auto text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                                            12
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer */}
                <div className="p-3 border-t border-border space-y-1">
                    <Link
                        href="/dashboard/settings"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-border/60 hover:text-foreground transition-all"
                    >
                        <Settings className="h-4 w-4" />
                        Settings
                    </Link>
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                await fetch('/api/auth/logout', { method: 'POST' });
                            } catch {
                                // Ignore network errors
                            }
                            window.location.href = '/auth/login';
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-destructive/10 hover:text-red-500 transition-all text-left"
                    >
                        <LogOut className="h-4 w-4" />
                        Log out
                    </button>

                    {/* Theme toggle */}
                    <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-xs text-foreground/40 font-medium">Theme</span>
                        <ThemeToggle />
                    </div>

                    {/* User avatar */}
                    <Link href="/dashboard/profile" className="mt-3 flex items-center gap-3 px-3 py-2 rounded-xl bg-background border border-border hover:bg-border/50 hover:border-border/80 transition-all cursor-pointer group">
                        {user?.picture ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.picture} alt="Avatar" className="h-8 w-8 rounded-full flex-shrink-0 group-hover:scale-105 transition-transform object-cover" />
                        ) : (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0 group-hover:scale-105 transition-transform">
                                {user?.name
                                    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                                    : user?.email
                                    ? user.email.slice(0, 2).toUpperCase()
                                    : "US"}
                            </div>
                        )}
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                {user?.name || (user?.email ? user.email.split('@')[0] : "Local Dev User")}
                            </p>
                            <p className="text-xs text-foreground/50 truncate">{user?.email || "Pro Plan"}</p>
                        </div>
                    </Link>
                </div>
            </aside>
        </>
    );
}
