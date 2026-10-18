// L7/t1 — Galerie : la carte d'œuvre s'ouvre au clavier (bouton nommé par le titre ; le retour du focus est dans gallery-visionneuse-l7.spec.ts) et les filtres en bascule (catégories, artistes, collections) disent leur état
// par aria-pressed (WCAG 2.1.1, 4.1.2). Constats de la revue UX du 18-10.
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const ARTWORKS = [
  { id: 'aw-1', title: 'Ultramarines', artist: 'Alice', image: 'u.jpg', category: 'Space Marines', likes: 1 },
  { id: 'aw-2', title: 'Nécron', artist: 'Bob', image: 'n.jpg', category: 'Xénos', likes: 2 },
];

async function render(): Promise<ComponentFixture<GalleryComponent>> {
  polyfillDialog();
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS),
        artworkArtists$: of([{ id: 'a1', name: 'Alice', artworkCount: 1 }]),
        artworkCollections$: of([{ id: 'c1', name: 'Collection', count: 1 }]),
        getImageMeta: () => of({}),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  return f;
}

const cartes = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>('.art-card'));

describe('galerie — carte d\'œuvre au clavier (L7/t1, WCAG 2.1.1 / 4.1.2)', () => {
  it('R1 — chaque carte porte un vrai bouton, nommé par le titre de l\'œuvre', async () => {
    const root = (await render()).nativeElement as HTMLElement;
    const boutons = cartes(root).map((c) => c.querySelector<HTMLButtonElement>('button.art-open'));
    expect(boutons.every((b) => b?.tagName === 'BUTTON' && b.type === 'button')).toBe(true);
    expect(boutons.map((b) => b!.textContent!.trim())).toEqual(['Ultramarines', 'Nécron']);
  });

  it('R2 — activer le bouton de la carte ouvre la visionneuse sur cette œuvre', async () => {
    const f = await render();
    const root = f.nativeElement as HTMLElement;
    cartes(root)[1].querySelector<HTMLButtonElement>('button.art-open')!.click();
    f.detectChanges();
    expect(root.ownerDocument.querySelector('.vi-title')?.textContent?.trim()).toBe('Nécron');
  });

  it('R3 — aucune carte ni la visionneuse ne porte de bouton Favori (retiré, décision du 18-10), sans bouton imbriqué', async () => {
    const f = await render();
    const root = f.nativeElement as HTMLElement;
    for (const c of cartes(root)) {
      expect(c.querySelectorAll('button button')).toHaveLength(0);
      expect(c.querySelectorAll('button')).toHaveLength(1);
      expect(c.querySelector('.bookmark')).toBeNull();
    }
    cartes(root)[0].querySelector<HTMLButtonElement>('button.art-open')!.click();
    f.detectChanges();
    const dlg = root.ownerDocument.querySelector('.vi-actions')!;
    expect(dlg.textContent).not.toMatch(/favori/i);
    expect(dlg.querySelector('.vi-btn.on')).toBeNull();
  });
});

describe('galerie — état des filtres en bascule (L7/t1, WCAG 4.1.2)', () => {
  const cas: [string, string][] = [
    ['cartes catégorie', '.category-card'],
    ['artistes', '.artist-row'],
    ['collections', '.col-row'],
  ];
  for (const [nom, sel] of cas) {
    it(`R4 — ${nom} : aria-pressed suit l'état actif`, async () => {
      const f = await render();
      const root = f.nativeElement as HTMLElement;
      const premier = () => root.querySelector<HTMLButtonElement>(sel)!;
      expect(premier().getAttribute('aria-pressed')).toBe('false');
      premier().click();
      f.detectChanges();
      expect(premier().getAttribute('aria-pressed')).toBe('true');
      expect(premier().classList.contains('active')).toBe(true);
    });
  }
});
