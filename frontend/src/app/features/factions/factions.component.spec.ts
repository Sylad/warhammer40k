// L39 — 6 des 17 icônes de faction (adresses du wiki Fandom) répondent 404 : la carte montrait
// une image cassée et son texte de remplacement. Une icône qui ne se charge pas cède la place au
// symbole de la faction.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionsComponent } from './factions.component';

const F = (id: string, iconUrl?: string) => ({
  id, nom: id, alignement: 'Imperium', symbole: '✠', description: 'd', couleurThematique: '#123456', iconUrl,
});

describe('liste des factions — icône introuvable (L39)', () => {
  it('l’image en erreur est remplacée par le symbole ; les autres icônes restent', async () => {
    const service = fakeWarhammerService({
      factions$: of([F('a', 'https://example.invalid/a.png'), F('b', 'https://example.invalid/b.png')]),
      getUnits: () => of([]),
    });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const imgs = () => [...el.querySelectorAll<HTMLImageElement>('.card-sigil img')];
    expect(imgs()).toHaveLength(2);
    imgs()[0].dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(imgs().map((i) => i.getAttribute('src'))).toEqual(['https://example.invalid/b.png']);
    expect(el.querySelector('.card-sigil span')?.textContent).toBe('✠');
    // Revue UX L39 : le symbole de repli est décoratif (le nom de la faction est dans la carte).
    expect(el.querySelector('.card-sigil span')?.getAttribute('aria-hidden')).toBe('true');
  });
});

// L87 — les cartes de faction étaient des <article routerLink> : ni focalisables, ni activables au
// clavier (WCAG 2.1.1). Une carte est un vrai lien <a href>.
describe('liste des factions — cartes au clavier (L87)', () => {
  it('chaque carte est un lien <a href> vers la fiche, sans <article> cliquable', async () => {
    const service = fakeWarhammerService({ factions$: of([F('a'), F('b')]), getUnits: () => of([]) });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const cards = [...el.querySelectorAll<HTMLAnchorElement>('a.card')];
    expect(cards.map((c) => c.getAttribute('href'))).toEqual(['/factions/a', '/factions/b']);
    expect(el.querySelector('article.card')).toBeNull();
  });
});

// L92 — « Autres » comparait l'alignement ('Imperium') à des minuscules : tout passait le filtre et
// la liste restait à 17 factions. Le panneau « Filtres rapides » (doublon de la barre) et sa légende
// Loyal/Neutre/Hostile (sans objet) sont retirés.
describe('liste des factions — filtre « Autres » et panneau latéral (L92)', () => {
  const mk = (id: string, alignement: string) => ({ ...F(id), alignement });
  async function monte() {
    const service = fakeWarhammerService({
      factions$: of([mk('a', 'Imperium'), mk('b', 'Chaos'), mk('c', 'Xenos'), mk('d', 'Neutre')]),
      getUnits: () => of([]),
    });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    return f;
  }
  const noms = (el: HTMLElement) => [...el.querySelectorAll('a.card h2')].map((h) => h.textContent?.trim());

  it('« Autres » ne garde que les factions hors Imperium, Chaos et Xénos', async () => {
    const f = await monte();
    const el = f.nativeElement as HTMLElement;
    expect(noms(el)).toHaveLength(4);
    f.componentInstance.filterKey.set('autres');
    f.detectChanges();
    expect(noms(el)).toEqual(['d']);
  });

  it('« Autres » sans résultat affiche un message au lieu d’une grille vide', async () => {
    const f = await monte();
    const el = f.nativeElement as HTMLElement;
    f.componentInstance.filterKey.set('Chaos');
    f.componentInstance.searchQuery.set('zzz');
    f.detectChanges();
    expect(noms(el)).toEqual([]);
    expect(el.querySelector('.empty')?.textContent).toContain('Aucune faction');
  });

  it('le panneau « Filtres rapides » et la légende Loyal/Neutre/Hostile n’existent plus', async () => {
    const f = await monte();
    const el = f.nativeElement as HTMLElement;
    const titres = [...el.querySelectorAll('.side-panel h3')].map((h) => h.textContent?.trim());
    expect(titres).toEqual(['À propos des factions', 'Ressources rapides']);
    expect(el.querySelector('.quick-block, .align-list, .qt')).toBeNull();
    expect(el.textContent).not.toMatch(/Loyal|Hostile/);
  });
});

// L93 — « Ressources rapides » : trois liens (Chronologie, Carte galactique, Concepts), plus de
// « Relations entre factions » ni de ligne cliquable sans destination.
describe('liste des factions — ressources rapides (L93)', () => {
  it('trois liens <a href> vers la chronologie, la carte et les concepts', async () => {
    const service = fakeWarhammerService({ factions$: of([F('a')]), getUnits: () => of([]) });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const liens = [...el.querySelectorAll<HTMLAnchorElement>('.side-panel a.resource-row')];
    expect(liens.map((a) => a.getAttribute('href'))).toEqual(['/lore/timeline', '/lore/galaxy', '/lore/concepts']);
    expect(el.querySelector('div.resource-row')).toBeNull();
    expect(el.textContent).not.toContain('Relations entre factions');
  });
});
