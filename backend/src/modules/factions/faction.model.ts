export type Alignment = 'Imperium' | 'Chaos' | 'Xenos';

export interface FactionStats {
  chapitresConnus?: string;
  effectifs?: string;
  mondeOrigine?: string;
  allegiance?: string;
}

export interface FactionLore {
  origine?: string;
  organisation?: string;
  doctrine?: string;
}

export interface Faction {
  id: string;
  nom: string;
  alignement: Alignment;
  description: string;
  couleurThematique: string;
  symbole: string;
  // optionnels (étendus pour les pages selon nouvelles specs)
  iconUrl?: string;
  sousTitre?: string;          // ex: "Adeptus Astartes"
  imageHero?: string;          // image dominante du hero faction-detail
  citation?: string;           // citation lore en encart
  unitCount?: number;          // override (sinon dérivé via /units)
  lore?: FactionLore;          // 3 colonnes Origine/Organisation/Doctrine
  stats?: FactionStats;        // sidebar Statistiques
  liensRapides?: string[];     // sidebar Liens (Chronologie, Personnages, ...)
  resources?: string[];        // sidebar Ressources externes
}
