// Revue UX L39 — glyphes décoratifs des cartes « Médias » (▶, ▦) masqués aux technologies
// d'assistance : le nom accessible de la carte commence par son titre, pas par le glyphe.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, type ParamMap } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { FactionDetailComponent } from './faction-detail.component';

describe('fiche faction — cartes Médias (L39)', () => {
  it('▶ et ▦ sont aria-hidden ; le texte de la carte reste lisible', async () => {
    const service = fakeWarhammerService({
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
      getSubFactions: () => of([]),
      videos$: of([{ id: 'v', titre: 'Une vidéo', embedId: 'abc', embedType: 'video', featured: true, tags: ['Orks'] }]),
      artworks$: of([]),
    });
    await setupTestBed([FactionDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'orks' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(FactionDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const cards = [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('a.media-card')];
    expect(cards).toHaveLength(2);
    for (const c of cards) {
      const glyph = c.querySelector('.play')!;
      expect(glyph.getAttribute('aria-hidden')).toBe('true');
    }
    expect(cards[0].querySelector('strong')!.textContent).toBe('Vidéo à la une');
  });
});

// L42 — bloc « Médias » propre à la faction : vidéo et illustration DE la faction (étiquettes des
// vidéos, champ `faction` des illustrations), sinon un visuel neutre (symbole de la faction) et
// « Voir les vidéos » / « Voir la galerie ». Avant : même vidéo (l'Empereur) et même illustration
// (bouclier Ultramarines) sur toutes les pages faction.
const FACTIONS: Record<string, unknown> = {
  necrons: { id: 'necrons', nom: 'Nécrons', alignement: 'Xenos', symbole: '⊗', description: 'd', couleurThematique: '#1a4a1a' },
  orks: { id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5c1a' },
};
const VIDEOS = [
  { id: 'tts', titre: 'TTS — l’Empereur', thumbnail: 'Emperor of Mankind', embedType: 'playlist', featured: true, tags: ['Empereur'] },
  { id: 'helsreach', titre: 'Helsreach', thumbnail: 'Helsreach Black Templars', embedType: 'video', tags: ['Black Templars', 'Orks'] },
];
const ARTWORKS = [
  { id: 'aw-001', title: 'Ultramarines', image: 'u.jpg', faction: 'space-marines', likes: 256, wikiQuery: 'Ultramarines warhammer' },
  { id: 'aw-n', title: 'Nécron', image: 'n.jpg', faction: 'necrons', likes: 10, wikiQuery: 'Necron warrior' },
  { id: 'aw-o', title: 'Ork', image: 'o.jpg', faction: 'orks', likes: 5, wikiQuery: 'Ork boyz' },
];

async function renderFaction(params: BehaviorSubject<ParamMap>, wiki: (q: string) => unknown) {
  const queries: string[] = [];
  const service = fakeWarhammerService({
    getFaction: (id: string) => of(FACTIONS[id]),
    getUnits: () => of([]),
    getSubFactions: () => of([]),
    videos$: of(VIDEOS),
    artworks$: of(ARTWORKS),
    getWikiImage: (q: string) => { queries.push(q); return wiki(q); },
  });
  await setupTestBed([FactionDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(FactionDetailComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { f, queries, cards: () => [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a.media-card')] };
}

describe('fiche faction — bloc Médias de la faction (L42)', () => {
  it('Nécrons : pas de vidéo étiquetée → carte neutre « Vidéos / Voir les vidéos » au symbole ⊗ ; galerie : l’illustration Nécrons, liée à la galerie filtrée', async () => {
    const { cards, queries } = await renderFaction(
      new BehaviorSubject(convertToParamMap({ id: 'necrons' })),
      () => of({ imageUrl: 'https://img/necron.jpg' }),
    );
    const [video, gallery] = cards();
    expect(video.querySelector('strong')!.textContent!.trim()).toBe('Vidéos');
    expect(video.textContent).toContain('Voir les vidéos');
    expect(video.textContent).not.toContain('Empereur');
    expect(video.getAttribute('href')).toBe('/videos');
    expect(video.querySelector('.play')!.textContent!.trim()).toBe('⊗');
    expect(gallery.querySelector('strong')!.textContent!.trim()).toBe('Galerie');
    expect(gallery.textContent).toContain('Nécrons');
    expect(gallery.getAttribute('href')).toBe('/gallery?faction=necrons');
    expect(queries).toContain('Necron warrior');
    expect(queries).not.toContain('Ultramarines warhammer');
    expect(queries).not.toContain('Emperor of Mankind');
  });

  it('Orks : la vidéo étiquetée « Orks » à la une de la page ; passer aux Nécrons : la vignette tardive des Orks n’écrase pas la leur', async () => {
    const params = new BehaviorSubject(convertToParamMap({ id: 'orks' }));
    const pending = new Map<string, Subject<{ imageUrl: string }>>();
    const { f, cards } = await renderFaction(params, (q) => {
      const s = new Subject<{ imageUrl: string }>();
      pending.set(q, s);
      return s;
    });
    expect(cards()[0].querySelector('strong')!.textContent!.trim()).toBe('Vidéo à la une');
    expect(cards()[0].textContent).toContain('Helsreach');
    expect(cards()[1].getAttribute('href')).toBe('/gallery?faction=orks');
    params.next(convertToParamMap({ id: 'necrons' }));
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    pending.get('Necron warrior')!.next({ imageUrl: 'https://img/necron.jpg' });
    pending.get('Ork boyz')!.next({ imageUrl: 'https://img/ork.jpg' }); // réponse tardive de la page précédente
    pending.get('Helsreach Black Templars')?.next({ imageUrl: 'https://img/helsreach.jpg' });
    f.detectChanges();
    const [video, gallery] = cards();
    expect(gallery.querySelector<HTMLElement>('.media-thumb')!.style.getPropertyValue('--m-img')).toContain('necron.jpg');
    expect(video.querySelector<HTMLElement>('.media-thumb')!.style.getPropertyValue('--m-img')).not.toContain('helsreach');
    expect(video.querySelector('strong')!.textContent!.trim()).toBe('Vidéos');
  });
});

// L87 — cartes d'unité (<article routerLink>) et encart « Voir toutes les unités » (<article (click)>)
// inopérants au clavier (WCAG 2.1.1) : lien <a href> et vrai <button>.
describe('fiche faction — unités au clavier (L87)', () => {
  it('cartes d’unité = liens ; « Voir toutes les unités » = bouton', async () => {
    const units = Array.from({ length: 30 }, (_, i) => ({
      id: `u${i}`, nom: `Unité ${i}`, factionId: 'orks', type: 'Infanterie', description: 'd',
    }));
    const service = fakeWarhammerService({
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of(units as never),
      getSubFactions: () => of([]),
      videos$: of([]),
      artworks$: of([]),
    });
    await setupTestBed([FactionDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'orks' })), snapshot: { fragment: null } } },
    ]);
    const f = TestBed.createComponent(FactionDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const cards = [...el.querySelectorAll<HTMLAnchorElement>('a.unit-card')];
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].getAttribute('href')).toBe('/units/u0');
    expect(el.querySelector('article.unit-card')).toBeNull();
    const extra = el.querySelector<HTMLButtonElement>('button.unit-extra');
    expect(extra).not.toBeNull();
    expect(extra!.type).toBe('button');
    expect(el.querySelector('article.unit-extra')).toBeNull();
  });
});
