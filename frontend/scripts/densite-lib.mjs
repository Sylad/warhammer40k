// L40 — règles communes de densité des pages et leur vérification sur des mesures prises au
// navigateur (scripts/densite.mjs). Les seuils et leur source sont décrits dans
// docs/densite/regles.md ; ce fichier en est la version exécutable (testée par densite.test.mjs).

/** Largeurs de mesure : bureau et téléphone (captures de revue UX). */
export const LARGEURS = [
  { nom: 'bureau', w: 1440, h: 900 },
  { nom: 'téléphone', w: 390, h: 844 },
];

/**
 * Seuils des règles communes (D1 à D6, voir docs/densite/regles.md).
 * - D1 sommaire : au-delà de `ecransSansSommaire` écrans au téléphone, la page a un sommaire de
 *   page d'au moins `ancresMin` ancres.
 * - D2 repli : au repos, aucun bloc de texte de plus de `lignesMax` lignes n'est affiché en entier.
 * - D3 largeur de lecture : au plus `caracteresParLigneMax` caractères par ligne de texte courant ;
 *   au bureau, au moins `caracteresParLigneMin` (colonnes trop étroites : blocs très hauts).
 * - D4 pagination : une liste montre au plus `listeMax[largeur]` éléments avant « Afficher plus »,
 *   `listeTolerance` de plus au besoin (pas de bouton pour cacher un ou deux éléments).
 * - D5 doublons : un même texte (au moins `doublonMin` caractères) n'apparaît qu'une fois.
 * - D6 titres : un seul h1, aucun niveau de titre sauté.
 */
export const SEUILS = {
  ecransSansSommaire: 3,
  ancresMin: 3,
  lignesMax: 8,
  caracteresParLigneMax: 80,
  caracteresParLigneMin: 40,
  listeMax: { bureau: 12, 'téléphone': 6 },
  listeTolerance: 2,
  doublonMin: 60,
};

/** Gabarits et page mesurée pour chacun (même choix que l'audit des liens du 02-10). */
export const PAGES = [
  ['/', '/'],
  ['/factions', '/factions'],
  ['/factions/:id', '/factions/space-marines'],
  ['/units/:id', '/units/sm-calgar'],
  ['/subfactions/:id', '/subfactions/imperial-fists'],
  ['/romans', '/romans'],
  ['/videos', '/videos'],
  ['/jeux-video', '/jeux-video'],
  ['/gallery', '/gallery'],
  ['/lore', '/lore'],
  ['/lore/emperor', '/lore/emperor'],
  ['/lore/primarchs', '/lore/primarchs'],
  ['/lore/primarchs/:id', '/lore/primarchs/lion-eljonson'],
  ['/lore/chaos-gods', '/lore/chaos-gods'],
  ['/lore/civilians', '/lore/civilians'],
  ['/lore/concepts', '/lore/concepts'],
  ['/lore/equipment', '/lore/equipment'],
  ['/lore/equipment/:id', '/lore/equipment/bolt-pistol'],
  ['/lore/ships', '/lore/ships'],
  ['/lore/ships/:id', '/lore/ships/phalanx'],
  ['/lore/titans', '/lore/titans'],
  ['/lore/titans/:id', '/lore/titans/warhound-titan'],
  ['/lore/saints', '/lore/saints'],
  ['/lore/saints/:id', '/lore/saints/saint-drusus'],
  ['/lore/timeline', '/lore/timeline'],
  ['/lore/timeline/:id', '/lore/timeline/fall-of-cadia'],
  ['/lore/galaxy', '/lore/galaxy'],
  ['/nouveautes', '/nouveautes'],
  ['/plan', '/plan'],
  ['/about', '/about'],
];

/**
 * Mesure d'une page à une largeur, exécutée DANS le navigateur (page.evaluate). Ne lit que le
 * contenu de <main> visible au repos (rien n'est déplié).
 */
