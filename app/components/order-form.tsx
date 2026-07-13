"use client";

import { useActionState, useRef, useState } from "react";
import {
  CheckCircle2,
  Home,
  Loader2,
  MapPin,
  Minus,
  Phone,
  Plus,
  Store,
  User,
} from "lucide-react";
import { createOrder, type OrderFormState } from "@/app/actions/orders";
import { WILAYAS } from "@/lib/wilayas";

const initialState: OrderFormState = {};

type Center = {
  id: number;
  name: string;
  commune: string;
  address: string;
  fee: number | null;
};

type DeliveryData = {
  homeFee: number;
  deskFee: number;
  centers: Center[];
};

function formatDA(n: number) {
  return `${n.toLocaleString("fr-DZ")} DA`;
}

export function OrderForm({
  price,
  deliveryHome,
  deliveryDesk,
}: {
  price: number;
  deliveryHome: number;
  deliveryDesk: number;
}) {
  const [state, action, pending] = useActionState(createOrder, initialState);
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<"domicile" | "stopdesk">(
    "domicile"
  );
  const [wilaya, setWilaya] = useState("");
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [loadingFees, setLoadingFees] = useState(false);
  const [stopdeskId, setStopdeskId] = useState<number | null>(null);
  const requestSeq = useRef(0);

  // Tarifs + bureaux chargés depuis Yalidine à chaque changement de wilaya
  function handleWilayaChange(value: string) {
    setWilaya(value);
    setStopdeskId(null);
    if (!value) return;
    const seq = ++requestSeq.current;
    setLoadingFees(true);
    fetch(`/api/delivery?wilaya=${encodeURIComponent(value)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: DeliveryData | null) => {
        if (seq === requestSeq.current) setDelivery(data);
      })
      .catch(() => {
        if (seq === requestSeq.current) setDelivery(null);
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoadingFees(false);
      });
  }

  const homeFee = delivery?.homeFee ?? deliveryHome;
  const deskFee = delivery?.deskFee ?? deliveryDesk;
  const centers = delivery?.centers ?? [];
  const selectedCenter = centers.find((c) => c.id === stopdeskId) ?? null;

  const fee =
    deliveryType === "domicile"
      ? homeFee
      : selectedCenter?.fee ?? deskFee;
  const total = price * quantity + fee;

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-white p-10 text-center shadow-xl ring-1 ring-zinc-200/60">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-9" />
        </span>
        <h3 className="text-2xl font-bold text-zinc-900">Commande reçue !</h3>
        <p className="max-w-sm text-zinc-600">
          Merci pour votre confiance. Notre équipe vous appellera très bientôt
          pour confirmer votre commande.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20";

  return (
    <form
      action={action}
      className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-zinc-200/60 sm:p-8"
    >
      <h3 className="text-xl font-bold text-zinc-900">
        Commandez maintenant — paiement à la livraison
      </h3>

      {/* Anti-bot, invisible */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div className="relative">
        <User className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-zinc-400" />
        <input
          name="customer_name"
          required
          placeholder="Nom et prénom"
          className={`${inputClass} pl-11`}
        />
      </div>

      <div className="relative">
        <Phone className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-zinc-400" />
        <input
          name="phone"
          required
          type="tel"
          inputMode="tel"
          placeholder="Téléphone (ex: 0550123456)"
          className={`${inputClass} pl-11`}
        />
      </div>

      <select
        name="wilaya"
        required
        value={wilaya}
        onChange={(e) => handleWilayaChange(e.target.value)}
        className={inputClass}
      >
        <option value="" disabled>
          Choisissez votre wilaya
        </option>
        {WILAYAS.map((w) => (
          <option key={w} value={w}>
            {w}
          </option>
        ))}
      </select>

      {/* Type de livraison */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { value: "domicile", label: "À domicile", icon: Home, fee: homeFee },
            { value: "stopdesk", label: "Bureau (Stopdesk)", icon: Store, fee: deskFee },
          ] as const
        ).map(({ value, label, icon: Icon, fee: optionFee }) => (
          <label
            key={value}
            className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition ${
              deliveryType === value
                ? "border-(--primary) bg-(--primary)/5"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <input
              type="radio"
              name="delivery_type"
              value={value}
              checked={deliveryType === value}
              onChange={() => setDeliveryType(value)}
              className="sr-only"
            />
            <Icon
              className={`size-5 ${deliveryType === value ? "text-(--primary)" : "text-zinc-400"}`}
            />
            <span className="text-sm font-semibold text-zinc-800">{label}</span>
            <span className="text-xs text-zinc-500">
              {loadingFees ? "..." : wilaya ? formatDA(optionFee) : "—"}
            </span>
          </label>
        ))}
      </div>

      {/* Stopdesk : choix du bureau Yalidine de la wilaya */}
      {deliveryType === "stopdesk" && centers.length > 0 && (
        <div className="flex flex-col gap-2">
          <select
            name="stopdesk_id"
            required
            value={stopdeskId ?? ""}
            onChange={(e) => setStopdeskId(Number(e.target.value) || null)}
            className={inputClass}
          >
            <option value="" disabled>
              Choisissez votre bureau de livraison
            </option>
            {centers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.commune}
              </option>
            ))}
          </select>
          {selectedCenter && (
            <p className="flex items-start gap-1.5 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
              <MapPin className="mt-0.5 size-3.5 shrink-0" />
              {selectedCenter.address}
            </p>
          )}
        </div>
      )}

      {/* Commune : saisie manuelle (domicile, ou stopdesk sans liste de bureaux) */}
      {(deliveryType === "domicile" || centers.length === 0) && (
        <input
          name="commune"
          required
          placeholder="Commune"
          className={inputClass}
        />
      )}

      {deliveryType === "domicile" && (
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-zinc-400" />
          <input
            name="address"
            required
            placeholder="Adresse complète"
            className={`${inputClass} pl-11`}
          />
        </div>
      )}

      {/* Quantité */}
      <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3">
        <span className="text-sm font-medium text-zinc-700">Quantité</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
            aria-label="Diminuer"
          >
            <Minus className="size-4" />
          </button>
          <span className="w-6 text-center font-bold text-zinc-900">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 transition hover:bg-zinc-200"
            aria-label="Augmenter"
          >
            <Plus className="size-4" />
          </button>
          <input type="hidden" name="quantity" value={quantity} />
        </div>
      </div>

      {/* Récap */}
      <div className="flex flex-col gap-1.5 rounded-xl bg-zinc-50 p-4 text-sm">
        <div className="flex justify-between text-zinc-600">
          <span>Produit × {quantity}</span>
          <span>{formatDA(price * quantity)}</span>
        </div>
        <div className="flex justify-between text-zinc-600">
          <span>Livraison</span>
          <span>
            {loadingFees ? "..." : wilaya ? formatDA(fee) : "choisissez une wilaya"}
          </span>
        </div>
        <div className="mt-1 flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
          <span>Total</span>
          <span className="text-(--primary)">
            {wilaya ? formatDA(total) : formatDA(price * quantity)}
          </span>
        </div>
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || loadingFees}
        className="flex items-center justify-center gap-2 rounded-xl bg-(--primary) px-6 py-4 text-base font-bold text-white shadow-lg shadow-(--primary)/25 transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Envoi en cours...
          </>
        ) : (
          <>Confirmer ma commande{wilaya ? ` — ${formatDA(total)}` : ""}</>
        )}
      </button>
      <p className="text-center text-xs text-zinc-400">
        Vous ne payez rien maintenant. Paiement en espèces à la réception.
      </p>
    </form>
  );
}
