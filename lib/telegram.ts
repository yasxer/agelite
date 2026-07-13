import "server-only";

export type OrderNotification = {
  customer_name: string;
  phone: string;
  wilaya: string;
  commune: string;
  address: string | null;
  delivery_type: "domicile" | "stopdesk";
  stopdesk_name: string | null;
  quantity: number;
  total: number;
  productName: string;
};

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Envoie la nouvelle commande sur Telegram (bot). Ne bloque jamais la
 * commande : toute erreur est silencieuse. Nécessite TELEGRAM_BOT_TOKEN
 * et TELEGRAM_CHAT_ID dans .env.local.
 */
export async function notifyNewOrder(order: OrderNotification): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const lieu =
    order.delivery_type === "stopdesk"
      ? `Bureau (Stopdesk)${order.stopdesk_name ? ` — ${esc(order.stopdesk_name)}` : ""}`
      : `À domicile${order.address ? ` — ${esc(order.address)}` : ""}`;

  const text = [
    "<b>Nouvelle commande</b>",
    "",
    `<b>Client :</b> ${esc(order.customer_name)}`,
    `<b>Téléphone :</b> ${esc(order.phone)}`,
    `<b>Wilaya :</b> ${esc(order.wilaya)}`,
    `<b>Commune :</b> ${esc(order.commune)}`,
    `<b>Livraison :</b> ${lieu}`,
    `<b>Produit :</b> ${esc(order.productName)} x${order.quantity}`,
    `<b>Total :</b> ${order.total.toLocaleString("fr-DZ")} DA`,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // La notification ne doit jamais faire échouer la commande
  }
}
