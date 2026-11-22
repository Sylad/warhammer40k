// L39 — 6 des 17 icônes de faction (adresses du wiki Fandom) répondent 404 : la carte montrait
// une image cassée et son texte de remplacement. Une icône qui ne se charge pas cède la place au
// symbole de la faction.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, defer, of, throwError } from 'rxjs';
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
    expect(el.querySelector('[data-testid="filtres-vides"]')?.textContent).toContain('Aucune faction');
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

// L102 — « Autres » n'apparaît que si une faction y entre (décision de Sylvain, 11-10).
// L96 — chaque état a son affichage : chargement (région live + cartes fantômes), erreur (alerte +
// « Réessayer »), recherche vide (« Effacer les filtres » comme /videos L242), et une région live
// role=status qui annonce le nombre de résultats.
describe('liste des factions — « Autres » conditionnel et états de la liste (L102, L96)', () => {
  async function monte(alignements: string[]) {
    const service = fakeWarhammerService({
      factions$: of(alignements.map((a, i) => ({ ...F('f' + i), alignement: a }))),
      getUnits: () => of([]),
    });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    return f;
  }
  const filtres = (el: HTMLElement) => [...el.querySelectorAll('.filters .filter')].map((b) => b.textContent?.trim());
  const statut = (el: HTMLElement) => el.querySelector('[role="status"]')!;

  it('sans faction hors Imperium, Chaos et Xénos, le bouton « Autres » est absent', async () => {
    const f = await monte(['Imperium', 'Chaos', 'Xenos']);
    expect(filtres(f.nativeElement)).toEqual(['Toutes les factions', 'Imperium', 'Chaos', 'Xénos']);
  });

  it('dès qu’une faction y entre, le bouton « Autres » apparaît', async () => {
    const f = await monte(['Imperium', 'Neutre']);
    expect(filtres(f.nativeElement)).toContain('Autres');
  });

  it('une seule région role=status, qui annonce le nombre de résultats à chaque filtre', async () => {
    const f = await monte(['Imperium', 'Chaos', 'Chaos']);
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelectorAll('[role="status"]')).toHaveLength(1);
    const status = statut(el);
    expect(status.textContent?.trim()).toBe('3 factions');
    f.componentInstance.filterKey.set('Imperium');
    f.detectChanges();
    expect(statut(el)).toBe(status);
    expect(status.textContent?.trim()).toBe('1 faction');
    f.componentInstance.searchQuery.set('zzz');
    f.detectChanges();
    expect(statut(el)).toBe(status);
    expect(status.textContent?.trim()).toBe('Aucune faction');
  });

  it('recherche sans résultat : message qui nomme la recherche et le filtre, bouton « Effacer les filtres »', async () => {
    const f = await monte(['Imperium', 'Chaos']);
    const el = f.nativeElement as HTMLElement;
    f.componentInstance.filterKey.set('Chaos');
    f.componentInstance.searchQuery.set('zzz');
    f.detectChanges();
    const vide = el.querySelector('[data-testid="filtres-vides"]')!;
    expect(vide.textContent).toContain('Aucune faction ne correspond à la recherche « zzz » et le filtre Chaos');
    const bouton = vide.querySelector<HTMLButtonElement>('button')!;
    expect(bouton.textContent?.trim()).toBe('Effacer les filtres');
    bouton.click();
    f.detectChanges();
    expect(f.componentInstance.filterKey()).toBe('all');
    expect(f.componentInstance.searchQuery()).toBe('');
    expect(el.querySelectorAll('a.card')).toHaveLength(2);
    expect(el.querySelector('[data-testid="filtres-vides"]')).toBeNull();
    expect(statut(el).textContent?.trim()).toBe('2 factions');
  });

  // WCAG 2.4.3 : le bouton disparaît à son propre clic ; le focus va au premier résultat revenu, jamais sur <body>.
  it('après « Effacer les filtres », le focus est sur la première carte revenue', async () => {
    const f = await monte(['Imperium', 'Chaos']);
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    f.componentInstance.searchQuery.set('zzz');
    f.detectChanges();
    const bouton = el.querySelector<HTMLButtonElement>('[data-testid="effacer-etat-vide"]')!;
    bouton.focus();
    bouton.click();
    f.detectChanges();
    await f.whenStable();
    TestBed.tick();
    expect(document.activeElement).toBe(el.querySelector('a.card'));
    el.remove();
  });

  // jsdom ne charge pas les styles : on lit la feuille. Une région live en display:none est hors de
  // l'arbre d'accessibilité ; quand elle apparaît avec son texte, l'annonce n'est pas fiable.
  it('la région role=status n\'est jamais en display:none', async () => {
    const scss = readFileSync(resolve(__dirname, 'factions.component.scss'), 'utf8');
    expect(scss).not.toMatch(/\.results-count(:empty)?\s*\{[^}]*display:\s*none/);
  });

  // Revue de la vague 2026-10-11-0935 : avant la réponse de /api/factions (ou en cas d'erreur) la
  // liste est vide sans que le filtre y soit pour rien ; le bouton de retour serait inopérant.
  async function monteAvec(factions$: import('rxjs').Observable<ReturnType<typeof F>[]>) {
    const service = fakeWarhammerService({ factions$, getUnits: () => of([]) });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    return f;
  }

  it('pendant le chargement : région live « Chargement des factions… », cartes fantômes cachées, ni « Aucune faction » ni bouton', async () => {
    const flux = new Subject<ReturnType<typeof F>[]>();
    const f = await monteAvec(flux);
    const el = f.nativeElement as HTMLElement;
    expect(statut(el).textContent?.trim()).toBe('Chargement des factions…');
    const fantomes = el.querySelector('[data-testid="chargement-factions"]')!;
    expect(fantomes.getAttribute('aria-hidden')).toBe('true');
    expect(fantomes.querySelectorAll('.card-fantome').length).toBeGreaterThan(0);
    expect(el.textContent).not.toContain('Aucune faction');
    expect(el.querySelector('.results button')).toBeNull();
    expect(el.querySelector('.results')?.getAttribute('aria-busy')).toBe('true');
    flux.next([F('a'), F('b')]);
    flux.complete();
    f.detectChanges();
    expect(el.querySelectorAll('a.card')).toHaveLength(2);
    expect(el.querySelector('[data-testid="chargement-factions"]')).toBeNull();
    expect(statut(el).textContent?.trim()).toBe('2 factions');
    expect(el.querySelector('.results')?.getAttribute('aria-busy')).toBe('false');
  });

  it('chargement terminé sans aucune faction : « Le codex ne contient encore aucune faction », sans bouton de filtre', async () => {
    const f = await monteAvec(of([]));
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="catalogue-vide"]')?.textContent).toContain('aucune faction');
    expect(el.querySelector('[data-testid="effacer-etat-vide"]')).toBeNull();
  });

  it('en cas d’erreur de /api/factions : alerte avec « Réessayer », ni « Aucune faction » ni cartes', async () => {
    const f = await monteAvec(throwError(() => new Error('500')));
    const el = f.nativeElement as HTMLElement;
    const alerte = el.querySelector('[role="alert"]')!;
    expect(alerte.textContent).toContain('n’ont pas pu être chargées');
    expect(alerte.querySelector('button')?.textContent?.trim()).toBe('Réessayer');
    expect(el.textContent).not.toContain('Aucune faction');
    expect(el.querySelectorAll('a.card, .card-fantome')).toHaveLength(0);
    expect(statut(el).textContent?.trim()).toBe('');
  });

  it('« Réessayer » relance /api/factions et /api/units ; le bouton reste en place, inactif, pendant l’essai ; au succès le focus va à la première carte', async () => {
    let appelsFactions = 0;
    let appelsUnits = 0;
    let reponse: Subject<ReturnType<typeof F>[]> | null = null;
    const factions$ = defer(() => {
      appelsFactions++;
      if (appelsFactions === 1) return throwError(() => new Error('500'));
      reponse = new Subject<ReturnType<typeof F>[]>();
      return reponse;
    });
    const service = fakeWarhammerService({ factions$, getUnits: () => defer(() => { appelsUnits++; return of([]); }) });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const bouton = el.querySelector<HTMLButtonElement>('[data-testid="bouton-reessayer"]')!;
    bouton.focus();
    bouton.click();
    f.detectChanges();
    expect(appelsFactions).toBe(2);
    expect(appelsUnits).toBe(2);
    expect(el.querySelector('[data-testid="bouton-reessayer"]')).toBe(bouton);
    expect(bouton.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(bouton);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Nouvel essai');
    reponse!.next([F('a'), F('b')]);
    reponse!.complete();
    f.detectChanges();
    await f.whenStable();
    TestBed.tick();
    expect(el.querySelector('[role="alert"]')).toBeNull();
    expect(el.querySelectorAll('a.card')).toHaveLength(2);
    expect(document.activeElement).toBe(el.querySelector('a.card'));
    el.remove();
  });

  it('« Réessayer » qui échoue encore : même bouton, actif de nouveau, focus gardé', async () => {
    const service = fakeWarhammerService({ factions$: throwError(() => new Error('500')), getUnits: () => of([]) });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const bouton = el.querySelector<HTMLButtonElement>('[data-testid="bouton-reessayer"]')!;
    bouton.focus();
    bouton.click();
    f.detectChanges();
    await f.whenStable();
    TestBed.tick();
    f.detectChanges();
    expect(el.querySelector('[data-testid="bouton-reessayer"]')).toBe(bouton);
    expect(bouton.getAttribute('aria-disabled')).toBeNull();
    expect(document.activeElement).toBe(bouton);
    el.remove();
  });

  it('/api/units en cours : « — » à la place du compte, jamais « 0 » ; puis le nombre', async () => {
    const units = new Subject<{ id: string; factionId: string }[]>();
    const service = fakeWarhammerService({ factions$: of([F('a'), F('b')]), getUnits: () => units });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const comptes = () => Array.from(el.querySelectorAll('.units-count strong')).map(x => x.textContent?.trim());
    expect(comptes()).toEqual(['—', '—']);
    units.next([{ id: 'u1', factionId: 'a' }]);
    units.complete();
    f.detectChanges();
    expect(comptes()).toEqual(['1', '0']);
  });

  it('/api/units en erreur : les cartes s’affichent quand même avec « — » à la place du compte (jamais un faux « 0 »)', async () => {
    const service = fakeWarhammerService({ factions$: of([F('a'), F('b')]), getUnits: () => throwError(() => new Error('500')) });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelectorAll('a.card')).toHaveLength(2);
    const comptes = Array.from(el.querySelectorAll('.units-count strong')).map(x => x.textContent?.trim());
    expect(comptes).toEqual(['—', '—']);
    expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe('2 factions');
  });

  it('/api/units répond : les comptes restent des nombres', async () => {
    const f = await monteAvec(of([F('a')]));
    expect((f.nativeElement as HTMLElement).querySelector('.units-count strong')?.textContent?.trim()).toBe('0');
  });

  it('les deux appels en erreur : le message d’erreur des factions s’affiche', async () => {
    const service = fakeWarhammerService({ factions$: throwError(() => new Error('500')), getUnits: () => throwError(() => new Error('500')) });
    await setupTestBed([FactionsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service }]);
    const f = TestBed.createComponent(FactionsComponent);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('n’ont pas pu être chargées');
  });

  it('la région de statut est hors de la grille (pas d’écart de 18 px sous la dernière carte)', async () => {
    const f = await monte(['Imperium']);
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('.grid [role="status"]')).toBeNull();
    expect(el.querySelector('[role="status"]')).not.toBeNull();
  });
});
