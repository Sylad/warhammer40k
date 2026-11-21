// L240 (revue de code r4, constat 2) — à la destruction de la page Vidéos, la hauteur tenue de la colonne collée
// « Filtres avancés » est rendue et son écouteur `resize` retiré (il gardait le conteneur détaché jusqu'au premier
// redimensionnement).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { avantFiltre } from '../../core/utils/resultats-en-vue';
import { VideosComponent } from './videos.component';

/** Colonne collée tenue par un filtre (même modèle que resultats-en-vue.spec.ts : rien à défiler, liste raccourcie). */
function colonneTenue(): HTMLElement {
  const hote = document.createElement('div');
  hote.innerHTML = `<div class="grille"><section tabindex="-1"><header>2 résultats</header></section>`
    + `<aside style="position: sticky; top: 96px"><button>Durée courte</button></aside></div>`;
  document.body.appendChild(hote);
  const grille = hote.querySelector<HTMLElement>('.grille')!;
  const aside = hote.querySelector('aside')!;
  const section = hote.querySelector('section')!;
  const etat = { nat: 2100 };
  const y = 1500;
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  const rect = (top: number, h: number) => ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  const fin = () => Math.max(etat.nat, parseFloat(grille.style.minHeight) || 0);
  grille.getBoundingClientRect = () => rect(-y, fin());
  aside.getBoundingClientRect = () => rect(Math.min(96, fin() - 430 - y), 430);
  section.getBoundingClientRect = () => rect(0, 300);
  section.querySelector('header')!.getBoundingClientRect = () => rect(0, 60);
  document.body.getBoundingClientRect = () => rect(-y, fin() + 200);
  const f = avantFiltre(hote.querySelector('button'));
  etat.nat = 1600;
  f(section);
  return grille;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('style');
});

describe('L240 r4 — Vidéos détruite : hauteur tenue de la colonne rendue, écouteur resize retiré', () => {
  it('la destruction du composant rend la min-height tenue et retire l’écouteur', async () => {
    await setupTestBed([VideosComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: fakeWarhammerService({ videos$: of([]) }) },
    ]);
    const fixture = TestBed.createComponent(VideosComponent);
    fixture.detectChanges();
    const grille = colonneTenue();
    expect(grille.style.minHeight).toBe(`${96 + 430 + 1500}px`);
    const retrait = vi.spyOn(window, 'removeEventListener');
    fixture.destroy();
    expect(grille.style.minHeight).toBe(''); // sans la correction : 2026px, gardé jusqu'au premier redimensionnement
    expect(retrait).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
