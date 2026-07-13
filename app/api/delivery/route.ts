import { NextResponse } from "next/server";
import { getProduct, getSettings } from "@/lib/data";
import { getDeliveryInfo } from "@/lib/yalidine";
import { WILAYAS } from "@/lib/wilayas";

/**
 * GET /api/delivery?wilaya=16%20-%20Alger
 * Tarifs de livraison (Yalidine si configuré, sinon tarifs manuels du produit)
 * + liste des bureaux stopdesk de la wilaya.
 */
export async function GET(request: Request) {
  const wilaya = new URL(request.url).searchParams.get("wilaya") ?? "";
  if (!WILAYAS.includes(wilaya)) {
    return NextResponse.json({ error: "Wilaya invalide." }, { status: 400 });
  }

  const [settings, product] = await Promise.all([getSettings(), getProduct()]);
  const info = await getDeliveryInfo(wilaya, settings.from_wilaya);

  return NextResponse.json({
    homeFee: info.homeFee ?? product?.delivery_home ?? 0,
    deskFee: info.deskFee ?? product?.delivery_desk ?? 0,
    centers: info.centers,
    // true = tarifs réels Yalidine, false = tarifs manuels de secours
    live: info.homeFee !== null,
  });
}
