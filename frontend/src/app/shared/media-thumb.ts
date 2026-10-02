import type { Observable, Subscription } from 'rxjs';

/**
 * L39 — source d'une vignette tirée des données : une URL utilisable telle quelle, ou une requête
 * à résoudre par `/api/wiki-image`, ou rien (dégradé). Les champs `thumbnail` des vidéos et
 * `image` des illustrations d'amorçage ne sont PAS des URL (requête du wiki, nom de fichier
 * inexistant) : les mettre tels quels dans `url(...)` produit une image cassée.
 */
export interface MediaThumbSource {
  url?: string;
  wikiQuery?: string;
}

/** Vrai pour une adresse d'image chargeable : http(s) absolue ou chemin de l'API. */
export function isImageUrl(s: string | null | undefined): s is string {
  return !!s && (/^https?:\/\//.test(s) || s.startsWith('/api/'));
}

export function mediaThumbSource(m: {
  thumbnail?: string;
  image?: string;
  wikiQuery?: string;
  embedId?: string | null;
  embedType?: 'video' | 'playlist' | null;
}): MediaThumbSource {
  const direct = m.thumbnail ?? m.image;
  if (isImageUrl(direct)) return { url: direct };
  const query = m.wikiQuery ?? (m.thumbnail && !isImageUrl(m.thumbnail) ? m.thumbnail : undefined);
  if (query) return { wikiQuery: query };
  if (m.embedType === 'video' && m.embedId) return { url: `https://i.ytimg.com/vi/${m.embedId}/hqdefault.jpg` };
  return {};
}

/**
 * L39 — résolution d'une vignette qui ANNULE la précédente : passer de la faction A à la faction B
 * dans le même composant ne laisse pas la réponse tardive de A écraser la vignette de B.
 */
export function createThumbResolver(
  fetchWiki: (query: string) => Observable<{ imageUrl: string | null }>,
  set: (url: string | null) => void,
): { resolve(src: MediaThumbSource): void; destroy(): void } {
  let current: Subscription | null = null;
  const cancel = () => {
    current?.unsubscribe();
    current = null;
  };
  return {
    resolve(src) {
      cancel();
      set(src.url ?? null);
      if (!src.wikiQuery) return;
      current = fetchWiki(src.wikiQuery).subscribe({
        next: (r) => { if (r.imageUrl) set(r.imageUrl); },
        error: () => {},
      });
    },
    destroy: cancel,
  };
}
