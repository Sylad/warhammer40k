/**
 * L253 passe 2 — sonde du texte agrandi, exécutée DANS la page (`page.evaluate(refluxTexte, …)`) : autonome, sans
 * import. Rejoue les mesures de la revue UX r1 de L253 (texte à 200 %) sur chaque nœud texte visible de `#contenu` :
 *  - `coupes` : mot coupé sur deux lignes sans trait (ni après un trait d'union, un tiret conditionnel ou une barre
 *    oblique, ni à une syllabe par la césure, `hyphens: auto`, qui dessine le trait). Un mot plus large que `PART_MOT_INSECABLE` de la largeur du contenu de `#contenu` est toléré : aucune
 *    marge ne le ferait tenir (« d'incontournables » à 320 px) ;
 *  - `etroits` : bloc de texte de moins de `EM_MIN` fois sa taille de police en largeur qui porte un mot d'au moins
 *    3 lettres (une à deux lettres par ligne : la citation de l'accueil à 77 px, les filtres des Vidéos à 50 px) ;
 *  - `rognes` : texte rogné en largeur, par une ellipse (`text-overflow`) ou un ancêtre `overflow: hidden | clip`
 *    (« Frenc… »). Hors carte Leaflet (étiquettes de la carte galactique, déjà hors cadre à 100 %).
 * Les mots sont séparés par les seules espaces sécables (« Armageddon » entre espaces fines insécables est un bloc).
 * Avec `{ memoriser: true }`, mémorise dans la page les défauts présents (réglage normal) et rend leurs clés ;
 * l'appel suivant ne rend que les nouveaux, ainsi que ceux absents de `connus` (clés rendues par une autre page au
 * réglage normal) : un mot déjà coupé à 100 % n'est pas un effet du texte agrandi.
 */
export interface RefluxRapport {
  coupes: string[];
  etroits: string[];
  rognes: string[];
  cles: string[];
}

export const PART_MOT_INSECABLE = 0.8;
export const EM_MIN = 3;

