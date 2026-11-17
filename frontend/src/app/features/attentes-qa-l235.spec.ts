// @vitest-environment node
// L235 : attendus QA des pages que la QA du 17-11 (L68) a parcourues sans attentes écrites — /lore,
// /lore/emperor, /lore/timeline/:id, /nouveautes, /about — et filtres des listes du lore, inscrits
// dans docs/qa/expectations.md (lu par qa-reviewer). Chaque compte et chaque libellé écrit est
// comparé à sa source (seed servi par l'API, gabarit du composant, journal des nouveautés) : une
// attente qui dérive des données échoue ici, pas en QA.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HOT_ZONES } from './lore-galaxy/lore-galaxy.data';
import { hubMeta, primarchsSummary } from './lore-hub/lore-hub.counts';

const racine = resolve(__dirname, '../../../..');
const lire = (p: string) => readFileSync(resolve(racine, p), 'utf8');
const seed = <T = Record<string, unknown>>(f: string): T[] => JSON.parse(lire(`backend/seed/${f}.json`));
const composant = (p: string) => lire(`frontend/src/app/features/${p}`);
const md = lire('docs/qa/expectations.md');

/** Texte d'une section `## <titre>` du fichier d'attentes ('' si absente). */
function section(titre: string): string {
  const start = md.indexOf(`\n## ${titre}\n`);
  if (start < 0) return '';
  const fin = md.indexOf('\n## ', start + 1);
  return md.slice(start, fin < 0 ? undefined : fin);
}
const lignes = (s: string, prefixe: string) => s.split('\n').filter((l) => l.startsWith(`- ${prefixe}`));
const ligne = (s: string, prefixe: string, re: RegExp) => lignes(s, prefixe).find((l) => re.test(l)) ?? '';
const position = (titre: string) => md.indexOf(`\n## ${titre}\n`);
const count = <T>(a: T[], f: (x: T) => boolean) => a.filter(f).length;

describe('L235 — attendus QA de /lore', () => {
  const s = section('/lore');
  const hub = composant('lore-hub/lore-hub.component.ts');
  const routes = [...hub.matchAll(/route: '(\/lore\/[a-z-]+)'/g)].map((m) => m[1]);

  it('R1 — h1 « Lore Impérial » et une entrée par carte du sommaire, chacune nommée', () => {
    expect(hub).toContain('<h1>Lore Impérial</h1>');
    expect(ligne(s, 'shows:', /h1/)).toContain('« Lore Impérial »');
    const l = ligne(s, 'shows:', /cartes/);
    expect(l).toContain(`${routes.length} cartes`);
    for (const r of routes) expect(l).toContain(r);
  });

  it('R2 — les compteurs écrits sont ceux que le sommaire calcule depuis le seed', () => {
    const meta = hubMeta({
      primarchs: seed<{ allegiance: string }>('primarchs'),
      chaosGods: seed<{ daemons: { notable: unknown[] } }>('chaos-gods'),
      orgs: seed<{ functions: unknown[] }>('imperial-orgs'),
      concepts: seed<{ category: string }>('lore-concepts'),
      events: seed<{ era: string }>('timeline-events'),
      equipment: seed<{ type: string }>('equipment'),
      ships: seed('legendary-ships'),
      godMachines: seed<{ category: string }>('god-machines'),
      saints: seed<{ category: string }>('living-saints'),
      zones: HOT_ZONES,
    });
    const l = ligne(s, 'shows:', /compteurs/);
    for (const [route, valeur] of Object.entries(meta)) expect(l, route).toContain(`« ${valeur} »`);
    expect(l).toContain(`« ${primarchsSummary(seed<{ allegiance: string }>('primarchs'))} »`);
  });

  it('R3 — jamais un compteur périmé ni une carte « À venir » ; les appels API des compteurs', () => {
    expect(ligne(s, 'never:', /compteur/)).toMatch(/aucun chiffre/);
    expect(ligne(s, 'never:', /À venir/)).not.toBe('');
    const api = lignes(s, 'api:').join(' ');
    for (const e of ['/api/lore/primarchs', '/api/lore/chaos-gods', '/api/lore/imperial-orgs', '/api/lore/concepts',
      '/api/timeline-events', '/api/lore/equipment', '/api/lore/ships', '/api/lore/god-machines', '/api/lore/saints']) {
      expect(api, e).toContain(e);
    }
  });
});

