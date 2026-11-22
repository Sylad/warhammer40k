# Attendus QA — warhammer40k

Ce que l'utilisateur doit trouver sur chaque page de https://warhammer.sladoire.dev. Lu par l'agent
`qa-reviewer` de cadence après chaque livraison. Tiré du brouillon rendu par la QA du 05-10-2026
(26 pages mesurées) et validé par Sylvain ; les comptes datent de ce jour-là et suivent les données
servies par l'API. Les textes se comparent sans tenir compte de la casse (l'écran met certains
libellés en capitales).

## *
- shows: un h1 non vide
- shows: au pied de page, « Site de fan non officiel, sans approbation de Games Workshop » et « © Games Workshop Limited », avec le lien « Crédits et droits » (L238) ; chaque image d'un tiers (wiki, fiche technique, YouTube…) porte son crédit en infobulle (attribut title) et la liste « Crédits des images de cette page » la nomme
- never: « undefined », « NaN », un message d'erreur d'API affiché ; une erreur dans la console (hors les icônes de faction en 404, voir /factions) ; une image cassée (naturalWidth 0)
- never: un défilement horizontal (scrollWidth > clientWidth) — 390 only

## /
- shows: la page d'accueil avec ses entrées vers les factions, le lore et la galerie
- shows: le nombre « Œuvres » (carte « Galerie » et bandeau des chiffres, masqué au téléphone) égal au nombre « Œuvres » du bandeau de /gallery : tout ce que la galerie montre, images personnelles comprises (/api/artworks + /api/images : 35 + 4 = 39 le 06-10 ; avant L73, l'accueil disait 35) ; « — » tant que l'une des deux réponses manque, jamais le seul compte du catalogue
- api: /api/artworks
- api: /api/images

## /factions
- shows: 17 cartes de faction, chacune avec son icône ou le symbole de repli de la faction
- never: une carte sans nom de faction
- api: les icônes externes de static.wikia.nocookie.net peuvent répondre 404 (6 le 05-10, suivi par L41) ; le symbole de repli doit alors s'afficher
- shows: au-dessus des cartes, le compte « 17 factions » (région `role=status`, `data-testid="compte-factions"`), qui suit chaque filtre et chaque recherche (« Imperium » → « N faction(s) ») (L96)
- shows: sur chaque carte, « UNITÉS » suivi d'un nombre une fois /api/units chargé ; « — » tant qu'il charge ou s'il est en erreur (L96)
- shows: une faction qui n'a aucune unité dans les données (vraies données, pas un défaut de correspondance : aucune unité du seed n'a son `factionId`) dit « Aucune fiche d'unité pour l'instant » (`data-testid="aucune-unite"`) à la place du compteur ; le 22-11, six factions : Adeptus Custodes, Officio Assassinorum, Drukhari, Grey Knights, Leagues of Votann, Genestealer Cults ; les onze autres ont « UNITÉS » suivi d'un nombre ≥ 1 (L246, QA prod du 22-11)
- never: « UNITÉS 0 » sur une carte, chargement fini ou non (L246)
- shows: une recherche sans résultat (taper « zzzz ») : le compte « Aucune faction », le message « Aucune faction ne correspond à la recherche « zzzz » » et le bouton « Effacer les filtres », qui ramène les 17 cartes et met le focus sur la première (L96)
- never: une grille vide sans message ; « UNITÉS 0 » sur toutes les cartes pendant que les unités chargent ; une recherche sans résultat sans message (L96)
- erreur (non déclenchable en prod, joué par `factions-etats-l96.e2e.spec.ts`) : /api/factions en échec → alerte « Les factions n’ont pas pu être chargées… » avec « Réessayer », aucune carte ; pendant le chargement, « Chargement des factions… » et des cartes fantômes (L96)
- api: /api/factions, /api/units

## /factions/:id
Visiter space-marines.
- shows: le nom de la faction en titre ; au moins un lien vers une fiche d'unité
- never: pour une faction sans sous-faction (visiter inquisition) : une section ou un lien d'ancre « sous-factions », un compteur « 0 », un message d'erreur
- api: `/api/subfactions?factionId=inquisition` répond `[]` (200), ce n'est pas une erreur (QA prod 15-10, L135)

