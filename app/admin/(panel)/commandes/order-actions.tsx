"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Printer, RotateCcw, X } from "lucide-react";
import { cancelOrder, confirmOrder, reopenOrder } from "@/app/actions/orders";
import type { OrderStatus } from "@/lib/types";

export function OrderActions({
  orderId,
  status,
  label,
}: {
  orderId: string;
  status: OrderStatus;
  label: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: (id: string) => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action(orderId);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2">
        {status === "en_attente" && (
          <>
            <button
              disabled={isPending}
              onClick={() => run(confirmOrder)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Confirmer
            </button>
            <button
              disabled={isPending}
              onClick={() => run(cancelOrder)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
            >
              <X className="size-3.5" />
              Annuler
            </button>
          </>
        )}

        {status === "confirmee" && (
          <>
            {label && (
              <a
                href={label}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-700"
              >
                <Printer className="size-3.5" />
                Bordereau
              </a>
            )}
            <button
              disabled={isPending}
              onClick={() => run(cancelOrder)}
              className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <X className="size-3.5" />
              )}
              Annuler
            </button>
          </>
        )}

        {status === "annulee" && (
          <button
            disabled={isPending}
            onClick={() => run(reopenOrder)}
            className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcw className="size-3.5" />
            )}
            Remettre en attente
          </button>
        )}
      </div>
      {error && (
        <p className="max-w-64 text-[11px] leading-tight text-red-600">{error}</p>
      )}
    </div>
  );
}