describe('L235 — attendus QA de /lore/emperor', () => {
  const s = section('/lore/emperor');
  const emp = JSON.parse(lire('backend/seed/emperor.json')) as {
    title: string; stats: { domaine: string }[]; sections: { title: string; wikiQuery?: string }[];
  };

  it('R4 — la section existe, entre /lore et /lore/chaos-gods', () => {
    expect(position('/lore/emperor')).toBeGreaterThan(position('/lore'));
    expect(position('/lore/emperor')).toBeLessThan(position('/lore/chaos-gods'));
  });
  it('R5 — h1 = titre du seed, lignes de données et sections du seed, chacune avec son image', () => {
    expect(ligne(s, 'shows:', /h1/)).toContain(`« ${emp.title} »`);
    const stats = ligne(s, 'shows:', /lignes de données/);
    expect(stats).toContain(`${emp.stats.length} lignes de données`);
    for (const st of emp.stats) expect(stats).toContain(st.domaine);
    const sect = ligne(s, 'shows:', /sections/);
    expect(sect).toContain(`${emp.sections.length} sections`);
    for (const se of emp.sections) expect(sect).toContain(`« ${se.title} »`);
    expect(sect).toMatch(/image/);
    expect(emp.sections.every((se) => !!se.wikiQuery)).toBe(true);
  });
  it('R6 — appels API : /api/lore/emperor et une requête d\'image par section plus le bandeau', () => {
    const api = lignes(s, 'api:').join(' ');
    expect(api).toContain('/api/lore/emperor');
    expect(api).toContain(`${emp.sections.length + 1} requêtes /api/wiki-image`);
    expect(ligne(s, 'never:', /Chargement des archives sacrées/)).not.toBe('');
  });
});

