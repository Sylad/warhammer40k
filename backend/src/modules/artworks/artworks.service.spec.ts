import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ArtworksService } from './artworks.service.js';

/**
 * L64 : le compteur d'une collection se calcule depuis les œuvres réellement
 * rattachées (collectionId), jamais depuis un nombre écrit à la main dans le seed
 * (312 / 276 / 198 pour 39 œuvres au total).
 */
describe('ArtworksService.collectionsAll — compteurs (L64)', () => {
  const cwd = process.cwd();
  const dossiers: string[] = [];
  afterEach(() => {
    process.chdir(cwd);
    for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  });

  function service(artworks: object[], collections: object[]): ArtworksService {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wh-artworks-'));
    dossiers.push(dir);
    fs.mkdirSync(path.join(dir, 'data'));
    fs.writeFileSync(path.join(dir, 'data', 'artworks.json'), JSON.stringify(artworks));
    fs.writeFileSync(path.join(dir, 'data', 'artwork-collections.json'), JSON.stringify(collections));
    process.chdir(dir);
    return new ArtworksService();
  }

  it('compte les œuvres rattachées à chaque collection, ignore le count du seed', () => {
    const s = service(
      [
        { id: 'a', artist: 'X', collectionId: 'c1' },
        { id: 'b', artist: 'X', collectionId: 'c1' },
        { id: 'c', artist: 'X' },
      ],
      [
        { id: 'c1', name: 'Un', count: 312 },
        { id: 'c2', name: 'Deux', count: 276 },
      ],
    );
    expect(s.collectionsAll().map((c) => [c.id, c.count])).toEqual([['c1', 2], ['c2', 0]]);
  });

  it('le total des collections ne dépasse jamais le nombre d’œuvres', () => {
    const s = service([{ id: 'a', artist: 'X', collectionId: 'c1' }], [{ id: 'c1', name: 'Un', count: 312 }]);
    expect(s.collectionsAll().reduce((n, c) => n + c.count, 0)).toBeLessThanOrEqual(1);
  });
});
