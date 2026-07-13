"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/storage";
import { getSettings, invalidateSettingsCache } from "@/lib/data";
import { WILAYAS } from "@/lib/wilayas";
import { requireAdmin } from "./auth";

export type SettingsFormState = { success?: boolean; error?: string };

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateSettings(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdmin();

  const settings = await getSettings();
  if (!settings.id) return { error: "Settings introuvables (exécutez le schema.sql)." };

  const store_name = String(formData.get("store_name") || "").trim();
  const primary_color = String(formData.get("primary_color") || "").trim();
  const from_wilaya = String(formData.get("from_wilaya") || "");

  if (!store_name) return { error: "Le nom de la boutique est requis." };
  if (!COLOR_RE.test(primary_color))
    return { error: "Couleur invalide (format #rrggbb)." };
  if (!WILAYAS.includes(from_wilaya))
    return { error: "Wilaya d'expédition invalide." };

  let logo_url = settings.logo_url;
  const removeLogo = formData.get("remove_logo") === "1";
  if (removeLogo) logo_url = null;

  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      logo_url = await uploadImage(logoFile, "logo");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload du logo échoué." };
    }
  }

  const { error } = await supabase()
    .from("settings")
    .update({
      store_name,
      primary_color,
      from_wilaya,
      logo_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", settings.id);
  if (error) return { error: error.message };

  invalidateSettingsCache();
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { success: true };
}
