// L120 — l'image de la carte d'unité de la page faction passe par `localUnitImage` :
// fiche technique (HEAD /api/images/datasheets/:id), puis portrait local (HEAD /api/images/portraits/:id),
// puis portrait du wiki. Un simple HEAD sur la fiche ferait tomber les 14 portraits locaux sur le wiki.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionDetailComponent } from './faction-detail.component';

const WIKI = 'https://wiki.example/portrait-wiki.jpg';
const DATASHEET = '/api/images/datasheets/u1';
const PORTRAIT = '/api/images/portraits/u1';

describe('fiche faction — image de la carte d’unité (L120)', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => { globalThis.fetch = realFetch; });
  afterEach(() => { globalThis.fetch = realFetch; });

  async function render(heads: Record<string, number>, index: { datasheets: string[]; portraits: string[] } | null = null) {
    const fetched: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      fetched.push(`${init?.method ?? 'GET'} ${u}`);
      const status = heads[u] ?? 404;
      return { ok: status === 200, status } as Response;
    }) as typeof fetch;
    const wikiQueries: string[] = [];
    const service = fakeWarhammerService({
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([{ id: 'u1', factionId: 'orks', nom: 'Boyz', type: 'Infanterie', role: 'r', description: 'd' }]),
      getSubFactions: () => of([]),
      datasheetUrl: (id: string) => `/api/images/datasheets/${id}`,
      portraitUrl: (id: string) => `/api/images/portraits/${id}`,
      unitImageIndex: () => of(index),
      getWikiImage: (q: string) => { wikiQueries.push(q); return of({ imageUrl: WIKI, pageTitle: null, pageUrl: null }); },
    });
    await setupTestBed([FactionDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'orks' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(FactionDetailComponent);
    f.detectChanges();
    await f.whenStable();
    await new Promise(r => setTimeout(r, 0));
    f.detectChanges();
    const card = (f.nativeElement as HTMLElement).querySelector<HTMLElement>('a.unit-card');
    return { image: f.componentInstance.unitImages().get('u1'), fetched, wikiQueries, card };
  }

  it('fiche 200 : la carte prend la fiche technique, sans interroger le portrait ni le wiki', async () => {
    const r = await render({ [DATASHEET]: 200, [PORTRAIT]: 200 });
    expect(r.card).not.toBeNull();
    expect(r.image).toBe(DATASHEET);
    expect(r.fetched).toEqual([`HEAD ${DATASHEET}`]);
    expect(r.wikiQueries).not.toContain('Boyz');
  });

  it('fiche 404 puis portrait 200 : la carte prend le portrait local /api/images/portraits/:id, pas le wiki', async () => {
    const r = await render({ [DATASHEET]: 404, [PORTRAIT]: 200 });
    expect(r.image).toBe(PORTRAIT);
    expect(r.fetched).toEqual([`HEAD ${DATASHEET}`, `HEAD ${PORTRAIT}`]);
    expect(r.wikiQueries).not.toContain('Boyz');
    expect(r.card!.style.getPropertyValue('--unit-img')).toContain(PORTRAIT);
  });

  it('fiche 404 et portrait 404 : repli sur le portrait du wiki', async () => {
    const r = await render({ [DATASHEET]: 404, [PORTRAIT]: 404 });
    expect(r.fetched).toEqual([`HEAD ${DATASHEET}`, `HEAD ${PORTRAIT}`]);
    expect(r.wikiQueries).toContain('Boyz');
    expect(r.image).toBe(WIKI);
  });

  // L222 — avec l'index des images locales, une image absente n'est jamais sondée (un HEAD 404 = erreur console).
  it('L222 — index : portrait seul listé → un seul HEAD, sur le portrait, aucune requête vers la fiche absente', async () => {
    const r = await render({ [PORTRAIT]: 200 }, { datasheets: [], portraits: ['u1'] });
    expect(r.image).toBe(PORTRAIT);
    expect(r.fetched).toEqual([`HEAD ${PORTRAIT}`]);
  });

  it('L222 — index : fiche listée → un seul HEAD, sur la fiche', async () => {
    const r = await render({ [DATASHEET]: 200 }, { datasheets: ['u1'], portraits: [] });
    expect(r.image).toBe(DATASHEET);
    expect(r.fetched).toEqual([`HEAD ${DATASHEET}`]);
  });

  it('L222 — index : rien de listé → aucune requête locale, repli direct sur le wiki', async () => {
    const r = await render({}, { datasheets: [], portraits: [] });
    expect(r.fetched).toEqual([]);
    expect(r.image).toBe(WIKI);
  });

  it('L222 — index listé mais fichier disparu (HEAD 404) : repli sur le portrait puis le wiki', async () => {
    const r = await render({}, { datasheets: ['u1'], portraits: ['u1'] });
    expect(r.fetched).toEqual([`HEAD ${DATASHEET}`, `HEAD ${PORTRAIT}`]);
    expect(r.image).toBe(WIKI);
  });
});
