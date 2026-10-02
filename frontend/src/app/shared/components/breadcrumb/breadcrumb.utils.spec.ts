// L39 — fil d'Ariane : « Unités » (/units) et « Sous-Factions » (/subfactions) étaient des liens
// alors qu'aucune page ne sert ces adresses — le routeur renvoyait vers /factions (291 liens morts
// relevés sur les fiches unité et sous-faction). Un préfixe n'est lié que s'il est une page.
import { describe, expect, it } from 'vitest';
// @ts-expect-error — module JavaScript de l'audit des liens, sans déclarations de types
import { readRoutes } from '../../../../../scripts/liens-lib.mjs';
import { crumbsFor, pagePaths } from './breadcrumb.utils';

const routes = readRoutes() as { path: string; redirect: string | null }[];
const pages = routes.filter((r) => !r.redirect && r.path !== '/**').map((r) => r.path.slice(1));

describe('crumbsFor', () => {
  it('fiche unité : « Unités » en texte (pas de page /units), dernier élément en texte', () => {
    expect(crumbsFor('/units/ork-boyz', pagePaths(pages))).toEqual([
      { label: 'Accueil', link: '/' },
      { label: 'Unités', link: null },
      { label: 'Ork Boyz', link: null },
    ]);
  });

  it('fiche primarque : « Lore » et « Les Primarques » restent des liens', () => {
    expect(crumbsFor('/lore/primarchs/horus#heresie', pagePaths(pages))).toEqual([
      { label: 'Accueil', link: '/' },
      { label: 'Lore', link: '/lore' },
      { label: 'Les Primarques', link: '/lore/primarchs' },
      { label: 'Horus', link: null },
    ]);
  });

  it('toutes les routes de l’application : chaque lien du fil mène à une page', () => {
    const isPage = pagePaths(pages);
    for (const r of routes.filter((x) => !x.redirect && x.path !== '/**')) {
      const url = r.path.replace(/:[a-zA-Z]+/g, 'un-identifiant');
      for (const c of crumbsFor(url, isPage)) {
        if (c.link) expect(isPage(c.link), `${url} → ${c.link}`).toBe(true);
      }
    }
  });
});
