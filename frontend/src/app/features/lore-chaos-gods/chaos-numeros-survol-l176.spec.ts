// L176 — garde sans navigateur : survol et focus de l'image d'en-tête ne changent pas son opacité (la mesure au
// rendu réel est dans chaos-numeros-survol-l176.e2e.spec.ts).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scss = readFileSync(join(__dirname, 'lore-chaos-gods.component.scss'), 'utf8');

describe('Panthéon du Chaos, image d\'en-tête au survol et au focus (L176)', () => {
  it('R2 — aucune règle :hover ou :focus-visible de .god-bg ne modifie l\'opacité', () => {
    const regles = [...scss.matchAll(/\.god-bg:(?:hover|focus-visible)\s*\{([^}]*)\}/g)];
    expect(regles.length).toBeGreaterThan(0);
    for (const m of regles) expect(m[1]).not.toMatch(/opacity/);
  });
});
