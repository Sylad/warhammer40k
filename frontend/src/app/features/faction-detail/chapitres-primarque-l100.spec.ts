// L100 — le mini-portrait d'une carte de chapitre venait d'une recherche wiki libre (`primarchWikiQuery`) :
// le repli de recherche du wiki rendait Fulgrim pour les Iron Hands et un char pour les Imperial Fists.
// Rejoué sur le vrai seed : pour CHAQUE chapitre qui a un primarque, la carte montre l'image de la fiche
// de ce primarque (même requête, même image que /lore/primarchs/:id), avec un alt qui le nomme ; une
// réponse du wiki sous un autre titre (repli de recherche) ne donne aucun portrait plutôt qu'un faux.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService, type WikiImageResult } from '../../core/services/warhammer.service';
import type { Primarch, SubFaction } from '../../core/models/models';
import { FactionDetailComponent, portraitDe } from './faction-detail.component';
import { PrimarchDetailComponent } from '../primarch-detail/primarch-detail.component';

const seedDir = path.resolve(__dirname, '../../../../../backend/seed');
const lire = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(seedDir, f), 'utf-8')) as T;
const PRIMARQUES = lire<Primarch[]>('primarchs.json');
const SOUS_FACTIONS = lire<SubFaction[]>('subfactions.json');
const CHAPITRES = SOUS_FACTIONS.filter((s) => !!s.primarchId);

const image = (page: string) => `https://wiki.test/${encodeURIComponent(page)}.jpg`;

/**
 * Faux wiki au comportement de Fandom : un titre de page exact rend la page ; toute autre requête part
 * dans la recherche, qui rend une AUTRE page (Fulgrim), comme pour « Ferrus Manus primarch » en prod.
 */
function fauxWiki(pagesPiegees: Record<string, string> = {}) {
  const pages = new Set(PRIMARQUES.map((p) => p.wikiQuery!));
  const demandes: string[] = [];
  const getWikiImage = (q: string) => {
    demandes.push(q);
    const page = pagesPiegees[q] ?? (pages.has(q) ? q : 'Fulgrim');
    return of<WikiImageResult>({ imageUrl: image(page), pageTitle: page, pageUrl: null });
  };
  return { getWikiImage, demandes };
}

async function cartesDe(factionId: string, wiki = fauxWiki()) {
  const service = fakeWarhammerService({
    getFaction: () => of({ id: factionId, nom: factionId, alignement: 'Imperium', symbole: '✠', description: 'd', couleurThematique: '#c9a24a' }),
    getUnits: () => of([]),
    getSubFactions: () => of(SOUS_FACTIONS.filter((s) => s.factionId === factionId)),
    primarchs$: of(PRIMARQUES),
    getWikiImage: wiki.getWikiImage,
  });
  await setupTestBed([FactionDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: factionId })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(FactionDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  // Toutes les cartes, pas seulement la première page de la liste.
  for (let i = 0; i < 20 && f.componentInstance.extraSubFactionCount() > 0; i++) {
    f.componentInstance.loadMoreSubFactions();
    f.detectChanges();
  }
  const cartes = new Map<string, HTMLImageElement | null>();
  (f.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a.sf-card').forEach((a) => {
    cartes.set(a.getAttribute('href')!.replace('/subfactions/', ''), a.querySelector<HTMLImageElement>('.sf-primarch img'));
  });
  return { cartes, demandes: wiki.demandes };
}

/** Image affichée par la fiche du primarque (/lore/primarchs/:id), avec le même faux wiki. */
async function imageDeLaFiche(id: string): Promise<string | null> {
  const p = PRIMARQUES.find((x) => x.id === id)!;
  const service = fakeWarhammerService({ getPrimarch: () => of(p), getWikiImage: fauxWiki().getWikiImage });
  await setupTestBed([PrimarchDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })), snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(PrimarchDetailComponent);
  f.detectChanges();
  await f.whenStable();
  return f.componentInstance.heroImage();
}

