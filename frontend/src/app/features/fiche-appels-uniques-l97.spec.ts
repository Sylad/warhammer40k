// L97 — une fiche n'appelle son API qu'une fois par affichage : la faction et les unités liées
// d'une unité se déduisent de l'unité déjà chargée, au lieu de rappeler getUnit (3 requêtes).
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../core/services/warhammer.service';
import { UnitDetailComponent } from './unit-detail/unit-detail.component';
import { PrimarchDetailComponent } from './primarch-detail/primarch-detail.component';

async function monter(component: unknown, id: string, overrides: Record<string, unknown>) {
  await setupTestBed([component as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(overrides) },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })), snapshot: { fragment: null } } },
  ]);
  globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
  const f = TestBed.createComponent(component as never) as { detectChanges(): void; whenStable(): Promise<void> };
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
}

const notFound = () => throwError(() => new HttpErrorResponse({ status: 404 }));

describe('fiches — un seul appel API par affichage (L97)', () => {
  it.each([
    ['unité valide', 'u', () => of({ id: 'u', factionId: 'orks', nom: 'Boyz', type: 'Infanterie', role: 'r', description: 'd' })],
    ['unité inconnue', 'x', notFound],
  ])('%s : getUnit appelé une fois', async (_n, id, getUnit) => {
    const appels: string[] = [];
    await monter(UnitDetailComponent, id, {
      getUnit: (i: string) => { appels.push(i); return getUnit(); },
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
    });
    expect(appels).toEqual([id]);
  });

  it.each([
    ['primarque valide', 'p', () => of({ id: 'p', number: 1, name: 'P', legion: 'L', legionId: 'l', allegiance: 'loyalist', status: 'alive', description: 'd' })],
    ['primarque inconnu', 'x', notFound],
  ])('%s : getPrimarch appelé une fois', async (_n, id, getPrimarch) => {
    const appels: string[] = [];
    await monter(PrimarchDetailComponent, id, { getPrimarch: (i: string) => { appels.push(i); return getPrimarch(); } });
    expect(appels).toEqual([id]);
  });
});
