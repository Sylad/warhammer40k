// L45 — Galerie : chaque filtre (Faction, Catégorie, Trier par, recherche) a un libellé associé à
// son contrôle (WCAG 1.3.1 / 4.1.2 / 3.3.2) ; la liste « Faction » montre des noms lisibles
// (« Nécrons »), plus des identifiants bruts (« necrons »). Constats de la revue UX L42.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const ARTWORKS = [
  { id: 'aw-1', title: 'Ultramarines', artist: 'A', image: 'u.jpg', category: 'Space Marines', faction: 'space-marines', likes: 1 },
  { id: 'aw-2', title: 'Nécron', artist: 'B', image: 'n.jpg', category: 'Xénos', faction: 'necrons', likes: 1 },
  { id: 'aw-3', title: 'Commissaire', artist: 'C', image: 'c.jpg', category: 'Imperium', faction: 'astra-militarum', likes: 1 },
  { id: 'aw-4', title: 'Tau', artist: 'D', image: 't.jpg', category: 'Xénos', faction: 'tau', likes: 1 },
  { id: 'aw-5', title: 'Célestine', artist: 'E', image: 's.jpg', category: 'Imperium', faction: 'soeurs-de-bataille', likes: 1 },
];
const FACTIONS = [
  { id: 'space-marines', nom: 'Space Marines' },
  { id: 'necrons', nom: 'Nécrons' },
  { id: 'astra-militarum', nom: 'Astra Militarum' },
  { id: 'tau', nom: 'T\'au' },
  { id: 'soeurs-de-bataille', nom: 'Sœurs de Bataille' },
];
/** Image perso catégorisée à la main : faction saisie en texte libre, sans fiche au codex. */
const META = { 'perso.jpg': { categories: ['Imperium'], title: 'Perso', artist: 'Moi', faction: 'Garde de Cadia' } };
const USER_IMAGES = ['perso.jpg'];

async function render(
  meta: Record<string, unknown> = META,
  images: string[] = USER_IMAGES,
  factions: unknown[] = FACTIONS,
  query: Record<string, string> = {},
): Promise<ComponentFixture<GalleryComponent>> {
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS),
        factions$: of(factions),
        getImageMeta: () => of(meta),
        images$: of(images),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(query)), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap(query) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  return f;
}

/**
 * Nom accessible d'un contrôle de formulaire, selon l'ordre de l'algorithme accname 1.2 pour les
 * cas présents ici : aria-labelledby, puis aria-label, puis <label> associé (for/id ou englobant).
 * Le placeholder n'en est PAS un (il disparaît à la saisie : WCAG 3.3.2).
 */