- never: pour un identifiant inconnu (visiter /factions/n-existe-pas) : « Chargement… » sans fin ; le titre est alors « Faction introuvable » avec un lien vers /factions et sans bouton Réessayer (L97)
- 404 (visiter /factions/n-existe-pas) : à la place de la fiche, le message d'absence (h1 « Faction introuvable » + lien « Toutes les factions » vers /factions, pas de Réessayer) ; `/api/factions/n-existe-pas` répond 404 et l'erreur 404 qu'il laisse dans la console est permise, comme pour /subfactions (QA prod 17-11, L233)

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
Complété par L246 (QA prod du 22-11, L76). Le seed compte 16 vidéos et 6 chaînes ; la prod sert en plus les ajouts de l'utilisateur gardés sur le volume (28 vidéos et 20 chaînes le 22-11), d'où des minimums plutôt que des comptes exacts. Les chaînes n'ont pas de page à elles : **/chaines n'est pas une route** (repli SPA vers /factions, h1 « Factions ») et aucun lien de l'application n'y mène (L246) ; elles se voient ici.
- shows: le h1 « Archives Cinématiques »
- shows: des cartes vidéo (`article[data-testid="carte-video"]`), au moins une, chacune avec un titre lié (`h3.video-title a`) : au premier affichage, au plus 3 dans « Incontournables » et 9 dans « Toutes les vidéos » (12 en tout le 22-11), le reste derrière les boutons « Charger plus … »
- shows: le panneau « Chaînes prioritaires » du bandeau : un bouton par chaîne (`.channel-mini`), au moins « Le Librarium » et « Imperial Iterator » (chaînes `priority: true` du seed)
- shows: la section « Chaînes recommandées » : des cartes chaîne (`.channel-card`), au plus 6 au premier affichage ; s'il en reste, le bouton « Charger plus de chaînes (N restantes) »
- never: « Impossible de charger les vidéos » (`data-testid="message-erreur"`), « Le codex ne contient encore aucune vidéo » ; un panneau « Chaînes prioritaires » ou une section « Chaînes recommandées » sans aucune chaîne ; une chaîne retirée par Sylvain (L41 : @Indomitus40k, @Astartes40k, @SireLambert, @LaVoxObscura, @BaldermortGW, @WarFo40k) ; une vidéo du seed supprimée de YouTube (L232)
- api: /api/videos (200, liste non vide), /api/channels (200, liste non vide), /api/channels?priority=true (200, liste non vide : 2 chaînes le 22-11)
- never: le panneau latéral (section.side-panel) qui dépasse à droite et crée un défilement horizontal (1511 px pour 1434 à 1440, 493 pour 384 à 390 le 05-10, mesuré à nouveau le 30-10 par L57 : 0 px à 1440 et 390, plus de 27 px à 320 sur « Incontournables » ; reproduit en prod le 30-10 par L62 (1518 / 494), cause : piste de grille `auto` de la barre latérale élargie par les titres récents longs, corrigée en `minmax(0, 1fr)` ; gardé par `features/videos/defilement-horizontal-l57.e2e.spec.ts`, aussi pour /romans)

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
Complété par L235 (QA prod du 17-11, L68) : comptes du 17-11, calculés par `lore-hub.counts.ts` depuis les mêmes données que les pages.
- shows: le h1 « Lore Impérial »
- shows: 11 cartes, chacune un lien vers sa page : /lore/emperor, /lore/primarchs, /lore/chaos-gods, /lore/civilians, /lore/concepts, /lore/galaxy, /lore/equipment, /lore/timeline, /lore/ships, /lore/titans, /lore/saints
- shows: les compteurs des cartes : « 20 fiches », « 4 dieux · 8 daemons notables », « 13 organisations · 68 fonctions », « 15 concepts · 4 catégories », « 69 hot zones · 12 failles warp », « 69 pièces · 4 types », « 35 événements · 6 ères », « 15 vaisseaux · toutes factions », « 10 dieux-machines · 3 catégories », « 8 figures · 3 catégories » ; la carte des Primarques dit « 9 Loyalistes, 9 Traîtres, 2 Perdus. »
- never: un compteur à 0 ou périmé : un jeu de données vide ou en échec n'affiche aucun chiffre sur sa carte, les autres cartes gardent les leurs (L151)
- never: une carte « À venir » (toutes les sous-pages existent) ou une carte sans lien
- api: /api/lore/primarchs, /api/lore/chaos-gods, /api/lore/imperial-orgs, /api/lore/concepts, /api/timeline-events, /api/lore/equipment, /api/lore/ships, /api/lore/god-machines, /api/lore/saints (les zones de la carte galactique sont dans le code, sans appel)

