// L48 — cas étroits de la liaison adresse ↔ filtres de la galerie (3e relecture de L42) :
// action pendant une navigation de sortie lente, clic sur « Galerie » pendant l'anti-rebond,
// écho resté armé après une réécriture sans émission, images personnelles en échec, défilement
// conservé au choix d'une faction, et deux chemins de 6da3576 (adresse inchangée, désarmement).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ViewportScroller } from '@angular/common';
import { NavigationEnd, Router, provideRouter, withInMemoryScrolling, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, throwError } from 'rxjs';
import { Component } from '@angular/core';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

@Component({ standalone: true, template: 'autre page' })
class OtherPage {}

const ARTWORKS = [
  { id: 'aw-001', title: 'Ultramarines', artist: 'A', image: 'u.jpg', category: 'Space Marines', faction: 'space-marines', likes: 1 },
  { id: 'aw-n', title: 'Nécron', artist: 'B', image: 'n.jpg', category: 'Xénos', faction: 'necrons', likes: 1 },
];
const FACTIONS = [
  { id: 'space-marines', nom: 'Space Marines' },
  { id: 'necrons', nom: 'Nécrons' },
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setup(routes: Routes, images$: Observable<unknown> = of([]), extra: unknown[] = []) {
  await setupTestBed([GalleryComponent], [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      artworks$: of(ARTWORKS), factions$: of(FACTIONS), images$,
      getImageMeta: () => of({}),
      getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
    }) },
    ...(extra as never[]),
  ]);
  const h = await RouterTestingHarness.create();
  const go = async (url: string) => { const c = await h.navigateByUrl(url, GalleryComponent); h.detectChanges(); return c; };
  const settle = async (ms = 0) => { await wait(ms); h.detectChanges(); };
  return { h, go, settle, router: TestBed.inject(Router) };
}
const GALLERY: Routes = [{ path: 'gallery', component: GalleryComponent }];

