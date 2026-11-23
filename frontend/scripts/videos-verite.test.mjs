// L249 — chaque fiche vidéo corrigée décrit la vidéo que le lecteur lit vraiment : même méthode que
// L109 (fiche astartes, liens.test.mjs). La vérité est FIGÉE ci-dessous, relevée le 2026-11-23 sur
// YouTube (oEmbed `https://www.youtube.com/oembed?format=json&url=<url>` pour le titre et l'auteur,
// page de la vidéo ou de la playlist pour `lengthSeconds` de chaque vidéo) : aucun réseau ici. Une
// nouvelle vérification se fait par `npm run liens:externes` (classe « auteur différent »), puis on
// met à jour ce relevé, daté.
import { describe, expect, it } from 'vitest';
import { auteurVideoDiffere, loadSeed } from './liens-lib.mjs';

const RELEVE_LE = '2026-11-23';

/** Durée « h:mm:ss » ou « m:ss » telle que l'affiche le seed. */
const duree = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

const VERITE = [
  {
    id: 'helsreach',
    // Avant : playlist PLrEJ4P72… de Rostam Archives (ré-upload), annoncée « Richard Boylan », 1:24:35.
    // Source de l'auteur : sa playlist « Helsreach » (parties 1 à 10 ; 11 à 13 hors playlist).
    embedType: 'playlist',
    embedId: 'PLSWAxTw0FAGxkkqmuroxMwN5LviaBosJ5',
    url: 'https://www.youtube.com/playlist?list=PLSWAxTw0FAGxkkqmuroxMwN5LviaBosJ5',
    titreReel: 'Helsreach',
    chaine: 'Richard Boylan',
    auteurOeuvre: 'Richard Boylan',
    // 1D4jr-0_COg, xhqpYcFkeCE, IOtSVTvH8bM, xXXE_2mGiuc, 6z0klMZ7r8M, jahCLBmqHnI, a8_MjeU8MLM,
    // M0npZ9MszGE, 5VVvM9gQ6Gs, 7t0BAkiQi2k
    secondes: [154, 500, 591, 593, 629, 589, 343, 495, 1055, 682],
  },
  {
    id: 'lord-inquisitor-prologue',
    // Avant : YU0hixqU2XU, ré-upload de la chaîne Warhammer Animations, 9:18 annoncé (réel 9:42).
    // Source de l'auteur : remise en ligne par Erasmus Brosdau sur sa chaîne (@DirectorErasmusBrosdau).
    embedType: 'video',
    embedId: 'LrlGBHGckGs',
    url: 'https://youtu.be/LrlGBHGckGs',
    titreReel: 'The Lord Inquisitor - Prologue',
    chaine: 'Erasmus Brosdau',
    auteurOeuvre: 'Erasmus Brosdau',
    secondes: [582],
  },
  {
    id: 'lord-inquisitor',
    // Pas de source officielle propre : il n'existe pas de film complet (l'auteur, sur sa chaîne :
    // « the project stopped after the prologue »). Vidéo gardée, décrite telle qu'elle est.
    embedType: 'video',
    embedId: '4cuO3YRu9cg',
    url: 'https://youtu.be/4cuO3YRu9cg',
    titreReel: 'The Lord Inquisitor Full Movie Uncut 4K Upscaled',
    chaine: 'Actual Hammer',
    auteurOeuvre: 'Erasmus Brosdau',
    secondes: [569],
    pasDe: [/Film complet/i, /1:00:42/],
  },
  {
    id: 'angels-of-death',
    // La série est sur Warhammer+ seulement (la chaîne Warhammer n'en publie que la bande-annonce) ;
    // la playlist gardée est celle des analyses de COUNTERPOINTS 40K, pas la série.
    embedType: 'playlist',
    embedId: 'PL-vCMNyR76lhnVoA2_Ff5FDipFAgCSozK',
    url: 'https://youtube.com/playlist?list=PL-vCMNyR76lhnVoA2_Ff5FDipFAgCSozK',
    titreReel: 'Angels of Death',
    chaine: 'COUNTERPOINTS 40K',
    auteurOeuvre: 'Games Workshop',
    // GwM8MkSFKsg … GomIA0EdM7g (13 analyses)
    secondes: [1304, 947, 1105, 1134, 1481, 826, 868, 952, 1096, 1139, 1503, 1366, 1906],
    pasDe: [/Série complète/i, /officiel/i],
  },
];

describe(`fiches vidéo face à la vidéo réellement lue (L249, relevé du ${RELEVE_LE})`, () => {
  const videos = loadSeed().videos ?? [];

  it.each(VERITE)('$id', (t) => {
    const v = videos.find((x) => x.id === t.id);
    expect(v, t.id).toBeDefined();
    expect(v.embedType).toBe(t.embedType);
    expect(v.embedId).toBe(t.embedId);
    expect(v.url).toBe(t.url);
    // La chaîne qui publie est celle que la fiche nomme…
    expect(auteurVideoDiffere(v.createur, t.chaine)).toBe(false);
    // … et, si elle n'est pas l'auteur de l'œuvre, la fiche nomme aussi l'auteur.
    if (t.auteurOeuvre !== t.chaine) expect(v.createur).toContain(t.auteurOeuvre);
    expect(v.duration).toBe(duree(t.secondes.reduce((a, b) => a + b, 0)));
    // Titre : le titre réel (ou son début, pour un ré-upload au titre trompeur) se retrouve dans la fiche.
    const n = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const reel = n(t.titreReel.split(/ Full Movie/)[0]);
    expect(n(`${v.titre} ${v.description}`)).toContain(reel);
    for (const re of t.pasDe ?? []) {
      expect(`${v.titre} ${v.type} ${v.duration} ${(v.tags ?? []).join(' ')}`).not.toMatch(re);
    }
  });

  it('le calcul de durée suit l\'affichage du seed', () => {
    expect(duree(582)).toBe('9:42');
    expect(duree(5631)).toBe('1:33:51');
    expect(duree(3600)).toBe('1:00:00');
  });
});
