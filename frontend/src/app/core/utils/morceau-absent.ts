/**
 * L52 — un visiteur resté sur un ancien index.html demande, après une livraison, des morceaux
 * (chunk-XXXX.js) qui n'existent plus : nginx répond 404 (L51). La navigation échoue alors sur
 * « Failed to fetch dynamically imported module » ; recharger la page récupère le nouvel index.html.
 *
 * Le navigateur donne le MÊME message quand le réseau est coupé ou quand le serveur répond 502 :
 * recharger alors quitterait la page lue pour la page d'erreur du navigateur. Le rechargement ne part
 * donc que hors mode hors ligne, et après qu'une requête HEAD a confirmé le 404 du morceau (Safari ne
 * donne pas son adresse : c'est la page visée qui est interrogée, elle doit répondre).
 */
const MESSAGES = [
  /Failed to fetch dynamically imported module/i, // Chromium, Edge
  /error loading dynamically imported module/i, // Firefox
  /Importing a module script failed/i, // Safari
];

/** Un seul rechargement par minute : si le morceau manque encore après, l'erreur reste visible. */
export const RECHARGEMENT_CLE = 'wh40k.morceau-absent';
const DELAI_MS = 60_000;

function messageDe(err: unknown): string {
  return err instanceof Error ? err.message : typeof err === 'string' ? err : '';
}

export function estMorceauAbsent(err: unknown): boolean {
  const message = messageDe(err);
  return MESSAGES.some((re) => re.test(message));
}

/** Adresse du morceau, quand le navigateur la met dans le message (Chromium, Firefox) ; `null` sinon (Safari). */
export function adresseDuMorceau(err: unknown): string | null {
  if (!estMorceauAbsent(err)) return null;
  const m = /:\s*(https?:\/\/\S+)\s*$/.exec(messageDe(err));
  return m ? m[1] : null;
}

/** Requête HEAD sur `url` : son statut HTTP ; rejette si la requête n'aboutit pas (réseau coupé). */
export type Verifier = (url: string) => Promise<number>;

const headReel: Verifier = (url) =>
  fetch(url, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' }).then((r) => r.status);

export interface OptionsRechargement {
  maintenant?: number;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  verifier?: Verifier;
  /** `navigator.onLine` ; `undefined` (inconnu) vaut en ligne. */
  enLigne?: boolean;
}

/**
 * Recharge sur `url` si `err` est un morceau absent, que le navigateur est en ligne, qu'aucun
 * rechargement n'a eu lieu depuis une minute, et que le serveur confirme : le morceau répond 404 ou,
 * sans son adresse, la page visée répond 2xx. Renvoie vrai si la page a été rechargée.
 */
export async function rechargerSiMorceauAbsent(
  err: unknown,
  url: string,
  recharger: (url: string) => void,
  {
    maintenant = Date.now(),
    storage = stockage(),
    verifier = headReel,
    enLigne = globalThis.navigator?.onLine,
  }: OptionsRechargement = {},
): Promise<boolean> {
  if (!estMorceauAbsent(err) || enLigne === false || !storage) return false;
  try {
    if (dansLaMinute(storage, maintenant)) return false;
  } catch {
    return false; // stockage refusé : pas de garde possible, donc pas de rechargement (risque de boucle)
  }
  const morceau = adresseDuMorceau(err);
  let confirme: boolean;
  try {
    const statut = await verifier(morceau ?? url);
    confirme = morceau ? statut === 404 : statut >= 200 && statut < 300;
  } catch {
    return false; // la requête n'aboutit pas : réseau coupé, recharger mènerait à la page d'erreur du navigateur
  }
  if (!confirme) return false;
  try {
    if (dansLaMinute(storage, maintenant)) return false; // un autre échec a rechargé pendant la vérification
    storage.setItem(RECHARGEMENT_CLE, String(maintenant));
  } catch {
    return false;
  }
  recharger(url);
  return true;
}

function dansLaMinute(storage: Pick<Storage, 'getItem'>, maintenant: number): boolean {
  const dernier = Number(storage.getItem(RECHARGEMENT_CLE));
  return Number.isFinite(dernier) && dernier > 0 && maintenant - dernier < DELAI_MS;
}

function stockage(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Gestionnaire d'échec de navigation du routeur (`withNavigationErrorHandler`) : recharge sur la page visée, une fois le 404 confirmé. */
export function surEchecDeNavigation(echec: { error: unknown; url: string }): void {
  void rechargerSiMorceauAbsent(echec.error, echec.url, (url) => globalThis.location.assign(url)).catch(() => undefined);
}
