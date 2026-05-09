export type LoreEventType = 'menace' | 'evenement' | 'decouverte' | 'guerre' | 'prophetie';

export interface LoreEvent {
  id: string;
  icon: string;                    // emoji ou caractère gothique (☠ ✦ ✹ ⚔)
  type: LoreEventType;
  title: string;                   // 'Signal hérétique'
  body: string;                    // 'Une flotte inconnue a été détectée...'
  factionId?: string;              // optionnel : associé à une faction
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
  epithet?: string;
  personality?: string;
  earlyLife?: string;
  greatCrusade?: string;
  heresy?: string;
  finalFate?: string;
  legacy?: string;
  notableBattles?: PrimarchBattle[];
  quotes?: string[];
  galleryQueries?: string[];
  relatedPrimarchIds?: string[];
}

// === Le Panthéon Chaos (4 Dieux) ===
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

// === Civils impériaux (les rouages de l'Imperium) ===
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

// === Équipement (armes / armures / reliques) ===
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

// === Saints (Living, Canonized) ===
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

// === Knights, Titans & War Machines ===
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

// === Vaisseaux légendaires ===
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
