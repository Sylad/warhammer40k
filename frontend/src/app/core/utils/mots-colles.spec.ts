import { describe, expect, it } from 'vitest';
import { htmlMotsColles, morceauxMotsColles } from './mots-colles';

describe('morceauxMotsColles — L253 passe 3', () => {
  it('isole le mot entre guillemets et espaces fines, garde le reste tel quel', () => {
    const t = '11e édition annoncée avec la boîte « Armageddon »';
    const m = morceauxMotsColles(t);
    expect(m.map((x) => x.texte).join('')).toBe(t);
    expect(m.filter((x) => x.mot).map((x) => x.texte)).toEqual(['Armageddon']);
  });

  it('plusieurs mots entre guillemets : seuls ceux qui touchent une espace insécable', () => {
    const m = morceauxMotsColles('la boîte « Dawn of War » et titre :');
    expect(m.filter((x) => x.mot).map((x) => x.texte)).toEqual(['Dawn', 'War', 'titre']);
  });

  it('sans espace insécable : un seul morceau', () => {
    expect(morceauxMotsColles('Troisième Guerre d’Armageddon')).toEqual([{ texte: 'Troisième Guerre d’Armageddon', mot: false }]);
    expect(morceauxMotsColles('')).toEqual([]);
  });
});

describe('htmlMotsColles — L253 passe 3', () => {
  it('ne touche ni aux balises ni aux entités, isole les mots collés du texte', () => {
    expect(htmlMotsColles('<li class="a">titre «\u202FIncontournables\u202F» &amp; <a href="/x">lien</a></li>'))
      .toBe('<li class="a">titre «\u202F<span>Incontournables</span>\u202F» &amp; <a href="/x">lien</a></li>');
    expect(htmlMotsColles('<p>rien</p>')).toBe('<p>rien</p>');
  });
});
