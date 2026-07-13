import type { OrderStatus } from "@/lib/types";
import { ORDER_STATUSES } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  en_attente: "bg-amber-100 text-amber-700",
  confirmee: "bg-emerald-100 text-emerald-700",
  annulee: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const label = ORDER_STATUSES.find((s) => s.value === status)?.label ?? status;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}
    >
      {label}
    </span>
  );
}

/** Badge pour le statut de suivi renvoyé par Yalidine (Livré, Expédié, Retour...). */
export function YalidineStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let style = "bg-indigo-100 text-indigo-700";
  if (s.includes("livré")) style = "bg-emerald-100 text-emerald-700";
  else if (s.includes("retour") || s.includes("échoué") || s.includes("echec") || s.includes("échec"))
    style = "bg-red-100 text-red-700";
  else if (s.includes("sorti en livraison")) style = "bg-sky-100 text-sky-700";
  else if (s.includes("préparation") || s.includes("pas encore"))
    style = "bg-zinc-100 text-zinc-600";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}
    >
      {status}
    </span>
  );
}
