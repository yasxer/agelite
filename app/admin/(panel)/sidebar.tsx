"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Package,
  PackageOpen,
  Settings,
  ShoppingCart,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

const LINKS = [
  { href: "/admin", label: "Statistiques", icon: LayoutDashboard },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/produit", label: "Produit", icon: Package },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export function Sidebar({
  storeName,
  logoUrl,
}: {
  storeName: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();

  const nav = (
    <>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition lg:w-full ${
              active
                ? "bg-indigo-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <Icon className="size-5 shrink-0" />
            <span className="hidden lg:inline">{label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Sidebar desktop / rail tablette */}
      <aside className="sticky top-0 hidden h-screen w-16 flex-col bg-zinc-950 p-3 sm:flex lg:w-60 lg:p-4">
        <div className="mb-8 flex items-center gap-3 px-1 pt-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName}
              className="size-9 shrink-0 rounded-xl bg-white object-contain"
            />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <PackageOpen className="size-5" />
            </span>
          )}
          <span className="hidden truncate font-bold text-white lg:inline">
            {storeName}
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">{nav}</nav>

        <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-3">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <ExternalLink className="size-5 shrink-0" />
            <span className="hidden lg:inline">Voir la boutique</span>
          </a>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="size-5 shrink-0" />
            <span className="hidden lg:inline">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Barre de navigation mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-zinc-800 bg-zinc-950 px-2 py-2 sm:hidden">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 text-[10px] font-medium ${
                active ? "text-indigo-400" : "text-zinc-500"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
