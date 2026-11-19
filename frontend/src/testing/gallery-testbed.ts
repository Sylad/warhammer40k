/**
 * L72 — rendu partagé de la galerie pour les tests de composants (TestBed JIT, voir
 * `angular-testbed.ts`). Un seul bouchon de `WarhammerService` et une seule configuration du
 * TestBed, au lieu d'une copie par spec (revue de code de L64).
 *
 * - `renderGallery(svc, query)` : galerie seule, route bouchonnée (paramètres d'adresse figés).
 * - `routedGallery(svc, routes)` : routeur réel, la galerie est montée par `RouterTestingHarness`
 *   (réutilisée d'une adresse à l'autre, comme en vrai).
 *
 * `svc` ne donne que ce que le test veut voir : tout le reste vient de `fakeWarhammerService`
 * (flux vides), avec des métadonnées vides et aucune suggestion de catégorie par défaut.
 */
import { setupTestBed } from './angular-testbed';
import { fakeWarhammerService } from './fake-warhammer-service';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter, type Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { WarhammerService } from '../app/core/services/warhammer.service';
import { GalleryComponent } from '../app/features/gallery/gallery.component';

/** Bouchon du service de la galerie : `overrides` l'emporte sur les valeurs par défaut. */
export function galleryService(overrides: Record<string, unknown> = {}): unknown {
  return fakeWarhammerService({
    getImageMeta: () => of({}),
    getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
    ...overrides,
  });
}

/** Configure le TestBed de la galerie : le service bouchonné et les fournisseurs donnés. */
async function setupGallery(svc: Record<string, unknown>, providers: unknown[]): Promise<void> {
  await setupTestBed([GalleryComponent], [
    ...providers,
    { provide: WarhammerService, useValue: galleryService(svc) },
  ]);
}

/** Galerie rendue sur une route bouchonnée dont l'adresse porte `query` ; premier rendu fait. */
export async function renderGallery(
  svc: Record<string, unknown> = {},
  query: Record<string, string> = {},
): Promise<ComponentFixture<GalleryComponent>> {
  const params = convertToParamMap(query);
  await setupGallery(svc, [
    provideRouter([]),
    { provide: ActivatedRoute, useValue: { queryParamMap: of(params), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: params } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  return f;
}

/** Galerie servie par un routeur réel (`/gallery` par défaut) ; `go` navigue puis rend. */
export async function routedGallery(
  svc: Record<string, unknown> = {},
  routes: Routes = [{ path: 'gallery', component: GalleryComponent }],
) {
  await setupGallery(svc, [provideRouter(routes)]);
  const h = await RouterTestingHarness.create();
  const go = async (url: string) => {
    const c = await h.navigateByUrl(url, GalleryComponent);
    h.detectChanges();
    return c;
  };
  const settle = async (ms = 0) => {
    await new Promise((r) => setTimeout(r, ms));
    h.detectChanges();
  };
  return { h, go, settle, router: TestBed.inject(Router) };
}
