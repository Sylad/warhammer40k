---
title: "Accueil : plus de faux « 0 » pendant le chargement ni sur erreur"
date: 2026-10-10
created: 2026-10-10T14:07+02:00
lots: [L79]
captures: [{ file: captures/L79-accueil-erreur.png, alt: "L’accueil quand les chiffres n’ont pas pu être chargés : un message et un bouton Réessayer au-dessus des cartes, « — » à la place des compteurs" }]
# une capture peut dire ce qu'elle montre : captures: [{ file: captures/x.png, alt: "texte alternatif" }]
# nocapture: raison, quand une capture n'a pas de sens
---
Sur l’**accueil**, les compteurs (Factions, Sous-factions, Romans, Vidéos, Œuvres) n’affichent plus « 0 » tant que les données arrivent, ni quand le chargement échoue : ils montrent « — ». Si un chiffre n’a pas pu être chargé, un message l’indique et un bouton **Réessayer** relance le chargement. Un vrai zéro reste affiché « 0 ».
