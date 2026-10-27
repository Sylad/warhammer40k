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
- never: pour une faction sans sous-faction (visiter inquisition) : une section ou un lien d'ancre « sous-factions », un compteur « 0 », un message d'erreur
- api: `/api/subfactions?factionId=inquisition` répond `[]` (200), ce n'est pas une erreur (QA prod 15-10, L135)

- never: pour un identifiant inconnu (visiter /factions/n-existe-pas) : « Chargement… » sans fin ; le titre est alors « Faction introuvable » avec un lien vers /factions et sans bouton Réessayer (L97)

## /subfactions/:id
Visiter un lien de la fiche faction.
- shows: le nom de la sous-faction en titre ; ses sections ; la liste des successeurs peut être vide
- 404 (visiter /subfactions/n-existe-pas) : h1 « Sous-faction introuvable » + lien « Toutes les factions » vers /factions, pas de Réessayer ; une erreur 404 dans la console est permise
- 500 ou backend absent : h1 « Sous-faction indisponible » + bouton Réessayer, jamais « introuvable »

## /units/:id
Visiter sm-calgar, ou un lien de la fiche faction.
- shows: le nom de l'unité en titre ; sa datasheet
- shows: la barre d'onglets `nav.tabs`, nommée « Sections de la fiche » (aria-label), dont l'onglet affiché porte `aria-current="true"` et aucun autre : un seul aria-current dans la barre (L121) ; l'onglet Variantes n'y figure que si l'unité a des variantes (L126)
- shows: les panneaux Description et Histoire & Lore ont des textes différents : Description n'affiche jamais le `loreLong` réservé à Histoire & Lore, et la citation du lore n'est rendue qu'une seule fois dans la page, ni dans le hero ni dans Description (L125)
- shows: le CTA « Voir dans la galerie » mène à `/gallery?faction=<id de la faction>` et la galerie s'ouvre filtrée (moins d'œuvres que sans filtre) ; le CTA « Voir la vidéo » a pour nom accessible « Voir la vidéo : <titre> » et mène à `/videos?video=<id>` ; sans vidéo liée à la faction, ce CTA est absent (pas désactivé) (L127)
- shows: à 390 px, « Retour aux unités » et le bouton partager mesurent au moins 44 px de haut (le bouton partager 44 × 44 px) (L129)
- never: deux badges de même sens dans le hero, à casse, accent ou langue près (« Héros » et « Hero », « Infanterie » deux fois, l'alignement répété) ; la liste des badges visibles n'a aucun doublon de sens (L124, L130, QA prod du 14-10)

## /romans
Ajouté par L137 (QA prod du 17-10, après L5 et L136) : 38 séries Black Library le 17-10.
- shows: le h1 « Romans Black Library »
- shows: la barre `nav.tabs` nommée « Affichage des séries » (aria-label) : 4 onglets, tous visibles à 1440, 390 et 320 px (ils passent à la ligne, aucun hors de l'écran), un seul aria-pressed="true" dans la barre (L5)
- shows: dans l'onglet Ordre de lecture, le sélecteur « Trier par » (select nommé) est désactivé, avec sa note qui dit pourquoi ; actif dans les autres onglets (L5)
- shows: le champ de recherche nommé (aria-label « Rechercher un roman, une série ou un auteur »)
- shows: 27 lettres (A–Z et #), chacune avec aria-pressed, au plus une à true (aucune quand aucun filtre de lettre n'est actif) ; les lettres sans série dans l'onglet et la recherche en cours sont désactivées
- shows: « N séries affichées sur 38 » (sans filtre, N ≤ 38) au-dessus du bouton « Charger plus de séries », qui disparaît quand tout est affiché
- shows: Entrée sur un bouton « Voir la couverture de <série> » ouvre un dialogue role=dialog aria-modal="true" nommé par le titre de la série ; Échap le ferme et rend le focus au bouton d'origine
- shows: un état vide (recherche ou lettre sans résultat, mode « Continuer ma lecture » sans série en cours) nomme le filtre actif et propose « Effacer les filtres »
- never: un défilement horizontal (scrollWidth > clientWidth) à 390 et 320 px (492 px pour 390 avant L5)
- never: le tiroir du menu (nav.drawer) qui sort de l'écran et crée un défilement horizontal — 390 only (490 px pour 384 le 05-10, suivi par L62)
- never: l'accroche (eyebrow), la description ou le champ de recherche du bandeau .hero coupés par son bord droit (bord droit du texte ou de .search-bar au-delà de celui de .hero ; 322 px pour 300 le 17-10, suivi par L139) — 320 only
- api: /api/series (38 séries), /api/wiki-image?q= (couvertures)

## /videos
- never: le panneau latéral (section.side-panel) qui dépasse à droite et crée un défilement horizontal (1511 px pour 1434 à 1440, 493 pour 384 à 390 le 05-10, suivi par L62)

## /gallery
- shows: les statistiques Œuvres et Artistes, chacune avec un nombre (39 et 20 le 05-10) ; la pastille « Collections » n'apparaît que si au moins une collection compte une œuvre ; depuis L70 (17 œuvres rattachées) elle est là avec le nombre 3, donc 3 pastilles (Œuvres, Artistes, Collections 3) ; les catégories (8 le 05-10) ; des cartes d'œuvre (.art-card) avec leur image
- shows: les statistiques affichées (trois depuis L70 ; deux si aucune collection n'a d'œuvre) de largeur égale sur une seule ligne, sans colonne vide ; si la pastille « Collections » est là, son libellé « COLLECTIONS » est entier — 390 only (vaut aussi à 320)
- shows: la pagination est explicite : 24 cartes par page ; quand les résultats dépassent 24 (« 39 résultats » le 05-10), un contrôle « Page 1 sur 2 » avec « 1–24 sur 39 » (pas de « / ») est visible sous la grille, sur une ligne, sous les boutons à 760 px et moins ; sans filtre ni recherche, le total après « sur » (39 le 05-10) est égal au nombre d'œuvres du bandeau (avec un filtre ou une recherche, il en est inférieur ou égal)
- shows: « Collections populaires » : le panneau n'apparaît que s'il existe au moins une collection non vide ; depuis L70 il est là, avec trois collections annoncées 8 œuvres (Horus Heresy), 1 œuvre (40K Core Book) et 8 œuvres (Black Library Covers) ; un clic sur une collection ne laisse que ses cartes (.art-card) : exactement 8, 1 ou 8, jamais plus que le compteur annoncé, un second clic lève le filtre ; de façon générale, le compteur de chaque collection est calculé depuis les œuvres (/api/artwork-collections), jamais plus grand que le nombre d'œuvres du bandeau, et leur somme n'excède pas ce nombre (312, 276 et 198 pour 39 œuvres le 05-10 : bug L64)
- api: /api/artworks
- api: /api/artwork-artists
- api: /api/artwork-collections
- api: /api/image-meta
- api: /api/images

## /lore
- shows: les entrées vers les sous-pages du lore

## /lore/chaos-gods
- shows: quatre dieux du Chaos, chacun avec son numéro « I / IV » à « IV / IV » en haut de l'en-tête, son illustration et son bouton « Agrandir l'illustration de … »
- never: un numéro sous 4,5:1 de contraste sur le pixel le plus clair de l'image, au repos, quand l'image est survolée et quand elle a le focus clavier, à 320, 390 et 1440 px (L176 : le survol n'éclaircit plus l'image) ; mesure au rendu réel, pas sur un fond figé

## /lore/civilians
Ajouté par L187 (QA prod du 23-10, après L177 à L186) : 13 organisations, 68 fonctions et 29 figures le 23-10.
- shows: le h1 « Civils Impériaux » et 13 organisations, chacune avec son h2 (nom de l'organisation)
- shows: 29 figures notables, chacune sur une carte avec son image (aucune image cassée) et son bouton qui ouvre la visionneuse
- shows: les compteurs du bandeau 13 / 68 / 29 (Organisations, Fonctions documentées, Figures notables) ; « — » tant que la liste charge ou échoue, jamais « 0 Organisations » (L184)
- shows: 7 filtres (« Toutes » et six catégories), des boutons type="button" avec aria-pressed, un seul à true (le filtre actif, « Toutes » au chargement) (L183)
- shows: Visionneuse d'une figure (clic sur sa carte) : un dialogue role=dialog aria-modal="true" nommé « Visionneuse — <figure> » ; le focus entre sur « Fermer », Échap le ferme et rend le focus à la carte d'origine (L181)
- never: un texte sous contraste : h2 des organisations à 3:1 au moins (texte large) et tous les autres textes (badges de catégorie, rôles et noms des figures, titre de la visionneuse) à 4,5:1 au moins, mesurés au pire pixel de leur fond (image comprise) à 1440, 390 et 320 px (Arbites à 1,59:1 avant L177, badges à 2,32–3,33:1 avant L178)
- never: un défilement horizontal (scrollWidth > clientWidth) à 1440, 390 et 320 px ; un en-tête d'organisation ou le bandeau coupé par son bord droit (L180)
- never: une figure dont l'image n'est pas celle de son sujet, ou partagée avec une autre figure : image de son sujet, jamais partagée (Solomon Voss et Mersadie Oliton affichaient la même image, Iacton Qruze ; Lady Aurelia Malys un kabal drukhari ; Cornelius von Bismarck The Despoiler ; Aleya un « Oblivion Knight » — L189). Les 29 cartes ont 29 images distinctes
- never: une figure corrigée en L189 ou L194 dont l'image vient d'un repli de recherche du wiki : pour ces six figures, pageTitle = sujet du wikiQuery (Sébastian Thor : q « Sebastian Thor » → pageTitle « Reign of Blood », une page sans rapport de nom ; sa requête vise la page « Age of Apostasy » — L194)
- never: la même requête /api/wiki-image envoyée deux fois pendant la visite de la page, ni la visionneuse d'une figure qui enchaîne des requêtes retombant sur la même image (Malcador : 2 requêtes ; Master of the Administratum : 5 vers la même icône) (L190)
- api: /api/lore/imperial-orgs (13 organisations), /api/wiki-image?q= (images des figures)

## /lore/concepts
Ajouté par L199 (QA prod du 23-10, après L13, L197 et L198) : 15 concepts, 76 faits et 44 liens le 23-10.
- shows: le h1 « Concepts & Lieux Sacrés » et 15 concepts, chacun sur une carte avec son h2 (nom du concept), son numéro et sa catégorie
- shows: les compteurs du bandeau 15 / 76 / 44 (Concepts, Faits documentés, Liens inter-concepts) ; « — » quand la liste échoue, jamais « 0 Concepts »
- shows: 5 filtres (« Tous · 15 », « Impérial · 4 », « Warp · 5 », « Monde · 5 », « Doctrine · 1 »), des boutons type="button" avec aria-pressed, un seul à true (le filtre actif, « Tous » au chargement) ; un clic sur une catégorie ne laisse que ses cartes
- shows: Visionneuse d'un concept (bouton de l'image « Voir en grand — <concept> ») : un dialogue role=dialog aria-modal="true" nommé « Visionneuse — <concept> » ; le focus entre sur « Fermer », Échap le ferme et rend le focus au bouton de l'image du même concept (le ⛶ n'est pas focalisable) (L13)
- never: un texte sous contraste : le titre de la visionneuse (Imperium Nihilus à 1,8:1 et Maelstrom à 2,21:1 avant L197), les h2, les catégories (badges et filtre actif) à 4,5:1 au moins, mesurés au pire pixel de leur fond (image comprise) à 1440, 390 et 320 px (la couleur brute du concept reste sur le sigil et les bordures — L13)
- never: un concept dont l'image n'est pas celle de son sujet, ou partagée avec un autre concept : les 15 cartes ont 15 images distinctes (Cadia affichait l'Œil de la Terreur, Imperium Sanctus la carte d'Imperium Nihilus, le Codex Astartes la livrée des Ultramarines — L198)
- shows: dans la galerie de la visionneuse d'un concept, au moins une vignette (`.lightbox-thumb` ≥ 1, avec l'image du concept en première) : les 15 concepts portent 1 à 3 pages du wiki dans `galleryPages` et la visionneuse n'envoie que ces requêtes (L207, la galerie était vide depuis L200)
- never: dans la galerie de la visionneuse d'un concept, une vignette de repli du wiki (Pict-File_Unavailable), une image d'une autre page que celle demandée (Red_Templars_Biker pour le Codex Astartes, LorgarArt pour Cadia), une image en double, ou des requêtes `… art` / `… concept art` / `… illustration` à `/api/wiki-image` (Codex Astartes et Cadia en faisaient 4 sans effet) ; la visionneuse n'envoie pas plus de requêtes que le concept n'a de `galleryPages` (L200, L207)
- never: un défilement horizontal (scrollWidth > clientWidth) à 1440, 390 et 320 px
- api: /api/lore/concepts (15 concepts), /api/wiki-image?q= (images des concepts)

## /lore/primarchs
- shows: 20 primarques

## /lore/primarchs/:id
Visiter lion-eljonson.
- shows: le nom du primarque en titre

## /lore/equipment
- shows: 69 équipements

## Fiches de lore (/lore/ships/:id, /lore/saints/:id, /lore/titans/:id, /lore/equipment/:id)
Ajouté par L103 (QA prod du 11-10). Visiter phalanx (vaisseau), saint-celestine (saint), warhound-titan (titan), boltgun-astartes (équipement), ou le lien d'une carte de la liste. Les quatre fiches partagent la barre d'ancres (`.anchor-nav`, `_anchor-nav.scss`, L89) : mêmes attendus.
- shows: le nom de l'entité en titre de la fiche (h1 et titre de l'onglet « <nom> — Warhammer 40 000 »), pas le titre générique de la route (« Vaisseau », « Saint », « Titan », « Équipement ») ni « introuvable »
- shows: la barre d'ancres collée juste sous l'en-tête, après défilement comme au chargement : le haut de `.anchor-nav` à la hauteur de l'en-tête (`.topbar`, --topbar-h), à 1 px près, sans recouvrement ni écart ; elle ne passe jamais derrière l'en-tête
- shows: la colonne latérale collante (quand la fiche en a une) sous la barre d'ancres, après défilement : son haut est supérieur ou égal au bas de `.anchor-nav`, elle ne recouvre pas la barre
- shows: un clic sur un lien de la barre amène le titre de la section visée à moins de 40 px sous le bas de la barre d'ancres (ni masqué derrière elle, ni loin dessous) ; excepté pour les dernières sections quand la fin de page est atteinte et que la section ne peut plus monter (défilement au maximum)
- never: une section cible cachée derrière l'en-tête ou la barre après un clic d'ancre ; une barre d'ancres à top 0

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
