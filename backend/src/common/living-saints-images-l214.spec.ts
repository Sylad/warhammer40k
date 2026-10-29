import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * L214 : l'image d'une carte ou d'une fiche Saint vient de `wikiQuery`, cherché d'abord comme titre de page Fandom
 * exact, puis (si la page est absente ou sans image) par recherche plein texte. « Saint Drusus Calixis Sector » et
 * « Saint Sanguinaire Blood Angels » n'existent pas : la recherche rendait « Drusus Shrine World » (Sentinel-0.png) et
 * « Sanguinary Priest » (QA prod de L19, 29-10).
 */
interface Saint { id: string; wikiQuery: string }
const saints: Saint[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../seed/living-saints.json'), 'utf8'),
);
const requete = (id: string): string => saints.find((s) => s.id === id)!.wikiQuery;

describe('Saints — images du sujet (L214)', () => {
  it('Drusus vise la page de son secteur, « Calixis Sector » (la page « Drusus » n\'a pas d\'image)', () => {
    expect(requete('saint-drusus')).toBe('Calixis Sector');
  });
  it('Sanguinaire vise la page de sa lignée, « Blood Angels » (pas « Sanguinary Priest »)', () => {
    expect(requete('saint-sanguinaire')).toBe('Blood Angels');
  });
  it('aucune requête n\'est partagée entre deux Saints (huit images distinctes)', () => {
    const q = saints.map((s) => s.wikiQuery.toLowerCase());
    expect(new Set(q).size).toBe(saints.length);
  });
});
