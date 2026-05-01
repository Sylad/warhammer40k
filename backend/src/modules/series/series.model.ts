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
  // optionnels (page Romans)
  cover?: string;                  // URL ou nom fichier image cover
  readBooks?: number;              // progression utilisateur (par défaut 0)
  badges?: SerieBadge[];           // badges colorés affichés sur la card
}
