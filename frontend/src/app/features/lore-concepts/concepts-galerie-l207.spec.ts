// L207 — QA prod du 27-10 : depuis L200 aucune des 15 galeries de la visionneuse des Concepts n'avait de vignette
// (.lightbox-thumb ×0) et Codex Astartes / Cadia faisaient encore 4 appels /api/wiki-image sans effet. Le wiki ne rend
// qu'une image par page : « <requête> art » retombait sur la page du concept (même image) ou sur une page voisine (rejetée
// par L200). La galerie demande désormais des pages du sujet par leur titre (`galleryPages` du seed).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { LoreConceptsComponent } from './lore-concepts.component';
import { pageCiblee } from '../../core/utils/page-ciblee';

type Seed = { id: string; name: string; wikiQuery: string; galleryPages?: string[] };
const seed: Seed[] = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/lore-concepts.json'), 'utf8'));
const concept = (id: string) => seed.find(c => c.id === id)!;
type Rep = { imageUrl: string | null; pageTitle: string | null };

/** Un wiki idéal : la page demandée répond sous son titre, avec une image propre à ce titre. */
const wikiIdeal = (q: string): Rep => ({ imageUrl: `http://img/${q}.jpg`, pageTitle: q });

async function ouvrir(id: string, reponse: (q: string) => Rep | 'ERREUR') {
  const demandes: string[] = [];
  await setupTestBed([LoreConceptsComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      loreConcepts$: of(seed),
      getWikiImage: (q: string) => { demandes.push(q); const r = reponse(q); return r === 'ERREUR' ? throwError(() => new Error('HTTP')) : of({ ...r, pageUrl: null }); },
    }) },
  ]);
  const f = TestBed.createComponent(LoreConceptsComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  demandes.length = 0;
  f.componentInstance.openLightbox(concept(id) as never);
  await settle();
  return { demandes, thumbs: f.componentInstance.lightbox()!.thumbUrls };
}

describe('Concepts — galerie de la visionneuse par pages du sujet (L207)', () => {
  it('R1 — les 15 concepts ont au moins une page de galerie, sans doublon ni la page de leur image principale', () => {
    for (const c of seed) {
      const pages = c.galleryPages ?? [];
      const minuscules = pages.map(p => p.toLowerCase());
      expect(pages.length, c.id).toBeGreaterThanOrEqual(1);
      expect(new Set(minuscules).size, c.id).toBe(pages.length);
      expect(minuscules, c.id).not.toContain(c.wikiQuery.toLowerCase());
    }
  });

  it('R2 — la visionneuse demande exactement les pages du concept, jamais « <requête> art » ni « concept art »', async () => {
    const { demandes } = await ouvrir('cadia', wikiIdeal);
    expect(demandes).toEqual(concept('cadia').galleryPages);
    expect(demandes.some(q => /\bart\b|illustration|warhammer 40k/i.test(q))).toBe(false);
  });

  it('R3 — chaque page qui répond sous son titre donne une vignette : la galerie compte l\'image du concept plus une par page (15 concepts)', async () => {
    for (const c of seed) {
      const { thumbs } = await ouvrir(c.id, wikiIdeal);
      expect(thumbs.length, c.id).toBe(1 + (c.galleryPages ?? []).length);
    }
  });

  it('R4 — une page qui répond sous un autre titre (repli de recherche du wiki) ou par le fichier « indisponible » est écartée, la suite est tentée', async () => {
    const pages = concept('codex-astartes').galleryPages!;
    const { thumbs, demandes } = await ouvrir('codex-astartes', q => q === pages[0]
      ? { imageUrl: 'http://img/Red_Templars_Biker.jpg', pageTitle: 'Assault Bike' }
      : q === pages[1] ? { imageUrl: 'http://img/Pict-File_Unavailable.png', pageTitle: q } : wikiIdeal(q));
    expect(thumbs).not.toContain('http://img/Red_Templars_Biker.jpg');
    expect(thumbs.some(u => /Unavailable/.test(u))).toBe(false);
    expect(demandes).toEqual(pages);
  });

  it('R5 — une image déjà dans la galerie (celle du concept ou d\'une page précédente) n\'est pas ajoutée deux fois', async () => {
    const { thumbs, demandes } = await ouvrir('cadia', q => ({ imageUrl: 'http://img/unique', pageTitle: q }));
    expect(demandes).toEqual(concept('cadia').galleryPages);
    expect(thumbs).toEqual(['http://img/unique']);
  });

  it('R6 — une erreur HTTP sur une page n\'arrête pas la chaîne', async () => {
    const pages = concept('cadia').galleryPages!;
    const { thumbs, demandes } = await ouvrir('cadia', q => q === pages[0] ? 'ERREUR' : wikiIdeal(q));
    expect(demandes).toEqual(pages);
    expect(thumbs.length).toBe(pages.length); // concept + pages - la page en erreur
  });

  it('R7 — un concept sans page de galerie ne fait aucun appel à /api/wiki-image à l\'ouverture', async () => {
    const sans = { ...concept('cadia'), id: 'sans-pages', galleryPages: [] };
    seed.push(sans);
    try {
      const { demandes, thumbs } = await ouvrir('sans-pages', wikiIdeal);
      expect(demandes).toEqual([]);
      expect(thumbs.length).toBe(1);
    } finally {
      seed.pop();
    }
  });

  it('R8 — pageCiblee compare le titre rendu au titre demandé, sans casse ni souligné', () => {
    expect(pageCiblee('Cadian Gate', { imageUrl: 'http://i/Gate.jpg', pageTitle: 'cadian_gate' })).toBe(true);
    expect(pageCiblee('Cadia', { imageUrl: 'http://i/LorgarArt.jpg', pageTitle: 'Cadian Sector' })).toBe(false);
    expect(pageCiblee('Cadia', { imageUrl: 'http://i/Pict-File_Unavailable.png', pageTitle: 'Cadia' })).toBe(false);
    expect(pageCiblee('Cadia', { imageUrl: null, pageTitle: 'Cadia' })).toBe(false);
  });
});
