// @vitest-environment node
// L53 (même cause que L45/L50) : le bandeau de la galerie reste lisible sur une image d'en-tête claire.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const src = resolve(__dirname, '../../..');
const css = sass.compile(resolve(__dirname, 'gallery.component.scss'), { loadPaths: [src] }).css;
const partial = sass.compile(resolve(src, 'styles/_gallery-filtres.scss')).css;
const theme = readFileSync(resolve(src, 'styles.scss'), 'utf8');

function decls(sel: string, from = css): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(from).walkRules((rule) => {
    if (rule.parent?.type === 'atrule') return;
    if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

const themeColor = (name: string): string => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(theme)![1];
const rgb = (hex: string): number[] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lum = (c: number[]): number => {
  const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a: number[], b: number[]): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Pire cas : image blanche, filtre de .hero-bg (contraste puis luminosité) puis voile noir. */
function worstCaseBackground(): number[] {
  const f = decls('.hero-bg').filter!;
  const contrast = parseFloat(/contrast\(([\d.]+)\)/.exec(f)![1]);
  const brightness = parseFloat(/brightness\(([\d.]+)\)/.exec(f)![1]);
  const veil = decls('.gallery-page .hero::after', partial).background!;
  const m = /rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/.exec(veil)!;
  const alpha = parseFloat(m[1]);
  const white = Math.min(255, (1 - 0.5) * contrast * 255 + 127.5) * brightness;
  const v = white * (1 - alpha);
  return [v, v, v];
}

describe('galerie — voile sombre du bandeau (L53)', () => {
  it('un voile noir couvre le bandeau sous le contenu, sans capter les clics', () => {
    const veil = decls('.gallery-page .hero::after', partial);
    expect(veil.position).toBe('absolute');
    expect(veil.inset).toBe('0');
    expect(veil['pointer-events']).toBe('none');
    expect(decls('.hero-content')['z-index']).toBe('1');
  });

  it.each([
    ['surtitre', 'gold', 0],
    ['description', '', 0],
    ['bouton Importer', 'gold-bright', 0],
  ])('%s ≥ 4,5:1 sur une image blanche voilée (WCAG 1.4.3)', (nom, token) => {
    const bg = worstCaseBackground();
    const fg = nom === 'description' ? rgb(decls('.hero-desc').color!) : rgb(themeColor(token));
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});
