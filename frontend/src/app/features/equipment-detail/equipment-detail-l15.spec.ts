// L15 (revue UX Lore : équipement, fiche) — les factions liées portent leur nom, pas l'identifiant du seed.
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { EquipmentDetailComponent } from './equipment-detail.component';

async function monter(factions$: unknown) {
  const service = fakeWarhammerService({
    getEquipmentItem: () => of({ id: 'b', name: 'Bolter', type: 'ranged', subCategory: 'bolt',
      factionIds: ['space-marines', 'inconnue'], description: 'd', citation: 'c' }),
    factions$,
  });
  await setupTestBed([EquipmentDetailComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'b' })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(EquipmentDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('Équipement, fiche (L15)', () => {
  it('R1 — « Factions liées » et le bandeau affichent le nom de la faction, l\'identifiant seulement si elle est inconnue', async () => {
    const e = await monter(of([{ id: 'space-marines', nom: 'Space Marines' }]));
    const liens = Array.from(e.querySelectorAll('.row-link .rl-label')).map(x => x.textContent!.trim());
    expect(liens).toEqual(['Space Marines', 'inconnue']);
    expect(e.querySelector('.hero-faction')!.textContent!.trim()).toBe('Space Marines · inconnue');
  });

  it('R2 — la citation n\'a pas de style en ligne : sa mise en italique vient de la feuille de style', async () => {
    const e = await monter(of([]));
    expect(e.querySelector('#citation blockquote')!.getAttribute('style')).toBeNull();
  });
});
