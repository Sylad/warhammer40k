import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L252 : une URL de units.json est une URL seule. Relevé de L247 : le libellé de la source était
 * collé derrière l'URL (« https://…/Vindicare-Assassin — Imperial Agents… »), que `liens:externes`
 * aurait vérifiée telle quelle. Le libellé va dans un champ à part (`sourceFactionLibelle`).
 *
 * Refusé : toute chaîne qui commence par http(s):// et contient une espace, ou un caractère hors
 * de ceux qu'une URL admet (RFC 3986, `%` compris) — un tiret long ou un mot accentué collé au
 * chemin sans espace est donc refusé aussi.
 */
const URL_SEULE = /^https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]+$/;

function urlsMalFormees(donnees: unknown): { chemin: string; valeur: string }[] {
  const out: { chemin: string; valeur: string }[] = [];
  const visiter = (v: unknown, chemin: string): void => {
    if (typeof v === 'string') {
      if (/^\s*https?:\/\//i.test(v) && !URL_SEULE.test(v)) out.push({ chemin, valeur: v });
    } else if (Array.isArray(v)) v.forEach((x, i) => visiter(x, `${chemin}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visiter(x, chemin ? `${chemin}.${k}` : k);
  };
  visiter(donnees, '');
  return out;
}

describe('URL de units.json (L252)', () => {
  const units = JSON.parse(readFileSync(resolve(__dirname, '../../../seed/units.json'), 'utf8')) as unknown;

  it('aucune URL ne contient d\'espace ni de texte après son chemin', () => {
    expect(urlsMalFormees(units)).toEqual([]);
  });

  it('le contrôle refuse bien les formes relevées', () => {
    const bad = [
      'https://www.wahapedia.ru/wh40k11ed/factions/imperial-agents/Vindicare-Assassin — Imperial Agents',
      'https://exemple.org/page texte',
      'https://exemple.org/page—texte',
      'https://exemple.org/page\t',
      ' https://exemple.org/page',
      'http://exemple.org/pagé',
    ];
    expect(urlsMalFormees(bad.map((sourceFaction) => ({ sourceFaction }))).map((e) => e.valeur)).toEqual(bad);
    expect(urlsMalFormees([{ a: 'https://exemple.org/a?b=1&c=%20#d' }, { b: 'texte qui cite https://x.org' }])).toEqual([]);
  });

  it('chaque source de rattachement a son libellé à part', () => {
    for (const u of units as { id: string; sourceFaction?: string; sourceFactionLibelle?: string }[]) {
      if (u.sourceFaction) expect(u.sourceFactionLibelle?.trim(), u.id).toBeTruthy();
    }
  });
});
