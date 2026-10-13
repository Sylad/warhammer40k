---
title: "Listes en erreur : plus de « aucun résultat » sous le message d'erreur"
date: 2026-10-13
created: 2026-10-13T10:41+02:00
lots: [L111]
captures: [{ file: captures/L111-equipement-erreur.png, alt: "Page Armement et Reliques quand le chargement échoue : le message d'erreur avec « Réessayer », sans « Aucune pièce ne correspond »" }]
# une capture peut dire ce qu'elle montre : captures: [{ file: captures/x.png, alt: "texte alternatif" }]
# nocapture: raison, quand une capture n'a pas de sens
---
Quand le chargement de la liste Équipement ou de la liste des Séries échoue, la page n'affiche plus que le message d'erreur et son bouton « Réessayer ». Le texte « Aucune pièce ne correspond aux filtres » (ou « Aucune série ne correspond à votre recherche ») ne s'affiche plus au-dessous, à tort : il reste réservé aux listes bien chargées dont les filtres ne laissent rien.
