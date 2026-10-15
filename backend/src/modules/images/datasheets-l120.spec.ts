import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { NotFoundException } from '@nestjs/common';
import { ImagesController } from './images.controller.js';
import { ImagesService } from './images.service.js';
import { readContent } from '../../common/content.js';

/**
 * L120 (revue UX) : `public/datasheets/` ne contient que des fiches techniques (scans 898×596), servies comme
 * telles et présentées « Fiche technique de … » : un portrait ou un insigne n'y a pas sa place (WCAG 1.1.1,
 * R14). Les portraits locaux vivent dans `public/portraits/`, servis par `/api/images/portraits/:id`.
 */
const PUBLIC = path.resolve(process.cwd(), 'public');
const DATASHEETS = path.join(PUBLIC, 'datasheets');
const PORTRAITS = path.join(PUBLIC, 'portraits');
const ids = (dir: string) => fs.readdirSync(dir).filter((n) => n.endsWith('.jpg')).map((n) => n.slice(0, -4)).sort();

/** Dimensions d'un JPEG, lues dans son premier marqueur SOFn (sans dépendance). */
function jpegSize(file: string): { w: number; h: number } {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error(`pas de SOF dans ${file}`);
}

describe('fiches techniques et portraits locaux (L120)', () => {
  // Invariants, pas de comptes : ajouter une image locale ne demande aucun code ni aucun chiffre à retoucher (CLAUDE.md).
  const isScan = ({ w, h }: { w: number; h: number }) => w / h >= 1.4 && w / h <= 1.6 && w >= 800;
  const sizes = (dir: string) => ids(dir).map((id) => ({ id, ...jpegSize(path.join(dir, `${id}.jpg`)) }));

  it('chaque fichier de datasheets/ a le rapport 3:2 d\'un scan de fiche (entre 1,4 et 1,6) et au moins 800 px de large', () => {
    // ork-makari (626×422) avait le bon rapport : une illustration, pas un scan. Les scans font 898×596.
    const hors = sizes(DATASHEETS).filter((s) => !isScan(s)).map(({ id, w, h }) => `${id} ${w}×${h}`);
    expect(hors).toEqual([]);
  });

  it('aucun fichier de portraits/ n\'est un scan de fiche (rapport [1,4 ; 1,6] et ≥ 800 px) : un scan va dans datasheets/', () => {
    const scans = sizes(PORTRAITS).filter(isScan).map(({ id, w, h }) => `${id} ${w}×${h}`);
    expect(scans).toEqual([]);
  });

  it('un identifiant n\'est ni dans datasheets/ ni dans portraits/ en double, et inq-valeria reste un portrait', () => {
    const p = ids(PORTRAITS);
    expect(p).toContain('inq-valeria');
    expect(ids(DATASHEETS)).not.toContain('inq-valeria');
    expect(ids(DATASHEETS).filter((id) => p.includes(id))).toEqual([]);
  });

  it('chaque fichier de datasheets/ et de portraits/ porte l\'identifiant d\'une unité', () => {
    const units = new Set(readContent<{ id: string }[]>('units.json', []).map((u) => u.id));
    expect([...ids(DATASHEETS), ...ids(PORTRAITS)].filter((id) => !units.has(id))).toEqual([]);
  });

  const controller = new ImagesController(new ImagesService());
  const res = () => ({ sendFile: vi.fn() });

  it('GET/HEAD /images/portraits/:id sert le JPEG du portrait local', () => {
    const r = res();
    controller.servePortrait('inq-valeria', r as never);
    expect(r.sendFile).toHaveBeenCalledWith(path.join(PORTRAITS, 'inq-valeria.jpg'));
  });

  it('/images/portraits/:id répond 404 pour une unité sans portrait local (dont une fiche technique)', () => {
    expect(() => controller.servePortrait('sm-tactique', res() as never)).toThrow(NotFoundException);
    expect(() => controller.servePortrait('inconnu', res() as never)).toThrow(NotFoundException);
  });

  it('/images/portraits/:id ne sort pas du dossier (../ neutralisé)', () => {
    expect(() => controller.servePortrait('../datasheets/sm-tactique', res() as never)).toThrow(NotFoundException);
  });

  it('/images/datasheets/:id répond 404 pour un portrait déplacé', () => {
    expect(() => controller.serveDatasheet('inq-valeria', res() as never)).toThrow(NotFoundException);
  });

  it('/images/datasheets/:id sert toujours une fiche technique', () => {
    const r = res();
    controller.serveDatasheet('sm-tactique', r as never);
    expect(r.sendFile).toHaveBeenCalledWith(path.join(DATASHEETS, 'sm-tactique.jpg'));
  });

  it('le Dockerfile copie public/ en entier dans l\'image (datasheets/ ET portraits/)', () => {
    const dockerfile = fs.readFileSync(path.resolve(process.cwd(), 'Dockerfile'), 'utf8');
    expect(dockerfile).toMatch(/^COPY --from=builder \/app\/public \.\/public$/m);
    expect(fs.existsSync(path.resolve(process.cwd(), '.dockerignore'))
      ? fs.readFileSync(path.resolve(process.cwd(), '.dockerignore'), 'utf8') : '').not.toMatch(/public|portraits/);
  });
});
