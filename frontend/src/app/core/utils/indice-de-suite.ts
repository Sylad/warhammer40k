/**
 * L108 r1 (revue UX du 23-11, M2) — une liste qui défile seule doit le montrer : la coupure d'une colonne collée
 * ressemblait au pli de la page, et la barre de défilement en surimpression est invisible au repos.
 *
 * `suivreIndiceDeSuite(racine, selecteur)` pose `data-suite` sur chaque élément de `racine` qui correspond à
 * `selecteur`, déborde (contenu plus haut que sa boîte) et n'est pas au bout de son défilement ; la feuille de style
 * en tire un fondu en bas. L'attribut suit le défilement (écouteur en capture sur `racine`), les changements de taille
 * (ResizeObserver) et de contenu (MutationObserver : une liste qui arrive après coup). Rend la fonction qui arrête tout.
 */
export function suivreIndiceDeSuite(racine: HTMLElement, selecteur: string): () => void {
  const observes = new Set<Element>();
  const maj = () => {
    racine.querySelectorAll<HTMLElement>(selecteur).forEach((e) => {
      if (!observes.has(e)) {
        observes.add(e);
        ro?.observe(e);
      }
      const suite = e.scrollHeight - e.clientHeight > 1 && e.scrollTop + e.clientHeight < e.scrollHeight - 1;
      if (suite !== e.hasAttribute('data-suite')) e.toggleAttribute('data-suite', suite);
    });
  };
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(maj);
  const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver(maj);
  ro?.observe(racine);
  mo?.observe(racine, { childList: true, subtree: true });
  racine.addEventListener('scroll', maj, { capture: true, passive: true });
  maj();
  return () => {
    ro?.disconnect();
    mo?.disconnect();
    racine.removeEventListener('scroll', maj, { capture: true });
  };
}
