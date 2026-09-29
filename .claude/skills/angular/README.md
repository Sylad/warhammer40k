# Angular (adapté à Angular 19)

Guide Angular pour le frontend de warhammer40k, dérivé du skill tiers « Angular Expert »
(Antigravity Awesome Skills, v1.0.0, février 2026) qui visait Angular **v20+**.

## Adaptation (2026-09-29)

Le projet est en **Angular 19.2** avec **zone.js** et **sans SSR** (versions exactes dans
`SKILL.md`, relevées dans `frontend/package.json` et `node_modules`). Tout ce qui n'existe ou
n'est stable qu'à partir de la v20 est retiré ou marqué « v20+ — non applicable ici » :

- **Zoneless** (`provideZonelessChangeDetection` absent en 19 ; l'API expérimentale 19 n'est pas à activer) ;
- **SSR / hydratation**, dont l'hydratation incrémentale (expérimentale en 19, et pas de SSR ici) ;
- **Signal Forms** (inexistant en 19).

Les statuts de stabilité des API (stable / developer preview / expérimental) ont été lus dans
les fichiers `.d.ts` d'Angular 19.2.21 installés. Pas de montée de version d'Angular.

## Contenu

`SKILL.md` : conventions du projet et stabilité des API en 19, puis signaux, composants
standalone, routage, DI, composition, état, formulaires, performance (`OnPush`, `@defer`,
`NgOptimizedImage`) et tests.

## Références

- [Angular v19 documentation](https://v19.angular.dev) — référence pour ce projet
- [Angular Documentation](https://angular.dev) — dernière version (peut décrire du v20+)
- [Angular Signals](https://v19.angular.dev/guide/signals)
