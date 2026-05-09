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

export interface FactionWar {
  name: string;
  date?: string;
  summary: string;
}

export interface FactionHero {
  name: string;
  unitId?: string;          // lien vers units/:id si Hero unit existe
  primarchId?: string;      // lien vers lore/primarchs/:id
  summary: string;
}

export interface Faction {
  id: string;
  nom: string;
  alignement: Alignment;
  description: string;
  couleurThematique: string;
  symbole: string;
  iconUrl?: string;
  sousTitre?: string;
  imageHero?: string;
  citation?: string;
  unitCount?: number;
  lore?: FactionLore;
  stats?: FactionStats;
  liensRapides?: string[];
  resources?: string[];
  // Bible-tier extensions
  epithet?: string;            // "L'Astartes Sacré", "La Marée Verte"
  motto?: string;              // devise gothique
  longHistory?: string;        // 3-5 paragraphes d'histoire complète
  notableWars?: FactionWar[];  // 4-6 guerres clés
  notableHeroes?: FactionHero[]; // 4-8 héros marquants
  currentState?: string;       // état actuel M42
  legacy?: string;             // impact dans l'Imperium / la galaxie
  galleryQueries?: string[];   // 6-8 wikiQuery character/scene focus
  loreImageQuery?: string;     // image inline panel histoire
}
