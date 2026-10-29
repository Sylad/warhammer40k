# Warhammer 40K Codex — guide Claude Code

Codex numérique fan Warhammer 40,000. Frontend Angular 19 (custom gothique noir/or), backend NestJS, stockage JSON local. En production sur le k3s de dark-blue (namespace `preprod`, chart `developpeur-gitops/charts/warhammer40k`), public via le tunnel Cloudflare sur https://warhammer.sladoire.dev.

## Architecture

| | |
|---|---|
| Backend | NestJS 11 sur port `3001`, préfixe `/api` |
| Frontend | Angular 19 + Material 19 (legacy en retrait) sur port `4201` (nginx) |
| Stockage | contenu éditorial : `backend/seed/*.json` (dans l'image) · données utilisateur : `data/` (volume) |
| AI | Anthropic SDK — descriptions narratives unités/séries (claude-sonnet-4-6, max 1024 tokens) |
| Wiki proxy | `/api/wiki-image?q=...` → Warhammer 40k Fandom + cache in-memory |

## Modules backend

`factions`, `units`, `series`, `videos`, `artworks`, `subfactions`, `images`, `image-import`, `image-meta`, `wiki-image`, `channels`, `lore-feed`, `timeline`, `demo`, `health`.

Le flux SSE `/api/events` (module `events`, `SseService` côté frontend, bloc nginx dédié et exemption dans `PinGuard`) a été **supprimé** le 2026-09-29 (L24) : il n'avait plus ni émetteur ni consommateur.

Le suivi d'usage / solde Claude (`claude-usage`, `/api/claude/usage`, `/api/claude/balance`, `claude-shared.json`) a été **supprimé** le 2026-09-28 (L22, décision de Sylvain) ; la génération de descriptions par Claude reste.

Endpoints clés :
- `GET /api/factions/:id`, `GET /api/units?factionId=X`, `GET /api/units/:id`
- `POST /api/units/:id/description` — génère une description Claude
- `GET /api/wiki-image?q=NAME` — proxy images Wiki avec cache
- `GET /api/images?category=X` — galerie utilisateur (1468 images perso)
- `POST /api/image-import` — import depuis Reddit/URL externe

## Frontend features (12 pages)

`dashboard` (/), `factions` (/factions), `faction-detail` (/factions/:id), `unit-detail` (/units/:id), `subfaction-detail` (/subfactions/:id), `series` (/romans), `videos` (/videos), `jeux-video` (/jeux-video), `gallery` (/gallery), `nouveautes` (/nouveautes), `plan` (/plan, « Plan de travail »), `about` (/about). Redirect `/galerie` → `/gallery`.

Titre de page (L36, `core/services/page-title.service.ts`) : « <page> — Warhammer 40 000 ». Page
fixe : libellé du fil d'Ariane (`STATIC_LABELS`) ; fiche : `title:` de sa route (« Faction »…) en
attendant, puis le nom de l'entité via l'opérateur `namedPage` (« … introuvable » sur erreur), repris
par le dernier élément du fil d'Ariane et annoncé dans la région live de la mise en page (sauf
quand le focus va au h1). Une nouvelle fiche : `title:` sur la route + `namedPage` sur son flux.

