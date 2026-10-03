// @vitest-environment node
// L45 (revue UX) : styles d'accessibilité de la galerie, lus dans la feuille compilée comme ng build.
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const src = resolve(__dirname, '../../..');
const css = sass.compile(resolve(__dirname, 'gallery.component.scss'), { loadPaths: [src] }).css;

/** Déclarations cumulées de toutes les règles hors @media dont un sélecteur est exactement `sel`. */
function decls(sel: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === 'atrule') return;
    if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

describe('galerie — styles d’accessibilité (L45)', () => {
  it('t1 : placeholder de la recherche en couleur du thème (var(--muted)), pas le gris par défaut', () => {
    expect(decls('.search-bar input::placeholder').color).toBe('var(--muted)');
  });

  it('t1 : libellé de la recherche au style des libellés de filtres (capitales 10 px, variable du thème)', () => {
    const label = decls('.search-label');
    const filter = decls('.filter-row label');
    for (const p of ['color', 'font-size', 'font-weight', 'letter-spacing', 'text-transform']) {
      expect(label[p], p).toBe(filter[p]);
    }
    expect(label.color).toMatch(/^var\(--/);
  });

  it('t1 : champ et libellé sur fond opaque du thème — contraste indépendant de l’image du bandeau', () => {
    // Mesuré : var(--muted) sur var(--panel) = 5,50:1 ; sur l'ancien fond translucide, 4,40:1 au pire.
    expect(decls('.search-bar input').background).toBe('var(--panel)');
    expect(decls('.search-label').background).toBe('var(--panel)');
  });
});
