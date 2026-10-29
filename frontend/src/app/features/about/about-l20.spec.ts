import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L20 — revue UX de la page À propos. Lecture du source (ce vitest ne démarre pas Angular).
 */
const ts = readFileSync(resolve(__dirname, 'about.component.ts'), 'utf8');
const scss = readFileSync(resolve(__dirname, 'about.component.scss'), 'utf8');

describe('page À propos — revue UX (L20)', () => {
  it('R1 — chaque lien qui s’ouvre dans un nouvel onglet l’annonce aux lecteurs d’écran', () => {
    const anchors = ts.match(/<a\b[^>]*target="_blank"[\s\S]*?<\/a>/g) ?? [];
    expect(anchors.length).toBe(4); // Claude Code, ChatGPT, inspirations, autres sites
    for (const a of anchors) expect(a).toContain('(nouvel onglet)');
  });

  it('R2 — les glyphes ⤤ et ↗ et les pictogrammes de site sont masqués aux lecteurs d’écran', () => {
    for (const cls of ['ext', 'other-arrow', 'other-tag']) {
      const spans = ts.match(new RegExp(`<span class="${cls}"[^>]*>`, 'g')) ?? [];
      expect(spans.length).toBeGreaterThan(0);
      for (const s of spans) expect(s).toContain('aria-hidden="true"');
    }
  });

  it('R3 — « Mes autres sites » est un h2 (pas de saut de h2 vers un h3 hors sujet)', () => {
    expect(ts).toContain('<h2>Mes autres sites</h2>');
    expect(ts).not.toContain('<h3>Mes autres sites</h3>');
    expect(scss).not.toContain('.other-sites h3');
  });

  it('R4 — aucun texte sous 12 px', () => {
    const sizes = [...scss.matchAll(/font-size:\s*(\d+)px/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(12);
  });

  it('R5 — les cartes et liens ont un contour de focus visible', () => {
    const m = scss.match(/((?:[^{}\n]+:focus-visible,?\s*)+)\{([^}]*)\}/);
    expect(m).not.toBeNull();
    for (const sel of ['.inspi', '.other-card', '.story-body a']) expect(m![1]).toContain(`${sel}:focus-visible`);
    expect(m![2]).toMatch(/outline:\s*2px solid var\(--gold-bright\)/);
  });

  it('R6 — le soulèvement au survol est retiré pour prefers-reduced-motion', () => {
    const m = scss.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n    \}/);
    expect(m).not.toBeNull();
    expect(m![1]).toContain('.stack-card:hover');
    expect(m![1]).toContain('.inspi:hover');
    expect(m![1]).toContain('transform: none');
  });
});
