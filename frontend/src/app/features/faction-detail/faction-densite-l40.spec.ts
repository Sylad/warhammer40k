// L40 — page pilote de la campagne densité (docs/densite/regles.md) : fiche faction.
// D4 : sous-factions par pages de 12 au bureau, 6 au téléphone, avec le compte affiché ; unités au
// repos 7 + « Voir toutes » au bureau, 5 + 1 au téléphone. D5 : l'encart latéral ne redit plus le
// bandeau (description et citation). D2 : les textes longs sont repliés (« Lire la suite »).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionDetailComponent } from './faction-detail.component';

const LONG = 'Créés durant les derniers jours de la Grande Croisade. '.repeat(12);
const FACTION = {
  id: 'space-marines', nom: 'Space Marines', alignement: 'Imperium', symbole: '✠', couleurThematique: '#123',
  description: 'Guerriers génétiquement améliorés, champions de l’Empereur.',
  citation: 'Nous sommes la colère de l’Empereur.',
  lore: { origine: 'o', organisation: 'g', doctrine: 'd' },
  longHistory: LONG, currentState: 'Court.', legacy: LONG,
};
const SF = Array.from({ length: 20 }, (_, i) => ({ id: `sf${i}`, name: `Chapitre ${String(i).padStart(2, '0')}`, factionId: 'space-marines', type: 'chapter', description: 'd' }));
const UNITS = Array.from({ length: 19 }, (_, i) => ({ id: `u${i}`, nom: `Unité ${i}`, factionId: 'space-marines', type: 'Infanterie', description: 'd' }));

const matchMediaOrigine = window.matchMedia;
afterEach(() => {
  window.matchMedia = matchMediaOrigine;
});
function largeurTelephone() {
  window.matchMedia = ((q: string) => ({
    matches: /max-width/.test(q), media: q, addEventListener: () => {}, removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

async function rendre(units = UNITS, sf: { type: string }[] = SF) {
  const service = fakeWarhammerService({
    getFaction: () => of(FACTION),
    getUnits: () => of(units),
    getSubFactions: () => of(sf),
  });
  await setupTestBed([FactionDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'space-marines' })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(FactionDetailComponent);
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}

describe('fiche faction — densité (L40)', () => {
  it('bureau : 12 sous-factions sur 20, compte et bouton nomment la liste, « Afficher 8 chapitres de plus » ; le focus va à la 13e', async () => {
    const { f, el } = await rendre();
    expect(el.querySelectorAll('a.sf-card')).toHaveLength(12);
    expect(el.querySelector('.voir-plus-compte')!.textContent!.trim()).toBe('12 chapitres sur 20 affichés');
    const b = el.querySelector<HTMLButtonElement>('button.sf-load-more')!;
    expect(b.textContent!.trim()).toBe('Afficher 8 chapitres de plus');
    b.click();
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const cartes = el.querySelectorAll<HTMLAnchorElement>('a.sf-card');
    expect(cartes).toHaveLength(20);
    expect(document.activeElement).toBe(cartes[12]);
    expect(el.querySelector('button.sf-load-more')).toBeNull();
    f.nativeElement.remove();
  });

  it('téléphone : 6 sous-factions, 5 unités + « Voir toutes les unités »', async () => {
    largeurTelephone();
    const { f, el } = await rendre();
    expect(el.querySelectorAll('a.sf-card')).toHaveLength(6);
    expect(el.querySelector('.voir-plus-compte')!.textContent!.trim()).toBe('6 chapitres sur 20 affichés');
    expect(el.querySelectorAll('a.unit-card')).toHaveLength(5);
    expect(el.querySelector('button.unit-extra')!.textContent).toContain('+14 autres unités');
    f.nativeElement.remove();
  });

  it('l’encart latéral ne redit ni la description ni la citation du bandeau', async () => {
    const { f, el } = await rendre();
    const textes = [...el.querySelectorAll('p, blockquote')].map((e) => e.textContent!.replace(/\s+/g, ' ').trim());
    expect(textes.filter((t) => t.includes('Guerriers génétiquement améliorés'))).toHaveLength(1);
    expect(textes.filter((t) => t.includes('Nous sommes la colère'))).toHaveLength(1);
    expect(el.querySelector('.sidebar')!.textContent).not.toContain('À propos des');
    f.nativeElement.remove();
  });

  it('chronique et héritage longs repliés, « Lire la suite » nommé par la section ; texte court sans bouton', async () => {
    const { f, el } = await rendre();
    const bouton = (id: string) => el.querySelector(`#${id} button.tr-bouton`);
    expect(el.querySelector('#chronique .tr-corps')!.classList).toContain('tr-replie');
    expect(bouton('chronique')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('Lire la suite : Chronique complète');
    expect(bouton('heritage')).not.toBeNull();
    expect(bouton('etat')).toBeNull();
    expect(el.querySelector('#chronique p.bible-text.lecture')).not.toBeNull();
    expect(el.querySelector('nav.anchor-nav')!.getAttribute('aria-label')).toBe('Sommaire de la page');
    f.nativeElement.remove();
  });

  it('D4, tolérance : la carte « Voir toutes » ne cache jamais 1 ou 2 unités', async () => {
    for (const [n, cartes, extra] of [[9, 9, null], [10, 7, '+3 autres unités']] as const) {
      const { f, el } = await rendre(UNITS.slice(0, n));
      expect(el.querySelectorAll('a.unit-card')).toHaveLength(cartes);
      expect(el.querySelector('button.unit-extra')?.textContent ?? null).toEqual(extra === null ? null : expect.stringContaining(extra));
      f.nativeElement.remove();
    }
    largeurTelephone();
    for (const [n, cartes] of [[7, 7], [8, 5]] as const) {
      const { f, el } = await rendre(UNITS.slice(0, n));
      expect(el.querySelectorAll('a.unit-card')).toHaveLength(cartes);
      f.nativeElement.remove();
    }
  });

  it('accord du compte au féminin (« dynasties … affichées »)', async () => {
    const { f, el } = await rendre(UNITS, SF.map((s) => ({ ...s, type: 'dynasty' })));
    expect(el.querySelector('.voir-plus-compte')!.textContent!.trim()).toBe('12 dynasties sur 20 affichées');
    expect(el.querySelector('button.sf-load-more')!.textContent!.trim()).toBe('Afficher 8 dynasties de plus');
    f.nativeElement.remove();
  });
});
