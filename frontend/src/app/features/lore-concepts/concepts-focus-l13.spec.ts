// L13 (revue UX Lore : concepts, WCAG 2.4.7, 1.4.11 et 1.4.3) — le bouton .concept-bg, seul contrôle clavier de la visionneuse,
// remplit .concept-head (overflow: hidden) et reste à opacity 0.28 : son anneau est dessiné par un pseudo-élément opaque de
// .concept-head, à l'intérieur, sans toucher à l'opacité de l'image (sinon les textes du bandeau perdent leur contraste).
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
  it('R1 — le focus clavier du bouton .concept-bg ne change pas l\'opacité de l\'image (les textes gardent leur contraste)', () => {
    expect(bloc('.concept-bg:focus-visible')).not.toMatch(/opacity/);
  });

  it('R2 — l\'anneau est un pseudo-élément opaque de .concept-head, vers l\'intérieur (outline-offset négatif), d\'au moins 3 px, en or, sans capter la souris', () => {
    const regle = bloc('.concept-head:has(.concept-bg:focus-visible)::after');
    expect(regle).toMatch(/outline:\s*(?:[3-9]|\d{2,})px\s+solid\s+#[0-9a-fA-F]{3,6}\s*;/);
    expect(regle).toMatch(/outline-offset:\s*-\d+px\s*;/);
    expect(regle).toMatch(/pointer-events:\s*none\s*;/);
    expect(regle).not.toMatch(/opacity/);
  });
});
