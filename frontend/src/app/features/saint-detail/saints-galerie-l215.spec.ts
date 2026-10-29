// L215 — QA prod de L19 (29-10) : l'Iconographie des fiches Saints répétait des images (Célestine 2×2, Sabbat ×2) ou en
// montrait de hors sujet (Sanguinaire : Red Tear, Imperial_eagle ; repli « Imperial Saint » partagé avec Sabbat), et la
// visionneuse lançait 4 variantes /api/wiki-image qui retombaient sur l'image de la carte. Les deux écrans demandent
// désormais les pages du sujet par leur titre (`galleryPages` du seed), comme les Concepts (L207).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Saint } from '../../core/models/models';
import { LoreSaintsComponent } from '../lore-saints/lore-saints.component';
import { SaintDetailComponent } from './saint-detail.component';

type SeedSaint = Saint & { galleryQueries?: string[] };
const seed: SeedSaint[] = JSON.parse(readFileSync(join(process.cwd(), '../backend/seed/living-saints.json'), 'utf8'));
const saint = (id: string) => seed.find(s => s.id === id)!;
type Rep = { imageUrl: string | null; pageTitle: string | null };
type Reponse = (q: string) => Rep | 'ERREUR';

/** Un wiki idéal : la page demandée répond sous son titre, avec une image propre à ce titre. */
const wikiIdeal = (q: string): Rep => ({ imageUrl: `http://img/${q}.jpg`, pageTitle: q });

function service(id: string, reponse: Reponse, demandes: string[]) {
  return fakeWarhammerService({
    saints$: of(seed),
    getSaint: () => of(saint(id)),
    getWikiImage: (q: string) => {
      demandes.push(q);
      const r = reponse(q);
      return r === 'ERREUR' ? throwError(() => new Error('HTTP')) : of({ ...r, pageUrl: null });
    },
  });
}

