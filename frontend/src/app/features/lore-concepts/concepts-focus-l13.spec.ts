// L13 (revue UX Lore : concepts, WCAG 2.4.7 et 1.4.11) — le bouton .concept-bg, seul contrôle clavier de la visionneuse,
// remplit .concept-head (overflow: hidden) et reste à opacity 0.28 : son anneau doit être opaque et dessiné à l'intérieur.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scss = readFileSync(join(__dirname, 'lore-concepts.component.scss'), 'utf8');

const bloc = (selecteur: string): string => {
  const m = scss.match(new RegExp(`${selecteur.replace(/[.:()-]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  expect(m, `règle ${selecteur}`).not.toBeNull();
  return m![1];
};

describe('Concepts, focus clavier de la visionneuse (L13)', () => {
  it('R1 — le focus clavier du bouton .concept-bg rend l\'opacité à 1 (l\'anneau n\'est pas estompé)', () => {
    expect(bloc('.concept-bg:focus-visible')).toMatch(/opacity:\s*1\s*;/);
  });

  it('R2 — l\'anneau est tracé vers l\'intérieur (outline-offset négatif), d\'au moins 3 px, en or, sans être rogné par overflow: hidden', () => {
    const regle = bloc('.concept-bg:focus-visible');
    expect(regle).toMatch(/outline:\s*(?:[3-9]|\d{2,})px\s+solid\s+#[0-9a-fA-F]{3,6}\s*;/);
    expect(regle).toMatch(/outline-offset:\s*-\d+px\s*;/);
  });
});
