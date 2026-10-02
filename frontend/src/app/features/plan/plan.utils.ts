/**
 * L30 — logique PURE de la page « Plan de travail » (portage d'ol-companion L23) :
 * regroupement par état, avancement, dates en français. Les données viennent de
 * /plan-data/plan.json, généré par `npm run plan` (frontend/scripts/plan-data.mjs)
 * depuis le plan raf : lots visibles, titres PUBLICS et états seulement.
 */
import { formatDay } from '../nouveautes/nouveautes.utils';

export type PlanStatus = 'doing' | 'todo' | 'done';

export interface PlanProgress {
  done: number;
  total: number;
}

export interface PlanLot {
  /** Identifiant du lot : jamais affiché, sert d'ancre /plan#<id>. */
  id: string;
  title: string;
  status: PlanStatus;
  started?: string;
  finished?: string;
  /** Sous-tâches non abandonnées : faites / total. */
  tasks?: PlanProgress;
}

export interface PlanData {
  version: number;
  project: string;
  lots: PlanLot[];
}

export interface PlanGroups {
  doing: PlanLot[];
  todo: PlanLot[];
  /** Livrés depuis RECENT_DAYS jours au plus, le plus récent en premier. */
  done: PlanLot[];
  /** Livrés plus anciens (ou sans date), non affichés. */
  olderDone: number;
}

export const RECENT_DAYS = 30;
export const PLAN_URL = '/plan-data/plan.json';
/** Version du format écrit par scripts/plan-data.mjs ; toute autre = erreur (jamais « plan vide »). */
export const PLAN_VERSION = 1;
const DAY = 86_400_000;

const atMidnight = (day: string) => new Date(`${day}T00:00:00`);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (day: string, today: Date) =>
  Math.round((startOfDay(today).getTime() - atMidnight(day).getTime()) / DAY);

export function groupPlan(lots: readonly PlanLot[], today: Date, recentDays = RECENT_DAYS): PlanGroups {
  const doing = lots.filter((l) => l.status === 'doing');
  const todo = lots.filter((l) => l.status === 'todo');
  const allDone = lots.filter((l) => l.status === 'done');
  const done = allDone
    .filter((l) => l.finished && daysBetween(l.finished, today) <= recentDays)
    .sort((a, b) => (b.finished! < a.finished! ? -1 : b.finished! > a.finished! ? 1 : 0));
  return { doing, todo, done, olderDone: allDone.length - done.length };
}

export const isEmpty = (g: PlanGroups) => g.doing.length + g.todo.length + g.done.length === 0;

const STATUS: Record<PlanStatus, string> = { doing: 'En cours', todo: 'Prévu', done: 'Livré' };
export const statusLabel = (s: PlanStatus) => STATUS[s];

export function dateLine(lot: PlanLot): { day: string; text: string } | null {
  if (lot.status === 'done' && lot.finished) return { day: lot.finished, text: `Livré le ${formatDay(lot.finished)}` };
  if (lot.status === 'doing' && lot.started) return { day: lot.started, text: `Démarré le ${formatDay(lot.started)}` };
  return null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function progressText(p: PlanProgress): string {
  return `${plural(p.done, 'étape faite', 'étapes faites')} sur ${p.total}`;
}

/** Résumé « en ce moment », une phrase (« évolution », féminin). */
export function summary(g: PlanGroups): string {
  const doing = g.doing.length === 0 ? 'Rien en cours' : plural(g.doing.length, 'évolution en cours', 'évolutions en cours');
  return `${doing}, ${plural(g.todo.length, 'prévue', 'prévues')}, ${plural(g.done.length, 'livrée', 'livrées')} ces ${RECENT_DAYS} derniers jours.`;
}

/** Lot → slug de son entrée Nouveautés la plus récente (entrées de la plus récente à la plus ancienne). */
export function newsSlugByLot(entries: readonly { slug: string; lots: readonly string[] }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of entries) for (const id of e.lots) if (!m.has(id)) m.set(id, e.slug);
  return m;
}

/**
 * Plan publié. 404 → null (aucun plan publié) ; toute autre panne — 500, réseau,
 * réponse non JSON, JSON sans liste de lots, version inconnue — lève une erreur (état « Réessayer »).
 * fetch et non HttpClient : fichier statique, hors des intercepteurs PIN / quota.
 */
export async function fetchPlan(): Promise<PlanData | null> {
  const res = await fetch(PLAN_URL, { cache: 'no-cache' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`plan : HTTP ${res.status}`);
  const data = (await res.json()) as PlanData;
  if (!data || typeof data !== 'object' || !Array.isArray(data.lots)) throw new Error('plan : réponse inattendue');
  if (data.version !== PLAN_VERSION) throw new Error(`plan : version ${String(data.version)} inconnue`);
  return data;
}
