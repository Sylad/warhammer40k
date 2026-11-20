// L94 — fiche faction : les liens latéraux mènent où ils le disent (WCAG 2.4.4, but du lien).
// Avant : « Chronologie du Chapitre » menait à la chronologie générale, « Héraldique et symboles »
// à la liste des chapitres, « Bibliothèque des archives » et « Voir les romans liés » tous deux à
// /romans (sans filtre), et les vignettes Iconographie à /gallery sans ?faction=.
// Règle : un lien vers une section de la fiche ne vise qu'une section présente à l'écran et nommée
// par le libellé ; un lien vers une page générale porte le nom de cette page ; une destination
// n'a qu'un lien par bloc. Les données sont celles du seed (backend/seed), toutes les factions.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionDetailComponent } from './faction-detail.component';

const seed = <T>(f: string): T[] => JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed', f), 'utf8'));
type F = { id: string; nom: string; galleryQueries?: string[]; notableHeroes?: unknown[] };
const FACTIONS = seed<F>('factions.json');
const SUBFACTIONS = seed<{ factionId: string }>('subfactions.json');

/** Pages générales : le libellé du lien doit être le nom de la page, rien de propre à la faction. */
const PAGES: Record<string, string> = {
  '/lore/timeline': 'Chronologie générale',
  '/lore/galaxy': 'Carte de la galaxie',
  '/lore/concepts': 'Concepts et lieux du lore',
  '/romans': 'Tous les romans',
};

async function monter(id: string, override: Partial<F> = {}) {
  const faction = { ...FACTIONS.find(f => f.id === id)!, ...override };
  const service = fakeWarhammerService({
    getFaction: () => of(faction),
    getUnits: () => of([]),
    getSubFactions: () => of(SUBFACTIONS.filter(s => s.factionId === id)),
    videos$: of([]),
    artworks$: of([]),
    getWikiImage: (q: string) => of({ imageUrl: `https://img.test/${encodeURIComponent(q)}.jpg` }),
  });
  await setupTestBed([FactionDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(FactionDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  const bloc = (titre: string) => {
    const sp = [...el.querySelectorAll('aside .sp')].find(s => s.querySelector('h3')?.textContent?.trim() === titre)!;
    return {
      liens: [...sp.querySelectorAll<HTMLAnchorElement>('a.row-link')].map(a => ({
        label: a.querySelector('.rl-label')!.textContent!.trim(),
        href: a.getAttribute('href')!,
      })),
      textes: [...sp.querySelectorAll('.row-link.static .rl-label')].map(x => x.textContent!.trim()),
    };
  };
  return { el, rapides: bloc('Liens rapides'), ressources: bloc('Ressources') };
}

describe('fiche faction : liens latéraux honnêtes (L94)', () => {
  it('R1 — Space Marines : « Chronologie du Chapitre » ne mène plus à la chronologie générale', async () => {
    const { rapides } = await monter('space-marines');
    expect(rapides.liens.find(l => l.label === 'Chronologie du Chapitre')).toBeUndefined();
    const chrono = rapides.liens.find(l => l.href === '/lore/timeline')!;
    expect(chrono.label).toBe('Chronologie générale');
  });

  it('R2 — Space Marines : « Héraldique et symboles » ne mène pas à la liste des chapitres', async () => {
    const { rapides } = await monter('space-marines');
    expect(rapides.liens.find(l => l.label === 'Héraldique et symboles')).toBeUndefined();
    expect(rapides.textes).toContain('Héraldique et symboles');
  });

  it('R3 — Space Marines : un seul lien vers /romans, nommé « Tous les romans »', async () => {
    const { ressources } = await monter('space-marines');
    const romans = ressources.liens.filter(l => l.href === '/romans');
    expect(romans).toEqual([{ label: 'Tous les romans', href: '/romans' }]);
    expect(ressources.liens.find(l => l.label === 'Bibliothèque des archives')).toBeUndefined();
  });

  it('R4 — vignettes Iconographie : galerie filtrée sur la faction, libellé qui le dit', async () => {
    const { el } = await monter('space-marines');
    const cartes = [...el.querySelectorAll<HTMLAnchorElement>('#iconographie a.iconography-card')];
    expect(cartes.length).toBeGreaterThan(0);
    for (const c of cartes) {
      expect(c.getAttribute('href')).toBe('/gallery?faction=space-marines');
      expect(c.getAttribute('aria-label')).toBe('Illustrations Space Marines dans la galerie');
    }
  });

  it('R5 — sans héros, « Personnages célèbres » n\'est pas un lien vers une ancre absente', async () => {
    const { el, rapides } = await monter('space-marines', { notableHeroes: [] });
    expect(el.querySelector('#heros')).toBeNull();
    expect(rapides.liens.some(l => l.href.endsWith('#heros'))).toBe(false);
    expect(rapides.textes).toContain('Personnages célèbres');
  });

  it.each(FACTIONS.map(f => f.id))('R6 — %s : chaque lien latéral mène à ce que dit son libellé', async (id) => {
    const { el, rapides, ressources } = await monter(id);
    for (const bloc of [rapides, ressources]) {
      const hrefs = bloc.liens.map(l => l.href);
      expect(new Set(hrefs).size, `deux liens vers la même destination : ${hrefs}`).toBe(hrefs.length);
      for (const l of bloc.liens) {
        const [chemin, ancre] = l.href.split('#');
        if (ancre) {
          // ancre de la fiche même : la section existe et son titre reprend le sujet du libellé
          const section = el.querySelector(`#${ancre}`);
          expect(section, `${l.label} → #${ancre} absente`).not.toBeNull();
          expect(['heros', 'subfactions']).toContain(ancre);
          if (ancre === 'subfactions') {
            const titre = section!.querySelector('h2')!.textContent!.replace('✠', '').trim().toLowerCase();
            const libelle = l.label.toLowerCase().replace('clans', 'klans');
            expect(libelle, `${l.label} ne nomme pas « ${titre} »`).toContain(titre);
          }
        } else {
          expect(PAGES[chemin], `destination inattendue ${l.href}`).toBeDefined();
          expect(l.label).toBe(PAGES[chemin]);
        }
      }
    }
  });
});

// L237 — un sujet dont la page a déjà son lien n'est plus retiré : il reste en texte simple.
describe('fiche faction : aucun sujet perdu par le dédoublonnage (L237)', () => {
  it('Chaos Space Marines : « Croisades Noires d\'Abaddon » reste, en texte simple, après le lien de « Hérésie d\'Horus »', async () => {
    const { rapides } = await monter('chaos-space-marines');
    expect(rapides.liens.filter(l => l.href === '/lore/timeline')).toEqual([{ label: 'Chronologie générale', href: '/lore/timeline' }]);
    expect(rapides.textes).toContain('Croisades Noires d\'Abaddon');
    expect(rapides.liens.some(l => l.label === 'Croisades Noires d\'Abaddon')).toBe(false);
    // les cinq sujets du seed sont tous à l'écran (lien ou texte)
    expect(rapides.liens.length + rapides.textes.length).toBe(5);
  });

  it.each(FACTIONS.map(f => f.id))('%s : autant de lignes que de sujets distincts dans le seed', async (id) => {
    const brut = FACTIONS.find(f => f.id === id) as F & { liensRapides?: string[]; resources?: string[] };
    const { rapides, ressources } = await monter(id);
    for (const [bloc, sujets] of [[rapides, brut.liensRapides], [ressources, brut.resources]] as const) {
      if (!sujets?.length) continue;
      expect(bloc.liens.length + bloc.textes.length).toBe(new Set(sujets).size);
    }
  });
});
