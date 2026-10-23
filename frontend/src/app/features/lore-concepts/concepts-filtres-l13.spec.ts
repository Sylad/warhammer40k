// L13 (revue UX Lore : concepts, WCAG 4.1.2) — le filtre actif est annoncé (aria-pressed), pas seulement coloré.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreConceptsComponent } from './lore-concepts.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/lore-concepts.json'), 'utf8'));

async function monter() {
  await setupTestBed([LoreConceptsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      loreConcepts$: of(seed),
      getWikiImage: () => of({ imageUrl: 'http://img/x.jpg', pageTitle: null, pageUrl: null }),
    }) },
  ]);
  const f = TestBed.createComponent(LoreConceptsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
const boutons = (f: Awaited<ReturnType<typeof monter>>) =>
  Array.from((f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('section.filters button.filter'));
const pressed = (f: Awaited<ReturnType<typeof monter>>) => boutons(f).map(b => b.getAttribute('aria-pressed'));

describe('Concepts, filtres (L13)', () => {
  it('R1 — les 5 boutons de filtre portent aria-pressed, « Tous » à true au départ', async () => {
    expect(pressed(await monter())).toEqual(['true', 'false', 'false', 'false', 'false']);
  });

  it('R2 — un clic sur une catégorie la met à true et « Tous » à false : un seul bouton pressé', async () => {
    const f = await monter();
    boutons(f)[2].click();
    f.detectChanges();
    expect(pressed(f)).toEqual(['false', 'false', 'true', 'false', 'false']);
  });

  it('R3 — chaque bouton est un type="button" et aria-pressed suit la classe active', async () => {
    const f = await monter();
    boutons(f).forEach(b => expect(b.type).toBe('button'));
    boutons(f)[4].click();
    f.detectChanges();
    boutons(f).forEach(b => expect(b.getAttribute('aria-pressed') === 'true').toBe(b.classList.contains('active')));
  });
});
