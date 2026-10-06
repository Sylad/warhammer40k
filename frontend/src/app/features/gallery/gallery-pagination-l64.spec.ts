// @vitest-environment node
// L64/t1 (revue UX) : indicateur de pagination sur une ligne, lisible (WCAG 1.4.3).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const src = resolve(__dirname, '../../..');
const css = sass.compile(resolve(__dirname, 'gallery.component.scss'), { loadPaths: [src] }).css;
const ts = readFileSync(resolve(__dirname, 'gallery.component.ts'), 'utf8');
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
const lum = (hex: string): number => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

describe('Galerie — indicateur de pagination (L64/t1)', () => {
  it('une seule ligne « Page 1 sur 2 · 1–24 sur N »', () => {
    expect(decls('.page-indicator')['flex-direction']).toBeUndefined();
    expect(ts).toMatch(/pageRangeStart\(\) \}\}–\{\{ pageRangeEnd\(\) \}\} sur <strong>\{\{ totalFiltered\(\) \}\}/);
    expect(ts).not.toContain('/ {{ totalFiltered() }}');
  });

  it('plage lisible : ≥ 12 px, sans opacité, contraste ≥ 4,5:1 sur le fond', () => {
    const r = decls('.page-range');
    expect(parseFloat(r['font-size'])).toBeGreaterThanOrEqual(12);
    expect(r.opacity).toBeUndefined();
    const muted = /--muted:\s*(#[0-9a-f]{6})/i.exec(theme)![1];
    const bg = /--bg:\s*(#[0-9a-f]{6})/i.exec(theme)![1];
    const [hi, lo] = [lum(muted), lum(bg)].sort((a, b) => b - a);
    expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    expect(decls('.page-indicator').color).toBe('var(--muted)');
  });
});
