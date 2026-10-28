// L15 (revue UX Lore : équipement, liste) — filtres annoncés (WCAG 4.1.2), champs nommés (1.3.1, 4.1.2),
// cartes ouvrables au clavier (2.1.1), ⛶ nommé et présent seulement s'il a une image (2.4.6), texte actif ≥ 4,5:1 (1.4.3),
// nom VO ≥ 4,5:1 et ⛶ visible au repos à ≥ 3:1 (1.4.11).
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

  it('R8 — le ⛶ (28 px à gauche 16 px) ne recouvre ni le sigil ni le libellé : l\'en-tête d\'une carte avec image est décalé d\'au moins 56 px', async () => {
    const avec = await monter();
    expect(el(avec).querySelector('article.card .card-head')!.classList.contains('with-zoom')).toBe(true);
    const sans = await monter(null);
    expect(el(sans).querySelector('article.card .card-head')!.classList.contains('with-zoom')).toBe(false);
    const scss = readFileSync(join(__dirname, 'lore-equipment.component.scss'), 'utf8');
    const decalage = Number(/\.card-head\.with-zoom\s*\{[^}]*padding-left:\s*(\d+)px/.exec(scss)?.[1]);
    expect(decalage).toBeGreaterThanOrEqual(16 + 28 + 12);
  });

  it('R9 — à 600 px et moins, la recherche garde ses 36 px dans la colonne (flex: none, pas flex: 1 qui l\'écrase à 18 px)', () => {
    const scss = readFileSync(join(__dirname, 'lore-equipment.component.scss'), 'utf8');
    const mobile = scss.slice(scss.indexOf('@media (max-width: 600px)'));
    expect(mobile).toMatch(/\.search\s*\{[^}]*flex:\s*none/);
  });

  it('R10 — ⛶ ouvre un vrai dialogue modal (role=dialog, aria-modal, nom) et sa fermeture rend le focus au ⛶ d\'origine', async () => {
    const f = await monter();
    const zoom = el(f).querySelector<HTMLButtonElement>('article.card .card-zoom')!;
    const nom = seed[0].name;
    const boite = el(f).querySelector('app-figure-lightbox')!;
    expect(boite.getAttribute('role')).toBeNull();
    zoom.focus();
    zoom.click();
    f.detectChanges();
    await f.whenStable();
    expect(boite.getAttribute('role')).toBe('dialog');
    expect(boite.getAttribute('aria-modal')).toBe('true');
    expect(boite.getAttribute('aria-label')).toBe(`Visionneuse — ${nom}`);
    f.componentInstance.closeLightbox();
    f.detectChanges();
    await f.whenStable();
    expect(boite.getAttribute('role')).toBeNull();
    expect(document.activeElement).toBe(zoom);
  });

  it('R11 — pastilles de faction, libellé de type, retour et valeurs mono sont ≥ 4,5:1 sur leur pire fond', () => {
    const scss = readFileSync(join(__dirname, 'lore-equipment.component.scss'), 'utf8');
    const vars: Record<string, string> = { '--gold': '#c9a24a', '--gold-soft': '#80652b', '--gold-bright': '#f0d276', '--text': '#e6dfce', '--muted': '#8d8678' };
    const regle = (sel: string) => {
      const m = new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`).exec(scss);
      expect(m, sel).not.toBeNull();
      return m![1];
    };
    const couleur = (corps: string) => vars[/(?:^|[\s;])color:\s*var\((--[a-z-]+)\)/.exec(corps)![1]];
    // Fond : voile posé sur une image blanche (pire cas) ; sans fond propre, la page (#050403).
    const surBlanc = (corps: string) => {
      const m = /background:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(corps);
      if (!m) return '#050403';
      const a = Number(m[4]);
      return '#' + [m[1], m[2], m[3]].map(v => Math.round(Number(v) * a + 255 * (1 - a)).toString(16).padStart(2, '0')).join('');
    };
    for (const sel of ['.faction-pill', '.card-type']) {
      const corps = regle(sel);
      expect(contraste(couleur(corps), surBlanc(corps)), sel).toBeGreaterThanOrEqual(4.5);
    }
    expect(contraste(couleur(regle('.back-link')), surBlanc(regle('.back-link'))), '.back-link').toBeGreaterThanOrEqual(4.5);
    const mono = /\.detail-value\.mono\s*\{[^}]*color:\s*var\((--[a-z-]+)\)/.exec(scss)![1];
    expect(contraste(vars[mono], '#2a2624'), '.detail-value.mono').toBeGreaterThanOrEqual(4.5);
  });

  it('R12 — le nom VO de la carte (.card-vo) est ≥ 4,5:1 sur le fond le plus clair que le voile laisse (#333333)', () => {
    const scss = readFileSync(join(__dirname, 'lore-equipment.component.scss'), 'utf8');
    const vars: Record<string, string> = { '--gold': '#c9a24a', '--gold-soft': '#80652b', '--gold-bright': '#f0d276', '--text': '#e6dfce', '--muted': '#8d8678' };
    const corps = /(?:^|\n)\s*\.card-vo\s*\{([^}]*)\}/.exec(scss)![1];
    const m = /color:\s*(?:var\((--[a-z-]+)\)|(#[0-9a-f]{6}))/.exec(corps)!;
    expect(contraste(m[1] ? vars[m[1]] : m[2], '#333333')).toBeGreaterThanOrEqual(4.5);
  });

  it('R13 — le ⛶ est visible au repos (pas d\'opacité réduite, un téléphone n\'a pas de survol) et son glyphe est ≥ 3:1 sur son voile, même sur une image blanche', async () => {
    const scss = readFileSync(join(__dirname, 'lore-equipment.component.scss'), 'utf8');
    const corps = /(?:^|\n)\s*\.card-zoom\s*\{([^}]*)\}/.exec(scss)![1];
    expect(corps).not.toMatch(/opacity:\s*0?\.\d/);
    expect(corps).toMatch(/color:\s*var\(--t-text/);
    const [, r, g, b, a] = /background:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(corps)!;
    const fond = '#' + [r, g, b].map(v => Math.round(Number(v) * Number(a) + 255 * (1 - Number(a))).toString(16).padStart(2, '0')).join('');
    const f = await monter();
    const cartes = Array.from(el(f).querySelectorAll<HTMLElement>('article.card'));
    const parType = new Map(cartes.map(c => [c.style.getPropertyValue('--t-color'), c.style.getPropertyValue('--t-text')]));
    expect(parType.size).toBe(4);
    for (const [couleur, texte] of parType) {
      expect(texte, couleur).toMatch(/^#[0-9a-f]{6}$/);
      expect(contraste(texte, fond), `${couleur} → ${texte} sur ${fond}`).toBeGreaterThanOrEqual(3);
    }
  });
});
