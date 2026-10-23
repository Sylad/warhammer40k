// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** L187 : les attendus QA de /lore/civilians, inscrits dans docs/qa/expectations.md (lus par qa-reviewer). */
const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const start = md.indexOf('\n## /lore/civilians');
const section = start < 0 ? '' : md.slice(start, md.indexOf('\n## ', start + 1) < 0 ? undefined : md.indexOf('\n## ', start + 1));
const ligne = (re: RegExp) => section.split('\n').find(l => l.startsWith('- ') && re.test(l)) ?? '';

const seed = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/imperial-orgs.json'), 'utf8')) as {
  functions: unknown[];
  notableFigures: { wikiQuery?: string }[];
}[];

describe('attendus QA de /lore/civilians', () => {
  it('R1 — la section existe, après /lore/chaos-gods', () => {
    expect(start).toBeGreaterThan(md.indexOf('\n## /lore/chaos-gods'));
  });
  it('R2 — 13 organisations, chacune avec son h2', () => {
    expect(ligne(/13 organisations/)).toMatch(/h2/);
    expect(seed).toHaveLength(13);
  });
  it('R3 — 29 figures notables avec image, comptes qui suivent le seed', () => {
    expect(ligne(/29 figures/)).toMatch(/image/);
    expect(seed.flatMap(o => o.notableFigures).filter(f => f.wikiQuery)).toHaveLength(29);
  });
  it('R4 — compteurs du bandeau 13 / 68 / 29', () => {
    expect(ligne(/13[^\n]*68[^\n]*29/)).toMatch(/Organisations[^\n]*Fonctions documentées[^\n]*Figures notables/);
    expect(seed.reduce((n, o) => n + o.functions.length, 0)).toBe(68);
  });
  it('R5 — 7 filtres avec aria-pressed, un seul à true', () => {
    const l = ligne(/7 filtres/);
    expect(l).toMatch(/aria-pressed/);
    expect(l).toMatch(/un seul[^\n]*true/);
  });
  it('R6 — la visionneuse est un dialogue modal', () => {
    const l = ligne(/Visionneuse/);
    expect(l).toMatch(/role=dialog/);
    expect(l).toMatch(/aria-modal/);
  });
  it('R7 — contrastes : h2 ≥ 3:1 et textes ≥ 4,5:1 au pire pixel à 1440, 390 et 320', () => {
    const l = ligne(/3:1/);
    expect(l).toMatch(/h2/);
    expect(l).toMatch(/4,5:1/);
    expect(l).toMatch(/pire pixel/);
    expect(l).toMatch(/1440, 390 et 320/);
  });
  it('R8 — jamais de défilement horizontal à 1440, 390 et 320', () => {
    expect(section).toMatch(/never:[^\n]*défilement horizontal[^\n]*1440, 390 et 320/);
  });
  it('R9 — appel API : /api/lore/imperial-orgs', () => {
    expect(section).toMatch(/api:[^\n]*\/api\/lore\/imperial-orgs/);
  });
});