Navigation (L23, L30 option b) — seuils en **em** (suivent la taille de police par défaut du
navigateur) : sous `84em` (1344 px à 16 px), bouton **Menu** → tiroir `#menu-telephone` (inerte
quand il est fermé, Échap le ferme, Tab y boucle), liens à plat ; dès `84em`, barre compacte :
Accueil · Factions · Romans · Vidéos · Jeux vidéo · Galerie · Lore ▾ · **« À propos ▾ »**, bouton à divulgation
(`layout/about-menu/`, pas un `role=menu`) qui montre Nouveautés (pastille), Plan de travail et
À propos du codex ; dès `106.25em` (1700 px), barre complète (icônes, sous-titre du logo). Le pied
de page porte « Nouveautés · Plan de travail · À propos » sur chaque page. Une nouvelle page
s'ajoute au tiroir ET à la barre (ou au panneau « À propos ▾ ») de `main-layout.component.ts`.
Le premier élément focalisable est le lien « Aller au contenu » (L21, `.skip-link` → `<main id="contenu">`) ; les liens de navigation portent `[ariaCurrentWhenActive]="true"` (une nouvelle entrée de la barre, du tiroir ou du panneau « À propos ▾ » aussi).
`topbar.e2e.spec.ts` mesure chaque seuil ±1 px avec la pastille « 9+ » dans quatre configurations
(polices web, polices bloquées, police par défaut 18 et 20 px) : relancer `ng build` puis ce test
après tout changement de la barre.

## Workflow dev

En local sur Big-Blue (rien à copier : le contenu est lu dans `backend/seed/`, `backend/data/` se crée tout seul) :

```bash
npm run dev:backend    # NestJS --watch sur :3001 (données dans backend/data/)
npm run dev:frontend   # ng serve sur :4201
```

Livraison : commit + push sur `main` → la CI (`.github/workflows/build.yml`) construit et pousse
`ghcr.io/sylad/warhammer40k-{backend,frontend}:sha-<7>` → `cadence deliver` (voir `cadence.yaml`)
lance `scripts/deploy.sh` (bump du tag dans `developpeur-gitops/charts/warhammer40k/values.yaml`,
ArgoCD synchronise) puis `scripts/verify-rollout.sh`, les URL de santé et `scripts/verify-cache.sh`.

**Cache HTTP du frontend (L51)** — `frontend/nginx.conf` : `index.html` (`/`, `/index.html`, repli
des routes) et ce qui est copié tel quel de `public/` (`favicon.svg`, `galaxy-map.jpg`,
`nouveautes-data/`, `plan-data/`) partent en `Cache-Control: no-cache` (revalidés à chaque visite,
304 possible) ; les fichiers à empreinte du build Angular (`main-`, `polyfills-`, `chunk-`,
`styles-XXXXXXXX.*` à la racine, `media/`) en `public, max-age=31536000, immutable`. Une adresse hors
`/api/` qui finit par une extension de script, feuille de style, police, image ou JSON répond 404
`no-store` si le fichier est absent, jamais le repli HTML : ne pas créer de route qui finisse par
une de ces extensions, ni déposer dans `public/` un fichier nommé `x-XXXXXXXX.ext` (8 majuscules ou
chiffres : il serait gardé un an). Tout `add_header` ajouté dans un `location` doit y reposer la
politique de sécurité de contenu (`$wh_csp`). Pas de service worker. Preuve rejouable :
`cd frontend && npm run build`, puis `DOCKER_API_VERSION=1.44 scripts/test-nginx-cache.sh`.

## Variables d'env requises (`backend/.env`)

```
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGIN=http://localhost:4201
PORT=3001
APP_PIN=                     # vide → permissif (lecture+écriture sans auth)
DEMO_FORCED_HOSTS=trycloudflare.com,cfargotunnel.com
DEMO_FORCED=                 # true → toute l'instance en démo verrouillée (off par défaut)
```

