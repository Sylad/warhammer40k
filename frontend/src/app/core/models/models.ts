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
