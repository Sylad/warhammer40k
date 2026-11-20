// L73 — l'accueil affichait « 35 Œuvres » quand la galerie en montrait 39 (35 /api/artworks +
// 4 /api/images, QA prod du 06-10). Le compte « Œuvres » de l'accueil est celui de la galerie :
// tout ce qu'elle montre, images personnelles comprises (décision du lead du 06-10), par la même
// fonction (`nombreOeuvresGalerie`).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { renderGallery } from '../../../testing/gallery-testbed';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError, type Observable } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { WarhammerService } from '../../core/services/warhammer.service';
import { nombreOeuvresGalerie } from '../../core/utils/galerie';

const CATALOGUE = Array.from({ length: 35 }, (_, i) => ({
  id: `a${i}`, title: `Œuvre ${i}`, artist: `Artiste ${i % 20}`, image: `a${i}.jpg`, category: 'Xénos', likes: 0,
}));
const IMAGES = ['perso-1.jpg', 'perso-2.jpg', 'perso-3.jpg', 'perso-4.jpg'];

const texte = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Compte « Œuvres » de l'accueil : bandeau de statistiques et carte « Galerie ». */
async function compteAccueil(artworks$: Observable<unknown[]>, images$: Observable<unknown[]>) {
  await setupTestBed([DashboardComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ loreFeed: () => of([]), artworks$, images$ }) },
  ]);
  const f = TestBed.createComponent(DashboardComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  const stat = [...el.querySelectorAll('.stat')].find((s) => texte(s.querySelector('span')) === 'Œuvres');
  const carte = el.querySelector('a[href="/gallery"]');
  return { bandeau: texte(stat?.querySelector('strong')), carte: texte(carte?.querySelector('.num')), el };
}

/** Compte « Œuvres » du bandeau de la galerie. */
async function compteGalerie(artworks$: Observable<unknown[]>, images$: Observable<unknown[]>) {
  const f = await renderGallery({ artworks$, images$, factions$: of([]) });
  await f.whenStable();
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  const carte = [...el.querySelectorAll('.stat-card')].find((c) => texte(c.querySelector('.stat-label')) === 'Œuvres');
  return { bandeau: texte(carte?.querySelector('.stat-num')), cartes: f.componentInstance.artworks().length };
}

describe('Accueil — « Œuvres » = compte de la galerie (L73)', () => {
  it('35 du catalogue + 4 images perso : 39 sur l’accueil comme sur la galerie', async () => {
    const accueil = await compteAccueil(of(CATALOGUE), of(IMAGES));
    const galerie = await compteGalerie(of(CATALOGUE), of(IMAGES));
    expect(galerie.bandeau).toBe('39');
    expect(galerie.cartes).toBe(39);
    expect(accueil.bandeau).toBe(galerie.bandeau);
    expect(accueil.carte).toBe(galerie.bandeau);
  });

  it.each([
    [0, 0], [1, 0], [0, 1], [35, 4], [12, 30],
  ])('catalogue %i + images %i : même compte des deux côtés', async (nc, ni) => {
    const cat = CATALOGUE.slice(0, nc);
    const img = Array.from({ length: ni }, (_, i) => `p${i}.jpg`);
    const accueil = await compteAccueil(of(cat), of(img));
    const galerie = await compteGalerie(of(cat), of(img));
    expect(accueil.bandeau).toBe(String(nc + ni));
    expect(accueil.bandeau).toBe(galerie.bandeau);
    expect(galerie.cartes).toBe(nombreOeuvresGalerie(cat, img));
  });

  it('images perso pas encore reçues : « — », jamais le seul compte du catalogue', async () => {
    const accueil = await compteAccueil(of(CATALOGUE), NEVER);
    expect(accueil.bandeau).toBe('—');
  });

  it('images perso en échec : « — » et message Réessayer, pas un compte partiel', async () => {
    const accueil = await compteAccueil(of(CATALOGUE), throwError(() => new Error('500')));
    expect(accueil.bandeau).toBe('—');
    expect(texte(accueil.el.querySelector('[role="alert"]'))).toContain('Certains chiffres');
  });
});
