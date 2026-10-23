// L181 (revue UX L12, WCAG 2.1.2, 2.4.3, 4.1.2) — visionneuse des Civils Impériaux : un dialogue modal nommé, comme
// celle du Panthéon du Chaos (L169). Attributs ici ; focus, boucle de Tab, retour du focus et 390/320 px :
// civils-visionneuse-l181.e2e.spec.ts.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreCiviliansComponent } from './lore-civilians.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/imperial-orgs.json'), 'utf8'));
const IMG = 'data:image/svg+xml;base64,PHN2Zy8+';

async function monter() {
  await setupTestBed([LoreCiviliansComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        imperialOrgs$: of(seed),
        getWikiImage: (q: string) => of({ imageUrl: `${IMG}#${q}`, pageTitle: null, pageUrl: null }),
      }),
    },
  ]);
  const f = TestBed.createComponent(LoreCiviliansComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  return { f, el: f.nativeElement as HTMLElement, settle };
}
const dialogue = (el: HTMLElement) => el.querySelector<HTMLElement>('app-figure-lightbox[role="dialog"]');

describe('Civils Impériaux — visionneuse en dialogue (L181)', () => {
  it('R1 — fermée, aucun role=dialog ; ouverte par une figure, role=dialog, aria-modal et nom accessible', async () => {
    const { el, settle } = await monter();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    el.querySelector<HTMLButtonElement>('.figure-card')!.click();
    await settle();
    const d = dialogue(el)!;
    expect(d).not.toBeNull();
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-label')).toBe(`Visionneuse — ${seed[0].notableFigures[0].name}`);
  });

  it('R1 — fermée, le dialogue disparaît ; le focus revient à la figure d’origine après le rendu', async () => {
    const { f, el, settle } = await monter();
    const carte = el.querySelector<HTMLButtonElement>('.figure-card')!;
    document.body.appendChild(el);
    carte.focus();
    carte.click();
    await settle();
    f.componentInstance.closeLightbox();
    await settle();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(carte);
    el.remove();
  });

  it('R5 — le composant partagé figure-lightbox reste intact (test scellé L120 R10)', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/shared/components/figure-lightbox/figure-lightbox.component.ts'), 'utf8');
    expect(src).not.toMatch(/role=|aria-modal/);
  });
});
