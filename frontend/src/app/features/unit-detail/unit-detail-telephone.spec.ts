// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

/** L128 : fiche unité à 390 px — quatre onglets visibles d'un coup, Informations clés remontées. */
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

describe('fiche unité : téléphone', () => {
  const media = '(max-width: 760px)';

  it('la barre d\'onglets passe à la ligne quand ils ne tiennent pas (360 et 320 px) : rien n\'est coupé', () => {
    const d = declarations('.tabs', media);
    expect(d['flex-wrap']).toBe('wrap');
    expect(d['overflow-x']).toBeUndefined();
    expect(d['mask-image']).toBeUndefined();
  });

  it('les quatre onglets tiennent dans 358 px : espacement et lettrage resserrés, sans marge morte', () => {
    expect(declarations('.tab', media)['padding']).toBe('12px 6px');
    expect(declarations('.tab', media)['letter-spacing']).toBe('0.05em');
    expect(declarations('.tabs', media)['padding-right']).toBeUndefined();
  });

  it('les onglets mesurent au moins 44 px de haut', () => {
    expect(declarations('.tab', media)['min-height']).toBe('44px');
  });

  it('Informations clés passe avant le contenu : colonne latérale aplatie, bloc en tête', () => {
    expect(declarations('.sidebar', media)['display']).toBe('contents');
    expect(declarations('.sp-info', media)['order']).toBe('-1');
  });

  it('Informations clés tient sur deux colonnes', () => {
    expect(declarations('.sp-info-rows', media)['grid-template-columns']).toBe('repeat(2, minmax(0, 1fr))');
  });
});
