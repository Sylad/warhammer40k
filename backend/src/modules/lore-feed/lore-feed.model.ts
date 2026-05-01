export type LoreEventType = 'menace' | 'evenement' | 'decouverte' | 'guerre' | 'prophetie';

export interface LoreEvent {
  id: string;
  icon: string;                    // emoji ou caractère gothique (☠ ✦ ✹ ⚔)
  type: LoreEventType;
  title: string;                   // 'Signal hérétique'
  body: string;                    // 'Une flotte inconnue a été détectée...'
  factionId?: string;              // optionnel : associé à une faction
}
