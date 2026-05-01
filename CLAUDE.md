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

`backend/seed/` : `factions.json`, `units.json`, `series.json`, `videos.json`, `subfactions.json` (63 entrées), `channels.json` (8 chaînes YouTube), `artworks.json`, `lore-feed.json`. Voir `WARHAMMER_PROGRESS.md` et `WARHAMMER_ROADMAP.md` pour l'état des phases UX et le plan d'enrichissement futur.

## Stack précise

- Angular 19, Material 19 (legacy), RxJS 7, Signals, SCSS, Cinzel + Inter
- NestJS 11, Anthropic SDK 0.39
- Docker multi-stage (`node:20-alpine` → `nginx:alpine`)
