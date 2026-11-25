// L262 r1 (revue de code du 25-11) — suivi-titres.ts n'était atteint que par les e2e (reflux, L248).
//  - `suivreLargeur` : le rappel part quand la largeur intérieure (`clientWidth`) change, jamais pour un changement de
//    hauteur seule (la passe des titres change la hauteur de la page : elle ne doit pas se relancer elle-même) ; la
//    fonction rendue arrête l'observation ; sans ResizeObserver, rien ne casse ;
//  - `sansPerdreLesDefilements` : un défilement interne remis à zéro (ou rabattu) pendant la passe est rendu après
//    elle, un élément qui n'était pas défilé n'est pas touché, la valeur de la passe est rendue.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sansPerdreLesDefilements, suivreLargeur } from './suivi-titres';

type Rappel = () => void;

/** ResizeObserver factice : `declencher()` simule une notification (le navigateur en envoie à chaque changement de
 *  boîte, largeur ou hauteur). */
function installerResizeObserver() {
  const instances: { rappel: Rappel; observes: Element[]; deconnecte: boolean }[] = [];
  class Faux {
    private readonly etat: (typeof instances)[number];
    constructor(rappel: Rappel) {
      this.etat = { rappel, observes: [], deconnecte: false };
      instances.push(this.etat);
    }
    observe(e: Element) { this.etat.observes.push(e); }
    unobserve() { /* inutile ici */ }
    disconnect() { this.etat.deconnecte = true; }
  }
  vi.stubGlobal('ResizeObserver', Faux);
  return {
    instances,
    declencher: () => instances.filter((i) => !i.deconnecte).forEach((i) => i.rappel()),
  };
}

/** Élément dont `clientWidth`, `scrollTop` et `scrollLeft` sont pilotables (jsdom ne met rien en page). */
function boite(largeur = 300): HTMLElement & { largeur: number } {
  const e = document.createElement('div') as HTMLElement & { largeur: number };
  e.largeur = largeur;
  Object.defineProperty(e, 'clientWidth', { get: () => e.largeur });
  let haut = 0;
  let gauche = 0;
  Object.defineProperty(e, 'scrollTop', { configurable: true, get: () => haut, set: (v: number) => { haut = v; } });
  Object.defineProperty(e, 'scrollLeft', { get: () => gauche, set: (v: number) => { gauche = v; } });
  return e;
}

afterEach(() => vi.unstubAllGlobals());

describe('suivreLargeur — L262', () => {
  it('appelle le rappel quand la largeur change, pas pour une notification à largeur égale', () => {
    const ro = installerResizeObserver();
    const e = boite(300);
    const rappel = vi.fn();
    suivreLargeur(e, rappel);
    expect(ro.instances[0].observes).toEqual([e]);

    ro.declencher(); // hauteur changée seulement
    expect(rappel).not.toHaveBeenCalled();

    e.largeur = 288; // barre de défilement apparue
    ro.declencher();
    expect(rappel).toHaveBeenCalledTimes(1);

    ro.declencher(); // même largeur que la dernière vue
    expect(rappel).toHaveBeenCalledTimes(1);

    e.largeur = 300;
    ro.declencher();
    expect(rappel).toHaveBeenCalledTimes(2);
  });

  it('la fonction rendue arrête l’observation', () => {
    const ro = installerResizeObserver();
    const e = boite(300);
    const rappel = vi.fn();
    const arreter = suivreLargeur(e, rappel);
    arreter();
    expect(ro.instances[0].deconnecte).toBe(true);
    e.largeur = 200;
    ro.declencher();
    expect(rappel).not.toHaveBeenCalled();
  });

  it('sans ResizeObserver, ne fait rien et rend un arrêt utilisable', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const rappel = vi.fn();
    const arreter = suivreLargeur(boite(), rappel);
    expect(() => arreter()).not.toThrow();
    expect(rappel).not.toHaveBeenCalled();
  });
});

describe('sansPerdreLesDefilements — L262', () => {
  it('rend les défilements internes perdus pendant la passe, et la valeur de la passe', () => {
    const racine = document.createElement('main');
    const liste = boite();
    const bandeau = boite();
    const immobile = boite();
    racine.append(liste, bandeau, immobile);
    liste.scrollTop = 240;
    bandeau.scrollLeft = 75;
    const ecritures = vi.fn();
    Object.defineProperty(immobile, 'scrollTop', { get: () => 0, set: ecritures });

    const r = sansPerdreLesDefilements(racine, () => {
      // la passe efface les tailles : la liste grandit, le navigateur rabat son défilement
      liste.scrollTop = 0;
      bandeau.scrollLeft = 10;
      return 7;
    });

    expect(r).toBe(7);
    expect(liste.scrollTop).toBe(240);
    expect(bandeau.scrollLeft).toBe(75);
    expect(ecritures).not.toHaveBeenCalled(); // pas défilé avant : jamais touché
  });

  it('ne réécrit pas un défilement resté en place', () => {
    const racine = document.createElement('main');
    const liste = boite();
    racine.append(liste);
    liste.scrollTop = 120;
    const ecrit = vi.fn();
    let haut = 120;
    Object.defineProperty(liste, 'scrollTop', { get: () => haut, set: (v: number) => { ecrit(v); haut = v; } });
    sansPerdreLesDefilements(racine, () => undefined);
    expect(ecrit).not.toHaveBeenCalled();
  });
});
