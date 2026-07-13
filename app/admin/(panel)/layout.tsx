import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { Sidebar } from "./sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen bg-[#f4f5f9]">
      <Sidebar storeName={settings.store_name} logoUrl={settings.logo_url} />
      {/* pt-18/pb-24 mobile : espace pour le header et la nav flottante */}
      <main className="min-w-0 flex-1 p-4 pb-28 pt-18 sm:p-8 sm:pt-8 lg:pb-8">
        {children}
      </main>
    </div>
  );
}
