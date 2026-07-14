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

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    updateSettings,
    {}
  );
  const [color, setColor] = useState(settings.primary_color);
  // Texte du champ hex : peut être temporairement invalide pendant la saisie
  const [hexInput, setHexInput] = useState(settings.primary_color);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [pixelId, setPixelId] = useState(settings.pixel_id ?? "");

  function applyColor(value: string) {
    setColor(value);
    setHexInput(value);
  }

  function handleHexChange(raw: string) {
    let value = raw.trim();
    if (value && !value.startsWith("#")) value = `#${value}`;
    setHexInput(value);
    if (HEX_RE.test(value)) setColor(value.toLowerCase());
  }

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
              onClick={() => applyColor(preset)}
              className={`size-9 rounded-full transition ${
                color === preset
                  ? "ring-2 ring-zinc-900 ring-offset-2"
                  : "hover:scale-110"
              }`}
              style={{ backgroundColor: preset }}
              aria-label={`Couleur ${preset}`}
            />
          ))}
        </div>

        {/* Couleur personnalisée : pipette + code hex saisi à la main */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-zinc-50 p-3">
          <label className="relative flex size-11 cursor-pointer items-center justify-center overflow-hidden rounded-xl ring-1 ring-zinc-200 transition hover:scale-105">
            <input
              type="color"
              value={color}
              onChange={(e) => applyColor(e.target.value)}
              className="absolute -inset-2 size-16 cursor-pointer border-0 p-0"
              aria-label="Ouvrir la palette de couleurs"
            />
          </label>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-zinc-600">
              Couleur personnalisée
            </span>
            <input
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#4f46e5"
              maxLength={7}
              spellCheck={false}
              className={`w-28 rounded-lg border bg-white px-2.5 py-1.5 font-mono text-sm outline-none transition ${
                HEX_RE.test(hexInput)
                  ? "border-zinc-200 text-zinc-800 focus:border-indigo-400"
                  : "border-red-300 text-red-600"
              }`}
              aria-label="Code couleur hexadécimal"
            />
          </div>
          {!HEX_RE.test(hexInput) && (
            <span className="text-xs font-medium text-red-500">
              Format : #rrggbb (ex. #e11d48)
            </span>
          )}
          <input type="hidden" name="primary_color" value={color} />
        </div>

        {/* Aperçu */}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <span
            className="flex items-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md"
            style={{ backgroundColor: color, boxShadow: `0 4px 14px ${color}55` }}
          >
            Aperçu du bouton
          </span>
          <span className="text-2xl font-extrabold" style={{ color }}>
            12 500 DA
          </span>
        </div>
      </div>

      <label className={labelClass}>
        Meta Pixel ID (Facebook) — optionnel
        <div className="flex items-center gap-2">
          <input
            name="pixel_id"
            value={pixelId}
            onChange={(e) => setPixelId(e.target.value.replace(/\D/g, ""))}
            placeholder="123456789012345"
            inputMode="numeric"
            className={inputClass}
          />
          {pixelId && (
            <button
              type="button"
              onClick={() => setPixelId("")}
              className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Retirer
            </button>
          )}
        </div>
        <span className="text-xs font-normal text-zinc-400">
          Meta Business Suite → Gestionnaire d&apos;événements → votre Pixel → l&apos;ID
          numérique. Videz le champ (ou cliquez Retirer) puis Enregistrer pour
          désactiver complètement le pixel sur la landing page.
        </span>
      </label>

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
