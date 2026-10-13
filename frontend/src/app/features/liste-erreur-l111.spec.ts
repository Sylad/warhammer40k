// L111 — Équipement et Séries : quand la liste est en échec, le bandeau d'erreur est seul ;
// « Aucune … ne correspond » ne s'affiche que pour une liste chargée, vide après filtrage.
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../core/services/warhammer.service';
import { LoreEquipmentComponent } from './lore-equipment/lore-equipment.component';
import { SeriesComponent } from './series/series.component';

async function rendre(type: new () => unknown, flux: Record<string, unknown>): Promise<HTMLElement> {
  await setupTestBed([type as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(flux) },
  ]);
  const f = TestBed.createComponent(type as never) as { detectChanges(): void; whenStable(): Promise<void>; nativeElement: HTMLElement };
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement;
}

const echec = () => throwError(() => new Error('500'));

describe('listes en erreur (L111)', () => {
  it('Équipement en échec : bandeau d’erreur, pas de « Aucune pièce »', async () => {
    const el = await rendre(LoreEquipmentComponent, { equipment$: echec() });
    expect(el.querySelector('app-load-error')).not.toBeNull();
    expect(el.querySelector('.empty')).toBeNull();
  });
  it('Équipement chargé mais vide : « Aucune pièce » reste affiché', async () => {
    const el = await rendre(LoreEquipmentComponent, { equipment$: of([]) });
    expect(el.querySelector('app-load-error')).toBeNull();
    expect(el.querySelector('.empty')?.textContent).toContain('Aucune pièce');
  });
  it('Séries en échec : bandeau d’erreur, pas de « Aucune série »', async () => {
    const el = await rendre(SeriesComponent, { series$: echec() });
    expect(el.querySelector('app-load-error')).not.toBeNull();
    expect(el.querySelector('.empty')).toBeNull();
  });
  it('Séries chargées mais vides : « Aucune série » reste affiché', async () => {
    const el = await rendre(SeriesComponent, { series$: of([]) });
    expect(el.querySelector('app-load-error')).toBeNull();
    expect(el.querySelector('.empty')?.textContent).toContain('Aucune série');
  });
});
