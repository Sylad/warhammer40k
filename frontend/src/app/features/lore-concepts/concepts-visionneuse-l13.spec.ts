// L13 (revue UX Lore : concepts, WCAG 2.1.2, 2.4.3, 4.1.2) — la visionneuse est un dialogue modal nommé, le focus
// revient à l'élément d'origine, et le bouton d'ouverture de chaque concept porte un nom propre à ce concept.
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
const IMG = 'data:image/svg+xml;base64,PHN2Zy8+';

async function monter() {
  await setupTestBed([LoreConceptsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      loreConcepts$: of(seed),
      getWikiImage: (q: string) => of({ imageUrl: `${IMG}#${q}`, pageTitle: null, pageUrl: null }),
    }) },
  ]);
  const f = TestBed.createComponent(LoreConceptsComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  return { f, el: f.nativeElement as HTMLElement, settle };
}

describe('Concepts — visionneuse en dialogue (L13)', () => {
  it('R1 — fermée, aucun role=dialog ; ouverte, role=dialog, aria-modal et nom accessible', async () => {
    const { el, settle } = await monter();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    el.querySelector<HTMLButtonElement>('.concept-bg')!.click();
    await settle();
    const d = el.querySelector<HTMLElement>('app-figure-lightbox[role="dialog"]')!;
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-label')).toBe(`Visionneuse — ${seed[0].name}`);
  });

  it('R2 — à la fermeture, le dialogue disparaît et le focus revient au bouton d\'origine', async () => {
    const { f, el, settle } = await monter();
    const bouton = el.querySelector<HTMLButtonElement>('.concept-bg')!;
    document.body.appendChild(el);
    bouton.focus();
    bouton.click();
    await settle();
    f.componentInstance.closeLightbox();
    await settle();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(bouton);
    el.remove();
  });

  it('R3 — le bouton d\'agrandissement de chaque concept est nommé d\'après lui, le ⛶ décoratif est masqué aux lecteurs', async () => {
    const { el } = await monter();
    const boutons = Array.from(el.querySelectorAll<HTMLButtonElement>('.concept-bg'));
    expect(boutons.map(b => b.getAttribute('aria-label'))).toEqual(seed.map((c: { name: string }) => `Voir en grand — ${c.name}`));
    el.querySelectorAll('.concept-zoom').forEach(z => expect(z.getAttribute('aria-hidden')).toBe('true'));
  });
});
