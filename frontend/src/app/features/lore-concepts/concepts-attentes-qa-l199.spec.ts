// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** L199 : les attendus QA de /lore/concepts, inscrits dans docs/qa/expectations.md (lus par qa-reviewer). */
const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const start = md.indexOf('\n## /lore/concepts');
const fin = md.indexOf('\n## ', start + 1);
const section = start < 0 ? '' : md.slice(start, fin < 0 ? undefined : fin);
const ligne = (re: RegExp) => section.split('\n').find(l => l.startsWith('- ') && re.test(l)) ?? '';

const seed = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/lore-concepts.json'), 'utf8')) as {
  category: string;
  wikiQuery: string;
  keyFacts: unknown[];
  relatedConcepts: unknown[];
}[];

describe('attendus QA de /lore/concepts', () => {
  it('R1 — la section existe, après /lore/civilians', () => {
    expect(start).toBeGreaterThan(md.indexOf('\n## /lore/civilians'));
  });
  it('R2 — 15 concepts, chacun avec son h2, comptes qui suivent le seed', () => {
    expect(ligne(/15 concepts/)).toMatch(/h2/);
    expect(seed).toHaveLength(15);
  });
  it('R3 — compteurs du bandeau 15 / 76 / 44', () => {
    expect(ligne(/15[^\n]*76[^\n]*44/)).toMatch(/Concepts[^\n]*Faits documentés[^\n]*Liens inter-concepts/);
    expect(seed.reduce((n, c) => n + c.keyFacts.length, 0)).toBe(76);
    expect(seed.reduce((n, c) => n + c.relatedConcepts.length, 0)).toBe(44);
  });
  it('R4 — 5 filtres avec aria-pressed, un seul à true, effectifs 15 / 4 / 5 / 5 / 1', () => {
    const l = ligne(/5 filtres/);
    expect(l).toMatch(/aria-pressed/);
    expect(l).toMatch(/un seul[^\n]*true/);
    expect(l).toMatch(/Tous · 15[^\n]*Impérial · 4[^\n]*Warp · 5[^\n]*Monde · 5[^\n]*Doctrine · 1/);
    const n = (cat: string) => seed.filter(c => c.category === cat).length;
    expect([n('imperial'), n('warp'), n('world'), n('doctrine')]).toEqual([4, 5, 5, 1]);
  });
  it('R5 — la visionneuse est un dialogue modal nommé, le focus entre sur « Fermer » et revient au bouton de l\'image', () => {
    const l = ligne(/Visionneuse/);
    expect(l).toMatch(/role=dialog/);
    expect(l).toMatch(/aria-modal/);
    expect(l).toMatch(/Visionneuse — <concept>/);
    expect(l).toMatch(/Fermer/);
    expect(l).toMatch(/Échap/);
    expect(l).toMatch(/Voir en grand — <concept>/);
  });
  it('R6 — contraste du titre de la visionneuse et des textes à 4,5:1 au pire pixel, à 1440, 390 et 320', () => {
    const l = ligne(/4,5:1/);
    expect(l).toMatch(/titre de la visionneuse/);
    expect(l).toMatch(/pire pixel/);
    expect(l).toMatch(/1440, 390 et 320/);
  });
  it('R7 — 15 images distinctes (15 requêtes wiki distinctes)', () => {
    const l = ligne(/images distinctes/);
    expect(l).toMatch(/15 cartes/);
    expect(new Set(seed.map(c => c.wikiQuery)).size).toBe(15);
  });
  it('R8 — jamais de défilement horizontal à 1440, 390 et 320', () => {
    expect(section).toMatch(/never:[^\n]*défilement horizontal[^\n]*1440, 390 et 320/);
  });
  it('R9 — appel API : /api/lore/concepts et /api/wiki-image', () => {
    expect(section).toMatch(/api:[^\n]*\/api\/lore\/concepts[^\n]*\/api\/wiki-image/);
  });
});
