// Revue UX L39 — symbole de faction de repli (icône introuvable) : décoratif, masqué aux
// technologies d'assistance.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { UnitDetailComponent } from './unit-detail.component';

describe('fiche unité — symbole de faction (L39)', () => {
  it('le symbole affiché à la place de l’icône est aria-hidden', async () => {
    const service = fakeWarhammerService({
      getUnit: () => of({ id: 'u', factionId: 'orks', nom: 'Boyz', type: 'Infanterie', role: 'r', description: 'd' }),
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const sigil = (f.nativeElement as HTMLElement).querySelector('.hero-sigil')!;
    expect(sigil.textContent!.trim()).toBe('☠');
    expect(sigil.querySelector('[aria-hidden="true"]')?.textContent).toBe('☠');
  });
});
