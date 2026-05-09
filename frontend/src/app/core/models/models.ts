export type Alignment = 'Imperium' | 'Chaos' | 'Xenos';

export type SubFactionType =
  | 'chapter'
  | 'regiment'
  | 'klan'
  | 'craftworld'
  | 'hivefleet'
  | 'dynasty'
  | 'sept'
  | 'forgeworld'
  | 'order'
  | 'legion'
  | 'shield_host'
  | 'temple'
  | 'kabal'
  | 'wych_cult'
  | 'haemonculus_coven'
  | 'brotherhood'
  | 'kindred'
  | 'cult'
  | 'other';

export interface NotableUnit {
  id?: string;
  name: string;
  role?: string;
  description?: string;
  wikiQuery?: string;
}

export interface SubFactionBattle {
  name: string;
  date?: string;
  summary: string;
}

export interface SubFaction {
  id: string;
  factionId: string;
  parentSubFactionId?: string;
  name: string;
  type: SubFactionType;
  description: string;
  loreShort?: string;
  loreLong?: string;
  motto?: string;
  primarch?: string;
  primarchId?: string;
  primarchWikiQuery?: string;
  currentLeader?: string;
  currentLeaderRole?: string;
  homeworld?: string;
  founding?: string;
  colors?: string[];
  symbol?: string;
  imageHero?: string;
  wikiQuery?: string;
  unitIds?: string[];
  notableUnits?: NotableUnit[];
  citation?: string;
  // Bible-tier extensions
  epithet?: string;
  currentState?: string;
  notableBattles?: SubFactionBattle[];
  galleryQueries?: string[];
}
export type UnitType = 'Infanterie' | 'Véhicule' | 'Héros' | 'Monstre' | 'Psyker';

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
  unitId?: string;
  primarchId?: string;
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
  epithet?: string;
  motto?: string;
  longHistory?: string;
  notableWars?: FactionWar[];
  notableHeroes?: FactionHero[];
  currentState?: string;
  legacy?: string;
  galleryQueries?: string[];
  loreImageQuery?: string;
}

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
  image?: string;       // URL directe (statique ou wiki)
  wikiQuery?: string;   // requête /api/wiki-image pour résoudre dynamiquement
}

export interface Unit {
  id: string;
  factionId: string;
  nom: string;
  type: UnitType;
  pointsCost?: number;
  est_hero: boolean;
  wikiQuery?: string;
  role?: string;
  badges?: string[];
  description?: string;
  loreCourt?: string;
  loreLong?: string;
  image?: string;
  capacities?: string[];
  equipment?: UnitEquipment[];
  stats?: UnitStats;
  variants?: UnitVariant[];
  relatedUnitIds?: string[];
  citation?: string;
  apparition?: string;
  tailleUnite?: string;
  loreImageQuery?: string;     // wikiQuery override pour image inline du panel Lore
  galleryQueries?: string[];   // 2-4 wikiQueries supplémentaires pour la sidebar Galerie liée
}

export interface DescriptionResponse {
  description: string;
  fromCache: boolean;
}

export type SerieBadge =
  | 'Fondamental'
  | 'Inquisition'
  | 'Space Marines'
  | 'Garde Impériale'
  | 'Aventure'
  | 'Adeptus Sororitas'
  | 'Papier'
  | 'Audible'
  | 'FR'
  | 'EN';

export interface Serie {
  id: string;
  titre: string;
  titreVO: string;
  auteurs: string[];
  nbLivres: number;
  epoque: string;
  factionIds: string[];
  tags: string[];
  premierLivre: string;
  description: string;
  niveauEntree: string;
  cover?: string;
  readBooks?: number;
  badges?: SerieBadge[];
}

export type VideoType = 'Parodie' | 'Animation fan' | 'Série officielle' | 'Chaîne lore' | 'Chaîne officielle';
export type VideoCategory = 'lore' | 'animation' | 'official' | 'other';
export type VideoLanguage = 'FR' | 'EN' | 'FR/EN' | 'Sans dialogue';

