---
title: "Factions : le filtre « Autres » n'apparaît que s'il a des factions"
date: 2026-10-11
created: 2026-10-11T09:27+02:00
lots: [L102]
captures: [{ file: captures/L102-factions-liste-vide.png, alt: "Page Factions : message « Aucune faction ne correspond » et bouton « Toutes les factions », sans bouton « Autres »" }]
# une capture peut dire ce qu'elle montre : captures: [{ file: captures/x.png, alt: "texte alternatif" }]
# nocapture: raison, quand une capture n'a pas de sens
---
Sur la page Factions, le bouton « Autres » n'est plus affiché tant qu'aucune faction n'y entre : il reste caché, au lieu de mener à une liste vide.

Quand une recherche ou un filtre ne donne aucun résultat, le message « Aucune faction ne correspond à ce filtre. » est annoncé par les lecteurs d'écran, et un bouton « Toutes les factions » remet d'un clic le filtre et la recherche à zéro.

Pendant que les factions se chargent, la page affiche « Chargement des factions… » au lieu du message « Aucune faction ». Si le chargement échoue, elle indique que les factions n’ont pas pu être chargées.
