// L6 — Revue UX des Vidéos : catalogue complet et compteurs justes (t1), filtres accessibles (t2),
// états de la liste (t3), édition cachée sans PIN et fenêtre « Ajouter une vidéo » accessible (t4).
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, defer, of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { PinService } from '../../core/services/pin.service';
import { VideosComponent } from './videos.component';
import type { Video } from '../../core/models/models';

const mk = (id: string, titre: string, extra: Partial<Video> = {}): Video => ({
  id, titre, createur: 'Chaîne test', description: `Description de ${titre}`, url: `https://www.youtube.com/watch?v=${id}`,
  embedId: `emb-${id}`, embedType: 'video', type: 'animation', langue: 'FR', tags: [], incontournable: false,
  duration: '10:00', category: 'lore', language: 'FR', featured: false, ...extra,
} as unknown as Video);

const VIDEOS: Video[] = [
  mk('fallen', 'The Fallen Crown', { featured: true, incontournable: true, duration: '5:00', category: 'animation' }),
  mk('long-star', 'Film complet', { featured: true, incontournable: true, duration: '1:20:00', category: 'animation', language: 'EN' }),
  mk('court', 'Court métrage', { duration: '4:00', category: 'animation' }),
  mk('moyen', 'Format moyen', { duration: '15:00', language: 'EN' }),
  mk('long', 'Long format', { duration: '45:00' }),
];

interface Rendu { f: ComponentFixture<VideosComponent>; el: HTMLElement }

async function rendre(flux: Record<string, unknown> = {}, pin: string | null = null): Promise<Rendu> {
  sessionStorage.clear();
  await setupTestBed([VideosComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ videos$: of(VIDEOS), ...flux }) },
  ]);
  if (pin) TestBed.inject(PinService).set(pin);
  const f = TestBed.createComponent(VideosComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}

async function maj(f: ComponentFixture<unknown>): Promise<void> {
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
}

const liste = (el: HTMLElement) => el.querySelector('[data-testid="liste-videos"]') as HTMLElement;
const titresListe = (el: HTMLElement) => Array.from(liste(el).querySelectorAll('.video-title')).map((t) => t.textContent!.trim());
const nombreResultats = (el: HTMLElement) => parseInt(el.querySelector('.results-count')!.textContent!, 10);
const puces = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('.filters .filter'));
const lignes = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLButtonElement>('.check-row'));
const bouton = (el: HTMLElement, texte: string) =>
  Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent!.includes(texte));

beforeEach(() => { sessionStorage.clear(); });

describe('L6 t1 — catalogue complet et compteurs justes', () => {
  it('« Toutes les vidéos » contient aussi les incontournables', async () => {
    const { el } = await rendre();
    expect(titresListe(el)).toContain('The Fallen Crown');
    expect(titresListe(el)).toContain('Film complet');
    expect(nombreResultats(el)).toBe(VIDEOS.length);
  });

  it('la recherche « fallen crown » trouve la vidéo incontournable', async () => {
    const { f, el } = await rendre();
    f.componentInstance.searchQuery.set('fallen crown');
    await maj(f);
    expect(titresListe(el)).toEqual(['The Fallen Crown']);
  });

  it('chaque compteur de Filtres avancés égale le nombre de résultats obtenu en activant le filtre', async () => {
    const { f, el } = await rendre();
    const attendus: number[] = [];
    for (const ligne of lignes(el)) attendus.push(parseInt(ligne.querySelector('.count')!.textContent!, 10));
    expect(attendus).toEqual([2, 2, 3, 3]);
    for (let i = 0; i < attendus.length; i++) {
      lignes(el)[i].click();
      await maj(f);
      expect(nombreResultats(el), `filtre ${i}`).toBe(attendus[i]);
      lignes(el)[i].click();
      await maj(f);
    }
  });

  it('le compteur tient compte de la recherche et de la puce déjà actives', async () => {
    const { f, el } = await rendre();
    puces(el).find((p) => p.textContent!.trim() === 'EN')!.click();
    await maj(f);
    // EN : « Film complet » (long) et « Format moyen » ; un seul est « Long format »
    expect(parseInt(lignes(el)[1].querySelector('.count')!.textContent!, 10)).toBe(1);
    lignes(el)[1].click();
    await maj(f);
    expect(nombreResultats(el)).toBe(1);
  });
});

