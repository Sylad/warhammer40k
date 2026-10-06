// L64 — « Collections populaires » : le compteur de chaque collection est écrit avec l'accord
// français (0 et 1 au singulier, 2 et plus au pluriel), jamais « 1 œuvres ».
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const COLLECTIONS = [
  { id: 'c0', name: 'Vide', count: 0 },
  { id: 'c1', name: 'Seule', count: 1 },
  { id: 'c2', name: 'Deux', count: 2 },
];

describe('Galerie — compteurs de « Collections populaires » (L64)', () => {
  it('accorde « œuvre » au singulier pour 0 et 1, au pluriel dès 2', async () => {
    await setupTestBed([GalleryComponent], [
      provideRouter([]),
      {
        provide: WarhammerService,
        useValue: fakeWarhammerService({
          artworkCollections$: of(COLLECTIONS),
          getImageMeta: () => of({}),
          getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
        }),
      },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
    ]);
    const f = TestBed.createComponent(GalleryComponent);
    f.detectChanges();
    const textes = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.col-row small')).map((e) => e.textContent?.trim());
    expect(textes).toEqual(['0 œuvre', '1 œuvre', '2 œuvres']);
  });
});
