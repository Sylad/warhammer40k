// L97 — chaque fiche, sur une 404, a son h1 « X introuvable » et un lien vers SA liste ; sur une
// 500, un h1 « X indisponible » et « Réessayer ». Une faute dans un backLink ou un titre perdu
// sur l'une des sept fiches ci-dessous fait échouer ce test (faction : faction-introuvable.spec.ts ; sous-faction :
// subfaction-detail.erreur.spec.ts).
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { WarhammerService } from '../core/services/warhammer.service';
import { UnitDetailComponent } from './unit-detail/unit-detail.component';
import { PrimarchDetailComponent } from './primarch-detail/primarch-detail.component';
import { SaintDetailComponent } from './saint-detail/saint-detail.component';
import { ShipDetailComponent } from './ship-detail/ship-detail.component';
import { TitanDetailComponent } from './titan-detail/titan-detail.component';
import { TimelineEventDetailComponent } from './timeline-event-detail/timeline-event-detail.component';
import { EquipmentDetailComponent } from './equipment-detail/equipment-detail.component';

const FICHES: [string, unknown, string, string, string, string][] = [
  // nom, composant, méthode du service, titre de base, lien de la liste, libellé du lien
  ['unité', UnitDetailComponent, 'getUnit', 'Unité', '/factions', 'Toutes les factions'],
  ['primarque', PrimarchDetailComponent, 'getPrimarch', 'Primarque', '/lore/primarchs', 'Tous les Primarques'],
  ['saint', SaintDetailComponent, 'getSaint', 'Saint', '/lore/saints', 'Tous les saints'],
  ['vaisseau', ShipDetailComponent, 'getShip', 'Vaisseau', '/lore/ships', 'Tous les vaisseaux'],
  ['titan', TitanDetailComponent, 'getGodMachine', 'Machine', '/lore/titans', 'Toutes les machines'],
  ['chronologie', TimelineEventDetailComponent, 'getTimelineEvent', 'Événement', '/lore/timeline', 'Toute la chronologie'],
  ['équipement', EquipmentDetailComponent, 'getEquipmentItem', 'Équipement', '/lore/equipment', 'Tout l’équipement'],
];

async function monter(component: unknown, methode: string, status: number): Promise<HTMLElement> {
  const service = fakeWarhammerService({ [methode]: () => throwError(() => new HttpErrorResponse({ status })) });
  await setupTestBed([component as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of_(convertToParamMap({ id: 'n-existe-pas' })), snapshot: { fragment: null } } },
  ]);
  globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
  const f = TestBed.createComponent(component as never) as { detectChanges(): void; whenStable(): Promise<void>; nativeElement: HTMLElement };
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement;
}
import { of as of_ } from 'rxjs';

describe('fiches introuvables ou indisponibles (L97)', () => {
  it.each(FICHES)('%s : 404 → h1 « introuvable » et lien vers la liste, sans Réessayer', async (_n, c, m, base, lien, libelle) => {
    const el = await monter(c, m, 404);
    expect(el.querySelector('h1')!.textContent!.trim()).toBe(`${base} introuvable`);
    const a = el.querySelector(`app-load-error a[href="${lien}"]`);
    expect(a?.textContent?.trim()).toBe(libelle);
    expect(el.querySelector('app-load-error button')).toBeNull();
  });

  it.each(FICHES)('%s : 500 → h1 « indisponible » et Réessayer', async (_n, c, m, base) => {
    const el = await monter(c, m, 500);
    expect(el.querySelector('h1')!.textContent!.trim()).toBe(`${base} indisponible`);
    expect(el.querySelector('app-load-error button')).not.toBeNull();
  });
});
