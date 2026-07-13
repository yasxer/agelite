"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, isAuthenticated, setSessionCookie } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get("password");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { error: "ADMIN_PASSWORD n'est pas défini dans .env.local." };
  }
  if (typeof password !== "string" || password !== expected) {
    return { error: "Mot de passe incorrect." };
  }
  await setSessionCookie();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await clearSessionCookie();
  redirect("/admin/login");
}

/** À appeler au début de chaque action/page admin. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
}
