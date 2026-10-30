// L43 — un libellé de lien dit où il mène : « Faction · Collegia Titanica » et « Faction · Death Guard »
// menaient à la fiche d'Adeptus Mechanicus et de Chaos Space Marines ; « Voir la Légion Death Guard »
// menait à la faction Chaos Space Marines au lieu de la sous-faction Death Guard.
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { WarhammerService } from '../core/services/warhammer.service';
import { TitanDetailComponent } from './titan-detail/titan-detail.component';
import { ShipDetailComponent } from './ship-detail/ship-detail.component';
import { PrimarchDetailComponent } from './primarch-detail/primarch-detail.component';

const FACTIONS = [{ id: 'adeptus-mechanicus', nom: 'Adeptus Mechanicus' }, { id: 'chaos-space-marines', nom: 'Chaos Space Marines' }];

async function monter(component: unknown, overrides: Record<string, unknown>, id: string): Promise<HTMLElement> {
  const service = fakeWarhammerService({ factions$: of(FACTIONS), ...overrides });
  await setupTestBed([component as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(component as never) as { detectChanges(): void; whenStable(): Promise<unknown>; nativeElement: HTMLElement };
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement;
}

const titan = (factionId: string, factionName: string) => ({
  id: 'm', name: 'Machine', category: 'titan', scoutClass: 'c', size: 's', factionId, factionName,
  color: '#fff', wikiQuery: 'q', description: 'd',
});
const ship = (factionId: string, factionName: string) => ({
  id: 's', name: 'Vaisseau', class: 'c', factionId, factionName, color: '#fff', currentStatus: 'Actif', description: 'd',
});
const primarch = (extra: Record<string, unknown>) => ({
  id: 'mortarion', number: 14, name: 'Mortarion', legion: 'Death Guard', legionId: 'chaos-space-marines',
  allegiance: 'traitor', status: 'alive', statusDetail: '', description: 'd', ...extra,
});

describe('libellés de liens exacts (L43)', () => {
  it('R1 — fiche Dieu-Machine : le lien nomme la faction qu\'il ouvre, pas la sous-organisation', async () => {
    const el = await monter(TitanDetailComponent, { getGodMachine: () => of(titan('adeptus-mechanicus', 'Collegia Titanica')) }, 'm');
    const lien = el.querySelector('a.row-link')!;
    expect(lien.getAttribute('href')).toBe('/factions/adeptus-mechanicus');
    expect(lien.textContent).toContain('Faction · Adeptus Mechanicus');
    expect(lien.textContent).not.toContain('Collegia');
    expect(el.querySelector('.info-row')!.parentElement!.textContent).toContain('Collegia Titanica');
  });

  it('R2 — fiche vaisseau : le lien nomme la faction (« Death Guard » → Chaos Space Marines)', async () => {
    const el = await monter(ShipDetailComponent, { getShip: () => of(ship('chaos-space-marines', 'Death Guard')) }, 's');
    const lien = el.querySelector('a.row-link')!;
    expect(lien.getAttribute('href')).toBe('/factions/chaos-space-marines');
    expect(lien.textContent).toContain('Faction · Chaos Space Marines');
  });

  it('R3 — faction absente de la liste : le lien garde le nom de la fiche', async () => {
    const el = await monter(ShipDetailComponent, { getShip: () => of(ship('tau', 'Tau Empire')), factions$: of([]) }, 's');
    expect(el.querySelector('a.row-link')!.textContent).toContain('Faction · Tau Empire');
  });

  it('R4 — fiche Primarque : « Voir la Légion » mène à la sous-faction de la Légion', async () => {
    const el = await monter(PrimarchDetailComponent,
      { getPrimarch: () => of(primarch({ subFactionId: 'death-guard' })) }, 'mortarion');
    const lien = [...el.querySelectorAll<HTMLAnchorElement>('a.row-link')].find(a => a.textContent!.includes('Voir la Légion'))!;
    expect(lien.getAttribute('href')).toBe('/subfactions/death-guard');
    expect(lien.textContent).toContain('Voir la Légion Death Guard');
  });

  it('R5 — Primarque sans sous-faction connue : aucun lien vers la faction générique', async () => {
    const el = await monter(PrimarchDetailComponent, { getPrimarch: () => of(primarch({})) }, 'mortarion');
    expect([...el.querySelectorAll('a.row-link')].some(a => a.textContent!.includes('Voir la Légion'))).toBe(false);
    expect(el.querySelector('a[href="/factions/chaos-space-marines"]')).toBeNull();
  });

  it('R6 — le libellé de « Voir la Légion » nomme la sous-faction ouverte (Horus → Black Legion)', async () => {
    const el = await monter(PrimarchDetailComponent, {
      getPrimarch: () => of(primarch({ id: 'horus', name: 'Horus Lupercal', legion: 'Sons of Horus (ex-Luna Wolves)', subFactionId: 'black-legion' })),
      getSubFaction: () => of({ id: 'black-legion', name: 'Black Legion' }),
    }, 'horus');
    const lien = [...el.querySelectorAll<HTMLAnchorElement>('a.row-link')].find(a => a.textContent!.includes('Voir la Légion'))!;
    expect(lien.getAttribute('href')).toBe('/subfactions/black-legion');
    expect(lien.textContent).toContain('Voir la Légion Black Legion');
    expect(lien.textContent).not.toContain('Sons of Horus');
  });
});
