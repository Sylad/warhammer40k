// @vitest-environment node
// L78 (revue UX L2, WCAG 1.4.3) : texte des cartes raccourcis lisible sur n'importe quelle image.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const src = resolve(__dirname, '../../..');
const css = sass.compile(resolve(__dirname, 'dashboard.component.scss'), { loadPaths: [src] }).css;
const ts = readFileSync(resolve(__dirname, 'dashboard.component.ts'), 'utf8');

function decls(sel: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === 'atrule') return;
    if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (rgb: number[]) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

/** Arrêts du dégradé : [position %, opacité du noir]. */
function stops(): Array<[number, number]> {
  const g = decls('.shortcut-overlay').background;
  return [...g.matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)\s+(\d+)%/g)].map((m) => [Number(m[2]), Number(m[1])]);
}

describe('accueil — cartes raccourcis (L78)', () => {
  it('le voile atteint 0,8 avant le sous-titre (≤ 50 % de la hauteur)', () => {
    const s = stops();
    expect(s.length).toBeGreaterThanOrEqual(3);
    const first = s.find(([, a]) => a >= 0.8);
    expect(first?.[0]).toBeLessThanOrEqual(50);
  });

  it('sous-titre, titre et pied ≥ 4,5:1 même sur une image blanche sous le voile à 0,8', () => {
    const under = 255 * (1 - 0.8);
    const bg = lum([under, under, under]);
    for (const c of ['#d8cfb8', '#c9a24a']) expect(ratio(lum(hex(c)), bg), c).toBeGreaterThanOrEqual(4.5);
  });

  it('le sous-titre garde la couleur mesurée (#d8cfb8)', () => {
    expect(decls('.shortcut p').color).toBe('#d8cfb8');
  });

  it('image des Romans (Black Library) assombrie, y compris au survol', () => {
    expect(ts).toMatch(/route: '\/romans'[\s\S]*?dim: true/);
    expect(decls('.shortcut-img.dim').filter).toMatch(/brightness\(0?\.[0-6]\d*\)/);
    expect(decls('.shortcut:hover .shortcut-img.dim').filter).toMatch(/brightness\(0?\.[0-6]\d*\)/);
  });
});
