// @vitest-environment node
// L106 — étape accept d'orchestrate : un acceptation-<lot>.json à `vert: false` sort ses
// fichiers de la suite ordinaire et de la CI ; la commande dédiée ne lance que ceux du lot.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acceptationIgnored, acceptationOnly, acceptationOutsideSuite } from './acceptation-runner.mjs';

let root;
const spec = (ecran, name, doc) => {
  mkdirSync(join(root, 'docs/specs', ecran), { recursive: true });
  writeFileSync(join(root, 'docs/specs', ecran, name), typeof doc === 'string' ? doc : JSON.stringify(doc));
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'accept-'));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('acceptationIgnored', () => {
  it("renvoie [] sans dossier docs/specs", () => {
    expect(acceptationIgnored(root)).toEqual([]);
  });

  it('exclut les fichiers d’une acceptation à vert: false, pas ceux d’une acceptation verte', () => {
    spec('accueil', 'acceptation-L1.json', { fichiers: ['frontend/src/a.acceptation.spec.ts'], vert: false });
    spec('accueil', 'acceptation-L2.json', { fichiers: ['frontend/src/b.acceptation.spec.ts'], vert: true });
    expect(acceptationIgnored(root)).toEqual(['frontend/src/a.acceptation.spec.ts']);
  });

  it('ignore un JSON illisible et accepte acceptation.json sans lot', () => {
    spec('x', 'acceptation-L3.json', '{pas du json');
    spec('y', 'acceptation.json', { fichiers: ['frontend/src/c.acceptation.spec.ts'] });
    expect(acceptationIgnored(root)).toEqual(['frontend/src/c.acceptation.spec.ts']);
  });

  it('format regex pour testPathIgnorePatterns', () => {
    spec('y', 'acceptation.json', { fichiers: ['a.b.ts'], vert: false });
    expect(acceptationIgnored(root, 'docs/specs', 'regex')).toEqual(['a\\.b\\.ts$']);
  });
});

describe('acceptationOnly', () => {
  it('lit les fichiers du JSON donné', () => {
    spec('y', 'acceptation-L4.json', { fichiers: ['f.spec.ts'], vert: false });
    expect(acceptationOnly(join(root, 'docs/specs/y/acceptation-L4.json'))).toEqual(['f.spec.ts']);
  });

  it('échoue fort sans CADENCE_ACCEPTATION ou avec un fichier illisible', () => {
    expect(() => acceptationOnly(undefined)).toThrow(/CADENCE_ACCEPTATION/);
    expect(() => acceptationOnly(join(root, 'absent.json'))).toThrow(/illisible/);
  });
});

describe('acceptationOutsideSuite', () => {
  it('repère un fichier d’acceptation que la suite ordinaire ne lancerait pas, vert ou non', () => {
    spec('a', 'acceptation-L1.json', { fichiers: ['frontend/src/x.acceptation.spec.ts', 'frontend/src/y.acceptation.test.ts'], vert: true });
    spec('b', 'acceptation-L2.json', { fichiers: ['frontend/e2e/z.spec.ts'], vert: false });
    expect(acceptationOutsideSuite(root)).toEqual(['frontend/src/y.acceptation.test.ts', 'frontend/e2e/z.spec.ts']);
  });

  it('les acceptations du dépôt retombent toutes dans l’include de vitest.config.ts', () => {
    const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    expect(acceptationOutsideSuite(repo)).toEqual([]);
  });
});