`IMAGES_DIR` est défini dans le `values.yaml` du chart (`/app/public` en prod : datasheets embarquées dans l'image) ; en local il vaut par défaut `data/images`.

### PIN guard + mode démo verrouillé (Cloudflare)
- `APP_PIN` (vide → permissif) protège les endpoints write : `POST /units/:id/description`, `POST /series/:id/description`, `POST /image-import/save`, `POST /image-meta`, `POST /videos/import`, `DELETE /videos/:id`. Plus aucune exemption par route (seule la démo forcée ci-dessous contourne le PIN).
- `DEMO_FORCED_HOSTS` (default `trycloudflare.com,cfargotunnel.com`) : si le `Host` est l'un de ces noms ou un de leurs sous-domaines (appariement exact ou suffixe précédé d'un point, port et point final ignorés — jamais en sous-chaîne ; jamais `X-Forwarded-Host`, que le client forge librement — L22, `modules/demo/forced-demo.ts`), le PIN est bypassé MAIS les écritures retournent 403 (`DemoWriteGuard`). Le frontend affiche la bannière "Mode démo verrouillée" via `/api/demo/status` (`DemoStatusService` + `<app-demo-banner>`).
- `DEMO_FORCED=true` : toute l'instance est en démo verrouillée, sans dépendre d'aucun en-tête (même décision partagée par `DemoModeMiddleware` et `PinGuard`).
- La prod est publique via le tunnel Cloudflare (chart `cloudflared` de `developpeur-gitops`). Pour une démo ponctuelle depuis Big-Blue : `cloudflared tunnel --url http://localhost:4201` → URL random `https://*.trycloudflare.com` automatiquement en mode démo verrouillée. Pour forcer un autre domaine en démo : l'ajouter à `DEMO_FORCED_HOSTS` dans le `values.yaml` du chart (prod) ou dans `backend/.env` (local).
- Voir `forced_demo_host_pattern.md` (mémoire user) pour le pattern complet, partagé avec finance-tracker et ol-companion.

## Conventions code

- **Pure custom gothique** — Material 19 retiré progressivement des nouvelles pages, tokens CSS dans `frontend/src/styles.scss` (`--gold #c9a24a`, `--red #7b1113`, `--bg #050403`, polices Cinzel + Inter).
- Standalone components (zéro NgModule), Signals + RxJS interop.
- Routes flat : `/units/:id` (pas `/factions/:fid/units/:uid`, redirect en place).
- Sidebar 320px sticky sur les pages list/detail.
- Cards image-first toujours (jamais fond plat).

## Identité visuelle (anti-patterns)

❌ pas de fond blanc ❌ pas de Material `mat-select` pour filtres (tout custom) ❌ pas de stats bar `11/247/...` ailleurs que dashboard ❌ pas de single-screen forcé sur pages détail (elles scrollent) ❌ pas de hiérarchie Faction→SubFaction visible en v1 (flat avant tout).

## Pièges connus