## /lore/emperor
Ajouté par L235 (QA prod du 17-11, L68).
- shows: le h1 « L'Empereur de l'Humanité », le lien « ← Retour aux archives lore » vers /lore et l'image du bandeau
- shows: 5 lignes de données : Naissance, Nature, Statut actuel, Pouvoir maintenu, Successeur désigné
- shows: 6 sections, chacune avec son h2 et son image (`.section-img`, fond chargé ; 7 images de fond avec le bandeau le 17-11) : « Origine mystique », « La Grande Croisade », « L'Hérésie d'Horus », « Le Trône d'Or », « Apparitions au M42 », « Statut actuel — un dieu en gestation ? »
- shows: le lien « Voir les vingt Primarques → » vers /lore/primarchs
- never: « Chargement des archives sacrées… » sans fin ; une section sans image alors que sa requête /api/wiki-image a rendu une imageUrl
- api: /api/lore/emperor (un objet, 6 sections) ; 7 requêtes /api/wiki-image?q= (le bandeau, puis une par section)

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
- shows: 4 filtres « Tous · 20 », « Loyalistes · 9 », « Traîtres · 9 », « Perdus · 2 » : boutons type="button" avec aria-pressed, « Tous » seul à true au chargement ; un clic sur une allégeance ne laisse que ses cartes (L235, 17-11)
- api: /api/lore/primarchs, /api/wiki-image?q= (une image par carte)

## /lore/primarchs/:id
Visiter lion-eljonson.
- shows: le nom du primarque en titre

## /lore/equipment
- shows: 69 équipements
- shows: 5 filtres de type « Tous · 69 », « Armes à distance · 26 », « Armes de mêlée · 16 », « Armures · 15 », « Reliques · 12 » : boutons type="button" avec aria-pressed, « Tous » seul à true au chargement ; puis la liste « Filtrer par faction » (« Toutes les factions » au départ) et le champ « Rechercher dans l'arsenal » (L235, 17-11)
- api: /api/lore/equipment, /api/factions, /api/wiki-image?q= (une image par carte)

## Fiches de lore (/lore/ships/:id, /lore/saints/:id, /lore/titans/:id, /lore/equipment/:id)
Ajouté par L103 (QA prod du 11-10). Visiter phalanx (vaisseau), saint-celestine (saint), warhound-titan (titan), boltgun-astartes (équipement), ou le lien d'une carte de la liste. Les quatre fiches partagent la barre d'ancres (`.anchor-nav`, `_anchor-nav.scss`, L89) : mêmes attendus.
- shows: le nom de l'entité en titre de la fiche (h1 et titre de l'onglet « <nom> — Warhammer 40 000 »), pas le titre générique de la route (« Vaisseau », « Saint », « Titan », « Équipement ») ni « introuvable »
- shows: la barre d'ancres collée juste sous l'en-tête, après défilement comme au chargement : le haut de `.anchor-nav` à la hauteur de l'en-tête (`.topbar`, --topbar-h), à 1 px près, sans recouvrement ni écart ; elle ne passe jamais derrière l'en-tête
- shows: la colonne latérale collante (quand la fiche en a une) sous la barre d'ancres, après défilement : son haut est supérieur ou égal au bas de `.anchor-nav`, elle ne recouvre pas la barre
- shows: un clic sur un lien de la barre amène le titre de la section visée à moins de 40 px sous le bas de la barre d'ancres (ni masqué derrière elle, ni loin dessous) ; excepté pour les dernières sections quand la fin de page est atteinte et que la section ne peut plus monter (défilement au maximum)
- never: une section cible cachée derrière l'en-tête ou la barre après un clic d'ancre ; une barre d'ancres à top 0

## /lore/galaxy
- shows: un h1 « La Galaxie »
- shows: la carte, région nommée « Carte de la galaxie » (role=region, aria-label)
- shows: 3 filtres avec aria-pressed, tous à true au chargement : Mondes, Failles warp, Segmenta ; un clic bascule l'état du filtre touché
- shows: la légende « Les 5 Segmenta » avec ses cinq cartes
- never: l'outil de calibration (`.map-calib`) sans PIN saisi (réservé à l'édition)
- never: un défilement horizontal (scrollWidth > clientWidth) à 1440, 390 et 320

## /lore/timeline
- shows: 35 événements
- shows: 7 filtres d'ère « Toutes · 35 », « Pré-Imperium · 12 », « Hérésie d'Horus · 5 », « Temps de la Renaissance · 1 », « Long Crépuscule · 3 », « 41ᵉ Millénaire · 6 », « Cicatrix & Indomitus · 8 » : boutons avec aria-pressed, « Toutes » seul à true au chargement ; puis la liste « Par faction / thème » (« Tous les thèmes » au départ) (L235, 17-11)
- shows: une carte dépliée (clic sur son titre, aria-expanded="true") montre le récit, ses sources et le lien « Lire la fiche complète → » vers /lore/timeline/<id> ; repliée, la carte n'a aucun lien vers sa fiche
- api: /api/timeline-events (35 événements), /api/wiki-image?q= (une image par événement, plus le bandeau)

