# Warhammer 40K Codex — guide Claude Code

Codex numérique fan Warhammer 40,000. Frontend Angular 19 (custom gothique noir/or), backend NestJS, stockage JSON local. Déployé sur NAS Synology.

## Architecture

| | |
|---|---|
| Backend | NestJS 11 sur port `3001`, préfixe `/api` |
| Frontend | Angular 19 + Material 19 (legacy en retrait) sur port `4201` (nginx) |
| Stockage | JSON dans `data/` + seed `backend/seed/*.json` |
| AI | Anthropic SDK — descriptions narratives unités/séries (claude-sonnet-4-6, max 1024 tokens) |
| Wiki proxy | `/api/wiki-image?q=...` → Warhammer 40k Fandom + cache in-memory |
| Live | SSE `/api/events` (claude-balance-changed, etc.) |

## Modules backend (15)

`factions`, `units`, `series`, `videos`, `artworks`, `subfactions`, `images`, `image-import`, `image-meta`, `wiki-image`, `channels`, `lore-feed`, `claude-usage`, `events`, `health`.

Endpoints clés :
- `GET /api/factions/:id`, `GET /api/units?factionId=X`, `GET /api/units/:id`
- `POST /api/units/:id/description` — génère une description Claude
- `GET /api/wiki-image?q=NAME` — proxy images Wiki avec cache
- `GET /api/images?category=X` — galerie utilisateur (1468 images perso)
- `POST /api/image-import` — import depuis Reddit/URL externe
- `@Sse() /api/events` — flux SSE temps réel

## Frontend features (10 pages)

`dashboard` (/), `factions` (/factions), `faction-detail` (/factions/:id), `unit-detail` (/units/:id), `subfaction-detail` (/subfactions/:id), `series` (/romans), `videos` (/videos), `gallery` (/gallery), `about` (/about). Redirect `/galerie` → `/gallery`.

## Workflow dev

Builds via Docker compose sur NAS (sources sync via `scp -O`) :

```bash
ssh nas "cd /volume2/docker/developpeur/warhammer40k && docker compose up -d --build warhammer-frontend"
```

## Variables d'env requises (`backend/.env`)

```
ANTHROPIC_API_KEY=sk-ant-...
CORS_ORIGIN=http://localhost:4201
PORT=3001
```

`IMAGES_DIR` et `SHARED_DATA_DIR` sont définis dans `docker-compose.yml`.

## Conventions code

- **Pure custom gothique** — Material 19 retiré progressivement des nouvelles pages, tokens CSS dans `frontend/src/styles.scss` (`--gold #c9a24a`, `--red #7b1113`, `--bg #050403`, polices Cinzel + Inter).
- Standalone components (zéro NgModule), Signals + RxJS interop.
- Routes flat : `/units/:id` (pas `/factions/:fid/units/:uid`, redirect en place).
- Sidebar 320px sticky sur les pages list/detail.
- Cards image-first toujours (jamais fond plat).

## Identité visuelle (anti-patterns)

❌ pas de fond blanc ❌ pas de Material `mat-select` pour filtres (tout custom) ❌ pas de stats bar `11/247/...` ailleurs que dashboard ❌ pas de single-screen forcé sur pages détail (elles scrollent) ❌ pas de hiérarchie Faction→SubFaction visible en v1 (flat avant tout).

## Pièges connus

- **Seed JSON manquants au premier lancement** → `ENOENT` crash-loop. Toujours copier les `backend/seed/*.json` vers `data/warhammer/` au premier démarrage.
- **Budget CSS Angular** : `anyComponentStyle` relevé à 12kB warning / 20kB error dans `angular.json` (cards AAA premium).
- **`isolatedModules` TS** : `import type` obligatoire pour types utilisés dans décorateurs (`@Body() body: MonType` → `import type { MonType }`).

## Données seed

`backend/seed/` : `factions.json`, `units.json`, `series.json`, `videos.json`, `subfactions.json` (**182 entrées** dont **71 successors Space Marines** lore-ifiés via Lexicanum scraping 2026-05-06), `channels.json` (8 chaînes YouTube), `artworks.json`, `lore-feed.json`. Voir `WARHAMMER_PROGRESS.md` et `WARHAMMER_ROADMAP.md` pour l'état des phases UX et le plan d'enrichissement futur.

