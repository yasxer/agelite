"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { getProduct, getSettings } from "@/lib/data";
import { createParcel, deleteParcel, getDeliveryInfo } from "@/lib/yalidine";
import { notifyNewOrder } from "@/lib/telegram";
import { WILAYAS } from "@/lib/wilayas";
import type { Order } from "@/lib/types";
import { requireAdmin } from "./auth";

export type OrderFormState = {
  success?: boolean;
  error?: string;
};

const PHONE_RE = /^(0)(5|6|7)[0-9]{8}$/;

export async function createOrder(
  _prev: OrderFormState,
  formData: FormData
): Promise<OrderFormState> {
  // Champ invisible anti-bot
  if (formData.get("website")) return { success: true };

  const customer_name = String(formData.get("customer_name") || "").trim();
  const phone = String(formData.get("phone") || "").replace(/[\s.-]/g, "");
  const wilaya = String(formData.get("wilaya") || "");
  const address = String(formData.get("address") || "").trim();
  const delivery_type =
    formData.get("delivery_type") === "stopdesk" ? "stopdesk" : "domicile";
  const stopdeskId = Number(formData.get("stopdesk_id")) || null;
  const quantity = Math.min(Math.max(Number(formData.get("quantity")) || 1, 1), 20);

  if (customer_name.length < 3) return { error: "الرجاء إدخال اسمكم الكامل." };
  if (!PHONE_RE.test(phone))
    return { error: "رقم الهاتف غير صحيح (مثال: 0550123456)." };
  if (!WILAYAS.includes(wilaya)) return { error: "الرجاء اختيار ولايتكم." };
  if (delivery_type === "domicile" && address.length < 5)
    return { error: "الرجاء إدخال عنوان التوصيل." };

  const [product, settings] = await Promise.all([getProduct(), getSettings()]);
  if (!product) return { error: "المنتج غير متوفر حاليا." };

  // Variantes : obligatoires si le produit en définit
  const color = String(formData.get("color") || "").trim() || null;
  const size = String(formData.get("size") || "").trim() || null;
  if (product.colors.length > 0 && !product.colors.some((c) => c.name === color)) {
    return { error: "الرجاء اختيار لون." };
  }
  if (product.sizes.length > 0 && !product.sizes.includes(size ?? "")) {
    return { error: "الرجاء اختيار مقاس." };
  }

  // Tarifs et bureaux recalculés côté serveur depuis Yalidine
  // (jamais confiés au client, aucun tarif manuel)
  const info = await getDeliveryInfo(wilaya, settings.from_wilaya);
  if (info.homeFee === null) {
    return {
      error:
        "أسعار التوصيل غير متوفرة حاليا. الرجاء إعادة المحاولة بعد قليل.",
    };
  }

  let delivery: number;
  let stopdesk_name: string | null = null;
  let stopdesk_id: number | null = null;
  // Pas de champ "commune" séparé : on réutilise l'adresse saisie par le client
  // (Yalidine a besoin d'un nom de commune pour créer le colis à domicile)
  let finalCommune = address;

  if (delivery_type === "stopdesk") {
    const center = info.centers.find((c) => c.id === stopdeskId);
    if (!center) return { error: "الرجاء اختيار مكتب التوصيل." };
    stopdesk_id = center.id;
    stopdesk_name = center.name;
    finalCommune = center.commune;
    delivery = center.fee ?? info.deskFee ?? info.homeFee;
  } else {
    delivery = info.homeFee;
  }

  const total = product.price * quantity + delivery;

  const { error } = await supabase().from("orders").insert({
    customer_name,
    phone,
    wilaya,
    commune: finalCommune,
    address: address || null,
    delivery_type,
    stopdesk_id,
    stopdesk_name,
    color,
    size,
    quantity,
    total,
  });
  if (error) return { error: "Une erreur est survenue, veuillez réessayer." };

  await notifyNewOrder({
    customer_name,
    phone,
    wilaya,
    commune: finalCommune,
    address: address || null,
    delivery_type,
    stopdesk_name,
    color,
    size,
    quantity,
    total,
    productName: product.name,
  });

  return { success: true };
}

