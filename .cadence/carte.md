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
  `main-layout.component.ts`, la variante étroite DANS la media query de 31em (une seule media query par seuil,
  `seuils-barre.spec.ts` ; et R3 de L250 retire les classes en rem mais pas les media queries).
- Titres de fiche faction / unité sans figure : la colonne du texte devient conteneur et `fit-title` s'y mesure
  sous `texte-plus-grand` seulement.
- Gardes : `tailles-texte-rem-l253.spec.ts` (aucune taille de texte en px, terme vw nul à 16 px),
  `texte-200-contenu-l253.e2e.spec.ts` (11 routes, 320 à 1440 px : p ×2, titres et libellés ≥ ×1,9 sauf titre
  borné, aucun défilement ; R5 police du navigateur à 32 px), instantané de `component-styles.spec.ts` comparé au
  réglage normal (`auReglageNormal`). Utilitaire de test : `src/testing/taille-px.ts`.
- Limite connue : les media queries des PAGES sont en px et ne suivent pas le texte de la page ; à 200 % les héros à
  deux colonnes de /gallery, /videos, /romans (et /lore/timeline à 1024) coupent leur h1 au milieu d'un mot
  (`overflow-wrap: anywhere`, pas de défilement). Les compter en rem comme la barre (L250) serait un autre lot.
