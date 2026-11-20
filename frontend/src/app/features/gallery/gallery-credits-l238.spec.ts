// L238 r1 — Galerie : l'artiste du catalogue n'est plus présenté comme auteur de l'image affichée
// (cherchée sur le wiki d'après le titre) ; la carte dit la source réelle de l'image, la visionneuse dit
// l'écart et affiche le crédit réel en légende ; l'aperçu Reddit crédite l'auteur et le post connus.
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { afterEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, Subject, throwError, type Observable } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { GalleryComponent } from './gallery.component';
import { creditDeclare, creditImage } from '../../core/credits/credit-image';

const WIKI = 'https://static.wikia.nocookie.net/warhammer40k/images/3/36/Ultramarines_Art.jpg/revision/latest';
const ARTWORKS = [
  { id: 'aw-1', title: 'Ultramarines', artist: 'John Stone', image: 'u.jpg', category: 'Space Marines', likes: 1, wikiQuery: 'Ultramarines' },
  { id: 'aw-2', title: 'Nécron', artist: 'Bob', image: 'n.jpg', category: 'Xénos', likes: 2, wikiQuery: 'Introuvable' },
];
const POST = { id: 'p', title: 'Mon Ultra', imageUrl: 'https://i.redd.it/abc.jpg', permalink: 'https://reddit.com/r/Warhammer40k/comments/p/x/', author: 'peintre', upvotes: 3, thumbnail: null, postedAt: 0 };

type Wiki = { imageUrl: string | null; pageTitle: null; pageUrl: null; erreur?: boolean };
const wikiParDefaut = (q: string): Observable<Wiki> => of({ imageUrl: q === 'Ultramarines' ? WIKI : null, pageTitle: null, pageUrl: null });

