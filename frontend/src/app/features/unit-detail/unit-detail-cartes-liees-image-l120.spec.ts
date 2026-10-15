// L120 — l'image des cartes « Unités associées » passe par `localUnitImage` :
// fiche technique (HEAD /api/images/datasheets/:id), puis portrait local (HEAD /api/images/portraits/:id),
// puis portrait du wiki. Un simple HEAD sur la fiche ferait tomber les portraits locaux sur le wiki.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { UnitDetailComponent } from './unit-detail.component';

const WIKI = 'https://wiki.example/portrait-wiki.jpg';
const DATASHEET = '/api/images/datasheets/r1';
const PORTRAIT = '/api/images/portraits/r1';
const UNITS: Record<string, unknown> = {
  u: { id: 'u', factionId: 'orks', nom: 'Boyz', type: 'Infanterie', role: 'r', description: 'd', relatedUnitIds: ['r1'] },
  r1: { id: 'r1', factionId: 'orks', nom: 'Nobz', type: 'Infanterie', role: 'r', description: 'd', wikiQuery: 'Ork Nobz' },
};

describe('fiche unité — image des cartes liées (L120)', () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => { globalThis.fetch = realFetch; });
  afterEach(() => { globalThis.fetch = realFetch; });

  async function render(heads: Record<string, number>) {
    const fetched: string[] = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      fetched.push(`${init?.method ?? 'GET'} ${u}`);
      const status = heads[u] ?? 404;
      return { ok: status === 200, status } as Response;
    }) as typeof fetch;
    const wikiQueries: string[] = [];
    const service = fakeWarhammerService({
      getUnit: (id: string) => of(UNITS[id]),
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
      datasheetUrl: (id: string) => `/api/images/datasheets/${id}`,
      portraitUrl: (id: string) => `/api/images/portraits/${id}`,
      getWikiImage: (q: string) => { wikiQueries.push(q); return of({ imageUrl: WIKI, pageTitle: null, pageUrl: null }); },
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    await new Promise(r => setTimeout(r, 0));
    f.detectChanges();
    const card = (f.nativeElement as HTMLElement).querySelector<HTMLElement>('a.related');
    return { image: f.componentInstance.relatedImages().get('r1'), fetched, wikiQueries, card };
  }

  it('fiche 200 : la carte liée prend la fiche technique, sans interroger le portrait ni le wiki', async () => {
    const r = await render({ [DATASHEET]: 200, [PORTRAIT]: 200 });
    expect(r.card).not.toBeNull();
    expect(r.image).toBe(DATASHEET);
    expect(r.fetched).toContain(`HEAD ${DATASHEET}`);
    expect(r.fetched).not.toContain(`HEAD ${PORTRAIT}`);
    expect(r.wikiQueries).not.toContain('Ork Nobz');
  });

  it('fiche 404 puis portrait 200 : la carte liée prend le portrait local /api/images/portraits/:id, pas le wiki', async () => {
    const r = await render({ [DATASHEET]: 404, [PORTRAIT]: 200 });
    expect(r.image).toBe(PORTRAIT);
    expect(r.fetched).toEqual(expect.arrayContaining([`HEAD ${DATASHEET}`, `HEAD ${PORTRAIT}`]));
    expect(r.wikiQueries).not.toContain('Ork Nobz');
    expect(r.card!.style.getPropertyValue('--r-img')).toContain(PORTRAIT);
  });

  it('fiche 404 et portrait 404 : repli sur le portrait du wiki', async () => {
    const r = await render({ [DATASHEET]: 404, [PORTRAIT]: 404 });
    expect(r.fetched).toEqual(expect.arrayContaining([`HEAD ${DATASHEET}`, `HEAD ${PORTRAIT}`]));
    expect(r.wikiQueries).toContain('Ork Nobz');
    expect(r.image).toBe(WIKI);
  });
});