function accessibleName(el: HTMLInputElement | HTMLSelectElement): string {
  const doc = el.ownerDocument;
  const by = el.getAttribute('aria-labelledby');
  if (by) return by.split(/\s+/).map((id) => doc.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
  const aria = el.getAttribute('aria-label');
  if (aria?.trim()) return aria.trim();
  return Array.from(el.labels ?? []).map((l) => l.textContent!.trim()).join(' ').trim();
}

/** Contrôle dont le nom accessible est exactement `name` (comme getByLabelText / getByRole name). */
function byLabel(root: HTMLElement, name: string): HTMLInputElement | HTMLSelectElement {
  const hits = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input, select'))
    .filter((el) => accessibleName(el) === name);
  expect(hits, `un seul contrôle nommé « ${name} »`).toHaveLength(1);
  return hits[0];
}

describe('galerie — libellés des filtres (L45, WCAG 1.3.1 / 4.1.2 / 3.3.2)', () => {
  it('« Faction », « Catégorie » et « Trier par » nomment leur liste déroulante (label for/id)', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const sidebar = root.querySelector<HTMLElement>('.sidebar')!;
    for (const name of ['Faction', 'Catégorie', 'Trier par']) {
      const el = byLabel(sidebar, name);
      expect(el.tagName).toBe('SELECT');
      // Association programmatique par for/id (clic sur le libellé = focus de la liste).
      const label = sidebar.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`);
      expect(el.id, `id de la liste « ${name} »`).toBeTruthy();
      expect(label?.textContent?.trim()).toBe(name);
    }
  });

  // L45/t1 (revue UX, bloquant) : la recherche n'avait que son placeholder pour libellé (disparaît à
  // la saisie, coupé à 390 px, 3,45:1). Libellé VISIBLE « Rechercher » relié par for/id ; le nom
  // accessible contient ce texte visible (WCAG 2.5.3) ; le placeholder reste comme indication.
  it('la recherche a un libellé visible « Rechercher » relié au champ (WCAG 1.3.1 / 2.5.3 / 3.3.2)', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const wrap = root.querySelector<HTMLElement>('.search-bar-wrap')!;
    const input = wrap.querySelector<HTMLInputElement>('.search-bar input')!;
    expect(input.id).toBeTruthy();
    const label = wrap.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`);
    expect(label?.textContent?.trim()).toBe('Rechercher');
    expect(label!.classList.contains('sr-only')).toBe(false);
    expect(accessibleName(input)).toContain('Rechercher');
    expect(byLabel(wrap, accessibleName(input))).toBe(input);
    expect(input.placeholder).toBe('Rechercher une œuvre, un artiste, une faction…');
  });

  it('l’icône décorative ⌕ de la recherche est masquée aux technologies d’assistance', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const icon = root.querySelector<HTMLElement>('.search-bar .s-icon')!;
    expect(icon.textContent!.trim()).toBe('⌕');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('chaque contrôle de la barre de filtres et de recherche a un nom accessible non vide', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const controls = [
      ...Array.from(root.querySelectorAll<HTMLSelectElement>('.sidebar select')),
      ...Array.from(root.querySelectorAll<HTMLInputElement>('.search-bar input')),
    ];
    expect(controls).toHaveLength(4);
    for (const el of controls) expect(accessibleName(el), el.outerHTML).not.toBe('');
  });
});

describe('galerie — noms de faction lisibles dans la liste (L45)', () => {
  it('les options montrent le nom du codex (« Nécrons », « T’au »), la valeur reste l’identifiant', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const select = byLabel(root.querySelector<HTMLElement>('.sidebar')!, 'Faction') as HTMLSelectElement;
    const opts = Array.from(select.options).map((o) => ({ value: o.value, text: o.textContent!.trim() }));
    expect(opts).toContainEqual({ value: 'necrons', text: 'Nécrons' });
    expect(opts).toContainEqual({ value: 'tau', text: 'T\'au' });
    expect(opts).toContainEqual({ value: 'astra-militarum', text: 'Astra Militarum' });
    expect(opts).toContainEqual({ value: 'space-marines', text: 'Space Marines' });
    // Plus aucun identifiant brut affiché pour une faction connue du codex.
    for (const f of FACTIONS) expect(opts.map((o) => o.text)).not.toContain(f.id);
  });

  it('les options sont triées par nom affiché (ordre alphabétique français), « Toutes » en tête', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const select = byLabel(root.querySelector<HTMLElement>('.sidebar')!, 'Faction') as HTMLSelectElement;
    const texts = Array.from(select.options).map((o) => o.textContent!.trim());
    expect(texts[0]).toBe('Toutes');
    const rest = texts.slice(1);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b, 'fr')));
  });

  it('une faction saisie en texte libre (image perso, sans fiche au codex) reste affichée telle quelle', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const select = byLabel(root.querySelector<HTMLElement>('.sidebar')!, 'Faction') as HTMLSelectElement;
    const opts = Array.from(select.options).map((o) => ({ value: o.value, text: o.textContent!.trim() }));
    expect(opts).toContainEqual({ value: 'Garde de Cadia', text: 'Garde de Cadia' });
  });
});

