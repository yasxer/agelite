"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { deleteImages, uploadImage } from "@/lib/storage";
import { getProduct } from "@/lib/data";
import { requireAdmin } from "./auth";

export type ProductFormState = { success?: boolean; error?: string };

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  await requireAdmin();

  const product = await getProduct();
  if (!product) return { error: "Produit introuvable (exécutez le schema.sql)." };

  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const price = Number(formData.get("price"));
  const oldPriceRaw = String(formData.get("old_price") || "").trim();
  const old_price = oldPriceRaw ? Number(oldPriceRaw) : null;
  const features = String(formData.get("features") || "")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  // Variantes : couleurs [{name, hex}] et tailles [string]
  let colors: { name: string; hex: string }[] = [];
  let sizes: string[] = [];
  try {
    const rawColors: unknown = JSON.parse(String(formData.get("colors") || "[]"));
    const rawSizes: unknown = JSON.parse(String(formData.get("sizes") || "[]"));
    if (Array.isArray(rawColors)) {
      colors = rawColors
        .filter(
          (c): c is { name: string; hex: string } =>
            typeof c?.name === "string" &&
            typeof c?.hex === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(c.hex) &&
            c.name.trim().length > 0
        )
        .map((c) => ({ name: c.name.trim().slice(0, 40), hex: c.hex }))
        .slice(0, 30);
    }
    if (Array.isArray(rawSizes)) {
      sizes = rawSizes
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 20))
        .slice(0, 30);
    }
  } catch {
    return { error: "Variantes invalides." };
  }

  if (!name) return { error: "Le nom du produit est requis." };
  if (!Number.isFinite(price) || price < 0) return { error: "Prix invalide." };
  if (old_price !== null && (!Number.isFinite(old_price) || old_price < 0))
    return { error: "Ancien prix invalide." };

  // Images existantes conservées + nouvelles uploadées
  const kept = formData.getAll("existing_images").map(String).filter(Boolean);
  const images = [...kept];
  try {
    for (const entry of formData.getAll("new_images")) {
      if (entry instanceof File && entry.size > 0) {
        images.push(await uploadImage(entry, "product"));
      }
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload échoué." };
  }

  const { error } = await supabase()
    .from("product")
    .update({
      name,
      description,
      price,
      old_price,
      features,
      colors,
      sizes,
      images,
      updated_at: new Date().toISOString(),
    })
    .eq("id", product.id);
  if (error) return { error: error.message };

  // Les images retirées sont supprimées définitivement du storage
  // (seulement après la réussite de la mise à jour en base)
  const removed = product.images.filter((url) => !images.includes(url));
  await deleteImages(removed);

  revalidatePath("/");
  revalidatePath("/admin/produit");
  // Retour à la carte d'aperçu après enregistrement
  redirect("/admin/produit");
}
