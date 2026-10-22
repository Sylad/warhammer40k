// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';

/**
 * L89 : la barre d'ancres des fiches se colle SOUS l'en-tête (top = hauteur de l'en-tête, pas 0 :
 * à top 0 elle passait derrière l'en-tête, z-index 100) et tient sur une seule ligne défilante
 * sous 760 px (191 px de haut à 390 px auparavant, WCAG 2.4.11 : le focus ne doit pas être masqué).
 */
const src = resolve(__dirname, '..');
const css = sass.compile(resolve(src, 'styles/_anchor-nav.scss')).css;
const root = postcss.parse(css);

function decls(selector: string, media?: RegExp): Record<string, string> {
  const out: Record<string, string> = {};
  root.walkRules((rule) => {
    const parent = rule.parent;
    const inMedia = parent?.type === 'atrule' ? (parent as postcss.AtRule).params : undefined;
    if (media ? !(inMedia && media.test(inMedia)) : inMedia) return;
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

describe('barre d\'ancres des fiches (L89)', () => {
  it('se colle sous l\'en-tête, à la hauteur de l\'en-tête', () => {
    const nav = decls('.anchor-nav');
    expect(nav.position).toBe('sticky');
    expect(nav.top).toBe('var(--topbar-h)');
    expect(nav['z-index']).toBeDefined();
    expect(Number(nav['z-index'])).toBeLessThan(100); // sous l'en-tête (menus, tiroir)
  });

  it('la hauteur d\'en-tête déclarée est celle du .topbar', () => {
    const styles = readFileSync(resolve(src, 'styles.scss'), 'utf8');
    const layout = readFileSync(resolve(src, 'app/layout/main-layout/main-layout.component.ts'), 'utf8');
    const token = /--topbar-h:\s*(\d+)px/.exec(styles)?.[1];
    const topbar = /\.topbar \{[^}]*?height:\s*(\d+)px/.exec(layout)?.[1];
    expect(token).toBeDefined();
    expect(token).toBe(topbar);
  });

  it('sous 1320 px : une seule ligne défilante, bords estompés, hauteur déclarée (pas de 2e ligne)', () => {
    const nav = decls('.anchor-nav', /max-width:\s*1319px/);
    expect(nav['flex-wrap']).toBe('nowrap');
    expect(nav['overflow-x']).toBe('auto');
    expect(nav.height).toBe('var(--anchor-nav-h)');
    expect(nav['mask-image']).toMatch(/linear-gradient/);
    const link = decls('.anchor-nav a', /max-width:\s*1319px/);
    expect(link['white-space']).toBe('nowrap');
    expect(link['flex-shrink']).toBe('0');
  });

  it('les cibles d\'ancre laissent la place à l\'en-tête ET à la barre', () => {
    for (const f of ['faction-detail', 'ship-detail', 'primarch-detail']) {
      const scss = readFileSync(resolve(src, `app/features/${f}/${f}.component.scss`), 'utf8');
      // scrollIntoView additionne scroll-margin et scroll-padding (html:has(.anchor-nav)) : la marge
      // des cibles ne reprend pas --anchor-offset, sinon le décalage est compté deux fois.
      expect(scss, f).toMatch(/scroll-margin-top:\s*-8px/);
      expect(scss, f).not.toMatch(/scroll-margin-top:\s*(80px|var\(--anchor-offset\))/);
    }
    expect(css).toMatch(/--anchor-offset:\s*calc\(var\(--topbar-h\) \+ var\(--anchor-nav-h\)/);
  });

  it('fiche faction : CHAQUE cible de la barre laisse la place à l\'en-tête ET à la barre (scroll-padding - 8 px, R1 L164)', () => {
    const ts = readFileSync(resolve(src, 'app/features/faction-detail/faction-detail.component.ts'), 'utf8');
    const ids = [...ts.matchAll(/<a sectionAnchor="(\w+)">/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(5);
    const compiled = postcss.parse(sass.compile(resolve(src, 'app/features/faction-detail/faction-detail.component.scss')).css);
    for (const id of ids) {
      const cls = new RegExp(`<section class="([\\w-]+)"[^>]*id="${id}"`).exec(ts)?.[1];
      expect(cls, `balise de #${id}`).toBeDefined();
      let ok = false;
      compiled.walkRules((r) => {
        if (!r.selectors.some((sel) => new RegExp(`\\.${cls}$`).test(sel.trim()))) return;
        r.walkDecls('scroll-margin-top', (d) => { if (d.value === '-8px') ok = true; });
      });
      expect(ok, `#${id} (.${cls}) sans scroll-margin-top: -8px`).toBe(true);
    }
  });

  it('colonnes latérales collées des fiches : sous l\'en-tête ET la barre (--anchor-offset)', () => {
    for (const f of ['ship-detail', 'primarch-detail', 'faction-detail']) {
      const scss = readFileSync(resolve(src, `app/features/${f}/${f}.component.scss`), 'utf8');
      const m = /\.sidebar \{[^}]*?position:\s*sticky;[^}]*?top:\s*([^;]+);/s.exec(scss);
      expect(m?.[1], f).toBe('var(--anchor-offset)');
    }
  });

  it('focus au clavier : le défilement réserve la place des en-têtes collés (WCAG 2.4.11)', () => {
    const styles = readFileSync(resolve(src, 'styles.scss'), 'utf8');
    expect(styles).toMatch(/scroll-padding-top:\s*calc\(var\(--topbar-h\)/);
    expect(css).toMatch(/html:has\(\.anchor-nav\)\s*\{\s*scroll-padding-top:\s*var\(--anchor-offset\)/);
  });
});
