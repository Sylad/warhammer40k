// L39 — vignettes « Médias » de la fiche faction : un champ `thumbnail` / `image` des données est
// tantôt une URL, tantôt une REQUÊTE du wiki ou un nom de fichier qui n'existe nulle part. Utilisé
// tel quel dans `url(...)`, le navigateur demandait « /Emperor%20of%20Mankind… » et
// « /ultramarines-brothers.jpg » : image cassée sur les 17 fiches faction.
import { describe, expect, it } from 'vitest';
import { createThumbResolver, isImageUrl, mediaThumbSource } from './media-thumb';

describe('isImageUrl', () => {
  it('n’accepte que les adresses absolues http(s) et les chemins de l’API', () => {
    expect(isImageUrl('https://static.wikia.nocookie.net/x.jpg')).toBe(true);
    expect(isImageUrl('/api/images/file/a.jpg')).toBe(true);
    expect(isImageUrl('Emperor of Mankind Golden Throne warhammer')).toBe(false);
    expect(isImageUrl('ultramarines-brothers.jpg')).toBe(false);
    expect(isImageUrl('')).toBe(false);
    expect(isImageUrl(undefined)).toBe(false);
  });
});

describe('mediaThumbSource', () => {
  it('vidéo : URL directe > requête du wiki > miniature YouTube d’une vidéo seule > rien', () => {
    expect(mediaThumbSource({ thumbnail: 'https://i.ytimg.com/vi/x/hq.jpg', embedId: 'x', embedType: 'video' }))
      .toEqual({ url: 'https://i.ytimg.com/vi/x/hq.jpg' });
    expect(mediaThumbSource({ thumbnail: 'Emperor of Mankind Golden Throne warhammer', embedId: 'PL1', embedType: 'playlist' }))
      .toEqual({ wikiQuery: 'Emperor of Mankind Golden Throne warhammer' });
    expect(mediaThumbSource({ embedId: 'abc', embedType: 'video' })).toEqual({ url: 'https://i.ytimg.com/vi/abc/hqdefault.jpg' });
    // Un identifiant de LISTE de lecture n'a pas de miniature à cette adresse.
    expect(mediaThumbSource({ embedId: 'PL1', embedType: 'playlist' })).toEqual({});
  });

  it('illustration : image locale servie par l’API > requête du wiki > rien (jamais le nom de fichier nu)', () => {
    expect(mediaThumbSource({ image: 'ultramarines-brothers.jpg', wikiQuery: 'Ultramarines brothers' }))
      .toEqual({ wikiQuery: 'Ultramarines brothers' });
    expect(mediaThumbSource({ image: 'ultramarines-brothers.jpg' })).toEqual({});
    expect(mediaThumbSource({ image: 'https://example.org/a.jpg' })).toEqual({ url: 'https://example.org/a.jpg' });
  });
});

describe('createThumbResolver (L39 : réponse en retard d’une autre faction)', () => {
  it('une réponse arrivée après un changement de fiche est ignorée', async () => {
    const { Subject } = await import('rxjs');
    const pending = new Map<string, InstanceType<typeof Subject<{ imageUrl: string | null }>>>();
    const fetchWiki = (q: string) => {
      const s = new Subject<{ imageUrl: string | null }>();
      pending.set(q, s);
      return s.asObservable();
    };
    let value: string | null = 'initial';
    const r = createThumbResolver(fetchWiki, (v) => (value = v));
    r.resolve({ wikiQuery: 'faction A' });
    r.resolve({ wikiQuery: 'faction B' });
    pending.get('faction B')!.next({ imageUrl: 'https://img/B.jpg' });
    pending.get('faction A')!.next({ imageUrl: 'https://img/A.jpg' }); // en retard : ignorée
    expect(value).toBe('https://img/B.jpg');
  });

  it('URL directe : posée tout de suite, et annule une requête en cours', async () => {
    const { Subject } = await import('rxjs');
    const s = new Subject<{ imageUrl: string | null }>();
    let value: string | null = null;
    const r = createThumbResolver(() => s.asObservable(), (v) => (value = v));
    r.resolve({ wikiQuery: 'q' });
    r.resolve({ url: 'https://img/direct.jpg' });
    s.next({ imageUrl: 'https://img/late.jpg' });
    expect(value).toBe('https://img/direct.jpg');
  });

  it('destroy() coupe la requête en cours', async () => {
    const { Subject } = await import('rxjs');
    const s = new Subject<{ imageUrl: string | null }>();
    let value: string | null = null;
    const r = createThumbResolver(() => s.asObservable(), (v) => (value = v));
    r.resolve({ wikiQuery: 'q' });
    r.destroy();
    s.next({ imageUrl: 'https://img/late.jpg' });
    expect(value).toBeNull();
  });
});
