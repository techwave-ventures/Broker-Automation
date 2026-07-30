import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { HeaderProvider } from "@/components/layout/HeaderContext";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { getSessionUser } from "@/lib/api";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getSessionUser();

    return (
        <HeaderProvider>
            <div className="flex h-screen bg-background overflow-hidden w-full">
                <DashboardSidebar user={user} />
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    <TopNavbar />
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </HeaderProvider>
    );
}
