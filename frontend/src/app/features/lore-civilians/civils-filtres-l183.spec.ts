// L183 — Civils Impériaux, filtres : le filtre actif est annoncé (aria-pressed, WCAG 4.1.2), pas seulement coloré.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { contraste } from '../../core/utils/teinte-lisible';
import { LoreCiviliansComponent } from './lore-civilians.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/imperial-orgs.json'), 'utf8')) as {
  id: string; color: string; notableFigures: { name: string }[];
}[];

async function monter() {
  await setupTestBed([LoreCiviliansComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        imperialOrgs$: of(seed),
        getWikiImage: () => of({ imageUrl: 'http://img/x.jpg', pageTitle: null, pageUrl: null }),
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreCiviliansComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

const boutons = (f: Awaited<ReturnType<typeof monter>>) =>
  Array.from((f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('section.filters button.filter'));
const pressed = (f: Awaited<ReturnType<typeof monter>>) => boutons(f).map(b => b.getAttribute('aria-pressed'));

describe('Civils Impériaux, filtres (L183)', () => {
  it('R1 — les 7 boutons de filtre portent aria-pressed, « Toutes » à true au départ et les six catégories à false', async () => {
    const f = await monter();
    expect(pressed(f)).toEqual(['true', 'false', 'false', 'false', 'false', 'false', 'false']);
  });

  it('R2 — un clic sur une catégorie la met à true et « Toutes » à false : un seul bouton pressé', async () => {
    const f = await monter();
    boutons(f)[3].click();
    f.detectChanges();
    expect(pressed(f)).toEqual(['false', 'false', 'false', 'true', 'false', 'false', 'false']);
    boutons(f)[0].click();
    f.detectChanges();
    expect(pressed(f)).toEqual(['true', 'false', 'false', 'false', 'false', 'false', 'false']);
  });

  it('R3 — chaque bouton est un type="button" et aria-pressed suit la classe active', async () => {
    const f = await monter();
    boutons(f).forEach(b => expect(b.type).toBe('button'));
    boutons(f)[2].click();
    f.detectChanges();
    boutons(f).forEach(b => expect(b.getAttribute('aria-pressed') === 'true').toBe(b.classList.contains('active')));
  });
});
