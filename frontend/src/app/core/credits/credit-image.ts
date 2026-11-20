/**
 * L238 — crédit d'une image affichée, déduit de son adresse seule (aucune source devinée).
 *
 * Sources réelles recensées dans le code (rapport du lot L238) :
 * - `static.wikia.nocookie.net/<wiki>/images/…/<fichier>` : miniatures du Warhammer 40k Wiki (Fandom),
 *   servies par `/api/wiki-image` et par les `iconUrl` de `factions.json`. Les illustrations y sont
 *   © Games Workshop, publiées « without permission » (modèle Disclaimer du wiki) : PAS sous la
 *   CC BY-SA du texte du wiki. Le fichier se déduit de l'adresse → lien vers sa page `File:`.
 * - `/api/images/datasheets/<id>` : 119 fiches techniques embarquées (contenu de règles © Games
 *   Workshop ; publication d'origine du scan non identifiée).
 * - `/api/images/portraits/<id>` : 14 portraits locaux (Warhammer 40k Wiki ou Lexicanum d'après le
 *   journal du projet, fichier d'origine non identifié).
 * - `/api/images/file/<nom>` : collection personnelle de la galerie (auteur d'origine non conservé).
 * - `/api/images/imported/<nom>` : images importées (Reddit, wiki, adresse directe ; source non conservée).
 * - `i.ytimg.com` / `img.youtube.com` : miniatures YouTube, © la chaîne de la vidéo.
 * - `/galaxy-map.jpg` : carte de la galaxie © Games Workshop (publication d'origine non identifiée).
 * Les captures des Nouveautés et le favicon sont produits par le site : pas de crédit.
 */

export type SourceImage = 'fandom' | 'fiche' | 'portrait' | 'perso' | 'import' | 'youtube' | 'carte' | 'externe';

export interface CreditImage {
  source: SourceImage;
  /** Texte court (infobulle de l'image). */
  texte: string;
  /** Élément précis (fichier du wiki, vidéo, hôte) quand l'adresse le dit. */
  detail?: string;
  /** Lien vers l'origine exacte (page du fichier, vidéo), quand il existe. */
  lien?: string;
}

/** Libellé et droits de chaque source, repris par la liste du pied de page et par À propos. */
export const SOURCES_IMAGES: Record<SourceImage, { nom: string; droits: string }> = {
  fandom: {
    nom: 'Warhammer 40k Wiki (Fandom)',
    droits: 'Illustrations © Games Workshop Limited, publiées par le wiki sans licence libre (la CC BY-SA du wiki couvre son texte, pas ces images).',
  },
  fiche: { nom: 'Fiches techniques', droits: '© Games Workshop Limited. Publication d’origine du scan non identifiée.' },
  portrait: { nom: 'Portraits locaux', droits: 'Copies locales d’images du Warhammer 40k Wiki ou de Lexicanum ; fichier d’origine non identifié. Univers © Games Workshop Limited.' },
  perso: { nom: 'Collection personnelle', droits: 'Images rassemblées par l’auteur du site ; auteur d’origine non conservé.' },
  import: { nom: 'Images importées', droits: 'Importées depuis Reddit, le wiki ou une adresse directe ; source d’origine non conservée.' },
  youtube: { nom: 'YouTube', droits: 'Miniatures © la chaîne de chaque vidéo.' },
  carte: { nom: 'Carte de la galaxie', droits: '© Games Workshop Limited. Publication d’origine non identifiée.' },
  externe: { nom: 'Autres sites', droits: 'Image d’un autre site ; source non identifiée.' },
};

const HOTES_YOUTUBE = new Set(['i.ytimg.com', 'img.youtube.com']);

/** Crédit de l'image à cette adresse, ou `null` si l'image est produite par le site. */
export function creditImage(adresse: string, origine = 'http://localhost'): CreditImage | null {
  let url: URL;
  try { url = new URL(adresse, origine); } catch { return null; }
  if (url.protocol === 'data:' || url.protocol === 'blob:') return null;
  const memeSite = url.origin === new URL(origine).origin;
  const chemin = url.pathname;

  if (url.hostname === 'static.wikia.nocookie.net') {
    // /<wiki>/images/<a>/<ab>/<Fichier.ext>[/revision/…]
    const m = /^\/([^/]+)\/images\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/.exec(chemin);
    if (m) {
      const fichier = decodeURIComponent(m[2]).replace(/_/g, ' ');
      const wiki = m[1] === 'warhammer40k' ? 'Warhammer 40k Wiki' : `wiki ${m[1]}`;
      return {
        source: 'fandom',
        texte: `Illustration © Games Workshop — via le ${wiki} (Fandom), fichier « ${fichier} »`,
        detail: fichier,
        lien: `https://${m[1]}.fandom.com/wiki/File:${m[2]}`,
      };
    }
    return { source: 'fandom', texte: 'Illustration © Games Workshop — via Fandom' };
  }
  if (HOTES_YOUTUBE.has(url.hostname)) {
    const id = /^\/vi\/([\w-]+)\//.exec(chemin)?.[1];
    return {
      source: 'youtube',
      texte: 'Miniature YouTube © la chaîne de la vidéo',
      detail: id,
      lien: id ? `https://www.youtube.com/watch?v=${id}` : undefined,
    };
  }
  if (memeSite) {
    const local = /^\/api\/images\/(datasheets|portraits|file|imported)\/([^/?#]+)/.exec(chemin);
    if (local) {
      const nom = decodeURIComponent(local[2]);
      switch (local[1]) {
        case 'datasheets': return { source: 'fiche', texte: 'Fiche technique © Games Workshop', detail: nom };
        case 'portraits': return { source: 'portrait', texte: 'Illustration locale, fichier d’origine non identifié — univers © Games Workshop', detail: nom };
        case 'file': return { source: 'perso', texte: 'Collection personnelle — auteur d’origine non conservé', detail: nom };
        default: return { source: 'import', texte: 'Image importée — source d’origine non conservée', detail: nom };
      }
    }
    if (chemin === '/galaxy-map.jpg') return { source: 'carte', texte: 'Carte de la galaxie © Games Workshop' };
    return null;
  }
  if (url.protocol === 'http:' || url.protocol === 'https:') {
    return { source: 'externe', texte: `Image de ${url.hostname} — source non identifiée`, detail: url.hostname };
  }
  return null;
}

/** Adresses des images d'un élément : `src` d'une `<img>`, `url(…)` de son style en ligne (variables CSS comprises). */
export function adressesImages(el: Element): string[] {
  const out: string[] = [];
  if (el.tagName === 'IMG') {
    const src = el.getAttribute('src');
    if (src) out.push(src);
  }
  const style = el.getAttribute('style');
  if (style && style.includes('url(')) {
    for (const m of style.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)'"\s]+))\s*\)/g)) {
      const u = m[1] ?? m[2] ?? m[3];
      if (u) out.push(u);
    }
  }
  return out;
}
