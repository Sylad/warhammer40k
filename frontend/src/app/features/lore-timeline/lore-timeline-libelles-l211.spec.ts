// L211 — Chronologie : les étiquettes montrent des libellés (jamais l'identifiant brut) sur la liste, le filtre et la fiche ;
// à 390 px la barre d'ères collée tient sur une ligne défilante au lieu de couvrir plus d'un tiers de l'écran.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import * as postcss from 'postcss';
import { WarhammerService } from '../../core/services/warhammer.service';
import { TAG_LABEL, tagLabel } from '../../core/utils/timeline-tags';
import { LoreTimelineComponent } from './lore-timeline.component';
import { TimelineEventDetailComponent } from '../timeline-event-detail/timeline-event-detail.component';

const evenement = {
  id: 'e1', era: 'pre-imperium', title: 'Aube', date: 'M1', shortDescription: 'c', longDescription: 'l',
  tags: ['pre-imperium', 'cosmic', 'necrons'], sources: [],
};

function regle(selecteur: string, media: string | null, prop: string): string {
  const css = postcss.parse(sass.compile(resolve(__dirname, 'lore-timeline.component.scss')).css);
  let valeur = '';
  css.walkRules((r) => {
    const m = r.parent?.type === 'atrule' ? (r.parent as postcss.AtRule).params : null;
    if (m === media && r.selectors.includes(selecteur)) r.walkDecls(prop, (d) => { valeur = d.value; });
  });
  return valeur;
}

describe('Chronologie : libellés et barre d\'ères (L211)', () => {
  it('R1 — chaque étiquette du seed a un libellé (plus de « pre-imperium » ni « cosmic » bruts)', () => {
    const seed = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/timeline-events.json'), 'utf8')) as { tags: string[] }[];
    const sans = [...new Set(seed.flatMap(e => e.tags))].filter(t => !(t in TAG_LABEL));
    expect(sans).toEqual([]);
    expect(tagLabel('cosmic')).not.toBe('cosmic');
    expect(tagLabel('inconnu-x')).toBe('inconnu-x');
  });

  it('R1 — la liste (cartes et filtre) affiche les libellés', async () => {
    await setupTestBed([LoreTimelineComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: fakeWarhammerService({ timelineEvents$: of([evenement]) }) },
    ]);
    const f = TestBed.createComponent(LoreTimelineComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const texte = (f.nativeElement as HTMLElement).textContent!;
    expect(texte).not.toMatch(/pre-imperium|cosmic|necrons/);
    expect(texte).toContain(tagLabel('cosmic'));
  });

  it('R1 — la fiche affiche les libellés des tags', async () => {
    await setupTestBed([TimelineEventDetailComponent], [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'e1' })) } },
      { provide: WarhammerService, useValue: fakeWarhammerService({ getTimelineEvent: () => of(evenement) }) },
    ]);
    const f = TestBed.createComponent(TimelineEventDetailComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const tags = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.tag'), e => e.textContent!.trim());
    expect(tags).toEqual(['pre-imperium', 'cosmic', 'necrons'].map(tagLabel));
  });

  it('R2 — jusqu\'à 760 px la barre d\'ères reste sur une ligne défilante (pas de retour à la ligne)', () => {
    const m = '(max-width: 760px)';
    expect(regle('.era-nav', m, 'flex-wrap')).toBe('nowrap');
    expect(regle('.era-nav', m, 'overflow-x')).toBe('auto');
    expect(regle('.era-pill', m, 'flex-shrink')).toBe('0');
  });
});