export function refluxTexte(options: { memoriser?: boolean; connus?: string[]; partMot?: number; emMin?: number }): RefluxRapport {
  const partMot = options.partMot ?? 0.8;
  const emMin = options.emMin ?? 3;
  const w = window as unknown as { __reflux?: Set<string> };
  const out: RefluxRapport = { coupes: [], etroits: [], rognes: [], cles: [] };
  const connus = new Set(options.connus ?? []);
  const contenu = document.querySelector<HTMLElement>('#contenu');
  if (!contenu) return out;
  const sc = getComputedStyle(contenu);
  const largeurContenu = contenu.clientWidth - parseFloat(sc.paddingLeft) - parseFloat(sc.paddingRight);
  const nom = (e: Element) => `${e.tagName.toLowerCase()}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : ''}`;
  const bloc = (e: HTMLElement): HTMLElement => {
    let b: HTMLElement = e;
    while (b.parentElement && getComputedStyle(b).display === 'inline') b = b.parentElement;
    return b;
  };
  // Indice du premier caractère de `mot` (à `debut` dans le nœud `t`) rendu sous la première ligne ; -1 sans coupure.
  // (Le caractère qui suit une coupure de césure a un morceau sur chaque ligne : il compte pour la seconde.)
  const indiceDeCoupe = (t: Node, debut: number, longueur: number): number => {
    const r = document.createRange();
    r.setStart(t, debut); r.setEnd(t, debut + 1);
    const haut = Math.round(r.getBoundingClientRect().top);
    for (let i = 1; i < longueur; i++) {
      r.setStart(t, debut + i); r.setEnd(t, debut + i + 1);
      if (Array.from(r.getClientRects()).some((x) => x.width > 0 && Math.round(x.top) > haut + 2)) return i;
    }
    return -1;
  };
  // Coupure de césure (`hyphens: auto`, le trait est dessiné hors du texte) : la partie du mot coupée (après son
  // dernier trait d'union avant la coupure), seule dans une boîte de même police, large de ce qu'elle occupe sur la
  // première ligne, où seule la césure peut couper (`overflow-wrap: normal`), se coupe au même endroit.
  const essai = document.createElement('span');
  const coupeDeCesure = (e: HTMLElement, t: Node, debut: number, mot: string, coupe: number) => {
    const s = getComputedStyle(e);
    if (s.hyphens !== 'auto' || coupe < 1) return false;
    const k = Math.max(mot.lastIndexOf('-', coupe - 1), mot.lastIndexOf('‐', coupe - 1)) + 1;
    if (k >= coupe) return false;
    // largeur des lettres de la partie coupée sur la première ligne (union des morceaux : le caractère qui suit la
    // coupure peut rendre un morceau qui couvre toute la ligne)
    const r = document.createRange();
    r.setStart(t, debut + k); r.setEnd(t, debut + coupe);
    const rects = Array.from(r.getClientRects()).filter((x) => x.width > 0);
    if (!rects.length) return false;
    const haut = Math.min(...rects.map((x) => Math.round(x.top)));
    const ligne = rects.filter((x) => Math.round(x.top) === haut);
    const lettres = Math.max(...ligne.map((x) => x.right)) - Math.min(...ligne.map((x) => x.left));
    const partie = mot.slice(k);
    essai.lang = e.closest('[lang]')?.getAttribute('lang') ?? 'fr';
    const style = (largeur: string) => `position:absolute;left:-99999px;top:0;display:block;width:${largeur};font:${s.font};` +
      `letter-spacing:${s.letterSpacing};text-transform:${s.textTransform};font-kerning:${s.fontKerning};` +
      `hyphens:auto;overflow-wrap:normal;word-break:normal;white-space:normal`;
    document.body.appendChild(essai);
    essai.style.cssText = style('max-content');
    essai.textContent = '‐';
    const trait = essai.getBoundingClientRect().width;
    essai.textContent = partie;
    // quelques largeurs voisines : les morceaux mesurés arrondissent
    const trouve = [0.5, 2, 4].some((d) => {
      essai.style.cssText = style(`${lettres + trait + d}px`);
      return indiceDeCoupe(essai.firstChild!, 0, partie.length) === coupe - k;
    });
    essai.remove();
    return trouve;
  };
  const vus = new Set<string>();
  const marche = document.createTreeWalker(contenu, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = marche.nextNode(); n; n = marche.nextNode()) {
    const texte = n.textContent ?? '';
    const el = n.parentElement;
    if (!texte.trim() || !el) continue;
    if (el.closest('[hidden], [inert], .sr-only, .visually-hidden, dialog:not([open]), .leaflet-container, code')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden') continue;
    // texte masqué pour la vue, lu par les lecteurs d'écran (boîte de 1 px coupée : en-têtes d'un tableau en cartes)
    let masque = false;
    for (let a: HTMLElement | null = el; a && a !== contenu; a = a.parentElement) {
      if (a.getBoundingClientRect().width <= 2 && getComputedStyle(a).overflow !== 'visible') { masque = true; break; }
    }
    if (masque) continue;
    range.selectNodeContents(n);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) continue;
    const taille = parseFloat(s.fontSize);
    const extrait = texte.trim().replace(/\s+/g, ' ').slice(0, 40);
    const signaler = (liste: string[], cle: string, message: string) => {
      vus.add(cle);
      if (options.memoriser || w.__reflux?.has(cle) || connus.has(cle)) return;
      liste.push(message);
    };

    // Texte rogné en largeur
    const gauche = Math.min(...rects.map((r) => r.left));
    const droite = Math.max(...rects.map((r) => r.right));
    for (let a: HTMLElement | null = el; a && a !== document.body; a = a.parentElement) {
      const sa = getComputedStyle(a);
      if (sa.overflowX === 'auto' || sa.overflowX === 'scroll') break;
      if (sa.overflowX !== 'hidden' && sa.overflowX !== 'clip') continue;
      const b = a.getBoundingClientRect();
      if (b.width <= 2) break; // texte masqué pour la vue (technique du « clip »)
      const depasse = Math.max(droite - b.right, b.left - gauche);
      if (depasse > 1) signaler(out.rognes, `r ${nom(el)} ${extrait}`, `${nom(el)} « ${extrait} » rogné de ${Math.round(depasse)} px par ${nom(a)}`);
      break;
    }
    if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) {
      signaler(out.rognes, `e ${nom(el)} ${extrait}`, `${nom(el)} « ${extrait} » tronqué (ellipse)`);
    }

    // Bloc trop étroit
    const b = bloc(el);
    const sb = getComputedStyle(b);
    const largeurBloc = b.clientWidth - parseFloat(sb.paddingLeft) - parseFloat(sb.paddingRight);
    // largeur ≤ 2 px : texte masqué pour la vue, lu par les lecteurs d'écran (technique du « clip »)
    if (largeurBloc > 2 && largeurBloc < emMin * taille && /\p{L}{3}/u.test(texte)) {
      signaler(out.etroits, `b ${nom(b)} ${extrait}`, `${nom(b)} « ${extrait} » : ${Math.round(largeurBloc)} px pour un texte de ${taille} px`);
    }

    // Mots coupés sans trait
    for (const m of texte.matchAll(/[^ \t\n\r\f]+/g)) {
      const mot = m[0];
      if (mot.length < 2) continue;
      range.setStart(n, m.index);
      range.setEnd(n, m.index + mot.length);
      const morceaux = Array.from(range.getClientRects()).filter((r) => r.width > 0.5);
      if (new Set(morceaux.map((r) => Math.round(r.top))).size < 2) continue;
      const largeurMot = morceaux.reduce((t, r) => t + r.width, 0);
      const coupe = indiceDeCoupe(n, m.index, mot.length);
      const avant = mot.slice(0, coupe);
      const apres = mot.slice(coupe);
      // coupure permise : après un trait d'union, un tiret conditionnel, un tiret (« 1– 24 »), une barre oblique
      if (/[-‐­/–—]$/.test(avant) || /^[-‐]/.test(apres) || mot.includes('/')) continue;
      if (largeurMot > partMot * largeurContenu) continue;
      if (coupeDeCesure(el, n, m.index, mot, coupe)) continue;
      signaler(out.coupes, `c ${nom(el)} ${mot}`, `${nom(el)} « ${avant}|${apres} » (${taille} px, mot de ${Math.round(largeurMot)} px dans ${Math.round(largeurBloc)} px)`);
    }
  }
  if (options.memoriser) w.__reflux = vus;
  out.cles = [...vus];
  out.coupes = [...new Set(out.coupes)];
  out.etroits = [...new Set(out.etroits)];
  out.rognes = [...new Set(out.rognes)];
  return out;
}
