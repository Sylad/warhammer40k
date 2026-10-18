// L145 — Import d'image : ouvre sur l'onglet Wiki, nomme « wiki Warhammer (Fandom) » (pas Wikipedia),
// dit l'échec de Reddit au lieu de « Aucun post avec image », onglets exposés par aria-selected (revue UX L7).
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

async function render(overrides: Record<string, unknown> = {}): Promise<ComponentFixture<GalleryComponent>> {
  polyfillDialog();
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of([]),
        getImageMeta: () => of({}),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
        ...overrides,
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  f.componentInstance.openImport();
  f.detectChanges();
  return f;
}

const doc = (f: ComponentFixture<GalleryComponent>) => f.nativeElement.ownerDocument as Document;
const onglets = (f: ComponentFixture<GalleryComponent>) => Array.from(doc(f).querySelectorAll<HTMLElement>('.import-tabs [role="tab"]'));
const refus = () => throwError(() => new HttpErrorResponse({ status: 502, error: { message: 'Reddit a refusé la requête (HTTP 403)' } }));

describe('galerie — import d\'image (L145)', () => {
  it('R1 — la boîte s\'ouvre sur l\'onglet Wiki sans appeler Reddit', async () => {
    let appels = 0;
    const f = await render({ searchReddit: () => { appels++; return of([]); } });
    const sel = onglets(f).filter(t => t.getAttribute('aria-selected') === 'true');
    expect(sel.map(t => t.textContent!.trim())).toEqual(['⌕ Wiki']);
    expect(doc(f).querySelector('.wiki-search')).not.toBeNull();
    expect(appels).toBe(0);
  });

  it('R1b — rouverte après un passage par Reddit, la boîte revient sur Wiki', async () => {
    const f = await render();
    onglets(f)[1].click();
    f.componentInstance.closeImport();
    f.componentInstance.openImport();
    f.detectChanges();
    expect(onglets(f).map(t => t.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
  });

  it('R2 — le texte d\'aide dit « wiki Warhammer (Fandom) », jamais « Wikipedia »', async () => {
    const f = await render();
    const aide = doc(f).querySelector('.import-box .cat-hint')!.textContent!;
    expect(aide).toContain('wiki Warhammer (Fandom)');
    expect(doc(f).querySelector('.import-box')!.textContent).not.toContain('Wikipedia');
  });

  it('R3 — les trois onglets sont role=tab dans un tablist, un seul aria-selected=true, qui suit le choix', async () => {
    const f = await render();
    expect(doc(f).querySelector('.import-tabs')!.getAttribute('role')).toBe('tablist');
    expect(onglets(f)).toHaveLength(3);
    onglets(f)[2].click();
    f.detectChanges();
    expect(onglets(f).map(t => t.getAttribute('aria-selected'))).toEqual(['false', 'false', 'true']);
    const panneau = doc(f).querySelector('[role="tabpanel"]')!;
    expect(panneau.getAttribute('aria-labelledby')).toBe(onglets(f)[2].id);
  });

  it('R4 — Reddit refusé : le message du serveur s\'affiche en role=alert, pas « Aucun post avec image »', async () => {
    const f = await render({ searchReddit: refus });
    onglets(f)[1].click();
    f.detectChanges();
    const alerte = doc(f).querySelector('.import-box [role="alert"]')!;
    expect(alerte.textContent).toContain('Reddit a refusé la requête (HTTP 403)');
    expect(doc(f).querySelector('.import-box')!.textContent).not.toContain('Aucun post avec image');
    expect(alerte.parentElement!.textContent).toContain('Réessayer');
  });

  it('R5 — Reddit répond sans post : « Aucun post avec image » reste dit, sans alerte', async () => {
    const f = await render({ searchReddit: () => of([]) });
    onglets(f)[1].click();
    f.detectChanges();
    expect(doc(f).querySelector('.import-box')!.textContent).toContain('Aucun post avec image');
    expect(doc(f).querySelector('.import-box [role="alert"]')).toBeNull();
  });

  it('R6 — « Réessayer » efface l\'erreur au profit des posts quand Reddit répond', async () => {
    let ok = false;
    const post = { id: 'a', title: 'Titre', imageUrl: 'https://i.redd.it/a.jpg', permalink: '', author: 'x', upvotes: 1, thumbnail: null, postedAt: 0 };
    const f = await render({ searchReddit: () => (ok ? of([post]) : refus()) });
    onglets(f)[1].click();
    f.detectChanges();
    ok = true;
    f.componentInstance.loadRedditPosts();
    f.detectChanges();
    expect(doc(f).querySelector('.import-box [role="alert"]')).toBeNull();
    expect(doc(f).querySelectorAll('.reddit-card')).toHaveLength(1);
  });
});
