---
title: "Médias : la carte « Vidéo à la une » ouvre directement cette vidéo"
date: 2026-10-12
created: 2026-10-12T13:08+02:00
lots: [L47]
captures: [{ file: captures/L47-video-ouverte-par-adresse.png, alt: "La page Vidéos ouverte sur /videos?video=astartes : la fenêtre de lecture est ouverte sur « Astartes — Partie 1 », le bouton Fermer en haut à droite porte le focus, le lien « Ouvrir sur YouTube » est sous le lecteur et la page derrière est assombrie" }]
---
Sur une page faction, la carte « Vidéo à la une » du bloc Médias ouvre maintenant cette vidéo : la page Vidéos s’affiche avec la fenêtre de lecture déjà ouverte sur elle, au lieu de la liste entière. La carte « Vidéos » des factions sans vidéo mène toujours à la liste.

Chaque vidéo a désormais sa propre adresse, de la forme `/videos?video=astartes`. On peut la copier, la partager ou l’ouvrir dans un nouvel onglet. Ouvrir une vidéo depuis la page Vidéos écrit cette adresse ; la fermer (×, Échap ou clic sur le fond) la retire, et le bouton Précédent du navigateur rouvre la vidéo.

Les cartes de la page Vidéos (Incontournables, Toutes les vidéos) sont de vrais liens : on les atteint à la touche Tab, Entrée les ouvre, et le clic du milieu ou Ctrl+clic les ouvre dans un nouvel onglet. Le contour de la carte montre celle qui a le focus ; le bouton ✕ de suppression vient juste après le lien dans l’ordre de tabulation. La fenêtre de lecture se nomme du titre de la vidéo, garde le focus à l’intérieur (Tab et Maj+Tab bouclent) et rend le focus à la carte d’origine à la fermeture, ou au titre de la page si l’on est arrivé par l’adresse.

Quand la liste se charge, la page affiche « Chargement de la vidéo… » ; si l’identifiant de l’adresse ne correspond à aucune vidéo, elle affiche « Cette vidéo n’est plus dans le codex. Voici les autres vidéos. » avec la liste entière ; si le chargement échoue, « Impossible de charger les vidéos. » avec un bouton « Réessayer ».

## Hypothèses

- R3 — Ouvrir une vidéo depuis la page écrit son adresse, et la fermer la retire. Si l’adresse ne doit pas suivre les ouvertures faites depuis la page, seule cette écriture disparaît ; l’arrivée par adresse ne change pas.
- R4 — Pendant le chargement, la page affiche « Chargement de la vidéo… ». Si la page doit rester sans message, seul ce bandeau disparaît.
- R5 — Un identifiant inconnu affiche le message et la liste entière, sans réécrire l’adresse. Si l’adresse doit être nettoyée, seule la réécriture s’ajoute.
- R6 — À la fermeture, le focus retourne à la carte d’origine, ou au titre de la page après une arrivée par l’adresse. S’il doit rester où le navigateur le met, seule la gestion du focus change.
- R7 — Si la lecture de la liste échoue, la page affiche l’erreur et « Réessayer ». Si l’erreur ne doit pas être traitée ici, la page reste sans liste, comme avant.
- R8 — Le paramètre s’appelle « video » (`/videos?video=astartes`). Si un autre nom ou une ancre est préféré, seul le nom change avant livraison ; après, les liens déjà partagés casseraient.
