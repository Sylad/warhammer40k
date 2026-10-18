// L7/t2 — Galerie : la visionneuse, « Catégoriser » et « Importer » sont de vraies boîtes de dialogue
// modales (<dialog> + showModal : couche supérieure, fond inerte, Tab bouclé), nommées, focus sur ×,
// Échap (événement cancel) ferme la seule boîte du dessus, défilement du fond bloqué, focus rendu à
// l'élément d'origine (WCAG 2.4.3, 4.1.2). Le × au-dessus de la barre collante est mesuré en navigateur
// dans gallery-visionneuse-l7.e2e.spec.ts.
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';

const ARTWORKS = [
  { id: 'aw-1', title: 'Ultramarines', artist: 'Alice', image: 'u.jpg', category: 'Space Marines', likes: 1 },
  { id: 'aw-2', title: 'Nécron', artist: 'Bob', image: 'n.jpg', category: 'Xénos', likes: 2 },
];

async function render(): Promise<ComponentFixture<GalleryComponent>> {
  polyfillDialog();
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS),
        getImageMeta: () => of({ 'perso.jpg': { categories: ['Imperium'] } }),
        images$: of(['perso.jpg']),
        searchReddit: () => of([]),
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [], custom: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  return f;
}

const boite = (sel: string) => document.querySelector<HTMLDialogElement>(`dialog${sel}`);
const carte = (f: ComponentFixture<GalleryComponent>, i: number) =>
  (f.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.art-open')[i];
const ouvrirVisionneuse = (f: ComponentFixture<GalleryComponent>, i = 1) => {
  carte(f, i).focus();
  carte(f, i).click();
  f.detectChanges();
};
/** Échap sur une <dialog> modale : le navigateur émet `cancel` (annulable) sur la boîte du dessus. */
const echap = (d: HTMLElement) => d.dispatchEvent(new Event('cancel', { cancelable: true }));

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
  document.body.style.overflow = '';
});

describe('galerie — visionneuse en boîte de dialogue (L7/t2, WCAG 2.4.3 / 4.1.2)', () => {
  it('R1 — la visionneuse est une <dialog> modale ouverte, role=dialog, aria-modal, nommée par le titre de l\'œuvre', async () => {
    const f = await render();
    ouvrirVisionneuse(f);
    const d = boite('.modal')!;
    expect(d, 'dialog.modal').not.toBeNull();
    expect(d.hasAttribute('open')).toBe(true);
    expect(d.getAttribute('role')).toBe('dialog');
    expect(d.getAttribute('aria-modal')).toBe('true');
    const nom = document.getElementById(d.getAttribute('aria-labelledby')!);
    expect(nom?.textContent?.trim()).toBe('Nécron');
  });

  it('R2 — à l\'ouverture, le focus est sur le bouton ×', async () => {
    const f = await render();
    ouvrirVisionneuse(f);
    expect(document.activeElement).toBe(boite('.modal')!.querySelector('button.close'));
  });

  it('R3 — à la fermeture, le focus revient au bouton de la carte d\'où elle a été ouverte', async () => {
    const f = await render();
    ouvrirVisionneuse(f);
    expect(document.activeElement).not.toBe(carte(f, 1));
    f.componentInstance.closeViewer();
    f.detectChanges();
    expect(boite('.modal')).toBeNull();
    expect(document.activeElement).toBe(carte(f, 1));
  });

  it('R4 — Échap (cancel) ferme la visionneuse, sans laisser le navigateur la fermer à sa façon', async () => {
    const f = await render();
    ouvrirVisionneuse(f);
    const annule = echap(boite('.modal')!);
    f.detectChanges();
    expect(annule, 'cancel annulé : l\'état du composant décide').toBe(false);
    expect(boite('.modal')).toBeNull();
  });

  it('R5 — Échap dans « Catégoriser » ne ferme que cette boîte, la visionneuse reste ouverte', async () => {
    const f = await render();
    f.componentInstance.imageMeta.set({ 'perso.jpg': { categories: ['Imperium'] } });
    f.componentInstance.selectedArt.set({ id: 'p', title: 'Perso', artist: 'Moi', image: 'perso.jpg', category: 'Imperium', isLocal: true } as never);
    f.detectChanges();
    f.componentInstance.openCategorize();
    f.detectChanges();
    const cat = boite('.cat-modal')!;
    expect(cat.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(cat.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Catégoriser l\'image');
    echap(cat);
    f.detectChanges();
    expect(boite('.cat-modal')).toBeNull();
    expect(boite('.modal:not(.cat-modal)')).not.toBeNull();
  });

  it('R6 — Échap ferme « Importer », nommée par son titre', async () => {
    const f = await render();
    f.componentInstance.openImport();
    f.detectChanges();
    const imp = boite('.import-modal')!;
    expect(imp.getAttribute('role')).toBe('dialog');
    expect(document.getElementById(imp.getAttribute('aria-labelledby')!)?.textContent?.trim()).toBe('Importer une image');
    echap(imp);
    f.detectChanges();
    expect(boite('.import-modal')).toBeNull();
  });

  it('R7 — le défilement du fond est bloqué tant qu\'une boîte est ouverte, rendu à la fermeture de la dernière', async () => {
    const f = await render();
    ouvrirVisionneuse(f);
    expect(document.body.style.overflow).toBe('hidden');
    f.componentInstance.imageMeta.set({ 'perso.jpg': { categories: ['Imperium'] } });
    f.componentInstance.selectedArt.set({ id: 'p', title: 'Perso', artist: 'Moi', image: 'perso.jpg', category: 'Imperium', isLocal: true } as never);
    f.componentInstance.openCategorize();
    f.detectChanges();
    f.componentInstance.closeCategorize();
    f.detectChanges();
    expect(document.body.style.overflow, 'la visionneuse est encore ouverte').toBe('hidden');
    f.componentInstance.closeViewer();
    f.detectChanges();
    expect(document.body.style.overflow).toBe('');
  });

  it('R8 — Échap dans la liste de suggestions de « Catégoriser » ferme la liste, pas la boîte', async () => {
    const f = await render();
    f.componentInstance.imageMeta.set({ 'perso.jpg': { categories: ['Imperium'] } });
    f.componentInstance.selectedArt.set({ id: 'p', title: 'Perso', artist: 'Moi', image: 'perso.jpg', category: 'Imperium', isLocal: true } as never);
    f.componentInstance.openCategorize();
    f.componentInstance.catDropdownOpen.set(true);
    f.detectChanges();
    const champ = boite('.cat-modal')!.querySelector<HTMLInputElement>('.chip-input input')!;
    const touche = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    champ.dispatchEvent(touche);
    expect(f.componentInstance.catDropdownOpen()).toBe(false);
    expect(touche.defaultPrevented, 'keydown annulé : le navigateur n\'émet pas cancel').toBe(true);
  });
});
