// L16 — Chronologie (liste) : focus non masqué par la barre d'ères collée (WCAG 2.4.11), contrastes des textes
// en or doux (1.4.3), nom et état des commandes de filtre (4.1.2).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import * as postcss from 'postcss';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreTimelineComponent } from './lore-timeline.component';

const evenement = { id: 'e1', era: 'horus-heresy', titre: 'Siège', title: 'Siège', tags: ['tau'], sources: [] };

async function monter() {
  await setupTestBed([LoreTimelineComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ timelineEvents$: of([evenement]) }) },
  ]);
  const f = TestBed.createComponent(LoreTimelineComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}

function decl(selecteur: string, prop: string): string {
  const css = postcss.parse(sass.compile(resolve(__dirname, 'lore-timeline.component.scss')).css);
  let valeur = '';
  css.walkRules((r) => {
    if (r.selectors.includes(selecteur)) r.walkDecls(prop, (d) => { valeur = d.value; });
  });
  return valeur;
}

afterEach(() => vi.unstubAllGlobals());

describe('Chronologie : liste accessible (L16)', () => {
  it('R2 — le bouton de titre d\'une carte réserve la hauteur de la barre d\'ères à sa marge de défilement', () => {
    expect(decl('.t-card-toggle', 'scroll-margin-top')).toMatch(/var\(--era-nav-h/);
  });

  it('R2 — la hauteur de la barre d\'ères est suivie en continu (les pastilles passent à la ligne au redimensionnement)', async () => {
    let rappel: () => void = () => {};
    const observe = vi.fn();
    vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { rappel = cb; } observe = observe; disconnect() {} });
    const f = await monter();
    const el = f.nativeElement as HTMLElement;
    const barre = el.querySelector<HTMLElement>('.era-nav')!;
    expect(observe).toHaveBeenCalledWith(barre);
    Object.defineProperty(barre, 'offsetHeight', { value: 231, configurable: true });
    rappel();
    expect(el.style.getPropertyValue('--era-nav-h')).toBe('231px');
  });

  it('R3 — étiquettes, lien de retour et liens de sources n\'utilisent plus l\'or doux (3,7:1 au mieux)', () => {
    for (const s of ['.t-tag', '.back-link', '.t-sources a']) {
      expect(decl(s, 'color'), s).not.toMatch(/gold-soft/);
    }
  });

  it('R4 — le sélecteur de thème a un nom accessible, celui du libellé visible', async () => {
    const f = await monter();
    const el = f.nativeElement as HTMLElement;
    const select = el.querySelector<HTMLSelectElement>('select.tag-select')!;
    const libelle = el.querySelector<HTMLElement>('#filtre-theme-libelle')!;
    expect(libelle.textContent).toContain('Par faction / thème');
    expect(select.getAttribute('aria-labelledby')).toBe('filtre-theme-libelle');
  });

  it('R5 — les boutons de filtre par ère exposent l\'état actif (aria-pressed)', async () => {
    const f = await monter();
    const el = f.nativeElement as HTMLElement;
    const boutons = [...el.querySelectorAll<HTMLButtonElement>('.filter-list button.filter')];
    expect(boutons.length).toBe(7);
    expect(boutons[0].getAttribute('aria-pressed')).toBe('true');
    expect(boutons.slice(1).every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
    boutons.find((b) => b.textContent?.includes('Hérésie'))!.click();
    f.detectChanges();
    expect(boutons[0].getAttribute('aria-pressed')).toBe('false');
    expect(boutons.find((b) => b.textContent?.includes('Hérésie'))!.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Chronologie : liste accessible, seconde passe (L16)', () => {
  it('R6 — après l\'activation d\'un bouton de carte, le bouton actif est ramené dans la zone visible (le repli de la carte du dessus le remontait sous la barre d\'ères)', async () => {
    vi.useFakeTimers();
    const f = await monter();
    const el = f.nativeElement as HTMLElement;
    const bouton = el.querySelector<HTMLButtonElement>('.t-card-toggle')!;
    bouton.scrollIntoView = vi.fn();
    bouton.focus();
    expect(document.activeElement).toBe(bouton);
    bouton.click();
    f.detectChanges();
    expect(bouton.scrollIntoView).not.toHaveBeenCalled(); // seulement une fois la mise en page refaite
    vi.advanceTimersByTime(1);
    expect(bouton.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    vi.useRealTimers();
  });

  it('R6 — un clic qui ne vient pas d\'un bouton de carte focalisé ne provoque aucun défilement', async () => {
    vi.useFakeTimers();
    const f = await monter();
    const el = f.nativeElement as HTMLElement;
    const bouton = el.querySelector<HTMLButtonElement>('.t-card-toggle')!;
    bouton.scrollIntoView = vi.fn();
    (document.activeElement as HTMLElement | null)?.blur?.();
    el.querySelector<HTMLElement>('.t-card')!.click();
    f.detectChanges();
    vi.advanceTimersByTime(1);
    expect(bouton.scrollIntoView).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('R7 — la date des cartes (or vif, 22 px) est posée sur un fond uni opaque à 85 % au moins : 4,12:1 au pire pixel de l\'image sinon', () => {
    const fond = decl('.t-card-date', 'background');
    const m = fond.match(/rgba\(\s*5,\s*4,\s*3,\s*(0?\.\d+)\)/);
    expect(m, fond).toBeTruthy();
    expect(parseFloat(m![1])).toBeGreaterThanOrEqual(0.85);
    expect(decl('.t-card-date', 'align-self')).toBe('flex-start');
  });

  it('R8 — le badge du bandeau (or, 11 px) est posé sur un fond uni opaque à 85 % au moins : 2,29:1 sur l\'image et son halo sinon', () => {
    const fond = decl('.badge', 'background');
    const m = fond.match(/rgba\(\s*5,\s*4,\s*3,\s*(0?\.\d+)\)/);
    expect(m, fond).toBeTruthy();
    expect(parseFloat(m![1])).toBeGreaterThanOrEqual(0.85);
  });
});
