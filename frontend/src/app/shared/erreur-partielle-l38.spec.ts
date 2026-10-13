// L38 (reprise) — une 404 n'est pas une 500 : « introuvable » sans Réessayer, titre de page intact
// sur une 500 ; et un flux secondaire en échec est signalé (bandeau + Réessayer) sur la fiche.
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { WarhammerService } from '../core/services/warhammer.service';
import { PageTitleService, namedPage } from '../core/services/page-title.service';
import { FactionDetailComponent } from '../features/faction-detail/faction-detail.component';
import { UnitDetailComponent } from '../features/unit-detail/unit-detail.component';
import { PrimarchDetailComponent } from '../features/primarch-detail/primarch-detail.component';
import { TitanDetailComponent } from '../features/titan-detail/titan-detail.component';

const http = (status: number) => new HttpErrorResponse({ status });

function flaky<T>(value: T) {
  let n = 0;
  return new Observable<T>((o) => {
    n++;
    if (n === 1) o.error(http(500));
    else { o.next(value); o.complete(); }
  });
}

async function monter<T>(type: new () => T, over: Record<string, unknown>, params: Record<string, string> = {}) {
  await setupTestBed([type as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(over) },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(params)) } },
  ]);
  const f = TestBed.createComponent(type as never) as ReturnType<typeof TestBed.createComponent<T>>;
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  const el = f.nativeElement as HTMLElement;
  const reessayer = async () => { (el.querySelector('[role="alert"] button') as HTMLButtonElement).click(); await settle(); };
  return { el, reessayer };
}

const faction = { id: 'f1', nom: 'Faction Test', alignement: 'Imperium', description: 'd', symbole: 'x', sousTitre: '', lore: {} };
const unit = { id: 'u1', nom: 'Unité Test', factionId: 'f1', type: 'Infanterie', relatedUnitIds: ['u2'] };
const primarch = { id: 'p1', name: 'Primarque Test', relatedPrimarchIds: ['p2'] };
const machine = { id: 't1', name: 'Titan Test' };

describe('404 distincte de 500 (L38)', () => {
  it('fiche faction en 404 : « introuvable », pas de Réessayer, pas de « vérifiez la connexion »', async () => {
    const { el } = await monter(FactionDetailComponent, { getFaction: () => throwError(() => http(404)), getUnits: () => of([]), getSubFactions: () => of([]) }, { id: 'x' });
    const alerte = el.querySelector('[role="alert"]') as HTMLElement;
    expect(alerte.textContent).toContain('introuvable');
    expect(alerte.textContent).not.toContain('connexion');
    expect(alerte.querySelector('button')).toBeNull();
  });

  it('fiche faction en 500 : Réessayer reste proposé', async () => {
    const { el } = await monter(FactionDetailComponent, { getFaction: () => throwError(() => http(500)), getUnits: () => of([]), getSubFactions: () => of([]) }, { id: 'x' });
    const alerte = el.querySelector('[role="alert"]') as HTMLElement;
    expect(alerte.textContent).toContain('connexion');
    expect(alerte.querySelector('button')).not.toBeNull();
  });

  it('titre : « introuvable » seulement sur une 404, le libellé du type reste sur une 500', async () => {
    await setupTestBed([], [provideRouter([])]);
    const pages = TestBed.inject(PageTitleService);
    pages.navigated('/factions/x', 'Faction');
    throwError(() => http(500)).pipe(namedPage(pages, () => 'n')).subscribe({ error: () => undefined });
    expect(pages.pageName()).toBe('Faction');
    throwError(() => http(404)).pipe(namedPage(pages, () => 'n')).subscribe({ error: () => undefined });
    expect(pages.pageName()).toBe('Faction introuvable');
  });
});

describe('flux secondaire en échec signalé (L38)', () => {
  const partiel = (el: HTMLElement) => el.querySelector('[role="alert"]');

  it('faction : unités en 500 → bandeau, Réessayer le retire', async () => {
    const un = flaky([unit]);
    const { el, reessayer } = await monter(FactionDetailComponent, { getFaction: () => of(faction), getUnits: () => un, getSubFactions: () => of([]) }, { id: 'f1' });
    expect(el.textContent).toContain('Faction Test');
    expect(partiel(el)).not.toBeNull();
    await reessayer();
    expect(partiel(el)).toBeNull();
  });

  it('unité : unités liées en 500 → bandeau, Réessayer le retire', async () => {
    const li = flaky({ id: 'u2', nom: 'Liée', factionId: 'f1', type: 'Infanterie' });
    const { el, reessayer } = await monter(UnitDetailComponent, {
      getUnit: (id: string) => id === 'u1' ? of(unit) : li, getFaction: () => of(faction),
    }, { id: 'u1' });
    expect(el.textContent).toContain('Unité Test');
    expect(partiel(el)).not.toBeNull();
    await reessayer();
    expect(partiel(el)).toBeNull();
  });

  it('primarque : apparentés en 500 → bandeau, Réessayer le retire', async () => {
    const p2 = flaky({ id: 'p2', name: 'Lié' });
    const { el, reessayer } = await monter(PrimarchDetailComponent, {
      getPrimarch: (id: string) => id === 'p1' ? of(primarch) : p2,
    }, { id: 'p1' });
    expect(el.textContent).toContain('Primarque Test');
    expect(partiel(el)).not.toBeNull();
    await reessayer();
    expect(partiel(el)).toBeNull();
  });

  it('titan : factions en 500 → bandeau, Réessayer le retire', async () => {
    const fa = flaky([faction]);
    const { el, reessayer } = await monter(TitanDetailComponent, { getGodMachine: () => of(machine), factions$: fa }, { id: 't1' });
    expect(el.textContent).toContain('Titan Test');
    expect(partiel(el)).not.toBeNull();
    await reessayer();
    expect(partiel(el)).toBeNull();
  });
});
