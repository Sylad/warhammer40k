/** Nature d'une image locale d'unité : scan de fiche technique, ou portrait / insigne (L120). */
export type LocalUnitImageKind = 'fiche' | 'portrait';

export interface LocalUnitImage { url: string; kind: LocalUnitImageKind }

/** Identifiants des images locales présentes côté serveur (`GET /api/images/unit-images`, L222). */
export interface UnitImageIndex { datasheets: string[]; portraits: string[] }

const headOk = (url: string): Promise<boolean> =>
  fetch(url, { method: 'HEAD' }).then(r => r.ok, () => false);

/**
 * Image locale d'une unité : sa fiche technique d'abord (`/api/images/datasheets/:id`, scan 898×596), sinon son
 * portrait local (`/api/images/portraits/:id`), sinon `null` (l'appelant se rabat sur le wiki). Un échec réseau ou un
 * 5xx vaut une absence. Avec `index` (L222), seule une image listée est sondée : une absence connue n'envoie aucun HEAD,
 * donc aucun 404 dans la console ; sans index (`null`, l'API de l'index a échoué) on sonde comme avant. Le type suit l'URL qui a répondu : un portrait n'est jamais présenté comme fiche technique.
 */
export async function localUnitImage(
  urls: { datasheet: string; portrait: string },
  known?: { index: UnitImageIndex | null; unitId: string },
): Promise<LocalUnitImage | null> {
  const index = known?.index ?? null;
  if ((!index || index.datasheets.includes(known!.unitId)) && await headOk(urls.datasheet)) return { url: urls.datasheet, kind: 'fiche' };
  if ((!index || index.portraits.includes(known!.unitId)) && await headOk(urls.portrait)) return { url: urls.portrait, kind: 'portrait' };
  return null;
}
