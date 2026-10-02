// L39 — un primarque « apparenté » absent des données (Mortarion → « typhus », qui n'est pas un
// primarque, en prod) faisait échouer TOUTE la section : forkJoin propage la 404, la page restait
// sans ses fiches liées et la console affichait une erreur. Un identifiant inconnu est ignoré.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { PrimarchDetailComponent } from './primarch-detail.component';

const P = (id: string, extra: Record<string, unknown> = {}) => ({
  id, number: 1, name: id.toUpperCase(), legion: 'L', legionId: 'chaos-space-marines', allegiance: 'traitor',
  status: 'alive', description: 'd', ...extra,
});
const DATA: Record<string, unknown> = {
  mortarion: P('mortarion', { relatedPrimarchIds: ['typhus', 'horus', 'magnus'] }),
  horus: P('horus'),
  magnus: P('magnus'),
};

describe('fiche Primarque — primarques apparentés (L39)', () => {
  it('un identifiant inconnu est ignoré, les autres fiches liées s’affichent', async () => {
    const service = fakeWarhammerService({
      getPrimarch: (id: string) => (DATA[id] ? of(DATA[id]) : throwError(() => new HttpErrorResponse({ status: 404 }))),
    });
    await setupTestBed([PrimarchDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'mortarion' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(PrimarchDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const related = [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a.related')];
    expect(related.map((a) => a.getAttribute('href'))).toEqual(['/lore/primarchs/horus', '/lore/primarchs/magnus']);
  });
});
