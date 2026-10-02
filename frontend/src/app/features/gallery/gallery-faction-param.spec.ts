// L42 — « Galerie » du bloc Médias d'une page faction : /gallery?faction=<id> ouvre la galerie
// filtrée sur cette faction (avant : paramètre ignoré, galerie entière).
// Relecture : le filtre restait collé (/gallery?faction=necrons puis /gallery : toujours Nécrons ;
// choisir « Toutes » laissait ?faction=necrons dans l'adresse) et un identifiant inconnu donnait
// une grille vide sans explication. Le filtre faction suit désormais l'adresse, dans les deux sens.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { NEVER, Subject, of, throwError, type Observable } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';
import { Component } from '@angular/core';

@Component({ standalone: true, template: 'autre page' })
class OtherPage {}

const ARTWORKS = [
  { id: 'aw-001', title: 'Ultramarines', artist: 'A', image: 'u.jpg', category: 'Space Marines', faction: 'space-marines', likes: 1 },
  { id: 'aw-n', title: 'Nécron', artist: 'B', image: 'n.jpg', category: 'Xénos', faction: 'necrons', likes: 1 },
];
const FACTIONS = [
  { id: 'space-marines', nom: 'Space Marines' },
  { id: 'necrons', nom: 'Nécrons' },
  { id: 'grey-knights', nom: 'Grey Knights' },
];

function service(factions$: Observable<unknown> = of(FACTIONS), artworks$: Observable<unknown> = of(ARTWORKS)) {
  return fakeWarhammerService({
    artworks$,
    factions$,
    getImageMeta: () => of({}),
    getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
  });
}

/** Routeur réel : /gallery?… → GalleryComponent (réutilisé d'une adresse à l'autre, comme en vrai). */
async function harness(factions$?: Observable<unknown>, artworks$?: Observable<unknown>) {
  await setupTestBed([GalleryComponent], [
    provideRouter([{ path: 'gallery', component: GalleryComponent }]),
    { provide: WarhammerService, useValue: service(factions$, artworks$) },
  ]);
  const h = await RouterTestingHarness.create();
  const go = async (url: string) => {
    const c = await h.navigateByUrl(url, GalleryComponent);
    h.detectChanges();
    return c;
  };
  const settle = async () => {
    await new Promise((r) => setTimeout(r));
    h.detectChanges();
  };
  return { h, go, settle, router: TestBed.inject(Router) };
}

