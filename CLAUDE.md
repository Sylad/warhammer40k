# Warhammer 40K Codex — guide Claude Code

Codex numérique fan Warhammer 40,000. Frontend Angular 19 (custom gothique noir/or), backend NestJS, stockage JSON local. En production sur le k3s de dark-blue (namespace `preprod`, chart `developpeur-gitops/charts/warhammer40k`), public via le tunnel Cloudflare sur https://warhammer.sladoire.dev.

## Architecture

| | |
|---|---|
| Backend | NestJS 11 sur port `3001`, préfixe `/api` |
| Frontend | Angular 19 + Material 19 (legacy en retrait) sur port `4201` (nginx) |
| Stockage | JSON dans `data/` + seed `backend/seed/*.json` |
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

## Frontend features (11 pages)

`dashboard` (/), `factions` (/factions), `faction-detail` (/factions/:id), `unit-detail` (/units/:id), `subfaction-detail` (/subfactions/:id), `series` (/romans), `videos` (/videos), `gallery` (/gallery), `nouveautes` (/nouveautes), `plan` (/plan, « Plan de travail »), `about` (/about). Redirect `/galerie` → `/gallery`.

Navigation : barre du haut à partir de 1280 px ; en dessous, bouton **Menu** → tiroir
`#menu-telephone` (inerte quand il est fermé, Échap le ferme, Tab y boucle). Toute nouvelle
page s'ajoute aux DEUX listes de `main-layout.component.ts` (barre et tiroir). Barre complète
(icônes, sous-titre du logo) à partir de 1920 px, compacte en dessous, resserrée entre 1280 et
1439 px (L30) : `topbar.e2e.spec.ts` la mesure de 1280 à 2560 px avec la pastille « 9+ » —
relancer `ng build` puis ce test après tout lien ajouté à la barre.

## Workflow dev

En local sur Big-Blue (premier lancement : `mkdir -p backend/data && cp backend/seed/*.json backend/data/`) :

```bash
npm run dev:backend    # NestJS --watch sur :3001 (données dans backend/data/)
npm run dev:frontend   # ng serve sur :4201
```

Livraison : commit + push sur `main` → la CI (`.github/workflows/build.yml`) construit et pousse
`ghcr.io/sylad/warhammer40k-{backend,frontend}:sha-<7>` → `cadence deliver` (voir `cadence.yaml`)
lance `scripts/deploy.sh` (bump du tag dans `developpeur-gitops/charts/warhammer40k/values.yaml`,
ArgoCD synchronise) puis `scripts/verify-rollout.sh` et les URL de santé.

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

- **Seed JSON manquants au premier lancement** → `ENOENT` crash-loop. Toujours copier les `backend/seed/*.json` vers `backend/data/` au premier lancement local.
- **Budget CSS Angular** : `anyComponentStyle` à 17.5kB warning / 28kB error dans `angular.json` (L29). Seule la galerie dépasse 16 kB (17,03 kB : page + trois modales visionneuse / catégoriser / importer). Avant de relever encore : factoriser (la barre d'ancres des pages détail vit dans `src/styles/_anchor-nav.scss`), le test `src/styles/component-styles.spec.ts` mesure chaque feuille comme `ng build` et garde un instantané des déclarations effectives.
- **`isolatedModules` TS** : `import type` obligatoire pour types utilisés dans décorateurs (`@Body() body: MonType` → `import type { MonType }`).

## Données seed

`backend/seed/` : `factions.json`, `units.json`, `series.json`, `videos.json`, `subfactions.json` (**182 entrées** dont **71 successors Space Marines** lore-ifiés via Lexicanum scraping 2026-05-06), `channels.json` (8 chaînes YouTube), `artworks.json`, `lore-feed.json`. Voir `WARHAMMER_PROGRESS.md` et `WARHAMMER_ROADMAP.md` pour l'état des phases UX et le plan d'enrichissement futur.

**Mise à jour contenu en prod** : `LoreFeedService` lit `data/*.json` (PVC `warhammer-backend-data` monté sur `/app/data`), pas le seed. Pour patcher factions/primarchs/etc. en prod (contexte kubectl `dark-blue` = la prod) : `kubectl -n preprod cp <fichier>.json <pod warhammer-backend>:/app/data/` puis `kubectl -n preprod rollout restart deploy/warhammer-backend` (pas besoin de rebuild image).

## Préférence éditoriale : LORE > règles

Sylvain est fan du **lore narratif** (Primarques, Saints, Phaerons, scènes épiques), pas du jeu de plateau et de ses statlines. Cette préférence vaut pour toute l'app.

- **Équipement** : icônes texte (⚔ ✦ ◈ ✸), PAS d'images d'armes via `wikiQuery`. Exception unique = relique cosmique iconique (Anaris).
- **Galerie sidebar** : queries de personnages/scènes/factions, pas de poses produit ou fiches techniques. ✅ "Kharn the Betrayer" / "Khorne champion" — ❌ "Gorechild axe" / "Combat-knife".
- **Lore image inline** : query orientée scène épique > armure générique.
- **Lore feed/chronicles STATIQUES** : `data/lore-feed.json` avec ~10 entrées hardcodées. Ne JAMAIS appeler Claude pour des phrases d'ambiance — Sylvain l'a explicitement dit, ça mange des crédits pour rien.

## Imagerie unit-detail : datasheet locale prioritaire

Pattern HEAD-check + fallback wiki sur `unit-detail` et `faction-detail` :

```ts
const datasheetUrl = `/api/images/datasheets/${u.id}`;
fetch(datasheetUrl, { method: 'HEAD' }).then(head => {
  if (head.ok) this.heroImage.set(datasheetUrl);
  else this.service.getWikiImage(u.wikiQuery ?? u.nom).subscribe(...);
});
```

Datasheets (`backend/public/datasheets/<unit-id>.jpg`, 119/133 unités) servies via `GET /api/images/datasheets/:unitId`. **Pour ajouter une datasheet** : déposer le JPEG + rebuild image backend. Pas de code à toucher, détection auto.

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
par `cd frontend && npm run plan` (`scripts/plan-data.mjs`) depuis `docs/plan/raf.yaml` et le
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

## Plan, sessions et revue UX (cadence)

Le reste à faire vit dans `docs/plan/raf.yaml`, tenu par `raf`
([cadence](https://github.com/Sylad/cadence)) : chaque commit cite son lot dans le
message (`fix(L4): …`, `L2/t1`), `raf now` dit la suite, `raf check` repère les
écarts. Début et fin de session : skills `/cadence:session-start` et
`/cadence:session-close`.

**Revue UX obligatoire** (règle de Sylvain du 2026-09-28, tous les projets perso) : toute nouvelle
page ou modification d'écran est un lot `--visible`, revu par l'agent `cadence:ux-reviewer` (captures
1440 et 390 px, écarts fondés sur une règle nommée ou une mesure) avant `raf done`. Le verdict
s'enregistre avec `raf ux <lot> "…"`, sinon `raf done` refuse. Les lots « Revue UX — … » planifient
la revue de chaque écran existant ; les écarts trouvés deviennent des sous-tâches du lot.
