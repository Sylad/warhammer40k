// @vitest-environment node
// L256 — partage des e2e entre les jobs parallèles de frontend-checks.yml, par durées mesurées.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import e2eConfig from '../vitest.e2e.config.ts';
import { DUREE_INCONNUE, dureesMesurees, lirePartie, partager } from './e2e-parties.mjs';

const frontend = fileURLToPath(new URL('..', import.meta.url));
const rel = (f) => path.relative(frontend, f).split(path.sep).join('/');

describe('partager', () => {
  const racine = '/r';
  const durees = { 'a.ts': 100, 'b.ts': 60, 'c.ts': 50, 'd.ts': 10 };
  const fichiers = ['/r/a.ts', '/r/b.ts', '/r/c.ts', '/r/d.ts', '/r/nouveau.ts'];

  it('chaque fichier va dans une seule partie, aucun ne se perd', () => {
    const parties = partager(fichiers, 2, durees, racine);
    expect(parties.flatMap((p) => p.fichiers).sort()).toEqual([...fichiers].sort());
  });

  it('le plus long d’abord, dans la partie la moins chargée ; un fichier hors table compte DUREE_INCONNUE', () => {
    const [p1, p2] = partager(fichiers, 2, durees, racine);
    expect(p1.fichiers).toEqual(['/r/a.ts', '/r/nouveau.ts']);
    expect(p1.secondes).toBe(100 + DUREE_INCONNUE);
    expect(p2.fichiers).toEqual(['/r/b.ts', '/r/c.ts', '/r/d.ts']);
  });

  it('même partage quel que soit l’ordre d’entrée (les deux jobs doivent tomber d’accord)', () => {
    expect(partager([...fichiers].reverse(), 2, durees, racine)).toEqual(partager(fichiers, 2, durees, racine));
  });
});

describe('lirePartie', () => {
  it('lit k/n, rend null sans valeur, refuse le reste', () => {
    expect(lirePartie('2/2')).toEqual({ partie: 2, total: 2 });
    expect(lirePartie(undefined)).toBeNull();
    expect(lirePartie('')).toBeNull();
    for (const v of ['0/2', '3/2', '1', 'a/b']) expect(() => lirePartie(v)).toThrow(/E2E_PARTIE/);
  });
});

describe('table e2e-durees.json contre la liste des e2e (vitest.e2e.config.ts)', () => {
  const fichiers = e2eConfig.test.include.map(rel);
  const durees = dureesMesurees();

  it('chaque fichier e2e a sa durée mesurée (sinon : la mesurer, artefact e2e-junit-<partie>, et l’ajouter)', () => {
    expect(fichiers.filter((f) => !(f in durees))).toEqual([]);
  });

  it('la table ne garde aucun fichier qui n’est plus dans la liste', () => {
    expect(Object.keys(durees).filter((f) => !fichiers.includes(f))).toEqual([]);
  });

  it('en deux parties, l’écart ne dépasse pas le plus long fichier', () => {
    const parties = partager(e2eConfig.test.include, 2, durees, frontend);
    const [a, b] = parties.map((p) => p.secondes);
    expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(...Object.values(durees)));
    expect(parties.flatMap((p) => p.fichiers).sort()).toEqual([...e2eConfig.test.include].sort());
  });
});
