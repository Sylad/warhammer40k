// @vitest-environment node
// L253 (WCAG 1.4.4) — les tailles de texte suivent la taille de police choisie par le visiteur : aucune
// `font-size`, `line-height` ou `letter-spacing` en px dans les feuilles du frontend (partiels globaux, feuilles
// de composants, styles en ligne des composants). Une taille qui dépend de la largeur (clamp(…, Xvw, …)) porte
// le terme « + Brem - Bpx », nul au réglage normal et qui fait suivre la police au-delà (sinon le vw seul la fige).
// Mesure dans le navigateur : texte-200-contenu-l253.e2e.spec.ts.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const src = resolve(__dirname, '..');

function fichiers(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) return fichiers(p);
    if (e.name.endsWith('.scss')) return [p];
    if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') && /styles\s*:\s*\[/.test(readFileSync(p, 'utf8'))) return [p];
    return [];
  });
}

/** Exceptions nommées : la marque de l'en-tête au téléphone se borne à la largeur (L250, barre réglée en rem). */
const VW_PERMIS = ['min(1.05rem, 7.5vw)'];

/** Une longueur en px, négative comprise (« -1px », L253 r1 de la revue de code), hors nom de variable (« --x-12px »). */
const PX = /(?<![\w.-])-?\d*\.?\d+px/;

const DECL = /(font-size|line-height|letter-spacing|@include fit-title\()\s*:?\s*([^;{}\n]+)/g;

describe('tailles de texte en rem (L253)', () => {
  const ecarts: string[] = [];
  for (const f of fichiers(src)) {
    const lignes = readFileSync(f, 'utf8').split('\n');
    lignes.forEach((ligne, i) => {
      for (const m of ligne.matchAll(DECL)) {
        const valeur = m[2].replace(/\/\*.*$/, '');
        const sansTerme = valeur.replace(/ \+ \d*\.?\d+rem - \d*\.?\d+px/g, '');
        const ou = `${relative(src, f)}:${i + 1} ${m[1]} ${valeur.trim()}`;
        if (PX.test(sansTerme)) ecarts.push(`px : ${ou}`);
        if (/vw/.test(valeur) && !/ \+ \d*\.?\d+rem - \d*\.?\d+px/.test(valeur) && !VW_PERMIS.some((v) => valeur.includes(v))) ecarts.push(`vw sans terme rem : ${ou}`);
        for (const t of valeur.matchAll(/ \+ (\d*\.?\d+)rem - (\d*\.?\d+)px/g)) {
          if (parseFloat(t[1]) * 16 !== parseFloat(t[2])) ecarts.push(`terme non nul à 100 % : ${ou}`);
        }
      }
    });
  }
  it('la garde reconnaît une valeur px négative, pas un nom de variable', () => {
    expect(['-1px', '0 -0.5px', 'calc(1rem - 2px)', '12px'].map((v) => PX.test(v))).toEqual([true, true, true, true]);
    expect(['var(--ecart-12px)', '1.5rem', '0.12em'].map((v) => PX.test(v))).toEqual([false, false, false]);
  });
  it('aucune taille de texte en px, terme rem des clamp() nul au réglage normal', () => {
    expect(ecarts).toEqual([]);
  });
});