const ids = (c: GalleryComponent) => c.filteredArtworks().map((a) => a.id);
/** Région d'état de la galerie (toujours présente, L42 R5) ; null tant qu'elle est vide. */
const region = (h: RouterTestingHarness) => h.routeNativeElement!.querySelector<HTMLElement>('[data-testid="faction-status"]');
const notice = (h: RouterTestingHarness) => {
  const r = region(h);
  return r && r.textContent!.trim() ? r : null;
};
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('galerie — filtre faction par l’adresse (L42)', () => {
  it('/gallery?faction=necrons : seules les illustrations Nécrons', async () => {
    const svc = service();
    await setupTestBed([GalleryComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: svc },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({ faction: 'necrons' })), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({ faction: 'necrons' }) } } },
    ]);
    const f = TestBed.createComponent(GalleryComponent);
    f.detectChanges();
    const c = f.componentInstance;
    expect(c.filterFaction()).toBe('necrons');
    expect(c.filteredArtworks().map((a) => a.id)).toEqual(['aw-n']);
  });

  it('le filtre suit l’adresse : /gallery?faction=necrons puis /gallery → plus de filtre (même composant)', async () => {
    const { go } = await harness();
    const c = await go('/gallery?faction=necrons');
    expect(ids(c)).toEqual(['aw-n']);
    const again = await go('/gallery');
    expect(again).toBe(c); // réutilisé : c'est là que le filtre restait collé
    expect(c.filterFaction()).toBe('');
    expect(ids(c)).toEqual(['aw-001', 'aw-n']);
    expect((await go('/gallery?faction=space-marines')).filteredArtworks().map((a) => a.id)).toEqual(['aw-001']);
  });

  it('l’adresse suit le filtre : choisir une faction, « Toutes », puis « Réinitialiser » réécrivent ?faction=', async () => {
    const { go, settle, router } = await harness();
    const c = await go('/gallery?faction=necrons&q=x');
    c.onFactionChange('');
    await settle();
    expect(router.url).toBe('/gallery?q=x');
    expect(c.filterFaction()).toBe('');
    c.onFactionChange('space-marines');
    await settle();
    expect(router.url).toBe('/gallery?q=x&faction=space-marines');
    expect(c.filterFaction()).toBe('space-marines');
    c.resetFilters();
    await settle();
    expect(router.url).not.toContain('faction=');
    expect(c.filterFaction()).toBe('');
  });

  // Relecture de code : « Réinitialiser » vidait la recherche, la fusion d'adresse gardait ?q=x et
  // l'abonnement la ressuscitait ; idem en changeant de faction après avoir tapé. ?q= suit
  // désormais la même règle que ?faction= : adresse ↔ état, dans les deux sens.
  it('cas A : /gallery?q=x&faction=necrons, « Réinitialiser » → recherche vide ET adresse /gallery, en un clic', async () => {
    const { go, settle, router } = await harness();
    const c = await go('/gallery?q=x&faction=necrons');
    expect(c.searchQuery()).toBe('x');
    c.resetFilters();
    await settle();
    expect(c.searchQuery()).toBe('');
    expect(c.filterFaction()).toBe('');
    expect(router.url).toBe('/gallery');
  });

  it('cas B : /gallery?q=x, taper « y », choisir une faction → la recherche reste « y », adresse ?q=y&faction=…', async () => {
    const { go, settle, router } = await harness();
    const c = await go('/gallery?q=x');
    c.onSearchChange('y');
    c.onFactionChange('necrons');
    await settle();
    expect(c.searchQuery()).toBe('y');
    expect(router.url).toBe('/gallery?q=y&faction=necrons');
  });

  it('adresse sans ?q= → recherche vide (même composant) ; ?search= reste lu, et réécrit en ?q=', async () => {
    const { go, settle, router } = await harness();
    const c = await go('/gallery?q=x');
    await go('/gallery');
    expect(c.searchQuery()).toBe('');
    await go('/gallery?search=Eisenhorn');
    expect(c.searchQuery()).toBe('Eisenhorn');
    c.onFactionChange('inquisition');
    await settle();
    expect(router.url).toBe('/gallery?faction=inquisition&q=Eisenhorn');
  });

  it('saisie : une seule réécriture de l’adresse après la frappe (anti-rebond), historique remplacé', async () => {
    const { go, settle, router } = await harness();
    const c = await go('/gallery');
    const nav = vi.spyOn(router, 'navigateByUrl');
    vi.useFakeTimers();
    try {
      for (const q of ['E', 'Ei', 'Eis']) { c.onSearchChange(q); vi.advanceTimersByTime(100); }
      expect(nav).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(nav).toHaveBeenCalledTimes(1);
      expect(router.serializeUrl(nav.mock.calls[0][0] as never)).toBe('/gallery?q=Eis');
      expect(nav.mock.calls[0][1]).toMatchObject({ replaceUrl: true });
    } finally {
      vi.useRealTimers();
    }
    await settle();
    expect(router.url).toBe('/gallery?q=Eis');
    expect(c.searchQuery()).toBe('Eis');
  });

  // 2e relecture de code : l'écho de notre propre réécriture n'était couvert par aucun test.
  it('écho de sa propre réécriture ignoré : « ab » écrit dans l’adresse, « abc » tapé avant qu’elle aboutisse → reste « abc », adresse finale ?q=abc', async () => {
    const { go, settle, router } = await harness();
    const c = await go('/gallery');
    vi.useFakeTimers();
    try {
      c.onSearchChange('ab');
      vi.advanceTimersByTime(400); // la réécriture ?q=ab part
    } finally {
      vi.useRealTimers();
    }
    c.onSearchChange('abc'); // avant qu'elle aboutisse (même tâche, minuteur réel)
    await settle(); // l'écho ?q=ab arrive
    expect(router.url).toBe('/gallery?q=ab');
    expect(c.searchQuery()).toBe('abc');
    await wait(500);
    await settle();
    expect(c.searchQuery()).toBe('abc');
    expect(router.url).toBe('/gallery?q=abc');
  });

  // 2e relecture de code : réécriture vers l'adresse ACTUELLE (« Réinitialiser » avec seulement une
  // catégorie) → le routeur ignore la navigation, l'écho attendu restait armé et avalait plus tard
  // une vraie navigation aux mêmes q/faction.
  it('« Réinitialiser » sans changement d’adresse : une navigation ultérieure aux mêmes q/faction s’applique', async () => {
    const { go, settle, router } = await harness();
    const c = await go('/gallery');
    c.filterCategory.set('Chaos');
    c.resetFilters(); // même adresse : /gallery
    await settle();
    expect(router.url).toBe('/gallery');
    c.onSearchChange('zz'); // frappe, puis l'adresse change d'ailleurs (q et faction absents)
    await go('/gallery?sort=x');
    expect(c.searchQuery()).toBe('');
  });

  it('saisie puis départ de la page avant l’anti-rebond : aucune navigation de retour vers la galerie', async () => {
    const { h, go, router } = await harness();
    const c = await go('/gallery');
    const nav = vi.spyOn(router, 'navigateByUrl');
    vi.useFakeTimers();
    try {
      c.onSearchChange('abc');
      h.fixture.destroy();
      vi.advanceTimersByTime(2000);
      expect(nav).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  // 2e relecture de code : un anti-rebond en attente supplantait une navigation de SORTIE encore en
  // vol (route en chargement différé) — l'utilisateur restait sur /gallery?q=abc, son clic perdu.
  it('frappe puis clic vers une page en chargement différé : l’anti-rebond ne supplante pas la navigation de sortie', async () => {
    let release!: () => void;
    const chunk = new Promise<void>((r) => (release = r));
    await setupTestBed([GalleryComponent], [
      provideRouter([
        { path: 'gallery', component: GalleryComponent },
        { path: 'videos', loadComponent: () => chunk.then(() => OtherPage) },
      ]),
      { provide: WarhammerService, useValue: service() },
    ]);
    const h = await RouterTestingHarness.create();
    const c = await h.navigateByUrl('/gallery', GalleryComponent);
    const router = TestBed.inject(Router);
    c.onSearchChange('abc');
    const leaving = router.navigateByUrl('/videos'); // clic : le morceau de la page n'est pas chargé
    await wait(600); // l'anti-rebond (400 ms) tombe pendant le chargement
    release();
    expect(await leaving, 'navigation de sortie supplantée').toBe(true);
    expect(router.url).toBe('/videos');
  });

  // 2e relecture de code : une faction peut n'être valide (ou illustrée) QUE par les images perso
  // (images$ + getImageMeta(), faction en texte libre de la modale « Catégoriser »). Factions
  // arrivées avant elles → « Faction inconnue » annoncé à tort, ou « Aucune illustration » à tort.
  async function withSources(images$: Observable<unknown>, meta$: Observable<unknown>) {
    await setupTestBed([GalleryComponent], [
      provideRouter([{ path: 'gallery', component: GalleryComponent }]),
      { provide: WarhammerService, useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS), factions$: of(FACTIONS), images$,
        getImageMeta: () => meta$,
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
      }) },
    ]);
    const h = await RouterTestingHarness.create();
    const go = async (url: string) => { const c = await h.navigateByUrl(url, GalleryComponent); h.detectChanges(); return c; };
    const settle = async (ms = 0) => { await wait(ms); h.detectChanges(); };
    return { h, go, settle };
  }

  it('faction perso (« Foo », images perso seulement) : rien d’annoncé tant que images et métadonnées ne sont pas là, puis filtre appliqué', async () => {
    const images$ = new Subject<string[]>();
    const meta$ = new Subject<Record<string, unknown>>();
    const { h, go, settle } = await withSources(images$, meta$);
    const c = await go('/gallery?faction=Foo');
    await settle(250);
    expect(notice(h), '« Faction inconnue » annoncé avant les images perso').toBeNull();
    images$.next(['foo.jpg']);
    await settle(50);
    expect(notice(h), '« Faction inconnue » annoncé avant les métadonnées').toBeNull();
    meta$.next({ 'foo.jpg': { categories: [], faction: 'Foo' } });
    await settle(50);
    expect(notice(h)).toBeNull();
    expect(ids(c)).toEqual(['local-0']);
  });

  it('faction du codex illustrée seulement par une image perso : pas de « Aucune illustration » prématuré', async () => {
    const images$ = new Subject<string[]>();
    const meta$ = new Subject<Record<string, unknown>>();
    const { h, go, settle } = await withSources(images$, meta$);
    const c = await go('/gallery?faction=grey-knights');
    await settle(250);
    expect(h.routeNativeElement!.textContent).not.toContain('Aucune illustration de la faction');
    images$.next(['gk.jpg']);
    meta$.next({ 'gk.jpg': { categories: [], faction: 'grey-knights' } });
    await settle(50);
    expect(h.routeNativeElement!.textContent).not.toContain('Aucune illustration de la faction');
    expect(ids(c)).toEqual(['local-0']);
  });

  it('images perso et métadonnées en échec : les messages finissent par s’afficher (une source en échec ne bloque pas)', async () => {
    const { h, go, settle } = await withSources(throwError(() => new Error('500')), throwError(() => new Error('500')));
    await go('/gallery?faction=Foo');
    await settle(250);
    expect(notice(h)?.textContent).toContain('« Foo »');
    await go('/gallery?faction=grey-knights');
    await settle(50);
    expect(h.routeNativeElement!.textContent).toContain('Aucune illustration de la faction Grey Knights');
  });

  it('identifiant inconnu : message visible qui le nomme, galerie entière affichée, liste sur « Toutes »', async () => {
    const { h, go, settle, router } = await harness();
    const c = await go('/gallery?faction=necron');
    await wait(200);
    await settle();
    const el = notice(h);
    expect(el, 'message « faction inconnue » absent').not.toBeNull();
    expect(el!.getAttribute('role')).toBe('status');
    expect(el!.textContent).toContain('« necron »');
    expect(ids(c)).toEqual(['aw-001', 'aw-n']);
    const select = h.routeNativeElement!.querySelector<HTMLSelectElement>('.filter-row select')!;
    expect(select.value).toBe('');
    // Le bouton du message retire le paramètre.
    el!.querySelector('button')!.click();
    await settle();
    expect(router.url).toBe('/gallery');
    expect(notice(h)).toBeNull();
  });

  // Revue UX R3 : Grey Knights (connue, sans illustration) → liste vide (ses options ne
  // viennent que des illustrations) et message générique. Désormais : nom lisible et message dédié.
  it('identifiant connu sans illustration (Grey Knights) : liste sur « Grey Knights », message qui nomme la faction, bouton pour sortir', async () => {
    const { h, go, settle, router } = await harness();
    const c = await go('/gallery?faction=grey-knights');
    await settle();
    expect(notice(h)).toBeNull();
    expect(ids(c)).toEqual([]);
    const select = h.routeNativeElement!.querySelector<HTMLSelectElement>('.filter-row select')!;
    expect(select.value).toBe('grey-knights');
    expect(select.selectedOptions[0]?.textContent?.trim()).toBe('Grey Knights');
    const text = h.routeNativeElement!.textContent!;
    expect(text).toContain('Aucune illustration de la faction Grey Knights pour l’instant.');
    expect(text).not.toContain('Aucune œuvre ne correspond à ces filtres.');
    const out = [...h.routeNativeElement!.querySelectorAll('button')].find((b) => b.textContent!.trim() === 'Retirer ce filtre');
    expect(out, 'bouton « Retirer ce filtre » absent').toBeDefined();
    out!.click();
    await settle();
    expect(router.url).toBe('/gallery');
    expect(ids(c)).toEqual(['aw-001', 'aw-n']);
  });

  it('faction active affichée par son nom lisible dans la liste (Nécrons)', async () => {
    const { h, go, settle } = await harness();
    await go('/gallery?faction=necrons');
    await settle();
    const select = h.routeNativeElement!.querySelector<HTMLSelectElement>('.filter-row select')!;
    expect(select.value).toBe('necrons');
    expect(select.selectedOptions[0]?.textContent?.trim()).toBe('Nécrons');
  });

  it('illustrations pas encore chargées : pas de « aucune illustration » prématuré', async () => {
    const { h, go, settle } = await harness(undefined, NEVER);
    await go('/gallery?faction=grey-knights');
    await settle();
    expect(h.routeNativeElement!.textContent).not.toContain('Aucune illustration de la faction');
  });

  // Revue UX R5 (WCAG 4.1.3) : la région role=status naissait AVEC son texte — beaucoup de
  // lecteurs d'écran ne l'annoncent pas. Elle est désormais là dès le premier rendu, vide, et le
  // texte y entre après coup, même quand les factions sont déjà en cache (cas le plus dur).
  it('identifiant inconnu : région d’état présente et vide au premier rendu, texte inséré ensuite dans le MÊME élément', async () => {
    const { h, go, settle } = await harness();
    await go('/gallery?faction=necron');
    const first = region(h);
    expect(first, 'région d’état absente au premier rendu').not.toBeNull();
    expect(first!.getAttribute('role')).toBe('status');
    expect(first!.textContent!.trim()).toBe('');
    await wait(200);
    await settle();
    expect(region(h)).toBe(first);
    expect(first!.textContent).toContain('« necron »');
  });

  it('factions pas encore chargées : aucun message prématuré', async () => {
    const { h, go, settle } = await harness(NEVER);
    await go('/gallery?faction=necron');
    await settle();
    expect(notice(h)).toBeNull();
  });
});
