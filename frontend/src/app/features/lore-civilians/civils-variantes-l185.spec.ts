// L185 (revue UX L12) — visionneuse des Civils Impériaux : la variante de recherche « battlefleet » ne vaut que pour
// les vaisseaux de l'Imperial Navy ; ailleurs elle plaçait un vaisseau dans la galerie d'une figure (Sébastian Thor).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreCiviliansComponent } from './lore-civilians.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/imperial-orgs.json'), 'utf8'));
const IMG = 'data:image/svg+xml;base64,PHN2Zy8+';

async function ouvrir(orgId: string, figureIdx = 0) {
  const demandes: string[] = [];
  await setupTestBed([LoreCiviliansComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        imperialOrgs$: of(seed),
        getWikiImage: (q: string) => { demandes.push(q); return of({ imageUrl: `${IMG}#${q}`, pageTitle: null, pageUrl: null }); },
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreCiviliansComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  const org = seed.find((o: { id: string }) => o.id === orgId);
  demandes.length = 0;
  f.componentInstance.openLightbox(org, org.notableFigures[figureIdx]);
  await settle();
  return demandes;
}

describe('Civils Impériaux — variantes de recherche de la visionneuse (L185)', () => {
  it('R1 — une figure hors Imperial Navy (Sébastian Thor) ne demande pas la variante « battlefleet »', async () => {
    const orgId = seed.find((o: { notableFigures: { name: string }[] }) => o.notableFigures.some(f => /Thor/.test(f.name))).id;
    expect(orgId).not.toBe('imperial-navy');
    const demandes = await ouvrir(orgId, seed.find((o: { id: string }) => o.id === orgId).notableFigures.findIndex((f: { name: string }) => /Thor/.test(f.name)));
    expect(demandes.length).toBeGreaterThan(0);
    expect(demandes.some(q => /battlefleet/i.test(q))).toBe(false);
  });

  it('R2 — une figure de l\'Imperial Navy garde la variante « battlefleet »', async () => {
    const demandes = await ouvrir('imperial-navy');
    expect(demandes.some(q => /battlefleet/i.test(q))).toBe(true);
  });
});
