// L38 — API en erreur (404/500, backend absent) : aucune exception à la détection de changements,
// un état d'erreur avec « Réessayer » par page, et la recherche Ctrl+K reste utilisable.
import { setupTestBed } from '../../testing/angular-testbed';
import { fakeWarhammerService } from '../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { WarhammerService } from '../core/services/warhammer.service';
import { CommandPaletteComponent } from './components/command-palette/command-palette.component';
import { LoreSaintsComponent } from '../features/lore-saints/lore-saints.component';
import { SaintDetailComponent } from '../features/saint-detail/saint-detail.component';

const down = () => throwError(() => new Error('500'));

async function monter<T>(type: new () => T, over: Record<string, unknown>, params: Record<string, string> = {}) {
  await setupTestBed([type as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService(over) },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap(params)) } },
  ]);
  const f = TestBed.createComponent(type as never) as ReturnType<typeof TestBed.createComponent<T>>;
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

describe('API en erreur (L38)', () => {
  it('palette Ctrl+K : tous les flux en erreur, rendu sans exception', async () => {
    const f = await monter(CommandPaletteComponent, {
      factions$: down(), primarchs$: down(), saints$: down(), ships$: down(),
      godMachines$: down(), equipment$: down(), timelineEvents$: down(),
    });
    expect(() => { f.detectChanges(); f.detectChanges(); }).not.toThrow();
  });

  it('page de liste : message d’erreur avec Réessayer, et Réessayer relance le chargement', async () => {
    let appels = 0;
    const source = new Observable<unknown[]>((o) => {
      appels++;
      if (appels === 1) o.error(new Error('500'));
      else { o.next([{ id: 's', name: 'Sainte Test', category: 'living-saint', color: '#fff', era: 'M41', ordoOrChapter: 'x' }]); o.complete(); }
    });
    const f = await monter(LoreSaintsComponent, { saints$: source });
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Réessayer');
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    f.detectChanges();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).toContain('Sainte Test');
  });

  it('fiche : 404/500 → message d’erreur, plus « Chargement… » éternel', async () => {
    const f = await monter(SaintDetailComponent, { getSaint: down }, { id: 'x' });
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Chargement du Saint');
  });

  it('fiche : après un échec, la navigation vers une autre fiche du même type recharge', async () => {
    const params = new BehaviorSubject(convertToParamMap({ id: 'a' }));
    await setupTestBed([SaintDetailComponent as never], [
      provideRouter([]),
      { provide: WarhammerService, useValue: fakeWarhammerService({
        getSaint: (id: string) => id === 'a' ? down() : of({ id, name: 'Saint B', category: 'living-saint', color: '#fff', era: 'M41', ordoOrChapter: 'x' }),
      }) },
      { provide: ActivatedRoute, useValue: { paramMap: params } },
    ]);
    const f = TestBed.createComponent(SaintDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[role="alert"]')).not.toBeNull();
    params.next(convertToParamMap({ id: 'b' }));
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).toContain('Saint B');
  });
});
