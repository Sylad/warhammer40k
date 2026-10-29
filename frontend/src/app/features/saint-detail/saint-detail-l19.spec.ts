// L19 (revue UX Lore : Saints, fiche) — voile relevé sur l'en-tête (WCAG 1.4.3), liens de l'iconographie nommés (2.4.4),
// barre d'ancres nommée (1.3.1).
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { SaintDetailComponent } from './saint-detail.component';

async function monter() {
  const service = fakeWarhammerService({
    getSaint: () => of({ id: 'saint-sabbat', name: 'Saint Sabbat', epithet: 'e', category: 'saint-canonized', ordoOrChapter: 'Ordo X',
      era: 'M33', color: '#c9a44a', description: 'd', wikiQuery: 'Saint Sabbat', galleryQueries: ['a', 'b'] }),
    getWikiImage: (q: string) => of({ imageUrl: `http://img/${q}.jpg`, pageTitle: null, pageUrl: null }),
  });
  await setupTestBed([SaintDetailComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'saint-sabbat' })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(SaintDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('Saints, fiche (L19)', () => {
  it('R1 — l\'en-tête porte le voile relevé (0,88 → 0,76 → 0,72), comme équipement et vaisseaux', async () => {
    const e = await monter();
    expect(e.querySelector('.hero-overlay')!.classList.contains('hero-overlay-releve')).toBe(true);
  });

  it('R2 — chaque vignette de l\'iconographie a un nom propre (numéro et saint), pas un lien vide', async () => {
    const e = await monter();
    const noms = Array.from(e.querySelectorAll('.iconography-card'), a => a.getAttribute('aria-label'));
    expect(noms).toEqual(['Galerie — illustration 1 de Saint Sabbat', 'Galerie — illustration 2 de Saint Sabbat']);
  });

  it('R3 — la barre d\'ancres est une navigation nommée', async () => {
    const e = await monter();
    expect(e.querySelector('nav.anchor-nav')!.getAttribute('aria-label')).toBe('Sections de la fiche');
  });
});