**Mise à jour contenu en prod** : `LoreFeedService` lit `data/*.json` (bind-mount NAS), pas le seed. Pour patcher factions/primarchs/etc. en prod : `scp` le JSON vers `/volume2/docker/developpeur/data/warhammer/` puis `docker compose restart warhammer-backend` (pas besoin de rebuild image).

## Préférence éditoriale : LORE > règles

Sylvain est fan du **lore narratif** (Primarques, Saints, Phaerons, scènes épiques), pas du jeu de plateau et de ses statlines. Cette préférence vaut pour toute l'app.

- **Équipement** : icônes texte (⚔ ✦ ◈ ✸), PAS d'images d'armes via `wikiQuery`. Exception unique = relique cosmique iconique (Anaris).
- **Galerie sidebar** : queries de personnages/scènes/factions, pas de poses produit ou fiches techniques. ✅ "Kharn the Betrayer" / "Khorne champion" — ❌ "Gorechild axe" / "Combat-knife".
- **Lore image inline** : query orientée scène épique > armure générique.
- **Lore feed/chronicles STATIQUES** : `data/warhammer/lore-feed.json` avec ~10 entrées hardcodées. Ne JAMAIS appeler Claude pour des phrases d'ambiance — Sylvain l'a explicitement dit, ça mange des crédits pour rien.

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

Avant d'ajouter manuellement une image à la galerie, vérifier `image-meta.json` (`/volume2/docker/developpeur/data/warhammer/image-meta.json`) — c'est le store des catégorisations user (1468 fichiers user + imports). Endpoints :

- `GET /api/image-meta` → map filename → `{categories, title, artist, faction}`
- `POST /api/image-meta` → upsert
- `GET /api/image-meta/categories` → catégories custom

Modal "Importer une image" (frontend) supporte 3 modes : Wiki Fandom, Reddit r/Warhammer40k (`/api/image-import/reddit`), URL directe. Imports stockés dans `data/warhammer/imported/{sha1prefix}.{ext}`.

## Sources de lore textuel (par ordre de préférence)

1. **Omnis Bibliotheca** (https://omnis-bibliotheca.com) — wiki MediaWiki **français**, scrapable, pas besoin de traduire. Préféré pour les fiches FR.
2. **Lexicanum** (https://wh40k.lexicanum.com) — wiki MediaWiki anglais exhaustif. Pas de Cloudflare. Couvre les personnages secondaires que Fandom rate (Makari, Colm Corbec). Voir `lexicanum_scraping_recipe.md` (mémoire user).
3. **Fluff Bible PDF** — `/volume2/docker/developpeur/warhammer40k/fluff/1400214179388.pdf` (822 KB, ~80 pages canoniques). Lecture via `pdftotext "$f" -` (binaire dispo sur le NAS).
4. **2d4chan wiki** (https://2d4chan.org) — détails colorés et anecdotes.
5. **Wiki Fandom** — bloqué Cloudflare côté serveur pour le texte. Utilisable côté images via notre proxy `/api/wiki-image`. Référence visuelle UX uniquement.

## État verrouillé (ne pas relancer proactivement)

- **Galaxy map** : 65 markers calibrés + 5 Segmenta polygons Bézier livrés 2026-05-08. Chantier clos.
- **Sectors** : NON-go, abandonnés. Ne pas reproposer.
- **20/20 Primarques** avec `loreLong` complet, page détail refondue.

## Specs et mockups (où chercher)

- **Specs textuelles** : `/volume2/docker/developpeur/UX/warhammer - *.md` / `.txt`
- **Mockups PNG haute résolution** : `/volume2/docker/developpeur/UX/warhammer *.png` (souvent > 2000×2000 → resize avec `convert <src> -resize 1400x1400\> /tmp/...png` avant Read)
- **HTML interactifs** (référence CSS la plus précise) : `warhammer - Video.html`, `warhammer - maquette_*.html`
- **Tracker cross-session** : `WARHAMMER_PROGRESS.md` — état canonique, phases, décisions UX figées. **Toujours lire en début de session UX warhammer.**

## Stack précise

- Angular 19, Material 19 (legacy), RxJS 7, Signals, SCSS, Cinzel + Inter
- NestJS 11, Anthropic SDK 0.91
- Docker multi-stage (`node:20-alpine` → `nginx:alpine`)
