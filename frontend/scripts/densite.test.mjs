// L40 — règles de densité D1 à D6 (scripts/densite-lib.mjs) : chaque règle lève son écart, et les
// seuils partagés avec l'application (src/app/core/utils/densite.ts) sont les mêmes.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES, SEUILS, ecarts, tableau } from './densite-lib.mjs';
import { APP, readRoutes } from './liens-lib.mjs';

const base = {
  hauteur: 2000, ecrans: 2.4, titres: 5, sections: 4, h1: 1, sauts: [], ancres: 0, liens: 10, liensParEcran: 4,
  blocsTexte: 1, blocLePlusLong: 6, cplMax: 68, prose: [{ debut: 'x', caracteres: 400, lignesAffichees: 6, lignesTotales: 14, cpl: null, replie: true, gainLignes: 6 }],
  listeMax: { n: 6, ou: 'grid > A.card' }, doublons: [],
};
const regles = (m, l = 'téléphone') => ecarts({ ...base, ...m }, l).map((e) => e.regle);

describe('règles de densité (L40)', () => {
  it('une page conforme n\'a aucun écart', () => {
    expect(regles({})).toEqual([]);
    expect(regles({}, 'bureau')).toEqual([]);
  });
  it('D1 : plus de 3 écrans au téléphone, faite de sections, sans sommaire', () => {
    expect(regles({ ecrans: 5 })).toEqual(['D1']);
    expect(regles({ ecrans: 5, ancres: 4 })).toEqual([]);
    expect(regles({ ecrans: 5, sections: 1 })).toEqual([]); // une liste : D4, pas D1
    expect(regles({ ecrans: 5 }, 'bureau')).toEqual([]);
  });
  it('D2 : replié si et seulement si le repli gagne au moins 3 lignes', () => {
    const bloc = (replie, gainLignes) => ({ prose: [{ ...base.prose[0], replie, gainLignes }] });
    expect(regles(bloc(false, 3))).toEqual(['D2']); // entier alors que replier gagnerait 3 lignes
    expect(regles(bloc(false, 2.9))).toEqual([]); // 9 ou 10 lignes : on le laisse entier
    expect(regles(bloc(true, 2.9))).toEqual(['D2']); // replié pour presque rien
    expect(regles(bloc(true, 0))).toEqual(['D2']); // replié à côté d'un encart plus haut que lui
    expect(regles(bloc(true, 3))).toEqual([]);
  });
  it('D3 : plus de 80 caractères par ligne ; au bureau, colonne de moins de 40', () => {
    expect(regles({ cplMax: 81 }, 'bureau')).toEqual(['D3']);
    expect(regles({ cplMin: 25 }, 'bureau')).toEqual(['D3']);
    expect(regles({ cplMin: 36 })).toEqual([]); // téléphone : 35 à 40 caractères est la norme
  });
  it('D4 : liste plus longue que 12 au bureau, 6 au téléphone, à 2 éléments près', () => {
    expect(regles({ listeMax: { n: 8, ou: 'x' } })).toEqual([]);
    expect(regles({ listeMax: { n: 9, ou: 'x' } })).toEqual(['D4']);
    expect(regles({ listeMax: { n: 14, ou: 'x' } }, 'bureau')).toEqual([]);
    expect(regles({ listeMax: { n: 15, ou: 'x' } }, 'bureau')).toEqual(['D4']);
  });
  it('D5 : texte répété ; D6 : h1 unique, aucun niveau sauté', () => {
    expect(regles({ doublons: ['Guerriers génétiquement améliorés'] })).toEqual(['D5']);
    expect(regles({ sauts: ['h2→h4'] })).toEqual(['D6']);
    expect(regles({ h1: 2 })).toEqual(['D6']);
  });
  it('le tableau a une ligne par gabarit mesuré', () => {
    const t = tableau([{ gabarit: '/x', mesures: { bureau: base, 'téléphone': base } }, { gabarit: '/y', mesures: {}, erreur: 'délai' }]);
    expect(t.split('\n')).toHaveLength(4);
    expect(t).toContain('mesure impossible : délai');
  });
});

describe('seuils partagés avec l\'application', () => {
  it('listeMax (densite-lib) = LISTE_MAX (core/utils/densite.ts)', () => {
    const src = readFileSync(join(APP, 'core/utils/densite.ts'), 'utf8');
    const m = /LISTE_MAX = \{ bureau: (\d+), telephone: (\d+) \}/.exec(src);
    expect(m).not.toBeNull();
    expect(SEUILS.listeMax).toEqual({ bureau: Number(m[1]), 'téléphone': Number(m[2]) });
  });
  it('texte repliable : lignes, bouton et gain minimal de D2 = REPLI (core/utils/densite.ts), employé par le composant', () => {
    const src = readFileSync(join(APP, 'core/utils/densite.ts'), 'utf8');
    const m = /REPLI = \{ lignes: (\d+), boutonPx: (\d+), gainMinLignes: (\d+) \}/.exec(src);
    expect(m).not.toBeNull();
    expect(SEUILS.repli).toEqual({ lignes: Number(m[1]), boutonPx: Number(m[2]), gainMinLignes: Number(m[3]) });
    const lib = readFileSync(join(APP, '../../scripts/densite-lib.mjs'), 'utf8');
    expect(Number(/const REPLI_LIGNES = (\d+)/.exec(lib)?.[1])).toBe(SEUILS.repli.lignes);
    expect(Number(/const REPLI_BOUTON_PX = (\d+)/.exec(lib)?.[1])).toBe(SEUILS.repli.boutonPx);
    const comp = readFileSync(join(APP, 'shared/components/texte-repliable/texte-repliable.component.ts'), 'utf8');
    expect(comp).toContain('@Input() lignes: number = REPLI.lignes;');
    expect(comp).toContain('@Input() gainMin: number = REPLI.gainMinLignes;');
    // Bouton : 44 px de haut et 4 px de marge (src/styles/_densite.scss).
    const css = readFileSync(join(APP, '../styles/_densite.scss'), 'utf8');
    const bouton = /\.tr-bouton \{[^}]*min-height: (\d+)px;[^}]*margin-top: (\d+)px;/.exec(css);
    expect(Number(bouton?.[1]) + Number(bouton?.[2])).toBe(SEUILS.repli.boutonPx);
  });
  it('tolérance de la pagination (LISTE_TOLERANCE, core/utils/densite.ts) = celle de D4', () => {
    const src = readFileSync(join(APP, 'core/utils/densite.ts'), 'utf8');
    expect(Number(/LISTE_TOLERANCE = (\d+)/.exec(src)?.[1])).toBe(SEUILS.listeTolerance);
    expect(readFileSync(join(APP, 'core/utils/pagination.ts'), 'utf8')).toContain('private readonly tolerance = LISTE_TOLERANCE');
  });
  it('chaque gabarit de app.routes.ts (hors redirections) a sa page de mesure', () => {
    const gabarits = readRoutes().filter((r) => !r.redirect && r.path !== '/**').map((r) => r.path);
    const mesures = new Set(PAGES.map(([g]) => g));
    expect(gabarits.filter((g) => !mesures.has(g))).toEqual([]);
  });
});
