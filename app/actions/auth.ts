"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { clearSessionCookie, isAuthenticated, setSessionCookie } from "@/lib/auth";
import {
  checkLoginAllowed,
  clearFailures,
  clientIp,
  recordFailure,
} from "@/lib/login-guard";

export type LoginState = { error?: string };

/** Comparaison à temps constant : la durée ne dépend pas du préfixe correct. */
function sameSecret(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const LOCKED = (min: number) =>
  `Trop de tentatives échouées. Réessayez dans ${min} minute${min > 1 ? "s" : ""}.`;

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get("password");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { error: "ADMIN_PASSWORD n'est pas défini dans .env.local." };
  }

  const ip = await clientIp();

  // Sans compteur de tentatives il n'y a plus de protection contre le brute
  // force : on refuse plutôt que de laisser passer (fail-closed).
  let lock;
  try {
    lock = await checkLoginAllowed(ip);
  } catch {
    return { error: "Service indisponible, veuillez réessayer dans un instant." };
  }
  if (lock.locked) return { error: LOCKED(lock.minutesLeft) };

  if (typeof password !== "string" || !sameSecret(password, expected)) {
    try {
      const result = await recordFailure(ip);
      if (result.locked) return { error: LOCKED(result.minutesLeft) };
      return {
        error:
          result.attemptsLeft > 0
            ? `Mot de passe incorrect. ${result.attemptsLeft} essai${
                result.attemptsLeft > 1 ? "s" : ""
              } restant${result.attemptsLeft > 1 ? "s" : ""}.`
            : "Mot de passe incorrect.",
      };
    } catch {
      return { error: "Mot de passe incorrect." };
    }
  }

  await clearFailures(ip);
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
