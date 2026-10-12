// L35 — écran « Jeux vidéo » (/jeux-video) : oracle d'acceptation écrit avant le code, d'après
// docs/specs/jeux-video/fiche.yaml et maquette.html. Sélecteurs = data-testid = ids de champs.
// La page est atteinte par la route /jeux-video du gabarit principal (aucun chemin de composant supposé).
// Données : GET /jeux-data/jeux.json (statique, lu par fetch comme /nouveautes-data/*.json).
import { setupTestBed } from '../../../testing/angular-testbed';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Component, type Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { routes } from '../../app.routes';
import { MainLayoutComponent } from '../../layout/main-layout/main-layout.component';

@Component({ standalone: true, template: `<h1>Page</h1>` })
class ArrivalPage {}

const URL_JEUX = '/jeux-data/jeux.json';

const DATA = {
  verifieLe: '2026-10-11',
  aVenir: [
    {
      id: 'dawn-of-war-4', titre: 'Dawn of War 4', statut: 'En développement', sortie: 'Mars 2027',
      genre: 'Stratégie en temps réel', plateformes: ['PC'],
      resume: 'Campagne et factions annoncées par l’éditeur.',
      source: 'https://example.org/annonce-dow4', image: '/jeux-data/dow4.jpg',
    },
    {
      id: 'total-war', titre: 'Total War: Warhammer 40,000', statut: 'Annoncé', sortie: null,
      genre: 'Stratégie et batailles en temps réel', plateformes: ['PC'],
      resume: 'Présentation du contenu annoncé.', source: 'https://example.org/annonce-tw',
    },
    {
      id: 'trimestre', titre: 'Jeu du trimestre', statut: 'Annoncé', sortie: 'T3 2027',
      genre: 'Action', plateformes: ['PC', 'PlayStation'], resume: 'Résumé T.', source: 'https://example.org/t',
    },
    {
      id: 'annee', titre: 'Jeu de l’année', statut: 'Annoncé', sortie: '2028',
      genre: 'Aventure', plateformes: ['Xbox'], resume: 'Résumé A.', source: 'https://example.org/a',
    },
    {
      id: 'jour', titre: 'Jeu du jour', statut: 'En développement', sortie: '12 mars 2027',
      genre: 'RPG', plateformes: ['PC'], resume: 'Résumé J.', source: 'https://example.org/j',
    },
  ],
  // volontairement dans le désordre : la page doit trier du plus récent au plus ancien
  existants: [
    { id: 'ancien', titre: 'Jeu ancien', annee: 2017, resume: 'Présentation ancienne.', plateformes: ['PC'] },
    { id: 'sm2', titre: 'Space Marine 2', annee: 2024, resume: 'Action à la troisième personne.', plateformes: ['PC', 'PlayStation', 'Xbox'] },
    { id: 'milieu', titre: 'Jeu du milieu', annee: 2022, resume: 'Présentation du milieu.', plateformes: ['PC'] },
  ],
};

type Mode = 'ok' | 'vide' | 'pending' | 'erreur';
let calls: string[] = [];
let mode: Mode = 'ok';
let failuresLeft = 0;

function stubJeux(): void {
  calls = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (!url.endsWith(URL_JEUX)) return { ok: false, status: 404, json: async () => null } as Response;
    calls.push(url);
    if (mode === 'pending') return new Promise<Response>(() => {});
    if (mode === 'erreur' || failuresLeft-- > 0) throw new TypeError('réseau coupé');
    const body = mode === 'vide' ? { verifieLe: '2026-10-11', aVenir: [], existants: [] } : DATA;
    return { ok: true, status: 200, json: async () => structuredClone(body) } as Response;
  }) as typeof fetch;
}

const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const $ = (f: ComponentFixture<unknown>, id: string) => el(f).querySelector<HTMLElement>(`[data-testid="${id}"]`);
const $$ = (f: ComponentFixture<unknown>, id: string) => [...el(f).querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)];
const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function settle(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    f.detectChanges();
    await f.whenStable();
    await new Promise((r) => setTimeout(r, 0));
  }
  f.detectChanges();
}

