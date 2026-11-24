import { describe, expect, it } from 'vitest';
import { taillePx } from './taille-px';

describe('taillePx (L253)', () => {
  it('rem au réglage normal, px tels quels, le reste NaN', () => {
    expect(taillePx('0.75rem')).toBe(12);
    expect(taillePx('.875rem')).toBe(14);
    expect(taillePx('13px')).toBe(13);
    expect(taillePx('clamp(1rem, 2vw, 2rem)')).toBeNaN();
  });
});
