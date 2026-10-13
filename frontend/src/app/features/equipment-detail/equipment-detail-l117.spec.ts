import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { EquipmentDetailComponent } from './equipment-detail.component';

describe('fiche équipement (L117)', () => {
  it('la sous-catégorie est le libellé traduit, comme dans la palette Ctrl+K', async () => {
    const service = fakeWarhammerService({
      getEquipmentItem: () => of({ id: 'drachnyen', name: "Drach'nyen", type: 'weapon', subCategory: 'daemon-weapon', factionIds: [] }),
    });
    await setupTestBed([EquipmentDetailComponent as never], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'drachnyen' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(EquipmentDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const texte = (f.nativeElement as HTMLElement).textContent!;
    expect(texte).toContain('Daemon weapon');
    expect(texte).not.toContain('daemon-weapon');
  });
});
