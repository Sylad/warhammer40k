// L201 (QA prod L197/L198) — un clic sur l'image d'en-tête d'un concept ouvre la visionneuse : le voile et le bloc de
// texte posés par-dessus le bouton .concept-bg ne captent pas la souris (la mesure au rendu réel est faite au parcours).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const scss = readFileSync(join(__dirname, 'lore-concepts.component.scss'), 'utf8');
const corps = (sel: string) => {
  const m = scss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace('.', '\\.')}\\s*\\{([^}]*)\\}`));
  return m ? m[1] : '';
};

describe('Concepts, clic sur l\'image (L201)', () => {
  it('R1 — le voile .concept-bg-overlay laisse passer le clic jusqu\'au bouton de l\'image', () => {
    expect(corps('.concept-bg-overlay')).toMatch(/pointer-events:\s*none/);
  });
  it('R2 — le bloc de texte .concept-head-content (dont .concept-meta) laisse passer le clic', () => {
    expect(corps('.concept-head-content')).toMatch(/pointer-events:\s*none/);
  });
  it('R3 — le ⛶ reste cliquable (il n\'est pas dans un parent à pointer-events: none)', () => {
    expect(corps('.concept-zoom')).not.toMatch(/pointer-events:\s*none/);
    expect(corps('.concept-head')).not.toMatch(/pointer-events:\s*none/);
  });
});
