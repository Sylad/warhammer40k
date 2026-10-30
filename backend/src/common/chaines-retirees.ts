// L41 : chaînes YouTube introuvables (audit du 2026-10-02), retirées du seed sur décision de
// Sylvain (30-10). Un volume `data/` qui les porte encore (channels.json / videos.json, données
// utilisateur) ne les affiche plus : le filtre s'applique à la lecture ; le fichier du volume n'est
// réécrit (sans elles) qu'au prochain ajout ou retrait d'une vidéo ou d'une chaîne. Tant qu'un
// handle figure ici, `ChannelsService.add` et `VideosService.add` refusent de l'enregistrer
// (R7, R8) : l'import ne peut pas réussir puis disparaître au redémarrage. Une chaîne retrouvée
// en ligne revient par un lot qui la retire de cette liste.
const HANDLES_RETIRES = ['indomitus40k', 'astartes40k', 'sirelambert', 'lavoxobscura', 'baldermortgw', 'warfo40k'];

/** Handle YouTube (`Nom`, casse conservée) d'une adresse `…/@Nom[/…]` (même jeu de caractères que `YouTubeOEmbedService.extractHandle`), sinon `undefined`. */
function handleDe(url: string | undefined): string | undefined {
  return /\/@([A-Za-z0-9._-]+)/.exec(url ?? '')?.[1];
}

export function estChaineRetiree(url: string | undefined): boolean {
  const handle = handleDe(url)?.toLowerCase();
  return handle !== undefined && HANDLES_RETIRES.includes(handle);
}

/** Message d'erreur à renvoyer quand on tente d'enregistrer une chaîne retirée, sinon `undefined`. */
export function motifChaineRetiree(url: string | undefined): string | undefined {
  if (!estChaineRetiree(url)) return undefined;
  const handle = handleDe(url);
  return `Chaîne YouTube @${handle} retirée du codex (audit des liens du 2026-10-02, L41) : elle ne peut pas être enregistrée tant qu'elle figure dans la liste des chaînes retirées (backend/src/common/chaines-retirees.ts)`;
}
