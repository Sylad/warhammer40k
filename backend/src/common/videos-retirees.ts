// L232 : vidéos YouTube supprimées par leur auteur (vignette img.youtube.com et oEmbed en 404,
// vérifié le 2026-11-17, QA prod après L229). Elles ne vivent que dans le volume `data/videos.json`
// (importées par POST /videos/import), qu'une livraison ne touche pas : comme les chaînes retirées
// (L41, `chaines-retirees.ts`), elles sont filtrées à la lecture, et `VideosService.add` refuse de
// les réenregistrer. Le fichier du volume n'est réécrit sans elles qu'au prochain ajout ou retrait.
// Une vidéo remise en ligne revient par un lot qui la sort de cette liste, puis par un import.
const IDS_RETIRES = [
  'huKRew_nEGI', // « The Emperor Returns. The Galaxy Reacts. » — Delta Drift Codex
  'CcFcmPQklyY', // « Raptors » — JJCASE in ENG (déjà signalée « indisponible » par L142)
];

/** Identifiant YouTube (11 caractères) d'une adresse youtu.be, watch?v=, embed/, shorts/ ou live/, sinon `undefined`. */
export function idYouTube(url: string | undefined): string | undefined {
  const m = /(?:youtu\.be\/|[?&]v=|\/(?:embed|shorts|live)\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/.exec(url ?? '');
  return m?.[1];
}

interface VideoRef { url?: string; embedId?: string | null; embedType?: string | null }

export function estVideoRetiree(v: VideoRef): boolean {
  const ids = [idYouTube(v.url), v.embedType === 'playlist' ? undefined : v.embedId ?? undefined];
  return ids.some(id => id !== undefined && IDS_RETIRES.includes(id));
}

/** Message d'erreur à renvoyer quand on tente d'enregistrer une vidéo retirée, sinon `undefined`. */
export function motifVideoRetiree(v: VideoRef): string | undefined {
  if (!estVideoRetiree(v)) return undefined;
  return `Vidéo YouTube ${idYouTube(v.url) ?? v.embedId} supprimée de YouTube (L232) : elle ne peut pas être enregistrée tant qu'elle figure dans la liste des vidéos retirées (backend/src/common/videos-retirees.ts)`;
}
