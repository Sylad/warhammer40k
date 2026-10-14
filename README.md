# Warhammer 40K Codex

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-D97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)
[![Designed with ChatGPT](https://img.shields.io/badge/Designed%20with-ChatGPT-10A37F?logo=openai&logoColor=white)](https://chat.openai.com)
[![Angular 19](https://img.shields.io/badge/Angular-19-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![NestJS 11](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> Codex personnel immersif lore-first sur l'univers de Warhammer 40000 : factions, sous-factions (chapitres SM, légions Chaos, régiments AM, etc.), unités, romans Black Library, vidéos lore, galerie d'art.
>
> **100% du code écrit en pair-programming avec [Claude Code](https://claude.com/claude-code).** Direction artistique humaine + premières maquettes UX par [ChatGPT](https://chat.openai.com), implémentation Claude. Voir [Crédits IA](#crédits-ia).

![Codex — dashboard](./docs/screenshots/dashboard.jpeg)

## Aperçu

| | |
|---|---|
| ![Faction — Space Marines](./docs/screenshots/faction-space-marines.jpeg) | ![Lore — les 20 Primarques](./docs/screenshots/primarchs.jpeg) |
| **Faction Detail** — hero image-first, breadcrumb, lore en sections | **Les 20 Primarques** — 9 loyalistes / 9 traîtres / 2 expurgés |
| ![Galerie Impériale](./docs/screenshots/gallery.jpeg) | ![Archives Cinématiques](./docs/screenshots/videos.jpeg) |
| **Galerie Impériale** — 1500+ œuvres, catégories, multi-tag user | **Archives Cinématiques** — chaînes prioritaires, filtres, import oEmbed |

![Romans Black Library](./docs/screenshots/romans.jpeg)
*Romans Black Library — 38 séries, progression de lecture, ordre canonique*

## Pourquoi

Dev Java/web depuis 2005, j'utilise ce projet pour explorer **Claude Code** sur un stack frontend que je ne pratique pas au quotidien : **Angular 19 + NestJS**.

Le sujet (W40K) est volontairement riche en lore + visuel pour pousser sur les enjeux UX : navigation hiérarchique, cards image-first, fil narratif central, intégration de sources externes (Wikipedia/Fandom, Reddit, 40k.gallery).

Mon rôle : direction artistique + cadrage du besoin.
Le rôle de Claude : poser le code, expliquer chaque choix, itérer.

En amont du code, [ChatGPT](https://chat.openai.com) a aidé à générer les premières maquettes UX et schémas de pages — point de départ visuel pour l'identité gothique noir/or.

## Fonctionnalités

- **Pages** : Dashboard, Factions, Faction Detail, SubFaction Detail, Unit Detail, Romans, Vidéos, **Jeux vidéo** (jeux à venir puis déjà sortis, données vérifiées en ligne dans `frontend/public/jeux-data/jeux.json` ; un jeu à venir dont le jour de sortie annoncé est atteint passe automatiquement en tête de « Déjà sortis », à compléter ensuite dans le fichier avec son vrai résumé et ses plateformes), Galerie, Lore Hub, Empereur, Primarques, Panthéon Chaos, Civils Impériaux, Concepts (Trône d'Or, Astronomican, Œil de la Terreur, Cadia, Baal, etc.), Carte galactique, **Armement & Reliques**, **Chronologie du 41e millénaire**, **Galerie Navale** (classes de vaisseaux), **Titans** (classes Collegia Titanica), **Saints Impériaux**, **Nouveautés** (journal des évolutions, chaque capture décrite par son texte alternatif rédigé ; `*titre*` y est rendu en italique, le générateur cadence ne gérant que le gras), **Plan de travail** (en cours, prévu, récemment livré), À propos
- **Hiérarchie faction → sous-faction → unité** : 17 factions principales, 182 sous-factions (Ultramarines, Iron Hands, World Eaters, Krieg, Drukhari Kabales, Necron Dynasties, Tyranid Hive Fleets, +71 successeurs Space Marines lore-ifiés via Lexicanum, etc.) — chacune avec ses notableUnits enrichies (52 personnages Hérésie d'Horus loyalistes/traîtres, +70 figures xenos)
  La fiche d’une sous-faction affiche ses `notableUnits` (personnages et unités nommés, rôle + description + illustration wiki) dans « Unités notables » (L90). Chaque illustration (bandeau, notables, unités liées) n'est demandée à `/api/wiki-image` qu'une fois par chargement de fiche : l'`effect()` n'écoute que la fiche, pas le cache d'images (L114, `subfaction-images.spec.ts`).
  Ses « Batailles notables » affichent chacune sa date (`M41.745`, `999.M41-010.M42`…) puis son récit ; `subfactions-batailles.spec.ts` garde la forme de la date (L91).
- **Galerie 1500+ images** avec multi-catégorisation user (chips), import depuis Wikipedia Fandom / Reddit r/Warhammer40k / URL directe, catégories dynamiques (built-in + factions + customs) — **la recherche filtre aussi les cards de catégorie** ; le panneau **Filtres** (Faction, Catégorie, Trier par) précède la grille dans l'ordre de tabulation (WCAG 2.4.3) : en haut de la colonne de droite dès 761 px, replié derrière un bouton « Filtres » (avec le nombre de filtres actifs) sous la recherche jusqu'à 760 px ; chargement et échec de lecture ont leur propre état (« Chargement de la galerie… », « Impossible de charger la galerie. » + Réessayer), et au téléphone un rappel « Aucune œuvre ne correspond » + « Réinitialiser les filtres » apparaît sous la recherche quand les filtres ne laissent rien
- **Datasheets locales** : **119/133 unités** ont un visuel curé bundlé dans l'image Docker (HEAD-check + fallback wiki proxy)
- **Lightbox plein écran** sur les figures notables (Civils, Primarques, Panthéon Chaos) avec mini-galerie multi-thumbs + lien vers /gallery filtré
- **Wiki-image proxy** (Wikipedia Fandom EN) pour fetch les illustrations à la volée + cache in-memory + Lexicanum en fallback dédié L’accueil redemande ses miniatures à Fandom à la taille d’affichage (1 400 px pour le bandeau, 700 px pour les cartes) : l’API ne renvoie que 700 px, `wikiThumbWidth` (`shared/media-thumb.ts`) réécrit la largeur.
- **Black Library** — 38 séries de romans (incluant Drukhari, Grey Knights, Genestealer Cults) avec progression de lecture, badges et tags
- **Vidéos lore** — chaînes YT (officielles + créateurs) catégorisées
  - Chaque vidéo a son adresse `/videos?video=<id>` : la page s'ouvre sur la fenêtre de lecture (fermer retire le paramètre ; identifiant inconnu → message et liste entière ; échec de chargement → « Réessayer »). La carte « Vidéo à la une » du bloc Médias d'une page faction y mène. Les cartes sont des liens (Tab, Entrée, clic du milieu).
- **Lore narratif** : 6 sections Empereur, 20 fiches Primarques (9 loyalistes / 9 traîtres / 2 expurgés — chacun avec `loreLong` complet), 4 dieux Chaos, **13 organisations civiles** (incluant Imperial Navy avec classes de vaisseaux, Collegia Titanica avec classes de Titans, Conseil du Sigillite — Malcador & Valdor), 15 concepts (Trône d'Or, Astronomican, Webway, Cicatrix, etc.), carte galactique SVG calibrée (65 markers + 5 Segmenta Bézier)
- **Codex de l'arsenal** (`/lore/equipment`) : 69 pièces (26 armes ranged, 16 mêlée, 15 armures, 12 reliques nommées dont Drach'nyen, Black Sword Sigismund, Mjalnar)
- **Compteurs de l'accueil** : « — » pendant le chargement et sur erreur d'API (jamais un faux « 0 »), message + bouton « Réessayer » si un chiffre manque
- **Liste des Factions** (`/factions`) : le filtre « Autres » ne garde que les factions hors Imperium / Chaos / Xénos et n'apparaît que si au moins une faction y entre (L102) ; une liste vide affiche, dans une région `role="status"`, un message et un bouton « Toutes les factions » qui remet filtre et recherche à zéro (L102), mais seulement une fois les factions chargées : pendant le chargement la même région annonce « Chargement des factions… », et en cas d'erreur de `/api/factions` un message d'erreur sans bouton (L102) ; le panneau latéral ne compte plus que « À propos » et « Ressources rapides » (plus de « Filtres rapides » ni de légende Loyal/Neutre/Hostile), masqué sous 760 px (L92) ; « Ressources rapides » = trois liens (Chronologie `/lore/timeline`, Carte galactique `/lore/galaxy`, Concepts `/lore/concepts`), « Relations entre factions » retiré (L93)
- **Fiche faction sans unité** : pas de bouton « Explorer les unités », ni de section d'unités (filtres, recherche, « Aucune unité ne correspond »), ni de lien « Unités » dans la barre des sections ; le message « Aucune unité ne correspond » ne s'affiche que pour une faction qui a des unités mais aucune sous le filtre (L95)
- **Fiche unité** (`/units/:id`) : le panneau « Description » ne reprend jamais `loreLong` (il montre `loreCourt`, sinon `description`) ; « Histoire & Lore » porte seul le `loreLong`, et la citation n'est rendue qu'une fois, dans le bloc « Citation » du panneau latéral (L125, `unit-detail.component.spec.ts`)
- **Fiche unité, boutons du hero (L127)** : « Voir dans la galerie » (et les vignettes d'iconographie) ouvre `/gallery?faction=<faction de l'unité>`. « Voir la vidéo » ouvre `/videos?video=<id>` pour la meilleure vidéo liée par un tag (casse, accents et apostrophes typographiques ignorés), classée ainsi : tag égal au nom de l'unité, puis tag de la faction accompagné de Officiel / Chef-d'œuvre / Film / Série, puis tag de la faction seul, puis Parodie / Humour en dernier ; à rang égal, la première de la liste. Aucune vidéo n'étant rattachée aux unités, le bouton n'est pas proposé sans correspondance (`unit-detail.component.spec.ts`)
- **Clavier sur les Factions** : chaque carte de faction (`/factions`) et d'unité (fiche faction) est un vrai lien `<a href>` (Tab, Entrée) ; « Voir toutes les unités » est un `<button>` (Tab, Entrée, Espace)
- **Accueil au téléphone** (moins de 760 px) : la barre de statistiques et sa citation sont masquées (les nombres sont déjà sur les cartes) ; « N sous-factions » s'affiche en bas de la carte Factions. Au-delà de 760 px, inchangé
- **Fiche unité, cibles tactiles (L129)** : sous 760 px, « ← Retour aux unités » (14 px de haut jusque-là) et le bouton partager (36 px) mesurent 44 px (`unit-detail.component.scss`). Gardé par `unit-detail-cibles.spec.ts`
- **Barre des sections des fiches** (faction, primarque, vaisseau, saint, titan, équipement) : collée juste sous l'en-tête (`top` = `--topbar-h`, la hauteur du bandeau du haut, au lieu de passer derrière lui) ; sous 1320 px (où les liens ne tiennent plus toujours sur une ligne) elle tient sur une seule ligne défilante (60 px, 44 px sous 760 px) aux bords estompés, toujours visible ; les colonnes latérales collées des fiches se calent sous elle, et Tab / Maj+Tab ne laissent jamais le focus sous l'en-tête ou la barre (`scroll-padding-top`). Les sections atteintes par un lien de la barre s'arrêtent sous l'en-tête et la barre (`--anchor-offset`), focus compris (WCAG 2.4.11). Gardé par `styles/anchor-nav.spec.ts`
- **Brèves du 41ᵉ millénaire** : ticker dashboard de 40 entrées atmosphériques (Croisade Indomitus, Cicatrix, Chute de Cadia, Plague Wars, etc.)
- **API en erreur** (404/500, backend absent) : aucune page ne se fige. Les données passent par `toSafeSignal` (`shared/safe-signal.ts`), qui absorbe l'échec au lieu de relancer l'exception à chaque lecture ; chaque fiche et liste Lore affiche un message d'erreur avec « Réessayer » (`<app-load-error>`) à la place d'un « Chargement… » éternel, et la recherche Ctrl+K (qui indexe aussi les sous-factions, vers `/subfactions/:id`, et affiche la catégorie d’équipement traduite comme `/lore/equipment` — L117, `shared/components/command-palette/command-palette-l117.spec.ts`) reste utilisable : à chaque ouverture de la palette, les sources tombées (par exemple au démarrage) sont relancées, les autres non (L110). « Réessayer » relance **tous** les flux de la page (`retryAll`) — faction : unités, sous-factions, vidéos, œuvres ; unité : faction, unités liées, œuvres ; primarque : apparentés ; titan : factions ; Équipement : factions — et la fiche unité affiche l’erreur si sa faction échoue. Sur Équipement, Séries et Chronologie, quand la liste est en échec, le message d’erreur est seul : « Aucune pièce / série / Aucun événement ne correspond… » n’apparaît que pour une liste chargée, vide après filtrage (L111, L118, `features/liste-erreur-l111.spec.ts`). Le titre d’onglet de la fiche titan (route `lore/titans/:id`, titre de base « Machine ») dit « Machine introuvable », comme son h1 (L118). Sur les listes Lore (équipement, organisations, concepts, primarques, saints, vaisseaux, dieux-machines, chronologie : bandeau, pastilles d’ère et filtres), les compteurs du bandeau et des onglets (« Tous · … ») affichent « — » tant que la liste est en échec, jamais un faux « 0 » (L115, `compteur()` de `shared/safe-signal.ts`, gardé par `shared/compteurs-erreur-l115.spec.ts`). Fiche **introuvable** (404) : un titre h1 propre à la page (« Faction introuvable », « Unité introuvable », « Sous-faction introuvable »…), le message et un lien vers la liste (« Toutes les factions », « Tous les Primarques »…), sans « Réessayer » (L97, entrées `heading` / `backLink` / `backLabel` de `<app-load-error>`, gardé par `shared/components/load-error/load-error.component.spec.ts`, `faction-detail/faction-introuvable.spec.ts` et `features/fiche-introuvable-l97.spec.ts`) ; sur une erreur 500 ou réseau, les neuf fiches (faction, unité, sous-faction, primarque, saint, vaisseau, titan, chronologie, équipement) affichent un h1 « X indisponible » (« Faction indisponible »…) avec « Réessayer » et sans lien vers la liste (L97, `features/fiche-introuvable-l97.spec.ts` pour sept d’entre elles). Le lien de retour littéral de chaque fiche est vérifié contre `app.routes.ts` par `npm run liens`. Une fiche n’appelle son API qu’une fois par affichage : faction et unités liées d’une unité, apparentés d’un primarque se déduisent de la fiche chargée. Gardé par `shared/erreur-api-l38.spec.ts` (dont palette : échec puis succès) et `shared/reessayer-tous-flux-l38.spec.ts` (chaque flux échoue puis réussit)
- **Breadcrumb global** + fragment scroll + fil narratif central
- Cosmétique : design tokens custom (or sur fond noir, Cinzel/Inter), pas de Bootstrap/Material-default
- Stockage JSON, pas de DB

## Stack

| Couche | Tech |
|---|---|
| Frontend | Angular 19 standalone components + Material M3 (legacy en retrait) + tokens CSS custom + Cinzel/Inter |
| Backend | NestJS 11 + TypeScript 5 + Anthropic SDK |
| Storage | JSON local (pas de DB) |
| Sources externes | Wikipedia Fandom EN (wiki-image proxy), Reddit JSON public, 40k.gallery |
| Build | Docker multi-stage (node:20-alpine → nginx:alpine) |
| Déploiement | Images sur GHCR (CI GitHub), chart Helm sur k3s via ArgoCD (GitOps), exposé par un tunnel Cloudflare |
| Cache HTTP | nginx sert `index.html` et les fichiers aux noms fixes (favicon, carte, Nouveautés, plan) en `no-cache` (revalidés à chaque visite), les fichiers à empreinte du build en cache d'un an ; un script, une feuille de style, une police ou une image absents répondent 404, jamais la page |

## Setup local

### Prérequis
- Node.js 20+
- Une [clé API Anthropic](https://console.anthropic.com/settings/keys)

### Lancement
```bash
git clone <ce-repo> warhammer40k
cd warhammer40k

cp backend/.env.example backend/.env
# Édite ANTHROPIC_API_KEY

(cd backend && npm install) && (cd frontend && npm install)
npm run dev:backend    # API NestJS sur http://localhost:3001
npm run dev:frontend   # dans un autre terminal
```

Frontend disponible sur `http://localhost:4201`.

### Backoffice Ollama

Ollama peut proposer un enrichissement lore sans modifier les seeds :

```bash
OLLAMA_BASE_URL=http://localhost:11434 npm run ollama:lore -- --unit=sm-tactique
```

La sortie est écrite dans `../tmp/` pour relecture humaine avant toute édition
des données.

## Données seed

`backend/seed/` contient le contenu éditorial, lu directement par le backend (embarqué dans l'image, rien à copier : `backend/data/` ne garde que ce que les utilisateurs écrivent) :
- `factions.json` (17 factions principales) — `iconUrl` facultatif : sans lui (ou si l'image échoue) la carte affiche le `symbole` ; Fandom répondant 404 avec une image de remplacement, l'événement d'erreur ne part pas, donc aucune URL non datée n'est acceptée (`backend/src/common/faction-icons.spec.ts`)
- `subfactions.json` (182 sous-factions enrichies, dont 71 successeurs Space Marines lore-ifiés, 200+ notableUnits avec personnages Hérésie d'Horus)
- `units.json` (133 unités)
- `series.json` (38 séries Black Library)
- `videos.json` + `channels.json` (vidéos + 8 chaînes YT)
- `artworks.json` + `artwork-collections.json` (35 artworks + collections)
- `lore-feed.json` (40 entrées atmosphériques ticker)
- `emperor.json` (6 sections narratives)
- `primarchs.json` (20 fiches : 9 loyalistes / 9 traîtres / 2 expurgés)
- `chaos-gods.json` (4 dieux + 8 daemons notables — Bloodthirster, Lord of Change, GUO, Keeper of Secrets en visuels)
- `imperial-orgs.json` (13 organisations : Administratum, Ministorum, Arbites, Rogue Traders, Schola, Navigators, Astropaths, Sœurs du Silence, Knights, Remembrancers, **Imperial Navy** avec classes de vaisseaux, **Collegia Titanica** avec classes de Titans, **Conseil du Sigillite** — Malcador & Valdor)
- `lore-concepts.json` (15 concepts : Trône d'Or, Astronomican, Webway, Cicatrix, Cadia, Baal, etc.)
- `equipment.json` (69 pièces : armes ranged/mêlée, armures Mark IV-X + Terminator, daemon weapons, reliques impériales)

`backend/public/datasheets/` contient **119 JPEGs d'unités** (curés à la main, bundlés dans l'image Docker), servis via `/api/images/datasheets/:unitId`.

## Étape spec (cadence)

**Onglets de la fiche unité (L121)** — la barre Aperçu · Équipement · Histoire & Lore · Variantes est une `<nav aria-label="Sections de la fiche">` ; le bouton actif porte `aria-current="true"` (absent sur les autres), pour que l’état soit annoncé et pas seulement coloré (WCAG 4.1.2). Gardé par `features/unit-detail/unit-detail.component.spec.ts`.

**Suite déterministe sous charge (L113)** — `frontend/vitest.config.ts` borne le parallélisme (`maxWorkers: 8`, au lieu d'un worker par cœur : une vingtaine de specs pilotent Chromium et plusieurs parcourent `dist/`) et donne 30 s par test (comme `vitest.e2e.config.ts`) au lieu des 5 s par défaut : le scan de fuite de `dist/` de `plan-data.test.mjs` (~1 s au repos) expirait au hasard de la charge. `scripts/vitest-charge.test.mjs` garde ces réglages. Cas « cible à 92 px sous la barre » (`ancres.e2e.spec.ts`, échec d'assertion, pas de délai) : cause NON reproduite malgré des retards de 1,5 s sur les requêtes réelles de la fiche primarque (`/api/lore/primarchs/:id`, `/api/wiki-image`, en plus de `units` et `subfactions`, utilisées par les fiches faction) et de 2,5 s sur les polices (cas primarque 390 px rejoué seul, vert) ; l'hypothèse « fenêtre de stabilité trop courte » est démentie, la mesure reste donc gardée par trois dispositifs : `trackSettled` (la page ne reçoit son clic qu'une fois réglée — aucune requête en vol, polices chargées, deux images de suite ; plus de `networkidle`, déconseillé par Playwright), une fenêtre de stabilité qui repart tant qu'une police charge, et un échec explicite « position instable » au plafond de 20 s. Même famille, hors de ce lot : `videos-ouvrir-l47` peut lire l'adresse d'un nouvel onglet encore à `about:blank` (test scellé de L47, laissé tel quel ; aucun lot de ce plan ne le suit : le rescellement d'un lot livré relève de cadence L212, et l'échec CI reste possible d'ici là). Les specs qui lisent `dist/` ne le reconstruisent jamais : `npm run build` avant `npm test`, pas pendant.

Un lot à écran (`screen:`) passe par l'étape spec de cadence (`orchestrate.spec` dans `cadence.yaml`) : fiche et maquette sous `docs/specs/<écran>/`, revue de maquette, puis tests d'acceptation rouges. Ces tests sont des `*.acceptation.spec.ts` listés dans `docs/specs/<écran>/acceptation-<lot>.json` ; tant que ce fichier dit `"vert": false`, la suite (`npm test`) et la CI les excluent (`frontend/scripts/acceptation-runner.mjs`, repris d'ol-companion). La commande dédiée `orchestrate.accept` ne lance qu'eux : `cd frontend && CADENCE_ACCEPTATION=../docs/specs/<écran>/acceptation-<lot>.json npx vitest run -c vitest.acceptation.config.ts`. Le cycle pose `"vert": true` quand ils passent, et ils rejoignent alors la suite. Exception : une acceptation qui pilote un navigateur (import de `playwright-core`) reste hors de `npm test` même verte — elle exige `dist` et Chromium — et tourne avec les e2e : `cd frontend && npm run build && npm run test:e2e` (`vitest.e2e.config.ts`, 30 s par cas ; étape dédiée de « Contrôles frontend » après le build).

## Roadmap

Voir [WARHAMMER_ROADMAP.md](./WARHAMMER_ROADMAP.md) pour le plan d'enrichissement (Custodes, Drukhari, Grey Knights, Empereur, primarques, Chaos pantheon, lore concepts, galaxy map, civils impériaux).

## Notes légales

Warhammer 40000, ses factions, personnages et art sont la propriété de **Games Workshop**. Ce projet est un fan-codex personnel, non-commercial, à usage privé. Les images proxifiées proviennent de Wikipedia Fandom (CC BY-SA) et de sources publiques. Aucune redistribution.

## Crédits IA

- **[Claude Code](https://claude.com/claude-code)** (Anthropic) — code frontend, backend, infra Docker
- **[ChatGPT](https://chat.openai.com)** (OpenAI) — premières maquettes UX, schémas de pages, propositions visuelles

Pour le détail honnête de qui fait quoi (humain / Claude / ChatGPT / code déterministe), voir [HOW-IT-WORKS.md](./HOW-IT-WORKS.md).

Sources lore : [Warhammer 40k Wiki](https://warhammer40k.fandom.com), [Lexicanum](https://wh40k.lexicanum.com), [2d4chan](https://2d4chan.org/wiki/Warhammer_40,000), [Black Library](https://www.blacklibrary.com/), PDF *WH40K Fluff Bible*.
UX : codex 2D-print + cards image-first à la Diablo III / Destiny grimoire.
Principes UX : [refactoringui.com](https://refactoringui.com/), [lawsofux.com](https://lawsofux.com/).

## Licence

MIT pour le code. Les contenus W40K appartiennent à Games Workshop.

---

**Si tu veux faire pareil** — prends un sujet qui t'enflamme, ouvre Claude Code, décris en langage naturel ce que tu rêves de voir exister, puis itère. Tu seras surpris de ce qu'on peut bâtir en quelques sessions.
