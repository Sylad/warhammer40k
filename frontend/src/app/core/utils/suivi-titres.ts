import { ajusterTitres, effacerTitresAjustes } from './titres-ajustes';

/**
 * L253 passe 2 : titres bornés par leur boîte en texte plus grand (titres-ajustes.ts), recalculés après chaque
 * changement du contenu (navigation, données chargées), de largeur, de police ou au chargement des polices web
 * (L262 : y compris la largeur du <main> seule, quand la barre de défilement apparaît). Une passe par image au plus.
 * `racine` : le <main> (absent avant le rendu) ; `actif` : texte plus grand. Sorti de main-layout en L262.
 */
export function suivreTitres(racine: () => HTMLElement | undefined, actif: () => boolean): { planifier: () => void; arreter: () => void } {
  let image = 0;
  let observateur: MutationObserver | null = null;
  let lacherLargeur: (() => void) | null = null;
  const options: MutationObserverInit = { childList: true, subtree: true, characterData: true };
  const polices = () => planifier();
  const executer = () => {
    image = 0;
    const main = racine();
    if (!main || !actif()) return;
    observateur?.disconnect();
    sansPerdreLesDefilements(main, () => ajusterTitres(main, parseFloat(getComputedStyle(document.documentElement).fontSize)));
    observateur?.takeRecords();
    observateur?.observe(main, options);
  };
  const planifier = () => {
    const main = racine();
    if (!main || typeof MutationObserver !== 'function') return;
    if (!observateur) {
      observateur = new MutationObserver(() => planifier());
      observateur.observe(main, options);
      document.fonts?.addEventListener?.('loadingdone', polices);
      lacherLargeur = suivreLargeur(main, planifier);
    }
    if (!image) image = requestAnimationFrame(executer);
  };
  const arreter = () => {
    if (image) cancelAnimationFrame(image);
    image = 0;
    observateur?.disconnect();
    observateur = null;
    lacherLargeur?.();
    lacherLargeur = null;
    document.fonts?.removeEventListener?.('loadingdone', polices);
    const main = racine();
    if (main) effacerTitresAjustes(main);
  };
  return { planifier, arreter };
}

/** L262 : `ajusterTitres` efface les tailles avant de mesurer ; dans cette mise en page intermédiaire, une liste qui
 *  défile seule (aside de la galerie) peut grandir, et le navigateur ramène son défilement à son nouveau maximum sans
 *  que rien ne le rende ensuite (l'artiste actif sortait de sa liste, L248). Les défilements sous `racine` sont rendus
 *  après `passe`. */
export function sansPerdreLesDefilements<T>(racine: HTMLElement, passe: () => T): T {
  const defiles = Array.from(racine.querySelectorAll<HTMLElement>('*'))
    .filter((e) => e.scrollTop > 0 || e.scrollLeft > 0)
    .map((e) => ({ e, haut: e.scrollTop, gauche: e.scrollLeft }));
  const r = passe();
  for (const d of defiles) {
    if (d.e.scrollTop !== d.haut) d.e.scrollTop = d.haut;
    if (d.e.scrollLeft !== d.gauche) d.e.scrollLeft = d.gauche;
  }
  return r;
}

/** L262 : appelle `rappel` quand la largeur intérieure de `e` change (la barre de défilement verticale qui apparaît
 *  resserre la colonne sans événement `resize` : « DESCRIPTION » bornée pour 194 px se coupait dans 188 px) ; seule la
 *  largeur compte. Renvoie de quoi arrêter. */
export function suivreLargeur(e: HTMLElement, rappel: () => void): () => void {
  if (typeof ResizeObserver !== 'function') return () => undefined;
  let vue = e.clientWidth;
  const ro = new ResizeObserver(() => {
    if (e.clientWidth === vue) return;
    vue = e.clientWidth;
    rappel();
  });
  ro.observe(e);
  return () => ro.disconnect();
}