async function renderPage(): Promise<ComponentFixture<unknown>> {
  const layout = routes.find((r) => r.component === MainLayoutComponent);
  const route = layout?.children?.find((r) => r.path === 'jeux-video');
  expect(route, 'la route « jeux-video » doit exister dans le gabarit principal').toBeDefined();
  const component = await (route!.loadComponent as () => Promise<Type<unknown>>)();
  const f = TestBed.createComponent(component);
  await settle(f);
  return f;
}

async function renderLayout(url: string): Promise<ComponentFixture<MainLayoutComponent>> {
  const f = TestBed.createComponent(MainLayoutComponent);
  await TestBed.inject(Router).navigateByUrl(url);
  await settle(f);
  return f as ComponentFixture<MainLayoutComponent>;
}

beforeEach(async () => {
  mode = 'ok';
  failuresLeft = 0;
  localStorage.clear();
  stubJeux();
  // le gabarit lit aussi le journal des nouveautés (pastille)
  const base = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes('/nouveautes-data/')) {
      return { ok: true, status: 200, json: async () => ({ project: 'warhammer40k', generated: '', entries: [] }) } as Response;
    }
    return base(input);
  }) as typeof fetch;
  await setupTestBed([MainLayoutComponent], [
    provideHttpClient(), provideHttpClientTesting(),
    provideRouter([{ path: 'jeux-video', component: ArrivalPage }, { path: '', component: ArrivalPage }]),
  ]);
});

