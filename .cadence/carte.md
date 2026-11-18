# Carte du projet — écrans, workflows, décisions

## Attentes QA (`docs/qa/expectations.md`)

- Lu par l'agent qa-reviewer après chaque livraison : par route, `shows:` / `never:` / `api:` / `404`.
- L235 (17-11) : ajout de /lore/emperor et /lore/timeline/:id, /lore, /nouveautes et /about précisés,
  filtres des listes du lore (primarques, équipement, chronologie, vaisseaux, titans, saints) avec
  leurs comptes et leurs appels API.
- Id de fiche chronologie à visiter : `siege-of-terra`. La liste /lore/timeline n'a de lien vers une
  fiche que dans une carte dépliée (« Lire la fiche complète → ») : la QA doit déplier ou visiter l'id.
- Garde : `frontend/src/app/features/attentes-qa-l235.spec.ts` compare chaque compte et libellé écrit
  au seed (`backend/seed`), aux gabarits des composants, à `lore-hub.counts.ts` et au journal
  `nouveautes.json`. Un changement de données qui change un compte de ces pages fait échouer ce test :
  mettre à jour l'attente dans le même commit. Pour /nouveautes, les nombres sont des minimums.

## Galerie — changement de page (L71)

- `goToPage` : focus sur la grille (`tabindex=-1`), « Page N sur M » dans la région `pagination-annonce`,
  puis défilement vers la grille.
- Suite de la revue UX (18-11) : ce défilement suit `prefers-reduced-motion` — instantané (`auto`) si
  « reduce », doux sinon. Préférence lue par `defilementSelonPreference()` (`core/utils/section-anchor.ts`),
  aussi utilisée par `revealSection` : tout nouveau `scrollIntoView` programmé passe par elle.
- Gardes : `gallery-pagination-l71.spec.ts` (R5, R6) et `gallery-pagination-l71.e2e.spec.ts` (390 px, reduce /
  no-preference, scrollY mesuré juste après Entrée).