async function ouvrirVisionneuse(id: string, reponse: Reponse) {
  const demandes: string[] = [];
  await setupTestBed([LoreSaintsComponent], [provideRouter([]), { provide: WarhammerService, useValue: service(id, reponse, demandes) }]);
  const f = TestBed.createComponent(LoreSaintsComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  demandes.length = 0;
  f.componentInstance.openLightbox(saint(id) as never);
  await settle();
  return { demandes, thumbs: f.componentInstance.lightbox()!.thumbUrls };
}

async function ouvrirFiche(id: string, reponse: Reponse) {
  const demandes: string[] = [];
  await setupTestBed([SaintDetailComponent as never], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service(id, reponse, demandes) },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(SaintDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  const vignettes = Array.from((f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.iconography-card'),
    a => a.style.getPropertyValue('--g-img'));
  return { demandes, vignettes };
}

describe('Saints — galerie par pages du sujet (L215)', () => {
  it('R1 — chaque Saint a au moins une page de galerie, sans doublon, sans la page de son image principale, et aucune page n\'est partagée entre deux Saints ; plus de galleryQueries', () => {
    const toutes: string[] = [];
    for (const s of seed) {
      const pages = (s.galleryPages ?? []).map(p => p.toLowerCase());
      expect(pages.length, s.id).toBeGreaterThanOrEqual(1);
      expect(new Set(pages).size, s.id).toBe(pages.length);
      expect(pages, s.id).not.toContain(s.wikiQuery.toLowerCase());
      expect(s.galleryQueries, s.id).toBeUndefined();
      toutes.push(...pages);
    }
    expect(new Set(toutes).size).toBe(toutes.length);
  });

  it('R2 — la visionneuse demande exactement les pages du Saint, jamais les quatre variantes « … warhammer 40k », « … art », « … Sisters of Battle », « … Imperial saint »', async () => {
    const { demandes } = await ouvrirVisionneuse('saint-sabbat', wikiIdeal);
    expect(demandes).toEqual(saint('saint-sabbat').galleryPages);
    expect(demandes.some(q => /warhammer 40k|\bart\b|Sisters of Battle|Imperial saint/i.test(q))).toBe(false);
  });

  it('R3 — la visionneuse écarte une page qui répond sous un autre titre ou par le fichier « indisponible », et une image déjà listée, puis tente la suite', async () => {
    const pages = saint('saint-sanguinaire').galleryPages!;
    const { thumbs, demandes } = await ouvrirVisionneuse('saint-sanguinaire', q => q === pages[0]
      ? { imageUrl: 'http://img/Imperial_eagle.png', pageTitle: 'Aquila' }
      : q === pages[1] ? { imageUrl: 'http://img/Pict-File_Unavailable.png', pageTitle: q }
      : { imageUrl: 'http://img/unique.jpg', pageTitle: q });
    expect(demandes).toEqual(pages);
    expect(thumbs).not.toContain('http://img/Imperial_eagle.png');
    expect(thumbs.some(u => /Unavailable/.test(u))).toBe(false);
    expect(thumbs.filter(u => u === 'http://img/unique.jpg').length).toBe(1);
  });

  it('R4 — une erreur HTTP sur une page de la visionneuse n\'arrête pas la chaîne', async () => {
    const pages = saint('saint-sabbat').galleryPages!;
    const { thumbs, demandes } = await ouvrirVisionneuse('saint-sabbat', q => q === pages[0] ? 'ERREUR' : wikiIdeal(q));
    expect(demandes).toEqual(pages);
    expect(thumbs.length).toBe(pages.length); // image de la carte + pages - la page en erreur
  });

  it('R5 — la fiche demande la page principale puis exactement les pages du Saint, et montre une vignette par page qui répond sous son titre', async () => {
    const { demandes, vignettes } = await ouvrirFiche('saint-sabbat', wikiIdeal);
    expect(demandes).toEqual([saint('saint-sabbat').wikiQuery, ...saint('saint-sabbat').galleryPages!]);
    expect(vignettes.length).toBe(saint('saint-sabbat').galleryPages!.length);
  });

  it('R6 — l\'Iconographie n\'a que des images distinctes entre elles et de celle du haut de page (Célestine 2×2, Sabbat ×2)', async () => {
    const pages = saint('saint-celestine').galleryPages!;
    const { vignettes } = await ouvrirFiche('saint-celestine', q => q === pages[0] || q === pages[1]
      ? { imageUrl: 'http://img/commune.jpg', pageTitle: q }
      : { imageUrl: 'http://img/hero.jpg', pageTitle: q });
    expect(vignettes).toEqual(['url(http://img/commune.jpg)']);
  });

  it('R7 — l\'Iconographie écarte une page au titre différent (Sanguinaire : Red Tear, Imperial_eagle) et garde l\'ordre du seed malgré des réponses tardives', async () => {
    const pages = saint('saint-sanguinaire').galleryPages!;
    const { vignettes } = await ouvrirFiche('saint-sanguinaire', q => q === pages[0]
      ? { imageUrl: 'http://img/Imperial_eagle.png', pageTitle: 'Aquila' }
      : wikiIdeal(q));
    expect(vignettes).toEqual(pages.slice(1).map(p => `url(http://img/${p}.jpg)`));
  });

  it('R8 — une erreur HTTP sur une page de la fiche laisse les autres vignettes ; sans page, aucune demande de galerie et pas de section', async () => {
    const pages = saint('saint-sabbat').galleryPages!;
    const { vignettes } = await ouvrirFiche('saint-sabbat', q => q === pages[0] ? 'ERREUR' : wikiIdeal(q));
    expect(vignettes.length).toBe(pages.length - 1);
    const sans = { ...saint('saint-sabbat'), id: 'sans-pages', galleryPages: [] };
    seed.push(sans);
    try {
      const r = await ouvrirFiche('sans-pages', wikiIdeal);
      expect(r.demandes).toEqual([sans.wikiQuery]);
      expect(r.vignettes).toEqual([]);
    } finally { seed.pop(); }
  });
});
