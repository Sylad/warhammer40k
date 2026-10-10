import type { NotableUnit, SubFaction } from '../../core/models/models';

export interface NotableCard {
  name: string;
  role?: string;
  description?: string;
  wikiQuery: string;
}

/** Cartes « Unités notables » d'une sous-faction, tirées de `notableUnits` (personnages et escouades
 *  nommés, sans fiche : pas de lien). Les entrées sans nom sont écartées. */
export function notableCards(sub: Pick<SubFaction, 'notableUnits'>): NotableCard[] {
  return (sub.notableUnits ?? [])
    .filter((n: NotableUnit) => n.name?.trim())
    .map((n) => ({
      name: n.name.trim(),
      ...(n.role ? { role: n.role } : {}),
      ...(n.description ? { description: n.description } : {}),
      wikiQuery: n.wikiQuery || n.name.trim(),
    }));
}
