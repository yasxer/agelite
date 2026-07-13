import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDown, BadgeCheck, Banknote, PackageOpen, Truck } from "lucide-react";
import { getProduct, getSettings } from "@/lib/data";
import { Gallery } from "./components/gallery";
import { OrderForm } from "./components/order-form";

// Page servie depuis le cache CDN (rapide même en 2G). Elle est régénérée
// immédiatement quand le produit ou les settings changent (revalidatePath),
// avec un filet de sécurité de 5 minutes.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const [settings, product] = await Promise.all([getSettings(), getProduct()]);
  return {
    title: product ? `${product.name} | ${settings.store_name}` : settings.store_name,
    description: product?.description.slice(0, 160) || settings.store_name,
  };
}

function formatDA(n: number) {
  return `${n.toLocaleString("fr-DZ")} DA`;
}

export default async function LandingPage() {
  const [settings, product] = await Promise.all([getSettings(), getProduct()]);

  if (!product) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <PackageOpen className="size-12 text-zinc-300" strokeWidth={1.5} />
        <p className="text-zinc-500">
          Aucun produit configuré. Rendez-vous dans le panel admin.
        </p>
      </main>
    );
  }

  const discount =
    product.old_price && product.old_price > product.price
      ? Math.round((1 - product.price / product.old_price) * 100)
      : null;

  return (
    <div
      style={{ "--primary": settings.primary_color } as React.CSSProperties}
      className="relative min-h-screen overflow-x-clip bg-zinc-50 text-zinc-900"
    >
      {/* Halos de couleur en arrière-plan */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 right-[-20%] -z-0 size-[420px] rounded-full bg-(--primary) opacity-10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[-25%] top-[38%] size-[380px] rounded-full bg-(--primary) opacity-[0.07] blur-3xl"
      />

      {/* Header glassy */}
      <header className="sticky top-0 z-40 border-b border-zinc-200/50 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[420px] items-center justify-center gap-3 px-4">
          {settings.logo_url ? (
            <Image
              src={settings.logo_url}
              alt={settings.store_name}
              width={36}
              height={36}
              className="size-9 rounded-xl object-contain"
            />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-xl bg-(--primary) text-white shadow-md shadow-(--primary)/30">
              <PackageOpen className="size-5" />
            </span>
          )}
          <span className="text-lg font-extrabold tracking-tight">
            {settings.store_name}
          </span>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-[420px] flex-col px-4 pb-12">
        {/* Titre + prix */}
        <div className="animate-fade-up flex flex-col items-center gap-3 pb-7 pt-8 text-center">
          {discount !== null && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-(--primary) px-4 py-1.5 text-sm font-bold text-white shadow-lg shadow-(--primary)/30">
              <BadgeCheck className="size-4" />
              -{discount}% aujourd&apos;hui
            </span>
          )}
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight">
            {product.name}
          </h1>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-(--primary)">
              {formatDA(product.price)}
            </span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-xl font-medium text-zinc-400 line-through">
                {formatDA(product.old_price)}
              </span>
            )}
          </div>
          {/* Mini badges */}
          <div className="mt-1 flex items-center gap-4 text-xs font-semibold text-zinc-500">
            <span className="flex items-center gap-1.5">
              <Truck className="size-4 text-(--primary)" />
              69 wilayas
            </span>
            <span className="h-3 w-px bg-zinc-300" />
            <span className="flex items-center gap-1.5">
              <Banknote className="size-4 text-(--primary)" />
              Paiement à la livraison
            </span>
          </div>
          <a
            href="#commander"
            className="mt-2 flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-bold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-zinc-700"
          >
            Commander maintenant
            <ArrowDown className="size-4" />
          </a>
        </div>

        {/* Galerie : grande image + miniatures, zoom au clic, swipe */}
        <div className="animate-fade-up-delay relative">
          <div
            aria-hidden="true"
            className="absolute -inset-x-2 -inset-y-2 rounded-4xl bg-(--primary)/10"
          />
          <div className="relative">
            <Gallery images={product.images} alt={product.name} />
          </div>
        </div>

        {/* Formulaire */}
        <div id="commander" className="scroll-mt-24 pt-10">
          <div className="mb-6 flex flex-col items-center gap-1 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight">
              Passez votre commande
            </h2>
            <p className="text-sm text-zinc-500">
              Vous ne payez qu&apos;à la réception de votre colis
            </p>
          </div>
          <OrderForm
            price={product.price}
            colors={product.colors}
            sizes={product.sizes}
          />
        </div>
      </main>

      {/* Barre mobile fixe */}
      <a
        href="#commander"
        className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-center gap-2 rounded-2xl bg-(--primary) px-6 py-4 text-base font-bold text-white shadow-2xl shadow-(--primary)/40 sm:hidden"
      >
        Commander — {formatDA(product.price)}
        <ArrowDown className="size-5" />
      </a>

      <footer className="relative border-t border-zinc-200/70 bg-white py-7 pb-24 sm:pb-7">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            {settings.logo_url ? (
              <Image
                src={settings.logo_url}
                alt=""
                width={24}
                height={24}
                className="size-6 rounded-md object-contain"
              />
            ) : (
              <PackageOpen className="size-4.5 text-(--primary)" />
            )}
            <span className="text-sm font-bold">{settings.store_name}</span>
          </div>
          <p className="text-xs text-zinc-400">
            © {new Date().getFullYear()} {settings.store_name} — Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
