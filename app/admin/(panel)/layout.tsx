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
    <div className="flex min-h-screen bg-zinc-100">
      <Sidebar storeName={settings.store_name} logoUrl={settings.logo_url} />
      <main className="flex-1 p-4 pb-24 sm:p-8 lg:pb-8">{children}</main>
    </div>
  );
}
