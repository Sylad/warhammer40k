// L76 — identifiants qui ont figuré dans `backend/seed/` puis en ont été ôtés (relevé sur tout
// l'historique git du seed le 2026-11-22 : seul 220f172, L41, en a retiré). La migration d'un
// ancien fichier complet du volume (`data/videos.json`, `data/channels.json`) ne les reprend
// pas comme ajouts de l'utilisateur : ils venaient de la référence, pas de lui. Une entrée ôtée
// du seed à l'avenir n'a pas à figurer ici (la migration n'a lieu qu'une fois, depuis l'ancien format).
export const VIDEOS_RETIREES_DU_SEED = ['baldermort', 'warfo40k'] as const;
export const CHAINES_RETIREES_DU_SEED = ['indomitus-40k', 'astartes-official', 'sire-lambert', 'vox-obscura'] as const;
