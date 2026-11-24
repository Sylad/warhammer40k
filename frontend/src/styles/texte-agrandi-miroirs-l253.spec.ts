// L253 passe 3 (revue de code r2, mineur 3) — les règles `app-main-layout.contenu-<px> #contenu app-<page> …` de
// _texte-agrandi.scss recopient la media query `max-width: <px>` de la page (à 200 %, 1440 px se met en page comme
// 720 px). Sans garde, changer la media query d'une page (le passage à 2 colonnes des vidéos à 1220 px) laissait la
// copie sur l'ancienne mise en page, sans test rouge. Pour chaque copie :
//   M1 — la media query existe encore dans la feuille de la page (sinon la copie est à revoir, ou la paire est
//        déclarée PROPRES : règles propres au texte agrandi, sans media query à suivre) ;
//   M2 — chaque déclaration copiée a la même valeur dans la media query (`minmax(0, 1fr)` vaut `1fr`, `!important`
//        ignoré) ;
//   M3 — chaque règle de mise en page de la media query (colonnes, affichage, position, sens et retour d'un flex,
//        flottant) est copiée.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { declarations, type Declaration } from './scss-regles';

const APP = resolve(__dirname, '../app');
const PAGES: Record<string, string> = {
  'app-dashboard': 'features/dashboard/dashboard.component.ts',
  'app-videos': 'features/videos/videos.component.ts',
  'app-series': 'features/series/series.component.ts',
  'app-factions': 'features/factions/factions.component.ts',
  'app-faction-detail': 'features/faction-detail/faction-detail.component.ts',
  'app-primarch-detail': 'features/primarch-detail/primarch-detail.component.ts',
  'app-about': 'features/about/about.component.ts',
  'app-unit-detail': 'features/unit-detail/unit-detail.component.ts',
  'app-nouveautes': 'features/nouveautes/nouveautes.component.ts',
  'app-lore-timeline': 'features/lore-timeline/lore-timeline.component.ts',
  'app-lore-galaxy': 'features/lore-galaxy/lore-galaxy.component.ts',
  'app-lore-concepts': 'features/lore-concepts/lore-concepts.component.ts',
};
/** Règles propres au texte agrandi (téléphone à 200 %), qui ne recopient aucune media query. */
const PROPRES = new Set([
  'app-about 600', 'app-dashboard 600', 'app-lore-concepts 600', 'app-lore-galaxy 600', 'app-lore-timeline 600', 'app-nouveautes 600',
  'app-series 600', 'app-unit-detail 600', 'app-videos 600',
]);
const MISE_EN_PAGE = new Set(['grid-template-columns', 'grid-column', 'grid-row', 'display', 'position', 'flex-direction', 'flex-wrap', 'float']);
const COPIE = /^app-main-layout\.contenu-(\d+) #contenu (app-[\w-]+) (.+)$/;

function feuille(ts: string): string {
  const chemin = resolve(APP, ts);
  const src = readFileSync(chemin, 'utf8');
  const url = /styleUrls?:\s*\[?\s*'([^']+)'/.exec(src);
  if (url) return readFileSync(resolve(dirname(chemin), url[1]), 'utf8');
  return /styles:\s*\[?\s*`([\s\S]*?)`/.exec(src)?.[1] ?? '';
}
const valeur = (v: string) => v.replace(/\s*!important$/, '').replace(/minmax\(0, 1fr\)/g, '1fr');
const meme = (selecteurPage: string, rel: string) => selecteurPage === rel || selecteurPage.endsWith(` ${rel}`);

const copies = declarations(readFileSync(resolve(__dirname, '_texte-agrandi.scss'), 'utf8'))
  .map((d) => ({ d, m: COPIE.exec(d.selecteur) }))
  .filter((x): x is { d: Declaration; m: RegExpExecArray } => !!x.m)
  .map(({ d, m }) => ({ px: m[1], page: m[2], rel: m[3], propriete: d.propriete, valeur: d.valeur }));
