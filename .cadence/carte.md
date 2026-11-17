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
