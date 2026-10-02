// L36 — titre de document par route (WCAG 2.4.2) : chaque page a son titre, en français,
// « <page> — Warhammer 40 000 » ; les fiches prennent le NOM de l'entité une fois chargée (pas
// l'identifiant de l'URL), un titre d'attente pendant le chargement et « … introuvable » sinon.
// Avant L36, toutes les routes s'appelaient « Warhammer 40 000 — Codex Numérique ».
import { setupTestBed } from '../../../testing/angular-testbed';
import { describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy, type Route } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { throwError, of } from 'rxjs';
import { routes } from '../../app.routes';
import { PageTitleService, PageTitleStrategy, namedPage } from './page-title.service';

@Component({ standalone: true, template: '' })
class Page {}

/** Les routes réelles de l'application, composants paresseux remplacés par une page vide. */
function stubbed(list: Route[]): Route[] {
  return list.map((r) => ({
    ...r,
    loadComponent: undefined,
    component: r.loadComponent ? Page : r.component,
    children: r.children ? stubbed(r.children) : undefined,
  }));
}

async function boot() {
  await setupTestBed([], [
    provideRouter(stubbed(routes)),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ]);
  return { router: TestBed.inject(Router), pages: TestBed.inject(PageTitleService), title: TestBed.inject(Title) };
}

const S = ' — Warhammer 40 000';
const TABLE: [string, string][] = [
  ['/', 'Accueil'],
  ['/factions', 'Factions'],
  ['/factions/necrons', 'Faction'],
  ['/units/sm-calgar', 'Unité'],
  ['/factions/space-marines/units/sm-calgar', 'Unité'],
  ['/subfactions/ultramarines', 'Sous-faction'],
  ['/romans', 'Romans'],
  ['/videos', 'Vidéos'],
  ['/gallery', 'Galerie'],
  ['/galerie', 'Galerie'],
  ['/lore', 'Lore'],
  ['/lore/emperor', 'L\'Empereur'],
  ['/lore/primarchs', 'Les Primarques'],
  ['/lore/primarchs/horus', 'Primarque'],
  ['/lore/chaos-gods', 'Panthéon Chaos'],
  ['/lore/civilians', 'Civils Impériaux'],
  ['/lore/concepts', 'Concepts & Lieux'],
  ['/lore/galaxy', 'La Galaxie'],
  ['/lore/equipment', 'Armement & Reliques'],
  ['/lore/equipment/anaris', 'Équipement'],
  ['/lore/timeline', 'Chronologie'],
  ['/lore/timeline/war-in-heaven', 'Événement'],
  ['/lore/ships', 'Vaisseaux légendaires'],
  ['/lore/ships/x', 'Vaisseau'],
  ['/lore/titans', 'Titans & Chevaliers'],
  ['/lore/titans/x', 'Machine de guerre'],
  ['/lore/saints', 'Saints & Saintes'],
  ['/lore/saints/x', 'Saint'],
  ['/nouveautes', 'Nouveautés'],
  ['/plan', 'Plan de travail'],
  ['/about', 'À propos'],
  ['/une-adresse-inconnue', 'Factions'],
];

