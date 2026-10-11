import { describe, it, expect } from 'vitest';
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

  // Aucune route ne sert de logo de faction (images.controller.ts ne sert que les
  // datasheets) : un chemin local serait une URL morte. Si un logo est embarqué un
  // jour, ajouter sa route ET rouvrir cette règle.
  it('chaque iconUrl est une URL Fandom datée (?cb=), jamais un chemin local', () => {
    for (const f of factions.filter((x) => x.iconUrl)) {
      expect(f.iconUrl!, f.id).toMatch(/^https:\/\/static\.wikia\.nocookie\.net\/.+\?cb=\d+$/);
    }
  });
});