export interface Video {
  id: string;
  titre: string;
  createur: string;
  description: string;
  url: string;
  embedId: string | null;
  embedType: 'video' | 'playlist' | null;
  type: VideoType;
  langue: string;
  tags: string[];
  incontournable: boolean;
  thumbnail?: string;
  duration?: string;
  channelId?: string;
  category?: VideoCategory;
  language?: VideoLanguage;
  featured?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  language: 'FR' | 'EN';
  url: string;
  avatar?: string;
  priority: boolean;
}

export type ArtworkCategory =
  | 'Space Marines'
  | 'Chaos'
  | 'Xénos'
  | 'Imperium'
  | 'Personnages'
  | 'Véhicules'
  | 'Mes images';

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  image: string;
  category: ArtworkCategory;
  extraCategories?: string[];
  faction?: string;
  likes?: number;
  colors?: string[];
  collectionId?: string;
  bookmarked?: boolean;
  source?: string;
  wikiQuery?: string;
  isLocal?: boolean;
}

export interface ArtworkCollection {
  id: string;
  name: string;
  description?: string;
  count: number;
}

export interface ArtworkArtist {
  id: string;
  name: string;
  artworkCount: number;
  avatar?: string;
}

export type LoreEventType = 'menace' | 'evenement' | 'decouverte' | 'guerre' | 'prophetie';

export interface LoreEvent {
  id: string;
  icon: string;
  type: LoreEventType;
  title: string;
  body: string;
  factionId?: string;
}

// === L'Empereur de l'Humanité ===
export interface EmperorSection {
  id: string;
  title: string;
  icon: string;
  body: string;
  wikiQuery?: string;
}

export interface Emperor {
  title: string;
  subtitle: string;
  description: string;
  citation: string;
  wikiQuery: string;
  stats: { domaine: string; valeur: string }[];
  sections: EmperorSection[];
}

// === Les 20 Primarques ===
export type PrimarchAllegiance = 'loyalist' | 'traitor' | 'lost';
export type PrimarchStatus =
  | 'alive'
  | 'dead'
  | 'missing'
  | 'returned'
  | 'daemon-prince'
  | 'expunged';

export interface PrimarchBattle {
  name: string;
  date?: string;
  summary: string;
}

export interface ShipBattle {
  name: string;
  date?: string;
  summary: string;
}

export interface LegendaryShip {
  id: string;
  name: string;
  epithet?: string;
  class: string;
  factionId: string;
  factionName: string;
  color: string;
  captainOrLord?: string;
  currentStatus: string;
  wikiQuery: string;
  description: string;
  longHistory?: string;
  specs?: string[];
  notableBattles?: ShipBattle[];
  galleryQueries?: string[];
  relatedPrimarchId?: string;
}

export type SaintCategory = 'living-saint' | 'saint-canonized' | 'ecclesiarch-canonized';

export interface SaintBattle {
  name: string;
  date?: string;
  summary: string;
}

export interface Saint {
  id: string;
  name: string;
  epithet?: string;
  category: SaintCategory;
  ordoOrChapter: string;
  era: string;
  color: string;
  wikiQuery: string;
  description: string;
  longHistory?: string;
  miracles?: string[];
  notableBattles?: SaintBattle[];
  quotes?: string[];
  galleryQueries?: string[];
}

export type GodMachineCategory = 'titan' | 'knight' | 'war-machine';

export interface GodMachineExample {
  name: string;
  context: string;
}

export interface GodMachine {
  id: string;
  name: string;
  epithet?: string;
  category: GodMachineCategory;
  scoutClass: string;
  size: string;
  factionId: string;
  factionName: string;
  color: string;
  wikiQuery: string;
  description: string;
  longHistory?: string;
  specs?: string[];
  notableExamples?: GodMachineExample[];
  galleryQueries?: string[];
}

