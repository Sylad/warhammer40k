// L174 — Panthéon du Chaos : le voile dégradé de l'en-tête d'un dieu est posé APRÈS le bouton d'illustration
// dans le DOM et le recouvrait, donc interceptait la souris et le toucher : le bouton n'était activable qu'au clavier.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scss = readFileSync(join(__dirname, 'lore-chaos-gods.component.scss'), 'utf8');

describe('Panthéon du Chaos, voile de l\'en-tête (L174)', () => {
  it('R1 — le voile .god-bg-overlay laisse passer la souris et le toucher (pointer-events: none) jusqu\'au bouton d\'illustration', () => {
    const m = scss.match(/\.god-bg-overlay\s*\{([^}]*)\}/);
    expect(m, 'règle .god-bg-overlay').not.toBeNull();
    expect(m![1]).toMatch(/pointer-events:\s*none/);
  });
});
