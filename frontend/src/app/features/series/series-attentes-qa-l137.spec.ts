// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** L137 : les attendus QA de /romans après L5, inscrits dans docs/qa/expectations.md (lus par qa-reviewer). */
const md = readFileSync(resolve(__dirname, '../../../../../docs/qa/expectations.md'), 'utf8');
const start = md.indexOf('\n## /romans');
const section = md.slice(start, md.indexOf('\n## ', start + 1));
const ligne = (re: RegExp) => section.split('\n').find(l => re.test(l)) ?? '';

describe('attendus QA de /romans', () => {
  it('R1 — le titre est « Romans Black Library »', () => {
    expect(ligne(/h1/)).toMatch(/Romans Black Library/);
  });
  it('R2 — la barre nav.tabs « Affichage des séries » : 4 onglets visibles à 1440, 390 et 320, un seul aria-pressed', () => {
    const l = ligne(/nav\.tabs/);
    expect(l).toMatch(/Affichage des séries/);
    expect(l).toMatch(/4 onglets/);
    expect(l).toMatch(/1440, 390 et 320/);
    expect(l).toMatch(/un seul aria-pressed/);
  });
  it('R3 — le tri « Trier par » est désactivé dans Ordre de lecture avec sa note ; la recherche est nommée', () => {
    expect(ligne(/Trier par/)).toMatch(/Ordre de lecture[^\n]*désactivé[^\n]*note/);
    expect(section).toMatch(/recherche[^\n]*nommé/);
  });
  it('R4 — 27 lettres avec aria-pressed, celles sans série désactivées', () => {
    const l = ligne(/27 lettres/);
    expect(l).toMatch(/aria-pressed/);
    expect(l).toMatch(/sans série[^\n]*désactivées/);
  });
  it('R5 — « N séries affichées sur 38 » au-dessus de Charger plus', () => {
    const l = ligne(/séries affichées sur 38/);
    expect(l).toMatch(/Charger plus/);
  });
  it('R6 — Entrée sur « Voir la couverture de <série> » ouvre un dialogue modal nommé, Échap rend le focus', () => {
    const l = ligne(/Voir la couverture de/);
    expect(l).toMatch(/role=dialog/);
    expect(l).toMatch(/aria-modal/);
    expect(l).toMatch(/Échap[^\n]*focus/);
  });
  it('R7 — l’état vide nomme le filtre et propose « Effacer les filtres »', () => {
    expect(ligne(/Effacer les filtres/)).toMatch(/nomme le filtre/);
  });
  it('R8 — jamais de défilement horizontal à 390 et 320 ; le tiroir du menu reste couvert (L62)', () => {
    expect(section).toMatch(/never:[^\n]*défilement horizontal[^\n]*390 et 320/);
    expect(section).toMatch(/nav\.drawer/);
  });
  it('R9 — appels API : /api/series et /api/wiki-image?q=', () => {
    expect(section).toMatch(/api:[^\n]*\/api\/series/);
    expect(section).toMatch(/api:[^\n]*\/api\/wiki-image\?q=/);
  });
});
