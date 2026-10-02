// L42 — « Galerie » du bloc Médias d'une page faction : /gallery?faction=<id> ouvre la galerie
// filtrée sur cette faction (avant : paramètre ignoré, galerie entière).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

describe('galerie — filtre faction par l’adresse (L42)', () => {
  it('/gallery?faction=necrons : seules les illustrations Nécrons', async () => {
    const service = fakeWarhammerService({
      artworks$: of([
        { id: 'aw-001', title: 'Ultramarines', artist: 'A', image: 'u.jpg', category: 'Space Marines', faction: 'space-marines', likes: 1 },
        { id: 'aw-n', title: 'Nécron', artist: 'B', image: 'n.jpg', category: 'Xénos', faction: 'necrons', likes: 1 },
      ]),
      getImageMeta: () => of({}),
      getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
    });
    await setupTestBed([GalleryComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ faction: 'necrons' })), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({ faction: 'necrons' }) } } },
    ]);
    const f = TestBed.createComponent(GalleryComponent);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.filterFaction()).toBe('necrons');
    expect(c.filteredArtworks().map((a) => a.id)).toEqual(['aw-n']);
  });
});
