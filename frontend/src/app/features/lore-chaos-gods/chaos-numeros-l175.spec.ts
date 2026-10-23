// L175 — Panthéon du Chaos : les numéros « III / IV » et « IV / IV » (13 px, en haut de l'en-tête, là où le
// voile est le plus léger) mesuraient entre 3,3 et 4,2:1 au téléphone en or ordinaire sur l'image.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contraste } from '../../core/utils/teinte-lisible';

const scss = readFileSync(join(__dirname, 'lore-chaos-gods.component.scss'), 'utf8');
const styles = readFileSync(join(process.cwd(), 'src/styles.scss'), 'utf8');

// Fond mesuré en prod le 22-10 sous le numéro, le plus clair relevé : celui qui donnait 3,3:1 à l'or ordinaire.
const FOND_MESURE = '#5a5550';

const regle = (sel: string): string => {
  const m = scss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
  expect(m, `règle ${sel}`).not.toBeNull();
  return m![1];
};
const jeton = (nom: string): string => styles.match(new RegExp(`${nom}:\\s*(#[0-9a-f]{6})`, 'i'))![1];

describe('Panthéon du Chaos, numéros des dieux (L175)', () => {
  it('R1 — l\'or ordinaire est sous 4,5:1 sur le fond mesuré : le problème est réel', () => {
    expect(contraste(jeton('--gold'), FOND_MESURE)).toBeLessThan(4.5);
  });

  it('R2 — le numéro est en or vif, au moins 4,5:1 sur ce fond', () => {
    expect(regle('.number')).toMatch(/color:\s*var\(--gold-bright\)/);
    expect(contraste(jeton('--gold-bright'), FOND_MESURE)).toBeGreaterThanOrEqual(4.5);
  });
});
