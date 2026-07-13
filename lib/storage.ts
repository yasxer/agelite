import "server-only";
import { supabase } from "./supabase";

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image.");
  }
  if (file.size > MAX_SIZE) {
    throw new Error("Image trop lourde (max 5 Mo).");
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase()
    .storage.from("images")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Upload échoué: ${error.message}`);

  const { data } = supabase().storage.from("images").getPublicUrl(path);
  return data.publicUrl;
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
