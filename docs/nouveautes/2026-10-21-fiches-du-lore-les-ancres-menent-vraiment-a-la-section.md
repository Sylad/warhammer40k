---
title: "Fiches du Lore : les ancres mènent vraiment à la section"
date: 2026-10-21
created: 2026-10-21T20:21+02:00
lots: [L160]
captures:
  - { file: captures/L160-primarque-ancre-origines-1440.png, alt: "Fiche d'Horus après un clic sur « Origines » dans la barre des sections : la section Origines est en haut de page, sous la barre, et l'adresse se termine par #origines" }
# une capture peut dire ce qu'elle montre : captures: [{ file: captures/x.png, alt: "texte alternatif" }]
# nocapture: raison, quand une capture n'a pas de sens
---
Sur les fiches (Primarque, Faction, Saint, Titan, Vaisseau, Équipement), un clic sur un lien de la barre des sections ne se contente plus de faire défiler la page : la section visée reçoit aussi le focus clavier, et l'adresse de la page se termine par le nom de la section (par exemple `#histoire`). Au clavier ou avec un lecteur d'écran, on est donc bien dans la section, et un Tab part de là ; copier l'adresse permet de renvoyer vers la section précise.

Même comportement pour les pastilles d'ères de la chronologie et pour l'arrivée sur un concept par un lien (`/lore/concepts#eye-of-terror`). Si le système demande de limiter les animations, le défilement est instantané. Les liens de la barre n'ajoutent pas d'entrée à l'historique : le bouton Retour quitte la fiche au lieu de remonter section par section.
