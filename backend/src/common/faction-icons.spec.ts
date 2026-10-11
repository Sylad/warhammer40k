import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { readContent } from './content';

// L56 : Fandom répond 404 avec une image de remplacement de 80 px dans le corps,
// l'événement (error) ne part donc jamais : le repli sur le symbole ne se déclenche
// pas. Le contrôle porte sur l'URL, hors réseau.
const MORTS = [
  'genestealer-cults', 'drukhari', 'officio-assassinorum',
  'grey-knights', 'adeptus-custodes', 'leagues-of-votann',
];

interface F { id: string; symbole?: string; iconUrl?: string }
const factions = readContent<F[]>('factions.json', []);

describe('logos de factions (L56)', () => {
  it.each(MORTS)('%s : plus d’URL Fandom morte, le symbole s’affiche', (id) => {
    const f = factions.find((x) => x.id === id)!;
    expect(f.iconUrl).toBeUndefined();
    expect(f.symbole).toBeTruthy();
  });

  it('chaque iconUrl est un fichier local présent, ou une URL Fandom datée (?cb=)', () => {
    for (const f of factions.filter((x) => x.iconUrl)) {
      const u = f.iconUrl!;
      if (u.startsWith('/')) {
        expect(existsSync(join(__dirname, '../../public', u.replace(/^\/api\//, ''))), f.id).toBe(true);
      } else {
        expect(u, f.id).toMatch(/^https:\/\/static\.wikia\.nocookie\.net\/.+\?cb=\d+$/);
      }
    }
  });
});
