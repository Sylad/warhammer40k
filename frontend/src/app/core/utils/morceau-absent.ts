/**
 * L52 — un visiteur resté sur un ancien index.html demande, après une livraison, des morceaux
 * (chunk-XXXX.js) qui n'existent plus : nginx répond 404 (L51). La navigation échoue alors sur
 * « Failed to fetch dynamically imported module » ; recharger la page récupère le nouvel index.html.
 */
const MESSAGES = [
  /Failed to fetch dynamically imported module/i, // Chromium, Edge
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
];

/** Un seul rechargement par minute : si le morceau manque encore après, l'erreur reste visible. */
export const RECHARGEMENT_CLE = 'wh40k.morceau-absent';
const DELAI_MS = 60_000;

export function estMorceauAbsent(err: unknown): boolean {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return MESSAGES.some((re) => re.test(message));
}

/**
 * Recharge sur `url` si `err` est un morceau absent et qu'aucun rechargement n'a eu lieu depuis
 * une minute. Renvoie vrai si la page a été rechargée.
 */
export function rechargerSiMorceauAbsent(
  err: unknown,
  url: string,
  recharger: (url: string) => void,
  maintenant: number = Date.now(),
  storage: Pick<Storage, 'getItem' | 'setItem'> | null = stockage(),
): boolean {
  if (!estMorceauAbsent(err)) return false;
  try {
    const dernier = Number(storage?.getItem(RECHARGEMENT_CLE));
    if (Number.isFinite(dernier) && dernier > 0 && maintenant - dernier < DELAI_MS) return false;
    storage?.setItem(RECHARGEMENT_CLE, String(maintenant));
  } catch {
    return false; // stockage refusé : pas de garde possible, donc pas de rechargement (risque de boucle)
  }
  if (!storage) return false;
  recharger(url);
  return true;
}

function stockage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Gestionnaire d'échec de navigation du routeur (`withNavigationErrorHandler`) : recharge sur la page visée. */
export function surEchecDeNavigation(echec: { error: unknown; url: string }): void {
  rechargerSiMorceauAbsent(echec.error, echec.url, (url) => globalThis.location.assign(url));
}
