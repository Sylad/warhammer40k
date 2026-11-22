// @vitest-environment node
// L246 (QA prod du 22-11, L76) : attendus QA de /videos (cartes vidéo, chaînes, appels d'API) et
// des factions sans unité sur /factions, inscrits dans docs/qa/expectations.md (lu par qa-reviewer).
// Chaque compte, nom et libellé écrit est comparé à sa source (seed servi par l'API, gabarit du
// composant, routes) : une attente qui dérive des données échoue ici, pas en QA.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const racine = resolve(__dirname, '../../../..');
const lire = (p: string) => readFileSync(resolve(racine, p), 'utf8');
const seed = <T = Record<string, unknown>>(f: string): T[] => JSON.parse(lire(`backend/seed/${f}.json`));
const md = lire('docs/qa/expectations.md');

function section(titre: string): string {
  const start = md.indexOf(`\n## ${titre}\n`);
  if (start < 0) return '';
  const fin = md.indexOf('\n## ', start + 1);
  return md.slice(start, fin < 0 ? undefined : fin);
}

describe('L246 — attendus QA de /videos', () => {
  const s = section('/videos');
  const gabarit = lire('frontend/src/app/features/videos/videos.component.ts');
  const chaines = seed<{ name: string; priority?: boolean; url: string }>('channels');
  const videos = seed('videos');
  const constante = (nom: string) => Number(new RegExp(`static readonly ${nom} = (\\d+);`).exec(gabarit)?.[1]);

  it('la section existe et nomme le h1 du gabarit', () => {
    expect(s).not.toBe('');
    expect(gabarit).toContain('>Archives Cinématiques</h1>');
    expect(s).toContain('h1 « Archives Cinématiques »');
  });

  it('comptes du seed et premier affichage = constantes du composant', () => {
    expect(s).toContain(`Le seed compte ${videos.length} vidéos et ${chaines.length} chaînes`);
    expect(s).toContain(`au plus ${constante('PAGE_FEATURED')} dans « Incontournables »`);
    expect(s).toContain(`${constante('PAGE_ALL')} dans « Toutes les vidéos »`);
    expect(s).toContain(`au plus ${constante('PAGE_CHANNELS')} au premier affichage`);
  });

  it('sélecteurs et libellés écrits = gabarit', () => {
    for (const t of ['data-testid="carte-video"', 'class="video-title"', 'class="channel-mini"', 'class="channel-card"',
      '<h3>Chaînes prioritaires</h3>', '<h2>Chaînes recommandées</h2>', '<h2>Incontournables</h2>', '<h2>Toutes les vidéos</h2>',
      'Charger plus de chaînes (', 'Impossible de charger les vidéos', 'Le codex ne contient encore aucune vidéo']) {
      expect(gabarit, t).toContain(t);
    }
  });

  it('chaînes prioritaires écrites = chaînes priority: true du seed', () => {
    const prio = chaines.filter((c) => c.priority).map((c) => c.name);
    expect(prio.length).toBeGreaterThan(0);
    for (const n of prio) expect(s).toContain(`« ${n} »`);
    expect(s).toContain(`${prio.length} chaînes le 22-11`);
  });

  it('les chaînes retirées citées = HANDLES_RETIRES du backend', () => {
    const src = lire('backend/src/common/chaines-retirees.ts');
    const handles = [...(/HANDLES_RETIRES = \[([^\]]+)\]/.exec(src)?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(handles.length).toBe(6);
    const cites = [...s.matchAll(/@([A-Za-z0-9]+)/g)].map((m) => m[1].toLowerCase());
    expect([...new Set(cites)].sort()).toEqual([...handles].sort());
  });

  it('les trois appels d’API de la page, déclarés par le service', () => {
    const service = lire('frontend/src/app/core/services/warhammer.service.ts');
    for (const a of ['/videos`', '/channels`', '/channels?priority=true`']) expect(service).toContain(a);
    expect(s).toMatch(/- api: \/api\/videos .*\/api\/channels .*\/api\/channels\?priority=true/);
  });

  it('/chaines n’est pas une route et aucun lien interne n’y mène', () => {
    const routes = lire('frontend/src/app/app.routes.ts');
    expect(routes).not.toMatch(/path: 'chaines'/);
    expect(routes).toContain("{ path: '**', redirectTo: 'factions' }");
    expect(s).toContain('/chaines n\'est pas une route');
  });
});

describe('L246 — factions sans unité sur /factions', () => {
  const s = section('/factions');
  const factions = seed<{ id: string; nom: string }>('factions');
  const unites = seed<{ factionId: string }>('units');
  const ids = new Set(factions.map((f) => f.id));
  const sansUnite = factions.filter((f) => !unites.some((u) => u.factionId === f.id));

  it('aucune unité du seed ne pointe vers une faction inconnue (pas de défaut de correspondance)', () => {
    expect(unites.filter((u) => !ids.has(u.factionId))).toEqual([]);
  });

  it('les factions écrites sans unité = celles du seed, et les autres sont dites ≥ 1', () => {
    const l = s.split('\n').find((x) => x.includes('Aucune fiche d\'unité pour l\'instant')) ?? '';
    const nombres = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit'];
    expect(l).toContain(`${nombres[sansUnite.length]} factions : ${sansUnite.map((f) => f.nom).join(', ')}`);
    const autres = factions.length - sansUnite.length;
    expect(l).toContain(`les ${['', '', '', '', '', '', '', '', '', '', '', 'onze', 'douze'][autres] || autres} autres`);
  });

  it('le libellé écrit est celui du gabarit (apostrophes typographiques à l’écran)', () => {
    const gabarit = lire('frontend/src/app/features/factions/factions.component.ts');
    expect(gabarit).toContain('data-testid="aucune-unite">Aucune fiche d’unité pour l’instant<');
    expect(s).toContain('data-testid="aucune-unite"');
  });
});

describe('L247 — assassins de l’Officio Assassinorum dans les attendus de /factions/:id', () => {
  const s = section('/factions/:id');
  const unites = seed<{ id: string; nom: string; factionId: string }>('units');
  const de = (f: string) => unites.filter((u) => u.factionId === f);

  it('les fiches et les comptes écrits = seed', () => {
    const l = s.split('\n').find((x) => x.includes('(L247)')) ?? '';
    const officio = de('officio-assassinorum');
    for (const u of officio) expect(l).toContain(u.nom);
    expect(l).toContain(`factionId=officio-assassinorum\` en rend ${officio.length}`);
    expect(l).toContain(`inquisition : ${de('inquisition').length} fiches`);
    expect(l).toContain(`factionId=inquisition\` en rend ${de('inquisition').length}`);
    expect(de('inquisition').filter((u) => u.nom.includes('Assassin'))).toEqual([]);
  });
});
