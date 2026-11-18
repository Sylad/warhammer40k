import { describe, expect, it } from 'vitest';
import { accord, plural } from './pluriel';
import { PlurielPipe } from '../../shared/pluriel.pipe';

describe('accord en nombre (L69)', () => {
  it.each([
    [0, '0 œuvre'],
    [1, '1 œuvre'],
    [2, '2 œuvres'],
  ])('%i → « %s »', (n, attendu) => {
    expect(plural(n, 'œuvre', 'œuvres')).toBe(attendu);
    expect(new PlurielPipe().transform(n, 'œuvre', 'œuvres')).toBe(attendu);
  });

  it('accord seul : le nom sans le nombre', () => {
    expect([0, 1, 2].map((n) => accord(n, 'œuvre', 'œuvres'))).toEqual(['œuvre', 'œuvre', 'œuvres']);
  });
});
