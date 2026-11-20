// Recherche d'une image sur le Warhammer 40k Wiki (Fandom). Module sans dépendance (ni Nest, ni paquet) :
// le test de bout en bout du frontend l'importe tel quel pour simuler une panne au niveau de Fandom.

export interface WikiImageResult {
  imageUrl: string | null;
  pageTitle: string | null;
  pageUrl: string | null;
  /**
   * L238 r3 — `true` : la recherche a ÉCHOUÉ (réseau, délai, 429, réponse illisible), on ne sait pas si le
   * wiki a une image. Absent : le wiki a répondu (`imageUrl: null` = il n'a vraiment rien).
   */
  erreur?: true;
}

export const FANDOM_API = 'https://warhammer40k.fandom.com/api.php';
const DELAI_MS = 8_000;

const CACHE = new Map<string, WikiImageResult>();
// Cap : le cache est keyé par query arbitraire sur un endpoint public (démo)
// — sans borne, une boucle de q aléatoires fait OOM le process.
const CACHE_MAX = 2000;
function cacheSet(key: string, value: WikiImageResult): void {
  if (CACHE.size >= CACHE_MAX) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
  }
  CACHE.set(key, value);
}

/** Pour les tests : repart d'un cache vide. */
export function viderCacheWiki(): void {
  CACHE.clear();
}

export interface OptionsRecherche {
  /** Adresse de l'API MediaWiki (Fandom par défaut ; un faux serveur dans les tests). */
  base?: string;
  /** Appelé avec le message de l'échec (journal). */
  surEchec?: (message: string) => void;
}

const VIDE = (): WikiImageResult => ({ imageUrl: null, pageTitle: null, pageUrl: null });

/** Lit une réponse de l'API : tout statut hors 2xx ou corps non JSON (page HTML d'un 429) est un échec. */
async function lireJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Warhammer40kLoreApp/1.0' }, signal: AbortSignal.timeout(DELAI_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchPageImage(base: string, pageTitle: string): Promise<WikiImageResult> {
  const imgData = await lireJson(`${base}?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&format=json&pithumbsize=700&origin=*`);

  const pages = imgData?.query?.pages ?? {};
  const page = Object.values(pages)[0] as any;
  if (!page || page.missing !== undefined) return VIDE();

  const thumbnail = page?.thumbnail?.source ?? null;
  const resolvedTitle = (page?.title as string) ?? pageTitle;
  return {
    imageUrl: thumbnail,
    pageTitle: resolvedTitle,
    pageUrl: `https://warhammer40k.fandom.com/wiki/${encodeURIComponent(resolvedTitle.replace(/ /g, '_'))}`,
  };
}

export async function rechercherImageWiki(query: string, options: OptionsRecherche = {}): Promise<WikiImageResult> {
  const base = options.base ?? FANDOM_API;
  const key = query.toLowerCase().trim();
  if (CACHE.has(key)) return CACHE.get(key)!;

  try {
    // 1. Try direct page lookup first (finds character pages, not book pages)
    const directResult = await fetchPageImage(base, query);
    if (directResult.imageUrl) {
      cacheSet(key, directResult);
      return directResult;
    }

    // 2. Fall back to search (for faction terms, generic units, etc.)
    const searchData = await lireJson(`${base}?action=query&list=search&srsearch=${encodeURIComponent(query + ' warhammer 40k')}&srlimit=5&format=json&origin=*`);
    const results: any[] = searchData?.query?.search ?? [];

    // Try each search result until we find one with an image
    for (const r of results) {
      const result = await fetchPageImage(base, r.title as string);
      if (result.imageUrl) {
        cacheSet(key, result);
        return result;
      }
    }

    const empty = VIDE();
    cacheSet(key, empty);
    return empty;
  } catch (err: unknown) {
    // Échec transitoire (réseau, délai, 429 fandom) : ne PAS mettre en cache — sinon l'image reste morte
    // jusqu'au restart du process — et le DIRE (`erreur`) : ce n'est pas « le wiki n'a pas d'image ».
    options.surEchec?.((err as Error)?.message ?? String(err));
    return { ...VIDE(), erreur: true };
  }
}
