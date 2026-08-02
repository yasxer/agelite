import "server-only";
import { supabase } from "./supabase";

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 Mo par image

/** `product/1a2b3c-d4e5f6.jpg` — chemin unique dans le bucket. */
function newPath(file: string, folder: string): string {
  const ext = file.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `${folder}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image trop lourde (max 5 Mo).");
  }
  const path = newPath(file.name, folder);

  const { error } = await supabase()
    .storage.from("images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload échoué: ${error.message}`);

  const { data } = supabase().storage.from("images").getPublicUrl(path);
  return data.publicUrl;
}

/** Cible d'upload direct navigateur → Supabase (contourne la limite de taille des Server Actions). */
export type UploadTarget = { signedUrl: string; publicUrl: string };

/**
 * Génère une URL d'upload signée à usage unique. Le navigateur y envoie le
 * fichier en PUT directement : aucune image ne transite par le serveur Next,
 * donc aucune limite de nombre ni de poids total.
 */
export async function createUploadTarget(
  fileName: string,
  folder: string
): Promise<UploadTarget> {
  const path = newPath(fileName, folder);
  const { data, error } = await supabase()
    .storage.from("images")
    .createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(`Upload impossible: ${error?.message ?? "URL signée refusée"}`);
  }
  const { data: pub } = supabase().storage.from("images").getPublicUrl(path);
  return { signedUrl: data.signedUrl, publicUrl: pub.publicUrl };
}

const PUBLIC_PREFIX = "/storage/v1/object/public/images/";

/**
 * Vérifie qu'une URL renvoyée par le client pointe bien vers notre bucket
 * (et éventuellement vers un dossier précis). Le client choisit *quelles*
 * images garder, il ne doit pas pouvoir injecter une URL arbitraire.
 */
export function isBucketUrl(url: string, folder?: string): boolean {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "") + PUBLIC_PREFIX;
  if (!base.startsWith("https://") || !url.startsWith(base)) return false;
  const path = url.slice(base.length);
  return folder ? path.startsWith(`${folder}/`) : path.length > 0;
}

/** "https://xxx.supabase.co/storage/v1/object/public/images/product/a.jpg" -> "product/a.jpg" */
function storagePath(url: string): string | null {
  const marker = "/storage/v1/object/public/images/";
  const index = url.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(url.slice(index + marker.length));
}

/**
 * Supprime définitivement des images du bucket Supabase à partir de leurs
 * URLs publiques. Silencieux en cas d'échec (un fichier orphelin n'est pas
 * grave, une suppression ne doit jamais faire échouer l'enregistrement).
 */
export async function deleteImages(urls: string[]): Promise<void> {
  const paths = urls
    .map(storagePath)
    .filter((p): p is string => p !== null);
  if (paths.length === 0) return;
  try {
    await supabase().storage.from("images").remove(paths);
  } catch {
    // fichier déjà supprimé ou stockage injoignable : on ignore
  }
}
