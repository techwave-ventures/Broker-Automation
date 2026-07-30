"use client";

import { useHeader } from "./HeaderContext";
import { Menu, X } from "lucide-react";

export function TopNavbar() {
    const { title, subtitle, actions, sidebarOpen, setSidebarOpen, hideNavbar } = useHeader();

    if (hideNavbar) return null;

    return (
        <header className="h-16 border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {/* Mobile/Tablet Hamburger toggle */}
                <button
                    id="sidebar-mobile-toggle"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="lg:hidden h-9 w-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
                    aria-label="Toggle Sidebar"
                >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                {/* Title */}
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground truncate">
                        {title}
                    </h1>
                </div>
            </div>

            {/* Actions */}
            {actions && (
                <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {actions}
                </div>
            )}
        </header>
    );
}
