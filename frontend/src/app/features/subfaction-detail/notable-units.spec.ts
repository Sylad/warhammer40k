// L90 — « Unités notables » d'une sous-faction : le gabarit lisait unitIds (0/182) et ignorait
// notableUnits (77/182). Données réelles d'amorçage + lecture du gabarit.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { notableCards } from './notable-units';

const subfactions = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../../backend/seed/subfactions.json'), 'utf8'),
) as { id: string; notableUnits?: { name: string; role?: string; description?: string; wikiQuery?: string }[]; unitIds?: string[] }[];
const source = readFileSync(resolve(__dirname, 'subfaction-detail.component.ts'), 'utf8');

describe('notableCards (L90)', () => {
  it('chaque sous-faction qui a des notableUnits en montre autant de cartes (77 sur 182)', () => {
    const withNotable = subfactions.filter((s) => s.notableUnits?.length);
    expect(subfactions).toHaveLength(182);
    expect(withNotable).toHaveLength(77);
    for (const s of withNotable) {
      const cards = notableCards(s);
      expect(cards).toHaveLength(s.notableUnits!.length);
      for (const c of cards) expect(c.name.trim()).not.toBe('');
    }
  });
  it('conserve nom, rôle, description et requête d’image', () => {
    const [c] = notableCards({ notableUnits: [{ name: 'A', role: 'R', description: 'D', wikiQuery: 'Q' }] });
    expect(c).toEqual({ name: 'A', role: 'R', description: 'D', wikiQuery: 'Q' });
  });
  it('requête d’image par défaut : le nom ; entrées sans nom écartées ; absence → []', () => {
    expect(notableCards({ notableUnits: [{ name: 'Kharn' }, { name: ' ' }] })).toEqual([{ name: 'Kharn', wikiQuery: 'Kharn' }]);
    expect(notableCards({})).toEqual([]);
  });
  it('le gabarit affiche notableUnits', () => {
    expect(source).toContain('notableCards(');
    expect(source).toContain('d.notable');
  });
});