export function mesurer() {
  const main = document.querySelector('main') || document.body;
  const vis = (e) => {
    if (!e.getClientRects().length) return false;
    const s = getComputedStyle(e);
    return s.visibility !== 'hidden' && s.display !== 'none';
  };
  const texte = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();
  const h = document.documentElement.scrollHeight;
  const vh = window.innerHeight;

  // Titres (hiérarchie).
  const titres = [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map((e) => Number(e.tagName[1]));
  const sauts = [];
  for (let i = 1; i < titres.length; i++) if (titres[i] > titres[i - 1] + 1) sauts.push(`h${titres[i - 1]}→h${titres[i]}`);

  // Sommaire : <nav> de <main> dont au moins 3 liens mènent à une ancre de la page.
  let ancres = 0;
  for (const nav of main.querySelectorAll('nav')) {
    const n = [...nav.querySelectorAll('a[href*="#"]')].filter((a) => {
      try {
        const u = new URL(a.href, location.href);
        return u.pathname === location.pathname && u.hash.length > 1;
      } catch {
        return false;
      }
    }).length;
    ancres = Math.max(ancres, n);
  }

  // Blocs de texte courant : éléments dont le texte propre dépasse 200 caractères.
  const prose = [];
  for (const e of main.querySelectorAll('p, blockquote, li, dd')) {
    if (!vis(e)) continue;
    const t = texte(e);
    if (t.length < 200) continue;
    if (e.querySelector('p, li')) continue; // conteneur : on mesure les enfants
    const s = getComputedStyle(e);
    const lh = parseFloat(s.lineHeight) || parseFloat(s.fontSize) * 1.2;
    const r = e.getBoundingClientRect();
    const lignesAffichees = Math.round(r.height / lh);
    const lignesTotales = Math.round(e.scrollHeight / lh);
    // Caractères par ligne : texte / lignes du texte entier (scrollHeight : replié ou non).
    const cpl = lignesTotales > 1 ? Math.round(t.length / lignesTotales) : null;
    prose.push({ debut: t.slice(0, 40), caracteres: t.length, lignesAffichees, lignesTotales, cpl });
  }

  // Listes : conteneurs de 4 éléments ou plus de même balise et même classe (cartes, entrées).
  let listeMax = { n: 0, ou: '' };
  // Hors sommaires, barres de filtres (boutons courts : lettres, catégories) et marqueurs de carte.
  for (const c of main.querySelectorAll('*')) {
    if (c.closest('nav, [role="toolbar"], [role="tablist"], .leaflet-container')) continue;
    const kids = [...c.children].filter(vis);
    if (kids.length < 4) continue;
    if (kids.reduce((n, k) => n + texte(k).length, 0) / kids.length < 20) continue;
    if (kids.some((k) => k.querySelector('h2'))) continue; // les sections de la page ne sont pas une liste
    const cle = (k) => k.tagName + '.' + (k.classList[0] || '');
    const freq = new Map();
    for (const k of kids) freq.set(cle(k), (freq.get(cle(k)) || 0) + 1);
    for (const [k, n] of freq) if (n > listeMax.n) listeMax = { n, ou: (c.className || c.tagName).toString().split(' ')[0] + ' > ' + k };
  }

  // Doublons : même texte (≥ 60 caractères) dans deux éléments feuilles visibles.
  const vus = new Map();
  for (const e of main.querySelectorAll('p, blockquote, h1, h2, h3, li')) {
    if (!vis(e) || e.querySelector('p, li, blockquote')) continue;
    const t = texte(e).replace(/^[«"\s]+|[»"\s]+$/g, '');
    if (t.length < 60) continue;
    vus.set(t, (vus.get(t) || 0) + 1);
  }
  const doublons = [...vus].filter(([, n]) => n > 1).map(([t]) => t.slice(0, 50));

  const liens = [...main.querySelectorAll('a[href], button')].filter(vis).length;
  return {
    hauteur: h,
    ecrans: Math.round((h / vh) * 10) / 10,
    titres: titres.length,
    sections: titres.filter((t) => t === 2).length,
    h1: titres.filter((t) => t === 1).length,
    sauts,
    ancres,
    liens,
    liensParEcran: Math.round((liens / (h / vh)) * 10) / 10,
    blocsTexte: prose.length,
    blocLePlusLong: prose.reduce((m, p) => Math.max(m, p.lignesAffichees), 0),
    cplMax: prose.reduce((m, p) => Math.max(m, p.cpl ?? 0), 0),
    // Plus petite largeur de lecture parmi les blocs d'au moins 4 lignes.
    cplMin: prose.filter((p) => p.cpl != null && p.lignesTotales >= 4).reduce((m, p) => Math.min(m, p.cpl), Infinity),
    prose,
    listeMax,
    doublons,
  };
}

/** Écarts aux règles D1 à D6 d'une mesure prise à une largeur (`nom` de LARGEURS). */
export function ecarts(m, largeur, seuils = SEUILS) {
  const out = [];
  // D1 vise les pages faites de sections (au moins 3 titres h2) : une liste se pagine (D4).
  if (largeur === 'téléphone' && m.ecrans > seuils.ecransSansSommaire && m.sections >= 3 && m.ancres < seuils.ancresMin) {
    out.push({ regle: 'D1', detail: `${m.ecrans} écrans sans sommaire (${m.ancres} ancre(s))` });
  }
  const longs = m.prose.filter((p) => p.lignesAffichees > seuils.lignesMax);
  if (longs.length) {
    out.push({ regle: 'D2', detail: `${longs.length} bloc(s) de plus de ${seuils.lignesMax} lignes affichés en entier (max ${m.blocLePlusLong})` });
  }
  if (m.cplMax > seuils.caracteresParLigneMax) {
    out.push({ regle: 'D3', detail: `${m.cplMax} caractères par ligne` });
  }
  if (largeur === 'bureau' && m.cplMin != null && m.cplMin < seuils.caracteresParLigneMin) {
    out.push({ regle: 'D3', detail: `colonne de ${m.cplMin} caractères par ligne` });
  }
  const max = seuils.listeMax[largeur];
  if (max && m.listeMax.n > max + seuils.listeTolerance) out.push({ regle: 'D4', detail: `liste de ${m.listeMax.n} éléments (${m.listeMax.ou})` });
  if (m.doublons.length) out.push({ regle: 'D5', detail: `texte répété : ${m.doublons.map((d) => `« ${d}… »`).join(', ')}` });
  if (m.h1 !== 1 || m.sauts.length) {
    out.push({ regle: 'D6', detail: [m.h1 !== 1 ? `${m.h1} h1` : '', ...m.sauts].filter(Boolean).join(', ') });
  }
  return out;
}

/** Tableau Markdown des mesures : une ligne par gabarit, écarts aux deux largeurs. */
export function tableau(resultats) {
  const lignes = [
    '| Gabarit | Écrans 1440 / 390 | Liens par écran 390 | Titres | Bloc le plus long (lignes, 390) | Car./ligne max (1440) | Plus longue liste 1440 / 390 | Écarts |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const r of resultats) {
    const b = r.mesures['bureau'];
    const t = r.mesures['téléphone'];
    if (!b || !t) {
      lignes.push(`| \`${r.gabarit}\` | — | — | — | — | — | — | mesure impossible : ${r.erreur ?? '?'} |`);
      continue;
    }
    const ec = [...ecarts(b, 'bureau').map((e) => `${e.regle} (1440) ${e.detail}`), ...ecarts(t, 'téléphone').map((e) => `${e.regle} (390) ${e.detail}`)];
    lignes.push(`| \`${r.gabarit}\` | ${b.ecrans} / ${t.ecrans} | ${t.liensParEcran} | ${t.titres} | ${t.blocLePlusLong} | ${b.cplMax || '—'} | ${b.listeMax.n} / ${t.listeMax.n} | ${ec.join(' ; ') || 'aucun'} |`);
  }
  return lignes.join('\n');
}
