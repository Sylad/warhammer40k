// L38 — « Réessayer » d'une fiche à plusieurs flux relance TOUS les flux de la page : chaque flux
// émet d'abord un échec, puis un succès au second abonnement.
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { WarhammerService } from '../core/services/warhammer.service';
import { FactionDetailComponent } from '../features/faction-detail/faction-detail.component';
import { UnitDetailComponent } from '../features/unit-detail/unit-detail.component';
import { PrimarchDetailComponent } from '../features/primarch-detail/primarch-detail.component';
import { TitanDetailComponent } from '../features/titan-detail/titan-detail.component';
import { LoreEquipmentComponent } from '../features/lore-equipment/lore-equipment.component';

/** Flux qui échoue au 1er abonnement et émet `value` ensuite ; `abonnements()` compte les essais. */
function flaky<T>(value: T) {
  let n = 0;
  const flux = new Observable<T>((o) => {
    n++;
    if (n === 1) o.error(new Error('500'));
    else { o.next(value); o.complete(); }
  });
  return { flux, abonnements: () => n };
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
  const reessayer = async () => {
    ((f.nativeElement as HTMLElement).querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await settle();
  };
  return { f, el: f.nativeElement as HTMLElement, reessayer, instance: f.componentInstance as Record<string, () => unknown> };
}

const faction = { id: 'f1', nom: 'Faction Test', alignement: 'Imperium', description: 'd', symbole: 'x', sousTitre: '', lore: {} };
const unit = { id: 'u1', nom: 'Unité Test', factionId: 'f1', type: 'Infanterie', relatedUnitIds: ['u2'] };
const unit2 = { id: 'u2', nom: 'Unité Liée', factionId: 'f1', type: 'Infanterie' };
const primarch = { id: 'p1', name: 'Primarque Test', relatedPrimarchIds: ['p2'] };
const primarch2 = { id: 'p2', name: 'Primarque Lié' };
const machine = { id: 't1', name: 'Titan Test' };

describe('Réessayer relance tous les flux de la page (L38)', () => {
  it('fiche faction : faction, unités, sous-factions, vidéos, œuvres', async () => {
    const fa = flaky(faction), un = flaky([unit]), sf = flaky([{ id: 's1', nom: 'Sous', type: 'Chapitre' }]);
    const vi = flaky([{ id: 'v1' }]), ar = flaky([{ id: 'a1' }]);
    const { el, reessayer, instance } = await monter(FactionDetailComponent, {
      getFaction: () => fa.flux, getUnits: () => un.flux, getSubFactions: () => sf.flux, videos$: vi.flux, artworks$: ar.flux,
    }, { id: 'f1' });
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    await reessayer();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(instance['faction']()).toBeTruthy();
    expect((instance['units']() as unknown[]).length).toBe(1);
    expect((instance['subFactions']() as unknown[]).length).toBe(1);
    expect((instance['videos']() as unknown[]).length).toBe(1);
    expect((instance['artworks']() as unknown[]).length).toBe(1);
  });

  it('fiche unité : unité, faction, unités liées, œuvres', async () => {
    const un = flaky(unit), fa = flaky(faction), ar = flaky([{ id: 'a1', faction: 'f1' }]), li = flaky(unit2);
    const { el, reessayer, instance } = await monter(UnitDetailComponent, {
      getUnit: (id: string) => id === 'u1' ? un.flux : li.flux, getFaction: () => fa.flux, artworks$: ar.flux,
    }, { id: 'u1' });
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    // `un` ne rate qu'au 1er abonnement (unit) : les unités liées échouent sur leur propre flux (u2).
    expect(li.abonnements()).toBe(1);
    expect((instance['relatedUnits']() as unknown[]).length).toBe(0);
    await reessayer();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(instance['unit']()).toBeTruthy();
    expect(instance['faction']()).toBeTruthy();
    expect((instance['relatedUnits']() as unknown[]).length).toBe(1);
    expect((instance['allArtworks']() as unknown[]).length).toBe(1);
  });

  it('fiche unité : la faction en échec affiche l’erreur, plus « Chargement de la faction… » sans fin', async () => {
    const fa = flaky(faction);
    const { el, reessayer, instance } = await monter(UnitDetailComponent, {
      getUnit: () => of(unit), getFaction: () => fa.flux,
    }, { id: 'u1' });
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Chargement de la faction');
    await reessayer();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(instance['faction']()).toBeTruthy();
  });

  it('fiche primarque : primarque et apparentés', async () => {
    const pr = flaky(primarch), p2 = flaky(primarch2);
    const { el, reessayer, instance } = await monter(PrimarchDetailComponent, {
      getPrimarch: (id: string) => id === 'p1' ? pr.flux : p2.flux,
    }, { id: 'p1' });
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    await reessayer();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(instance['primarch']()).toBeTruthy();
    expect((instance['related']() as unknown[]).length).toBe(1);
  });

  it('fiche titan : dieu-machine et factions', async () => {
    const ma = flaky(machine), fa = flaky([faction]);
    const { el, reessayer, instance } = await monter(TitanDetailComponent, {
      getGodMachine: () => ma.flux, factions$: fa.flux,
    }, { id: 't1' });
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    await reessayer();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(instance['machine']()).toBeTruthy();
    expect((instance['factionIds']() as Set<string>).has('f1')).toBe(true);
  });

  it('Équipement : objets et factions', async () => {
    const eq = flaky([{ id: 'e1', name: 'Arme', type: 'weapon', subCategory: 'bolter', factionIds: ['f1'] }]), fa = flaky([faction]);
    const { el, reessayer, instance } = await monter(LoreEquipmentComponent, {
      equipment$: eq.flux, factions$: fa.flux,
    });
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    await reessayer();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect((instance['items']() as unknown[]).length).toBe(1);
    expect((instance['factions']() as unknown[]).length).toBe(1);
  });
});
