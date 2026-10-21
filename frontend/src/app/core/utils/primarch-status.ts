import type { PrimarchStatus } from '../models/models';

/**
 * L156 — couleur du statut d'un Primarque, partagée par la liste et la fiche (deux palettes
 * différentes y vivaient). Chaque teinte tient 4,5:1 au moins sur le fond plein des badges
 * (#080706) et sur le fond du site (#050403) : WCAG 1.4.3.
 */
export const STATUS_COLOR: Record<PrimarchStatus, string> = {
  alive: '#5fc97a',
  dead: '#e07a7a',
  missing: '#9fb0c6',
  returned: '#f0d276',
  'daemon-prince': '#ff7a66',
  expunged: '#b4b4b4',
};
