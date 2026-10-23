// L193 — une variante de la visionneuse en erreur HTTP (transitoire) ne doit pas arrêter les variantes suivantes :
// la galerie ne se réduit pas à une image.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreCiviliansComponent } from './lore-civilians.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/imperial-orgs.json'), 'utf8'));

async function monter(reponse: (q: string) => ReturnType<typeof of>) {
  const demandes: string[] = [];
  await setupTestBed([LoreCiviliansComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        imperialOrgs$: of(seed),
        getWikiImage: (q: string) => { demandes.push(q); return reponse(q); },
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreCiviliansComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  return { demandes, f, settle };
}

describe('Civils Impériaux — une variante en erreur n\'arrête pas la chaîne (L193)', () => {
  it('R1 — la deuxième variante en erreur HTTP : les variantes suivantes sont demandées et listées', async () => {
    const image = (q: string) => of({ imageUrl: `http://img/${q}`, pageTitle: null, pageUrl: null });
    const { demandes, f, settle } = await monter(q => q.endsWith(' concept art') ? throwError(() => new Error('500')) : image(q));
    const org = seed.find((o: { id: string }) => o.id === 'imperial-navy');
    demandes.length = 0;
    f.componentInstance.openLightbox(org, org.notableFigures[0]);
    await settle();
    expect(demandes.length).toBe(5);
    expect(f.componentInstance.lightbox()!.thumbUrls).toHaveLength(5);
  });

  it('R2 — la première variante en erreur : la galerie reçoit quand même les suivantes', async () => {
    const image = (q: string) => of({ imageUrl: `http://img/${q}`, pageTitle: null, pageUrl: null });
    const { demandes, f, settle } = await monter(q => q.endsWith(' art') && !q.endsWith('concept art') ? throwError(() => new Error('503')) : image(q));
    const org = seed.find((o: { id: string }) => o.id === 'imperial-navy');
    demandes.length = 0;
    f.componentInstance.openLightbox(org, org.notableFigures[0]);
    await settle();
    expect(demandes.length).toBe(5);
    expect(f.componentInstance.lightbox()!.thumbUrls.length).toBeGreaterThan(1);
  });
});
