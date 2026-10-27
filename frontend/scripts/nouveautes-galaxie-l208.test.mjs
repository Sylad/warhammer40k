// @vitest-environment node
// L208 — captures Nouveautés de la Galaxie (L14) : prises carte cadrée, 1440 et 390 px, texte alternatif fidèle.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const DOCS = fileURLToPath(new URL('../../docs/nouveautes/', import.meta.url));
const entree = readdirSync(DOCS).find((f) => f.includes('galaxie-filtres-annonces'));
const texte = readFileSync(join(DOCS, entree), 'utf8');
const captures = [...texte.matchAll(/\{ file: (captures\/L14-\S+?), alt: "([^"]*)" \}/g)].map((m) => ({ file: m[1], alt: m[2] }));
const largeur = (file) => readFileSync(join(DOCS, file)).readUInt32BE(16);

describe('Nouveautés de la Galaxie (L208)', () => {
  it('R1 — une capture à 1440 px et une à 390 px de large', () => {
    expect(captures.map((c) => largeur(c.file))).toEqual([1440, 390]);
  });

  it('R2 — le texte alternatif décrit ce que l\'image montre : les trois filtres actifs, aucun « désactivé »', () => {
    for (const { alt } of captures.slice(0, 1)) {
      expect(alt).toMatch(/Mondes/);
      expect(alt).toMatch(/Failles warp/);
      expect(alt).toMatch(/Segmenta/);
      expect(alt).toMatch(/tous actifs/);
      expect(alt).not.toMatch(/désactiv/);
    }
  });

  it('R3 — la capture 390 px dit que la carte est cadrée, sans promettre ce qu\'elle ne montre pas', () => {
    expect(captures[1].alt).toMatch(/carte entière/);
    expect(captures[1].alt).toMatch(/390 px/);
  });

  it('R4 — la capture 390 px n\'est pas plus de 6 fois plus haute que large (6:1, CLAUDE.md « Nouveautés »)', () => {
    const png = readFileSync(join(DOCS, captures[1].file));
    expect(png.readUInt32BE(20) / png.readUInt32BE(16)).toBeLessThanOrEqual(6);
  });
});
