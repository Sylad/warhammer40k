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

- **15 pages** : Dashboard, Factions, Faction Detail, SubFaction Detail, Unit Detail, Romans, Vidéos, Galerie, Lore Hub, Empereur, Primarques, Panthéon Chaos, Civils Impériaux, Concepts (Trône d'Or, Astronomican, Œil de la Terreur, Cadia, Baal, etc.), Carte galactique, **Armement & Reliques**, À propos
- **Hiérarchie faction → sous-faction → unité** : 17 factions principales, 113 sous-factions (Ultramarines, Iron Hands, World Eaters, Krieg, Drukhari Kabales, Necron Dynasties, Tyranid Hive Fleets, etc.) — chacune avec ses notableUnits enrichies (52 personnages Hérésie d'Horus loyalistes/traîtres, +70 figures xenos)
- **Galerie 1500+ images** avec multi-catégorisation user (chips), import depuis Wikipedia Fandom / Reddit r/Warhammer40k / URL directe, catégories dynamiques (built-in + factions + customs) — **la recherche filtre aussi les cards de catégorie**
- **Datasheets locales** : **133/133 unités** ont un visuel curé bundlé dans l'image Docker (HEAD-check + fallback wiki proxy)
- **Lightbox plein écran** sur les figures notables (Civils, Primarques, Panthéon Chaos) avec mini-galerie multi-thumbs + lien vers /gallery filtré
- **Wiki-image proxy** (Wikipedia Fandom EN) pour fetch les illustrations à la volée + cache in-memory + Lexicanum en fallback dédié
- **Black Library** — 38 séries de romans (incluant Drukhari, Grey Knights, Genestealer Cults) avec progression de lecture, badges et tags
- **Vidéos lore** — chaînes YT (officielles + créateurs) catégorisées
- **Lore narratif** : 6 sections Empereur, 20 fiches Primarques, 4 dieux Chaos, **13 organisations civiles** (incluant Imperial Navy avec classes de vaisseaux, Collegia Titanica avec classes de Titans, Conseil du Sigillite — Malcador & Valdor), 15 concepts (Trône d'Or, Astronomican, Webway, Cicatrix, etc.), carte galactique SVG calibrée
- **Codex de l'arsenal** (`/lore/equipment`) : 69 pièces (26 armes ranged, 16 mêlée, 15 armures, 12 reliques nommées dont Drach'nyen, Black Sword Sigismund, Mjalnar)
- **Brèves du 41ᵉ millénaire** : ticker dashboard de 40 entrées atmosphériques (Croisade Indomitus, Cicatrix, Chute de Cadia, Plague Wars, etc.)
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
| Déploiement | docker-compose (testé Synology NAS DSM) |

## Setup local

### Prérequis
- Docker 24+
- Une [clé API Anthropic](https://console.anthropic.com/settings/keys)

### Lancement
```bash
git clone <ce-repo> warhammer40k
cd warhammer40k

cp backend/.env.example backend/.env
# Édite ANTHROPIC_API_KEY

# Bootstrap des données seed (premier lancement uniquement)
mkdir -p data/imported
cp backend/seed/*.json data/

docker compose up -d --build
```

Frontend disponible sur `http://localhost:4201`.

## Données seed

`backend/seed/` contient les fichiers JSON commités comme état initial :
- `factions.json` (17 factions principales)
- `subfactions.json` (113 sous-factions enrichies, 200+ notableUnits avec personnages Hérésie d'Horus)
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

`backend/public/datasheets/` contient **133 JPEGs d'unités** (curés à la main, bundlés dans l'image Docker), servis via `/api/images/datasheets/:unitId`.

Au premier lancement, copie ces fichiers dans `data/` (cf instructions ci-dessus). Ensuite `data/` n'est plus rejoué — tes catégorisations et imports persistent.

## Roadmap

Voir [WARHAMMER_ROADMAP.md](./WARHAMMER_ROADMAP.md) pour le plan d'enrichissement (Custodes, Drukhari, Grey Knights, Empereur, primarques, Chaos pantheon, lore concepts, galaxy map, civils impériaux).

## Notes légales

Warhammer 40000, ses factions, personnages et art sont la propriété de **Games Workshop**. Ce projet est un fan-codex personnel, non-commercial, à usage privé. Les images proxifiées proviennent de Wikipedia Fandom (CC BY-SA) et de sources publiques. Aucune redistribution.

## Crédits IA

- **[Claude Code](https://claude.com/claude-code)** (Anthropic) — code frontend, backend, infra Docker
- **[ChatGPT](https://chat.openai.com)** (OpenAI) — premières maquettes UX, schémas de pages, propositions visuelles

Sources lore : [Warhammer 40k Wiki](https://warhammer40k.fandom.com), [Lexicanum](https://wh40k.lexicanum.com), [2d4chan](https://2d4chan.org/wiki/Warhammer_40,000), [Black Library](https://www.blacklibrary.com/), PDF *WH40K Fluff Bible*.
UX : codex 2D-print + cards image-first à la Diablo III / Destiny grimoire.
Principes UX : [refactoringui.com](https://refactoringui.com/), [lawsofux.com](https://lawsofux.com/).

## Licence

MIT pour le code. Les contenus W40K appartiennent à Games Workshop.

---

**Si tu veux faire pareil** — prends un sujet qui t'enflamme, ouvre Claude Code, décris en langage naturel ce que tu rêves de voir exister, puis itère. Tu seras surpris de ce qu'on peut bâtir en quelques sessions.
