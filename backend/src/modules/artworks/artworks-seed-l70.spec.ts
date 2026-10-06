import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * L70 : rattachement validé par Sylvain (06-10) des œuvres du seed aux collections
 * officielles, par roman / source. Toute autre œuvre reste sans collectionId.
 */
const seedDir = path.resolve(__dirname, '../../../seed');
const lire = <T>(f: string): T => JSON.parse(fs.readFileSync(path.join(seedDir, f), 'utf-8')) as T;

const ATTENDU: Record<string, string[]> = {
  'horus-heresy': ['aw-009', 'aw-010', 'aw-011', 'aw-012', 'aw-013', 'aw-014', 'aw-015', 'aw-017'],
  'black-library-covers': ['aw-002', 'aw-003', 'aw-016', 'aw-019', 'aw-021', 'aw-026', 'aw-030', 'aw-033'],
  '40k-core-book': ['aw-034'],
};

describe('seed artworks — rattachement aux collections (L70)', () => {
  const artworks = lire<{ id: string; collectionId?: string }[]>('artworks.json');
  const collections = lire<{ id: string; count: number }[]>('artwork-collections.json');

  it('chaque collection reçoit exactement les œuvres validées', () => {
    for (const [coll, ids] of Object.entries(ATTENDU)) {
      expect(artworks.filter((a) => a.collectionId === coll).map((a) => a.id).sort()).toEqual(ids);
    }
  });

  it('aucune autre œuvre n’est rattachée (décompte 8 / 8 / 1)', () => {
    const rattachees = artworks.filter((a) => a.collectionId);
    expect(rattachees).toHaveLength(17);
    expect(rattachees.every((a) => a.collectionId! in ATTENDU)).toBe(true);
  });

  it('les count du seed sont alignés sur le décompte réel', () => {
    expect(Object.fromEntries(collections.map((c) => [c.id, c.count]))).toEqual({
      'horus-heresy': 8,
      '40k-core-book': 1,
      'black-library-covers': 8,
    });
  });
});
