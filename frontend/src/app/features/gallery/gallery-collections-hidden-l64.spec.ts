// L64/t2 : les collections à 0 œuvre ne sont jamais proposées (impasse) ; le panneau vide disparaît ;
// la pastille « Collections » du bandeau compte les collections non vides.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

async function render(collections: { id: string; name: string; count: number }[]): Promise<HTMLElement> {
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworkCollections$: of(collections),
        getImageMeta: () => of({}),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}
const panneau = (el: HTMLElement) => Array.from(el.querySelectorAll('.side-panel'))
  .find((s) => s.querySelector('h3')?.textContent?.includes('Collections populaires'));
const pastille = (el: HTMLElement) => Array.from(el.querySelectorAll('.stat-card'))
  .find((c) => c.querySelector('.stat-label')?.textContent?.trim() === 'Collections');

describe('Galerie — collections vides (L64/t2)', () => {
  it('masque les collections à 0 œuvre et compte les autres dans la pastille', async () => {
    const el = await render([{ id: 'c0', name: 'Vide', count: 0 }, { id: 'c1', name: 'Seule', count: 1 }, { id: 'c2', name: 'Deux', count: 2 }]);
    expect(Array.from(el.querySelectorAll('.col-row strong')).map((e) => e.textContent?.trim())).toEqual(['Seule', 'Deux']);
    expect(pastille(el)?.querySelector('.stat-num')?.textContent?.trim()).toBe('2');
  });

  it('aucune collection non vide : ni panneau, ni pastille', async () => {
    const el = await render([{ id: 'c0', name: 'Vide', count: 0 }]);
    expect(panneau(el)).toBeUndefined();
    expect(pastille(el)).toBeUndefined();
  });
});
