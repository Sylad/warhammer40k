# Densité des pages — règles communes (L40)

Consigne de Sylvain du 02-10 : « les pages du site sont très denses ». Ce document fixe les règles
que toutes les pages suivent, avec leur seuil et leur source. Les revues page par page (L2 à L21)
s'appuient dessus. Version exécutable : `frontend/scripts/densite-lib.mjs` ; mesure de toutes les
pages : `cd frontend && npm run densite` (application lancée, voir l'en-tête du script) ; mesures
du 14-11 : [`mesures-2026-11-14.md`](mesures-2026-11-14.md).

Mesures à deux largeurs : **bureau 1440×900** et **téléphone 390×844**, page au repos (rien de
déplié), images du wiki remplacées par leur fond (la hauteur des cartes ne dépend pas de l'image).

## D1 — Sommaire de page

- **Règle** : une page faite de sections (au moins 3 titres `h2`) qui dépasse **3 écrans au
  téléphone** a un sommaire : la barre d'ancres collante (`.anchor-nav`, `src/styles/_anchor-nav.scss`),
  nommée « Sommaire de la page » (`<nav aria-label>`), d'au moins 3 ancres.
- Une ancre par section, dans l'ordre de la page, libellé = titre de la section (ou son début).
  Liens posés par `sectionAnchor` (clic du milieu, « copier l'adresse » mènent à la bonne section).
- Une page faite d'une seule liste n'a pas de sommaire : elle se pagine (D4) ou se filtre.
- **Pourquoi** : WCAG 2.4.5 (plusieurs moyens de trouver un contenu), 2.4.1 (contourner les
  blocs) ; NN/g « In-page links » (table des matières en tête des pages longues).

## D2 — Repli des textes longs

- **Règle** : au repos, aucun bloc de texte n'affiche **plus de 8 lignes** à la largeur courante.
  Au-delà, il montre ses **6 premières lignes** suivies de « Lire la suite » ; un texte de 7 ou 8
  lignes reste entier (on ne cache pas une ligne derrière un bouton).
- Composant commun : `<app-texte-repliable [texte]="…" sujet="Titre de la section"><p>…</p></app-texte-repliable>`
  (`shared/components/texte-repliable/`). Le paragraphe garde ses styles. Le nombre de lignes est
  **mesuré** (il change avec la largeur : un texte entier au bureau peut se replier au téléphone).
- Bouton : vrai `<button>`, `aria-expanded`, `aria-controls`, nom « Lire la suite : <section> »,
  cible de 44 px de haut ; « Réduire » ramène au début du paragraphe s'il est sorti de l'écran.
- On replie **le texte, pas la section** : le titre reste visible, le sommaire mène toujours à
  quelque chose, le début du texte donne envie de lire la suite (« information scent »).
- Le texte entier reste dans la page : lu en entier par les lecteurs d'écran, imprimé en entier
  (`@media print`). Limite connue : la recherche du navigateur (Ctrl+F) trouve un mot de la partie
  repliée sans pouvoir le montrer ; le déplier d'abord.
- **Pourquoi** : NN/g « Progressive disclosure » (le détail à un geste), skill interface-utilisable §6
  (« peu d'options d'emblée, le reste à un geste »). Sylvain aime le lore : on ne le coupe pas,
  on le rend parcourable.

## D3 — Largeur de lecture

- **Règle** : texte courant entre **40 et 80 caractères par ligne** au bureau (cible 60 à 72) ;
  au téléphone, au plus 80 (35 à 40 est la norme à 390 px et n'est pas un écart).
- Classe commune `.lecture` (`src/styles/_densite.scss`) : `max-width: 36em`, la colonne de la
  fiche primarque (L158). Pas `68ch` : le « 0 » qui sert d'unité est plus large que la lettre
  moyenne, 68ch laissaient passer 82 caractères (Orks).
- Pas de colonnes de texte trop étroites : trois colonnes dans 380 px donnaient 25 caractères par
  ligne et 14 lignes par bloc (Histoire & Lore des factions) : les blocs passent l'un sous l'autre.
- **Pourquoi** : WCAG 1.4.8 (AAA : au plus 80 caractères) ; Bringhurst, *The Elements of
  Typographic Style* (45 à 75, 66 idéal) ; Baymard Institute (50 à 75).

## D4 — Pagination des listes

- **Règle** : une liste montre au plus **12 éléments au bureau, 6 au téléphone** (une colonne),
  puis « Afficher N de plus » sous le compte « X sur Y affichés ». Une liste qui dépasse le pas de
  **2 éléments au plus** s'affiche en entier (le bouton prendrait autant de place qu'eux).
- Helper commun : `Pagination` (`core/utils/pagination.ts`) et `estTelephone()` /
  `LISTE_MAX` (`core/utils/densite.ts`, seuil 600 px). Après « Afficher plus », le focus va au
  premier élément ajouté (WCAG 2.4.3) ; le compte est une région `role="status"`.
- Pas de pagination numérotée : l'utilisateur ne perd pas ce qu'il a vu, et un filtre (recherche)
  reste le moyen rapide pour une longue liste (81 chapitres Space Marines).
- **Pourquoi** : NN/g « Infinite scrolling, pagination or load more » (load-more pour des listes
  à parcourir) ; Material 3 window size classes (moins de 600 px = une colonne).

## D5 — Un texte n'apparaît qu'une fois par page

- **Règle** : un même texte (au moins 60 caractères) n'est affiché qu'une fois. Une colonne
  latérale ne redit pas le bandeau ; une citation mise en exergue dans le texte n'est pas répétée
  dans la liste des citations.
- **Pourquoi** : Nielsen, heuristique 8 (design esthétique et minimaliste : chaque information en
  trop rivalise avec les utiles).

## D6 — Hiérarchie des titres

- **Règle** : un seul `h1` ; aucun niveau sauté (`h2` → `h4` interdit).
- **Pourquoi** : WCAG 1.3.1 (information et relations), 2.4.6 (en-têtes et étiquettes) ; les
  lecteurs d'écran naviguent par titres.

## Ce qui n'est pas une règle (mesuré, sans seuil)

- **Hauteur totale en écrans** : elle découle des règles ; les mesurer avant/après suffit.
- **Liens et boutons par écran** : relevés pour les revues, sans seuil fondé.

## Pages pilotes (L40)

| Page | Avant (1440 / 390) | Après (1440 / 390) | Changements |
|---|---|---|---|
| Fiche faction `/factions/space-marines` | 6,6 / 17,3 écrans | 6,8 / 12,9 écrans | D1 sommaire nommé ; D2 chronique, état, héritage, Origine/Organisation/Doctrine repliables ; D3 `.lecture`, blocs Histoire & Lore l'un sous l'autre ; D4 chapitres par 12 / 6 avec « X sur Y affichés », unités 7 + « Voir toutes » / 5 + 1 ; D5 encart « À propos des … » et citation latérale retirés (redisaient le bandeau) |
| Fiche Lore `/lore/primarchs/lion-eljonson` | 6,2 / 11,2 écrans | 5,7 / 8,7 écrans | D1 sommaire nommé ; D2 Description, Personnalité, Origines, Grande Croisade, Hérésie, Destin, Héritage repliables ; D3 citation centrée moins étroite au téléphone ; D5 « Citations » ne garde que celles absentes du texte (« Autres citations ») ; D6 batailles en `h3` |

Garde : `src/app/features/densite-pilotes-l40.e2e.spec.ts` mesure **chaque** faction et
**chaque** primarque des données à 1440 et 390 px (application construite) et échoue au moindre
écart ; il tourne dans `npm run test:e2e` (CI).

## Appliquer aux autres pages (revues L2 à L21)

1. `npm run densite -- --page <adresse>` : écarts de la page aux deux largeurs.
2. Corriger avec les briques communes (`app-texte-repliable`, `.lecture`, `Pagination`, barre
   d'ancres) avant d'inventer un mécanisme propre à la page.
3. Ajouter la page à la garde e2e (ou une garde équivalente) une fois conforme.
