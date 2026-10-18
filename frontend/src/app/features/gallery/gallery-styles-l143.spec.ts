// @vitest-environment node
// L143 — le voile du texte d'une carte d'œuvre appartient à .art-content : il suit la hauteur du titre
// (3-4 lignes à 390 px) au lieu du dégradé fixe de la carte.
import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

const css = sass.compile(resolve(__dirname, 'gallery.component.scss'), { loadPaths: [resolve(__dirname, '../../..')] }).css;

function decls(sel: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type === 'atrule') return;
    if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

describe('galerie — voile sous .art-content (L143)', () => {
  it('le voile est un pseudo-élément de .art-content, sous le texte, sans capter les clics', () => {
    const v = decls('.art-content::before');
    expect(v.content).toBe('""');
    expect(v.position).toBe('absolute');
    expect(v['z-index']).toBe('-1');
    expect(v['pointer-events']).toBe('none');
    expect(v.background).toMatch(/linear-gradient\(to top/);
  });

  it('.art-content forme son propre contexte d’empilement (le voile ne passe pas sous la carte)', () => {
    expect(decls('.art-content')['z-index']).toBe('2');
  });

  it('le voile est assez opaque derrière le texte (≥ 0,85)', () => {
    const m = /rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/.exec(decls('.art-content::before').background)!;
    expect(parseFloat(m[1])).toBeGreaterThanOrEqual(0.85);
  });
});

describe('galerie — la carte grandit avec son titre (L143)', () => {
  it('le texte est dans le flux de la carte (flex, bas) et la carte n’est pas un conteneur de défilement', () => {
    const c = decls('.art-card');
    expect(c.display).toBe('flex');
    expect(c['justify-content']).toBe('flex-end');
    expect(c.overflow).toBe('clip'); // « hidden » figerait la hauteur au ratio : le titre sortirait par le haut
    expect(decls('.art-content').position).toBe('relative');
  });
});
