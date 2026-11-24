// @vitest-environment node
// L82 (revue UX L2, mineur) : le libellé de type des brèves n'est plus à 9 px.
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';
import { taillePx } from '../../../testing/taille-px';

const css = sass.compile(resolve(__dirname, 'dashboard.component.scss'), { loadPaths: [resolve(__dirname, '../../..')] }).css;

function taille(sel: string): number {
  let px = NaN;
  postcss.parse(css).walkRules((r) => {
    if (r.selectors.includes(sel)) r.walkDecls('font-size', (d) => { px = taillePx(d.value); /* L253 : rem au réglage normal */ });
  });
  return px;
}

describe('Brèves — libellé de type (L82)', () => {
  it('fait au moins 12 px, comme la ligne « lf-sub »', () => {
    expect(taille('.lf-type')).toBeGreaterThanOrEqual(12);
  });
});
