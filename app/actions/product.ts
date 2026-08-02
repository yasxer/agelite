"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  deleteImages,
  createUploadTarget,
  isBucketUrl,
  MAX_IMAGE_SIZE,
  type UploadTarget,
} from "@/lib/storage";
import { getProduct } from "@/lib/data";
import { requireAdmin } from "./auth";

export type ProductFormState = { success?: boolean; error?: string };

/** Nombre d'images demandables en une seule sélection (la galerie, elle, est illimitée). */
const MAX_BATCH = 40;

/**
 * Prépare des URLs d'upload signées pour que le navigateur envoie les images
 * directement à Supabase. Le serveur ne reçoit ensuite que les URLs publiques,
 * ce qui lève la limite de taille des Server Actions (25 Mo) : le client peut
 * ajouter autant d'images qu'il veut.
 */
export async function createProductUploadUrls(
  files: { name: string; type: string; size: number }[]
): Promise<{ targets?: UploadTarget[]; error?: string }> {
  await requireAdmin();

  if (!Array.isArray(files) || files.length === 0) return { error: "Aucun fichier." };
  if (files.length > MAX_BATCH)
    return { error: `${MAX_BATCH} images maximum par sélection.` };

  for (const file of files) {
    if (typeof file?.type !== "string" || !file.type.startsWith("image/"))
      return { error: "Seules les images sont acceptées." };
    if (!Number.isFinite(file?.size) || file.size <= 0 || file.size > MAX_IMAGE_SIZE)
      return { error: "Image trop lourde (max 5 Mo)." };
  }

  try {
    const targets = await Promise.all(
      files.map((file) => createUploadTarget(String(file.name || "image.jpg"), "product"))
    );
    return { targets };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Upload impossible." };
  }
}

/**
 * Supprime une image tout juste uploadée que l'admin retire avant d'enregistrer.
 * Refuse toute URL déjà rattachée au produit : celles-là ne partent qu'après
 * un enregistrement réussi (voir `updateProduct`).
 */
export async function discardProductImage(url: string): Promise<void> {
  await requireAdmin();
  if (typeof url !== "string" || !isBucketUrl(url, "product")) return;

  const product = await getProduct();
  if (product?.images.includes(url)) return;

  await deleteImages([url]);
}

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

  // Le navigateur a déjà uploadé les images vers Supabase : il ne renvoie ici
  // que la liste ordonnée des URLs à conserver.
  let images: string[] = [];
  try {
    const raw: unknown = JSON.parse(String(formData.get("images") || "[]"));
    if (!Array.isArray(raw)) return { error: "Images invalides." };
    images = raw.filter(
      (url): url is string => typeof url === "string" && isBucketUrl(url, "product")
    );
    images = [...new Set(images)];
  } catch {
    return { error: "Images invalides." };
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