describe('galerie — liaison adresse ↔ filtres, cas étroits (L48)', () => {
  // Une action de la page pendant que la navigation de SORTIE charge son morceau : sa réécriture
  // d'adresse supplantait la sortie (clic perdu, utilisateur resté sur /gallery?faction=…).
  function lazyVideos() {
    let release!: () => void;
    const chunk = new Promise<void>((r) => (release = r));
    const routes: Routes = [...GALLERY, { path: 'videos', loadComponent: () => chunk.then(() => OtherPage) }];
    return { routes, release };
  }

  it('R1 — choisir une faction pendant une navigation de sortie lente : la sortie aboutit', async () => {
    const { routes, release } = lazyVideos();
    const { go, router } = await setup(routes);
    const c = await go('/gallery');
    const leaving = router.navigateByUrl('/videos');
    c.onFactionChange('necrons');
    await wait(50);
    release();
    expect(await leaving, 'navigation de sortie supplantée par la réécriture').toBe(true);
    expect(router.url).toBe('/videos');
  });

  it('R1 — « Réinitialiser » pendant une navigation de sortie lente : la sortie aboutit', async () => {
    const { routes, release } = lazyVideos();
    const { go, router } = await setup(routes);
    const c = await go('/gallery?faction=necrons');
    const leaving = router.navigateByUrl('/videos');
    c.resetFilters();
    await wait(50);
    release();
    expect(await leaving).toBe(true);
    expect(router.url).toBe('/videos');
  });

  it('R1 — la sortie annulée (garde) : le choix fait pendant l’attente est écrit dans l’adresse après coup', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const routes: Routes = [...GALLERY, { path: 'videos', component: OtherPage, canActivate: [() => gate.then(() => false)] }];
    const { go, settle, router } = await setup(routes);
    const c = await go('/gallery');
    const leaving = router.navigateByUrl('/videos');
    c.onFactionChange('necrons');
    await wait(50);
    expect(router.url).toBe('/gallery'); // rien n'a été écrit pendant la sortie
    release();
    expect(await leaving).toBe(false);
    await settle(50);
    expect(router.url).toBe('/gallery?faction=necrons');
    expect(c.filterFaction()).toBe('necrons');
  });

  // Clic sur « Galerie » (routerLink="/gallery") alors qu'on est déjà sur /gallery : navigation
  // ignorée, l'anti-rebond restait en attente et écrivait ?q= après le clic.
  it('R2 — taper puis cliquer « Galerie » (adresse déjà /gallery) avant l’anti-rebond : recherche vidée, adresse inchangée', async () => {
    const { go, settle, router } = await setup(GALLERY);
    const c = await go('/gallery');
    c.onSearchChange('abc');
    await router.navigateByUrl('/gallery'); // ignorée par le routeur (même adresse)
    await wait(600);
    await settle();
    expect(router.url).toBe('/gallery');
    expect(c.searchQuery()).toBe('');
  });

  it('R2 — la même chose depuis /gallery?q=ab : « Galerie » retire la recherche et l’anti-rebond est annulé', async () => {
    const { go, settle, router } = await setup(GALLERY);
    const c = await go('/gallery?q=ab');
    c.onSearchChange('abc');
    await router.navigateByUrl('/gallery');
    await wait(600);
    await settle();
    expect(router.url).toBe('/gallery');
    expect(c.searchQuery()).toBe('');
  });

  it('R2 — une navigation ignorée SANS frappe en attente ne touche pas à l’état (filtre non écrit gardé)', async () => {
    const { go, settle, router } = await setup(GALLERY);
    const c = await go('/gallery');
    c.filterCategory.set('Chaos');
    await router.navigateByUrl('/gallery');
    await settle();
    expect(c.filterCategory()).toBe('Chaos');
  });

  // Réécriture qui change l'adresse sans émettre queryParamMap (fragment seul) : l'écho attendu
  // restait armé et avalait une navigation ultérieure aux mêmes q/faction.
  it('R3 — réécriture de fragment seul : l’écho ne reste pas armé', async () => {
    const { go, settle, router } = await setup(GALLERY);
    const c = await go('/gallery?q=abc#x');
    c.onSearchChange('abc'); // même q : la cible /gallery?q=abc diffère de l'adresse par le fragment seul
    await wait(600);
    await settle();
    expect(router.url).toBe('/gallery?q=abc');
    c.onSearchChange('abcd'); // frappe en cours quand une vraie navigation arrive aux mêmes q/faction
    await go('/gallery?q=abc&sort=x');
    expect(c.searchQuery()).toBe('abc');
  });

  // Chemins de 6da3576 : adresse visée = adresse actuelle (aucune navigation) et navigation
  // annulée (écho désarmé).
  it('6da3576 — adresse visée = adresse actuelle, rien en vol : aucune navigation lancée', async () => {
    const { go, settle, router } = await setup(GALLERY);
    const c = await go('/gallery?faction=necrons');
    const nav = vi.spyOn(router, 'navigateByUrl');
    c.filterCategory.set('Chaos');
    c.resetFilters(); // vise /gallery, adresse actuelle /gallery?faction=necrons : navigation attendue
    await settle();
    expect(nav).toHaveBeenCalledTimes(1);
    nav.mockClear();
    c.filterCategory.set('Chaos');
    c.resetFilters(); // maintenant /gallery == adresse actuelle
    await settle();
    expect(nav).not.toHaveBeenCalled();
  });

  it('6da3576 — navigation de réécriture annulée : l’écho est désarmé, une navigation ultérieure s’applique', async () => {
    let blocked = false;
    const routes: Routes = [{ path: 'gallery', component: GalleryComponent, runGuardsAndResolvers: 'always', canActivate: [() => !blocked] }];
    const { h, settle, router } = await setup(routes);
    const c = await h.navigateByUrl('/gallery', GalleryComponent);
    blocked = true;
    c.onFactionChange('necrons'); // garde : refusée, adresse inchangée
    await settle(50);
    expect(router.url).toBe('/gallery');
    blocked = false;
    c.filterFaction.set(''); // l'état revient à l'adresse (aucune écriture : adresse visée = actuelle)
    await router.navigateByUrl('/gallery?faction=necrons');
    expect(c.filterFaction()).toBe('necrons');
  });

  // Images personnelles : un échec était avalé (liste vide, aucun message).
  it('R4 — images personnelles en échec : message annoncé avec « Réessayer », qui relit la source', async () => {
    let calls = 0;
    const images$ = new Observable<string[]>((s) => {
      calls++;
      if (calls === 1) s.error(new Error('500'));
      else { s.next(['perso.jpg']); s.complete(); }
    });
    const { h, go, settle } = await setup(GALLERY, images$);
    const c = await go('/gallery');
    await settle(50);
    const msg = h.routeNativeElement!.querySelector('[data-testid="message-erreur-images"]');
    expect(msg?.textContent).toContain('images personnelles');
    expect(msg?.getAttribute('role')).toBe('alert');
    expect(c.filteredArtworks().map((a) => a.id)).toEqual(['aw-001', 'aw-n']);
    h.routeNativeElement!.querySelector<HTMLButtonElement>('[data-testid="bouton-reessayer-images"]')!.click();
    await settle(50);
    expect(h.routeNativeElement!.querySelector('[data-testid="message-erreur-images"]')).toBeNull();
    expect(c.filteredArtworks().map((a) => a.id)).toEqual(['aw-001', 'aw-n', 'local-0']);
  });

  it('R4 — images personnelles lues : aucun message d’échec', async () => {
    const { h, go, settle } = await setup(GALLERY, of(['perso.jpg']));
    await go('/gallery');
    await settle(50);
    expect(h.routeNativeElement!.querySelector('[data-testid="message-erreur-images"]')).toBeNull();
  });

  // Note UX de L45 : à 390 px, choisir une faction ramenait la page en haut (la navigation
  // d'adresse déclenche scrollPositionRestoration: 'enabled').
  it('R5 — choisir une faction conserve la position de défilement malgré le retour en haut du routeur', async () => {
    const { go, settle, router } = await setup(GALLERY);
    const scroller = TestBed.inject(ViewportScroller);
    let pos: [number, number] = [0, 2993];
    vi.spyOn(scroller, 'getScrollPosition').mockImplementation(() => pos);
    const to = vi.spyOn(scroller, 'scrollToPosition').mockImplementation((p) => { pos = p; });
    const c = await go('/gallery');
    // Le routeur réel (withInMemoryScrolling, absent du TestBed) ramène en haut dans un setTimeout(0) planifié à la fin de la navigation.
    router.events.subscribe((e) => { if (e instanceof NavigationEnd) setTimeout(() => scroller.scrollToPosition([0, 0])); });
    to.mockClear();
    c.onFactionChange('necrons');
    await settle(50);
    expect(to.mock.calls.map((call) => call[0])).toEqual([[0, 0], [0, 2993]]);
  });

  it('R5 — une navigation étrangère ultérieure n’est pas rétablie à l’ancienne position', async () => {
    const routes: Routes = [...GALLERY, { path: 'videos', component: OtherPage }];
    const { go, settle, router } = await setup(routes);
    const scroller = TestBed.inject(ViewportScroller);
    let pos: [number, number] = [0, 2993];
    vi.spyOn(scroller, 'getScrollPosition').mockImplementation(() => pos);
    const to = vi.spyOn(scroller, 'scrollToPosition').mockImplementation((p) => { pos = p; });
    const c = await go('/gallery');
    c.onFactionChange('necrons');
    await settle(50);
    to.mockClear();
    await router.navigateByUrl('/videos');
    await settle(50);
    expect(to).not.toHaveBeenCalled();
  });
});
