// L170 — Panthéon du Chaos : un raccourci du hero donne aussi le focus clavier à l'article du dieu (WCAG 2.4.3).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreChaosGodsComponent } from './lore-chaos-gods.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/chaos-gods.json'), 'utf8')) as { id: string }[];

afterEach(() => { document.body.innerHTML = ''; history.replaceState(null, '', '/'); });

async function rendre(): Promise<HTMLElement> {
  await setupTestBed([LoreChaosGodsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ chaosGods$: of(seed) }) },
  ]);
  const f = TestBed.createComponent(LoreChaosGodsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  document.body.appendChild(f.nativeElement);
  document.querySelectorAll('article').forEach((a) => { (a as HTMLElement).scrollIntoView = vi.fn(); });
  return f.nativeElement as HTMLElement;
}

describe('Panthéon du Chaos, raccourcis du hero (L170)', () => {
  it('R1 — un clic sur le raccourci d’un dieu donne le focus à son article (tabindex=-1), le Tab suivant part de là', async () => {
    const el = await rendre();
    const liens = Array.from(el.querySelectorAll<HTMLAnchorElement>('.quick-link'));
    expect(liens.length).toBe(seed.length);
    for (const [i, lien] of liens.entries()) {
      const ev = new MouseEvent('click', { cancelable: true, bubbles: true });
      lien.dispatchEvent(ev);
      const article = document.getElementById(seed[i].id)!;
      expect(document.activeElement, seed[i].id).toBe(article);
      expect(article.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('R2 — le href reste « page courante#dieu » (clic du milieu, Ctrl+clic, copier l’adresse)', async () => {
    history.replaceState(null, '', '/lore/chaos');
    const el = await rendre();
    const liens = Array.from(el.querySelectorAll<HTMLAnchorElement>('.quick-link'));
    liens.forEach((l, i) => expect(l.getAttribute('href')).toBe(`/lore/chaos#${seed[i].id}`));
  });

  it('R3 — un Ctrl+clic n’est pas détourné (nouvel onglet natif), aucun focus déplacé', async () => {
    const el = await rendre();
    const ev = new MouseEvent('click', { cancelable: true, bubbles: true, ctrlKey: true });
    el.querySelector('.quick-link')!.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(document.body);
  });
});
