// L238 — crédit d'une image déduit de son adresse : chaque source réelle recensée, rien de deviné.
import { describe, expect, it } from 'vitest';
import { adressesImages, creditDeclare, creditImage, SOURCES_IMAGES } from './credit-image';

const SITE = 'https://warhammer.sladoire.dev';

describe('creditImage (L238)', () => {
  it('miniature du Warhammer 40k Wiki : © Games Workshop, fichier et lien vers sa page File:', () => {
    const c = creditImage('https://static.wikia.nocookie.net/warhammer40k/images/3/36/Orks_symbol.png/revision/latest/scale-to-width-down/120', SITE)!;
    expect(c.source).toBe('fandom');
    expect(c.texte).toBe('Illustration © Games Workshop — via le Warhammer 40k Wiki (Fandom), fichier « Orks symbol.png »');
    expect(c.lien).toBe('https://warhammer40k.fandom.com/wiki/File:Orks_symbol.png');
  });

  it('nom de fichier encodé (T%27au) : décodé pour le texte, gardé tel quel dans le lien', () => {
    const c = creditImage('https://static.wikia.nocookie.net/warhammer40k/images/f/f0/T%27au_Empire_Icon.png/revision/latest', SITE)!;
    expect(c.detail).toBe('T\'au Empire Icon.png');
    expect(c.lien).toBe('https://warhammer40k.fandom.com/wiki/File:T%27au_Empire_Icon.png');
  });

  it('fiche technique, portrait local, collection personnelle, import : sources locales distinctes', () => {
    expect(creditImage('/api/images/datasheets/sm-captain', SITE)).toMatchObject({ source: 'fiche', texte: 'Fiche technique © Games Workshop' });
    expect(creditImage(`${SITE}/api/images/portraits/inq-ravenor`, SITE)!.source).toBe('portrait');
    expect(creditImage('/api/images/file/abc.jpg', SITE)!.source).toBe('perso');
    expect(creditImage('/api/images/imported/1a2b.png', SITE)!.source).toBe('import');
  });

  it('miniature YouTube : © la chaîne, lien vers la vidéo', () => {
    for (const host of ['i.ytimg.com', 'img.youtube.com']) {
      const c = creditImage(`https://${host}/vi/dQw4w9WgXcQ/hqdefault.jpg`, SITE)!;
      expect(c.source).toBe('youtube');
      expect(c.lien).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    }
  });

  it('carte de la galaxie : © Games Workshop', () => {
    expect(creditImage('/galaxy-map.jpg', SITE)!.source).toBe('carte');
  });

  it('images produites par le site (captures des Nouveautés, favicon, data:) : aucun crédit', () => {
    expect(creditImage('/nouveautes-data/captures/x.png', SITE)).toBeNull();
    expect(creditImage('/favicon.svg', SITE)).toBeNull();
    expect(creditImage('data:image/png;base64,AAAA', SITE)).toBeNull();
  });

  it('autre site : signalé comme source non identifiée, avec son hôte (jamais deviné)', () => {
    expect(creditImage('https://i.imgur.com/abc.jpg', SITE)).toMatchObject({ source: 'externe', detail: 'i.imgur.com', texte: 'Image de i.imgur.com — source non identifiée' }); // i.redd.it : source Reddit (r1)
  });

  it('chaque source a un nom et des droits', () => {
    for (const s of Object.values(SOURCES_IMAGES)) {
      expect(s.nom.length).toBeGreaterThan(0);
      expect(s.droits.length).toBeGreaterThan(0);
    }
  });
});

describe('adressesImages (L238)', () => {
  it('src d’une img, url(…) d’un fond et d’une variable CSS', () => {
    const img = document.createElement('img');
    img.setAttribute('src', '/api/images/datasheets/a');
    expect(adressesImages(img)).toEqual(['/api/images/datasheets/a']);
    const div = document.createElement('div');
    div.style.backgroundImage = "url('https://i.ytimg.com/vi/x/hqdefault.jpg')";
    div.style.setProperty('--art', 'url(/galaxy-map.jpg)');
    expect(adressesImages(div)).toEqual(expect.arrayContaining(['https://i.ytimg.com/vi/x/hqdefault.jpg', '/galaxy-map.jpg']));
  });
});

describe('crédit — r1 (L238)', () => {
  it('r2 — droits de la source Reddit : l’aperçu nomme le compte qui a publié, pas « l’auteur » de l’image', () => {
    const d = SOURCES_IMAGES.reddit.droits;
    expect(d).toContain('nomme le compte qui a publié l’image, pas forcément son auteur');
    expect(d).not.toContain('nomme l’auteur');
  });

  it('aperçu Reddit (i.redd.it, preview.redd.it) : source Reddit, auteur non lisible dans l’adresse (rien deviné)', () => {
    for (const a of ['https://i.redd.it/abc.jpg', 'https://preview.redd.it/x.png?width=640']) {
      const c = creditImage(a)!;
      expect(c.source).toBe('reddit');
      expect(c.texte).toBe('Image publiée sur Reddit — auteur non lisible dans l’adresse');
      expect(c.lien).toBeUndefined();
    }
  });

  it('crédit déclaré par l’élément : remplace texte, lien, détail et source ; sans data-credit-texte, rien ne change', () => {
    const el = document.createElement('div');
    const deduit = creditImage('https://example.org/a.jpg')!;
    expect(creditDeclare(el, deduit)).toBe(deduit);
    el.dataset['creditTexte'] = 'Image publiée sur Reddit par u/x';
    el.dataset['creditSource'] = 'reddit';
    el.dataset['creditLien'] = 'https://reddit.com/r/a/comments/1/';
    expect(creditDeclare(el, deduit)).toEqual({ source: 'reddit', texte: 'Image publiée sur Reddit par u/x', detail: 'example.org', lien: 'https://reddit.com/r/a/comments/1/' });
    el.dataset['creditSource'] = 'inconnue';
    expect(creditDeclare(el, deduit).source).toBe('externe');
  });
});
