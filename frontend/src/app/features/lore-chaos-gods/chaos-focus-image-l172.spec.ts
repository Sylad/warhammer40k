// L172 — Panthéon du Chaos : le bouton qui agrandit l'illustration d'un dieu a un nom propre à chaque dieu
// (WCAG 2.4.6, « Voir en grand » était répété 4 fois) et un anneau de focus intérieur de 2 px en or, que le
// `overflow: hidden` du bandeau ne rogne pas (WCAG 1.4.11, il n'en restait qu'un trait de 1 px).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreChaosGodsComponent } from './lore-chaos-gods.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/chaos-gods.json'), 'utf8')) as {
  id: string; name: string;
}[];
const scss = readFileSync(join(__dirname, 'lore-chaos-gods.component.scss'), 'utf8');

async function rendre(): Promise<HTMLElement> {
  await setupTestBed([LoreChaosGodsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ chaosGods$: of(seed) }) },
  ]);
  const f = TestBed.createComponent(LoreChaosGodsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

const regle = (sel: string): string => {
  const m = scss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.:()-]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  expect(m, `règle ${sel}`).not.toBeNull();
  return m![1];
};

describe('Panthéon du Chaos, image d\'en-tête des dieux (L172)', () => {
  it('R1 — chaque bouton d\'illustration s\'appelle « Agrandir l\'illustration de <dieu> », un nom distinct par dieu', async () => {
    const el = await rendre();
    const noms = Array.from(el.querySelectorAll('.god-bg')).map(b => b.getAttribute('aria-label'));
    expect(noms).toEqual(seed.map(g => `Agrandir l’illustration de ${g.name}`));
    expect(new Set(noms).size).toBe(seed.length);
  });

  it('R2 — le focus clavier trace un cadre or de 2 px à l\'intérieur de l\'en-tête, au-dessus du voile, sans passer par l\'opacité du bouton', () => {
    const r = regle('.god-head:has(.god-bg:focus-visible)::after');
    expect(r).toMatch(/inset:\s*0/);
    expect(r).toMatch(/border:\s*2px solid #(c9a24a|f0d276)/i);
    expect(r).toMatch(/pointer-events:\s*none/);
    expect(r).toMatch(/z-index:\s*[2-9]/);
    expect(regle('.god-bg:focus-visible')).toMatch(/outline:\s*none/);
  });

  it('R3 — le bouton reste dans l\'en-tête (inset 0) : l\'anneau est donc entièrement visible dans le cadre', () => {
    expect(regle('.god-bg')).toMatch(/inset:\s*0/);
  });
});
