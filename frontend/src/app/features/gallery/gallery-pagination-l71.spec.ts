// L71 — Galerie : après un changement de page, le focus va sur la grille (tabindex=-1) et « Page N sur M »
// est annoncé dans une région d'état polie persistante (WCAG 2.4.3, 4.1.3 ; constat de la revue UX L64).
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

// 60 œuvres → 3 pages de 24 ; les 10 premières en « Xénos » pour tester un filtre.
const ARTWORKS = Array.from({ length: 60 }, (_, i) => ({
  id: `aw-${i}`, title: `Œuvre ${i}`, artist: 'Alice', image: `${i}.jpg`,
  category: i < 10 ? 'Xénos' : 'Space Marines', likes: 0,
}));

async function render(): Promise<ComponentFixture<GalleryComponent>> {
  polyfillDialog();
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS),
        artworkArtists$: of([{ id: 'a1', name: 'Alice', artworkCount: 60 }]),
        artworkCollections$: of([]),
        getImageMeta: () => of({}),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  document.body.appendChild(f.nativeElement); // focus() n'agit que sur un élément du document
  f.detectChanges();
  return f;
}

const bouton = (root: HTMLElement, nom: string) => root.querySelector<HTMLButtonElement>(`.pagination button[aria-label="${nom}"]`)!;
const grille = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-testid="grille-oeuvres"]')!;
const annonce = (root: HTMLElement) => root.querySelector<HTMLElement>('[data-testid="pagination-annonce"]');

describe('galerie — changement de page au clavier (L71, WCAG 2.4.3 / 4.1.3)', () => {
  it('R1 — la grille est une cible de focus hors tabulation (tabindex=-1)', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    expect(grille(root).getAttribute('tabindex')).toBe('-1');
  });

  it('R2 — « Page suivante » met le focus sur la grille et annonce « Page 2 sur 3 »', async () => {
    const f = await render();
    const root = f.nativeElement as HTMLElement;
    const live = annonce(root);
    expect(live?.getAttribute('role')).toBe('status');
    expect(live?.textContent?.trim()).toBe('');
    bouton(root, 'Page suivante').focus();
    bouton(root, 'Page suivante').click();
    f.detectChanges();
    expect(document.activeElement).toBe(grille(root));
    expect(annonce(root)).toBe(live); // région persistante : le même nœud, seul son texte change
    expect(live!.textContent!.trim()).toBe('Page 2 sur 3');
  });

  it('R3 — « Dernière page » (bouton qui devient désactivé) : focus sur la grille, « Page 3 sur 3 »', async () => {
    const f = await render();
    const root = f.nativeElement as HTMLElement;
    bouton(root, 'Dernière page').focus();
    bouton(root, 'Dernière page').click();
    f.detectChanges();
    expect(bouton(root, 'Dernière page').disabled).toBe(true);
    expect(document.activeElement).toBe(grille(root));
    expect(annonce(root)!.textContent!.trim()).toBe('Page 3 sur 3');
    bouton(root, 'Première page').click();
    f.detectChanges();
    expect(annonce(root)!.textContent!.trim()).toBe('Page 1 sur 3');
  });

  it('R4 — un filtre qui ramène en page 1 efface l\'annonce (jamais une page périmée)', async () => {
    const f = await render();
    const root = f.nativeElement as HTMLElement;
    bouton(root, 'Page suivante').click();
    f.detectChanges();
    f.componentInstance.toggleCategoryFilter('Xénos');
    f.detectChanges();
    expect(annonce(root)!.textContent!.trim()).toBe('');
  });

  // Suite de la revue UX L71 (constat 1, WCAG 2.3.3) : à 390 px avec « reduce », ~2 000 px de
  // défilement encore en mouvement à 482 ms. Le défilement vers la grille suit prefers-reduced-motion.
  describe('défilement vers la grille et prefers-reduced-motion', () => {
    const matchMediaOrigine = window.matchMedia;
    afterEach(() => { window.matchMedia = matchMediaOrigine; });
    const media = (reduit: boolean) => {
      window.matchMedia = ((q: string) => ({ matches: reduit && q === '(prefers-reduced-motion: reduce)', media: q })) as unknown as typeof window.matchMedia;
    };

    it('R5 — « reduce » : défilement instantané (behavior « auto »)', async () => {
      media(true);
      const f = await render();
      const root = f.nativeElement as HTMLElement;
      const defile = vi.fn();
      grille(root).scrollIntoView = defile;
      bouton(root, 'Page suivante').click();
      expect(defile).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    });

    it('R6 — sans préférence : défilement doux (behavior « smooth »)', async () => {
      media(false);
      const f = await render();
      const root = f.nativeElement as HTMLElement;
      const defile = vi.fn();
      grille(root).scrollIntoView = defile;
      bouton(root, 'Page suivante').click();
      expect(defile).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    });
  });
});
