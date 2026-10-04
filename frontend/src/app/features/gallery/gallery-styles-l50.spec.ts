// @vitest-environment node
// L50 (revue UX L45) : statistiques du bandeau (Œuvres, Artistes, Collections) lisibles sur toute image.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const src = resolve(__dirname, '../../..');
const css = sass.compile(resolve(__dirname, 'gallery.component.scss'), { loadPaths: [src] }).css;
const theme = readFileSync(resolve(src, 'styles.scss'), 'utf8');

function decls(sel: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === 'atrule') return;
    if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

const themeColor = (name: string): string => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(theme)![1];
const lum = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('galerie — statistiques du bandeau (L50)', () => {
  it('t1 : chaque statistique sur une pastille opaque var(--panel), comme l’onglet Rechercher', () => {
    expect(decls('.stat-card').background).toBe('var(--panel)');
    expect(decls('.stat-card').padding).toBeTruthy();
  });

  it('t1 : libellé et valeur ≥ 4,5:1 sur la pastille (WCAG 1.4.3), donc sur toute image', () => {
    expect(decls('.stat-label').color).toBe('var(--muted)');
    expect(decls('.stat-num').color).toBe('var(--gold-bright)');
    const panel = themeColor('panel');
    expect(ratio(themeColor('muted'), panel)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(themeColor('gold-bright'), panel)).toBeGreaterThanOrEqual(4.5);
  });
});

// L54 : à 390 px, trois colonnes égales ; libellé 12 px tant que « COLLECTIONS » tient.
function mobileDecls(sel: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkAtRules('media', (at) => {
    if (!/max-width:\s*760px/.test(at.params)) return;
    at.walkRules((rule) => {
      if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
      rule.walkDecls((d) => { out[d.prop] = d.value; });
    });
  });
  return out;
}

describe('galerie — statistiques à 390 px (L54)', () => {
  it('grille de trois colonnes égales, pastilles sans largeur minimale', () => {
    const grid = mobileDecls('.hero-stats');
    expect(grid.display).toBe('grid');
    expect(grid['grid-template-columns']).toBe('repeat(3, 1fr)');
    expect(mobileDecls('.stat-card')['min-width']).toBe('0');
  });

  it('libellé 12 px', () => {
    expect(mobileDecls('.stat-label')['font-size']).toBe('12px');
  });
});
