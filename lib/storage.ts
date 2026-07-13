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
