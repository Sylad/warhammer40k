// Revue UX L39 — symbole de faction de repli (icône introuvable) : décoratif, masqué aux
// technologies d'assistance.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { UnitDetailComponent } from './unit-detail.component';

describe('fiche unité — symbole de faction (L39)', () => {
  it('le symbole affiché à la place de l’icône est aria-hidden', async () => {
    const service = fakeWarhammerService({
      getUnit: () => of({ id: 'u', factionId: 'orks', nom: 'Boyz', type: 'Infanterie', role: 'r', description: 'd' }),
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const sigil = (f.nativeElement as HTMLElement).querySelector('.hero-sigil')!;
    expect(sigil.textContent!.trim()).toBe('☠');
    expect(sigil.querySelector('[aria-hidden="true"]')?.textContent).toBe('☠');
  });

  it('les onglets sont dans une nav nommée et l’actif porte aria-current (L121)', async () => {
    const service = fakeWarhammerService({
      getUnit: () => of({ id: 'u', factionId: 'orks', nom: 'Boyz', type: 'Infanterie', role: 'r', description: 'd' }),
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    expect(root.querySelector('nav.tabs')!.getAttribute('aria-label')).toBe('Sections de la fiche');
    const current = () => Array.from(root.querySelectorAll('nav.tabs button')).filter(b => b.getAttribute('aria-current') === 'true');
    expect(current().map(b => b.textContent!.trim())).toEqual(['Aperçu']);
    (root.querySelectorAll('nav.tabs button')[2] as HTMLButtonElement).click();
    f.detectChanges();
    expect(current()).toHaveLength(1);
    expect(current()[0].textContent!.trim()).not.toBe('Aperçu');
  });

  it('les badges du hero ne répètent ni le type ni l’alignement (L124)', async () => {
    const service = fakeWarhammerService({
      getUnit: () => of({ id: 'u', factionId: 'ultramarines', nom: 'Tactique', type: 'Infanterie', role: 'r', description: 'd', badges: ['Infanterie', 'Imperium', 'Ligne'] }),
      getFaction: () => of({ id: 'ultramarines', nom: 'Ultramarines', alignement: 'Imperium', symbole: 'U', description: 'd', couleurThematique: '#14a' }),
      getUnits: () => of([]),
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const badges = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.hero-badges .ub'));
    expect(badges.map(b => b.textContent!.trim())).toEqual(['Infanterie', 'Ligne', 'Imperium']);
    expect(badges.every(b => b.className.split(' ').length > 1)).toBe(true);
  });
  it('un badge de données équivalent au type sans casse, accent ni langue est ignoré (L130)', async () => {
    const service = fakeWarhammerService({
      getUnit: () => of({ id: 'u', factionId: 'inq', nom: 'Eisenhorn', type: 'Héros', role: 'r', description: 'd', badges: ['Hero', 'Inquisitor'] }),
      getFaction: () => of({ id: 'inq', nom: 'Inquisition', alignement: 'Imperium', symbole: 'I', description: 'd', couleurThematique: '#14a' }),
      getUnits: () => of([]),
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const badges = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.hero-badges .ub'));
    expect(badges.map(b => b.textContent!.trim())).toEqual(['Héros', 'Inquisitor', 'Imperium']);
  });
  it('Description et Histoire & Lore n’affichent pas le même texte et la citation n’est rendue qu’une fois (L125)', async () => {
    const service = fakeWarhammerService({
      getUnit: () => of({ id: 'u', factionId: 'orks', nom: 'Boyz', type: 'Infanterie', role: 'r', description: 'Courte description.', loreCourt: 'Lore court.', loreLong: 'Long récit de lore.', citation: 'Waaagh !' }),
      getFaction: () => of({ id: 'orks', nom: 'Orks', alignement: 'Xenos', symbole: '☠', description: 'd', couleurThematique: '#3a5' }),
      getUnits: () => of([]),
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const texts = Array.from(root.querySelectorAll('.main .panel-text')).map(p => p.textContent!.trim());
    expect(texts.filter(t => t === 'Long récit de lore.')).toHaveLength(1);
    expect(root.querySelector('.panel-lore .panel-text')!.textContent!.trim()).toBe('Long récit de lore.');
    expect(root.textContent!.split('Waaagh !').length - 1).toBe(1);
  });
});

describe('fiche unité — CTA galerie et vidéo (L127)', () => {
  async function monter(videos: unknown[], faction = { id: 'blood-angels', nom: 'Blood Angels' }, unitNom = 'Sanguinor', unitExtra: Record<string, unknown> = {}, serviceExtra: Record<string, unknown> = {}) {
    const service = fakeWarhammerService({
      ...serviceExtra,
      getUnit: () => of({ id: 'u', factionId: faction.id, nom: unitNom, type: 'Infanterie', role: 'r', description: 'd', ...unitExtra }),
      getFaction: () => of({ id: faction.id, nom: faction.nom, alignement: 'Imperium', symbole: 'B', description: 'd', couleurThematique: '#a11' }),
      getUnits: () => of([]),
      videos$: of(videos),
    });
    await setupTestBed([UnitDetailComponent], [
      provideRouter([]),
      { provide: WarhammerService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'u' })), snapshot: { fragment: null } } },
    ]);
    globalThis.fetch = (async () => ({ ok: false, status: 404 })) as unknown as typeof fetch;
    const f = TestBed.createComponent(UnitDetailComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  }
  const cta = (root: HTMLElement, re: RegExp) =>
    Array.from(root.querySelectorAll<HTMLAnchorElement>('.hero-cta a')).find(a => re.test(a.textContent!));

  it('« Voir dans la galerie » filtre sur la faction de l’unité', async () => {
    const root = await monter([]);
    expect(cta(root, /GALERIE/)!.getAttribute('href')).toBe('/gallery?faction=blood-angels');
  });

  it('« Voir la vidéo » ouvre la vidéo dont un tag est la faction', async () => {
    const root = await monter([
      { id: 'astartes', titre: 'Astartes', tags: ['Space Marines'] },
      { id: 'angels-of-death', titre: 'Angels of Death', tags: ['Blood Angels', 'Officiel'] },
    ]);
    expect(cta(root, /VID/)!.getAttribute('href')).toBe('/videos?video=angels-of-death');
  });

  it('sans vidéo associée, le bouton « Voir la vidéo » n’est pas proposé', async () => {
    const root = await monter([{ id: 'astartes', titre: 'Astartes', tags: ['Space Marines'] }]);
    expect(cta(root, /VID/)).toBeUndefined();
    expect(cta(root, /GALERIE/)).toBeDefined();
  });

  const SM = { id: 'space-marines', nom: 'Space Marines' };
  const parodie = { id: 'flashgitz-space-king', titre: 'Flashgitz Space King', tags: ['Parodie', 'Space Marines', 'Humour', 'Animation'] };
  const chefDoeuvre = { id: 'astartes', titre: 'Astartes', tags: ['Space Marines', 'Action', "Chef-d'œuvre", 'Court-métrage'] };
  const officielle = { id: 'angels-of-death', titre: 'Angels of Death', tags: ['Blood Angels', 'Space Marines', 'Officiel'] };

  it('une parodie en tête de liste ne l’emporte pas sur le chef-d’œuvre', async () => {
    const root = await monter([parodie, chefDoeuvre, officielle], SM, 'Roboute Guilliman');
    expect(cta(root, /VID/)!.getAttribute('href')).toBe('/videos?video=astartes');
  });

  it('une vidéo officielle passe avant une parodie placée en tête', async () => {
    const root = await monter([parodie, { id: 'x', titre: 'Simple', tags: ['Space Marines'] }, officielle], SM, 'Dante');
    expect(cta(root, /VID/)!.getAttribute('href')).toBe('/videos?video=angels-of-death');
  });

  it('une vidéo à tag faction simple passe avant une parodie', async () => {
    const root = await monter([parodie, { id: 'simple', titre: 'Simple', tags: ['Space Marines', 'Lore'] }], SM, 'Dante');
    expect(cta(root, /VID/)!.getAttribute('href')).toBe('/videos?video=simple');
  });

  it('la parodie reste proposée quand elle est la seule correspondance', async () => {
    const root = await monter([parodie], SM, 'Dante');
    expect(cta(root, /VID/)!.getAttribute('href')).toBe('/videos?video=flashgitz-space-king');
  });

  it('un tag égal au nom de l’unité gagne sur tout tag de faction, accents et casse ignorés', async () => {
    const root = await monter([chefDoeuvre, officielle, { id: 'gui', titre: 'Guilliman', tags: ['roboute guilliman'] }], SM, 'Roboute Guilliman');
    expect(cta(root, /VID/)!.getAttribute('href')).toBe('/videos?video=gui');
  });

  it('un tag accentué ou à apostrophe typographique reconnaît le nom de la faction ou de l’unité', async () => {
    const necrons = await monter([{ id: 'necrons-v', titre: 'Necrons', tags: ['Nécrons'] }], { id: 'necrons', nom: 'necrons' }, 'Szarekh');
    expect(cta(necrons, /VID/)!.getAttribute('href')).toBe('/videos?video=necrons-v');
    const tau = await monter([parodie, { id: 'tau-v', titre: 'Tau', tags: ['T’au'] }], { id: 'tau-empire', nom: 'Empire T\'au' }, 'T\'au');
    expect(cta(tau, /VID/)!.getAttribute('href')).toBe('/videos?video=tau-v');
    const tau2 = await monter([{ id: 'tau-w', titre: 'Tau', tags: ["T'au"] }], { id: 'tau-empire', nom: 'Empire T’au' }, 'T’au');
    expect(cta(tau2, /VID/)!.getAttribute('href')).toBe('/videos?video=tau-w');
  });

  it('les vignettes d’iconographie pointent sur la galerie filtrée par la faction de l’unité', async () => {
    const root = await monter([], { id: 'blood-angels', nom: 'Blood Angels' }, 'Sanguinor',
      { galleryQueries: ['a', 'b'] },
      { getWikiImage: (q: string) => of({ imageUrl: `https://img.test/${q}.jpg`, pageTitle: q, pageUrl: null }) });
    const cartes = Array.from(root.querySelectorAll<HTMLAnchorElement>('.iconography-card'));
    expect(cartes.length).toBe(2);
    cartes.forEach(c => expect(c.getAttribute('href')).toBe('/gallery?faction=blood-angels'));
  });

  it('aucune vidéo ne porte la faction ni l’unité : pas de bouton, même avec des parodies', async () => {
    const root = await monter([parodie, { id: 'orks', titre: 'Orks', tags: ['Orks'] }], { id: 'tyranides', nom: 'Tyranides' }, 'Genestealer');
    expect(cta(root, /VID/)).toBeUndefined();
    expect(cta(root, /GALERIE/)).toBeDefined();
  });

  it('le lien vidéo est nommé par le titre de la vidéo, les glyphes décoratifs sont masqués', async () => {
    const root = await monter([chefDoeuvre], SM, 'Dante');
    expect(cta(root, /VID/)!.getAttribute('aria-label')).toBe('Voir la vidéo : Astartes');
    const ico = root.querySelectorAll('.hero-cta .cta-ico');
    expect(ico.length).toBe(2);
    ico.forEach(i => expect(i.getAttribute('aria-hidden')).toBe('true'));
  });
});
