// L19 (revue UX Lore : Saints, liste) — filtres annoncés (WCAG 4.1.2), ⛶ hors du lien de la carte (4.1.2), nommé par le saint
// et présent seulement si elle a une image (2.4.6), formats lisibles (1.4.3), visionneuse modale au titre lisible (4.1.2, 1.4.3).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { contraste, FOND_TEXTE_SOMBRE, teinteLisible } from '../../core/utils/teinte-lisible';
import { LoreSaintsComponent } from './lore-saints.component';
import type { Saint } from '../../core/models/models';

const seed: Saint[] = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/living-saints.json'), 'utf8'));
const scss = readFileSync(join(__dirname, '../lore-ships/lore-ships.component.scss'), 'utf8');

async function monter(imageUrl: string | null = 'http://img/x.jpg') {
  await setupTestBed([LoreSaintsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      saints$: of(seed),
      getWikiImage: () => of({ imageUrl, pageTitle: null, pageUrl: null }),
    }) },
  ]);
  const f = TestBed.createComponent(LoreSaintsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
type Fx = Awaited<ReturnType<typeof monter>>;
const el = (f: Fx) => f.nativeElement as HTMLElement;
const filtres = (f: Fx) => Array.from(el(f).querySelectorAll<HTMLButtonElement>('.filters button'));

describe('Saints, liste (L19)', () => {
  it('R1 — les 4 filtres sont des type="button" avec aria-pressed (« Tous » à true), dans un groupe nommé, un seul pressé après un clic', async () => {
    const f = await monter();
    expect(el(f).querySelector('.filters')!.getAttribute('role')).toBe('group');
    expect(el(f).querySelector('.filters')!.getAttribute('aria-label')).toBe('Filtrer par catégorie');
    expect(filtres(f).map(b => b.type)).toEqual(Array(4).fill('button'));
    expect(filtres(f).map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
    filtres(f)[2].click();
    f.detectChanges();
    expect(filtres(f).map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
  });

  it('R2 — le ⛶ n\'est plus dans le lien de la carte, il le suit, nommé par le saint', async () => {
    const f = await monter();
    const zoom = el(f).querySelector<HTMLButtonElement>('.card-wrap .card-zoom')!;
    expect(zoom.closest('a')).toBeNull();
    expect(zoom.getAttribute('aria-label')).toBe(`Voir en grand : ${seed[0].name}`);
    expect(zoom.previousElementSibling!.matches('a.card')).toBe(true);
  });

  it('R3 — pas de ⛶ tant que le saint n\'a pas d\'image (il ne ferait rien)', async () => {
    const f = await monter(null);
    expect(el(f).querySelectorAll('.card-zoom').length).toBe(0);
  });

  it('R4 — la taille de le saint est un format posé sur un fond uni, en texte ≥ 4,5:1 (elle n\'avait aucun style)', () => {
    const regle = /\.size-badge\s*\{([^}]*)\}/.exec(scss)?.[1] ?? '';
    const fond = /background:\s*rgba\(0,\s*0,\s*0,\s*0?\.[6-9]\d*\)/.exec(regle);
    const couleur = /[^-]color:\s*(#[0-9a-f]{6})/.exec(regle)?.[1];
    expect(fond, 'fond sombre').not.toBeNull();
    expect(couleur, 'couleur').toBeDefined();
    expect(contraste(couleur!, FOND_TEXTE_SOMBRE)).toBeGreaterThanOrEqual(4.5);
  });

  it('R5 — ⛶ ouvre un vrai dialogue modal (role=dialog, aria-modal, nom) et sa fermeture rend le focus au ⛶ d\'origine', async () => {
    const f = await monter();
    const zoom = el(f).querySelector<HTMLButtonElement>('.card-wrap .card-zoom')!;
    const boite = el(f).querySelector('app-figure-lightbox')!;
    expect(boite.getAttribute('role')).toBeNull();
    zoom.focus();
    zoom.click();
    f.detectChanges();
    await f.whenStable();
    expect(boite.getAttribute('role')).toBe('dialog');
    expect(boite.getAttribute('aria-modal')).toBe('true');
    expect(boite.getAttribute('aria-label')).toBe(`Visionneuse — ${seed[0].name}`);
    zoom.blur();
    expect(document.activeElement).not.toBe(zoom);
    f.componentInstance.closeLightbox();
    f.detectChanges();
    await f.whenStable();
    expect(boite.getAttribute('role')).toBeNull();
    expect(document.activeElement).toBe(zoom);
  });

  it('R6 — le titre de la visionneuse de chacun des 8 saints est en teinte lisible (teinteLisible), ≥ 4,5:1 ; au moins une couleur brute du seed est sous 4,5:1', async () => {
    const f = await monter();
    const cmp = f.componentInstance;
    expect(seed.length).toBe(8);
    expect(seed.filter(m => contraste(m.color, FOND_TEXTE_SOMBRE) < 4.5).length).toBeGreaterThan(0);
    for (const m of seed) {
      cmp.openLightbox(m);
      const couleur = cmp.lightbox()!.contextColor;
      expect(couleur, m.id).toBe(teinteLisible(m.color));
      expect(contraste(couleur, FOND_TEXTE_SOMBRE), m.id).toBeGreaterThanOrEqual(4.5);
    }
  });
});
