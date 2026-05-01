export type ArtworkCategory =
  | 'Space Marines'
  | 'Chaos'
  | 'Xénos'
  | 'Imperium'
  | 'Personnages'
  | 'Véhicules';

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  image: string;                   // URL ou nom fichier (NAS images dir)
  category: ArtworkCategory;
  faction?: string;                // 'space-marines', 'chaos-space-marines', ...
  likes?: number;                  // affiché sur la card
  colors?: string[];               // palette dominante (hex) pour filtre couleur
  collectionId?: string;           // ref Collection
  bookmarked?: boolean;            // état UI
  source?: string;                 // URL externe (artstation, etc.)
}

export interface ArtworkCollection {
  id: string;
  name: string;
  description?: string;
  count: number;                   // nb d'œuvres
}

export interface ArtworkArtist {
  id: string;
  name: string;
  artworkCount: number;
  avatar?: string;
}
