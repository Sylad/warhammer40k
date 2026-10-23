// L190 — QA prod du 23-10 : « Master of the Administratum » lançait 5 requêtes /api/wiki-image qui retombaient
// toutes sur la même icône, et « Malcador » deux requêtes identiques (celle de l'organisation et celle de la figure).
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
const ICONE = 'data:image/svg+xml;base64,PHN2Zy8+#icone';

async function monter(reponse: (q: string) => string) {
  const demandes: string[] = [];
  await setupTestBed([LoreCiviliansComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        imperialOrgs$: of(seed),
        getWikiImage: (q: string) => { demandes.push(q); return of({ imageUrl: reponse(q), pageTitle: null, pageUrl: null }); },
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreCiviliansComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  return { demandes, f, settle };
}

describe('Civils Impériaux — une seule résolution d\'image par requête et par visite (L190)', () => {
  it('R1 — au chargement, aucune requête /api/wiki-image n\'est envoyée deux fois (Malcador : organisation et figure)', async () => {
    const { demandes } = await monter(q => `http://img/${q}`);
    const doublons = demandes.filter((q, i) => demandes.indexOf(q) !== i);
    expect(doublons).toEqual([]);
  });

  it('R2 — Malcador the Sigillite : une seule requête pour l\'organisation et la figure', async () => {
    const { demandes } = await monter(q => `http://img/${q}`);
    expect(demandes.filter(q => q === 'Malcador the Sigillite')).toHaveLength(1);
  });

  it('R3 — la visionneuse de « Master of the Administratum » s\'arrête au premier repli vers la même icône (une variante demandée, pas quatre)', async () => {
    const { demandes, f, settle } = await monter(() => ICONE);
    const org = seed.find((o: { id: string }) => o.id === 'adeptus-administratum');
    demandes.length = 0;
    f.componentInstance.openLightbox(org, org.notableFigures[0]);
    await settle();
    expect(demandes).toEqual(['Master of the Administratum art']);
    expect(f.componentInstance.lightbox()!.thumbUrls).toEqual([ICONE]);
  });

  it('R4 — des variantes qui ramènent des images distinctes restent toutes demandées et listées', async () => {
    const { demandes, f, settle } = await monter(q => `http://img/${q}`);
    const org = seed.find((o: { id: string }) => o.id === 'imperial-navy');
    demandes.length = 0;
    f.componentInstance.openLightbox(org, org.notableFigures[0]);
    await settle();
    expect(demandes.length).toBe(5);
    expect(f.componentInstance.lightbox()!.thumbUrls).toHaveLength(6);
  });
});
