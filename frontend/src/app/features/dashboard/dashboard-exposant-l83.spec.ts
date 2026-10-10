// @vitest-environment node
// L83 (revue UX L2, mineur) : « 41e » n'est pas passé en capitales (« 41E »), un seul procédé d'exposant.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const css = sass.compile(resolve(__dirname, 'dashboard.component.scss'), { loadPaths: [resolve(__dirname, '../../..')] }).css;
const ts = readFileSync(resolve(__dirname, 'dashboard.component.ts'), 'utf8');

describe('Accueil — exposant « e » (L83)', () => {
  it('sup garde sa casse malgré text-transform: uppercase du parent', () => {
    let valeur = '';
    postcss.parse(css).walkRules((r) => {
      if (r.selectors.includes('sup')) r.walkDecls('text-transform', (d) => { valeur = d.value; });
    });
    expect(valeur).toBe('none');
  });

  it('un seul procédé : balise <sup>, pas de lettre modificatrice « ᵉ »', () => {
    expect(ts).not.toContain('ᵉ');
    expect(ts).toContain('<sup>e</sup>');
  });
});
