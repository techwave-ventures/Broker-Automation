import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { getSessionUser } from "@/lib/api";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getSessionUser();

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <DashboardSidebar user={user} />
            <main className="flex-1 overflow-y-auto lg:pl-0 pl-0">
                {children}
            </main>
        </div>
    );
}
