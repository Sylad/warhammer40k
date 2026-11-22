// @vitest-environment node
// L44 — garde de la veille : aucun fait publié sans source https datée, une seule date de revue.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { JEUX_JSON, VEILLE_JSON, controlerVeille, isoValide, synchroniser } from './veille-data.mjs';

const lire = (p) => JSON.parse(readFileSync(p, 'utf8'));
const VEILLE = {
  revueLe: '2026-11-22',
  rythmeJours: 30,
  actualites: [{ id: 'a', date: '2026-06', titre: 'T', resume: 'R', source: 'https://exemple.org/a', consulteLe: '2026-11-20' }],
};
const JEUX = {
  verifieLe: '2026-11-22',
  aVenir: [{ id: 'v', source: 'https://exemple.org/v', consulteLe: '2026-11-22' }],
  existants: [{ id: 'e', source: 'https://exemple.org/e', consulteLe: '2026-11-22' }],
};
const avec = (fn) => {
  const v = structuredClone(VEILLE);
  const j = structuredClone(JEUX);
  fn(v, j);
  return controlerVeille(v, j);
};

describe('veille du contenu (public/veille-data/veille.json) — L44', () => {
  it('les fichiers versionnés sont conformes : chaque fait a sa source https datée', () => {
    expect(controlerVeille(lire(VEILLE_JSON), lire(JEUX_JSON))).toEqual([]);
  });

  it('une seule date de revue : la page Jeux vidéo affiche celle de veille.json', () => {
    expect(lire(JEUX_JSON).verifieLe).toBe(lire(VEILLE_JSON).revueLe);
  });

  it('aucun autre fichier de données ne porte sa propre date de revue', () => {
    const publics = resolve(VEILLE_JSON, '../..');
    const trouves = [];
    for (const dir of readdirSync(publics, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      for (const f of readdirSync(join(publics, dir.name)).filter((n) => n.endsWith('.json'))) {
        const txt = readFileSync(join(publics, dir.name, f), 'utf8');
        if (/"(verifieLe|revueLe|misAJourLe|derniereMiseAJour)"/.test(txt)) trouves.push(`${dir.name}/${f}`);
      }
    }
    expect(trouves.sort()).toEqual(['jeux-data/jeux.json', 'veille-data/veille.json']);
  });

  it('le modèle de test est conforme', () => {
    expect(controlerVeille(VEILLE, JEUX)).toEqual([]);
  });

  it('refuse une actualité sans source', () => {
    expect(avec((v) => delete v.actualites[0].source).join()).toMatch(/actualité a : source absente/);
  });

  it('refuse une source en http ou qui n’est pas une adresse', () => {
    expect(avec((v) => (v.actualites[0].source = 'http://exemple.org/a')).join()).toMatch(/pas en https/);
    expect(avec((v) => (v.actualites[0].source = 'Wikipédia')).join()).toMatch(/pas en https/);
  });

  it('refuse un fait sans date de consultation, ou avec une date impossible', () => {
    expect(avec((v) => delete v.actualites[0].consulteLe).join()).toMatch(/date de consultation absente/);
    expect(avec((v) => (v.actualites[0].consulteLe = '2026-02-30')).join()).toMatch(/invalide/);
  });

  it('refuse une consultation postérieure à la revue', () => {
    expect(avec((v) => (v.actualites[0].consulteLe = '2026-12-01')).join()).toMatch(/après la revue/);
  });

  it('refuse un jeu sans source, ou vérifié avant la date que la page affiche', () => {
    expect(avec((_, j) => delete j.aVenir[0].source).join()).toMatch(/jeu v : source absente/);
    expect(avec((_, j) => delete j.existants[0].consulteLe).join()).toMatch(/jeu e : date de consultation absente/);
    expect(avec((_, j) => (j.aVenir[0].consulteLe = '2026-10-11')).join()).toMatch(/vérifiées le 2026-11-22/);
  });

  it('refuse une date de jeux.json qui diverge de revueLe', () => {
    expect(avec((_, j) => (j.verifieLe = '2026-10-11')).join()).toMatch(/npm run veille/);
  });

  it('refuse une revue sans date ou un rythme absent', () => {
    expect(avec((v) => delete v.revueLe).join()).toMatch(/revueLe absente/);
    expect(avec((v) => delete v.rythmeJours).join()).toMatch(/rythmeJours/);
  });

  it('refuse une date d’événement mal formée ou postérieure à la revue', () => {
    expect(avec((v) => (v.actualites[0].date = 'juin 2026')).join()).toMatch(/date d'événement/);
    expect(avec((v) => (v.actualites[0].date = '2027')).join()).toMatch(/date d'événement/);
  });

  it('isoValide', () => {
    expect(isoValide('2026-11-22')).toBe(true);
    expect(isoValide('2026-13-01')).toBe(false);
    expect(isoValide('22/11/2026')).toBe(false);
  });

  it('npm run veille recopie revueLe dans jeux.json et ne touche à rien d’autre', () => {
    const dir = mkdtempSync(join(tmpdir(), 'veille-'));
    try {
      const v = join(dir, 'veille.json');
      const j = join(dir, 'jeux.json');
      writeFileSync(v, JSON.stringify(VEILLE));
      writeFileSync(j, JSON.stringify({ ...JEUX, verifieLe: '2026-10-11' }));
      expect(synchroniser(v, j)).toBe(true);
      expect(lire(j)).toEqual(JEUX);
      expect(synchroniser(v, j)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
