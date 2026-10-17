import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const series: { id: string; epoque: string; epoqueOrdre?: unknown }[] = JSON.parse(
  readFileSync(resolve(__dirname, '../../../seed/series.json'), 'utf8'),
);

describe('seed series.json — clé d’époque (L136)', () => {
  it('R4 — chaque série porte une clé d’époque entière (ordre de lecture chronologique)', () => {
    const sans = series.filter((s) => !Number.isInteger(s.epoqueOrdre)).map((s) => s.id);
    expect(sans).toEqual([]);
  });

  it('R4 — la clé suit le millénaire écrit dans le texte d’époque', () => {
    const rang = (s: { epoque: string; epoqueOrdre?: unknown }) => s.epoqueOrdre as number;
    const parMillenaire = (m: number) => series.filter((s) => s.epoque.startsWith(`M${m}`)).map(rang);
    for (const [m, borne] of [[30, 300], [31, 310], [32, 320]] as const) {
      for (const k of parMillenaire(m)) expect(Math.floor(k / 10) * 10).toBeGreaterThanOrEqual(borne);
    }
    expect(Math.max(...parMillenaire(30))).toBeLessThan(Math.min(...parMillenaire(41)));
    expect(Math.max(...parMillenaire(41))).toBeLessThan(Math.min(...parMillenaire(42)));
    const hors = series.filter((s) => s.epoque.startsWith('Hors temps')).map(rang);
    expect(Math.min(...hors)).toBeGreaterThan(Math.max(...parMillenaire(42)));
  });

  it('R4 — une suite de saga vient après le tome qu’elle prolonge (Eisenhorn, Ravenor, Bequin), sans égalité', () => {
    const cle = (id: string) => series.find((s) => s.id === id)?.epoqueOrdre as number;
    expect(cle('eisenhorn')).toBeLessThan(cle('ravenor'));
    expect(cle('ravenor')).toBeLessThan(cle('bequin'));
  });
});
