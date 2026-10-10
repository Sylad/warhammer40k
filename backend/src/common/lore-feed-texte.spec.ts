import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/** L82 : relecture des 40 brèves de l'accueil (`seed/lore-feed.json`). */
interface Breve { id: string; type: string; title: string; body: string }
const breves: Breve[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../seed/lore-feed.json'), 'utf8'),
);
const textes = breves.flatMap((b) => [b.title, b.body]);

describe('brèves — relecture (L82)', () => {
  it('garde les 40 entrées', () => {
    expect(breves).toHaveLength(40);
  });
  it('aucune élision devant un nom propre à consonne (« d\'Vulkan »)', () => {
    for (const t of textes) expect(t).not.toMatch(/\b[dlDL]['’][BCDFGJKLMNPQRSTVWXZ]/);
  });
  it('« Eveil » prend son accent (majuscule accentuée)', () => {
    for (const t of textes) expect(t).not.toMatch(/\bEveil/);
  });
  it('aucune formule bancale relevée à la relecture', () => {
    const bancales = [/âmes-piscine/, /âmes psyches/, /fauche-canon/, /Pâle dans l/, /Drukhari Aeldari/, /Vision d'un Archiviste/, /Leviathan,/, /Salamandre relit/];
    for (const t of textes) for (const re of bancales) expect(t).not.toMatch(re);
  });
});
