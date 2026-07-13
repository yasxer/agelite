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
  const commune = String(formData.get("commune") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const delivery_type =
    formData.get("delivery_type") === "stopdesk" ? "stopdesk" : "domicile";
  const stopdeskId = Number(formData.get("stopdesk_id")) || null;
  const quantity = Math.min(Math.max(Number(formData.get("quantity")) || 1, 1), 20);

  if (customer_name.length < 3) return { error: "Veuillez entrer votre nom complet." };
  if (!PHONE_RE.test(phone))
    return { error: "Numéro de téléphone invalide (ex: 0550123456)." };
  if (!WILAYAS.includes(wilaya)) return { error: "Veuillez choisir votre wilaya." };
  if (delivery_type === "domicile" && address.length < 5)
    return { error: "Veuillez entrer votre adresse de livraison." };

  const [product, settings] = await Promise.all([getProduct(), getSettings()]);
  if (!product) return { error: "Produit indisponible pour le moment." };

  // Tarifs et bureaux recalculés côté serveur (jamais confiés au client)
  const info = await getDeliveryInfo(wilaya, settings.from_wilaya);

  let delivery: number;
  let stopdesk_name: string | null = null;
  let stopdesk_id: number | null = null;
  let finalCommune = commune;

  if (delivery_type === "stopdesk") {
    if (info.centers.length > 0) {
      const center = info.centers.find((c) => c.id === stopdeskId);
      if (!center) return { error: "Veuillez choisir un bureau de livraison." };
      stopdesk_id = center.id;
      stopdesk_name = center.name;
      finalCommune = center.commune;
      delivery = center.fee ?? info.deskFee ?? product.delivery_desk;
    } else {
      // Yalidine indisponible : commune saisie manuellement + tarif de secours
      if (finalCommune.length < 2) return { error: "Veuillez entrer votre commune." };
      delivery = info.deskFee ?? product.delivery_desk;
    }
  } else {
    if (finalCommune.length < 2) return { error: "Veuillez entrer votre commune." };
    delivery = info.homeFee ?? product.delivery_home;
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