describe('L35 — Jeux vidéo : page', () => {
  it('R1 — chargé : « À venir » précède « Déjà sortis »', async () => {
    const f = await renderPage();
    expect(text($(f, 'titre-page'))).toBe('Jeux vidéo');
    expect(text($(f, 'intro-page'))).not.toBe('');
    const venir = $(f, 'section-a-venir')!;
    const sortis = $(f, 'section-existants')!;
    expect(venir).not.toBeNull();
    expect(sortis).not.toBeNull();
    expect(text(venir.querySelector('h2'))).toBe('À venir');
    expect(text(sortis.querySelector('h2'))).toBe('Déjà sortis');
    expect(venir.compareDocumentPosition(sortis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect($$(f, 'carte-a-venir')).toHaveLength(DATA.aVenir.length);
    expect($$(f, 'ligne-existant')).toHaveLength(DATA.existants.length);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('R2 — carte à venir : tous les champs et le lien source', async () => {
    const f = await renderPage();
    const carte = $$(f, 'carte-a-venir')[0];
    const q = (id: string) => carte.querySelector<HTMLElement>(`[data-testid="${id}"]`)!;
    expect(text(q('jeu-titre'))).toContain('Dawn of War 4');
    expect(text(q('jeu-statut'))).toBe('En développement');
    expect(text(q('jeu-date'))).toContain('Mars 2027');
    expect(text(q('jeu-date'))).toContain('annoncée');
    expect(text(q('jeu-genre'))).toContain('Stratégie en temps réel');
    expect(text(q('jeu-plateformes'))).toContain('PC');
    expect(text(q('jeu-resume'))).toContain('Campagne et factions annoncées');
    const lien = q('jeu-source') as HTMLAnchorElement;
    expect(lien.tagName).toBe('A');
    expect(lien.getAttribute('href')).toBe('https://example.org/annonce-dow4');
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(lien.getAttribute('rel') ?? '').toContain('noopener');
    // visuel : l'image fournie
    expect(q('jeu-visuel').querySelector('img')!.getAttribute('src')).toBe('/jeux-data/dow4.jpg');
    // sans image : symbole de repli, pas d'<img>
    const sansImage = $$(f, 'carte-a-venir')[1].querySelector<HTMLElement>('[data-testid="jeu-visuel"]')!;
    expect(sansImage.querySelector('img')).toBeNull();
    expect(text(sansImage)).not.toBe('');
    // plusieurs plateformes
    expect(text($$(f, 'carte-a-venir')[2].querySelector('[data-testid="jeu-plateformes"]'))).toMatch(/PC.*PlayStation/);
  });

  it('R2 — date inconnue : « Date non communiquée »', async () => {
    const f = await renderPage();
    const date = $$(f, 'carte-a-venir')[1].querySelector<HTMLElement>('[data-testid="jeu-date"]')!;
    expect(text(date)).toContain('Date non communiquée');
    expect(text(date)).not.toContain('annoncée');
    expect(text(date)).not.toMatch(/\d{4}/);
  });

  it('R2 — date imprécise (mois, trimestre, année) : affichée telle quelle avec « annoncée »', async () => {
    const f = await renderPage();
    const dates = $$(f, 'carte-a-venir').map((c) => text(c.querySelector('[data-testid="jeu-date"]')));
    expect(dates[0]).toContain('Mars 2027');
    expect(dates[2]).toContain('T3 2027');
    expect(dates[3]).toContain('2028');
    expect(dates[4]).toContain('12 mars 2027');
    for (const i of [0, 2, 3, 4]) expect(dates[i]).toContain('annoncée');
    // jamais une date devinée : pas de jour ajouté au mois, au trimestre ni à l'année
    expect(dates[0]).not.toMatch(/\b\d{1,2} mars/i);
    expect(dates[2]).not.toMatch(/juillet|septembre|\d{1,2} /i);
    expect(dates[3]).not.toMatch(/janvier|\d{1,2} /i);
  });

  it('R3 — chargé : la date de vérification est affichée', async () => {
    const f = await renderPage();
    expect(text($(f, 'date-verification'))).toContain('Informations vérifiées le 11 octobre 2026');
  });

  it('R4 — existants : ordre décroissant des années', async () => {
    const f = await renderPage();
    const lignes = $$(f, 'ligne-existant');
    const annees = lignes.map((l) => text(l.querySelector('[data-testid="existant-annee"]')));
    expect(annees).toEqual(['2024', '2022', '2017']);
    const premiere = lignes[0];
    expect(text(premiere.querySelector('[data-testid="existant-titre"]'))).toBe('Space Marine 2');
    expect(text(premiere.querySelector('[data-testid="existant-resume"]'))).toContain('troisième personne');
    const plat = text(premiere.querySelector('[data-testid="existant-plateformes"]'));
    for (const p of ['PC', 'PlayStation', 'Xbox']) expect(plat).toContain(p);
  });

  it('R6 — liste vide : message affiché, aucune section', async () => {
    mode = 'vide';
    const f = await renderPage();
    expect(text($(f, 'message-vide'))).toContain('Aucun jeu à présenter pour le moment.');
    for (const id of ['section-a-venir', 'liste-a-venir', 'section-existants', 'liste-existants', 'date-verification']) {
      expect($(f, id), id).toBeNull();
    }
    expect(text($(f, 'titre-page'))).toBe('Jeux vidéo');
  });

  it('R7 — chargement : message annoncé en role=status', async () => {
    mode = 'pending';
    const f = await renderPage();
    const msg = $(f, 'message-chargement')!;
    expect(msg).not.toBeNull();
    expect(text(msg)).toBe('Chargement des jeux…');
    expect((msg.closest('[role="status"]') ?? msg).getAttribute('role')).toBe('status');
    expect(text($(f, 'titre-page'))).toBe('Jeux vidéo');
    expect($(f, 'section-a-venir')).toBeNull();
    expect($(f, 'message-erreur')).toBeNull();
  });

  it('R8 — erreur : message et bouton Réessayer', async () => {
    mode = 'erreur';
    const f = await renderPage();
    expect(text($(f, 'message-erreur'))).toContain('Impossible de charger les jeux vidéo.');
    const bouton = $(f, 'bouton-reessayer') as HTMLButtonElement;
    expect(bouton.tagName).toBe('BUTTON');
    expect(text(bouton)).toBe('Réessayer');
    expect($(f, 'section-a-venir')).toBeNull();
    expect($(f, 'message-chargement')).toBeNull();
  });

  it('R8 — Réessayer relance la lecture', async () => {
    failuresLeft = 1;
    const f = await renderPage();
    expect($(f, 'message-erreur')).not.toBeNull();
    const avant = calls.length;
    ($(f, 'bouton-reessayer') as HTMLButtonElement).click();
    await settle(f);
    expect(calls.length).toBe(avant + 1);
    expect($(f, 'message-erreur')).toBeNull();
    expect($(f, 'section-a-venir')).not.toBeNull();
    expect($$(f, 'carte-a-venir')).toHaveLength(DATA.aVenir.length);
  });
});

describe('L35 — Jeux vidéo : navigation', () => {
  it('R5 — le lien de navigation mène à /jeux-video et est actif', async () => {
    const f = await renderLayout('/jeux-video');
    const lien = $(f, 'lien-navigation') as HTMLAnchorElement;
    expect(lien).not.toBeNull();
    expect(lien.closest('nav.nav')).not.toBeNull();
    expect(text(lien)).toBe('Jeux vidéo');
    expect(lien.getAttribute('href')).toBe('/jeux-video');
    expect(lien.getAttribute('aria-current')).toBe('page');
    // entre Vidéos et Galerie
    const hrefs = [...el(f).querySelectorAll<HTMLAnchorElement>('nav.nav > a, nav.nav > .nav-dropdown > a')].map((a) => a.getAttribute('href'));
    const i = hrefs.indexOf('/jeux-video');
    expect(hrefs[i - 1]).toBe('/videos');
    expect(hrefs[i + 1]).toBe('/gallery');
    // inactif ailleurs
    await TestBed.inject(Router).navigateByUrl('/');
    await settle(f);
    expect(($(f, 'lien-navigation') as HTMLElement).getAttribute('aria-current')).not.toBe('page');
  });

  it('R5 — barre : aucun débordement aux seuils (topbar.e2e)', () => {
    // Le test navigateur (topbar.e2e.spec.ts) exige un build ; ici on garde le seuil du tiroir
    // fixé par la fiche : @media (width < 84em), et non plus 80em.
    const src = readFileSync(resolve(__dirname, '../../layout/main-layout/main-layout.component.ts'), 'utf8');
    expect(src).toMatch(/@media\s*\(\s*width\s*<\s*84em\s*\)/);
    expect(src).not.toMatch(/@media\s*\(\s*width\s*<\s*80em\s*\)/);
    const e2e = readFileSync(resolve(__dirname, '../../layout/main-layout/topbar.e2e.spec.ts'), 'utf8');
    expect(e2e).toMatch(/DRAWER_EM\s*=\s*84\b/);
  });

  it('R9 — tiroir ouvert : lien Jeux vidéo présent et actif', async () => {
    const f = await renderLayout('/jeux-video');
    const tiroir = el(f).querySelector('#menu-telephone')!;
    const lien = tiroir.querySelector<HTMLAnchorElement>('[data-testid="lien-navigation-tiroir"]')!;
    expect(lien).not.toBeNull();
    expect(text(lien)).toBe('Jeux vidéo');
    expect(lien.getAttribute('href')).toBe('/jeux-video');
    expect(lien.getAttribute('aria-current')).toBe('page');
    const hrefs = [...tiroir.querySelectorAll<HTMLAnchorElement>('a')].map((a) => a.getAttribute('href'));
    const i = hrefs.indexOf('/jeux-video');
    expect(hrefs[i - 1]).toBe('/videos');
    expect(hrefs[i + 1]).toBe('/gallery');
  });
});
