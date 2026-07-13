"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { updateSettings, type SettingsFormState } from "@/app/actions/settings";
import type { Settings } from "@/lib/types";
import { WILAYAS } from "@/lib/wilayas";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20";

const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-zinc-700";

const PRESET_COLORS = [
  "#4f46e5",
  "#0ea5e9",
  "#059669",
  "#dc2626",
  "#ea580c",
  "#d946ef",
  "#0f172a",
];

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    updateSettings,
    {}
  );
  const [color, setColor] = useState(settings.primary_color);
  const [removeLogo, setRemoveLogo] = useState(false);

  return (
    <form
      action={action}
      className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] ring-1 ring-zinc-900/5 sm:p-8"
    >
      <label className={labelClass}>
        Nom de la boutique
        <input
          name="store_name"
          required
          defaultValue={settings.store_name}
          className={inputClass}
        />
      </label>

      {/* Logo */}
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-medium text-zinc-700">Logo</span>
        <div className="flex items-center gap-4">
          {settings.logo_url && !removeLogo && (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logo_url}
                alt="Logo actuel"
                className="size-16 rounded-xl object-contain ring-1 ring-zinc-200"
              />
              <button
                type="button"
                onClick={() => setRemoveLogo(true)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="size-3.5" />
                Retirer
              </button>
            </div>
          )}
          {removeLogo && <input type="hidden" name="remove_logo" value="1" />}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 px-4 py-3 text-sm font-medium text-zinc-500 transition hover:border-indigo-400 hover:text-indigo-500">
            <ImagePlus className="size-5" />
            {settings.logo_url && !removeLogo ? "Remplacer le logo" : "Choisir un logo"}
            <input type="file" name="logo" accept="image/*" className="hidden" />
          </label>
        </div>
      </div>

      {/* Couleur */}
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-medium text-zinc-700">
          Couleur principale (boutons, prix, accents de la landing)
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className={`size-9 rounded-full transition ${
                color === preset
                  ? "ring-2 ring-zinc-900 ring-offset-2"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: preset }}
              aria-label={`Couleur ${preset}`}
            />
          ))}
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-1.5">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-7 cursor-pointer border-0 bg-transparent p-0"
              aria-label="Couleur personnalisée"
            />
            <span className="font-mono text-sm text-zinc-600">{color}</span>
          </div>
          <input type="hidden" name="primary_color" value={color} />
        </div>
        {/* Aperçu */}
        <div
          className="mt-1 flex w-fit items-center gap-3 rounded-xl px-5 py-3 text-sm font-bold text-white"
          style={{ backgroundColor: color }}
        >
          Aperçu du bouton
        </div>
      </div>

      <label className={labelClass}>
        Wilaya d&apos;expédition (adresse de départ pour Yalidine)
        <select
          name="from_wilaya"
          defaultValue={settings.from_wilaya}
          className={inputClass}
        >
          {WILAYAS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" />
          Paramètres enregistrés.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center gap-2 rounded-xl bg-linear-to-b from-indigo-500 to-indigo-600 shadow-md shadow-indigo-600/25 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
        Enregistrer
      </button>
    </form>
  );
}
