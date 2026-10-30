// L41 : chaînes YouTube introuvables (audit du 2026-10-02), retirées du seed. Un volume
// `data/` qui les porte encore (channels.json / videos.json, données utilisateur) ne les
// affiche plus : le filtre s'applique à la lecture ; le fichier du volume n'est réécrit (sans elles) qu'au
// prochain ajout ou retrait d'une vidéo ou d'une chaîne.
const HANDLES_RETIRES = ['indomitus40k', 'astartes40k', 'sirelambert', 'lavoxobscura', 'baldermortgw', 'warfo40k'];

export function estChaineRetiree(url: string | undefined): boolean {
  const handle = (url ?? '').replace(/\/+$/, '').toLowerCase().split('/@')[1];
  return handle !== undefined && HANDLES_RETIRES.includes(handle);
}
