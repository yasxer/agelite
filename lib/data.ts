import "server-only";
import { supabase } from "./supabase";
import type { Order, OrderStatus, Product, Settings } from "./types";

export const DEFAULT_SETTINGS: Omit<Settings, "id" | "updated_at"> = {
  store_name: "Ma Boutique",
  logo_url: null,
  primary_color: "#4f46e5",
  from_wilaya: "16 - Alger",
  pixel_id: null,
  fb_domain_verification: null,
};

export async function getProduct(): Promise<Product | null> {
  const { data, error } = await supabase()
    .from("product")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erreur produit: ${error.message}`);
  return data as Product | null;
}

// Cache mémoire court : évite un aller-retour Supabase à chaque requête
// (notamment /api/delivery appelé à chaque changement de wilaya)
let settingsCache: { expires: number; data: Settings } | null = null;

export function invalidateSettingsCache(): void {
  settingsCache = null;
}

export async function getSettings(): Promise<Settings> {
  if (settingsCache && settingsCache.expires > Date.now()) {
    return settingsCache.data;
  }
  const { data, error } = await supabase()
    .from("settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erreur settings: ${error.message}`);
  const settings = data
    ? (data as Settings)
    : { id: "", updated_at: "", ...DEFAULT_SETTINGS };
  settingsCache = { expires: Date.now() + 60_000, data: settings };
  return settings;
}

export type OrderFilters = {
  status?: OrderStatus;
  wilaya?: string;
  search?: string;
  from?: string;
  to?: string;
};

export async function getOrders(filters: OrderFilters = {}): Promise<Order[]> {
  let query = supabase()
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.wilaya) query = query.eq("wilaya", filters.wilaya);
  if (filters.search) {
    const s = filters.search.replace(/[%,]/g, "");
    query = query.or(`phone.ilike.%${s}%,customer_name.ilike.%${s}%`);
  }
  if (filters.from) query = query.gte("created_at", filters.from);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);

  const { data, error } = await query;
  if (error) throw new Error(`Erreur commandes: ${error.message}`);
  return (data ?? []) as Order[];
}

export async function getAllOrdersForStats(): Promise<
  Pick<Order, "created_at" | "status" | "total" | "yalidine_status">[]
> {
  const { data, error } = await supabase()
    .from("orders")
    .select("created_at,status,total,yalidine_status");
  if (error) throw new Error(`Erreur stats: ${error.message}`);
  return (data ?? []) as Pick<
    Order,
    "created_at" | "status" | "total" | "yalidine_status"
  >[];
}

/**
 * Synchronise le statut Yalidine des commandes confirmées (une seule requête
 * API groupée), met à jour la base si un statut a changé, et retourne les
 * commandes avec leur statut à jour. Silencieux si Yalidine est injoignable.
 */
export async function syncYalidineStatuses(orders: Order[]): Promise<Order[]> {
  const tracked = orders.filter(
    (o) => o.status === "confirmee" && o.yalidine_tracking
  );
  if (tracked.length === 0) return orders;

  const { getParcelStatuses } = await import("./yalidine");
  const statuses = await getParcelStatuses(
    tracked.map((o) => o.yalidine_tracking as string)
  );
  if (statuses.size === 0) return orders;

  const updates: { id: string; yalidine_status: string }[] = [];
  const result = orders.map((o) => {
    const fresh = o.yalidine_tracking ? statuses.get(o.yalidine_tracking) : undefined;
    if (fresh && fresh !== o.yalidine_status) {
      updates.push({ id: o.id, yalidine_status: fresh });
      return { ...o, yalidine_status: fresh };
    }
    return o;
  });

  await Promise.all(
    updates.map((u) =>
      supabase()
        .from("orders")
        .update({ yalidine_status: u.yalidine_status })
        .eq("id", u.id)
    )
  );

  return result;
}
