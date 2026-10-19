import type { HotZone } from '../lore-galaxy/lore-galaxy.data';

/** Jeux de données dont les cartes du sommaire tirent leurs compteurs (`null` : indisponible). */
export interface HubData {
  primarchs: { allegiance: string }[] | null;
  chaosGods: { daemons: { notable: unknown[] } }[] | null;
  orgs: { functions: unknown[] }[] | null;
  concepts: { category: string }[] | null;
  events: { era: string }[] | null;
  equipment: { type: string }[] | null;
  ships: unknown[] | null;
  godMachines: { category: string }[] | null;
  saints: { category: string }[] | null;
  zones: Pick<HotZone, 'type'>[];
}

/** Compteurs d'une carte par route ; absent = pas de chiffre (jeu de données vide ou indisponible). */
export type HubMeta = Record<string, string | undefined>;

const distinct = (a: Record<string, unknown>[], k: string): number => new Set(a.map((x) => x[k])).size;
const sum = <T>(a: T[], f: (x: T) => number): number => a.reduce((s, x) => s + f(x), 0);
const filled = <T>(a: T[] | null): a is T[] => !!a && a.length > 0;

export function hubMeta(d: HubData): HubMeta {
  return {
    '/lore/primarchs': filled(d.primarchs) ? `${d.primarchs.length} fiches` : undefined,
    '/lore/chaos-gods': filled(d.chaosGods)
      ? `${d.chaosGods.length} dieux · ${sum(d.chaosGods, (g) => g.daemons.notable.length)} daemons notables`
      : undefined,
    '/lore/civilians': filled(d.orgs)
      ? `${d.orgs.length} organisations · ${sum(d.orgs, (o) => o.functions.length)} fonctions`
      : undefined,
    '/lore/concepts': filled(d.concepts) ? `${d.concepts.length} concepts · ${distinct(d.concepts, 'category')} catégories` : undefined,
    '/lore/galaxy': `${d.zones.length} hot zones · ${d.zones.filter((z) => z.type === 'rift').length} failles warp`,
    '/lore/equipment': filled(d.equipment) ? `${d.equipment.length} pièces · ${distinct(d.equipment, 'type')} types` : undefined,
    '/lore/timeline': filled(d.events) ? `${d.events.length} événements · ${distinct(d.events, 'era')} ères` : undefined,
    '/lore/ships': filled(d.ships) ? `${d.ships.length} vaisseaux · toutes factions` : undefined,
    '/lore/titans': filled(d.godMachines) ? `${d.godMachines.length} dieux-machines · ${distinct(d.godMachines, 'category')} catégories` : undefined,
    '/lore/saints': filled(d.saints) ? `${d.saints.length} figures · ${distinct(d.saints, 'category')} catégories` : undefined,
  };
}

/** Répartition des Primarques par allégeance, pour la description de leur carte. */
export function primarchsSummary(primarchs: { allegiance: string }[] | null): string | undefined {
  if (!filled(primarchs)) return undefined;
  const n = (a: string) => primarchs.filter((p) => p.allegiance === a).length;
  return `${n('loyalist')} Loyalistes, ${n('traitor')} Traîtres, ${n('lost')} Perdus.`;
}