// Relecture L45 : une image perso peut porter une faction saisie par son NOM (« Nécrons »,
// modale Catégoriser) alors que le catalogue porte l'identifiant (« necrons ») — deux options
// « Nécrons » indistinguables filtraient des ensembles disjoints. Décision : une option par nom ;
// le texte libre égal (casse, accents, espaces de bord ignorés) au nom d'une faction du codex est
// rattaché à son identifiant, à la lecture (données enregistrées inchangées).
describe('galerie — une seule option par faction, texte libre rattaché au codex (L45)', () => {
  const FACTIONS_GK = [...FACTIONS, { id: 'grey-knights', nom: 'Grey Knights' }, { id: 'leagues-of-votann', nom: 'Leagues of Votann' }];
  const META_LIBRE = {
    'p0.jpg': { categories: ['Xénos'], title: 'Nécron perso', artist: 'Moi', faction: 'Nécrons' },
    'p1.jpg': { categories: ['Space Marines'], title: 'SM perso', artist: 'Moi', faction: '  SPACE marines ' },
    'p2.jpg': { categories: ['Imperium'], title: 'Cadia', artist: 'Moi', faction: 'Garde de Cadia' },
    'p3.jpg': { categories: ['Imperium'], title: 'GK perso', artist: 'Moi', faction: 'grey knights' },
    'p4.jpg': { categories: ['Xénos'], title: 'Necron sans accent', artist: 'Moi', faction: 'necrons ' },
  };
  const IMAGES_LIBRE = ['p0.jpg', 'p1.jpg', 'p2.jpg', 'p3.jpg', 'p4.jpg'];
  const setup = (query: Record<string, string> = {}) => render(META_LIBRE, IMAGES_LIBRE, FACTIONS_GK, query);
  const options = (root: HTMLElement) =>
    Array.from(root.querySelector<HTMLSelectElement>('#gallery-filter-faction')!.options)
      .map((o) => ({ value: o.value, text: o.textContent!.trim() }));

  it('la liste « Faction » n’a aucun libellé en double', async () => {
    const root = (await setup()).nativeElement as HTMLElement;
    const texts = options(root).map((o) => o.text);
    expect(new Set(texts).size).toBe(texts.length);
    expect(options(root).filter((o) => o.text === 'Nécrons')).toEqual([{ value: 'necrons', text: 'Nécrons' }]);
    expect(options(root).filter((o) => o.text === 'Space Marines')).toEqual([{ value: 'space-marines', text: 'Space Marines' }]);
    // Faction du codex illustrée seulement par une image perso en texte libre : option à son identifiant.
    expect(options(root)).toContainEqual({ value: 'grey-knights', text: 'Grey Knights' });
  });

  it('un texte libre sans nom du codex garde son option propre', async () => {
    const root = (await setup()).nativeElement as HTMLElement;
    expect(options(root)).toContainEqual({ value: 'Garde de Cadia', text: 'Garde de Cadia' });
  });

  it('choisir « Nécrons » montre les images des deux écritures ; compteur juste', async () => {
    const f = await setup();
    const c = f.componentInstance;
    c.filterFaction.set('necrons');
    f.detectChanges();
    expect(c.filteredArtworks().map((a) => a.title).sort()).toEqual(['Necron sans accent', 'Nécron', 'Nécron perso'].sort());
    expect(c.totalFiltered()).toBe(3);
    expect((f.nativeElement as HTMLElement).querySelector('.results-count')!.textContent!.trim()).toBe('3 résultats');
    expect(c.emptyFactionName()).toBeNull();
    expect(c.unknownFaction()).toBeNull();
  });

  it('faction du codex illustrée seulement en texte libre : pas d’état vide, l’image est montrée', async () => {
    const f = await setup({ faction: 'grey-knights' });
    const c = f.componentInstance;
    f.detectChanges();
    expect(c.filteredArtworks().map((a) => a.title)).toEqual(['GK perso']);
    expect(c.emptyFactionName()).toBeNull();
    expect((f.nativeElement as HTMLElement).querySelector('[data-testid="faction-vide"]')).toBeNull();
  });

  it('faction du codex sans aucune image : l’état vide reste dit', async () => {
    const f = await setup({ faction: 'leagues-of-votann' });
    f.detectChanges();
    expect(f.componentInstance.emptyFactionName()).toBe('Leagues of Votann');
    expect((f.nativeElement as HTMLElement).querySelector('[data-testid="faction-vide"]')!.textContent).toContain('Leagues of Votann');
  });

  it('ancienne adresse ?faction=<nom en texte libre> : rattachée, liste positionnée sur l’option unique', async () => {
    const f = await setup({ faction: 'Nécrons' });
    const c = f.componentInstance;
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(c.unknownFaction()).toBeNull();
    expect(c.filteredArtworks()).toHaveLength(3);
    expect((f.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#gallery-filter-faction')!.value).toBe('necrons');
  });

  it('les données enregistrées ne sont pas réécrites : l’œuvre garde sa faction en texte libre', async () => {
    const c = (await setup()).componentInstance;
    expect(c.artworks().find((a) => a.title === 'Nécron perso')!.faction).toBe('Nécrons');
  });
});

// Relecture L45 : le placeholder invite à chercher « une faction », mais la recherche comparait
// l'identifiant (« soeurs-de-bataille ») : « Sœurs de Bataille » ou « T'au » ne trouvaient rien.
describe('galerie — recherche par nom de faction (L45)', () => {
  const META_LIBRE = { 'p0.jpg': { categories: ['Xénos'], title: 'Perso', artist: 'Moi', faction: 'Nécrons' } };
  const search = async (q: string) => {
    const f = await render(META_LIBRE, ['p0.jpg']);
    f.componentInstance.searchQuery.set(q);
    f.detectChanges();
    return f.componentInstance.filteredArtworks().map((a) => a.id);
  };

  it("« T’au » et « T'au » trouvent les images T’au", async () => {
    expect(await search("T'au")).toEqual(['aw-4']);
    expect(await search('T’au')).toEqual(['aw-4']);
  });

  it('« Sœurs de Bataille », « soeurs » et « SOEURS » trouvent les images des Sœurs de Bataille', async () => {
    expect(await search('Sœurs de Bataille')).toEqual(['aw-5']);
    expect(await search('soeurs')).toEqual(['aw-5']);
    expect(await search('SOEURS')).toEqual(['aw-5']);
  });

  it('« nécrons » trouve le catalogue (identifiant) ET l’image perso (texte libre)', async () => {
    expect((await search('nécrons')).sort()).toEqual(['aw-2', 'local-0']);
  });

  it('la recherche par identifiant continue de marcher', async () => {
    expect(await search('astra-militarum')).toEqual(['aw-3']);
    expect(await search('soeurs-de-bataille')).toEqual(['aw-5']);
  });
});

// L45/t2 (revue UX) : la recherche ignorait accents et ligatures pour la faction seulement —
// « celestine » ne trouvait pas « Sainte Célestine ». Même normalisation pour titre, artiste, catégorie.
describe('galerie — recherche sans casse, accents ni ligatures (L45/t2)', () => {
  const META_T2 = {
    'k.jpg': { categories: ['Chaos'], title: 'Khârn le Traître', artist: 'Moi' },
    'o.jpg': { categories: ['Imperium'], title: 'Chef-d’Œuvre de Cadia', artist: 'Moi' },
    'e.jpg': { categories: ['Xénos'], title: 'Portrait', artist: 'Émissaire Noir' },
    'h.jpg': { categories: ['Héraldique'], title: 'Blason', artist: 'Moi' },
  };
  const titles = async (q: string) => {
    const f = await render(META_T2, ['k.jpg', 'o.jpg', 'e.jpg', 'h.jpg']);
    f.componentInstance.searchQuery.set(q);
    f.detectChanges();
    return f.componentInstance.filteredArtworks().map((a) => a.title);
  };

  it('« celestine » trouve « Célestine » (titre accentué)', async () => {
    expect(await titles('celestine')).toEqual(['Célestine']);
  });
  it('« kharn » trouve « Khârn le Traître »', async () => {
    expect(await titles('kharn')).toEqual(['Khârn le Traître']);
  });
  it('« oeuvre » trouve « Chef-d’Œuvre de Cadia » (ligature, majuscule)', async () => {
    expect(await titles('oeuvre')).toEqual(['Chef-d’Œuvre de Cadia']);
  });
  it('« emissaire » trouve l’œuvre de l’artiste « Émissaire Noir »', async () => {
    expect(await titles('emissaire')).toEqual(['Portrait']);
  });
  it('« heraldique » trouve la catégorie « Héraldique »', async () => {
    expect(await titles('heraldique')).toEqual(['Blason']);
  });
  it("chef-d'oeuvre avec apostrophe droite trouve l'apostrophe typographique", async () => {
    expect(await titles("chef-d'oeuvre")).toEqual(['Chef-d’Œuvre de Cadia']);
  });
  it('la recherche exacte avec accents marche toujours', async () => {
    expect(await titles('Célestine')).toEqual(['Célestine']);
    expect(await titles('Khârn')).toEqual(['Khârn le Traître']);
    expect(await titles('Œuvre')).toEqual(['Chef-d’Œuvre de Cadia']);
  });
});
