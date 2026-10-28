// L15 (revue UX Lore : équipement, liste) — filtres annoncés (WCAG 4.1.2), champs nommés (1.3.1, 4.1.2),
// cartes ouvrables au clavier (2.1.1), ⛶ nommé et présent seulement s'il a une image (2.4.6), texte actif ≥ 4,5:1 (1.4.3).
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
import { LoreEquipmentComponent } from './lore-equipment.component';

const seed = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/equipment.json'), 'utf8'));
const factions = [{ id: 'space-marines', nom: 'Space Marines' }, { id: 'chaos-space-marines', nom: 'Chaos Space Marines' }];

async function monter(imageUrl: string | null = 'http://img/x.jpg') {
  await setupTestBed([LoreEquipmentComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      equipment$: of(seed),
      factions$: of(factions),
      getWikiImage: () => of({ imageUrl, pageTitle: null, pageUrl: null }),
    }) },
  ]);
  const f = TestBed.createComponent(LoreEquipmentComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
type Fx = Awaited<ReturnType<typeof monter>>;
const el = (f: Fx) => f.nativeElement as HTMLElement;
const filtres = (f: Fx) => Array.from(el(f).querySelectorAll<HTMLButtonElement>('section.filters button.filter'));

describe('Équipement, liste (L15)', () => {
  it('R1 — les 5 boutons de filtre sont des type="button" avec aria-pressed, « Tous » à true, un seul pressé après un clic', async () => {
    const f = await monter();
    expect(filtres(f).map(b => b.type)).toEqual(Array(5).fill('button'));
    expect(filtres(f).map(b => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    filtres(f)[2].click();
    f.detectChanges();
    expect(filtres(f).map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false']);
  });

  it('R2 — le choix de faction et la recherche ont un nom accessible', async () => {
    const f = await monter();
    expect(el(f).querySelector('select.faction-select')!.getAttribute('aria-label')).toBe('Filtrer par faction');
    expect(el(f).querySelector('input.search')!.getAttribute('aria-label')).toBe("Rechercher dans l'arsenal");
  });

  it('R3 — chaque carte a un bouton d\'ouverture au clavier nommé par la pièce, aria-expanded suit l\'état', async () => {
    const f = await monter();
    const carte = el(f).querySelector<HTMLElement>('article.card')!;
    const bouton = carte.querySelector<HTMLButtonElement>('h3 button.card-toggle')!;
    expect(bouton.textContent!.trim()).toBe(seed[0].name);
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    bouton.click();
    f.detectChanges();
    expect(bouton.getAttribute('aria-expanded')).toBe('true');
    expect(carte.classList.contains('expanded')).toBe(true);
    expect(carte.querySelector('a.fiche-link')).not.toBeNull();
    bouton.click();
    f.detectChanges();
    expect(bouton.getAttribute('aria-expanded')).toBe('false');
    expect(carte.querySelector('a.fiche-link')).toBeNull();
  });

  it('R4 — un clic sur la carte ouvre/ferme une seule fois (le bouton ne double pas le clic de la carte)', async () => {
    const f = await monter();
    const carte = el(f).querySelector<HTMLElement>('article.card')!;
    carte.click();
    f.detectChanges();
    expect(carte.classList.contains('expanded')).toBe(true);
  });

  it('R5 — le ⛶ porte le nom de la pièce, et n\'existe pas tant que la pièce n\'a pas d\'image', async () => {
    const avec = await monter();
    expect(el(avec).querySelector('article.card .card-zoom')!.getAttribute('aria-label')).toBe(`Voir en grand : ${seed[0].name}`);
    const sans = await monter(null);
    expect(el(sans).querySelectorAll('.card-zoom').length).toBe(0);
  });

  it('R6 — le texte du filtre actif de chaque type est ≥ 4,5:1 (la couleur d\'origine des mêlées est à 4,1:1)', async () => {
    const f = await monter();
    const types = filtres(f).slice(1);
    types.forEach(b => {
      const hex = b.style.getPropertyValue('--t-text');
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      expect(contraste(hex, FOND_TEXTE_SOMBRE)).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('R7 — à 600 px et moins, le bandeau de filtres (≈ 230 px) ne reste pas collé au défilement : il prendrait 27 % d\'un écran de 844 px', () => {
    const scss = readFileSync(join(__dirname, 'lore-equipment.component.scss'), 'utf8');
    const mobile = scss.slice(scss.indexOf('@media (max-width: 600px)'));
    expect(mobile).toMatch(/\.filters\s*\{[^}]*position:\s*static/);
  });
});
