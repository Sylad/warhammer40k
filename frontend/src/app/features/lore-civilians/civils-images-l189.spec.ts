// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L189 : QA prod du 23-10 — Solomon Voss et Mersadie Oliton affichaient la même image (Iacton Qruze), Lady Aurelia Malys
 * un kabal drukhari, Cornelius von Bismarck The Despoiler (Abaddon), Aleya (Jenetia Krole) un « Oblivion Knight ».
 * Cause : le wiki n'a pas de page illustrée à leur nom, `/api/wiki-image` retombe sur la première page trouvée par
 * recherche. Chaque figure vise donc une page du wiki qui existe et porte une image de son sujet.
 */
const seed = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/imperial-orgs.json'), 'utf8')) as {
  notableFigures: { name: string; wikiQuery: string }[];
}[];
const figures = seed.flatMap(o => o.notableFigures);
const requete = (nom: string) => figures.find(f => f.name === nom)?.wikiQuery;

const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const debut = md.indexOf('\n## /lore/civilians');
const fin = md.indexOf('\n## ', debut + 1);
const section = md.slice(debut, fin < 0 ? undefined : fin);

describe('images des figures des Civils Impériaux', () => {
  it('R1 — Solomon Voss vise la nouvelle qui le met en scène, pas Iacton Qruze', () => {
    expect(requete('Solomon Voss')).toBe('The Last Remembrancer (Anthology Short Story)');
  });
  it('R2 — Mersadie Oliton vise Horus Rising, le roman où elle apparaît', () => {
    expect(requete('Mersadie Oliton')).toBe('Horus Rising');
  });
  it('R3 — Lady Aurelia Malys vise les Rogue Traders, pas le kabal drukhari', () => {
    expect(requete('Lady Aurelia Malys')).toBe('Rogue Traders');
  });
  it('R4 — Cornelius von Bismarck vise Battlefleet Gothic, pas la Gothic War (The Despoiler)', () => {
    expect(requete('Lord-Admiral Cornelius von Bismarck')).toBe('Battlefleet Gothic');
  });
  it('R5 — Aleya vise les Sœurs du Silence, pas un « Oblivion Knight »', () => {
    expect(requete('Knight-Centura Aleya')).toBe('Sisters of Silence');
  });
  it('R6 — deux figures ne partagent jamais la même requête (donc jamais la même image)', () => {
    const vues = figures.map(f => f.wikiQuery.toLowerCase().trim());
    expect(vues.filter((q, i) => vues.indexOf(q) !== i)).toEqual([]);
  });
  it('R7 — l\'attente « image de son sujet, jamais partagée » est dans ## /lore/civilians', () => {
    const l = section.split('\n').find(x => x.startsWith('- never:') && /image de son sujet/.test(x)) ?? '';
    expect(l).toMatch(/jamais partagée/);
    expect(l).toMatch(/Iacton Qruze/);
  });
});
