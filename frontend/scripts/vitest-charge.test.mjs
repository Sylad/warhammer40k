// @vitest-environment node
// L113 — la suite complète lance une vingtaine de specs qui pilotent Chromium et d'autres qui
// parcourent dist/ en synchrone, toutes en parallèle (un worker par cœur). Sous cette charge, le
// scan de dist/ de plan-data.test.mjs (~1 s au repos) dépassait les 5 s par défaut de Vitest :
// échec aléatoire, vert en isolé. Garde : la configuration borne le parallélisme et laisse
// aux tests un délai qui ne dépend pas de la charge de la machine.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../vitest.config.ts';
import e2eConfig from '../vitest.e2e.config.ts';

describe('vitest.config.ts — suite déterministe sous charge (L113)', () => {
  const test = config.test;

  it('borne le nombre de workers (Chromium + scans de dist/ ne saturent pas la machine)', () => {
    expect(test.maxWorkers).toBeGreaterThanOrEqual(1);
    expect(test.maxWorkers).toBeLessThanOrEqual(8);
  });

  it('accorde 30 s par test, comme vitest.e2e.config.ts, au lieu des 5 s par défaut', () => {
    expect(test.testTimeout).toBeGreaterThanOrEqual(30000);
    expect(test.hookTimeout).toBeGreaterThanOrEqual(30000);
  });

  // Cas « fiche primarque 390 px, cible à 92 px sous la barre » : l'attente de stabilité de
  // ancres.e2e.spec.ts rendait la main au bout de 10 s même si la position bougeait encore, et la
  // mesure se faisait sur une position instable, sans signal distinct. Un délai plus long n'y
  // change rien : la garde exige que l'instabilité soit rapportée et fasse échouer le cas avant
  // toute assertion de position.
  it('ancres.e2e : une position encore instable à la fin de l\'attente échoue explicitement', () => {
    const src = readFileSync(new URL('../src/app/layout/main-layout/ancres.e2e.spec.ts', import.meta.url), 'utf8');
    expect(src).toMatch(/stable:\s*boolean/);
    expect(src).toMatch(/expect\(m\.stable,.*instable.*\.toBe\(true\)/);
    expect(src.indexOf('m.stable')).toBeLessThan(src.indexOf('m.gap'));
  });
});

// L166 — « Acceptation de bout en bout » : trois fichiers (L47 vidéos, L49 galerie, L120 fiche unité),
// chacun avec son Chromium, tournaient en parallèle sur le runner CI. Trois rouges aléatoires en
// cinq jours sur des fichiers différents (clic du milieu de L47 R9 : waitForEvent 8 s ; R3 de L49 :
// boundingBox 4 s), tous des délais, jamais une assertion fausse. Hypothèse, non prouvée sur la CI : la concurrence.
// Garde : un seul fichier à la fois, donc un seul Chromium.
describe('vitest.e2e.config.ts — un navigateur à la fois (L166)', () => {
  it('R1 — les fichiers e2e tournent l\'un après l\'autre, pas un Chromium par fichier en parallèle', () => {
    expect(e2eConfig.test.fileParallelism).toBe(false);
  });

  // Le remède est une hypothèse tant qu'un rouge n'a pas laissé de mesure : la CI doit conserver la durée de
  // chaque cas et la charge du runner, pour qu'un rouge qui revient soit diagnostiquable.
  it('R2 — la CI garde les durées par cas (rapport junit) et la charge du runner, même en cas d\'échec', () => {
    const wf = readFileSync(new URL('../../.github/workflows/frontend-checks.yml', import.meta.url), 'utf8');
    expect(wf).toMatch(/npm run test:e2e -- --reporter=default --reporter=junit --outputFile\.junit=\S+/);
    expect(wf).toMatch(/nproc/);
    expect(wf).toMatch(/if: always\(\)[\s\S]*actions\/upload-artifact@v4/);
    // le fichier junit demandé doit faire partie du `path:` de l'artefact (sinon `if-no-files-found: ignore` se tait)
    const junit = wf.match(/--outputFile\.junit=(\S+)/)[1];
    expect(wf).toMatch(new RegExp('actions/upload-artifact@v4[\\s\\S]*path:[\\s\\S]*?frontend/' + junit.replace(/\./g, '\\.')));
  });

  // `uptime` relevé une seule fois avant vitest reflète le build qui précède, pas le cas qui expire :
  // un échantillon horodaté pendant toute l'exécution, joint à l'artefact, donne la charge au moment du rouge.
  it('R4 — la CI échantillonne la charge pendant les e2e (fichier horodaté joint à l\'artefact)', () => {
    const wf = readFileSync(new URL('../../.github/workflows/frontend-checks.yml', import.meta.url), 'utf8');
    expect(wf).toMatch(/while [^\n]*do[^\n]*\n?[^\n]*(date|uptime)[\s\S]*>>\s*(e2e-charge\.log)/);
    expect(wf).toMatch(/actions\/upload-artifact@v4[\s\S]*path:[\s\S]*?frontend\/e2e-charge\.log/);
  });

  // Les specs scellées ne se touchent pas, mais DEBUG=pw:api journalise chaque appel Playwright (clic, onglet
  // ouvert, waitForEvent) avec son horodatage, sans modifier un test : c'est ce qui sépare « clic jamais fait »,
  // « clic fait sans onglet » et « onglet en retard ». Le journal doit être joint à l'artefact même en échec.
  it('R3 — la CI journalise les appels Playwright (DEBUG=pw:api) dans un fichier joint à l\'artefact, même en échec', () => {
    const wf = readFileSync(new URL('../../.github/workflows/frontend-checks.yml', import.meta.url), 'utf8');
    expect(wf).toMatch(/DEBUG=pw:api\s+npm run test:e2e[^\n]*\|\s*tee\s+(\S+)/);
    const log = wf.match(/\|\s*tee\s+(\S+)/)[1];
    expect(wf).toMatch(/shell: bash/);
    expect(wf).toMatch(new RegExp('if: always\\(\\)[\\s\\S]*actions/upload-artifact@v4[\\s\\S]*path:[\\s\\S]*?frontend/' + log.replace(/\./g, '\\.')));
  });
});
