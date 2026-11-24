# Carte du projet — écrans, workflows, décisions

## Attentes QA (`docs/qa/expectations.md`)

- Lu par l'agent qa-reviewer après chaque livraison : par route, `shows:` / `never:` / `api:` / `404`.
- L235 (17-11) : ajout de /lore/emperor et /lore/timeline/:id, /lore, /nouveautes et /about précisés,
  filtres des listes du lore (primarques, équipement, chronologie, vaisseaux, titans, saints) avec
  leurs comptes et leurs appels API.
- Id de fiche chronologie à visiter : `siege-of-terra`. La liste /lore/timeline n'a de lien vers une
  fiche que dans une carte dépliée (« Lire la fiche complète → ») : la QA doit déplier ou visiter l'id.
- Garde : `frontend/src/app/features/attentes-qa-l235.spec.ts` compare chaque compte et libellé écrit
  au seed (`backend/seed`), aux gabarits des composants, à `lore-hub.counts.ts` et au journal
  `nouveautes.json`. Un changement de données qui change un compte de ces pages fait échouer ce test :
  mettre à jour l'attente dans le même commit. Pour /nouveautes, les nombres sont des minimums.

## Galerie — changement de page (L71)

- `goToPage` : focus sur la grille (`tabindex=-1`), « Page N sur M » dans la région `pagination-annonce`,
  puis défilement vers la grille.
- Suite de la revue UX (18-11) : ce défilement suit `prefers-reduced-motion` — instantané (`auto`) si
  « reduce », doux sinon. Préférence lue par `defilementSelonPreference()` (`core/utils/section-anchor.ts`),
  aussi utilisée par `revealSection` : tout nouveau `scrollIntoView` programmé passe par elle.
- Gardes : `gallery-pagination-l71.spec.ts` (R5, R6) et `gallery-pagination-l71.e2e.spec.ts` (390 px, reduce /
  no-preference, scrollY mesuré juste après Entrée).

## Plan de travail — ancre d'un lot (L67)

- `/plan#<lot>` amène la carte visée à 90 px (sous la barre), même la dernière : l'espace qui manque au
  défilement est posé en `padding-bottom` de `section.plan`, seulement tant qu'une ancre vise un lot.
- L'ancre est relue sur `hashchange` ET sur chaque `NavigationEnd` du routeur (dans un `setTimeout`, après le
  défilement du routeur) : un lien interne vers /plan (pied de page, « À propos ▾ », Ctrl+K) passe par
  `pushState`, réutilise le composant et ne déclenche pas `hashchange`. Le routeur REMPLACE l'entrée
  d'historique quand seul le fragment change.
- Redimensionnement / polices tardives : `realign()` recale l'espace puis le défilement, seulement si la carte
  a le focus et que le visiteur n'a pas fait défiler depuis (`pinned`, levé par wheel/touchstart/keydown/
  pointerdown : la barre d'adresse d'un téléphone émet `resize` pendant un défilement au doigt).
- Garde : `plan.e2e.spec.ts`, joué en CI par `npm run test:e2e` (include de `vitest.e2e.config.ts`).
- Nouveautés écrites à la main sans cadence : ajouter l'entrée en tête de `nouveautes.json` (même forme que
  `cadence news build`, `<p>` par paragraphe), copier les captures, `node scripts/nouveautes-tailles.mjs` ;
  `nouveautes-data.spec.ts` compare au rendu de cadence quand il est installé.

## Texte agrandi — contenu en rem (L253)

- Tailles de texte (font-size, line-height, letter-spacing, arguments de `fit-title`) en **rem** partout
  (valeur px / 16 : rendu identique à 16 px). Un `clamp(A, Xvw, B)` devient `clamp(Arem, Xvw + Brem - Bpx, Brem)` :
  le terme ajouté vaut 0 à 16 px et suit la police au-delà. Suivent aussi le texte : boîtes d'icônes à glyphe et leur
  colonne de grille, pistes `repeat(auto-fill|auto-fit, minmax(min(Xrem, 100%), 1fr))` (sans `min(…, 100%)` une piste
  de 440 px poussait la page à 320 px), largeurs de lecture `max-width` de 500 à 1840 px des pages (pas les images,
  les visionneuses, les infobulles, la mise en page générale). Boutons et champs : 0.833333375rem global
  (`styles.scss`, la taille « small-control » du navigateur ne suit pas le rem).
- Classe d'hôte `texte-plus-grand` (`seuils-barre.ts`, `REM_REFERENCE`) dès que 1rem > 16 px, que la source soit
  la page (`html { font-size: 200% }`) ou la police par défaut du NAVIGATEUR (`texte-agrandi` de L250, relatif à
  celle-ci, n'est pas posé dans ce cas). Règles de reflux dans `src/styles/_texte-agrandi.scss` (sélecteurs par
  `#contenu` pour passer devant les feuilles des composants) ; règles de la barre sous `texte-plus-grand` dans
  `main-layout.component.ts`, la variante étroite dans une media query de 31em placée APRÈS la règle générale du
  tiroir (86vw), qu'elle doit emporter (`seuils-barre.spec.ts` dédoublonne les seuils ; R3 de L250 retire les
  classes en rem mais pas les media queries).
