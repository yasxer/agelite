import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Clock,
  Percent,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { getAllOrdersForStats, getOrders } from "@/lib/data";
import { ORDER_STATUSES } from "@/lib/types";
import { StatusBadge } from "./commandes/status-badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Statistiques — Admin" };

function formatDA(n: number) {
  return `${n.toLocaleString("fr-DZ")} DA`;
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const [orders, recent] = await Promise.all([
    getAllOrdersForStats(),
    getOrders().then((o) => o.slice(0, 6)),
  ]);

  const today = dayKey(new Date());
  const ordersToday = orders.filter((o) => o.created_at.slice(0, 10) === today).length;
  const pending = orders.filter((o) => o.status === "en_attente").length;
  // Livré = statut de suivi renvoyé par Yalidine
  const delivered = orders.filter((o) =>
    o.yalidine_status?.toLowerCase().includes("livré")
  );
  const revenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);
  const confirmed = orders.filter((o) => o.status === "confirmee").length;
  const cancelled = orders.filter((o) => o.status === "annulee").length;
  const decided = confirmed + cancelled;
  const confirmationRate = decided > 0 ? Math.round((confirmed / decided) * 100) : 0;

  // Commandes des 14 derniers jours
  const days: { key: string; label: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    days.push({
      key,
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      count: orders.filter((o) => o.created_at.slice(0, 10) === key).length,
    });
  }
  const maxCount = Math.max(1, ...days.map((d) => d.count));

  const cards = [
    {
      label: "Commandes aujourd'hui",
      value: String(ordersToday),
      icon: ShoppingCart,
      accent: "bg-indigo-100 text-indigo-600",
    },
    {
      label: "En attente",
      value: String(pending),
      icon: Clock,
      accent: "bg-amber-100 text-amber-600",
    },
    {
      label: "Revenus (livrées)",
      value: formatDA(revenue),
      icon: CircleDollarSign,
      accent: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Taux de confirmation",
      value: `${confirmationRate}%`,
      icon: Percent,
      accent: "bg-sky-100 text-sky-600",
    },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Statistiques</h1>
        <p className="text-sm text-zinc-500">
          Vue d&apos;ensemble de votre boutique — {orders.length} commandes au total
        </p>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/60"
          >
            <span className={`flex size-10 items-center justify-center rounded-xl ${accent}`}>
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-xl font-bold text-zinc-900">{value}</p>
              <p className="text-xs font-medium text-zinc-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Graphique 14 jours */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/60 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="size-5 text-indigo-600" />
          <h2 className="font-bold text-zinc-900">Commandes — 14 derniers jours</h2>
        </div>
        <div className="flex h-40 items-end gap-1.5 sm:gap-2">
          {days.map((d) => (
            <div key={d.key} className="group flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-semibold text-zinc-500 opacity-0 transition group-hover:opacity-100">
                {d.count}
              </span>
              <div
                className={`w-full rounded-t-md transition ${
                  d.count > 0 ? "bg-indigo-500 group-hover:bg-indigo-600" : "bg-zinc-100"
                }`}
                style={{ height: `${Math.max((d.count / maxCount) * 100, 4)}%` }}
              />
              <span className="hidden text-[9px] text-zinc-400 sm:block">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Répartition par statut */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/60 sm:p-6">
        <h2 className="mb-4 font-bold text-zinc-900">Répartition par statut</h2>
        <div className="flex flex-wrap gap-3">
          {ORDER_STATUSES.map((s) => {
            const count = orders.filter((o) => o.status === s.value).length;
            return (
              <div
                key={s.value}
                className="flex items-center gap-2.5 rounded-xl bg-zinc-50 px-4 py-2.5"
              >
                <StatusBadge status={s.value} />
                <span className="text-sm font-bold text-zinc-900">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dernières commandes */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/60 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-zinc-900">Dernières commandes</h2>
          <Link
            href="/admin/commandes"
            className="flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Tout voir
            <ArrowRight className="size-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-400">
            Aucune commande pour le moment.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">
                    {o.customer_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {o.phone} — {o.wilaya}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-bold text-zinc-900">
                    {formatDA(Number(o.total))}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
