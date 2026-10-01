// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';
import { transform } from 'esbuild';

/**
 * L29 : factorisation des styles de composants (budget `anyComponentStyle`).
 *
 * Garde-fou « aucun changement visible » : pour chaque feuille touchée, on
 * calcule les déclarations EFFECTIVES par sélecteur (contexte @media compris),
 * en appliquant d'abord les partiels globaux factorisés puis la feuille du
 * composant (encapsulée, donc plus spécifique : elle gagne). Ce résultat doit
 * rester identique à l'instantané pris AVANT la factorisation.
 *
 * sass et postcss viennent de @angular/build (mêmes versions que ng build).
 */
const frontend = resolve(__dirname, '../..');
const src = resolve(frontend, 'src');

/** Partiel global (inclus dans styles.scss) qui porte des règles factorisées. */
const ANCHOR_NAV = 'styles/_anchor-nav.scss';

/** Feuille de composant → partiels globaux dont dépend le rendu de son gabarit. */
const GUARDED: Record<string, string[]> = {
  'app/features/gallery/gallery.component.scss': [],
  'app/features/faction-detail/faction-detail.component.scss': [ANCHOR_NAV],
  'app/features/ship-detail/ship-detail.component.scss': [ANCHOR_NAV],
  'app/features/primarch-detail/primarch-detail.component.scss': [ANCHOR_NAV],
};

type Effective = Record<string, Record<string, string>>;

function collect(file: string, into: Effective): void {
  const css = sass.compile(resolve(src, file), { loadPaths: [src] }).css;
  postcss.parse(css).walkRules((rule) => {
    const parent = rule.parent;
    if (parent && parent.type === 'atrule' && /keyframes$/.test((parent as postcss.AtRule).name)) return;
    const ctx = parent && parent.type === 'atrule'
      ? `@${(parent as postcss.AtRule).name} ${(parent as postcss.AtRule).params} `
      : '';
    for (const sel of rule.selectors) {
      const key = ctx + sel.replace(/\s+/g, ' ').trim();
      const decls = (into[key] ??= {});
      rule.walkDecls((d) => {
        decls[d.prop] = d.value + (d.important ? ' !important' : '');
      });
    }
  });
}

function effective(file: string, partials: string[]): Effective {
  const out: Effective = {};
  for (const p of partials) {
    if (existsSync(resolve(src, p))) collect(p, out);
  }
  collect(file, out);
  // Tri pour un instantané stable, indépendant de l'ordre des règles.
  return Object.fromEntries(
    Object.keys(out).sort().map((k) => [k, Object.fromEntries(Object.entries(out[k]).sort())]),
  );
}

describe('styles de composants — déclarations effectives inchangées (L29)', () => {
  for (const [file, partials] of Object.entries(GUARDED)) {
    it(file, () => {
      expect(effective(file, partials)).toMatchSnapshot();
    });
  }
});

/** Feuilles .scss des composants (même mesure que ng build : SCSS compilé puis minifié). */
function componentSheets(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? componentSheets(resolve(dir, e.name))
      : e.name.endsWith('.component.scss') ? [resolve(dir, e.name)] : [],
  );
}

describe('budget anyComponentStyle de angular.json (L29)', () => {
  const angular = JSON.parse(readFileSync(resolve(frontend, 'angular.json'), 'utf8'));
  const budgets = Object.values<any>(angular.projects)[0].architect.build.configurations.production.budgets;
  const warning = budgets.find((b: any) => b.type === 'anyComponentStyle').maximumWarning as string;
  const limit = parseFloat(warning) * 1000; // ng build : 1 kB = 1000 octets

  for (const file of componentSheets(resolve(src, 'app'))) {
    it(`${file.slice(src.length + 1)} ≤ ${warning}`, async () => {
      const css = sass.compile(file, { loadPaths: [src] }).css;
      const min = (await transform(css, { loader: 'css', minify: true })).code;
      expect(min.length).toBeLessThanOrEqual(limit);
    });
  }
});
