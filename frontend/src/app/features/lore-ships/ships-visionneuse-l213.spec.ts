import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreShipsComponent } from './lore-ships.component';
import { ShipDetailComponent } from '../ship-detail/ship-detail.component';

// L213 — QA prod du 29-10 : la visionneuse des Vaisseaux demandait 4 requêtes de variante (« warhammer 40k », « starship art »,
// « Imperial Navy », « concept art ») qui ne donnaient aucune vignette ; la fiche Phalanx demandait « Star Fort Imperial » deux
// fois et répétait l'image du haut de page dans l'Iconographie.
type Seed = { id: string; name: string; wikiQuery: string; galleryQueries: string[] };
const seed: Seed[] = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/legendary-ships.json'), 'utf8'));

async function ouvrirVisionneuse() {
  const demandes: string[] = [];
  await setupTestBed([LoreShipsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      ships$: of(seed),
      getWikiImage: (q: string) => { demandes.push(q); return of({ imageUrl: `http://img/${q}.jpg`, pageTitle: q, pageUrl: null }); },
    }) },
  ]);
  const f = TestBed.createComponent(LoreShipsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  demandes.length = 0;
  f.componentInstance.openLightbox(seed[0] as never);
  f.detectChanges();
  return { demandes, lightbox: f.componentInstance.lightbox()! };
}

async function ouvrirFiche(ship: Partial<Seed>, image: (q: string) => string) {
  const demandes: string[] = [];
  await setupTestBed([ShipDetailComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      getShip: () => of({ id: 'x', name: 'X', class: 'c', factionId: 'f', factionName: 'F', color: '#c9a44a', currentStatus: 's', description: 'd', ...ship }),
      getWikiImage: (q: string) => { demandes.push(q); return of({ imageUrl: image(q), pageTitle: null, pageUrl: null }); },
    }) },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'x' })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(ShipDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { demandes, vignettes: (f.nativeElement as HTMLElement).querySelectorAll('.iconography-card').length };
}

describe('Vaisseaux — visionneuse et fiche allégées (L213)', () => {
  it('R1 — la visionneuse ne demande plus aucune requête de variante au wiki', async () => {
    const { demandes, lightbox } = await ouvrirVisionneuse();
    expect(demandes).toEqual([]);
    expect(lightbox.thumbUrls).toEqual([lightbox.mainUrl]);
  });

  it('R2 — une requête de galerie identique à la requête de l\'image du haut n\'est pas redemandée', async () => {
    const { demandes } = await ouvrirFiche({ wikiQuery: 'Star Fort Imperial', galleryQueries: ['a', 'star fort imperial', 'b'] }, q => `http://img/${q}.jpg`);
    expect(demandes.filter(q => q.toLowerCase() === 'star fort imperial')).toHaveLength(1);
  });

  it('R3 — une image de l\'Iconographie déjà vue (haut de page ou vignette précédente) n\'y est pas répétée', async () => {
    const { vignettes } = await ouvrirFiche({ wikiQuery: 'h', galleryQueries: ['a', 'b', 'c'] }, q => (q === 'h' || q === 'a' ? 'http://img/même.jpg' : `http://img/${q}.jpg`));
    expect(vignettes).toBe(2);
  });

  it('R4 — dans le seed, aucune galleryQuery d\'un vaisseau ne reprend sa wikiQuery', () => {
    for (const v of seed) {
      expect(v.galleryQueries.map(q => q.toLowerCase()), v.id).not.toContain(v.wikiQuery.toLowerCase());
    }
  });
});
