// L42 — « Galerie » du bloc Médias d'une page faction : /gallery?faction=<id> ouvre la galerie
// filtrée sur cette faction (avant : paramètre ignoré, galerie entière).
// Relecture : le filtre restait collé (/gallery?faction=necrons puis /gallery : toujours Nécrons ;
// choisir « Toutes » laissait ?faction=necrons dans l'adresse) et un identifiant inconnu donnait
// une grille vide sans explication. Le filtre faction suit désormais l'adresse, dans les deux sens.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
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

function service(factions$: Observable<unknown> = of(FACTIONS)) {
  return fakeWarhammerService({
    artworks$: of(ARTWORKS),
    factions$,
    getImageMeta: () => of({}),
    getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
  });
}

/** Routeur réel : /gallery?… → GalleryComponent (réutilisé d'une adresse à l'autre, comme en vrai). */
async function harness(factions$?: Observable<unknown>) {
  await setupTestBed([GalleryComponent], [
    provideRouter([{ path: 'gallery', component: GalleryComponent }]),
    { provide: WarhammerService, useValue: service(factions$) },
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

  it('identifiant connu sans illustration (Grey Knights) : pas de message « inconnue », grille vide expliquée', async () => {
    const { h, go, settle } = await harness();
    const c = await go('/gallery?faction=grey-knights');
    await settle();
    expect(notice(h)).toBeNull();
    expect(ids(c)).toEqual([]);
    expect(h.routeNativeElement!.textContent).toContain('Aucune œuvre ne correspond à ces filtres.');
  });

  it('factions pas encore chargées : aucun message prématuré', async () => {
    const { h, go, settle } = await harness(NEVER);
    await go('/gallery?faction=necron');
    await settle();
    expect(notice(h)).toBeNull();
  });
});
