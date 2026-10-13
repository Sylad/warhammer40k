// L112 — fiche sous-faction : 404 → « introuvable », 500 / backend absent → bandeau + Réessayer
// (le corps ne dit plus « introuvable » quand le titre garde « Sous-faction »).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { SubFactionDetailComponent } from './subfaction-detail.component';

const http = (status: number) => new HttpErrorResponse({ status });

async function monter(getSubFaction: () => Observable<unknown>) {
  await setupTestBed([SubFactionDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ getSubFaction, getFaction: () => of(null), getSubFactionSuccessors: () => of([]), getUnits: () => of([]) }) },
    { provide: ActivatedRoute, useValue: { params: of({ id: 'x' }) } },
  ]);
  const f = TestBed.createComponent(SubFactionDetailComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  const el = f.nativeElement as HTMLElement;
  return { el, settle };
}

describe('fiche sous-faction : 404 distincte de 500 (L112)', () => {
  it('404 : « Sous-faction introuvable. », pas de Réessayer', async () => {
    const { el } = await monter(() => throwError(() => http(404)));
    expect(el.textContent).toContain('Sous-faction introuvable.');
    expect(el.querySelector('[role="alert"]')).toBeNull();
  });

  it('500 : bandeau avec Réessayer, jamais « introuvable »', async () => {
    const { el } = await monter(() => throwError(() => http(500)));
    expect(el.textContent).not.toContain('introuvable');
    expect(el.querySelector('[role="alert"] button')).not.toBeNull();
  });

  it('backend absent (status 0) : même bandeau', async () => {
    const { el } = await monter(() => throwError(() => http(0)));
    expect(el.textContent).not.toContain('introuvable');
    expect(el.querySelector('[role="alert"] button')).not.toBeNull();
  });

  it('Réessayer relance la requête et affiche la fiche', async () => {
    let n = 0;
    const sub = { id: 's1', name: 'Ultramarines', factionId: 'f1', type: 'chapter' };
    const { el, settle } = await monter(() => (++n === 1 ? throwError(() => http(500)) : of(sub)));
    (el.querySelector('[role="alert"] button') as HTMLButtonElement).click();
    await settle();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.textContent).toContain('Ultramarines');
  });
});
