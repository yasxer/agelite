"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="flex flex-col gap-4">
      <input
        type="password"
        name="password"
        required
        autoFocus
        placeholder="Mot de passe"
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
      {state.error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-b from-indigo-500 to-indigo-600 shadow-md shadow-indigo-600/25 px-6 py-3 font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <LogIn className="size-5" />}
        Se connecter
      </button>
    </form>
  );
}
