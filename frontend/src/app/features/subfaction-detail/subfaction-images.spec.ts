// L114 — fiche sous-faction : chaque image distincte n'est demandée qu'une fois par chargement
// (l'effect() relisait unitImgCache() et se relançait à chaque réponse : 28 à ~170 appels /api/wiki-image).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { SubFactionDetailComponent } from './subfaction-detail.component';

describe('fiche sous-faction : une requête par image distincte (L114)', () => {
  it('chaque requête wiki-image n\'est émise qu\'une fois', async () => {
    const queries: string[] = [];
    const sub = {
      id: 's1', name: 'Ultramarines', factionId: 'f1', type: 'chapter', unitIds: ['u1', 'u2', 'u3'],
      notableUnits: [{ name: 'Calgar' }, { name: 'Sicarius' }, { name: 'Tigurius' }],
    };
    const units = ['u1', 'u2', 'u3'].map(id => ({ id, nom: `Unité ${id}` }));
    await setupTestBed([SubFactionDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: fakeWarhammerService({
        getSubFaction: () => of(sub), getFaction: () => of(null), getSubFactionSuccessors: () => of([]),
        getUnits: () => of(units),
        getWikiImage: (q: string) => { queries.push(q); return of({ imageUrl: `/img/${q}.jpg` }); },
      }) },
      { provide: ActivatedRoute, useValue: { params: of({ id: 's1' }) } },
    ]);
    const f = TestBed.createComponent(SubFactionDetailComponent);
    for (let i = 0; i < 4; i++) { f.detectChanges(); await f.whenStable(); }
    expect(queries.length).toBeGreaterThan(0);
    expect(queries.length).toBe(new Set(queries).size);
    expect(queries.length).toBe(7); // héros + 3 notables + 3 unités
  });
});
