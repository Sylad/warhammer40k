export type VideoType = 'Parodie' | 'Animation fan' | 'Série officielle' | 'Chaîne lore' | 'Chaîne officielle';
export type VideoCategory = 'lore' | 'animation' | 'official' | 'other';
export type VideoLanguage = 'FR' | 'EN' | 'FR/EN' | 'Sans dialogue';

export interface Video {
  id: string;
  titre: string;
  createur: string;
  description: string;
  url: string;
  type: VideoType;
  langue: string;
  tags: string[];
  incontournable: boolean;
  // optionnels (page Vidéos selon spec)
  embedId?: string | null;
  embedType?: 'video' | 'playlist' | null;
  thumbnail?: string;              // URL thumbnail
  duration?: string;               // '13:12'
  channelId?: string;              // ref Channel
  category?: VideoCategory;        // pour filtres Lore/Animations/Officiel
  language?: VideoLanguage;        // typed strict
  featured?: boolean;              // alias incontournable
}

export interface Channel {
  id: string;
  name: string;
  description: string;
  language: 'FR' | 'EN';
  url: string;
  avatar?: string;                 // URL ou initiales 2 lettres
  priority: boolean;               // chaînes prioritaires affichées dans hero panel
}
