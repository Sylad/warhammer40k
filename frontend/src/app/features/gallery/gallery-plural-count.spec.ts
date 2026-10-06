// L58 — Galerie : l'en-tête et les pastilles de catégories accordent « œuvre » (0 et 1 au
// singulier, 2 et plus au pluriel), jamais « 1 œuvres » (relevé QA du 04-10).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const art = (id: string, category: string) => ({ id, title: id, artist: 'A', image: `${id}.jpg`, category, faction: 'x', likes: 1 });

async function render(artworks: unknown[]): Promise<HTMLElement> {
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(artworks),
        factions$: of([]),
        getImageMeta: () => of({}),
        images$: of([]),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const compact = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

describe('Galerie — accord de « œuvre » (L58)', () => {
  it('une seule œuvre : « 1 œuvre triée… » et « 1 œuvre » sur sa catégorie', async () => {
    const el = await render([art('a1', 'Xénos')]);
    expect(compact(el.querySelector('.hero-desc')?.textContent)).toContain('1 œuvre triée, classée et archivée.');
    const compteurs = Array.from(el.querySelectorAll('.cat-count')).map((e) => compact(e.textContent));
    expect(compteurs).toContain('1 œuvre');
    expect(compteurs.some((t) => /\b1 œuvres/.test(t))).toBe(false);
  });

  it('plusieurs œuvres : pluriel partout', async () => {
    const el = await render([art('a1', 'Xénos'), art('a2', 'Xénos')]);
    expect(compact(el.querySelector('.hero-desc')?.textContent)).toContain('2 œuvres triées, classées et archivées.');
    expect(Array.from(el.querySelectorAll('.cat-count')).map((e) => compact(e.textContent))).toContain('2 œuvres');
  });
});
