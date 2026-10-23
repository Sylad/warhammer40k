// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L194 : QA prod du 23-10 — « Sébastian Thor » n'a pas de page au wiki : `/api/wiki-image?q=Sebastian Thor` retombait
 * sur la recherche et renvoyait pageTitle « Reign of Blood ». Comme L189, la figure vise une page du wiki qui existe
 * à son sujet (l'Apostasie qu'il a close) et qui porte une image : le pageTitle est alors le sujet de la requête.
 */
const seed = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/imperial-orgs.json'), 'utf8')) as {
  notableFigures: { name: string; wikiQuery: string }[];
}[];
const figures = seed.flatMap(o => o.notableFigures);

const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const debut = md.indexOf('\n## /lore/civilians');
const fin = md.indexOf('\n## ', debut + 1);
const section = md.slice(debut, fin < 0 ? undefined : fin);

describe('image de Sébastian Thor (Civils Impériaux)', () => {
  it('R1 — Sébastian Thor vise la page « Age of Apostasy », pas une requête qui retombe sur la recherche', () => {
    expect(figures.find(f => f.name === 'Sébastian Thor')?.wikiQuery).toBe('Age of Apostasy');
  });
  it('R2 — l\'attente « pageTitle = sujet du wikiQuery » est dans ## /lore/civilians', () => {
    const l = section.split('\n').find(x => x.startsWith('- never:') && /pageTitle/.test(x)) ?? '';
    expect(l).toMatch(/sujet du wikiQuery/);
    expect(l).toMatch(/Reign of Blood/);
  });
  it('R2 — l\'attente est bornée aux six figures corrigées, pas à toute figure', () => {
    const l = section.split('\n').find(x => x.startsWith('- never:') && /pageTitle/.test(x)) ?? '';
    expect(l).toMatch(/six figures/);
    expect(l).not.toMatch(/never: une figure dont l.image vient d.un repli de recherche du wiki : pageTitle/);
  });
  it('R3 — aucune autre figure ne partage la requête de Thor', () => {
    expect(figures.filter(f => f.wikiQuery.toLowerCase() === 'age of apostasy')).toHaveLength(1);
  });
});
