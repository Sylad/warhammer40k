// L161 — le sous-titre des visionneuses (.lightbox-role, 12 px) doit atteindre 4,5:1 sur le fond (WCAG 1.4.3).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const racine = process.cwd();
const lire = (p: string) => readFileSync(resolve(racine, p), 'utf8');

const VISIONNEUSES = [
  'src/app/shared/components/figure-lightbox/figure-lightbox.component.ts',
  'src/app/features/series/series-cover-viewer.component.ts',
];

const luminance = (hex: string): number => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contraste = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

describe('Sous-titre des visionneuses (L161)', () => {
  const tokens = lire('src/styles.scss');
  const jeton = (nom: string) => new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens)![1];

  for (const fichier of VISIONNEUSES) {
    it(`R1 — ${fichier.split('/').pop()} : .lightbox-role est en --gold, au contraste ≥ 4,5:1 sur --bg`, () => {
      const regle = /\.lightbox-role\s*\{([^}]*)\}/.exec(lire(fichier));
      expect(regle, 'règle .lightbox-role absente').not.toBeNull();
      const couleur = /(?:^|;|\s)color:\s*var\(--([a-z-]+)\)/.exec(regle![1]);
      expect(couleur?.[1]).toBe('gold');
      expect(contraste(jeton('gold'), jeton('bg'))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('R2 — la couleur discrète --gold-soft reste sous 4,5:1 (le test du contraste est donc discriminant)', () => {
    expect(contraste(jeton('gold-soft'), jeton('bg'))).toBeLessThan(4.5);
  });
});
