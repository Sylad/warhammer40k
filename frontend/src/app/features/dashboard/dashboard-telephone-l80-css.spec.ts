// @vitest-environment node
// L80 : règles CSS du téléphone (seuils 760 px et 1100 px).
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const src = resolve(__dirname, '../../..');
const css = sass.compile(resolve(__dirname, 'dashboard.component.scss'), { loadPaths: [src] }).css;

function decls(sel: string, media: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    const p = rule.parent;
    const m = p?.type === 'atrule' ? (p as postcss.AtRule).params : null;
    if (m !== media) return;
    if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

describe('Accueil au téléphone — CSS (L80)', () => {
  it('sous 760 px la barre de statistiques (citation comprise) est masquée', () => {
    expect(decls('.stats-bar', '(max-width: 760px)').display).toBe('none');
  });
  it('au-dessus, la barre n’est pas masquée et la ligne « sous-factions » l’est', () => {
    expect(decls('.stats-bar', null).display).toBe('grid');
    expect(decls('.shortcut-sub', null).display).toBe('none');
    expect(decls('.shortcut-sub', '(max-width: 760px)').display).toBe('block');
  });
  it('la règle 1100 px reste inchangée', () => {
    expect(decls('.stats-bar', '(max-width: 1100px)')['grid-template-columns']).toBe('1fr');
  });
});
