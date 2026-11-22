---
title: "Factions : chargement, erreur et recherche vide annoncés"
date: 2026-11-22
created: 2026-11-22T11:30+01:00
lots: [L96]
captures:
  - { file: captures/L96-factions-recherche-vide-telephone.png, alt: "Factions à 390 px de large, recherche « zzzz » : le compte indique « Aucune faction », le message dit qu'aucune faction ne correspond à la recherche « zzzz » et propose le bouton « Effacer les filtres »" }
  - { file: captures/L96-factions-erreur-bureau.png, alt: "Factions à 1440 px de large, liste indisponible : à la place des cartes, le message « Les factions n'ont pas pu être chargées. Vérifiez la connexion, puis réessayez. » avec le bouton « Réessayer »" }
---
La page Factions restait parfois muette : une grille vide pendant le chargement ou quand la liste ne pouvait pas être chargée, « Unités 0 » sur chaque carte tant que les unités n'étaient pas arrivées, et rien du tout quand une recherche ne trouvait aucune faction.

Maintenant, chaque situation se voit et s'explique. Pendant le chargement, la page l'annonce et dessine l'emplacement des cartes. Si la liste ne peut pas être chargée, un message le dit, avec un bouton « Réessayer ». Tant que les unités arrivent, les cartes affichent « — » au lieu d'un faux zéro. Une recherche sans résultat le dit, rappelle ce que vous avez cherché et propose « Effacer les filtres », qui ramène toutes les factions et place la sélection sur la première. Au-dessus des cartes, le nombre de factions affichées suit chaque filtre et chaque recherche, et un lecteur d'écran l'annonce.
