/**
 * L44 — veille du contenu : public/veille-data/veille.json, versionné, contrôlé par
 * scripts/veille-data.mjs (chaque fait a sa source https et sa date de consultation).
 * `revueLe` est la seule date de revue du site ; jeux.json en reçoit une copie (npm run veille).
 */
import { InjectionToken } from '@angular/core';

export const VEILLE_URL = '/veille-data/veille.json';

/** Lit veille.json (revalidé à chaque visite) ; rejette sur tout statut d'erreur. */
export async function chargerVeille(): Promise<unknown> {
  const res = await fetch(VEILLE_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

/**
 * Chargement de la veille, remplaçable : sous TestBed (src/testing/angular-testbed.ts) il reste en
 * attente par défaut, pour que les suites de l'accueil ne dépendent pas d'un fichier servi.
 */
export const VEILLE_CHARGEMENT = new InjectionToken<() => Promise<unknown>>('VEILLE_CHARGEMENT', {
  providedIn: 'root',
  factory: () => chargerVeille,
});

export interface Actualite {
  id: string;
  /** Date de l'événement à la précision connue : « 2026 », « 2026-06 » ou « 2026-10-07 ». */
  date: string;
  titre: string;
  resume: string;
  source: string;
  consulteLe: string;
}

export interface Veille {
  revueLe: string;
  rythmeJours: number;
  actualites: Actualite[];
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-10-07 » → « 7 octobre 2026 », « 2026-06 » → « juin 2026 », « 2026 » → « 2026 » : jamais un jour inventé. */
export function dateVeille(iso: string): string {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(iso);
  if (!m) return iso;
  const mois = m[2] ? MOIS[Number(m[2]) - 1] : '';
  if (m[3]) return `${Number(m[3])} ${mois} ${m[1]}`;
  return m[2] ? `${mois} ${m[1]}` : m[1];
}

/** Date de la prochaine revue (ISO) : revueLe + rythmeJours, en jours civils (sans fuseau). */
export function prochaineRevue(revueLe: string, rythmeJours: number): string {
  const [a, m, j] = revueLe.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + rythmeJours));
  return d.toISOString().slice(0, 10);
}

/** Jour local de `now` en ISO, pour comparer à une date de revue. */
export function jourIso(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Plus récente d'abord ; une date moins précise (« 2026-06 ») passe après les jours du même mois. */
export function trierActualites(liste: Actualite[]): Actualite[] {
  return [...liste].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Nom d'hôte lisible d'une source (« warhammer-community.com »). */
export function hoteSource(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Contrôle minimal du format reçu : tout autre contenu = erreur, jamais « aucune actualité ». */
export function estVeille(d: unknown): d is Veille {
  const v = d as Veille | null;
  return !!v && typeof v.revueLe === 'string' && typeof v.rythmeJours === 'number' && Array.isArray(v.actualites);
}
