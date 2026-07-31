import "server-only";
import { headers } from "next/headers";
import { supabase } from "./supabase";

/** Fenêtre glissante dans laquelle les échecs sont cumulés. */
const WINDOW_MS = 15 * 60 * 1000;
/** Échecs tolérés dans la fenêtre avant verrouillage. */
const MAX_FAILURES = 5;
/** Durée du premier verrouillage, doublée à chaque verrouillage consécutif. */
const BASE_LOCK_MS = 15 * 60 * 1000;
/** Plafond : au-delà, l'admin s'auto-bloquerait trop longtemps. */
const MAX_LOCK_MS = 60 * 60 * 1000;

type Row = {
  ip: string;
  failures: number;
  window_started_at: string;
  locked_until: string | null;
  lockouts: number;
};

/**
 * IP du client. Sur Vercel, `x-real-ip` est posé par l'infrastructure et
 * n'est pas contrôlable par le client, contrairement à `x-forwarded-for`
 * auquel un attaquant peut préfixer des valeurs — d'où cet ordre.
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "inconnue";
}

function minutes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60000));
}

async function readRow(ip: string): Promise<Row | null> {
  const { data, error } = await supabase()
    .from("login_attempts")
    .select("*")
    .eq("ip", ip)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Row) ?? null;
}

export type LockState = { locked: false } | { locked: true; minutesLeft: number };

export type FailureResult =
  | { locked: true; minutesLeft: number }
  | { locked: false; attemptsLeft: number };

/**
 * À appeler AVANT de comparer le mot de passe. En cas d'indisponibilité du
 * compteur on refuse la tentative (fail-closed) : sans lui il n'y a plus
 * aucune protection contre le brute force, et le panneau admin est de toute
 * façon inutilisable sans Supabase.
 */
export async function checkLoginAllowed(ip: string): Promise<LockState> {
  const row = await readRow(ip);
  if (!row?.locked_until) return { locked: false };

  const remaining = new Date(row.locked_until).getTime() - Date.now();
  if (remaining <= 0) return { locked: false };
  return { locked: true, minutesLeft: minutes(remaining) };
}

/**
 * Enregistre un échec et verrouille l'IP une fois le quota dépassé.
 * Retourne soit le verrouillage obtenu, soit les essais encore disponibles.
 */
export async function recordFailure(ip: string): Promise<FailureResult> {
  const row = await readRow(ip);
  const now = Date.now();

  // Fenêtre expirée (ou première tentative) : on repart d'un compteur neuf
  const windowExpired =
    !row || now - new Date(row.window_started_at).getTime() > WINDOW_MS;

  const failures = windowExpired ? 1 : row.failures + 1;
  const windowStart = windowExpired ? new Date(now) : new Date(row.window_started_at);
  let lockouts = row?.lockouts ?? 0;
  let lockedUntil: Date | null = null;

  if (failures >= MAX_FAILURES) {
    // Chaque verrouillage consécutif double l'attente, jusqu'au plafond
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** lockouts, MAX_LOCK_MS);
    lockouts += 1;
    lockedUntil = new Date(now + lockMs);
  }

  const { error } = await supabase()
    .from("login_attempts")
    .upsert(
      {
        ip,
        failures: lockedUntil ? 0 : failures,
        window_started_at: (lockedUntil ? new Date(now) : windowStart).toISOString(),
        locked_until: lockedUntil ? lockedUntil.toISOString() : null,
        lockouts,
        updated_at: new Date(now).toISOString(),
      },
      { onConflict: "ip" }
    );
  if (error) throw new Error(error.message);

  await occasionalCleanup();

  return lockedUntil
    ? { locked: true, minutesLeft: minutes(lockedUntil.getTime() - now) }
    : { locked: false, attemptsLeft: MAX_FAILURES - failures };
}

/**
 * Purge occasionnelle des lignes devenues inutiles : une attaque distribuée
 * crée une ligne par IP, on évite que la table grossisse sans fin. Une fois
 * sur vingt suffit, et l'échec est sans conséquence.
 */
async function occasionalCleanup(): Promise<void> {
  if (Math.random() > 0.05) return;
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabase().from("login_attempts").delete().lt("updated_at", cutoff);
  } catch {
    // purement opportuniste
  }
}

/** Connexion réussie : le compteur de cette IP est effacé. */
export async function clearFailures(ip: string): Promise<void> {
  try {
    await supabase().from("login_attempts").delete().eq("ip", ip);
  } catch {
    // ne doit jamais empêcher une connexion légitime d'aboutir
  }
}
