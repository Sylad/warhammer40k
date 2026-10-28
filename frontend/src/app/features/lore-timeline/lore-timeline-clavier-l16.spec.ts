// L16 — Chronologie : une carte d'événement se déplie au clavier (WCAG 2.1.1) ; le titre porte un vrai bouton.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreTimelineComponent } from './lore-timeline.component';

const evenement = { id: 'e1', era: 'horus-heresy', titre: 'Siège', title: 'Siège', tags: [], sources: [] };

async function monter() {
  await setupTestBed([LoreTimelineComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ timelineEvents$: of([evenement]) }) },
  ]);
  const f = TestBed.createComponent(LoreTimelineComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

describe('Chronologie : cartes au clavier (L16)', () => {
  it('R1 — le titre de chaque carte est un bouton focusable qui annonce l\'état déplié', async () => {
    const f = await monter();
    const el = f.nativeElement as HTMLElement;
    const bouton = el.querySelector<HTMLButtonElement>('.t-card h3 button.t-card-toggle')!;
    expect(bouton).toBeTruthy();
    expect(bouton.tabIndex).toBe(0);
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.t-card')!.hasAttribute('aria-expanded')).toBe(false);
  });

  it('R1 — activer le bouton déplie la carte (lien vers la fiche atteignable) puis la replie', async () => {
    const f = await monter();
    const el = f.nativeElement as HTMLElement;
    const bouton = el.querySelector<HTMLButtonElement>('.t-card-toggle')!;
    expect(el.querySelector('a.t-fiche-link')).toBeNull();
    bouton.click();
    f.detectChanges();
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('a.t-fiche-link')).toBeTruthy();
    bouton.click();
    f.detectChanges();
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('a.t-fiche-link')).toBeNull();
  });
});