async function render(getWikiImage: (q: string) => Observable<Wiki> = wikiParDefaut): Promise<ComponentFixture<GalleryComponent>> {
  polyfillDialog();
  await setupTestBed([GalleryComponent], [
    provideRouter([]),
    {
      provide: WarhammerService,
      useValue: fakeWarhammerService({
        artworks$: of(ARTWORKS),
        images$: of(['perso.jpg', 'sans.jpg']),
        getImageMeta: () => of({ 'perso.jpg': { categories: ['Imperium'], artist: 'Moi-même' } }),
        getWikiImage,
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
    const ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.textContent).toContain('Aucune image trouvée pour cette œuvre.');
    expect(ecart.dataset['etat']).toBe('absente');
    expect(d.querySelector('[data-testid="credit-legende"]')).toBeNull();
  });

  it('r2 — visionneuse pendant la recherche : « Recherche de l’image… », jamais « Aucune image trouvée » ; puis l’image arrive', async () => {
    const enAttente = new Subject<Wiki>(); // seule la recherche de cette œuvre reste sans réponse
    const f = await render((q) => (q === 'Ultramarines' ? enAttente : wikiParDefaut(q)));
    const d = ouvrir(f, 'Ultramarines');
    let ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.dataset['etat']).toBe('chargement');
    expect(ecart.getAttribute('role')).toBe('status');
    expect(ecart.textContent!.trim()).toBe('Recherche de l’image sur le Warhammer 40k Wiki…');
    expect(d.textContent).not.toContain('Aucune image trouvée');
    expect(d.querySelector('[data-testid="credit-legende"]')).toBeNull();

    enAttente.next({ imageUrl: WIKI, pageTitle: null, pageUrl: null });
    f.detectChanges();
    ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.dataset['etat']).toBeUndefined();
    expect(ecart.textContent).toContain('rien n’indique qu’elle soit de John Stone');
    expect(d.querySelector('[data-testid="credit-legende"]')!.textContent).toContain('Ultramarines Art.jpg');
  });

  it('r2 — visionneuse sur une panne du wiki (502) : l’échec est dit (alerte), pas « Aucune image trouvée » ; « Réessayer » relance', async () => {
    let panne = true;
    const appels: string[] = [];
    const f = await render((q) => {
      appels.push(q);
      return panne ? throwError(() => new Error('502')) : wikiParDefaut(q);
    });
    const d = ouvrir(f, 'Ultramarines');
    const ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.dataset['etat']).toBe('erreur');
    expect(ecart.getAttribute('role')).toBe('alert');
    expect(ecart.textContent).toContain('La recherche de l’image sur le Warhammer 40k Wiki a échoué.');
    expect(d.textContent).not.toContain('Aucune image trouvée');
    expect(d.querySelector('[data-testid="credit-legende"]')).toBeNull();
    // Une panne n'est pas relancée en boucle : une seule recherche par œuvre tant qu'on ne le demande pas.
    expect(appels.filter((q) => q === 'Ultramarines')).toHaveLength(1);

    panne = false;
    d.querySelector<HTMLButtonElement>('[data-testid="viewer-reessayer"]')!.click();
    f.detectChanges();
    expect(appels.filter((q) => q === 'Ultramarines')).toHaveLength(2);
    expect(d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!.textContent).toContain('rien n’indique qu’elle soit de John Stone');
    expect(d.querySelector('[data-testid="viewer-reessayer"]')).toBeNull();
  });

  it('r3 — Fandom en panne (notre API répond 200 avec erreur: true) : état « erreur » avec « Réessayer », pas « Aucune image trouvée »', async () => {
    const f = await render((q) => (q === 'Ultramarines' ? of({ imageUrl: null, pageTitle: null, pageUrl: null, erreur: true }) : wikiParDefaut(q)));
    const d = ouvrir(f, 'Ultramarines');
    const ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.dataset['etat']).toBe('erreur');
    expect(ecart.getAttribute('role')).toBe('alert');
    expect(d.textContent).not.toContain('Aucune image trouvée');
    expect(d.querySelector('[data-testid="viewer-reessayer"]')).not.toBeNull();
    // La vraie absence (réponse sans champ erreur) reste une absence.
    const d2 = ouvrir(f, 'Nécron');
    expect(d2.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!.dataset['etat']).toBe('absente');
  });

  it('r3 — « Réessayer » qui échoue encore : le même bouton reste en place et garde le focus (WCAG 2.4.3) ; inactif pendant la recherche', async () => {
    const appels: Subject<Wiki>[] = [];
    const f = await render((q) => {
      if (q !== 'Ultramarines') return wikiParDefaut(q);
      const s = new Subject<Wiki>();
      appels.push(s);
      return s;
    });
    appels[0].error(new Error('502'));
    const d = ouvrir(f, 'Ultramarines');
    const bouton = d.querySelector<HTMLButtonElement>('[data-testid="viewer-reessayer"]')!;
    bouton.focus();
    bouton.click();
    f.detectChanges();
    // Nouvelle recherche en cours : même bouton, focus gardé, clic sans effet.
    let ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.dataset['etat']).toBe('chargement');
    expect(ecart.textContent).toContain('Nouvelle recherche de l’image sur le Warhammer 40k Wiki…');
    expect(d.querySelector('[data-testid="viewer-reessayer"]')).toBe(bouton);
    expect(bouton.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(bouton);
    bouton.click();
    f.detectChanges();
    expect(appels).toHaveLength(2);

    // Fandom en panne à nouveau (200 erreur: true) : l'échec est redit, le focus est toujours sur « Réessayer ».
    appels[1].next({ imageUrl: null, pageTitle: null, pageUrl: null, erreur: true });
    f.detectChanges();
    ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.dataset['etat']).toBe('erreur');
    expect(ecart.textContent).toContain('La recherche de l’image sur le Warhammer 40k Wiki a échoué.');
    expect(d.querySelector('[data-testid="viewer-reessayer"]')).toBe(bouton);
    expect(bouton.getAttribute('aria-disabled')).toBeNull();
    expect(document.activeElement).toBe(bouton);

    // Troisième essai, l'image arrive : le bouton disparaît, le focus va au message qui le remplace (pas au corps de la page).
    bouton.click();
    f.detectChanges();
    appels[2].next({ imageUrl: WIKI, pageTitle: null, pageUrl: null });
    f.detectChanges();
    expect(d.querySelector('[data-testid="viewer-reessayer"]')).toBeNull();
    ecart = d.querySelector<HTMLElement>('[data-testid="viewer-ecart"]')!;
    expect(ecart.textContent).toContain('rien n’indique qu’elle soit de John Stone');
    expect(document.activeElement).toBe(ecart);
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
