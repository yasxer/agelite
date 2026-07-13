"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ImagePlus, Loader2, Save, X } from "lucide-react";
import { updateProduct, type ProductFormState } from "@/app/actions/product";
import type { Product } from "@/lib/types";

const inputClass =
  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-zinc-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20";

const labelClass = "flex flex-col gap-1.5 text-sm font-medium text-zinc-700";

export function ProductForm({ product }: { product: Product }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    updateProduct,
    {}
  );
  const [images, setImages] = useState(product.images);

  return (
    <form
      action={action}
      className="flex flex-col gap-5 rounded-3xl bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-16px_rgba(16,24,40,0.12)] ring-1 ring-zinc-900/5 sm:p-8"
    >
      <label className={labelClass}>
        Nom du produit
        <input name="name" required defaultValue={product.name} className={inputClass} />
      </label>

      <label className={labelClass}>
        Description
        <textarea
          name="description"
          rows={5}
          defaultValue={product.description}
          className={inputClass}
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          Prix (DA)
          <input
            name="price"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={product.price}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Ancien prix (DA) — optionnel, affiché barré
          <input
            name="old_price"
            type="number"
            min="0"
            step="any"
            defaultValue={product.old_price ?? ""}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Livraison à domicile (DA)
          <input
            name="delivery_home"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={product.delivery_home}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Livraison stopdesk (DA)
          <input
            name="delivery_desk"
            type="number"
            min="0"
            step="any"
            required
            defaultValue={product.delivery_desk}
            className={inputClass}
          />
        </label>
      </div>

      <label className={labelClass}>
        Points forts (un par ligne, affichés avec une coche sur la landing)
        <textarea
          name="features"
          rows={4}
          defaultValue={product.features.join("\n")}
          placeholder={"Livraison rapide\nMatériau premium\nGarantie 1 an"}
          className={inputClass}
        />
      </label>

      {/* Images */}
      <div className="flex flex-col gap-2.5">
        <span className="text-sm font-medium text-zinc-700">Images du produit</span>
        <div className="flex flex-wrap gap-3">
          {images.map((src) => (
            <div key={src} className="group relative">
              <input type="hidden" name="existing_images" value={src} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="size-24 rounded-xl object-cover ring-1 ring-zinc-200"
              />
              <button
                type="button"
                onClick={() => setImages((imgs) => imgs.filter((i) => i !== src))}
                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-red-500 text-white shadow transition hover:bg-red-600"
                aria-label="Supprimer l'image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-zinc-300 text-zinc-400 transition hover:border-indigo-400 hover:text-indigo-500">
            <ImagePlus className="size-6" />
            <span className="text-[10px] font-medium">Ajouter</span>
            <input
              type="file"
              name="new_images"
              accept="image/*"
              multiple
              className="hidden"
            />
          </label>
        </div>
        <p className="text-xs text-zinc-400">
          Les nouvelles images seront uploadées à l&apos;enregistrement (max 5 Mo chacune).
        </p>
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-xl bg-linear-to-b from-indigo-500 to-indigo-600 shadow-md shadow-indigo-600/25 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
          Enregistrer
        </button>
        <Link
          href="/admin/produit"
          className="rounded-xl px-5 py-3 font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
