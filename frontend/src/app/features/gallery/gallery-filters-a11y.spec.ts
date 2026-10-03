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
];
const FACTIONS = [
  { id: 'space-marines', nom: 'Space Marines' },
  { id: 'necrons', nom: 'Nécrons' },
  { id: 'astra-militarum', nom: 'Astra Militarum' },
  { id: 'tau', nom: 'T\'au' },
];
/** Image perso catégorisée à la main : faction saisie en texte libre, sans fiche au codex. */
const META = { 'perso.jpg': { categories: ['Imperium'], title: 'Perso', artist: 'Moi', faction: 'Garde de Cadia' } };
const USER_IMAGES = ['perso.jpg'];

async function render(): Promise<ComponentFixture<GalleryComponent>> {
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS),
        factions$: of(FACTIONS),
        getImageMeta: () => of(META),
        images$: of(USER_IMAGES),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
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

  it('le champ de recherche a un nom accessible qui n’est pas son placeholder', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const input = byLabel(root.querySelector<HTMLElement>('.search-bar')!, 'Rechercher dans la galerie');
    expect(input.tagName).toBe('INPUT');
    expect(accessibleName(input)).not.toBe(input.placeholder);
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
