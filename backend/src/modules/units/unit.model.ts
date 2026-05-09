export type UnitType = 'Infanterie' | 'Véhicule' | 'Héros' | 'Monstre' | 'Psyker';

export interface UnitStats {
  endurance?: number;
  resistance?: number;
  puissanceFeu?: number;
  mobilite?: number;
  portee?: number;
  soutien?: number;
}

export interface UnitVariant {
  id: string;
  name: string;
  description?: string;
  image?: string;
}

export interface UnitEquipment {
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  wikiQuery?: string;
}

export interface Unit {
  id: string;
  factionId: string;
  nom: string;
  type: UnitType;
  pointsCost?: number;
  est_hero: boolean;
  wikiQuery?: string;
  // optionnels (étendus pour pages list/detail unit)
  role?: string;                  // "Infanterie de ligne"
  badges?: string[];              // ['Infanterie', 'Ligne', 'Imperium']
  description?: string;           // description courte (carte + hero unit)
  loreCourt?: string;             // 1 ligne pour card list
  loreLong?: string;              // paragraphe pour Histoire & Lore
  image?: string;                 // image principale unit-detail (URL ou nom fichier)
  capacities?: string[];          // 'Polyvalents dans toutes les situations de combat', ...
  equipment?: UnitEquipment[];    // 'Bolter auto', 'Arme de corps à corps', ...
  stats?: UnitStats;              // 6 barres
  variants?: UnitVariant[];       // 5 variantes type Auto bolt rifle / Stalker / ...
  relatedUnitIds?: string[];      // 4 unités similaires (sidebar)
  citation?: string;              // citation italique sidebar
  apparition?: string;            // 'Indomitus Crusade'
  tailleUnite?: string;           // '5 - 10 modèles'
  loreImageQuery?: string;        // wikiQuery dédié pour image du panel Lore
  galleryQueries?: string[];      // wikiQueries supplémentaires sidebar Galerie liée
}
