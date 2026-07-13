import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import { getDeliveryInfo } from "@/lib/yalidine";
import { WILAYAS } from "@/lib/wilayas";

/**
 * GET /api/delivery?wilaya=16%20-%20Alger
 * Tarifs de livraison Yalidine + bureaux stopdesk de la wilaya.
 * 503 si Yalidine est injoignable ou non configuré.
 */
export async function GET(request: Request) {
  const wilaya = new URL(request.url).searchParams.get("wilaya") ?? "";
  if (!WILAYAS.includes(wilaya)) {
    return NextResponse.json({ error: "Wilaya invalide." }, { status: 400 });
  }

  const settings = await getSettings();
  const info = await getDeliveryInfo(wilaya, settings.from_wilaya);

  if (info.homeFee === null) {
    return NextResponse.json(
      { error: "Tarifs de livraison indisponibles pour le moment." },
      { status: 503 }
    );
  }

  return NextResponse.json({
    homeFee: info.homeFee,
    deskFee: info.deskFee,
    centers: info.centers,
  });
}
