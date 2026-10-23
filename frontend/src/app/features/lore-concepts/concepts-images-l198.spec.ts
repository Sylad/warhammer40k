// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L198 : QA prod du 23-10 (L13) — Cadia affichait l'image de l'Œil de la Terreur, Imperium Sanctus celle d'Imperium
 * Nihilus (la même carte galactique) et le Codex Astartes la livrée des Ultramarines. Cause : leur `wikiQuery` ne
 * nomme aucune page du wiki, `/api/wiki-image` retombe sur la première page trouvée par recherche. Chacun vise la page
 * qui existe et porte une image de son sujet ; les 15 requêtes sont distinctes (donc les 15 images).
 */
const concepts = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/lore-concepts.json'), 'utf8')) as {
  id: string;
  wikiQuery: string;
}[];
const requete = (id: string) => concepts.find(c => c.id === id)?.wikiQuery;

describe('images des Concepts & Lieux', () => {
  it('R1 — Cadia vise la page « Cadia », pas celle de l\'Œil de la Terreur', () => {
    expect(requete('cadia')).toBe('Cadia');
  });
  it('R2 — Imperium Sanctus vise « Imperium of Man », pas la carte galactique d\'Imperium Nihilus', () => {
    expect(requete('imperium-sanctus')).toBe('Imperium of Man');
  });
  it('R3 — le Codex Astartes vise la page « Codex Astartes », pas la livrée des Ultramarines', () => {
    expect(requete('codex-astartes')).toBe('Codex Astartes');
  });
  it('R4 — deux concepts ne partagent jamais la même requête, et il y en a 15', () => {
    const vues = concepts.map(c => c.wikiQuery.toLowerCase().trim());
    expect(vues).toHaveLength(15);
    expect(vues.filter((q, i) => vues.indexOf(q) !== i)).toEqual([]);
  });
});
