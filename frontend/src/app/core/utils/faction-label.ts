import type { Faction } from '../models/models';

/**
 * L43 — nom d'un lien vers `/factions/<id>` : celui de la faction qu'il ouvre. `factionName` d'une
 * fiche peut désigner une sous-organisation (« Collegia Titanica », « Death Guard ») : il ne sert
 * que si la faction n'est pas (encore) dans la liste.
 */
export function factionLabel(factions: readonly Pick<Faction, 'id' | 'nom'>[], id: string | undefined, fallback: string): string {
  return factions.find(f => f.id === id)?.nom ?? fallback;
}
