// @vitest-environment node
// L18 (revue UX Titans, fiche) : « 12 mètres · 410 tonnes » (.hero-size) avait la même ligne que l'étiquette de classe
// et se coupait à 390 px (« tonnes » seul). La règle : sa propre ligne sous l'étiquette, 14 px au moins, ≥ 4,5:1 sur le
// pire fond (image blanche sous le voile relevé), sans retour à la ligne forcé au milieu d'un mot.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const src = resolve(__dirname, '../../..');
const css = sass.compile(resolve(src, 'app/features/ship-detail/ship-detail.component.scss'), { loadPaths: [src] }).css;
const styles = readFileSync(resolve(src, 'styles.scss'), 'utf8');

function decls(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules(r => {
    if (r.selectors.includes(selector)) r.walkDecls(d => { out[d.prop] = d.value; });
  });
  return out;
}
const hex = (v: string) => [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16));
const lum = (c: number[]) => {
  const [r, g, b] = c.map(x => { const s = x / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('Titans, taille dans l\'en-tête (L18)', () => {
  it('R4 — .hero-size occupe sa propre ligne sous l\'étiquette de classe, avec une marge basse avant le titre', () => {
    const d = decls('.hero-size');
    expect(d['display']).toBe('block');
    expect(parseFloat(d['margin-bottom'] ?? d['margin']?.split(' ')[2] ?? '0')).toBeGreaterThanOrEqual(12);
  });

  it('R5 — .hero-size fait 14 px au moins et ne casse pas « 410 tonnes » en laissant un mot orphelin', () => {
    const d = decls('.hero-size');
    expect(parseFloat(d['font-size'])).toBeGreaterThanOrEqual(14);
    expect(d['text-wrap']).toBe('balance');
  });

  it('R6 — le texte de .hero-size tient 4,5:1 sur le pire fond : image blanche sous le voile relevé (0,72)', () => {
    const couleur = decls('.hero-size')['color'];
    const nom = /var\(--([\w-]+)\)/.exec(couleur)?.[1];
    const valeur = nom ? new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`).exec(styles)?.[1] : couleur;
    expect(valeur).toMatch(/^#[0-9a-fA-F]{6}$/);
    const fond = [255, 255, 255].map(x => Math.round(x * (1 - 0.72)));
    expect(ratio(hex(valeur!), fond)).toBeGreaterThanOrEqual(4.5);
  });
});
