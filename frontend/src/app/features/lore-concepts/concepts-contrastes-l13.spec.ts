// L13 (revue UX Lore : concepts, WCAG 1.4.3) — la couleur d'un concept ne sert plus de couleur de texte (Imperium
// Nihilus #3a3a3a, Imperium Sanctus #1d4ba0…) ; une teinte éclaircie ≥ 4,5:1 la remplace, l'originale reste sur le sigil et les bordures.
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
import { LoreConceptsComponent } from './lore-concepts.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/lore-concepts.json'), 'utf8')) as
  { id: string; color: string; category: string }[];

const scss = readFileSync(join(__dirname, 'lore-concepts.component.scss'), 'utf8');

const hexVersRgb = (hex: string): string => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

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
  return f.nativeElement as HTMLElement;
}

describe('Concepts, contrastes (L13)', () => {
  it('R1 — la couleur d\'origine de plusieurs concepts est sous 4,5:1 : le problème est réel', () => {
    expect(seed.filter(c => contraste(c.color, FOND_TEXTE_SOMBRE) < 4.5).length).toBeGreaterThanOrEqual(5);
  });

  it('R2 — le h2 de chaque concept porte sa teinte lisible, ≥ 4,5:1 sur le fond le plus clair du bandeau', async () => {
    const el = await monter();
    seed.forEach(c => {
      const h2 = el.querySelector<HTMLElement>(`#${c.id} h2`)!;
      expect(h2.style.color).toBe(hexVersRgb(teinteLisible(c.color)));
      expect(contraste(teinteLisible(c.color), FOND_TEXTE_SOMBRE)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('R3 — le sigil garde la couleur d\'origine (décor), la catégorie et le ⛶ la teinte lisible', async () => {
    const el = await monter();
    const c = seed.find(x => x.id === 'imperium-nihilus')!;
    expect(el.querySelector<HTMLElement>(`#${c.id} .concept-sigil`)!.style.color).toBe(hexVersRgb(c.color));
    const lisible = hexVersRgb(teinteLisible(c.color));
    expect(el.querySelector<HTMLElement>(`#${c.id} .concept-zoom`)!.style.color).toBe(lisible);
  });

  it('R4 — chaque catégorie, en texte (badge, filtre actif), a une teinte ≥ 4,5:1 ; le filtre expose --cat-text', async () => {
    const el = await monter();
    const filtres = Array.from(el.querySelectorAll<HTMLElement>('section.filters button.filter')).slice(1);
    expect(filtres.length).toBe(4);
    filtres.forEach(b => {
      const t = b.style.getPropertyValue('--cat-text');
      expect(t).toMatch(/^#[0-9a-f]{6}$/);
      expect(contraste(t, FOND_TEXTE_SOMBRE)).toBeGreaterThanOrEqual(4.5);
    });
    expect(el.querySelector<HTMLElement>('#warp .category')!.style.color).toBe(hexVersRgb(teinteLisible('#7a4a8b')));
  });

  it('R5 — la feuille de style ne lit jamais --c-color en couleur de texte (bordures et fonds seulement)', () => {
    const lignes = scss.split('\n').filter(l => /^\s*color:\s*var\(--c-color/.test(l));
    expect(lignes).toEqual([]);
  });
});