- Titres de fiche faction / unité sans figure : la colonne du texte devient conteneur et `fit-title` s'y mesure
  sous `texte-plus-grand` seulement.
- Gardes : `tailles-texte-rem-l253.spec.ts` (aucune taille de texte en px, terme vw nul à 16 px),
  `texte-200-contenu-l253.e2e.spec.ts` (11 routes, 320 à 1440 px : p ×2, titres et libellés ≥ ×1,9 sauf titre
  borné, aucun défilement ; R5 police du navigateur à 32 px), instantané de `component-styles.spec.ts` comparé au
  réglage normal (`auReglageNormal`). Utilitaire de test : `src/testing/taille-px.ts`.
- Passe 2 (revue UX r1, WCAG 1.4.4 : du texte une lettre par ligne, des mots coupés sans trait) :
  - **classes `contenu-<px>`** (`SEUILS_CONTENU` 1280, 1220, 1100, 1024, 900, 760, 600 de `seuils-barre.ts`) : posées
    seulement en texte plus grand, quand la fenêtre ≤ px × rem / 16 (à 200 %, 1440 px se met en page comme 720 px),
    jamais à 16 px. Les media queries max-width en px des pages y sont doublées dans `_texte-agrandi.scss`
    (`app-main-layout.contenu-760 #contenu app-videos …`). Une page qui bascule à une largeur en px : même règle sous
    la classe du seuil le plus proche ; un nouveau seuil s'ajoute à `SEUILS_CONTENU`, à la liaison d'hôte et à une
    règle (`seuils-barre.spec.ts`) ;
  - **césure** : `hyphens: auto` sur `#contenu` en texte plus grand (`lang="fr"`) — un mot trop long se coupe à une
    syllabe, avec un trait ; `overflow-wrap: anywhere` ne reste qu'en dernier recours ;
  - **ajusteur des titres** (`core/utils/titres-ajustes.ts`, piloté par la mise en page : MutationObserver de
    `<main>`, chargement des polices) : h1-h6 et textes en Cinzel dont le mot le plus long dépasse leur boîte reçoivent
    une `font-size` en ligne et `data-titre-borne` (plancher 1rem pour un titre, la taille à 16 px pour un autre
    texte) ; tout est retiré à 16 px ;
  - garde **`texte-200-reflux-l253.e2e.spec.ts`** (14 routes, 320 à 1440 px, page 200 % et navigateur 32 px ; sonde
    `testing/reflux-texte-200.ts`) : aucun mot coupé sans trait (une coupure de césure est reconnue en recoupant le
    mot seul dans une boîte de même largeur), aucun bloc de moins de 3 em, aucun texte rogné — seulement ce qui
    n'était pas déjà là au réglage normal.
- Passe 3 (revue UX r2 et revue de code r2) :
  - **plancher des titres relatif** (`titres-ajustes.ts`) : un titre borné ne descend jamais sous sa taille au réglage
    normal (lue en passant un instant la page à 16 px, `taillesNormales`) ni sous `ECHELLE` × le texte qui le suit
    (`texteQuiSuit` : h1 1,25, h2 1,1, autres 1, au moins 1rem) ; le h1 dépasse aussi de `SOUS_TITRES` (1,1) les
    sous-titres plus petits que lui à 16 px, et un h1 figé plus bas par `fit-title` (accueil, fiche unité) est relevé.
    Au-delà, le mot se coupe avec un trait. Ni glyphe seul ni élément tourné / mis à l'échelle (flèches « › », « ▾ ») ;
  - **mots collés à une espace insécable** (`core/utils/mots-colles.ts`) : Chromium ne césure pas « «\u202FArmageddon\u202F» »
    (coupé n'importe où, sans trait) ; le mot dans son propre `<span>` se césure. Actualités de l'accueil
    (`morceauxMotsColles`, gabarit) et Nouveautés (`htmlMotsColles` dans `news.service.ts`). Un texte de données
    affiché en grand (titre, Cinzel) avec des guillemets français passe par là ;
  - **résumés des romans** : `line-clamp` levé en texte agrandi (27 % visible à 200 % et 390 px) ;
  - **sonde de reflux** : la tolérance des mots plus larges que 80 % du contenu ne vaut plus que pour un mot sans
    coupure de césure possible (« ARMAGEDD|ON » y passait) ; un `line-clamp` qui cache du texte est signalé, sauf dans
    un lien (qui mène au texte entier) ou le texte repliable ;
  - **tailles** (`texte-200-contenu-l253.e2e.spec.ts`) : R2 refuse un titre borné sous sa taille à 100 %, R6 un h1 à
    moins de 1,2 fois le texte qui le suit ou de 1,05 fois un sous-titre, R7 un glyphe ou un élément tourné borné ;
  - **copies des media queries** (`src/styles/texte-agrandi-miroirs-l253.spec.ts`, lecteur `src/styles/scss-regles.ts`) :
    chaque règle `contenu-<px>` d'une page doit retrouver la media query `max-width: <px>` de la page, avec les mêmes
    valeurs, et toute règle de mise en page de cette media query doit être copiée. Une media query de page et sa
    copie changent ensemble ; une paire sans media query (règles propres au téléphone à 200 %) est déclarée `PROPRES`.
