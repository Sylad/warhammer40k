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