## /lore/timeline/:id
Ajouté par L235 (QA prod du 17-11 : la page n'avait pas été parcourue, faute d'id). Visiter siege-of-terra, ou déplier une carte de /lore/timeline et suivre « Lire la fiche complète → » (le seul lien vers une fiche, visible seulement dans une carte dépliée).
- shows: le h1 « Le Siège de Terra » (titre de l'onglet « Le Siège de Terra — Warhammer 40 000 »), l'ère « Hérésie d'Horus » et la date 014.M31 dans le bandeau
- shows: les panneaux h2 Récit Complet, Tags (5), Sources (2) en liens externes ; la colonne « Données » (Ère, Date) ; les liens « ← RETOUR À LA CHRONOLOGIE » et « RETOUR CHRONOLOGIE » vers /lore/timeline
- never: « Chargement de l'événement... » sans fin ; le titre générique de la route ou « introuvable » pour un id du seed
- 404 (visiter /lore/timeline/n-existe-pas) : h1 « Événement introuvable » + lien « Toute la chronologie » vers /lore/timeline, pas de Réessayer ; l'erreur 404 de `/api/timeline-events/n-existe-pas` dans la console est permise
- api: /api/timeline-events/siege-of-terra (un objet), /api/wiki-image?q= (image du bandeau)

## /lore/ships
- shows: 15 vaisseaux
- shows: 4 filtres (groupe « Filtrer par camp ») « Tous · 15 », « Imperium », « Chaos », « Xenos » : boutons type="button" avec aria-pressed, « Tous » seul à true au chargement ; chaque carte avec son image (L235, 17-11)
- api: /api/lore/ships, /api/wiki-image?q= (une image par carte)
- never: un vaisseau dont l'image n'est pas celle de son sujet, ou partagée avec un autre vaisseau : les 15 cartes ont 15 images distinctes (Indomitable Will et Or'es Tash'var affichaient le même Battleship, Khaine une bataille de Nurgle, Warp Skull un croiseur loyaliste, Remembrance « Pathos.jpg » — L212)

## /lore/titans
- shows: 10 titans
- shows: 4 filtres (groupe « Filtrer par catégorie ») « Tous · 10 », « Titans », « Chevaliers », « Walkers » : boutons type="button" avec aria-pressed, « Tous » seul à true au chargement ; chaque carte avec son image (L235, 17-11)
- api: /api/lore/god-machines, /api/wiki-image?q= (une image par carte)

## /lore/saints
- shows: 8 saints
- shows: 4 filtres (groupe « Filtrer par catégorie ») « Tous · 8 », « Saintes Vivantes », « Canonisés », « Ecclésiarques » : boutons type="button" avec aria-pressed, « Tous » seul à true au chargement ; chaque carte avec son image (L235, 17-11)
- api: /api/lore/saints, /api/wiki-image?q= (une image par carte)
- shows: 8 images distinctes, pageTitle = sujet (L214 : Drusus → « Calixis Sector », Sanguinaire → « Blood Angels », jamais « Drusus Shrine World » ni « Sanguinary Priest »)
- shows: sur la fiche d'un saint (ex. saint-celestine, saint-sanguinaire), Iconographie sans vignette en double ni de celle du haut de page (L215), chaque vignette venant d'une page de `galleryPages` ; la visionneuse (⛶ d'une carte) lance au plus autant d'appels /api/wiki-image que de `galleryPages`, jamais « … Imperial saint »

## /nouveautes
Complété par L235 (QA prod du 17-11, L68).
- shows: le h1 « Ce qui a changé »
- shows: au moins 107 entrées le 17-11 (une liste `ol.news-list`, la plus récente en haut), chacune avec sa date (`time[datetime]`), son h2, son bouton « Copier le lien : <titre> » et ses captures chargées (195 captures au total le 17-11, aucune image cassée)
- never: « Le journal des nouveautés n’a pas pu être chargé » ou « Aucune nouveauté publiée pour l’instant » ; les mots « introuvable », « indisponible », « impossible de charger » ou « 0 Organisations » dans le texte d'une entrée ne sont pas des erreurs (récit des corrections)
- api: aucun appel /api/ ; /nouveautes-data/nouveautes.json et /nouveautes-data/tailles.json, fichiers statiques lus par fetch, 200 et non vides

## /plan
- shows: les sections du plan publié (en cours, prévu, récemment livré)

## /about
Complété par L235 (QA prod du 17-11, L68).
- shows: le h1 « Le Scribe et son Daemon »
- shows: 5 sections h2 : « L'histoire courte », « Composantes techniques », « Inspirations & sources », « Crédits et droits », « Mes autres sites »
- shows: « Crédits et droits » (L238, ancre #credits) : une ligne par source d'image ou de texte (Games Workshop, Warhammer 40k Wiki, fiches techniques, portraits locaux, carte, galerie, YouTube, Lexicanum, Omnis Bibliotheca…), chacune avec ses droits
- api: aucun appel /api/ (page sans données chargées) ; les liens externes s'ouvrent dans un nouvel onglet (target="_blank", rel="noopener")