export type OrderActionState = { error?: string };

async function getOrder(orderId: string): Promise<Order | null> {
  const { data } = await supabase()
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  return (data as Order) ?? null;
}

/**
 * Confirmer = créer le colis chez Yalidine.
 * La commande passe en "confirmee" et son suivi se fait via le statut Yalidine.
 */
export async function confirmOrder(orderId: string): Promise<OrderActionState> {
  await requireAdmin();

  const order = await getOrder(orderId);
  if (!order) return { error: "Commande introuvable." };
  if (order.status === "confirmee") return { error: "Commande déjà confirmée." };

  const product = await getProduct();
  const settings = await getSettings();
  if (!product) return { error: "Produit introuvable." };

  let result;
  try {
    result = await createParcel(order, product.name, settings);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur Yalidine." };
  }
  if (!result.ok) return { error: result.error };

  await supabase()
    .from("orders")
    .update({
      status: "confirmee",
      yalidine_tracking: result.parcel.tracking,
      yalidine_label: result.parcel.label,
      yalidine_status: "En préparation",
    })
    .eq("id", orderId);

  revalidatePath("/admin/commandes");
  revalidatePath("/admin");
  return {};
}

/**
 * Annuler la commande. Si un colis Yalidine existe déjà, on tente de le
 * supprimer chez Yalidine (possible tant qu'il n'est pas ramassé).
 */
export async function cancelOrder(orderId: string): Promise<OrderActionState> {
  await requireAdmin();

  const order = await getOrder(orderId);
  if (!order) return { error: "Commande introuvable." };

  if (order.yalidine_tracking) {
    const result = await deleteParcel(order.yalidine_tracking);
    if (!result.ok) {
      return {
        error: `${result.error} Annulez le colis depuis votre compte Yalidine d'abord.`,
      };
    }
  }

  await supabase()
    .from("orders")
    .update({
      status: "annulee",
      yalidine_tracking: null,
      yalidine_label: null,
      yalidine_status: null,
    })
    .eq("id", orderId);

  revalidatePath("/admin/commandes");
  revalidatePath("/admin");
  return {};
}

/**
 * Supprime définitivement la commande de la base (action irréversible).
 * Si un colis Yalidine existe encore, il est supprimé chez Yalidine d'abord :
 * sans cela on laisserait un colis en circulation sans aucune trace côté
 * boutique. Si Yalidine refuse (colis déjà ramassé), rien n'est supprimé.
 */
export async function deleteOrder(orderId: string): Promise<OrderActionState> {
  await requireAdmin();

  const order = await getOrder(orderId);
  if (!order) return { error: "Commande introuvable." };

  if (order.yalidine_tracking) {
    const result = await deleteParcel(order.yalidine_tracking);
    if (!result.ok) {
      return {
        error: `${result.error} Annulez le colis depuis votre compte Yalidine d'abord.`,
      };
    }
  }

  const { error } = await supabase().from("orders").delete().eq("id", orderId);
  if (error) return { error: "Suppression impossible, veuillez réessayer." };

  revalidatePath("/admin/commandes");
  revalidatePath("/admin");
  return {};
}

/** Remettre une commande annulée en attente. */
export async function reopenOrder(orderId: string): Promise<OrderActionState> {
  await requireAdmin();

  const order = await getOrder(orderId);
  if (!order) return { error: "Commande introuvable." };
  if (order.status !== "annulee") return { error: "Commande non annulée." };

  await supabase()
    .from("orders")
    .update({ status: "en_attente" })
    .eq("id", orderId);

  revalidatePath("/admin/commandes");
  revalidatePath("/admin");
  return {};
}
