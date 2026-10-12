import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const lire = (p: string) => readFileSync(resolve(__dirname, p), 'utf8');

describe('R2 — lien source : mention « nouvel onglet » réservée aux lecteurs d’écran', () => {
  const scss = lire('./jeux-video.component.scss');
  it('la classe .sr-only est définie dans la feuille de la page', () => {
    expect(scss).toMatch(/\.sr-only\s*\{[^}]*position:\s*absolute/);
  });
  it('le lien ne passe pas en inline-flex (les espaces de bord seraient supprimés)', () => {
    const regle = scss.match(/\.jv-source a\s*\{([^}]*)\}/)![1];
    expect(regle).not.toMatch(/inline-flex/);
  });
});

describe('R9 — tiroir : la page active ne dépend pas de la seule couleur', () => {
  it('.drawer a.active porte une bordure gauche dorée', () => {
    const ts = lire('../../layout/main-layout/main-layout.component.ts');
    expect(ts).toMatch(/\.drawer a\.active\s*\{[^}]*border-left-color:\s*var\(--gold\)/);
  });
});
