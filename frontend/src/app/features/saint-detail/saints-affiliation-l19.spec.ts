// @vitest-environment node
// L19 (revue UX Saints) : l'affiliation (« ordoOrChapter ») reprenait l'étiquette de catégorie (« Sainte canonisée (Cadian) »), qui s'affiche
// juste à côté : sous le nom, sur la carte, dans la visionneuse (« Sainte canonisée — Sainte canonisée (Cadian) ») et dans les données vitales.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const seed: { id: string; ordoOrChapter: string }[] = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/living-saints.json'), 'utf8'));

describe('Saints, affiliation (L19)', () => {
  it('R7 — l\'affiliation de chacun des 8 saints ne répète pas son étiquette de catégorie (Saint, Sainte, Ecclésiarque canonisé…)', () => {
    expect(seed.length).toBe(8);
    for (const s of seed) expect(s.ordoOrChapter, s.id).not.toMatch(/^(sainte?|ecclésiarque)\b.*\bcanonis/i);
  });

  it('R7 — les quatre affiliations réécrites nomment encore leur croisade, secteur, monde ou lignée', () => {
    const par = Object.fromEntries(seed.map(s => [s.id, s.ordoOrChapter]));
    expect(par['saint-sabbat']).toContain('Sabbat Worlds');
    expect(par['saint-drusus']).toContain('Calixis');
    expect(par['saint-praxedes']).toContain('Cadia');
    expect(par['saint-sanguinaire']).toContain('Blood Angels');
  });
});
