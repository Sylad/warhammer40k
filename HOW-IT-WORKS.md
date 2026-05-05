# Comment c'est codé — qui fait quoi

Ce projet est un cas d'école de **pair-programming humain + IA**. Pour les visiteurs qui débarquent sur le repo et se demandent ce que Claude a vraiment fait, voici la réponse honnête.

## Trois acteurs

| Acteur | Rôle |
|---|---|
| **Sylvain** (humain) | Direction artistique, prompts, vision produit, validation, curation des sources lore |
| **[Claude Code](https://claude.com/claude-code)** (Anthropic) | Implémentation du code, refactor, debug, tests, docs internes, reformulation lore |
| **[ChatGPT](https://chat.openai.com)** (OpenAI) | Mockups UX initiaux, schémas de pages, propositions visuelles (dossier `/UX/` non commité dans ce repo) |

## Répartition des tâches

| Tâche | Acteur principal | Détails |
|---|---|---|
| Choix produit, UX, ton | Humain | « Codex immersif lore-first, gothique noir/or, image-first » |
| Code Angular (frontend) | Claude Code | Composants standalone, signals, routes, theming SCSS |
| Code NestJS (backend) | Claude Code | Modules, controllers, services, guards, validation Zod |
| Infra Docker + scripts | Claude Code | Multi-stage builds, pipeline `tar | ssh nas docker build` |
| Seed lore (factions, primarques, etc.) | Humain + Claude Code | Humain trouve les sources, Claude structure et reformule |
| Datasheets unités (133 JPEGs) | Humain | Cure manuelle depuis les PDFs Games Workshop officiels |
| Images galerie (1500+) | Humain (via UI) | Import dynamique depuis Wikipedia/Reddit/URL au runtime |
| Mockups UX premières versions | ChatGPT | Esquisses graphiques, palette gothique, hiérarchie |

## Claude à runtime — où l'API Anthropic est appelée

Une seule famille d'usage : **enrichissement narratif optionnel** des unités et séries.

| Endpoint | Modèle | Utilité |
|---|---|---|
| `POST /api/units/:id/description` | `claude-sonnet-4-6` | Génère ou régénère le récit narratif d'une unité |
| `POST /api/series/:id/description` | `claude-sonnet-4-6` | Idem pour une série Black Library |

Tout le reste (browsing, filtres, recherche, lightbox, import images, vidéos, lore concepts, primarques, dieux Chaos…) est **100% déterministe** — aucun appel Claude au runtime.

Les descriptions sont **mises en cache** dans `data/units.json` et `data/series.json` après génération : une description n'est calculée qu'une seule fois, puis ressert pour tous les visiteurs.

**Coût estimé** : ~0,005-0,01 € par description (Sonnet 4.6, ~1k tokens input + 500-1000 tokens output, prompt court). Le solde Anthropic restant est tracké côté backend via le module `claude-usage` et affiché en haut à droite du codex (badge "CLAUDE — N €").

**Distinction d'erreurs** : le backend distingue 3 modes d'échec côté API Anthropic (cf `backend/src/modules/units/claude.service.ts`) :
- `401 CLAUDE_AUTH_FAILED` — clé révoquée ou invalide
- `429 CLAUDE_RATE_LIMITED` — quota par minute dépassé
- `402 CLAUDE_QUOTA_EXCEEDED` — solde Anthropic épuisé

Le frontend affiche un message adapté à chaque cas (voir le bandeau d'erreur sur `/factions/:id`).

## Claude à build-time — pair-programming sur le code

C'est ici que Claude a le plus contribué. **100% des fichiers `.ts`, `.scss`, `.json` (config), `Dockerfile`, scripts shell ont été écrits ou édités par Claude Code, sous direction humaine.**

Workflow type :

1. Je décris en français ce que je veux : *« ajoute une page primarques avec des cards image-first, 9 loyalistes / 9 traîtres / 2 expurgés, lightbox au clic »*
2. Claude pose le squelette : composant Angular, route, seed JSON minimal, styles SCSS
3. Je valide visuellement dans le navigateur (`http://nas:4201`), je redirige sur ce qui ne va pas (« le hero est trop petit », « l'image se coupe », « manque le breadcrumb »)
4. Claude itère par diff précis sur les fichiers concernés
5. Quand c'est bon, on commit (avec trailer `Co-Authored-By: Claude` pour la traçabilité)

Le résultat : ~95% des commits du repo ont ce trailer, signe que le code a été co-écrit. Les 5% restants sont des imports manuels (initial commit, gros copier-coller de seed lore préexistant).

## Lore — entre humain et IA

- Le **fond** (faits, dates, généalogies, citations canoniques) est curé par moi depuis des sources fiables :
  - *Fluff Bible* W40K (PDF, sources internes Games Workshop)
  - [Wiki Fandom W40K](https://warhammer40k.fandom.com)
  - [Lexicanum](https://wh40k.lexicanum.com)
  - [2d4chan](https://2d4chan.org/wiki/Warhammer_40,000)
  - [Black Library](https://www.blacklibrary.com)
- La **forme** (reformulation FR concise, structure des fiches, ton "codex impérial") est faite avec Claude Code.
- Cas concret : enrichissement de 43 sous-factions via scraping HTML Lexicanum + reformulation Claude (commit `77243cb`). Recette dans la mémoire interne `lexicanum_scraping_recipe.md`.

## Pourquoi cette transparence

Le projet a deux objectifs :

1. **Bâtir un codex W40K immersif que j'utilise vraiment** — c'est mon usage personnel premier
2. **Démontrer ce que la collab humain + Claude Code permet de bâtir en quelques semaines** — c'est mon usage public secondaire

Cacher la part de Claude irait contre le second objectif. Je préfère afficher clairement où l'IA a contribué pour que les visiteurs puissent évaluer eux-mêmes : « est-ce que je peux bâtir un truc comme ça avec Claude Code et combien de temps ça me prendrait ? »

Réponse : oui, et probablement moins que tu ne crois. Mais le résultat dépendra de ta capacité à diriger la vision et à savoir refuser ce qui ne te plaît pas — Claude est un excellent exécutant, c'est l'humain qui décide ce qui mérite d'exister.

## Et si tu veux faire pareil

Prends un sujet qui t'enflamme, ouvre [Claude Code](https://claude.com/claude-code), décris en langage naturel ce que tu rêves de voir exister. Itère 5-10 sessions, redirige le ton et l'UX à chaque palier, valide visuellement avant de continuer. Tu seras surpris de ce qu'on peut bâtir.
