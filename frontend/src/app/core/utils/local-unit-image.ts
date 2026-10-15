/** Nature d'une image locale d'unité : scan de fiche technique, ou portrait / insigne (L120). */
export type LocalUnitImageKind = 'fiche' | 'portrait';

export interface LocalUnitImage { url: string; kind: LocalUnitImageKind }

const headOk = (url: string): Promise<boolean> =>
  fetch(url, { method: 'HEAD' }).then(r => r.ok, () => false);

/**
 * Image locale d'une unité : sa fiche technique d'abord (`/api/images/datasheets/:id`, scan 898×596), sinon son
 * portrait local (`/api/images/portraits/:id`), sinon `null` (l'appelant se rabat sur le wiki). Un échec réseau ou un
 * 5xx vaut une absence. Le type suit l'URL qui a répondu : un portrait n'est jamais présenté comme fiche technique.
 */
export async function localUnitImage(urls: { datasheet: string; portrait: string }): Promise<LocalUnitImage | null> {
  if (await headOk(urls.datasheet)) return { url: urls.datasheet, kind: 'fiche' };
  if (await headOk(urls.portrait)) return { url: urls.portrait, kind: 'portrait' };
  return null;
}
