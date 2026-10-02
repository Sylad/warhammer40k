import { describe, expect, it } from 'vitest';
import { longestWord } from './longest-word';

describe('longestWord (L31/L32)', () => {
  it('mot le plus long, en caractères (accents et apostrophe comptés)', () => {
    expect(longestWord('Officio Assassinorum')).toBe(12);
    expect(longestWord("L'Astronomican")).toBe(14);
    expect(longestWord('Nécrons')).toBe(7);
    expect(longestWord('Bienvenue, Initié')).toBe(10);
  });
  it('le trait d’union est une coupure possible : « Vaisseaux-Mondes » → 9', () => {
    expect(longestWord('Vaisseaux-Mondes')).toBe(9);
  });
  it('vide → 1 (aucune contrainte)', () => {
    expect(longestWord('')).toBe(1);
    expect(longestWord(undefined)).toBe(1);
  });
});
