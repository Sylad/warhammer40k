# Veille du contenu (L44)

Consigne de Sylvain (02-10) : tenir le codex à jour — jeux vidéo et sorties à venir, romans et
séries, nouvelles éditions, actualités de l'univers —, chaque fait vérifié sur une source en ligne
citée et datée, et la date de la dernière revue affichée.

## Une seule date de revue

- `frontend/public/veille-data/veille.json` → `revueLe` : **la seule date de revue écrite à la
  main**. L'accueil l'affiche (« Contenu revu le … »), avec la prochaine revue au plus tard
  `revueLe + rythmeJours`. Passé ce jour, la section le dit (« Revue prévue le … : pas encore
  faite ») : une information ancienne n'est jamais présentée comme à jour.
- `frontend/public/jeux-data/jeux.json` → `verifieLe` est une **copie** de `revueLe`, écrite par
  `cd frontend && npm run veille` (la page Jeux vidéo l'affiche : « Informations vérifiées le … »).
- `scripts/veille-data.test.mjs` (Vitest, donc `npm test` et « Contrôles frontend ») échoue si les
  deux divergent, ou si un autre fichier de `public/` porte sa propre date de revue.

## Aucun fait sans source https datée

Chaque fait publié porte `source` (adresse https) et `consulteLe` (AAAA-MM-JJ, jour où la page a
été lue) :

- chaque actualité de `veille.json` (`date` = date de l'événement à sa précision connue :
  `2026`, `2026-06` ou `2026-10-07`, jamais un jour inventé) ;
- chaque jeu de `jeux.json`, à venir comme déjà sorti ; comme la page dit « vérifiées le
  `revueLe` », un jeu doit avoir été consulté **ce jour-là**.

`node scripts/veille-data.mjs --check` (et le test ci-dessus) refuse un fait sans source, une
source en http ou qui n'est pas une adresse, une date de consultation absente, impossible ou
postérieure à la revue.

Règles de rédaction : n'écrire que ce que la source dit (date à sa précision, « aucune date
annoncée » plutôt qu'une estimation de presse) ; préférer la source primaire (éditeur, Steam,
Warhammer Community) ou Wikipédia ; une page lue seulement par un résumé n'est pas une
vérification.

## Rythme : une revue par mois (`rythmeJours: 30`)

À chaque revue :

1. Jeux vidéo : chaque jeu à venir (date, report, plateformes) ; un jeu sorti passe de `aVenir` à
   `existants` avec son année, son vrai résumé et ses plateformes (règle L35) ; les annonces
   nouvelles (Warhammer Skulls en mai, Game Awards en décembre).
2. Romans : annonces Black Library (Warhammer Community) ; une série du site qui reçoit un tome
   se corrige dans `backend/seed/series.json` (livraison normale, L74).
3. Éditions du jeu, séries et films, autres actualités de l'univers → `actualites`.
4. Retirer une actualité de plus d'un an, sauf si elle reste la plus récente de son sujet.
5. `revueLe` = jour de la revue, `consulteLe` = jour de lecture de chaque source revue,
   `npm run veille`, `npm test`, entrée Nouveautés si le contenu visible change.

## Images

Aucune image n'est mise en ligne sans validation de Sylvain. Une image candidate n'est retenue
que libre de droits (domaine public, CC0, CC BY, CC BY-SA, licence vérifiée sur la page du
fichier) ou créée pour le site ; les visuels des éditeurs (jaquettes, captures de presse,
illustrations Games Workshop) ne le sont pas.

Revue du 2026-11-22 : **aucune candidate**. Les actualités de cette revue (11e édition, romans
Black Library, série animée, jeux) n'ont d'illustration que des visuels d'éditeur, sous droits ;
les cartes restent sans image, comme les jeux à venir (`✠`).

| Sujet | Image candidate | Licence | Décision |
|---|---|---|---|
| — | aucune trouvée | — | — |

## Journal des revues

| Revue | Ce qui a changé | Sources lues |
|---|---|---|
| 2026-11-22 | Boltgun 2 sorti le 14 octobre, puis le 19 novembre sur Switch 2 (« Déjà sortis », titre corrigé : « Boltgun 2 ») ; Mechanicus II, sorti le 21 mai 2026, ajouté ; Space Marine 3 ajouté aux jeux à venir (sans date) ; Dawn of War IV confirmé au 3 décembre 2026 ; Total War: Warhammer 40,000 toujours sans date ; plateformes de Rogue Trader et Darktide complétées ; source et date pour chaque jeu ; 5 actualités (11e édition annoncée puis sortie, série animée Deathwatch, romans Black Library). | Steam, Wikipédia (EN), Gematsu, Warhammer Community, Wargamer, Variety |
