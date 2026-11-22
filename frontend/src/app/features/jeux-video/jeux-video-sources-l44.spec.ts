// L44 — sources des jeux : un jeu sorti garde sa source datée (y compris quand il bascule de « À venir »),
// un jeu sorti affiche son lien « Source », une liste de plateformes vide se lit « Non communiquées ».
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { setupTestBed } from '../../../testing/angular-testbed';
import { JEUX_URL, JeuxVideoComponent, repartirJeux, type JeuxData } from './jeux-video.component';

// Horloge de TestBed figée au 12 octobre 2026 : « Bascule » (1er octobre) est sorti, « Lointain » non.
const DATA: JeuxData = {
  verifieLe: '2026-11-22',
  aVenir: [
    {
      id: 'bascule', titre: 'Jeu basculé', statut: 'Annoncé', sortie: '1 octobre 2026', genre: 'Tir',
      plateformes: ['PC'], resume: 'r', source: 'https://example.org/bascule', consulteLe: '2026-11-20',
    },
    {
      id: 'sans-plateforme', titre: 'Jeu sans plateforme', statut: 'En développement', sortie: null, genre: 'Action',
      plateformes: [], resume: 'r', source: 'https://example.org/sans', consulteLe: '2026-11-22',
    },
  ],
  existants: [
    { id: 'sorti', titre: 'Jeu sorti', annee: 2024, resume: 'r', plateformes: ['PC'], source: 'https://example.org/sorti', consulteLe: '2026-11-22' },
    { id: 'ancien', titre: 'Jeu ancien', annee: 2004, resume: 'r', plateformes: ['PC'] },
  ],
};

const fetchOrigine = globalThis.fetch;

async function rendre(): Promise<ComponentFixture<JeuxVideoComponent>> {
  const f = TestBed.createComponent(JeuxVideoComponent);
  for (let i = 0; i < 3; i++) {
    f.detectChanges();
    await f.whenStable();
    await new Promise((r) => setTimeout(r, 0));
  }
  f.detectChanges();
  return f;
}

const ligne = (f: ComponentFixture<unknown>, titre: string): HTMLElement => {
  const l = [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-testid="ligne-existant"]')]
    .find((e) => e.querySelector('[data-testid="existant-titre"]')?.textContent?.trim() === titre);
  expect(l, `ligne « ${titre} »`).toBeDefined();
  return l!;
};

describe('L44 — repartirJeux transmet la source datée', () => {
  it('un jeu à venir dont le jour est atteint passe en « Déjà sortis » avec sa source et sa date de consultation', () => {
    const r = repartirJeux(DATA, new Date(2026, 9, 12));
    const j = r.existants.find((e) => e.id === 'bascule');
    expect(j).toMatchObject({ source: 'https://example.org/bascule', consulteLe: '2026-11-20' });
  });
});

describe('L44 — page Jeux vidéo : sources et plateformes', () => {
  beforeEach(async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (!String(input).endsWith(JEUX_URL)) return { ok: false, status: 404, json: async () => null } as Response;
      return { ok: true, status: 200, json: async () => structuredClone(DATA) } as Response;
    }) as typeof fetch;
    await setupTestBed([JeuxVideoComponent]);
  });
  afterEach(() => {
    globalThis.fetch = fetchOrigine;
  });

  it('un jeu sorti avec une source affiche un lien « Source » vers elle, ouvert dans un nouvel onglet', async () => {
    const f = await rendre();
    const a = ligne(f, 'Jeu sorti').querySelector<HTMLAnchorElement>('[data-testid="existant-source"]');
    expect(a?.getAttribute('href')).toBe('https://example.org/sorti');
    expect(a?.getAttribute('target')).toBe('_blank');
    expect(a?.getAttribute('rel')).toContain('noopener');
    expect(a?.textContent?.replace(/\s+/g, ' ').trim()).toBe('Source : Jeu sorti (nouvel onglet) ↗');
  });

  it('le jeu basculé de « À venir » garde son lien « Source »', async () => {
    const f = await rendre();
    const a = ligne(f, 'Jeu basculé').querySelector<HTMLAnchorElement>('[data-testid="existant-source"]');
    expect(a?.getAttribute('href')).toBe('https://example.org/bascule');
  });

  it('un jeu sorti sans source n’a pas de lien « Source »', async () => {
    const f = await rendre();
    expect(ligne(f, 'Jeu ancien').querySelector('[data-testid="existant-source"]')).toBeNull();
  });

  it('un jeu à venir sans plateforme annoncée affiche « Non communiquées », jamais une case vide', async () => {
    const f = await rendre();
    const cartes = [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-testid="carte-a-venir"]')];
    const carte = cartes.find((c) => c.querySelector('[data-testid="jeu-titre"]')?.textContent?.trim() === 'Jeu sans plateforme');
    expect(carte).toBeDefined();
    expect(carte!.querySelector('[data-testid="jeu-plateformes"]')?.textContent?.trim()).toBe('Non communiquées');
  });
});
