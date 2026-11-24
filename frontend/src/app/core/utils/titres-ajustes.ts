/**
 * L253 passe 2 (WCAG 1.4.4) — titres bornés par leur boîte quand le texte est agrandi.
 *
 * Texte à 200 %, un grand titre double alors que sa colonne garde sa largeur : « ARCHIVE / S » à 1440 px, « Gal|axie »
 * au téléphone (revue UX de L253). `overflow-wrap: anywhere` (styles/_texte-agrandi.scss) le coupait au milieu d'un
 * mot, sans trait. Le mixin `fit-title` (L31) borne déjà certains titres en CSS, à condition de connaître leur mot le
 * plus long et d'avoir un conteneur de requête ; ici, la mesure est faite dans la page, pour tous :
 *  - candidats : les titres h1 à h6 et les textes en Cinzel (police d'affichage : titres de cartes, dates,
 *    étiquettes), jamais un paragraphe, jamais un texte sur une seule ligne (`white-space: nowrap`) ;
 *  - mesure : la largeur du mot le plus long (somme des morceaux d'un mot déjà coupé) contre la largeur du contenu
 *    de la boîte du candidat ;
 *  - s'il ne tient pas, la taille du candidat est réduite juste assez (`font-size` en ligne, marqué
 *    `data-titre-borne`) ; plancher : 1rem pour un titre, la taille au réglage normal pour un autre texte
 *    (taille × 16 / rem : les tailles sont en rem) ;
 *    s'il ne tient toujours pas, la mise en page doit lui faire place (le test le signale).
 * Seulement en texte plus grand (classe `texte-plus-grand`) : au réglage normal, `effacerTitresAjustes` retire tout.
 */

export const ATTRIBUT_BORNE = 'data-titre-borne';
const MARGE = 0.98;

function largeurContenu(e: HTMLElement): number {
  let bloc: HTMLElement | null = e;
  while (bloc && getComputedStyle(bloc).display.startsWith('inline') && !getComputedStyle(bloc).display.includes('-')) bloc = bloc.parentElement;
  if (!bloc) return 0;
  const s = getComputedStyle(bloc);
  return bloc.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
}

/** Largeur rendue du mot le plus long sous `e` (somme des morceaux d'un mot coupé sur plusieurs lignes). */
export function motLePlusLong(e: HTMLElement, descendants = true): number {
  let max = 0;
  const noeuds: Node[] = [];
  if (descendants) {
    const marche = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = marche.nextNode(); n; n = marche.nextNode()) noeuds.push(n);
  } else {
    noeuds.push(...Array.from(e.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE));
  }
  const range = document.createRange();
  for (const n of noeuds) {
    const texte = n.textContent ?? '';
    // mots séparés par les seules espaces sécables : « Armageddon » (espaces fines insécables) est un bloc
    for (const m of texte.matchAll(/[^ \t\n\r\f]+/g)) {
      range.setStart(n, m.index);
      range.setEnd(n, m.index + m[0].length);
      let l = 0;
      for (const r of Array.from(range.getClientRects())) l += r.width;
      if (l > max) max = l;
    }
  }
  return max;
}

function estCandidat(e: HTMLElement): boolean {
  if (/^H[1-6]$/.test(e.tagName)) return true;
  if (e.tagName === 'P' || e.closest('h1, h2, h3, h4, h5, h6')) return false;
  const s = getComputedStyle(e);
  if (!s.fontFamily.includes('Cinzel')) return false;
  // seulement les éléments qui portent eux-mêmes du texte (le plus proche du texte gagne)
  return Array.from(e.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim());
}

/** Retire les bornes posées. */
export function effacerTitresAjustes(racine: ParentNode): void {
  for (const e of Array.from(racine.querySelectorAll<HTMLElement>(`[${ATTRIBUT_BORNE}]`))) {
    e.style.removeProperty('font-size');
    e.removeAttribute(ATTRIBUT_BORNE);
  }
}

/** Borne la taille des titres de `racine` dont le mot le plus long dépasse leur boîte ; `rem` : 1rem en px. */
export function ajusterTitres(racine: HTMLElement, rem: number): number {
  effacerTitresAjustes(racine);
  const candidats = Array.from(racine.querySelectorAll<HTMLElement>('*')).filter((e) => {
    if (!e.getClientRects().length || !(e.textContent ?? '').trim()) return false;
    if (getComputedStyle(e).whiteSpace === 'nowrap') return false;
    return estCandidat(e);
  });
  // Lecture de toutes les mesures, puis écriture : une seule mise en page.
  const bornes: [HTMLElement, number][] = [];
  for (const e of candidats) {
    const dispo = largeurContenu(e);
    const mot = motLePlusLong(e, /^H[1-6]$/.test(e.tagName));
    if (dispo <= 0 || mot <= dispo) continue;
    const taille = parseFloat(getComputedStyle(e).fontSize);
    // Plancher : un titre ne descend pas sous le texte courant (1rem) ; un autre texte, pas sous sa taille au réglage
    // normal (taille × 16 / rem). Un titre en clamp(…vw + Brem − Bpx…) n'a pas doublé : on ne connaît pas sa taille à
    // 16 px, mais sa boîte est au moins aussi large qu'au réglage normal, où il tenait.
    const plancher = /^H[1-6]$/.test(e.tagName) ? Math.min(taille, rem) : (taille * 16) / rem;
    const borne = Math.max(plancher, (taille * dispo * MARGE) / mot);
    if (borne < taille - 0.25) bornes.push([e, borne]);
  }
  for (const [e, borne] of bornes) {
    e.style.setProperty('font-size', `${Math.floor(borne * 100) / 100}px`);
    e.setAttribute(ATTRIBUT_BORNE, '');
  }
  return bornes.length;
}