describe('Chapitres — portrait du primarque pris à sa fiche (L100)', () => {
  it('le seed : chaque chapitre qui a un primarque pointe une fiche primarque qui a sa requête d’image ; plus de requête libre', () => {
    expect(CHAPITRES.length).toBe(18);
    for (const s of CHAPITRES) {
      const p = PRIMARQUES.find((x) => x.id === s.primarchId);
      expect(p, s.id).toBeDefined();
      expect(p!.wikiQuery, s.id).toBeTruthy();
    }
    expect(SOUS_FACTIONS.filter((s) => 'primarchWikiQuery' in s).map((s) => s.id)).toEqual([]);
  });

  it.each(['space-marines', 'chaos-space-marines'])('%s : chaque chapitre montre l’image de la fiche de SON primarque, alt qui le nomme', async (factionId) => {
    const { cartes } = await cartesDe(factionId);
    const chapitres = CHAPITRES.filter((s) => s.factionId === factionId);
    expect(chapitres.length).toBeGreaterThan(0);
    for (const s of chapitres) {
      const p = PRIMARQUES.find((x) => x.id === s.primarchId)!;
      const img = cartes.get(s.id);
      expect(img, `${s.id} → ${p.name}`).toBeTruthy();
      expect(img!.getAttribute('src'), `${s.id} → ${p.name}`).toBe(image(p.wikiQuery!));
      expect(img!.getAttribute('alt'), s.id).toBe(portraitDe(p.name));
      expect(img!.getAttribute('alt'), s.id).toContain(p.name);
    }
    // Aucun portrait sur une carte sans primarque.
    for (const [id, img] of cartes) if (!CHAPITRES.some((s) => s.id === id)) expect(img, id).toBeNull();
  });

  it('Iron Hands → Ferrus Manus, Imperial Fists → Rogal Dorn : la même image que leur fiche primarque', async () => {
    const { cartes } = await cartesDe('space-marines');
    const ironHands = cartes.get('iron-hands')!;
    const imperialFists = cartes.get('imperial-fists')!;
    expect(ironHands.getAttribute('alt')).toBe('Portrait de Ferrus Manus');
    expect(imperialFists.getAttribute('alt')).toBe('Portrait de Rogal Dorn');
    expect(ironHands.getAttribute('src')).toBe(await imageDeLaFiche('ferrus-manus'));
    expect(imperialFists.getAttribute('src')).toBe(await imageDeLaFiche('rogal-dorn'));
    expect(ironHands.getAttribute('src')).not.toBe(image('Fulgrim'));
  });

  it('toutes les cartes : l’image est celle de la fiche du primarque', async () => {
    for (const factionId of ['space-marines', 'chaos-space-marines']) {
      const { cartes } = await cartesDe(factionId);
      for (const s of CHAPITRES.filter((x) => x.factionId === factionId)) {
        expect(cartes.get(s.id)!.getAttribute('src'), s.id).toBe(await imageDeLaFiche(s.primarchId!));
      }
    }
  });

  it('le wiki répond sous un autre titre (repli de recherche) : pas de portrait plutôt qu’un faux, la carte nomme le primarque', async () => {
    const { cartes, demandes } = await cartesDe('space-marines', fauxWiki({ 'Ferrus Manus': 'Fulgrim' }));
    expect(demandes).toContain('Ferrus Manus');
    expect(cartes.get('iron-hands')).toBeNull();
    expect(cartes.get('imperial-fists')).not.toBeNull();
  });

  it('alt en français : élision devant une voyelle', () => {
    expect(portraitDe('Angron')).toBe('Portrait d’Angron');
    expect(portraitDe('Alpharius / Omegon')).toBe('Portrait d’Alpharius / Omegon');
    expect(portraitDe('Ferrus Manus')).toBe('Portrait de Ferrus Manus');
    expect(portraitDe('Horus Lupercal')).toBe('Portrait de Horus Lupercal');
  });

  it('une requête par primarque, et seulement les requêtes des fiches primarques', async () => {
    const { demandes } = await cartesDe('space-marines');
    const portraits = demandes.filter((q) => PRIMARQUES.some((p) => p.wikiQuery === q));
    expect(new Set(portraits).size).toBe(portraits.length);
    expect(demandes.some((q) => /primarch/i.test(q))).toBe(false);
  });
});