const paires = [...new Set(copies.map((c) => `${c.page} ${c.px}`))].filter((p) => !PROPRES.has(p));
type Copie = { rel: string; propriete: string; valeur: string };
/** Écarts M2 (valeur copiée absente ou différente) et M3 (règle de mise en page non copiée) d'une paire. */
function ecarts(source: Declaration[], ici: Copie[]): string[] {
  const sortie: string[] = [];
  for (const c of ici) {
    const s = source.find((x) => meme(x.selecteur, c.rel) && x.propriete === c.propriete);
    if (!s) sortie.push(`M2 ${c.rel} { ${c.propriete} } absent de la media query`);
    else if (valeur(s.valeur) !== valeur(c.valeur)) sortie.push(`M2 ${c.rel} { ${c.propriete}: ${c.valeur} } ≠ ${s.valeur}`);
  }
  for (const s of source.filter((x) => MISE_EN_PAGE.has(x.propriete))) {
    if (!ici.some((c) => meme(s.selecteur, c.rel) && c.propriete === s.propriete)) sortie.push(`M3 ${s.selecteur} { ${s.propriete}: ${s.valeur} } non copié`);
  }
  return sortie;
}
const media = (page: string, px: string) => declarations(feuille(PAGES[page])).filter((c) => c.media.includes(`(max-width: ${px}px)`));

describe('_texte-agrandi.scss — copies des media queries des pages (L253)', () => {
  it('chaque page copiée est connue', () => {
    expect(copies.length).toBeGreaterThan(40);
    expect(copies.map((c) => c.page).filter((p) => !PAGES[p])).toEqual([]);
  });

  for (const paire of paires) {
    const [page, px] = paire.split(' ');
    it(`${page}, max-width: ${px}px — même media query, mêmes valeurs, mise en page entière (M1 à M3)`, () => {
      const source = media(page, px);
      expect(source.length, `M1 : plus de @media (max-width: ${px}px) dans ${PAGES[page]}`).toBeGreaterThan(0);
      expect(ecarts(source, copies.filter((c) => c.page === page && c.px === px))).toEqual([]);
    });
  }

  // L255 (revue de code L253 r3, mineur) : la garde réelle (`ecarts`) tourne sur la vraie paire app-videos 1220,
  // intacte puis mutée — une valeur qui dérive (M2), une règle de mise en page ajoutée (M3), une déclaration copiée
  // disparue (M2 absent). Si `meme`, `valeur` ou le filtre MISE_EN_PAGE cassent, ce test rougit sans paire désynchronisée.
  it('la garde voit une valeur changée et une règle de mise en page oubliée', () => {
    const source = media('app-videos', '1220');
    const ici = copies.filter((c) => c.page === 'app-videos' && c.px === '1220');
    expect(ici.some((c) => c.rel === '.video-grid' && c.propriete === 'grid-template-columns')).toBe(true);
    expect(ecarts(source, ici)).toEqual([]);

    const derive = source.map((d) => (d.selecteur.endsWith(' .video-grid') || d.selecteur === '.video-grid') && d.propriete === 'grid-template-columns'
      ? { ...d, valeur: 'repeat(3, minmax(0, 1fr))' } : d);
    expect(ecarts(derive, ici)).toEqual([expect.stringMatching(/^M2 \.video-grid \{ grid-template-columns: .* ≠ repeat\(3, minmax\(0, 1fr\)\)$/)]);

    const oubli = [...source, { ...source[0], selecteur: '.layout', propriete: 'display', valeur: 'block' }];
    expect(ecarts(oubli, ici)).toEqual(['M3 .layout { display: block } non copié']);

    const sansGrille = source.filter((d) => !(d.propriete === 'grid-template-columns' && meme(d.selecteur, '.video-grid')));
    expect(ecarts(sansGrille, ici)).toContain('M2 .video-grid { grid-template-columns } absent de la media query');

    expect(valeur('minmax(0, 1fr) 2fr !important')).toBe('1fr 2fr');
    expect(declarations('.a { @media (max-width: 10px) { .b, :is(.c, .d) > * { display: none } } }').map((d) => `${d.media}|${d.selecteur}|${d.valeur}`))
      .toEqual(['@media (max-width: 10px)|.a .b|none', '@media (max-width: 10px)|.a .c > *|none', '@media (max-width: 10px)|.a .d > *|none']);
  });
});
