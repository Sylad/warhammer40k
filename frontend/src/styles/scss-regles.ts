/**
 * L253 passe 3 — lecture minimale d'une feuille SCSS pour les gardes de style : commentaires retirés, règles
 * imbriquées aplaties (sélecteur parent + enfant, `&` remplacé), une entrée par sélecteur simple (liste à virgules
 * dépliée, `:is(a, b)` déplié) et par déclaration. Les at-règles (`@media`, `@supports`) sont rendues avec
 * leur condition ; `@use`, `@include` et les variables sont ignorés.
 */
export interface Declaration {
  media: string;
  selecteur: string;
  propriete: string;
  valeur: string;
}

function sansCommentaires(scss: string): string {
  return scss.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Découpe une liste de sélecteurs aux virgules de premier niveau. */
export function deplier(liste: string): string[] {
  const out: string[] = [];
  let prof = 0;
  let cur = '';
  for (const c of liste) {
    if (c === '(') prof++;
    if (c === ')') prof--;
    if (c === ',' && prof === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  // `a :is(b, c) d` → `a b d`, `a c d`
  return out.flatMap((s) => {
    const m = /^(.*?):is\(([^()]*)\)(.*)$/.exec(s);
    return m ? deplier(m[2]).flatMap((x) => deplier(`${m[1]}${x}${m[3]}`.trim())) : [s];
  });
}

function combiner(parents: string[], enfants: string[]): string[] {
  if (!parents.length) return enfants;
  return parents.flatMap((p) => enfants.map((e) => (e.includes('&') ? e.replace(/&/g, p) : `${p} ${e}`).replace(/\s+/g, ' ').trim()));
}

export function declarations(scss: string): Declaration[] {
  const texte = sansCommentaires(scss);
  const out: Declaration[] = [];
  const bloc = (debut: number, selecteurs: string[], media: string): number => {
    let i = debut;
    let tampon = '';
    while (i < texte.length) {
      const c = texte[i];
      if (c === '{') {
        const tete = tampon.trim();
        tampon = '';
        if (tete.startsWith('@media') || tete.startsWith('@supports')) i = bloc(i + 1, selecteurs, [media, tete].filter(Boolean).join(' '));
        else if (tete.startsWith('@')) i = bloc(i + 1, selecteurs, media);
        else i = bloc(i + 1, combiner(selecteurs, deplier(tete)), media);
        continue;
      }
      if (c === '}') {
        const d = tampon.trim();
        if (d) ajouter(d, selecteurs, media);
        return i + 1;
      }
      if (c === ';') {
        ajouter(tampon.trim(), selecteurs, media);
        tampon = '';
        i++;
        continue;
      }
      tampon += c;
      i++;
    }
    return i;
  };
  const ajouter = (d: string, selecteurs: string[], media: string) => {
    const m = /^([a-z-]+)\s*:\s*([\s\S]+)$/.exec(d);
    if (!m || d.startsWith('@') || d.startsWith('$')) return;
    for (const s of selecteurs) out.push({ media, selecteur: s, propriete: m[1], valeur: m[2].replace(/\s+/g, ' ').trim() });
  };
  bloc(0, [], '');
  return out;
}
