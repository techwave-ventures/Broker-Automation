import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <DashboardSidebar />
            <main className="flex-1 overflow-y-auto lg:pl-0 pl-0">
                {children}
            </main>
        </div>
    );
}
