// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

/** L129 : cibles tactiles de la barre du haut de la fiche unité (WCAG 2.5.8 / 44 px sur téléphone). */
const css = sass.compile(resolve(__dirname, 'unit-detail.component.scss')).css;

function declarations(selector: string, media: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    const p = rule.parent;
    const ctx = p && p.type === 'atrule' ? (p as postcss.AtRule).params : null;
    if (ctx !== media) return;
    if (!rule.selectors.some((s) => s.replace(/\s+/g, ' ').trim().endsWith(selector))) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

describe('fiche unité : cibles de la barre du haut', () => {
  const media = '(max-width: 760px)';
  it('« Retour aux unités » mesure au moins 44 px de haut sur téléphone', () => {
    const d = declarations('.back-btn', media);
    expect(d['min-height']).toBe('44px');
    expect(d['display']).toBe('inline-flex');
    expect(d['align-items']).toBe('center');
  });
  it('le bouton partager mesure 44 × 44 px sur téléphone', () => {
    const d = declarations('.iconbtn', media);
    expect(d['width']).toBe('44px');
    expect(d['height']).toBe('44px');
  });
});
