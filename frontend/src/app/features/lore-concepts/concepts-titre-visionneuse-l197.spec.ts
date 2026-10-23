// L197 (QA prod de L13) — le titre de la visionneuse d'un concept portait la couleur brute du concept (Imperium Nihilus
// 1,8:1, Maelstrom 2,21:1) : il prend la teinte lisible, ≥ 4,5:1 sur le fond le plus clair de la visionneuse.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { contraste, FOND_TEXTE_SOMBRE, teinteLisible } from '../../core/utils/teinte-lisible';
import { LoreConceptsComponent } from './lore-concepts.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/lore-concepts.json'), 'utf8')) as
  { id: string; name: string; color: string }[];

async function monter() {
  await setupTestBed([LoreConceptsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      loreConcepts$: of(seed),
      getWikiImage: () => of({ imageUrl: 'http://img/x.jpg', pageTitle: null, pageUrl: null }),
    }) },
  ]);
  const f = TestBed.createComponent(LoreConceptsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.componentInstance;
}

describe('Concepts, titre de la visionneuse (L197)', () => {
  it('R1 — la visionneuse de chacun des 15 concepts a un titre en teinte lisible, ≥ 4,5:1', async () => {
    const cmp = await monter();
    expect(seed.length).toBe(15);
    for (const c of seed) {
      cmp.openLightbox(cmp.concepts().find(x => x.id === c.id)!);
      const couleur = cmp.lightbox()!.contextColor;
      expect(couleur, c.id).toBe(teinteLisible(c.color));
      expect(contraste(couleur, FOND_TEXTE_SOMBRE), c.id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('R2 — le problème est réel : au moins 5 couleurs brutes sont sous 3:1', () => {
    expect(seed.filter(c => contraste(c.color, FOND_TEXTE_SOMBRE) < 3).length).toBeGreaterThanOrEqual(5);
  });
});
