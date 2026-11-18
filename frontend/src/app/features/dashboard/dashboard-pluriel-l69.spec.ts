// L69 — Accueil : le nom de chaque compteur des raccourcis s'accorde au nombre
// (0 et 1 au singulier, 2 et plus au pluriel), jamais « 1 œuvres ».
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { WarhammerService } from '../../core/services/warhammer.service';

const list = (n: number) => Array.from({ length: n }, (_, i) => ({ id: String(i) }));

async function compteurs(n: number | null): Promise<string[]> {
  const src = n === null ? NEVER : of(list(n));
  await setupTestBed([DashboardComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        loreFeed: () => of([]),
        factions$: src, series$: src, videos$: src, artworks$: src,
        getSubFactions: () => of([]),
      }),
    },
  ]);
  const f = TestBed.createComponent(DashboardComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return [...(f.nativeElement as HTMLElement).querySelectorAll('.shortcut-foot')].map((e) =>
    `${e.querySelector('.num')?.textContent?.trim()} ${e.querySelector('.lbl')?.textContent?.trim()}`,
  );
}

describe('Accueil — accord des compteurs (L69)', () => {
  it('0 : singulier', async () => {
    expect(await compteurs(0)).toEqual(['0 faction majeure', '0 série', '0 vidéo', '0 œuvre']);
  });

  it('1 : « 1 œuvre », jamais « 1 œuvres »', async () => {
    expect(await compteurs(1)).toEqual(['1 faction majeure', '1 série', '1 vidéo', '1 œuvre']);
  });

  it('2 : pluriel', async () => {
    expect(await compteurs(2)).toEqual(['2 factions majeures', '2 séries', '2 vidéos', '2 œuvres']);
  });

  it('nombre pas encore connu : pluriel derrière le tiret', async () => {
    expect(await compteurs(null)).toEqual(['— factions majeures', '— séries', '— vidéos', '— œuvres']);
  });
});
