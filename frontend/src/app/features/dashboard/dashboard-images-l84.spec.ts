// L84 (revue UX L2, mineur) : le héros (700 px demandés, affiché 1 364) et les cartes (Black Library :
// original de 200 px étiré à 326) étaient sous-dimensionnés.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { WarhammerService } from '../../core/services/warhammer.service';

const wiki = (q: string) => `https://static.wikia.nocookie.net/warhammer40k/images/a/a1/${encodeURIComponent(q)}.jpg/revision/latest/scale-to-width-down/700?cb=1`;

async function render() {
  const asked: string[] = [];
  const svc = {
    loreFeed: () => of([]),
    factions$: of([]), series$: of([]), videos$: of([]), artworks$: of([]),
    getSubFactions: () => of([]),
    getWikiImage: (q: string) => { asked.push(q); return of({ imageUrl: wiki(q), pageTitle: null, pageUrl: null }); },
  };
  await setupTestBed([DashboardComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(svc) },
  ]);
  const f = TestBed.createComponent(DashboardComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { el: f.nativeElement as HTMLElement, asked };
}

describe('Accueil : images nettes (L84)', () => {
  it('le héros demande une miniature de 1 400 px', async () => {
    const { el } = await render();
    const bg = (el.querySelector('.hero-bg') as HTMLElement).style.backgroundImage;
    expect(bg).toContain('/scale-to-width-down/1400');
    expect(bg).not.toContain('/scale-to-width-down/700');
  });

  it('les cartes demandent 700 px (affichées à 326 px, écrans 2x)', async () => {
    const { el } = await render();
    const imgs = [...el.querySelectorAll<HTMLElement>('.shortcut-img')].map((e) => e.style.backgroundImage);
    expect(imgs).toHaveLength(4);
    for (const bg of imgs) expect(bg).toContain('/scale-to-width-down/700');
  });

  it('la carte Romans ne cherche plus le logo de 200 px de Black Library', async () => {
    const { asked } = await render();
    expect(asked.join('|')).not.toContain('Black Library Warhammer 40000 books');
  });
});
