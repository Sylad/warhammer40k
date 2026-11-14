// L40 — page pilote de la campagne densité (docs/densite/regles.md) : fiche Lore (primarque).
// D5 : une citation mise en exergue dans le texte n'est pas répétée dans « Citations » ;
// D6 : les batailles sont des h3 (h2 → h4 sautait un niveau) ; D2 : textes longs repliés.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { PrimarchDetailComponent } from './primarch-detail.component';

const LONG = 'Caliban était un monde-mort de forêts mortelles. '.repeat(12);
const QUOTES = ['Je ne pardonne pas.', 'Mon père, où étais-tu ?', 'Caliban est tombée.', 'Le pardon vient à ceux qui le méritent.'];
const base = {
  id: 'lion', number: 1, name: 'Lion', legion: 'Dark Angels', allegiance: 'loyalist', status: 'returned',
  description: 'd', quotes: QUOTES, notableBattles: [{ name: 'Croisade', date: 'M30', summary: 's' }],
};

async function rendre(extra: Record<string, unknown>) {
  const service = fakeWarhammerService({ getPrimarch: () => of({ ...base, ...extra }) });
  await setupTestBed([PrimarchDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'lion' })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(PrimarchDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}
const texte = (e: Element) => e.textContent!.replace(/\s+/g, ' ').trim();

describe('fiche primarque — densité (L40)', () => {
  it('Personnalité, Hérésie et Destin présents : seule la 4e citation reste dans « Autres citations »', async () => {
    const el = await rendre({ personality: 'p', heresy: 'h', finalFate: 'f' });
    expect([...el.querySelectorAll('#citations .quote-card p')].map(texte)).toEqual([QUOTES[3]]);
    expect(texte(el.querySelector('#citations h2')!)).toBe('Autres citations');
    expect(texte(el.querySelector('nav.anchor-nav a[href$="#citations"]')!)).toBe('Autres citations'); // D1 : ancre = titre
    for (const q of QUOTES) expect(texte(el).split(q).length - 1).toBe(1); // chaque citation une seule fois
  });

  it('toutes les citations déjà en exergue : ni section « Citations » ni ancre', async () => {
    const el = await rendre({ personality: 'p', heresy: 'h', finalFate: 'f', quotes: QUOTES.slice(0, 3) });
    expect(el.querySelector('#citations')).toBeNull();
    expect(el.querySelector('nav.anchor-nav a[href$="#citations"]')).toBeNull();
  });

  it('aucune section en exergue : « Citations Canon » les garde toutes', async () => {
    const el = await rendre({});
    expect(el.querySelectorAll('#citations .quote-card')).toHaveLength(4);
    expect(texte(el.querySelector('#citations h2')!)).toBe('Citations Canon');
    expect(texte(el.querySelector('nav.anchor-nav a[href$="#citations"]')!)).toBe('Citations Canon');
  });

  it('batailles en h3, aucun h4 ; textes longs repliés avec « Lire la suite » ; sommaire nommé', async () => {
    const el = await rendre({ loreLong: LONG, earlyLife: LONG, legacy: LONG });
    expect(el.querySelector('#batailles h3')).not.toBeNull();
    expect(el.querySelector('h4')).toBeNull();
    for (const id of ['description', 'origines', 'heritage']) {
      expect(el.querySelector(`#${id} .tr-corps.tr-replie`)).not.toBeNull();
      expect(el.querySelector(`#${id} button.tr-bouton`)!.getAttribute('aria-expanded')).toBe('false');
    }
    expect(el.querySelector('nav.anchor-nav')!.getAttribute('aria-label')).toBe('Sommaire de la page');
  });
});
