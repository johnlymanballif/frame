import { Navigation } from "@/components/layout/navigation";
import { requireAuth } from "@/lib/authz";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect to sign-in if not authenticated
  await requireAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Desktop Layout */}
      <main className="hidden lg:block container mx-auto py-6 px-6">{children}</main>
      
      {/* Mobile Layout */}
      <main className="lg:hidden p-4 pb-20">{children}</main>
    </div>
  );
}