// L238 r1 — Galerie : l'artiste du catalogue n'est plus présenté comme auteur de l'image affichée
// (cherchée sur le wiki d'après le titre) ; la carte dit la source réelle de l'image, la visionneuse dit
// l'écart et affiche le crédit réel en légende ; l'aperçu Reddit crédite l'auteur et le post connus.
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';
import { creditDeclare, creditImage } from '../../core/credits/credit-image';

const WIKI = 'https://static.wikia.nocookie.net/warhammer40k/images/3/36/Ultramarines_Art.jpg/revision/latest';
const ARTWORKS = [
  { id: 'aw-1', title: 'Ultramarines', artist: 'John Stone', image: 'u.jpg', category: 'Space Marines', likes: 1, wikiQuery: 'Ultramarines' },
  { id: 'aw-2', title: 'Nécron', artist: 'Bob', image: 'n.jpg', category: 'Xénos', likes: 2, wikiQuery: 'Introuvable' },
];
const POST = { id: 'p', title: 'Mon Ultra', imageUrl: 'https://i.redd.it/abc.jpg', permalink: 'https://reddit.com/r/Warhammer40k/comments/p/x/', author: 'peintre', upvotes: 3, thumbnail: null, postedAt: 0 };

async function render(): Promise<ComponentFixture<GalleryComponent>> {
  polyfillDialog();
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS),
        images$: of(['perso.jpg', 'sans.jpg']),
        getImageMeta: () => of({ 'perso.jpg': { categories: ['Imperium'], artist: 'Moi-même' } }),
        getWikiImage: (q: string) => of({ imageUrl: q === 'Ultramarines' ? WIKI : null, pageTitle: null, pageUrl: null }),
        searchReddit: () => of([POST]),
        imageUrl: (f: string) => `/api/images/file/${f}`,
        getSuggestedCategories: () => of({ factions: [], subfactions: [], primarchs: [], characters: [], custom: [] }),
      }),
    },
    { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), paramMap: of(convertToParamMap({})), snapshot: { fragment: null, queryParamMap: convertToParamMap({}) } } },
  ]);
  const f = TestBed.createComponent(GalleryComponent);
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  f.detectChanges();
  return f;
}

const cartes = (f: ComponentFixture<GalleryComponent>) =>
  Array.from((f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.art-card'));
const carteDe = (f: ComponentFixture<GalleryComponent>, titre: string) =>
  cartes(f).find((c) => c.querySelector('.art-open')!.textContent!.trim() === titre)!;
const ouvrir = (f: ComponentFixture<GalleryComponent>, titre: string) => {
  carteDe(f, titre).querySelector<HTMLButtonElement>('.art-open')!.click();
  f.detectChanges();
  return document.querySelector<HTMLDialogElement>('dialog.modal')!;
};

afterEach(() => {
  TestBed.resetTestingModule();
  document.body.replaceChildren();
  document.body.style.overflow = '';
});

describe('galerie — crédit réel de l’image affichée (L238 r1)', () => {
  it('carte du catalogue : l’artiste est « Catalogue : … », la source réelle de l’image est dite dessous', async () => {
    const f = await render();
    const c = carteDe(f, 'Ultramarines');
    expect(c.querySelector('.art-artist')!.textContent!.trim()).toBe('Catalogue : John Stone');
    expect(c.querySelector('[data-testid="source-image"]')!.textContent!.trim()).toBe('Image : Warhammer 40k Wiki');
  });

  it('carte du catalogue sans image trouvée : pas de ligne « Image : »', async () => {
    const f = await render();
    const c = carteDe(f, 'Nécron');
    expect(c.querySelector('.art-artist')!.textContent!.trim()).toBe('Catalogue : Bob');
    expect(c.querySelector('[data-testid="source-image"]')).toBeNull();
  });

  it('image de la collection perso : l’artiste indiqué reste tel quel, sans ligne « Image : »', async () => {
    const f = await render();
    const c = cartes(f).find((x) => x.querySelector('.art-artist')!.textContent!.trim() === 'Moi-même')!;
    expect(c).toBeDefined();
    expect(c.querySelector('[data-testid="source-image"]')).toBeNull();
  });

  it('visionneuse (catalogue) : artiste « au catalogue », écart dit, crédit réel en légende avec lien vers le fichier', async () => {
    const f = await render();
    const d = ouvrir(f, 'Ultramarines');
    expect(d.querySelector('.vi-meta')!.textContent).toContain('Artiste au catalogue : John Stone');
    expect(d.querySelector('[data-testid="viewer-ecart"]')!.textContent).toContain('rien n’indique qu’elle soit de John Stone');
    const legende = d.querySelector('[data-testid="credit-legende"]')!;
    expect(legende.textContent).toContain('Illustration © Games Workshop — via le Warhammer 40k Wiki (Fandom), fichier « Ultramarines Art.jpg »');
    expect(legende.querySelector('a')!.getAttribute('href')).toBe('https://warhammer40k.fandom.com/wiki/File:Ultramarines_Art.jpg');
  });

  it('visionneuse (catalogue, aucune image) : « Aucune image trouvée », aucun crédit inventé', async () => {
    const f = await render();
    const d = ouvrir(f, 'Nécron');
    expect(d.querySelector('[data-testid="viewer-ecart"]')!.textContent).toContain('Aucune image trouvée pour cette œuvre.');
    expect(d.querySelector('[data-testid="credit-legende"]')).toBeNull();
  });

  it('visionneuse (collection perso) : la légende nomme l’artiste indiqué, sinon « auteur d’origine non conservé »', async () => {
    const f = await render();
    let d = ouvrir(f, (f.componentInstance.artworks().find((a) => a.artist === 'Moi-même')!).title);
    expect(d.querySelector('[data-testid="credit-legende"]')!.textContent).toContain('Collection personnelle — artiste indiqué à la catégorisation : Moi-même');
    expect(d.querySelector('[data-testid="viewer-ecart"]')).toBeNull();
    f.componentInstance.closeViewer();
    f.detectChanges();
    d = ouvrir(f, (f.componentInstance.artworks().find((a) => a.isLocal && a.artist === 'Mes images')!).title);
    expect(d.querySelector('[data-testid="credit-legende"]')!.textContent).toContain('Collection personnelle — auteur d’origine non conservé');
  });
});

describe('galerie — aperçu d’import Reddit (L238 r1)', () => {
  it('l’aperçu déclare l’auteur et le lien du post (crédit Reddit, pas « source non identifiée »)', async () => {
    const f = await render();
    f.componentInstance.openImport();
    f.componentInstance.setImportTab('reddit');
    f.detectChanges();
    const thumb = document.querySelector<HTMLElement>('.reddit-thumb')!;
    expect(thumb.dataset['creditTexte']).toBe('Image publiée sur Reddit par u/peintre');
    expect(thumb.dataset['creditLien']).toBe(POST.permalink);
    expect(thumb.dataset['creditSource']).toBe('reddit');

    // Crédit retenu pour l'aperçu (celui que posent l'infobulle et la liste du pied, voir credits-page-l238.spec) :
    // Reddit, auteur et lien du post — jamais « source non identifiée ».
    const c = creditDeclare(thumb, creditImage(POST.imageUrl)!);
    expect(c).toEqual({ source: 'reddit', texte: 'Image publiée sur Reddit par u/peintre', detail: 'post de u/peintre', lien: POST.permalink });
  });
});
