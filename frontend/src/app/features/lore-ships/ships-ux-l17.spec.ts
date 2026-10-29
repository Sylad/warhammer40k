// L17 (revue UX Lore : vaisseaux, liste) — filtres annoncés (WCAG 4.1.2), ⛶ hors du lien de la carte (4.1.2),
// nommé par le vaisseau et présent seulement s'il a une image (2.4.6), visible au repos (1.4.11),
// texte des cartes ≥ 4,5:1 sous le voile (1.4.3).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { contraste, FOND_TEXTE_SOMBRE } from '../../core/utils/teinte-lisible';
import { LoreShipsComponent } from './lore-ships.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/legendary-ships.json'), 'utf8'));
const scss = readFileSync(join(__dirname, 'lore-ships.component.scss'), 'utf8');

async function monter(imageUrl: string | null = 'http://img/x.jpg') {
  await setupTestBed([LoreShipsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      ships$: of(seed),
      getWikiImage: () => of({ imageUrl, pageTitle: null, pageUrl: null }),
    }) },
  ]);
  const f = TestBed.createComponent(LoreShipsComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
type Fx = Awaited<ReturnType<typeof monter>>;
const el = (f: Fx) => f.nativeElement as HTMLElement;
const filtres = (f: Fx) => Array.from(el(f).querySelectorAll<HTMLButtonElement>('.filters button'));

describe('Vaisseaux, liste (L17)', () => {
  it('R1 — les 4 filtres sont des type="button" avec aria-pressed (« Tous » à true), dans un groupe nommé, un seul pressé après un clic', async () => {
    const f = await monter();
    expect(el(f).querySelector('.filters')!.getAttribute('role')).toBe('group');
    expect(el(f).querySelector('.filters')!.getAttribute('aria-label')).toBe('Filtrer par camp');
    expect(filtres(f).map(b => b.type)).toEqual(Array(4).fill('button'));
    expect(filtres(f).map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false']);
    filtres(f)[2].click();
    f.detectChanges();
    expect(filtres(f).map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false']);
  });

  it('R2 — le ⛶ n\'est plus dans le lien de la carte (deux contrôles imbriqués), il le suit, nommé par le vaisseau', async () => {
    const f = await monter();
    const zoom = el(f).querySelector<HTMLButtonElement>('.card-wrap .card-zoom')!;
    expect(zoom.closest('a')).toBeNull();
    expect(zoom.getAttribute('aria-label')).toBe(`Voir en grand : ${seed[0].name}`);
    expect(zoom.previousElementSibling!.matches('a.card')).toBe(true);
  });

  it('R3 — pas de ⛶ tant que le vaisseau n\'a pas d\'image (il ne ferait rien)', async () => {
    const f = await monter(null);
    expect(el(f).querySelectorAll('.card-zoom').length).toBe(0);
  });

  it('R4 — le ⛶ est visible au repos (opacité jamais ramenée à 0)', () => {
    const regle = /\.card-zoom\s*\{([^}]*)\}/.exec(scss)![1];
    expect(regle).not.toMatch(/opacity:\s*0\s*;/);
  });

  it('R5 — le texte des cartes (camps, faction, accroche ; le nom et la classe sont en --gold-bright / #f0e8c8, clairs) est ≥ 4,5:1 sur le fond le plus clair que laisse le voile', () => {
    const couleurs = [...scss.matchAll(/\.(?:badge\.a-\w+|card-faction|card-epithet|card-class)\s*\{[^}]*?[^-]color:\s*(#[0-9a-f]{6})/g)].map(m => m[1]);
    expect(couleurs.length).toBe(5);
    for (const c of couleurs) expect(contraste(c, FOND_TEXTE_SOMBRE), c).toBeGreaterThanOrEqual(4.5);
  });

  it('R6 — le voile couvre toute la zone de texte : ≥ 0,72 dès 45 % de la hauteur de la carte', () => {
    const grad = /\.card-overlay\s*\{[^}]*linear-gradient\(([^;]*)\)\s*;/.exec(scss)![1];
    const arrets = [...grad.matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)\s*(\d+)%/g)].map(m => [Number(m[1]), Number(m[2])]);
    const [alpha, pos] = arrets[0];
    expect(alpha).toBeGreaterThanOrEqual(0.72);
    expect(pos).toBeLessThanOrEqual(45);
  });

  it('R7 — ⛶ ouvre un vrai dialogue modal (role=dialog, aria-modal, nom) et sa fermeture rend le focus au ⛶ d\'origine', async () => {
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
    // Le focus quitte réellement le ⛶ (comme au navigateur, où il passe sur « Fermer ») : sans restitution, il y reste perdu.
    zoom.blur();
    expect(document.activeElement).not.toBe(zoom);
    f.componentInstance.closeLightbox();
    f.detectChanges();
    await f.whenStable();
    expect(boite.getAttribute('role')).toBeNull();
    expect(document.activeElement).toBe(zoom);
  });
});
