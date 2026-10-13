// L97 — /factions/<id inconnu> : h1 « Faction introuvable », message, lien vers /factions, plus de « Chargement… ».
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionDetailComponent } from './faction-detail.component';

describe('fiche faction inconnue (L97)', () => {
  it('404 : h1, message, lien /factions, pas de chargement ni de Réessayer', async () => {
    const service = fakeWarhammerService({
      getFaction: () => throwError(() => new HttpErrorResponse({ status: 404 })),
      getUnits: () => of([]),
      getSubFactions: () => of([]),
      videos$: of([]),
      artworks$: of([]),
    });
    await setupTestBed([FactionDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'xxx' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(FactionDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('h1')!.textContent!.trim()).toBe('Faction introuvable');
    expect(el.textContent).toContain('introuvable.');
    expect(el.textContent).not.toContain('Chargement');
    expect(el.querySelector('a[href="/factions"]')).not.toBeNull();
    expect(el.querySelector('button')).toBeNull();
  });

  it('500 : h1 « indisponible » (pas « introuvable ») et bouton Réessayer', async () => {
    const service = fakeWarhammerService({
      getFaction: () => throwError(() => new HttpErrorResponse({ status: 500 })),
      getUnits: () => of([]),
      getSubFactions: () => of([]),
      videos$: of([]),
      artworks$: of([]),
    });
    await setupTestBed([FactionDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'xxx' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(FactionDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('h1')!.textContent!.trim()).toBe('Faction indisponible');
    expect(el.textContent).not.toContain('introuvable');
    expect(el.querySelector('button')).not.toBeNull();
  });
});
