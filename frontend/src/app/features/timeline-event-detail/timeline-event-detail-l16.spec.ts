// L16 (revue UX Lore : chronologie, fiche) — le texte de l'en-tête posé sur l'image tient 4,5:1 (WCAG 1.4.3) sous le voile,
// même sur une image blanche. La feuille `ship-detail.component.scss` est partagée : la fiche chronologie a son propre
// modificateur (`hero-overlay-chronologie`), sans toucher au voile `.hero-overlay` de vaisseau, Titan et Saint.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contraste } from '../../core/utils/teinte-lisible';

const scss = readFileSync(join(__dirname, '../ship-detail/ship-detail.component.scss'), 'utf8');
const ts = readFileSync(join(__dirname, 'timeline-event-detail.component.ts'), 'utf8');
const alphas = (re: RegExp) => Array.from(re.exec(scss)![1].matchAll(/rgba\(0,\s*0,\s*0,\s*([\d.]+)\)/g), m => Number(m[1]));
const VOILE = /\.hero-overlay\.hero-overlay-chronologie\s*\{[^}]*background:\s*linear-gradient\(([^;]*)\)\s*;/;

describe('Chronologie, fiche (L16)', () => {
  it('R1 — le h1 (--gold-bright) et l\'accroche, l\'ère et la date (--text) sont ≥ 4,5:1 sur une image blanche sous le point le plus clair du voile de la fiche', () => {
    const a = Math.min(...alphas(VOILE));
    const fond = '#' + Math.round(255 * (1 - a)).toString(16).padStart(2, '0').repeat(3);
    expect(contraste('#f0d276', fond), `h1 sur ${fond} (voile ${a})`).toBeGreaterThanOrEqual(4.5);
    expect(contraste('#e6dfce', fond), `texte sur ${fond} (voile ${a})`).toBeGreaterThanOrEqual(4.5);
  });

  it('R2 — la fiche pose hero-overlay-chronologie ; le voile partagé .hero-overlay reste 0,85 → 0,55 → 0,4 et le relevé de l\'équipement 0,88 → 0,76 → 0,72', () => {
    expect(/<div class="hero-overlay hero-overlay-chronologie"/.test(ts)).toBe(true);
    expect(alphas(/(?:^|\n)\.hero-overlay\s*\{[^}]*background:\s*linear-gradient\(([^;]*)\)\s*;/)).toEqual([0.85, 0.55, 0.4]);
    expect(alphas(/\.hero-overlay\.hero-overlay-releve\s*\{[^}]*background:\s*linear-gradient\(([^;]*)\)\s*;/)).toEqual([0.88, 0.76, 0.72]);
  });
});
