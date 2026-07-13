import { LoginForm } from "./login-form";
import { getSettings } from "@/lib/data";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "Connexion — Admin" };

export default async function LoginPage() {
  const settings = await getSettings();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 p-8 shadow-2xl ring-1 ring-zinc-800">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Lock className="size-6" />
          </span>
          <h1 className="text-xl font-bold text-white">{settings.store_name}</h1>
          <p className="text-sm text-zinc-400">
            Espace administrateur — connectez-vous pour continuer
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
