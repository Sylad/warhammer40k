// L18 (revue UX Lore : Titans, fiche) — voile relevé sur l'en-tête (WCAG 1.4.3), liens de l'iconographie nommés (2.4.4),
// barre d'ancres nommée (1.3.1).
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { TitanDetailComponent } from './titan-detail.component';

async function monter() {
  const service = fakeWarhammerService({
    getGodMachine: () => of({ id: 'warhound-titan', name: 'Warhound', category: 'titan', scoutClass: 'Scout Titan', size: 'Classe Warhound',
      factionId: 'adeptus-mechanicus', factionName: 'Collegia Titanica', color: '#7a2020', description: 'd', wikiQuery: 'Warhound', galleryQueries: ['a', 'b'] }),
    getWikiImage: (q: string) => of({ imageUrl: `http://img/${q}.jpg`, pageTitle: null, pageUrl: null }),
  });
  await setupTestBed([TitanDetailComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'warhound-titan' })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(TitanDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('Titans, fiche (L18)', () => {
  it('R1 — l\'en-tête porte le voile relevé (0,88 → 0,76 → 0,72), comme équipement et vaisseaux', async () => {
    const e = await monter();
    expect(e.querySelector('.hero-overlay')!.classList.contains('hero-overlay-releve')).toBe(true);
  });

  it('R2 — chaque vignette de l\'iconographie a un nom propre (numéro et machine), pas un lien vide', async () => {
    const e = await monter();
    const noms = Array.from(e.querySelectorAll('.iconography-card'), a => a.getAttribute('aria-label'));
    expect(noms).toEqual(['Galerie — illustration 1 de Warhound', 'Galerie — illustration 2 de Warhound']);
  });

  it('R3 — la barre d\'ancres est une navigation nommée', async () => {
    const e = await monter();
    expect(e.querySelector('nav.anchor-nav')!.getAttribute('aria-label')).toBe('Sections de la fiche');
  });
});
