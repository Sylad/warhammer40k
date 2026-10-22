---
title: "Concepts : un lien mène toujours au concept visé"
date: 2026-10-22
created: 2026-10-22T15:23+02:00
lots: [L162]
nocapture: le changement est un comportement au clic (le filtre repasse à « Tous » et la page défile), sans écran nouveau ni état visuel inédit ; application non lancée dans cette session
# une capture peut dire ce qu'elle montre : captures: [{ file: captures/x.png, alt: "texte alternatif" }]
# nocapture: raison, quand une capture n'a pas de sens
---
Sur la page Concepts, une carte « liens inter-concepts » mène maintenant toujours au concept qu'elle désigne. Avant, si un filtre de catégorie était actif (par exemple Impérial) et que le concept visé appartenait à une autre catégorie (du Trône d'Or vers le Webway, par exemple), le clic ne faisait rien : l'adresse et le focus restaient où ils étaient.

Désormais, le filtre repasse à « Tous », puis la page défile jusqu'au concept visé, qui reçoit le focus. Quand le concept visé est déjà affiché, le filtre choisi est conservé.
