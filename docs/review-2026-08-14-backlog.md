# Review 2026-08-14 — findings reportés (non corrigés dans cette passe)

Revue 8 angles backend + frontend. ~36 candidats, 16 corrigés (commit associé).
Reste ci-dessous, par valeur décroissante.

## Correctness / sécu
1. **Guards write en opt-in par handler** — pas d'APP_GUARD global : le prochain
   @Post ajouté sans `@UseGuards` est ouvert (et writable sur le host démo).
   Fix : PinGuard+DemoWriteGuard globaux + décorateur @Public pour les reads.
   (+ dead code : l'escape `/api/events` dans PinGuard n'est jamais atteint.)
2. **claude-shared.json : lost updates cross-process** — 3 apps NAS en
   read-modify-write sans verrou (même finding que finance). Lockfile ou accepter.
3. **Réponses wiki tardives cross-navigation** — les subscriptions getWikiImage
   des pages détail n'annulent pas au changement de route : hero Space Marines
   sur la page Orks. Fix : capturer l'id au lancement et vérifier au callback
   (ou switchMap). Concerne faction/unit/primarch/ship/titan/saint-detail.
4. **Breadcrumb : liens vers routes inexistantes** — `/units`, `/subfactions`
   n'existent pas → wildcard → /factions. Rendre ces segments non cliquables.
5. **lore-timeline activeEra** — le chip cliqué ne s'allume jamais (effect re-pin
   sur le premier era).
6. **image-import : écriture non atomique** — writeFileSync direct (seul du repo) ;
   demi-image servie après un kill. Fix : tmp+rename comme atomicWriteJsonSync.
7. **SSRF résiduel** — le garde bloque les IP littérales privées mais pas un nom
   DNS pointant vers le LAN (rebinding). Acceptable en perso ; noter.

## Perf
8. **~55 call sites getWikiImage sans cache client** — un `WikiImageCache`
   injectable (dedup + inflight + cap de concurrence, logique déjà écrite dans
   gallery) remplacerait ~25 effects copiés-collés. LE refactor à faire en premier.
9. **gallery init effect** — fan-out sur TOUT le catalogue (1468 images) au lieu
   de la page visible ; se re-déclenche par lecture d'imgCache (O(n²)).
10. **image-meta.service** — re-read + re-migrate synchrone à chaque GET ;
    re-readFileSync des seeds déjà en mémoire chez les services frères.
11. **categoryCount/categoryBg en méthode dans le template** — O(n) par cycle de
    CD ; availableCategories() calcule déjà les counts et les jette.
12. **wiki-image backend : fallback séquentiel 5 fetches** — Promise.all + cache
    persisté sur disque (le restart rejoue toute la tempête de cold-start).

## Refactors
13. **Contrôleur lightbox copié ×10** — extraire un LightboxController à côté de
    FigureLightboxComponent (le guard `cur.title !== name` est fragile ×10).
14. **Shell des pages détail dupliqué ×3-9** — heroImage/galleryImages/heroImg()/
    scrollTo() → base partagée.
15. **lore-feed : 10 collections × 4 couches à la main** — registry + routes
    génériques `:collection/:id` (nouvelle collection = 1 ligne).
16. **classifyClaudeError/toHttpException dupliqués** units vs series → common/.
17. **loadJson seed** : 8 variantes, 3 comportements d'échec → helper commun.
18. **9 méthodes WarhammerService sans appelant** (dont generate*Description :
    la génération Claude n'est branchée à AUCUN bouton UI — décider : câbler ou
    supprimer). `slugify` d'artworks à unifier avec youtube-oembed.
19. **Gallery : catégories de base hardcodées front** vs suggested-categories
    backend → « Chaos » apparaît en double dans le combobox.
20. **CLAUDE.md drift** — DEMO_FORCED_HOSTS documenté sans warhammer.sladoire.dev.
