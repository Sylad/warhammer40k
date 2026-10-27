// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** L209 : les attendus QA de /lore/galaxy, inscrits dans docs/qa/expectations.md (lus par qa-reviewer). */
const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const start = md.indexOf('\n## /lore/galaxy');
const fin = md.indexOf('\n## ', start + 1);
const section = start < 0 ? '' : md.slice(start, fin < 0 ? undefined : fin);
const ligne = (re: RegExp) => section.split('\n').find(l => l.startsWith('- ') && re.test(l)) ?? '';
const composant = readFileSync(resolve(__dirname, 'lore-galaxy.component.ts'), 'utf8');

describe('attendus QA de /lore/galaxy', () => {
  it('R1 — la section existe, après /lore/primarchs/:id et avant /lore/timeline', () => {
    expect(start).toBeGreaterThan(md.indexOf('\n## /lore/primarchs/:id'));
    expect(start).toBeLessThan(md.indexOf('\n## /lore/timeline'));
  });
  it('R2 — h1 « La Galaxie »', () => {
    expect(ligne(/h1/)).toMatch(/La Galaxie/);
    expect(composant).toContain('<h1>La Galaxie</h1>');
  });
  it('R3 — carte nommée « Carte de la galaxie » (region)', () => {
    const l = ligne(/Carte de la galaxie/);
    expect(l).toMatch(/region/);
    expect(composant).toContain('role="region" aria-label="Carte de la galaxie"');
  });
  it('R4 — 3 filtres aria-pressed, tous à true au départ : Mondes, Failles warp, Segmenta', () => {
    const l = ligne(/3 filtres/);
    expect(l).toMatch(/aria-pressed/);
    expect(l).toMatch(/true/);
    expect(l).toMatch(/Mondes[^\n]*Failles warp[^\n]*Segmenta/);
    expect(composant.match(/class="map-filter-btn"/g)).toHaveLength(3);
  });
  it('R5 — légende « Les 5 Segmenta »', () => {
    expect(ligne(/légende/)).toMatch(/Les 5 Segmenta/);
    expect(composant).toContain('<h3>Les 5 Segmenta</h3>');
  });
  it('R6 — jamais .map-calib sans PIN', () => {
    expect(section).toMatch(/never:[^\n]*\.map-calib[^\n]*PIN/);
  });
  it('R7 — jamais de défilement horizontal à 1440, 390 et 320', () => {
    expect(section).toMatch(/never:[^\n]*défilement horizontal[^\n]*1440, 390 et 320/);
  });
});
