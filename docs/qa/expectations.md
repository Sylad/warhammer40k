# Attendus QA — warhammer40k

Ce que l'utilisateur doit trouver sur chaque page de https://warhammer.sladoire.dev. Lu par l'agent
`qa-reviewer` de cadence après chaque livraison. Tiré du brouillon rendu par la QA du 05-10-2026
(26 pages mesurées) et validé par Sylvain ; les comptes datent de ce jour-là et suivent les données
servies par l'API. Les textes se comparent sans tenir compte de la casse (l'écran met certains
libellés en capitales).

## *
- shows: un h1 non vide
- never: « undefined », « NaN », un message d'erreur d'API affiché ; une erreur dans la console (hors les icônes de faction en 404, voir /factions) ; une image cassée (naturalWidth 0)
- never: un défilement horizontal (scrollWidth > clientWidth) — 390 only

## /
- shows: la page d'accueil avec ses entrées vers les factions, le lore et la galerie

## /factions
- shows: 17 cartes de faction, chacune avec son icône ou le symbole de repli de la faction
- never: une carte sans nom de faction
- api: les icônes externes de static.wikia.nocookie.net peuvent répondre 404 (6 le 05-10, suivi par L41) ; le symbole de repli doit alors s'afficher

## /factions/:id
Visiter space-marines.
- shows: le nom de la faction en titre ; au moins un lien vers une fiche d'unité

## /units/:id
Visiter sm-calgar, ou un lien de la fiche faction.
- shows: le nom de l'unité en titre ; sa datasheet

## /romans
- never: le tiroir du menu (nav.drawer) qui sort de l'écran et crée un défilement horizontal — 390 only (490 px pour 384 le 05-10, suivi par L62)

## /videos
- never: le panneau latéral (section.side-panel) qui dépasse à droite et crée un défilement horizontal (1511 px pour 1434 à 1440, 493 pour 384 à 390 le 05-10, suivi par L62)

## /gallery
- shows: les statistiques Œuvres et Artistes, chacune avec un nombre (39 et 20 le 05-10) ; la pastille « Collections » n'apparaît que si au moins une collection compte une œuvre (aucune œuvre du seed ne porte de `collectionId` : absente le 06-10, donc 2 pastilles et non 3) ; les catégories (8 le 05-10) ; des cartes d'œuvre (.art-card) avec leur image
- shows: les statistiques affichées (deux, ou trois si « Collections » est présente) de largeur égale sur une seule ligne, sans colonne vide ; si la pastille « Collections » est là, son libellé « COLLECTIONS » est entier — 390 only (vaut aussi à 320)
- shows: la pagination est explicite : 24 cartes par page ; quand les résultats dépassent 24 (« 39 résultats » le 05-10), un contrôle « Page 1 sur 2 » avec « 1–24 sur 39 » (pas de « / ») est visible sous la grille, sur une ligne, sous les boutons à 760 px et moins ; sans filtre ni recherche, le total après « sur » (39 le 05-10) est égal au nombre d'œuvres du bandeau (avec un filtre ou une recherche, il en est inférieur ou égal)
- shows: « Collections populaires » : le panneau n'apparaît que s'il existe au moins une collection non vide (absent le 06-10) ; quand il est là, le compteur de chaque collection est calculé depuis les œuvres (/api/artwork-collections), jamais plus grand que le nombre d'œuvres du bandeau, et leur somme n'excède pas ce nombre (312, 276 et 198 pour 39 œuvres le 05-10 : bug L64)
- api: /api/artworks
- api: /api/artwork-artists
- api: /api/artwork-collections
- api: /api/image-meta
- api: /api/images

## /lore
- shows: les entrées vers les sous-pages du lore

## /lore/primarchs
- shows: 20 primarques

## /lore/primarchs/:id
Visiter lion-eljonson.
- shows: le nom du primarque en titre

## /lore/equipment
- shows: 69 équipements

## /lore/timeline
- shows: 35 événements

## /lore/ships
- shows: 15 vaisseaux

## /lore/titans
- shows: 10 titans

## /lore/saints
- shows: 8 saints

## /nouveautes
- shows: des entrées datées, chacune avec un titre et une capture chargée

## /plan
- shows: les sections du plan publié (en cours, prévu, récemment livré)

## /about
- shows: le titre de la page et ses sections
