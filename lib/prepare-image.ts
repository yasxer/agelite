/**
 * Normalisation des images côté navigateur, avant tout upload.
 *
 * Deux problèmes réglés ici :
 *  - Les photos iPhone sont en HEIC. Aucun navigateur autre que Safari ne sait
 *    les afficher, et le `sharp` livré avec Next ne sait pas les décoder non
 *    plus (son support HEIF se limite à l'AVIF) : `/_next/image` échoue et
 *    l'image reste cassée partout. On les décode donc ici, via un décodeur
 *    WebAssembly chargé uniquement quand un HEIC est réellement sélectionné.
 *  - Une photo de téléphone pèse 3 à 12 Mo pour 4000px de large, alors que la
 *    page l'affiche en 420px. On redimensionne et on réencode en WebP.
 */

/** Plus grand côté conservé (la lightbox monte à ~1200px sur écran 2x). */
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.9;

/** Garde-fou sur le fichier d'origine ; après conversion tout tient sous 1 Mo. */
export const MAX_SOURCE_SIZE = 50 * 1024 * 1024;

/**
 * Marque `ftyp` aux octets 8-12 d'un conteneur ISO-BMFF. On la lit nous-mêmes
 * plutôt que d'appeler `isHeic()` du décodeur : cela éviterait de charger ses
 * ~3 Mo de WebAssembly pour chaque JPEG.
 */
async function looksLikeHeic(file: File): Promise<boolean> {
  if (/^image\/hei[cf]$/i.test(file.type)) return true;
  if (/\.hei[cf]$/i.test(file.name)) return true;
  const header = await file.slice(8, 12).arrayBuffer();
  const brand = new TextDecoder().decode(header).replace(/\0/g, " ").trim();
  return ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand);
}

async function decode(file: File): Promise<ImageBitmap> {
  if (await looksLikeHeic(file)) {
    const { heicTo } = await import("heic-to/next");
    return heicTo({ blob: file, type: "bitmap" });
  }
  // `from-image` applique l'orientation EXIF : sans ça les photos prises en
  // portrait ressortent couchées.
  return createImageBitmap(file, { imageOrientation: "from-image" });
}

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Décode n'importe quelle image acceptée par le navigateur (HEIC compris),
 * la redimensionne et la réencode en WebP. Le fichier renvoyé est directement
 * uploadable et lisible par tous les navigateurs.
 */
export async function prepareImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await decode(file);
  } catch {
    throw new Error("Image illisible ou format non pris en charge.");
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Conversion impossible (canvas indisponible).");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WebP partout, JPEG en repli pour les navigateurs qui ne l'encodent pas.
  let blob = await encode(canvas, "image/webp", WEBP_QUALITY);
  if (!blob || blob.type !== "image/webp") {
    blob = await encode(canvas, "image/jpeg", JPEG_QUALITY);
  }
  if (!blob) throw new Error("Conversion de l'image échouée.");

  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const base = file.name.replace(/\.[^.]*$/, "") || "image";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
