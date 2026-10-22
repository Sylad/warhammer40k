// L169 (revue UX L11, WCAG 2.1.2, 2.4.3, 4.1.2) — visionneuse du Panthéon du Chaos : un dialogue modal nommé,
// comme celle de la fiche Primarque (L157). Attributs ici ; focus, boucle de Tab et 390 px : chaos-visionneuse-l169.e2e.spec.ts.
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

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/chaos-gods.json'), 'utf8'));
const IMG = 'data:image/svg+xml;base64,PHN2Zy8+';

async function monter() {
  await setupTestBed([LoreChaosGodsComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        chaosGods$: of(seed),
        getWikiImage: (q: string) => of({ imageUrl: `${IMG}#${q}`, pageTitle: null, pageUrl: null }),
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreChaosGodsComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  return { f, el: f.nativeElement as HTMLElement, settle };
}
const dialogue = (el: HTMLElement) => el.querySelector<HTMLElement>('app-figure-lightbox[role="dialog"]');

describe('Panthéon du Chaos — visionneuse en dialogue (L169)', () => {
  it('R1 — fermée, aucun role=dialog ; ouverte par l’illustration d’un dieu, role=dialog, aria-modal et nom accessible', async () => {
    const { el, settle } = await monter();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    el.querySelector<HTMLButtonElement>('.god-bg')!.click();
    await settle();
    const d = dialogue(el)!;
    expect(d).not.toBeNull();
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-label')).toBe(`Visionneuse — ${seed[0].name}`);
  });

  it('R1 — ouverte par un daemon notable, le dialogue porte le nom du daemon ; fermée, il disparaît', async () => {
    const { f, el, settle } = await monter();
    const carte = el.querySelector<HTMLButtonElement>('.notable-card')!;
    carte.click();
    await settle();
    expect(dialogue(el)!.getAttribute('aria-label')).toBe(`Visionneuse — ${seed[0].daemons.notable[0].name}`);
    f.componentInstance.closeLightbox();
    await settle();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('R5 — le composant partagé figure-lightbox reste intact (test scellé L120 R10)', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/shared/components/figure-lightbox/figure-lightbox.component.ts'), 'utf8');
    expect(src).not.toMatch(/role=|aria-modal/);
  });
});
