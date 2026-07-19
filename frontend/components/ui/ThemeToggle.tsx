"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export function ThemeToggle() {
    const { theme, toggle } = useTheme();

    return (
        <button
            id="theme-toggle"
            onClick={toggle}
            aria-label="Toggle dark/light mode"
            className="relative h-9 w-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-muted transition-all hover:scale-110 active:scale-95 group"
        >
            {/* Sun icon — shown in dark mode */}
            <Sun
                className={`h-4 w-4 text-amber-400 absolute transition-all duration-300 ${theme === "dark"
                        ? "opacity-100 rotate-0 scale-100"
                        : "opacity-0 rotate-90 scale-50"
                    }`}
            />
            {/* Moon icon — shown in light mode */}
            <Moon
                className={`h-4 w-4 text-blue-500 absolute transition-all duration-300 ${theme === "light"
                        ? "opacity-100 rotate-0 scale-100"
                        : "opacity-0 -rotate-90 scale-50"
                    }`}
            />
        </button>
    );
}
