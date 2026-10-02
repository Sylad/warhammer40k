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
import { NEVER, of, type Observable } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

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
const notice = (h: RouterTestingHarness) => h.routeNativeElement!.querySelector('[data-testid="faction-inconnue"]');

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
    const nav = vi.spyOn(router, 'navigate');
    vi.useFakeTimers();
    try {
      for (const q of ['E', 'Ei', 'Eis']) { c.onSearchChange(q); vi.advanceTimersByTime(100); }
      expect(nav).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(nav).toHaveBeenCalledTimes(1);
      expect(nav.mock.calls[0][1]).toMatchObject({ queryParams: { q: 'Eis' }, replaceUrl: true });
    } finally {
      vi.useRealTimers();
    }
    await settle();
    expect(router.url).toBe('/gallery?q=Eis');
    expect(c.searchQuery()).toBe('Eis');
  });

  it('saisie puis départ de la page avant l’anti-rebond : aucune navigation de retour vers la galerie', async () => {
    const { h, go, router } = await harness();
    const c = await go('/gallery');
    const nav = vi.spyOn(router, 'navigate');
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

  it('identifiant inconnu : message visible qui le nomme, galerie entière affichée, liste sur « Toutes »', async () => {
    const { h, go, settle, router } = await harness();
    const c = await go('/gallery?faction=necron');
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

  it('factions pas encore chargées : aucun message prématuré', async () => {
    const { h, go, settle } = await harness(NEVER);
    await go('/gallery?faction=necron');
    await settle();
    expect(notice(h)).toBeNull();
  });
});