export interface Primarch {
  id: string;
  number: number;
  name: string;
  legion?: string;
  legionId?: string;
  allegiance: PrimarchAllegiance;
  status: PrimarchStatus;
  statusDetail: string;
  description: string;
  loreLong?: string;
  homeworld?: string;
  primaryColor?: string;
  wikiQuery?: string;
  citation?: string;
  // Bible-tier extras
  epithet?: string;            // "Le Roi des Ombres", "L'Ange"
  personality?: string;        // 1-2 paragraphes de caractère
  earlyLife?: string;          // origines, monde natal, retrouvailles avec l'Empereur
  greatCrusade?: string;       // rôle pendant la Grande Croisade
  heresy?: string;             // rôle pendant l'Hérésie d'Horus (loyaliste ou traître)
  finalFate?: string;          // mort, disparition, retour
  legacy?: string;             // impact durable sur l'Imperium ou le Chaos
  notableBattles?: PrimarchBattle[];
  quotes?: string[];           // 3-5 citations canoniques
  galleryQueries?: string[];   // 6-8 wikiQuery character-focused
  relatedPrimarchIds?: string[];
}

// === Chaos Pantheon ===
export interface ChaosGodDaemon {
  name: string;
  description: string;
  wikiQuery?: string;
}

export interface ChaosGodPrimarchLink {
  name: string;
  legion: string;
  primarchId?: string;
}

export interface ChaosGod {
  id: 'khorne' | 'tzeentch' | 'nurgle' | 'slaanesh';
  number: number;
  name: string;
  title: string;
  sphere: string;
  color: string;
  sigil: string;
  wikiQuery: string;
  description: string;
  loreLong: string;
  citation: string;
  portfolio: string[];
  daemons: {
    lesser: string;
    elite: string;
    greater: string;
    notable: ChaosGodDaemon[];
  };
  primarchsCorrupted: ChaosGodPrimarchLink[];
  legions: string[];
}

// === Imperial civilian organizations ===
export type ImperialOrgCategory =
  | 'governance'
  | 'military'
  | 'religion'
  | 'psyker'
  | 'commerce'
  | 'training';

export interface ImperialOrgFigure {
  name: string;
  role: string;
  description?: string;
  wikiQuery?: string;
}

export interface ImperialOrganization {
  id: string;
  number: number;
  name: string;
  title: string;
  category: ImperialOrgCategory;
  color: string;
  sigil: string;
  wikiQuery: string;
  description: string;
  loreLong: string;
  citation?: string;
  keyRole: string;
  functions: string[];
  notableFigures: ImperialOrgFigure[];
}

// === Lore concepts (encyclopédie) ===
export type LoreConceptCategory = 'imperial' | 'warp' | 'world' | 'doctrine';

export interface LoreConceptRelated {
  name: string;
  conceptId?: string;
  description?: string;
}

export interface LoreConcept {
  id: string;
  number: number;
  name: string;
  title: string;
  category: LoreConceptCategory;
  color: string;
  sigil: string;
  wikiQuery: string;
  description: string;
  loreLong: string;
  citation?: string;
  keyFacts: string[];
  relatedConcepts: LoreConceptRelated[];
}

// === Timeline ===
export type TimelineEra =
  | 'pre-imperium'
  | 'horus-heresy'
  | 'time-of-rebirth'
  | 'm32-m40'
  | 'm41'
  | 'm42';

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  era: TimelineEra;
  shortDescription: string;
  longDescription: string;
  tags: string[];
  image?: string;
  sources: string[];
}

// === Équipement ===
export type EquipmentType = 'ranged' | 'melee' | 'armor' | 'relic';

export interface Equipment {
  id: string;
  name: string;
  nameVO?: string;
  type: EquipmentType;
  subCategory: string;
  factionIds: string[];
  description: string;
  loreLong: string;
  specs?: string;
  notable?: string[];
  citation?: string;
  wikiQuery: string;
  sigil?: string;
}
