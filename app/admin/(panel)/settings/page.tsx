import { getSettings } from "@/lib/data";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Paramètres — Admin" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Paramètres</h1>
        <p className="text-sm text-zinc-500">
          Logo, couleur et informations de la boutique — appliqués directement sur la
          landing page.
        </p>
      </div>
      <SettingsForm settings={settings} />
    </div>
  );
}
