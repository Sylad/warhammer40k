// L144 — Galerie : l'édition (« + Importer », « Catégoriser ») est derrière le PIN comme Vidéos, avec un bouton
// « Mode édition » (aria-pressed) en pied de page ; l'échec de « Enregistrer » est dit (décision de Sylvain, revue UX L7 du 18-10).
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { PinService } from '../../core/services/pin.service';
import { GalleryComponent } from './gallery.component';

const PERSO = { id: 'p', title: 'Perso', artist: 'Moi', image: 'perso.jpg', category: 'Imperium', isLocal: true, likes: 0 };

async function render(overrides: Record<string, unknown> = {}): Promise<ComponentFixture<GalleryComponent>> {
  polyfillDialog();
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of([PERSO]),
        getImageMeta: () => of({}),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [] }),
        ...overrides,
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  TestBed.inject(PinService).clear();
  const f = TestBed.createComponent(GalleryComponent);
  f.detectChanges();
  return f;
}

const racine = (f: ComponentFixture<GalleryComponent>) => f.nativeElement as HTMLElement;
const importer = (f: ComponentFixture<GalleryComponent>) => racine(f).querySelector('.import-btn-hero:not(.btn-filtres)');
const bascule = (f: ComponentFixture<GalleryComponent>) => racine(f).querySelector<HTMLButtonElement>('footer .edit-toggle')!;
function ouvrirVisionneuse(f: ComponentFixture<GalleryComponent>) {
  f.componentInstance.selectedArt.set(PERSO as never);
  f.detectChanges();
}
const catBtn = (f: ComponentFixture<GalleryComponent>) =>
  Array.from(racine(f).ownerDocument.querySelectorAll<HTMLElement>('.vi-btn')).find(b => b.textContent!.includes('Catégoriser'));

afterEach(() => vi.restoreAllMocks());

describe('galerie — édition derrière le PIN (L144)', () => {
  it('R1 — sans PIN, « + Importer » et « Catégoriser » sont absents et le pied de page offre « Mode édition » (aria-pressed=false)', async () => {
    const f = await render();
    ouvrirVisionneuse(f);
    expect(importer(f)).toBeNull();
    expect(catBtn(f)).toBeUndefined();
    expect(bascule(f).textContent!.trim()).toBe('Mode édition');
    expect(bascule(f).getAttribute('aria-pressed')).toBe('false');
  });

  it('R2 — avec un PIN, « + Importer » et « Catégoriser » apparaissent et le bouton passe à aria-pressed=true, « Quitter l\'édition »', async () => {
    const f = await render();
    TestBed.inject(PinService).set('1234');
    ouvrirVisionneuse(f);
    expect(importer(f)).not.toBeNull();
    expect(catBtn(f)).toBeDefined();
    expect(bascule(f).getAttribute('aria-pressed')).toBe('true');
    expect(bascule(f).textContent!.trim()).toBe('Quitter l’édition');
  });

  it('R3 — « Mode édition » demande le PIN ; refusé (annulé), l\'édition reste fermée ; « Quitter l\'édition » oublie le PIN', async () => {
    const f = await render();
    vi.spyOn(window, 'prompt').mockReturnValueOnce(null);
    bascule(f).click();
    f.detectChanges();
    expect(importer(f)).toBeNull();
    vi.spyOn(window, 'prompt').mockReturnValueOnce('1234');
    bascule(f).click();
    f.detectChanges();
    expect(importer(f)).not.toBeNull();
    bascule(f).click();
    f.detectChanges();
    expect(importer(f)).toBeNull();
    expect(TestBed.inject(PinService).pin()).toBeNull();
  });

  it('R4 — « Enregistrer » refusé (401, PIN annulé ou erroné) : la boîte reste ouverte et dit l\'échec dans une région role=alert', async () => {
    const f = await render({ saveImageMeta: () => throwError(() => ({ status: 401 })) });
    TestBed.inject(PinService).set('1234');
    ouvrirVisionneuse(f);
    f.componentInstance.openCategorize();
    f.detectChanges();
    f.componentInstance.saveCategorize();
    f.detectChanges();
    const alerte = racine(f).ownerDocument.querySelector('.cat-box [role="alert"]');
    expect(f.componentInstance.catModalOpen()).toBe(true);
    expect(alerte?.textContent).toContain('PIN');
  });

  it('R5 — « Enregistrer » échoué pour une autre raison : message générique ; un nouvel essai réussi efface le message et ferme la boîte', async () => {
    let echec = true;
    const f = await render({ saveImageMeta: () => (echec ? throwError(() => ({ status: 500 })) : of({})) });
    ouvrirVisionneuse(f);
    f.componentInstance.openCategorize();
    f.componentInstance.saveCategorize();
    f.detectChanges();
    const doc = racine(f).ownerDocument;
    expect(doc.querySelector('.cat-box [role="alert"]')?.textContent).toContain('Échec de l’enregistrement');
    echec = false;
    f.componentInstance.saveCategorize();
    f.detectChanges();
    expect(f.componentInstance.catModalOpen()).toBe(false);
    expect(doc.querySelector('.cat-box [role="alert"]')).toBeNull();
  });
});