describe('L6 t2 — filtres accessibles', () => {
  it('les 6 puces portent aria-pressed et suivent leur état', async () => {
    const { f, el } = await rendre();
    expect(puces(el)).toHaveLength(6);
    expect(puces(el).map((p) => p.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false', 'false', 'false', 'false']);
    puces(el)[2].click();
    await maj(f);
    expect(puces(el).map((p) => p.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false', 'false']);
  });

  it('les 4 filtres avancés portent aria-pressed et suivent leur état', async () => {
    const { f, el } = await rendre();
    expect(lignes(el)).toHaveLength(4);
    expect(lignes(el).every((l) => l.getAttribute('aria-pressed') === 'false')).toBe(true);
    lignes(el)[1].click();
    await maj(f);
    expect(lignes(el).map((l) => l.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
  });

  it('le tri a le nom « Trier par » et la recherche une étiquette', async () => {
    const { el } = await rendre();
    expect(el.querySelector('select.select')!.getAttribute('aria-label')).toBe('Trier par');
    expect(el.querySelector('input.search')!.getAttribute('aria-label')).toBe('Rechercher une vidéo');
  });

  it('« N résultats » est dans une région polite', async () => {
    const { el } = await rendre();
    const c = el.querySelector('.results-count')!;
    expect(c.getAttribute('role')).toBe('status');
    expect(c.getAttribute('aria-live')).toBe('polite');
  });

  it('le texte indicatif du champ de recherche a un contraste d’au moins 4,5:1', () => {
    const css = readFileSync(resolve(__dirname, 'videos.component.scss'), 'utf8');
    const regle = css.match(/\.search::placeholder[^{]*\{([^}]*)\}/);
    expect(regle, 'règle ::placeholder du champ de recherche').not.toBeNull();
    expect(regle![1]).toMatch(/color:\s*var\(--muted\)/);
    expect(regle![1]).toMatch(/opacity:\s*1/);
    const styles = readFileSync(resolve(__dirname, '../../../styles.scss'), 'utf8');
    const hex = (nom: string) => styles.match(new RegExp(`--${nom}:\\s*#([0-9a-fA-F]{6})`))![1];
    const lum = (h: string) => {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [a, b] = [lum(hex('muted')), lum('050403')].sort((x, y) => y - x);
    expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('L6 t3 — états de la liste', () => {
  it('pendant le chargement : ni « 0 résultat », ni « Aucune vidéo ne correspond », ni compteurs à 0', async () => {
    const { el } = await rendre({ videos$: NEVER });
    expect(el.querySelector('.results-count')).toBeNull();
    expect(el.querySelectorAll('.check-row .count')).toHaveLength(0);
    expect(liste(el).querySelector('[data-testid="chargement-liste"]')).not.toBeNull();
    expect(el.textContent).not.toContain('Aucune vidéo ne correspond');
  });

  it('catalogue vide : message propre au catalogue, sans « Effacer les filtres »', async () => {
    const { el } = await rendre({ videos$: of([]) });
    const vide = liste(el).querySelector('[data-testid="catalogue-vide"]')!;
    expect(vide.textContent).toContain('aucune vidéo');
    expect(bouton(el, 'Effacer les filtres')).toBeUndefined();
  });

  it('liste vide à cause des filtres : nomme les filtres et « Effacer les filtres » les retire', async () => {
    const { f, el } = await rendre();
    f.componentInstance.searchQuery.set('zzz');
    puces(el)[2].click();
    await maj(f);
    const vide = liste(el).querySelector('[data-testid="filtres-vides"]')!;
    expect(vide.textContent).toContain('« zzz »');
    expect(vide.textContent).toContain('Animations');
    bouton(el, 'Effacer les filtres')!.click();
    await maj(f);
    expect(liste(el).querySelector('[data-testid="filtres-vides"]')).toBeNull();
    expect(f.componentInstance.searchQuery()).toBe('');
    expect(f.componentInstance.activeFilter()).toBe('all');
    expect(f.componentInstance.sidebarFilters().size).toBe(0);
    expect(nombreResultats(el)).toBe(VIDEOS.length);
  });

  it('après « Réessayer » réussi, le focus va sur la liste', async () => {
    const flux = new Subject<Video[]>();
    let appels = 0;
    const { f, el } = await rendre({ videos$: defer(() => (++appels === 1 ? throwError(() => new Error('500')) : flux)) });
    document.body.appendChild(el);
    bouton(el, 'Réessayer')!.click();
    flux.next(VIDEOS);
    await maj(f);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(liste(el));
    expect(liste(el).getAttribute('tabindex')).toBe('-1');
    el.remove();
  });

  it('après le dernier « Charger plus », le focus va sur la première vidéo ajoutée', async () => {
    const beaucoup = Array.from({ length: 11 }, (_, i) => mk(`v${i}`, `Vidéo ${i}`));
    const { f, el } = await rendre({ videos$: of(beaucoup) });
    document.body.appendChild(el);
    bouton(el, 'Charger plus de vidéos')!.click();
    await maj(f);
    await new Promise((r) => setTimeout(r, 0));
    expect(bouton(el, 'Charger plus de vidéos')).toBeUndefined();
    const cartes = liste(el).querySelectorAll('.video-card .card-link');
    expect(document.activeElement).toBe(cartes[9]);
    el.remove();
  });
});

describe('L6 t4 — édition et fenêtre « Ajouter une vidéo »', () => {
  it('sans PIN : pas de « + Ajouter une vidéo »', async () => {
    const { el } = await rendre();
    expect(bouton(el, '+ Ajouter une vidéo')).toBeUndefined();
  });

  it('sans PIN : aucune carte n’a de ✕ de suppression', async () => {
    const { el } = await rendre();
    expect(liste(el).querySelectorAll('.video-card').length).toBeGreaterThan(0);
    expect(el.querySelector('.vc-delete')).toBeNull();
    expect(el.querySelector('[data-testid="bouton-supprimer"]')).toBeNull();
  });

  it('avec PIN : ✕ sur les cartes non à la une, jamais sur un incontournable (désormais aussi dans « Toutes les vidéos »)', async () => {
    const { el } = await rendre({}, '1234');
    const cartes = Array.from(liste(el).querySelectorAll('.video-card'));
    const parTitre = (t: string) => cartes.find((c) => c.querySelector('.video-title')!.textContent!.trim() === t)!;
    expect(parTitre('The Fallen Crown').querySelector('.vc-delete')).toBeNull();
    expect(parTitre('Court métrage').querySelector('.vc-delete')).not.toBeNull();
    expect(liste(el).querySelectorAll('.vc-delete').length).toBe(VIDEOS.filter((v) => !v.featured).length);
  });

  it('quitter l’édition retire les ✕', async () => {
    const { f, el } = await rendre({}, '1234');
    expect(el.querySelector('.vc-delete')).not.toBeNull();
    bouton(el, 'Quitter l’édition')!.click();
    await maj(f);
    expect(el.querySelector('.vc-delete')).toBeNull();
  });

  it('avec un PIN saisi : « + Ajouter une vidéo » apparaît', async () => {
    const { el } = await rendre({}, '1234');
    expect(bouton(el, '+ Ajouter une vidéo')).toBeDefined();
  });

  it('« Mode édition » du pied demande le PIN ; « Quitter l’édition » le retire', async () => {
    const { f, el } = await rendre();
    const pin = TestBed.inject(PinService);
    window.prompt = () => '4321';
    bouton(el, 'Mode édition')!.click();
    await maj(f);
    expect(pin.pin()).toBe('4321');
    expect(bouton(el, '+ Ajouter une vidéo')).toBeDefined();
    bouton(el, 'Quitter l’édition')!.click();
    await maj(f);
    expect(pin.pin()).toBeNull();
    expect(bouton(el, '+ Ajouter une vidéo')).toBeUndefined();
  });

  async function ouvrir(): Promise<Rendu & { ajout: HTMLButtonElement }> {
    const r = await rendre({}, '1234');
    document.body.appendChild(r.el);
    const ajout = bouton(r.el, '+ Ajouter une vidéo')!;
    ajout.focus();
    ajout.click();
    await maj(r.f);
    await new Promise((x) => setTimeout(x, 0));
    return { ...r, ajout };
  }

  it('la fenêtre est un role=dialog aria-modal nommé par son h2, focus sur le champ URL', async () => {
    const { el } = await ouvrir();
    const d = el.querySelector('.add-stage')!;
    expect(d.getAttribute('role')).toBe('dialog');
    expect(d.getAttribute('aria-modal')).toBe('true');
    const titre = el.querySelector(`#${d.getAttribute('aria-labelledby')}`)!;
    expect(titre.tagName).toBe('H2');
    expect(document.activeElement).toBe(el.querySelector('.add-input'));
    el.remove();
  });

  it('Tab et Maj+Tab bouclent dans la fenêtre', async () => {
    const { el } = await ouvrir();
    const fermer = el.querySelector<HTMLElement>('.add-close')!;
    const action = el.querySelector<HTMLElement>('.add-action')!;
    action.removeAttribute('disabled');
    fermer.focus();
    const maj_ = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    fermer.dispatchEvent(maj_);
    expect(maj_.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(action);
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    action.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(fermer);
    el.remove();
  });

  it('Échap rend le focus au bouton d’origine', async () => {
    const { f, el, ajout } = await ouvrir();
    expect(document.activeElement).not.toBe(ajout);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await maj(f);
    expect(el.querySelector('.add-stage')).toBeNull();
    expect(document.activeElement).toBe(ajout);
    el.remove();
  });

  it('✕ rend le focus au bouton d’origine', async () => {
    const { f, el, ajout } = await ouvrir();
    expect(document.activeElement).not.toBe(ajout);
    el.querySelector<HTMLButtonElement>('.add-close')!.click();
    await maj(f);
    expect(document.activeElement).toBe(ajout);
    el.remove();
  });

  it('URL, Description, Catégorie et Type ont un label relié à leur champ', async () => {
    const { f, el } = await ouvrir();
    f.componentInstance.preview.set({
      title: 'T', authorName: 'A', authorUrl: '', thumbnailUrl: '', suggestedChannelId: 'a', suggestedVideoId: 'v', matchedChannel: null,
    } as never);
    await maj(f);
    for (const texte of ['URL YouTube', 'Description', 'Catégorie', 'Type']) {
      const label = Array.from(el.querySelectorAll<HTMLLabelElement>('label.add-label')).find((l) => l.textContent!.includes(texte))!;
      expect(label, texte).toBeDefined();
      const cible = el.querySelector(`#${label.htmlFor}`);
      expect(cible, `champ de « ${texte} »`).not.toBeNull();
    }
    el.remove();
  });
});
