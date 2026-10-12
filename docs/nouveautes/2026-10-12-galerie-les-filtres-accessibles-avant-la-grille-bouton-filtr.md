---
title: "Galerie : les filtres accessibles avant la grille, bouton Filtres au téléphone"
date: 2026-10-12
created: 2026-10-12T10:16+02:00
lots: [L49]
captures: [{ file: captures/L49-galerie-filtres-390.png, alt: "La galerie à 390 px avec le panneau Filtres déplié sous la recherche : le bouton Filtres porte la pastille 1, la liste Faction est sur Space Marines et « 6 résultats » s’affiche sous Trier par" }]
---
Dans la galerie, le panneau Filtres (Faction, Catégorie, Trier par) vient maintenant juste après la recherche, avant les catégories et les œuvres. Au clavier, on atteint ces listes en quelques tabulations au lieu de traverser toute la grille. À partir de 761 px, il garde sa place habituelle en haut de la colonne de droite.

Sur téléphone, un bouton « Filtres » apparaît sous la recherche, à côté d’« Importer ». Il déplie ou replie le panneau ; il indique le nombre de filtres actifs (Faction, Catégorie) et, panneau ouvert, les pastilles de statistiques du bandeau s’effacent pour que les listes soient visibles tout de suite. Choisir une valeur met la grille à jour sans refermer le panneau, et le nombre de résultats se lit en bas du panneau.

Quand les filtres ne laissent aucune œuvre, un rappel « Aucune œuvre ne correspond » accompagné de « Réinitialiser les filtres » s’affiche sous la recherche, dans le premier écran du téléphone.

La galerie distingue aussi le chargement et l’échec : « Chargement de la galerie… » pendant la lecture, puis, si elle échoue, « Impossible de charger la galerie. » avec un bouton « Réessayer », au lieu d’une galerie vide. Dans les deux cas les listes et les cartes de catégorie sont grisées et les chiffres du bandeau affichent « – ».

La liste Catégorie propose désormais toutes les catégories de la galerie, même après le choix d’une faction.

## Hypothèses

- R2 — À partir de 761 px le panneau Filtres reste affiché en haut de la colonne de droite, sans bouton. Si le panneau doit s’afficher au-dessus de la grille à toute largeur, seule la mise en page change.
- R4 — Au téléphone, le panneau est replié au chargement. S’il doit être ouvert par défaut, seul l’état initial du bouton change.
- R5 — Le bouton affiche le nombre de filtres actifs. Si le nombre ne doit pas figurer, seule la pastille du bouton disparaît.
- R8 — Pendant la lecture, la page affiche « Chargement de la galerie… » et grise les listes. Si le chargement doit rester muet, seul ce bloc change.
- R9 — Si la lecture échoue, la page affiche l’erreur et « Réessayer » au lieu de l’état vide. Si l’erreur ne doit pas être distinguée du vide, on revient au message d’avant.
- R10 — « Artistes à découvrir » et « Collections populaires » restent après la grille dans l’ordre de tabulation. S’ils doivent la précéder, seul l’ordre du document change.
- R11 — Entre 761 et 1024 px le panneau est ouvert au-dessus des catégories, sans bouton. Si le bouton doit aussi exister sur tablette, seul son seuil d’affichage change.
