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