describe('L235 — filtres des listes du lore', () => {
  it('R7 — /lore/primarchs : 4 filtres comptés depuis le seed, « Tous » seul pressé', () => {
    const p = seed<{ allegiance: string }>('primarchs');
    const l = ligne(section('/lore/primarchs'), 'shows:', /filtres/);
    expect(l).toContain(`« Tous · ${p.length} »`);
    expect(l).toContain(`« Loyalistes · ${count(p, (x) => x.allegiance === 'loyalist')} »`);
    expect(l).toContain(`« Traîtres · ${count(p, (x) => x.allegiance === 'traitor')} »`);
    expect(l).toContain(`« Perdus · ${count(p, (x) => x.allegiance === 'lost')} »`);
    expect(l).toMatch(/aria-pressed/);
  });
  it('R8 — /lore/equipment : 5 filtres de type comptés depuis le seed', () => {
    const e = seed<{ type: string }>('equipment');
    const l = ligne(section('/lore/equipment'), 'shows:', /filtres/);
    expect(l).toContain(`« Tous · ${e.length} »`);
    const libelles: Record<string, string> = { ranged: 'Armes à distance', melee: 'Armes de mêlée', armor: 'Armures', relic: 'Reliques' };
    const src = composant('lore-equipment/lore-equipment.component.ts');
    for (const [k, v] of Object.entries(libelles)) {
      expect(src).toContain(`${k}: '${v}'`);
      expect(l).toContain(`« ${v} · ${count(e, (x) => x.type === k)} »`);
    }
  });
  it('R9 — /lore/timeline : 7 filtres d\'ère comptés depuis le seed', () => {
    const ev = seed<{ era: string }>('timeline-events');
    const src = composant('lore-timeline/lore-timeline.component.ts');
    const eres = [...src.matchAll(/\{ id: '([a-z0-9-]+)',\s+label: (?:'([^']+)'|"([^"]+)")/g)].map((m) => [m[1], m[2] ?? m[3]]);
    expect(eres).toHaveLength(6);
    const l = ligne(section('/lore/timeline'), 'shows:', /filtres/);
    expect(l).toContain(`« Toutes · ${ev.length} »`);
    for (const [id, label] of eres) expect(l).toContain(`« ${label} · ${count(ev, (x) => x.era === id)} »`);
  });
  it('R10 — /lore/ships, /lore/titans, /lore/saints : 4 filtres, libellés du composant, « Tous · N » du seed', () => {
    const cas: [string, string, string][] = [
      ['/lore/ships', 'lore-ships/lore-ships.component.ts', 'legendary-ships'],
      ['/lore/titans', 'lore-titans/lore-titans.component.ts', 'god-machines'],
      ['/lore/saints', 'lore-saints/lore-saints.component.ts', 'living-saints'],
    ];
    for (const [route, fichier, f] of cas) {
      const src = composant(fichier);
      const boutons = [...src.matchAll(/\(click\)="filter\.set\('[^']+'\)">([^<{]+)/g)].map((m) => m[1].trim());
      expect(boutons, route).toHaveLength(4);
      const l = ligne(section(route), 'shows:', /filtres/);
      expect(l, route).toContain(`« Tous · ${seed(f).length} »`);
      for (const b of boutons.slice(1)) expect(l, route).toContain(`« ${b} »`);
      expect(l, route).toMatch(/aria-pressed/);
    }
  });
});

describe('L235 — attendus QA de /lore/timeline/:id', () => {
  const s = section('/lore/timeline/:id');
  const ev = seed<{ id: string; title: string; date: string; tags: string[]; sources: string[] }>('timeline-events');

  it('R11 — la section existe après /lore/timeline et nomme un id réel du seed', () => {
    expect(position('/lore/timeline/:id')).toBeGreaterThan(position('/lore/timeline'));
    const id = s.match(/Visiter ([a-z0-9-]+)/)?.[1] ?? '';
    const e = ev.find((x) => x.id === id);
    expect(e, `id « ${id} »`).toBeDefined();
    const h1 = ligne(s, 'shows:', /h1/);
    expect(h1).toContain(`« ${e!.title} »`);
    expect(h1).toContain(e!.date);
    const sect = ligne(s, 'shows:', /Récit Complet/);
    expect(sect).toContain(`Tags (${e!.tags.length})`);
    expect(sect).toContain(`Sources (${e!.sources.length})`);
    expect(lignes(s, 'api:').join(' ')).toContain(`/api/timeline-events/${id}`);
  });
  it('R12 — le seul lien de la liste vers une fiche est dans une carte dépliée', () => {
    const html = composant('lore-timeline/lore-timeline.component.html');
    const lien = html.indexOf("[routerLink]=\"['/lore/timeline', ev.id]\"");
    expect(lien).toBeGreaterThan(html.indexOf('@if (expandedId() === ev.id)'));
    expect(s).toMatch(/Lire la fiche complète/);
  });
  it('R13 — 404 : « Événement introuvable » avec lien vers la chronologie', () => {
    expect(composant('timeline-event-detail/timeline-event-detail.component.ts')).toContain("'Événement introuvable'");
    expect(ligne(s, '404', /Événement introuvable/)).toMatch(/Toute la chronologie/);
  });
});

describe('L235 — attendus QA de /nouveautes et /about', () => {
  it('R14 — /nouveautes : h1, entrées et captures au plus égales au journal, fichiers statiques', () => {
    const s = section('/nouveautes');
    const journal = JSON.parse(lire('frontend/public/nouveautes-data/nouveautes.json')) as { entries: { captures: unknown[] }[] };
    expect(composant('nouveautes/nouveautes.component.ts')).toContain('<h1>Ce qui a changé</h1>');
    expect(ligne(s, 'shows:', /h1/)).toContain('« Ce qui a changé »');
    const l = ligne(s, 'shows:', /entrées/);
    const n = Number(l.match(/au moins (\d+) entrées/)?.[1]);
    const c = Number(l.match(/(\d+) captures/)?.[1]);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(journal.entries.length);
    expect(c).toBeLessThanOrEqual(journal.entries.reduce((t, e) => t + e.captures.length, 0));
    expect(lignes(s, 'never:').join(' ')).toMatch(/n’a pas pu être chargé/);
    const api = lignes(s, 'api:').join(' ');
    expect(api).toContain('/nouveautes-data/nouveautes.json');
    expect(api).toContain('/nouveautes-data/tailles.json');
  });
  it('R15 — /about : h1 et les h2 du composant, aucun appel API', () => {
    const s = section('/about');
    const src = composant('about/about.component.ts');
    expect(src).toContain('<h1>Le Scribe et son Daemon</h1>');
    expect(ligne(s, 'shows:', /h1/)).toContain('« Le Scribe et son Daemon »');
    const h2 = [...src.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1].replace('&amp;', '&'));
    const l = ligne(s, 'shows:', /h2/);
    expect(l).toContain(`${h2.length} sections h2`);
    for (const t of h2) expect(l).toContain(`« ${t} »`);
    expect(src).not.toMatch(/HttpClient|WarhammerService/);
    expect(lignes(s, 'api:').join(' ')).toMatch(/aucun appel/);
  });
});
