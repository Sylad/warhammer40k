// L44 — « Actualités de l'univers » (accueil) : faits sourcés et datés, date de revue unique.
import { setupTestBed, stubFetch } from '../../../../testing/angular-testbed';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ACTUALITES_NOW, ActualitesComponent } from './actualites.component';
import { VEILLE_CHARGEMENT, VEILLE_URL, chargerVeille, dateVeille, prochaineRevue, trierActualites, type Veille } from './veille.utils';

const VEILLE: Veille = {
  revueLe: '2026-11-22',
  rythmeJours: 30,
  actualites: [
    { id: 'mois', date: '2026-06', titre: 'Sortie de la 11e édition', resume: 'Résumé M.', source: 'https://en.wikipedia.org/wiki/X', consulteLe: '2026-11-22' },
    { id: 'jour', date: '2026-10-07', titre: 'Un roman annoncé', resume: 'Résumé J.', source: 'https://www.warhammer-community.com/a', consulteLe: '2026-11-20' },
  ],
};

let maintenant = new Date(2026, 10, 22);
const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const $ = (f: ComponentFixture<unknown>, id: string) => el(f).querySelector<HTMLElement>(`[data-testid="${id}"]`);
const $$ = (f: ComponentFixture<unknown>, id: string) => [...el(f).querySelectorAll<HTMLElement>(`[data-testid="${id}"]`)];
const text = (e: Element | null) => (e?.textContent ?? '').replace(/\s+/g, ' ').trim();

async function rendre(): Promise<ComponentFixture<ActualitesComponent>> {
  const f = TestBed.createComponent(ActualitesComponent);
  for (let i = 0; i < 3; i++) {
    f.detectChanges();
    await f.whenStable();
    await new Promise((r) => setTimeout(r, 0));
  }
  f.detectChanges();
  return f;
}

beforeEach(async () => {
  maintenant = new Date(2026, 10, 22);
  stubFetch({ [VEILLE_URL]: VEILLE });
  await setupTestBed([ActualitesComponent], [
    { provide: ACTUALITES_NOW, useValue: () => maintenant },
    { provide: VEILLE_CHARGEMENT, useValue: () => chargerVeille() },
  ]);
});

describe('L44 — utilitaires de la veille', () => {
  it('une date n’est affichée qu’à sa précision : jamais un jour inventé', () => {
    expect(dateVeille('2026-10-07')).toBe('7 octobre 2026');
    expect(dateVeille('2026-06')).toBe('juin 2026');
    expect(dateVeille('2026')).toBe('2026');
  });

  it('prochaine revue = revue + rythme, en jours civils (changement de mois et d’année)', () => {
    expect(prochaineRevue('2026-11-22', 30)).toBe('2026-12-22');
    expect(prochaineRevue('2026-12-15', 30)).toBe('2027-01-14');
  });

  it('les actualités vont de la plus récente à la plus ancienne', () => {
    expect(trierActualites(VEILLE.actualites).map((a) => a.id)).toEqual(['jour', 'mois']);
  });
});

describe('L44 — section « Actualités de l’univers »', () => {
  it('affiche la date de revue et la prochaine, lues dans veille.json', async () => {
    const f = await rendre();
    const revue = $(f, 'actualites-revue');
    expect(text(revue)).toContain('Contenu revu le 22 novembre 2026.');
    expect(text(revue)).toContain('Prochaine revue au plus tard le 22 décembre 2026.');
    expect(revue?.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-22');
  });

  it('chaque actualité montre sa date, son titre et un lien vers sa source, dans l’ordre chronologique inverse', async () => {
    const f = await rendre();
    expect($$(f, 'actualite-titre').map(text)).toEqual(['Un roman annoncé', 'Sortie de la 11e édition']);
    expect($$(f, 'actualite-date').map(text)).toEqual(['7 octobre 2026', 'juin 2026']);
    const liens = $$(f, 'actualite-source') as HTMLAnchorElement[];
    expect(liens.map((a) => a.getAttribute('href'))).toEqual(['https://www.warhammer-community.com/a', 'https://en.wikipedia.org/wiki/X']);
    expect(text(liens[0])).toMatch(/^Source : warhammer-community\.com — Un roman annoncé \(nouvel onglet\)/);
    expect(liens.every((a) => a.target === '_blank' && a.rel.includes('noopener'))).toBe(true);
    expect(text(el(f).querySelector('[data-testid="actualite"]'))).toContain('consultée le 20 novembre 2026');
  });

  it('une revue dépassée est signalée, jamais présentée comme à jour', async () => {
    maintenant = new Date(2026, 11, 23);
    const f = await rendre();
    expect(text($(f, 'actualites-revue'))).toContain('Revue prévue le 22 décembre 2026 : pas encore faite');
    expect(text($(f, 'actualites-revue'))).not.toContain('Prochaine revue au plus tard');
  });

  it('le jour même de la revue prévue, elle n’est pas encore en retard', async () => {
    maintenant = new Date(2026, 11, 22);
    const f = await rendre();
    expect(text($(f, 'actualites-revue'))).toContain('Prochaine revue au plus tard le 22 décembre 2026');
  });

  it('chargement annoncé, puis erreur avec Réessayer qui recharge', async () => {
    let echecs = 1;
    globalThis.fetch = (async () => {
      if (echecs-- > 0) throw new TypeError('réseau coupé');
      return { ok: true, status: 200, json: async () => structuredClone(VEILLE) } as Response;
    }) as typeof fetch;
    const f = await rendre();
    expect(text($(f, 'actualites-erreur'))).toContain('Impossible de charger les actualités');
    expect($(f, 'actualites-erreur')?.closest('[role="alert"]')).not.toBeNull();
    (el(f).querySelector('.act-btn') as HTMLButtonElement).click();
    for (let i = 0; i < 3; i++) { f.detectChanges(); await f.whenStable(); await new Promise((r) => setTimeout(r, 0)); }
    f.detectChanges();
    expect($$(f, 'actualite')).toHaveLength(2);
  });

  it('un fichier mal formé est une erreur, pas « aucune actualité »', async () => {
    stubFetch({ [VEILLE_URL]: { actualites: [] } });
    const f = await rendre();
    expect($(f, 'actualites-erreur')).not.toBeNull();
    expect($(f, 'actualites-vide')).toBeNull();
  });

  it('liste vide : dit qu’il n’y a rien, avec la date de revue', async () => {
    stubFetch({ [VEILLE_URL]: { ...VEILLE, actualites: [] } });
    const f = await rendre();
    expect(text($(f, 'actualites-vide'))).toBe('Aucune actualité vérifiée pour le moment.');
    expect($(f, 'actualites-revue')).not.toBeNull();
  });

  it('pendant le chargement, un message d’état est annoncé', async () => {
    globalThis.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;
    const f = TestBed.createComponent(ActualitesComponent);
    f.detectChanges();
    expect($(f, 'actualites-chargement')?.getAttribute('role')).toBe('status');
  });

  it('l’accueil intègre la section', () => {
    const src = readFileSync(resolve(__dirname, '../dashboard.component.ts'), 'utf8');
    expect(src).toMatch(/<app-actualites \/>/);
  });
});
