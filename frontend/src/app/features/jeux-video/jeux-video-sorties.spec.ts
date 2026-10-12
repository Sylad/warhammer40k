import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { setupTestBed } from '../../../testing/angular-testbed';
import { JEUX_VIDEO_NOW, repartirJeux, type JeuxData } from './jeux-video.component';

const data = (sorties: (string | null)[]): JeuxData => ({
  verifieLe: '2026-10-11',
  aVenir: sorties.map((sortie, i) => ({
    id: `j${i}`, titre: `Jeu ${i}`, statut: 'Annoncé', sortie, genre: 'g', plateformes: ['PC'], resume: 'r', source: 'https://x.test',
  })),
  existants: [{ id: 'vieux', titre: 'Vieux', annee: 2020, resume: 'r', plateformes: ['PC'] }],
});

describe('L35 — jeux à venir dont la date est passée', () => {
  it('R1 — « À venir » ne garde que des jeux pas encore sortis : un jour complet passé bascule dans « Déjà sortis »', () => {
    const r = repartirJeux(data(['14 octobre 2026', '3 décembre 2026']), new Date(2026, 9, 14));
    expect(r.aVenir.map((j) => j.id)).toEqual(['j1']);
    expect(r.existants.map((j) => j.id)).toEqual(['j0', 'vieux']);
    expect(r.existants[0].annee).toBe(2026);
  });

  it('R1 — la veille de la sortie, le jeu reste à venir', () => {
    const r = repartirJeux(data(['14 octobre 2026']), new Date(2026, 9, 13));
    expect(r.aVenir.map((j) => j.id)).toEqual(['j0']);
  });

  it('R2 — une date imprécise ou absente n’est jamais devinée : le jeu reste à venir', () => {
    const r = repartirJeux(data(['Mars 2020', 'T3 2020', '2020', null]), new Date(2026, 9, 14));
    expect(r.aVenir).toHaveLength(4);
    expect(r.existants.map((j) => j.id)).toEqual(['vieux']);
  });
});

describe('L35 — une seule zone principale', () => {
  it('la page vit dans le <main> de la mise en page : son gabarit n’ouvre pas de second <main>', () => {
    const src = readFileSync(resolve(__dirname, 'jeux-video.component.ts'), 'utf8');
    expect(src).not.toMatch(/<main[\s>]/);
  });
});

describe('L35 — horloge de la page', () => {
  it('R1 — sous TestBed l’horloge est figée : les suites ne dépendent pas de la date du jour', async () => {
    await setupTestBed([]);
    const now = TestBed.inject(JEUX_VIDEO_NOW)();
    expect(now.getTime()).toBe(new Date(2026, 9, 12).getTime());
  });
});
