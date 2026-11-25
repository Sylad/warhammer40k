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
 *    `data-titre-borne`) ; plancher d'un autre texte : sa taille au réglage normal (taille × 16 / rem : les tailles
 *    sont en rem) ; plancher d'un titre (passe 3, revue UX r2 : à 320 px, le h1 de /videos tombait à 32 px sous un
 *    paragraphe d'introduction de 34 px) : jamais sous sa taille au réglage normal, et au moins `ECHELLE[h]` fois le
 *    texte qui le suit (`texteQuiSuit` : le premier paragraphe après lui dans son bloc, au moins 1rem) — h1 1,25,
 *    h2 1,1, h3 à h6 1 ; au-delà, le mot se coupe à une syllabe, avec un trait (`hyphens: auto`) ; le h1 cède
 *    jusqu'à 1,2 fois ce texte si son mot n'y tient pas (L259 r1 : la vraie Cinzel, plus large que la police de
 *    secours des e2e, coupait « CONCEPT|S » à 320 px, sans trait) ;
 *    le h1 dépasse aussi de `SOUS_TITRES` les h2 à h6 qui étaient plus petits que lui au réglage normal, mais ceux-ci
 *    ne le font pas grandir au-delà de ce que son mot le plus long tient : ils redescendent alors sous lui, jamais sous
 *    leur propre plancher (L259 : « Le Warp » à 64 px portait le h1 de /lore/concepts à 70,4 px, « CONC|EPTS ») ;
 *  - un h1 que `fit-title` (L31) a figé sous ce plancher (accueil, fiche unité au téléphone) y est relevé ; un h2 à
 *    h6 borné par `fit-title` (`--longest-word` posé) l'est jusqu'à ce que son mot tienne, jamais sous sa taille au
 *    réglage normal (L255, QA de L253 : sa requête de conteneur se resserre quand le texte grandit, « L'Astronomican »
 *    de /lore/concepts passait de 23,6 à 21,4 px à 390 px) ;
 *  - jamais un élément tourné ou mis à l'échelle (`transform` autre qu'une translation : sa boîte n'est pas mesurée dans le même repère que son texte, la
 *    flèche tournée des cartes de la chronologie) ni un glyphe seul (« › », « ▾ »).
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

