// L115 — listes Lore en erreur : aucun compteur (bandeau, onglets) ne s'affiche comme « 0 » tant que
// la source est en échec ; « — » à la place. Une fois la source revenue, les vrais nombres.
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { WarhammerService } from '../core/services/warhammer.service';
import { compteur } from './safe-signal';
import { LoreEquipmentComponent } from '../features/lore-equipment/lore-equipment.component';
import { LoreCiviliansComponent } from '../features/lore-civilians/lore-civilians.component';
import { LoreConceptsComponent } from '../features/lore-concepts/lore-concepts.component';
import { LorePrimarchsComponent } from '../features/lore-primarchs/lore-primarchs.component';
import { LoreSaintsComponent } from '../features/lore-saints/lore-saints.component';
import { LoreShipsComponent } from '../features/lore-ships/lore-ships.component';
import { LoreTimelineComponent } from '../features/lore-timeline/lore-timeline.component';
import { LoreTitansComponent } from '../features/lore-titans/lore-titans.component';

const http500 = () => new HttpErrorResponse({ status: 500 });

function flaky<T>(value: T) {
  let n = 0;
  return new Observable<T>((o) => {
    n++;
    if (n === 1) o.error(http500());
    else { o.next(value); o.complete(); }
  });
}

async function monter<T>(type: new () => T, over: Record<string, unknown>) {
  await setupTestBed([type as never], [provideRouter([]), { provide: WarhammerService, useValue: fakeWarhammerService(over) }]);
  const f = TestBed.createComponent(type as never) as ReturnType<typeof TestBed.createComponent<T>>;
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  const el = f.nativeElement as HTMLElement;
  const reessayer = async () => { (el.querySelector('[role="alert"] button') as HTMLButtonElement).click(); await settle(); };
  return { el, reessayer };
}

/** Texte des compteurs : cartes du bandeau + boutons d'onglets. */
const valeurs = (el: HTMLElement) =>
  [...el.querySelectorAll('.counter strong, .filter, .filters button, .pill-count')].map((n) => (n.textContent ?? '').replace(/\s+/g, ' ').trim());
const zeroTrompeur = (v: string) => v === '0' || /· 0$/.test(v);

describe('compteur()', () => {
  it('« — » en échec, le nombre sinon', () => {
    expect(compteur(0, true)).toBe('—');
    expect(compteur(7, true)).toBe('—');
    expect(compteur(0, false)).toBe('0');
    expect(compteur(12, false)).toBe('12');
  });
});

const cas: [string, new () => unknown, string][] = [
  ['équipement', LoreEquipmentComponent, 'equipment$'],
  ['organisations', LoreCiviliansComponent, 'imperialOrgs$'],
  ['concepts', LoreConceptsComponent, 'loreConcepts$'],
  ['primarques', LorePrimarchsComponent, 'primarchs$'],
  ['saints', LoreSaintsComponent, 'saints$'],
  ['vaisseaux', LoreShipsComponent, 'ships$'],
  ['dieux-machines', LoreTitansComponent, 'godMachines$'],
  ['chronologie', LoreTimelineComponent, 'timelineEvents$'],
];

describe('compteurs des listes Lore en erreur (L115)', () => {
  for (const [nom, type, flux] of cas) {
    it(`${nom} : source en 500 → « — », jamais « 0 »`, async () => {
      const { el } = await monter(type, { [flux]: throwError(() => http500()) });
      const v = valeurs(el);
      expect(v.length).toBeGreaterThan(0);
      expect(v.filter(zeroTrompeur)).toEqual([]);
      expect(v.some((t) => t === '—' || t.endsWith('· —'))).toBe(true);
    });

    it(`${nom} : Réessayer ramène les vrais nombres`, async () => {
      const { el, reessayer } = await monter(type, { [flux]: flaky([]) });
      expect(valeurs(el).some((t) => t === '—' || t.endsWith('· —'))).toBe(true);
      await reessayer();
      expect(valeurs(el).some((t) => t.includes('—'))).toBe(false);
    });
  }

  it('équipement : factions en échec seules → compteurs d\'équipement intacts', async () => {
    const eq = [{ id: 'e1', name: 'Bolter', type: 'ranged', subCategory: 'x', description: 'd', factionIds: [], loreLong: '' }];
    const { el } = await monter(LoreEquipmentComponent, { equipment$: of(eq), factions$: throwError(() => http500()) });
    expect(valeurs(el)).toContain('1');
  });
});