- **Contenu lu dans `seed/`, pas dans `data/`** (L74) : un fichier copié dans `backend/data/` (ou dans le volume) est ignoré s'il fait partie du contenu. `seed/` doit rester dans l'image (`Dockerfile` : `COPY … /app/seed`, gardé par `common/content.spec.ts`).
- **Budget CSS Angular** : `anyComponentStyle` à 17.5kB warning / 28kB error dans `angular.json` (L29). Seule la galerie dépasse 16 kB (17,03 kB : page + trois modales visionneuse / catégoriser / importer). L49 : les règles du panneau Filtres, du bouton « Filtres » et des états chargement/erreur/vide vivent dans le partiel global `src/styles/_gallery-filtres.scss` (préfixé `.gallery-page`, déclaré dans `component-styles.spec.ts`) pour tenir le budget. Avant de relever encore : factoriser (la barre d'ancres des pages détail vit dans `src/styles/_anchor-nav.scss`), le test `src/styles/component-styles.spec.ts` mesure chaque feuille comme `ng build` et garde un instantané des déclarations effectives.
- **`isolatedModules` TS** : `import type` obligatoire pour types utilisés dans décorateurs (`@Body() body: MonType` → `import type { MonType }`).

## Galerie, édition derrière le PIN (L144)

Comme Vidéos : « + Importer » et « ✦ Catégoriser » n'existent qu'une fois le PIN saisi (`editMode = !!PinService.pin()`), bouton « Mode édition » (`aria-pressed`) en pied de page ; un « Enregistrer » refusé affiche son échec (`catError`, `role=alert`). Un test navigateur qui vise « + Importer » doit poser `sessionStorage['wh40k.pin']` avant `goto`.

## Jeux vidéo (L35)

`/jeux-video` lit `frontend/public/jeux-data/jeux.json` (versionné, `verifieLe` = date de vérification en ligne). `aVenir[].sortie` est affichée telle quelle (jour, mois, trimestre, année) suivie de « annoncée », `null` → « Date non communiquée » : **jamais de date devinée**. Bascule automatique : `repartirJeux` (`jeux-video.component.ts`) fait passer un jeu à venir dont le **jour complet** annoncé est atteint (horloge `JEUX_VIDEO_NOW`, horloge réelle par défaut, figée au 2026-10-12 sous TestBed) en tête de « Déjà sortis » (année seule, résumé d'annonce) ; une date imprécise (mois, trimestre, année) ne bascule jamais. Quand un jeu est sorti, le déplacer de `aVenir` vers `existants` dans `jeux.json` avec son vrai résumé et ses plateformes, à partir de sources en ligne, et changer `verifieLe`.

## Données seed

`backend/seed/` : `factions.json`, `units.json`, `series.json`, `videos.json`, `subfactions.json` (**182 entrées** dont **71 successors Space Marines** lore-ifiés via Lexicanum scraping 2026-05-06), `channels.json` (8 chaînes YouTube), `artworks.json`, `lore-feed.json`. Voir `WARHAMMER_PROGRESS.md` et `WARHAMMER_ROADMAP.md` pour l'état des phases UX et le plan d'enrichissement futur.

**Contenu vs données utilisateur (L74, 2026-10-06)** — `common/content.ts` (`contentPath`, `readContent`, `userDataPath`) :

- **Contenu éditorial** = aucun endpoint ne l'écrit : `factions`, `subfactions`, `units`, `series`, `artworks`, `artwork-collections`, `timeline-events`, `lore-feed`, `emperor`, `primarchs`, `chaos-gods`, `imperial-orgs`, `lore-concepts`, `equipment`, `legendary-ships`, `god-machines`, `living-saints`. Lu dans `backend/seed/` (`/app/seed` dans l'image, `CONTENT_DIR` pour le déplacer). Les fichiers de ce type encore présents dans le volume sont ignorés.
- **Données utilisateur** = tout ce qu'un POST/DELETE écrit, seules à vivre dans `data/` (PVC `warhammer-backend-data`) : `image-meta.json`, `imported/`, et `videos.json` / `channels.json` (`POST /videos/import`, `DELETE /videos/:id`) — pour ces deux-là le seed ne sert que tant que le volume n'a pas son propre fichier : **une correction du seed ne les atteint pas en prod**.

**Mise à jour contenu en prod** : modifier `backend/seed/*.json`, commit + push, livraison normale (CI → image → bump du tag). **Plus de `kubectl cp` ni de redémarrage manuel pour du contenu** : le déploiement suffit, le volume n'est pas touché. Contrôle après livraison : comparer l'API publique (`/api/factions`, `/api/units`, `/api/artworks/…`) au fichier du dépôt.

## Préférence éditoriale : LORE > règles

Sylvain est fan du **lore narratif** (Primarques, Saints, Phaerons, scènes épiques), pas du jeu de plateau et de ses statlines. Cette préférence vaut pour toute l'app.

- **Équipement** : icônes texte (⚔ ✦ ◈ ✸), PAS d'images d'armes via `wikiQuery`. Exception unique = relique cosmique iconique (Anaris).
- **Galerie sidebar** : queries de personnages/scènes/factions, pas de poses produit ou fiches techniques. ✅ "Kharn the Betrayer" / "Khorne champion" — ❌ "Gorechild axe" / "Combat-knife".
- **Lore image inline** : query orientée scène épique > armure générique.
- **Lore feed/chronicles STATIQUES** : `data/lore-feed.json` avec ~10 entrées hardcodées. Ne JAMAIS appeler Claude pour des phrases d'ambiance — Sylvain l'a explicitement dit, ça mange des crédits pour rien.

## Imagerie unit-detail : datasheet locale prioritaire

Pattern HEAD-check + fallback wiki sur `unit-detail` et `faction-detail` (`core/utils/local-unit-image.ts`, `localUnitImage()`) :

```ts
const run = ++this.imageRun;               // garde : une réponse tardive d'une fiche précédente est ignorée
localUnitImage({ datasheet: this.service.datasheetUrl(u.id), portrait: this.service.portraitUrl(u.id) })
  .then(local => {                          // HEAD /api/images/datasheets/:id, puis HEAD /api/images/portraits/:id
    if (run !== this.imageRun) return;
    if (local) this.setHero(local.url, local.kind);   // setHero(url, kind) : image + nature ('fiche' | 'portrait')
    else this.service.getWikiImage(u.wikiQuery ?? u.nom).subscribe(res => {
      if (run === this.imageRun && res.imageUrl) this.setHero(res.imageUrl, 'portrait');
    });
  });
```

Fenêtre d'agrandissement (`unit-datasheet-dialog.component.*`) : l'`<img class="ds-img">` est dans un conteneur défilable `.ds-scroll`. Sa taille se règle **en CSS seul** avec `max-width`/`min-width` (le min l'emporte sur le max) : au-dessus de 760 px `max-*: 100 %` et `min-width/height: var(--ds-min-w/h)` (taille de l'image dans la figure, mesurée à l'ouverture par `openZoom`) ; jusqu'à 760 px `max-width: 898px`, `min-width: max(100%, …)`. Garder `align-items: flex-start` sur le conteneur (sinon l'image s'étire à sa hauteur et s'affiche à 898 px) et ne pas remettre `max-width/max-height: 100 %` partout : c'est ce qui rétrécissait l'image.

Une image qui ne se charge pas (`(error)`) appelle `imageFailed()` : figure, panneau et fenêtre d'agrandissement disparaissent, sans repli sur le wiki.

Images locales d'unités, dans l'image Docker (`backend/public/`, copié en entier par le `Dockerfile`) :

- `datasheets/<unit-id>.jpg` — **119 fiches techniques**, scans 898×596 (profil, armes, aptitudes), servis par `GET|HEAD /api/images/datasheets/:unitId`. Seul un scan va là : la fiche unité les présente « Fiche technique de … » avec le panneau Aperçu. Un test backend (`images/datasheets-l120.spec.ts`) refuse tout fichier hors du rapport [1,4 ; 1,6] ou de moins de 800 px de large.
- `portraits/<unit-id>.jpg` — **14 portraits et insignes locaux** (800×800, 350×260, …), servis par `GET|HEAD /api/images/portraits/:unitId` ; la fiche les présente « Illustration de … » (type `portrait`, pas de panneau Aperçu).

**Pour ajouter une image locale** : un scan 898×596 → `datasheets/`, tout le reste (portrait, insigne, illustration) → `portraits/`, puis rebuild image backend. Pas de code à toucher, détection auto (fiche, sinon portrait local, sinon wiki). Ne jamais déposer un portrait dans `datasheets/`.

**`wikiQuery` toujours en EN** dans les seeds — le scrape MediaWiki en FR (em-dash, accents) renvoie NULL.

## Imagerie galerie : image-meta.json + import workflow

Avant d'ajouter manuellement une image à la galerie, vérifier `image-meta.json` (`data/image-meta.json` : PVC en prod, `backend/data/` en local) — c'est le store des catégorisations user (1468 fichiers user + imports). Endpoints :

- `GET /api/image-meta` → map filename → `{categories, title, artist, faction}`
- `POST /api/image-meta` → upsert
- `GET /api/image-meta/categories` → catégories custom

Modal "Importer une image" (frontend) supporte 3 modes : Wiki Fandom, Reddit r/Warhammer40k (`/api/image-import/reddit`), URL directe. Imports stockés dans `data/imported/{sha1prefix}.{ext}`.

## Sources de lore textuel (par ordre de préférence)

1. **Omnis Bibliotheca** (https://omnis-bibliotheca.com) — wiki MediaWiki **français**, scrapable, pas besoin de traduire. Préféré pour les fiches FR.
2. **Lexicanum** (https://wh40k.lexicanum.com) — wiki MediaWiki anglais exhaustif. Pas de Cloudflare. Couvre les personnages secondaires que Fandom rate (Makari, Colm Corbec). Voir `lexicanum_scraping_recipe.md` (mémoire user).
3. **Fluff Bible PDF** — `fluff/1400214179388.pdf` à la racine du dépôt local (non versionné, 822 KB, ~80 pages canoniques). Lecture via `pdftotext "$f" -`.
4. **2d4chan wiki** (https://2d4chan.org) — détails colorés et anecdotes.
5. **Wiki Fandom** — bloqué Cloudflare côté serveur pour le texte. Utilisable côté images via notre proxy `/api/wiki-image`. Référence visuelle UX uniquement.

## État verrouillé (ne pas relancer proactivement)

- **Galaxy map** : 65 markers calibrés + 5 Segmenta polygons Bézier livrés 2026-05-08. Chantier clos.
- **Sectors** : NON-go, abandonnés. Ne pas reproposer.
- **20/20 Primarques** avec `loreLong` complet, page détail refondue.

## Specs et mockups (où chercher)

- **Specs textuelles** : `~/projects/developpeur/UX/warhammer - *.md` / `.txt`
- **Mockups PNG haute résolution** : `~/projects/developpeur/UX/warhammer *.png` (souvent > 2000×2000 → resize avec `convert <src> -resize 1400x1400\> /tmp/...png` avant Read)
- **HTML interactifs** (référence CSS la plus précise) : `warhammer - Video.html`, `warhammer - maquette_*.html`
- **Tracker cross-session** : `WARHAMMER_PROGRESS.md` — état canonique, phases, décisions UX figées. **Toujours lire en début de session UX warhammer.**

## Stack précise

- Angular 19, Material 19 (legacy), RxJS 7, Signals, SCSS, Cinzel + Inter
- NestJS 11, Anthropic SDK 0.91
- Docker multi-stage (`node:20-alpine` → `nginx:alpine`), images sur GHCR, k3s dark-blue via ArgoCD

## Nouveautés (cadence news, L23)

Chaque lot `--visible` a une entrée dans `docs/nouveautes/` (`cadence news new <lot>`, texte pour
le visiteur, guillemets « … » avec U+202F, au moins une capture ; téléphone à 390 px,
jamais plus de 6:1). Puis `cd frontend && npm run news` régénère `frontend/public/nouveautes-data/`
(JSON + captures + `tailles.json`, sans l'`index.html` de cadence), **versionné** : la CI construit
l'image sans cadence. La page `/nouveautes` lit ce JSON (ordre de cadence : la plus récente en haut) ;
pastille des nouveautés non vues (localStorage `wh40k.news.seen-v1`) et lien permanent
`/nouveautes#<slug>`. `nouveautes-data.spec.ts` échoue si le JSON n'est plus à jour.

Tests de composants : `src/testing/angular-testbed.ts` (TestBed JIT sous Vitest/jsdom, `styleUrl`
résolues à vide, `<dialog>` simulé). Les requêtes-signaux `viewChild()` n'y marchent pas (transformation
AOT absente) : `@ViewChild` dans les composants testés ainsi.

## Plan de travail (L30)

La page `/plan` montre ce qui est en cours, prévu et livré ces 30 derniers jours, depuis
`frontend/public/plan-data/plan.json`, **versionné** (le build Docker n'a pas `docs/`) et généré
par `cd frontend && npm run plan` (`scripts/plan-data.mjs`) depuis `.cadence/raf.yaml` et le
journal compilé `public/nouveautes-data/nouveautes.json` (même entrée que le lien « Voir la
nouveauté » : `npm run news` AVANT `npm run plan`). **Après toute commande `raf` qui touche un lot `visible`** (start, done, drop,
add, sous-tâche…) ou toute nouvelle entrée Nouveautés : `npm run plan`, puis commiter `plan.json`
dans le même commit. Sinon `scripts/plan-data.test.mjs` et le workflow « Contrôles frontend »
(`.github/workflows/frontend-checks.yml`, à chaque push, séparé de `build.yml` que lit `deploy.sh`)
passent au rouge — et `cadence deliver` attend tous les runs du sha.

Liste d'autorisation : id, titre public, état, dates, avancement `{ done, total }` (sous-tâches
abandonnées exclues) — jamais les notes, verdicts UX, raisons, titres bruts ni titres de
sous-tâches. Titre public = champ `public:` du lot (texte pour le visiteur, ≤ 80 caractères,
ni chemin, ni fichier, ni identifiant de lot, ni vocabulaire de sécurité ; vérifié à la
génération), sinon titre de sa Nouveauté, sinon le lot est masqué (`node scripts/plan-data.mjs
--hidden` les liste). Les revues UX exigent un `public:`. `npm run build` se termine par
`plan-data.mjs --leaks dist/frontend/browser` (code 1 si un texte privé du plan est dans
l'application construite ; sauté dans le build Docker, sans `docs/`).

## Liens du site (L39)

Audit outillé de TOUS les liens (rapport du 2026-10-02 : `docs/liens/audit-2026-10-02.md`), dans
`frontend/scripts/` autour de `liens-lib.mjs` :

- `npm run liens` (statique, sans réseau) : inventaire (gabarits, code, données d'amorçage, carte
  galactique) et vérification des liens internes — route servie par `app.routes.ts` (sinon le
  `**` renvoie en silence vers /factions), identifiant présent dans `backend/seed`, ancre posée par
  la page cible, **pas d'ancre nue** `href="#x"`, avec ou sans `(click)` (avec `<base href="/">` elle mène à
  l'accueil au clic du milieu, au Ctrl+clic et à « copier l'adresse » : utiliser l'attribut `sectionAnchor`
  de `shared/section-anchor.directive.ts` pour une section de la page courante — l'audit le vérifie sur
  la page même —, ou `[routerLink]="[]" [fragment]`), fichier présent (casse comprise), fiche
  technique de chaque unité. Code 1 s'il y a un lien cassé.
- **Garde en CI** : `scripts/liens.test.mjs` (Vitest, donc `npm test` et « Contrôles frontend »).
  Ce qu'elle vérifie, sans réseau : chaque lien interne écrit dans le code (gabarits, `route:`,
  `routerLink: [...]`, `router.navigate([...])`, identifiants littéraux compris), les liens du HTML
  des Nouveautés (`nouveautes.json` construit), les zones de la carte (chemins lus dans
  `linkToPath`), les fiches techniques. **Tout lien construit sur un segment calculé** (`['/units',
  h.unitId]`, `` `/lore/x/${id}` ``) doit être déclaré : dans `DATA_LINKS` (`templates` : le
  champ de données qu'il lit, dont chaque valeur est vérifiée contre la collection cible), dans
  `SELF_LINKS` (identifiant d'une fiche de la collection même) ou, si la route entière est une
  variable, dans `COVERED` avec ce qui la vérifie ; sinon, ou si la déclaration vise une autre route
  ou ne correspond plus à aucun lien, le test échoue. Les identifiants sont vérifiés contre
  `backend/seed`, pas contre le volume de prod. Le fil d'Ariane ne lie que les préfixes qui sont des
  pages (`breadcrumb.utils.ts`, testé à part). **Pas vérifié en CI** : les liens externes (à la
  demande seulement, ci-dessous) et les images du wiki.
- `npm run liens:crawl` (backend :3001 + `npm run dev:frontend` :4201 lancés) : parcours de
  l'application en marche depuis `/` et toutes les adresses de l'inventaire — redirections `**`,
  API en erreur, pages restées en chargement, images en échec (y compris une « image » servie en
  HTML par le repli), erreurs console, ancres ; mesure de densité par gabarit (1440×900, 390×844).
  Aucune requête externe (coupées), `/api/wiki-image` bouchonné.
- `npm run liens:externes [-- --wiki http://localhost:3001]` : **à la demande seulement, jamais
  en CI** — 2 requêtes simultanées, 1,5 s par hôte, une reprise ; pages Fandom via l'API MediaWiki,
  vidéos YouTube via oEmbed ; 403/429 de Cloudflare = « invérifiable », pas « mort ».

Les corrections de **contenu** (`backend/seed/*.json`) atteignent la prod avec l'image (L74, voir
« Mise à jour contenu en prod ») ; les pages tolèrent quand même les identifiants absents. Seuls
`videos.json` et `channels.json`, données utilisateur, restent sur le volume.

## Étape spec et acceptation (L106)

`cadence.yaml` : `orchestrate.spec: { dir: docs/specs }` et `orchestrate.accept` (lanceur `frontend/vitest.acceptation.config.ts`, fichiers donnés par `CADENCE_ACCEPTATION`). `frontend/vitest.config.ts` (suite et CI) exclut les fichiers des `docs/specs/*/acceptation-<lot>.json` à `vert: false` via `frontend/scripts/acceptation-runner.mjs` (testé : `acceptation-runner.test.mjs`). Nommer les tests d'acceptation `*.acceptation.spec.ts` sous `frontend/src/`.

**Porte de la vague (L203)** : `orchestrate.test` = suite backend (`npm test`) puis suite frontend
(`npx vitest run --exclude '**/*.e2e.spec.ts'` : les e2e Chromium sur `dist` tournent par `npm run test:e2e`
et en CI, l'un d'eux a expiré sous la charge de la suite complète) ; `orchestrate.build` = `nest build` puis
`npm run build` du frontend. Les acceptations rouges restent hors de la porte (exclues par `vitest.config.ts`,
lancées seules par `accept:`). `orchestrate.precheck: true` (Sonnet), plus `local` (cadence L328). Toute
commande déclarée se vérifie verte sur main avant d'être écrite.
Une acceptation qui importe `playwright-core` (navigateur réel, `dist` requis) tourne par `npm run test:e2e` (`vitest.e2e.config.ts`, 30 s par cas, après `npm run build`, Chromium installé) : `vitest.config.ts` l'exclut quel que soit `vert`.

## Plan, sessions et revue UX (cadence)

Le reste à faire vit dans `.cadence/raf.yaml`, tenu par `raf`
([cadence](https://github.com/Sylad/cadence)) : chaque commit cite son lot dans le
message (`fix(L4): …`, `L2/t1`), `raf now` dit la suite, `raf check` repère les
écarts. Début et fin de session : skills `/cadence:session-start` et
`/cadence:session-close`.

**Revue UX obligatoire** (règle de Sylvain du 2026-09-28, tous les projets perso) : toute nouvelle
page ou modification d'écran est un lot `--visible`, revu par l'agent `cadence:ux-reviewer` (captures
1440 et 390 px, écarts fondés sur une règle nommée ou une mesure) avant `raf done`. Le verdict
s'enregistre avec `raf ux <lot> "…"`, sinon `raf done` refuse. Les lots « Revue UX — … » planifient
la revue de chaque écran existant ; les écarts trouvés deviennent des sous-tâches du lot.
