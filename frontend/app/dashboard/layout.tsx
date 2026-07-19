import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { auth0 } from "@/lib/auth0";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth0.getSession();
    const user = session?.user ? {
      name: session.user.name || null,
      email: session.user.email || null,
      picture: session.user.picture || null,
    } : null;

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <DashboardSidebar user={user} />
            <main className="flex-1 overflow-y-auto lg:pl-0 pl-0">
                {children}
            </main>
        </div>
    );
}
