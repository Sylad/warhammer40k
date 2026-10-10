import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * L91 : dans le seed, `date` portait le récit et `summary` la date dans 139 des
 * 214 batailles notables. Une date a une forme (M41.745, 999.M41-010.M42, M42.000+,
 * M31, M31-M42, Pre-M30) ; un récit est une phrase.
 */
const FORME_DATE = /^(Pre-)?(\d{3}\.M\d{2}(-\d{3}\.M\d{2})?|M\d{2}(\.\d{3})?(-M\d{2})?\+?)$/;

interface Bataille {
  name: string;
  date?: string;
  summary: string;
}

const sousFactions = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../../seed/subfactions.json'), 'utf8'),
) as { id: string; notableBattles?: Bataille[] }[];

const batailles = sousFactions.flatMap((s) =>
  (s.notableBattles ?? []).map((b) => ({ id: s.id, ...b })),
);

describe('sous-factions — batailles notables (L91)', () => {
  it('porte des batailles', () => {
    expect(batailles.length).toBeGreaterThan(200);
  });

  it('la date a la forme d’une date du Calendrier Impérial', () => {
    const faux = batailles
      .filter((b) => !FORME_DATE.test(b.date ?? ''))
      .map((b) => `${b.id} / ${b.name} : « ${b.date} »`);
    expect(faux).toEqual([]);
  });

  it('le résumé est un récit, pas une date', () => {
    const faux = batailles
      .filter((b) => FORME_DATE.test(b.summary) || b.summary.length < 10)
      .map((b) => `${b.id} / ${b.name} : « ${b.summary} »`);
    expect(faux).toEqual([]);
  });
});