/** Tourné ou mis à l'échelle (une translation seule ne change pas les largeurs mesurées). */
function transforme(s: CSSStyleDeclaration): boolean {
  return s.transform !== 'none' && !/^matrix\(1, 0, 0, 1,/.test(s.transform);
}

function estCandidat(e: HTMLElement): boolean {
  if (/^H[1-6]$/.test(e.tagName)) return true;
  if (e.tagName === 'P' || e.closest('h1, h2, h3, h4, h5, h6')) return false;
  const s = getComputedStyle(e);
  if (!s.fontFamily.includes('Cinzel')) return false;
  if (transforme(s) || [...(e.textContent ?? '').trim()].length <= 1) return false;
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

/** Facteur du plancher d'un titre, par niveau, sur la taille du texte qui le suit. */
export const ECHELLE: Record<string, number> = { H1: 1.25, H2: 1.1 };
/** Le h1 dépasse d'autant les sous-titres (h2 à h6) qui étaient plus petits que lui au réglage normal. */
export const SOUS_TITRES = 1.1;
/** Minimums du h1 quand son mot le plus long ne tient pas à `ECHELLE` / `SOUS_TITRES` (L259 r1) : 1,2 fois le texte
 *  qui le suit (R6 de L253, « nettement un titre ») et 1,05 fois les sous-titres à leur plancher. */
export const H1_MIN = 1.2;
export const SOUS_TITRES_MIN = 1.05;

const estTitre = (e: Element) => /^H[1-6]$/.test(e.tagName);

/** Taille du texte qui suit le titre `e` : le premier paragraphe visible après lui, dans un de ses trois blocs
 *  parents au plus (sans sortir de `racine`) ; 0 s'il n'y en a pas. */
export function texteQuiSuit(e: HTMLElement, racine: HTMLElement): number {
  let bloc = e.parentElement;
  for (let i = 0; bloc && i < 3; i++, bloc = bloc === racine ? null : bloc.parentElement) {
    for (const p of Array.from(bloc.querySelectorAll<HTMLElement>('p'))) {
      if (!(e.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) || !p.getClientRects().length) continue;
      if (!(p.textContent ?? '').trim()) continue;
      return parseFloat(getComputedStyle(p).fontSize);
    }
  }
  return 0;
}

/** Tailles des éléments `els` au réglage normal (1rem = 16 px) : la page passe un instant à 16 px, sans image
 *  rendue entre les deux (aucun observateur ne voit la sonde de 1rem changer). */
function taillesNormales(els: HTMLElement[]): number[] {
  if (!els.length) return [];
  const html = document.documentElement;
  const avant = html.style.getPropertyValue('font-size');
  const priorite = html.style.getPropertyPriority('font-size');
  html.style.setProperty('font-size', '16px', 'important');
  const tailles = els.map((e) => parseFloat(getComputedStyle(e).fontSize));
  if (avant) html.style.setProperty('font-size', avant, priorite);
  else html.style.removeProperty('font-size');
  return tailles;
}

/** Borne la taille des titres de `racine` dont le mot le plus long dépasse leur boîte, et relève un h1 figé sous
 *  son plancher ; `rem` : 1rem en px. */
export function ajusterTitres(racine: HTMLElement, rem: number): number {
  effacerTitresAjustes(racine);
  const candidats = Array.from(racine.querySelectorAll<HTMLElement>('*')).filter((e) => {
    if (!e.getClientRects().length || !(e.textContent ?? '').trim()) return false;
    const s = getComputedStyle(e);
    if (s.whiteSpace === 'nowrap' || transforme(s)) return false;
    return estCandidat(e);
  });
  // Lecture de toutes les mesures, puis écriture : une seule mise en page.
  const mesures = candidats.map((e) => {
    const titre = estTitre(e);
    const s = getComputedStyle(e);
    const fit = titre && s.getPropertyValue('--longest-word').trim() !== '';
    return { e, titre, fit, dispo: largeurContenu(e), mot: motLePlusLong(e, titre), taille: parseFloat(s.fontSize) };
  });
  const titres = mesures.filter((m) => m.titre);
  const tn = taillesNormales(titres.map((t) => t.e));
  const normales = new Map(titres.map((m, i) => [m.e, tn[i]]));
  const bornes = new Map<HTMLElement, number>();
  // tailles finales des titres de niveau 2 à 6 (avec leur normale et leur plancher) : le h1 reste au-dessus
  const sousTitres: { e: HTMLElement; taille: number; normale: number; plancher: number; cible: number }[] = [];
  const cibleTitre = (m: (typeof mesures)[number], plancher: number) => {
    const { dispo, mot, taille } = m;
    // le mot le plus long ne tient pas : réduit juste assez, pas sous le plancher (un titre déjà plus petit que son
    // plancher garde sa taille)
    return dispo > 0 && mot > dispo ? Math.max(Math.min(plancher, taille), (taille * dispo * MARGE) / mot) : taille;
  };
  for (const m of mesures) {
    const { e, titre, dispo, mot, taille } = m;
    if (!titre) {
      if (!(dispo > 0 && mot > dispo)) continue;
      // un autre texte : pas sous sa taille au réglage normal (taille × 16 / rem)
      const borne = Math.max((taille * 16) / rem, (taille * dispo * MARGE) / mot);
      if (borne < taille - 0.25) bornes.set(e, borne);
      continue;
    }
    if (e.tagName === 'H1') continue;
    const normale = normales.get(e) ?? 0;
    const plancher = Math.max(normale, (ECHELLE[e.tagName] ?? 1) * Math.max(rem, texteQuiSuit(e, racine)));
    // borné par fit-title (L31) sous son plancher : relevé jusqu'à ce que son mot le plus long tienne, sans dépasser
    // le plancher, et jamais sous sa taille au réglage normal (L255 ; au-delà de ce qui tient, « ASTARTE|S » se
    // coupait sans trait : un nom propre n'a pas toujours de césure)
    const tient = dispo > 0 && mot > 0 ? (taille * dispo * MARGE) / mot : plancher;
    const cible = m.fit ? Math.max(cibleTitre(m, plancher), Math.min(plancher, Math.max(normale, tient))) : cibleTitre(m, plancher);
    sousTitres.push({ e, taille, normale, plancher, cible });
  }
  for (const m of mesures.filter((x) => x.e.tagName === 'H1')) {
    const normale = normales.get(m.e) ?? 0;
    const sesSous = sousTitres.filter((t) => t.normale < normale);
    const suit = Math.max(rem, texteQuiSuit(m.e, racine));
    // plancher dur (au-delà, son mot se coupe, avec un trait si la langue le permet) : sa taille au réglage normal,
    // nettement au-dessus du texte qui le suit (`H1_MIN`, R6 de L253) et des sous-titres à leur propre plancher
    // (`SOUS_TITRES_MIN`)…
    const dur = Math.max(normale, H1_MIN * suit, SOUS_TITRES_MIN * Math.max(0, ...sesSous.map((t) => t.plancher)));
    // … puis, tant que son mot le plus long tient dans sa boîte : `ECHELLE` fois le texte qui le suit, et un dixième
    // au-dessus des sous-titres qui étaient plus petits que lui au réglage normal ; ceux-ci ne le font pas grandir
    // au-delà de ce qui tient (L259 : « Le Warp » à 64 px portait le h1 de /lore/concepts à 70,4 px, « CONC|EPTS »),
    // ce sont alors eux qui redescendent. L259 r1 (QA en prod) : avec la vraie Cinzel, plus large que la police de
    // secours, « CONCEPTS » ne tenait pas à 1,25 × 32 px dans 242 px à 320 px : le h1 descend à 38,4 px, pas sous `dur`.
    const voulu = Math.max(normale, ECHELLE['H1'] * suit, ...sesSous.map((t) => t.cible * SOUS_TITRES));
    const tient = m.dispo > 0 && m.mot > 0 ? (m.taille * m.dispo * MARGE) / m.mot : Infinity;
    // Si son mot ne tient pas même à `dur`, céder ne sert à rien : il se coupe de toute façon (avec un trait si la
    // langue le permet), le h1 garde `ECHELLE` fois le texte qui le suit (règle d'avant L259 r1).
    // (sans `MARGE` : à 320 px, « CONCEPTS » tient à 38,4 px dans 242 px, la marge le mettait juste au-dessus)
    const tientADur = !(m.dispo > 0 && m.mot > 0) || (m.mot * dur) / m.taille <= m.dispo;
    const plancher = tientADur ? Math.max(dur, Math.min(voulu, tient)) : Math.max(dur, ECHELLE['H1'] * suit);
    // un h1 plus petit que son plancher (figé par fit-title) y est relevé
    const cible = Math.max(cibleTitre(m, plancher), plancher);
    // (jamais sous leur propre plancher : taille au réglage normal, échelle sur le texte qui les suit)
    for (const t of sesSous) t.cible = Math.min(t.cible, Math.max(t.plancher, cible / SOUS_TITRES));
    if (Math.abs(cible - m.taille) > 0.25) bornes.set(m.e, cible);
  }
  for (const t of sousTitres) if (Math.abs(t.cible - t.taille) > 0.25) bornes.set(t.e, t.cible);
  for (const [e, borne] of bornes) {
    // au centième inférieur, sans erreur flottante (1,2 × 34 = 40,8 donnait 40,79)
    e.style.setProperty('font-size', `${Math.floor(borne * 100 + 1e-6) / 100}px`);
    e.setAttribute(ATTRIBUT_BORNE, '');
  }
  return bornes.size;
}
