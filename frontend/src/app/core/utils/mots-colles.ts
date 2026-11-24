/**
 * L253 passe 3 (revue UX r2, N-C3) — un mot collé à une espace insécable (« « Armageddon » » : guillemets et
 * espaces fines U+202F, « titre : » : espace fine avant le deux-points) n'est pas césuré par Chromium : à 200 % et
 * 320 px, « ARMAGEDD|ON » se coupait n'importe où, sans trait (`overflow-wrap: anywhere`). Le même mot dans son
 * propre élément (`<span>Armageddon</span>`, espaces fines à l'extérieur) se coupe à une syllabe, avec un trait.
 * Découpe un texte en morceaux : `mot: true` pour un mot collé à une espace insécable (à rendre dans un `<span>`),
 * le reste tel quel. La concaténation des morceaux rend le texte d'origine.
 */
export interface Morceau {
  texte: string;
  mot: boolean;
}

const INSECABLE = /[  ]/;
const MOT = /[\p{L}\p{N}][\p{L}\p{N}\p{M}'’-]*/gu;

export function morceauxMotsColles(texte: string): Morceau[] {
  const out: Morceau[] = [];
  let i = 0;
  for (const m of texte.matchAll(MOT)) {
    const debut = m.index;
    const fin = debut + m[0].length;
    if (!INSECABLE.test(texte[debut - 1] ?? '') && !INSECABLE.test(texte[fin] ?? '')) continue;
    if (debut > i) out.push({ texte: texte.slice(i, debut), mot: false });
    out.push({ texte: m[0], mot: true });
    i = fin;
  }
  if (i < texte.length) out.push({ texte: texte.slice(i), mot: false });
  return out;
}

/** Même découpe dans du HTML (texte hors balises ; entités laissées telles quelles) : chaque mot collé passe dans un
 *  `<span>`. Pour un contenu compilé, rendu par `[innerHTML]` (Nouveautés). */
export function htmlMotsColles(html: string): string {
  return html
    .split(/(<[^>]*>)/)
    .map((part) => (part.startsWith('<') ? part : morceauxMotsColles(part).map((m) => (m.mot ? `<span>${m.texte}</span>` : m.texte)).join('')))
    .join('');
}
