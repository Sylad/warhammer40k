// L160 — Chronologie : la section d'une ère atteinte par une pastille s'arrête SOUS le bandeau du haut et
// SOUS la barre d'ères collée (hauteur variable : les pastilles passent à la ligne), sinon son titre,
// qui vient de recevoir le focus, reste caché (WCAG 2.4.11).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import * as postcss from 'postcss';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreTimelineComponent } from './lore-timeline.component';

const evenement = { id: 'e1', era: 'horus-heresy', titre: 'Siège', tags: [] };

afterEach(() => vi.useRealTimers());

describe('Chronologie : ancres des ères (L160)', () => {
  it('R1 — le clic sur une pastille mesure la barre d\'ères et réserve sa hauteur au-dessus de la section', async () => {
    vi.useFakeTimers();
    await setupTestBed([LoreTimelineComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: fakeWarhammerService({ timelineEvents$: of([evenement]) }) },
    ]);
    const f = TestBed.createComponent(LoreTimelineComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const barre = el.querySelector<HTMLElement>('.era-nav')!;
    Object.defineProperty(barre, 'offsetHeight', { value: 109, configurable: true });
    const section = el.querySelector<HTMLElement>('#era-horus-heresy')!;
    section.scrollIntoView = vi.fn();
    const pastille = [...el.querySelectorAll<HTMLButtonElement>('.era-pill')].find((b) => b.textContent?.includes('Hérésie'))!;
    pastille.click();
    vi.advanceTimersByTime(60);
    expect(el.style.getPropertyValue('--era-nav-h')).toBe('109px');
    expect(document.activeElement).toBe(section);
  });

  it('R1 — la section d\'ère ajoute la hauteur de la barre d\'ères à sa marge de défilement', () => {
    const css = postcss.parse(sass.compile(resolve(__dirname, 'lore-timeline.component.scss')).css);
    let marge = '';
    css.walkRules((r) => {
      if (r.selectors.includes('.era-section')) r.walkDecls('scroll-margin-top', (d) => { marge = d.value; });
    });
    // html (styles.scss) pose déjà scroll-padding-top = bandeau + 8 px : la marge ajoute la barre + 4 px.
    expect(marge).toMatch(/var\(--era-nav-h/);
  });
});
