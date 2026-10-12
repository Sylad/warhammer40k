// L49 (relecture) : R6 (choisir une catégorie depuis la page 2) et R9 (échec du catalogue même avec des images perso).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError, type Observable } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const ARTWORKS = Array.from({ length: 30 }, (_, i) => ({
  id: `aw-${i}`, title: `Œuvre ${i}`, artist: 'A', image: `${i}.jpg`,
  category: i < 6 ? 'Space Marines' : 'Xénos', faction: 'space-marines', likes: 1,
}));

async function harness(artworks$: Observable<unknown>, images$: Observable<unknown> = of([])) {
  await setupTestBed([GalleryComponent], [
    provideRouter([{ path: 'gallery', component: GalleryComponent }]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      artworks$, images$,
      factions$: of([{ id: 'space-marines', nom: 'Space Marines' }]),
      getImageMeta: () => of({}),
      getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
    }) },
  ]);
  const h = await RouterTestingHarness.create();
  const c = await h.navigateByUrl('/gallery', GalleryComponent);
  const settle = async () => { await new Promise((r) => setTimeout(r, 50)); h.detectChanges(); };
  await settle();
  const root = h.routeNativeElement!;
  return { c, root, settle };
}

describe('galerie — relecture L49', () => {
  it('R6 — page 2 puis une valeur de la liste Catégorie : retour page 1, la grille n’est pas vide', async () => {
    const { c, root, settle } = await harness(of(ARTWORKS));
    c.currentPage.set(2);
    await settle();
    c.onCategoryChange('Space Marines');
    await settle();
    expect(c.currentPage()).toBe(1);
    expect(root.querySelectorAll('.art-card').length).toBe(6);
  });

  it('R6 — page 2 puis Trier par : retour page 1', async () => {
    const { c, settle } = await harness(of(ARTWORKS));
    c.currentPage.set(2);
    await settle();
    c.onSortChange('alpha');
    await settle();
    expect(c.currentPage()).toBe(1);
  });

  it('R9 — catalogue en échec avec des images perso : message, Réessayer, pastilles « – » ; les images perso restent affichées', async () => {
    const { root } = await harness(throwError(() => new Error('500')), of(['perso.jpg']));
    expect(root.querySelector('[data-testid="message-erreur"]')?.textContent).toContain('Impossible de charger la galerie.');
    expect(root.querySelector('[data-testid="bouton-reessayer"]')).not.toBeNull();
    expect(root.querySelectorAll('.art-card').length).toBe(1);
    expect(root.querySelector('.hero-desc')?.textContent).not.toContain('œuvre');
    expect([...root.querySelectorAll('.stat-num')].map((e) => e.textContent!.trim())).toEqual(['–', '–', '–']);
  });

  it('R9 — catalogue en échec avec des images perso : rangée compacte des cartes (erreur et Réessayer restent dans le premier écran)', async () => {
    const { root } = await harness(throwError(() => new Error('500')), of(['perso.jpg']));
    expect(root.querySelector('.category-grid')!.classList.contains('attente')).toBe(true);
  });
});