describe('titre de document par route (L36)', () => {
  it.each(TABLE)('%s → « %s — Warhammer 40 000 »', async (url, page) => {
    const { router, title } = await boot();
    await router.navigateByUrl(url);
    expect(title.getTitle()).toBe(page + S);
  });

  it('la table couvre TOUTES les pages de l’application, et deux pages n’ont jamais le même titre', async () => {
    const layout = routes.find((r) => r.children)!;
    const paths = layout.children!.filter((r) => !r.redirectTo && r.path !== '**').map((r) => '/' + r.path);
    const tested = TABLE.map(([u]) => u);
    for (const p of paths) {
      const re = new RegExp('^' + p.replace(/:[a-zA-Z]+/g, '[^/]+') + '$');
      expect(tested.some((u) => re.test(u)), `${p} sans titre testé`).toBe(true);
    }
    const pageTitles = TABLE.filter(([u]) => paths.includes(u)).map(([, t]) => t);
    expect(new Set(pageTitles).size).toBe(pageTitles.length);
  });

  it('fiche : nom de l’entité une fois chargée, puis titre d’attente sur la fiche suivante', async () => {
    const { router, pages, title } = await boot();
    await router.navigateByUrl('/factions/necrons');
    expect(pages.entityName()).toBeNull();
    pages.setName('Nécrons');
    expect(title.getTitle()).toBe('Nécrons' + S);
    expect(pages.pageName()).toBe('Nécrons');
    // Ancre de la même fiche : le nom reste.
    await router.navigateByUrl('/factions/necrons#units');
    expect(title.getTitle()).toBe('Nécrons' + S);
    // Autre faction, même composant : plus jamais le nom de la précédente.
    await router.navigateByUrl('/factions/orks');
    expect(title.getTitle()).toBe('Faction' + S);
    expect(pages.entityName()).toBeNull();
  });

  it('fiche introuvable : « Unité introuvable »', async () => {
    const { router, pages, title } = await boot();
    await router.navigateByUrl('/units/inconnue');
    pages.setNotFound();
    expect(title.getTitle()).toBe('Unité introuvable' + S);
    expect(pages.entityName()).toBe('Unité introuvable');
  });

  it('namedPage : nomme la page à l’arrivée de l’entité, « introuvable » sur erreur (sans casser le flux)', async () => {
    const { router, pages, title } = await boot();
    await router.navigateByUrl('/lore/timeline/war-in-heaven');
    const seen: unknown[] = [];
    of({ title: 'La Guerre dans le Ciel' }).pipe(namedPage(pages, (e) => e.title)).subscribe((v) => seen.push(v));
    expect(title.getTitle()).toBe('La Guerre dans le Ciel' + S);
    expect(seen).toHaveLength(1);
    await router.navigateByUrl('/lore/timeline/inconnu');
    let failed = false;
    throwError(() => new Error('404')).pipe(namedPage(pages, () => 'x')).subscribe({ error: () => (failed = true) });
    expect(title.getTitle()).toBe('Événement introuvable' + S);
    expect(failed).toBe(true);
  });
});

describe('annonce du changement de page aux lecteurs d’écran (L36)', () => {
  it('rien au premier chargement ; à la navigation suivante, le nom de la page (fiche : une fois le nom connu)', async () => {
    const { router, pages } = await boot();
    await router.navigateByUrl('/videos');
    expect(pages.announcement()).toBe('');
    await router.navigateByUrl('/gallery');
    expect(pages.announcement().trim()).toBe('Galerie');
    await router.navigateByUrl('/units/sm-calgar');
    expect(pages.announcement().trim()).toBe('Galerie'); // pas « Unité » : on attend le nom
    pages.setName('Marneus Calgar');
    expect(pages.announcement().trim()).toBe('Marneus Calgar');
  });

  it('même page annoncée deux fois de suite : le texte change quand même (sinon pas relu)', async () => {
    const { router, pages } = await boot();
    await router.navigateByUrl('/videos');
    await router.navigateByUrl('/units/a');
    pages.setNotFound();
    const first = pages.announcement();
    expect(first.trim()).toBe('Unité introuvable');
    await router.navigateByUrl('/units/b');
    pages.setNotFound();
    expect(pages.announcement().trim()).toBe('Unité introuvable');
    expect(pages.announcement()).not.toBe(first);
  });

  it('ancre de la même page : pas d’annonce ; focus déjà porté sur le titre h1 : pas d’annonce', async () => {
    const { router, pages } = await boot();
    await router.navigateByUrl('/videos');
    await router.navigateByUrl('/gallery');
    const before = pages.announcement();
    await router.navigateByUrl('/gallery#x');
    expect(pages.announcement()).toBe(before);
    pages.skipNextAnnouncement();
    await router.navigateByUrl('/about');
    expect(pages.announcement()).toBe(before);
    await router.navigateByUrl('/plan');
    expect(pages.announcement().trim()).toBe('Plan de travail');
  });
});
