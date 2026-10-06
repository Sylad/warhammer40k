// L75 — attendus QA de /gallery après L70, rejoués sur le vrai seed : trois pastilles (Collections 3),
// panneau « Collections populaires » à 8 / 1 / 8, et un clic sur une collection affiche exactement
// ce nombre de cartes.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const seedDir = path.resolve(__dirname, '../../../../../backend/seed');
const lire = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(seedDir, f), 'utf-8')) as T;

async function rendre() {
  const artworks = lire<any[]>('artworks.json');
  // Le serveur ignore le `count` du fichier (L64) et le recalcule depuis les œuvres : on fait de même.
  const collections = lire<{ id: string; name: string }[]>('artwork-collections.json').map((c) => ({
    ...c,
    count: artworks.filter((a) => a.collectionId === c.id).length,
  }));
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(artworks),
        artworkCollections$: of(collections),
        images$: of([]),
        getImageMeta: () => of({}),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement, artworks };
}

describe('Galerie — collections du seed après L70 (L75)', () => {
  it('trois pastilles, dont Collections = 3', async () => {
    const { el } = await rendre();
    const stats = Array.from(el.querySelectorAll('.stat-label')).map((e) => e.textContent?.trim());
    expect(stats).toEqual(['Œuvres', 'Artistes', 'Collections']);
    const col = Array.from(el.querySelectorAll('.stat-card')).find((s) => s.querySelector('.stat-label')?.textContent?.trim() === 'Collections');
    expect(col?.querySelector('.stat-num')?.textContent?.trim()).toBe('3');
  });

  it('le panneau annonce 8 / 1 / 8 œuvres, sans dépasser le total', async () => {
    const { el, artworks } = await rendre();
    const lignes = Array.from(el.querySelectorAll('.col-row small')).map((e) => e.textContent?.trim()).sort();
    expect(lignes).toEqual(['1 œuvre', '8 œuvres', '8 œuvres']);
    const somme = Array.from(el.querySelectorAll('.col-row small')).reduce((t, e) => t + parseInt(e.textContent!, 10), 0);
    const total = Array.from(el.querySelectorAll('.stat-card')).find((s) => s.querySelector('.stat-label')?.textContent?.trim() === 'Œuvres');
    expect(somme).toBeLessThanOrEqual(parseInt(total!.querySelector('.stat-num')!.textContent!, 10));
    expect(somme).toBeLessThanOrEqual(artworks.length);
  });

  it('un clic sur chaque collection affiche exactement son nombre de cartes', async () => {
    const { f, el, artworks } = await rendre();
    const sansFiltre = Math.min(24, artworks.length);
    const rows = Array.from(el.querySelectorAll<HTMLButtonElement>('.col-row'));
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      const attendu = parseInt(row.querySelector('small')!.textContent!, 10);
      row.click();
      f.detectChanges();
      expect(el.querySelectorAll('.art-card')).toHaveLength(attendu);
      row.click();
      f.detectChanges();
      expect(el.querySelectorAll('.art-card')).toHaveLength(sansFiltre);
    }
  });
});
