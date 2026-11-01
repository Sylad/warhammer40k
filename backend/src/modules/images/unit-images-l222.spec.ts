import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ImagesController } from './images.controller.js';
import { ImagesService } from './images.service.js';

/**
 * L222 : la fiche faction ne doit plus sonder par HEAD des images qui n'existent pas (404 dans la console).
 * `GET /api/images/unit-images` donne les identifiants réellement présents dans `public/datasheets` et `public/portraits`.
 */
const ids = (dir: string) =>
  fs.readdirSync(path.resolve(process.cwd(), 'public', dir)).filter((n) => n.endsWith('.jpg')).map((n) => n.slice(0, -4)).sort();

describe('index des images locales d\'unités (L222)', () => {
  const ctrl = new ImagesController(new ImagesService());

  it('renvoie exactement les fichiers de datasheets/ et de portraits/', () => {
    expect(ctrl.unitImages()).toEqual({ datasheets: ids('datasheets'), portraits: ids('portraits') });
  });

  it('inq-ravenor, inq-valeria et inq-henchmen : portrait local, pas de fiche technique', () => {
    const { datasheets, portraits } = ctrl.unitImages();
    for (const id of ['inq-ravenor', 'inq-valeria', 'inq-henchmen']) {
      expect(portraits).toContain(id);
      expect(datasheets).not.toContain(id);
    }
  });

  it('dossier absent : liste vide, sans exception', () => {
    const svc = new ImagesService();
    const cwd = process.cwd();
    process.chdir(os.tmpdir());
    try { expect(svc.listUnitImageIds('portraits')).toEqual([]); } finally { process.chdir(cwd); }
  });
});
