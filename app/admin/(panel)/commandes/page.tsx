import { Filter, Home, Inbox, Search, Store } from "lucide-react";
import { getOrders, syncYalidineStatuses, type OrderFilters } from "@/lib/data";
import { ORDER_STATUSES, type Order, type OrderStatus } from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";
import { OrderActions } from "./order-actions";
import { StatusBadge, YalidineStatusBadge } from "./status-badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Commandes — Admin" };

function formatDA(n: number) {
  return `${n.toLocaleString("fr-DZ")} DA`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function OrderStatusCell({ order }: { order: Order }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge status={order.status} />
      {order.status === "confirmee" && order.yalidine_status && (
        <YalidineStatusBadge status={order.yalidine_status} />
      )}
      {order.status === "confirmee" && order.yalidine_tracking && (
        <span className="font-mono text-[10px] text-zinc-400">
          {order.yalidine_tracking}
        </span>
      )}
    </div>
  );
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const filters: OrderFilters = {};
  const statusParam = typeof params.status === "string" ? params.status : "";
  if (ORDER_STATUSES.some((s) => s.value === statusParam)) {
    filters.status = statusParam as OrderStatus;
  }
  if (typeof params.wilaya === "string" && WILAYAS.includes(params.wilaya)) {
    filters.wilaya = params.wilaya;
  }
  if (typeof params.q === "string" && params.q.trim()) {
    filters.search = params.q.trim();
  }
  if (typeof params.from === "string" && params.from) filters.from = params.from;
  if (typeof params.to === "string" && params.to) filters.to = params.to;

  // Statuts Yalidine rafraîchis à chaque chargement de la page
  const orders = await syncYalidineStatuses(await getOrders(filters));

  const selectClass =
    "rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-indigo-400";

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Commandes</h1>
        <p className="text-sm text-zinc-500">
          {orders.length} commande{orders.length > 1 ? "s" : ""} trouvée
          {orders.length > 1 ? "s" : ""} — confirmez pour envoyer le colis vers
          Yalidine, le suivi se met à jour automatiquement
        </p>
      </div>

      {/* Filtres */}
      <form
        method="GET"
        className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/60"
      >
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            name="q"
            defaultValue={filters.search ?? ""}
            placeholder="Nom ou téléphone..."
            className={`${selectClass} w-full pl-9`}
          />
        </div>
        <select name="status" defaultValue={statusParam} className={selectClass}>
          <option value="">Tous les statuts</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          name="wilaya"
          defaultValue={filters.wilaya ?? ""}
          className={selectClass}
        >
          <option value="">Toutes les wilayas</option>
          {WILAYAS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Du
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500">
          Au
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className={selectClass}
          />
        </label>
        <button
          type="submit"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <Filter className="size-4" />
          Filtrer
        </button>
      </form>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-16 text-center shadow-sm ring-1 ring-zinc-200/60">
          <Inbox className="size-10 text-zinc-300" strokeWidth={1.5} />
          <p className="text-zinc-500">Aucune commande ne correspond à ces filtres.</p>
        </div>
      ) : (
        <>
          {/* Tableau desktop */}
          <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/60 lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-xs uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Destination</th>
                  <th className="px-4 py-3 font-semibold">Livraison</th>
                  <th className="px-4 py-3 font-semibold">Qté</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-500">
                      {formatDate(o.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-900">{o.customer_name}</p>
                      <p className="text-xs text-zinc-500">{o.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-700">{o.wilaya}</p>
                      <p className="text-xs text-zinc-500">
                        {o.commune}
                        {o.address ? ` — ${o.address}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                        {o.delivery_type === "domicile" ? (
                          <Home className="size-3.5" />
                        ) : (
                          <Store className="size-3.5" />
                        )}
                        {o.delivery_type === "domicile" ? "Domicile" : "Stopdesk"}
                      </span>
                      {o.stopdesk_name && (
                        <p className="mt-0.5 text-xs text-zinc-500">{o.stopdesk_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{o.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-zinc-900">
                      {formatDA(Number(o.total))}
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusCell order={o} />
                    </td>
                    <td className="px-4 py-3">
                      <OrderActions
                        orderId={o.id}
                        status={o.status}
                        label={o.yalidine_label}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartes mobile/tablette */}
          <div className="flex flex-col gap-3 lg:hidden">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{o.customer_name}</p>
                    <p className="text-xs text-zinc-500">{o.phone}</p>
                  </div>
                  <span className="text-xs text-zinc-400">{formatDate(o.created_at)}</span>
                </div>
                <p className="text-sm text-zinc-600">
                  {o.wilaya} — {o.commune}
                  {o.address ? ` — ${o.address}` : ""}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
                    {o.delivery_type === "domicile" ? (
                      <Home className="size-3.5" />
                    ) : (
                      <Store className="size-3.5" />
                    )}
                    {o.delivery_type === "domicile"
                      ? "Domicile"
                      : `Stopdesk${o.stopdesk_name ? ` (${o.stopdesk_name})` : ""}`}{" "}
                    — Qté {o.quantity}
                  </span>
                  <span className="font-bold text-zinc-900">
                    {formatDA(Number(o.total))}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                  <OrderStatusCell order={o} />
                  <OrderActions
                    orderId={o.id}
                    status={o.status}
                    label={o.yalidine_label}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
