import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WikiImageController } from './wiki-image.controller.js';
import { WikiImageService } from './wiki-image.service.js';
import { viderCacheWiki } from './fandom-lookup.js';

/**
 * L238 r3 — une panne de Fandom n'est pas « le wiki n'a pas d'image » : `GET /api/wiki-image` répond
 * `erreur: true` quand la recherche a échoué, et `imageUrl: null` seul quand le wiki a répondu sans image.
 */
const json = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { 'content-type': 'application/json' } });
const SANS_IMAGE = { query: { pages: { '-1': { title: 'X', missing: '' } } } };
const AVEC_IMAGE = { query: { pages: { '7': { title: 'Roboute Guilliman', thumbnail: { source: 'https://static.wikia.nocookie.net/g.jpg' } } } } };

describe('wiki-image : panne de Fandom distinguée d\'une absence (L238 r3)', () => {
  const ctrl = new WikiImageController(new WikiImageService());
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    viderCacheWiki();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('ECONNRESET : erreur signalée, pas une absence', async () => {
    fetchMock.mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET' } }));
    expect(await ctrl.getImage('Guilliman')).toEqual({ imageUrl: null, pageTitle: null, pageUrl: null, erreur: true });
  });

  it('429 avec une page HTML : erreur signalée, pas une absence', async () => {
    fetchMock.mockImplementation(async () => new Response('<!DOCTYPE html><html><body>Too Many Requests</body></html>', { status: 429, headers: { 'content-type': 'text/html' } }));
    expect(await ctrl.getImage('Guilliman')).toEqual({ imageUrl: null, pageTitle: null, pageUrl: null, erreur: true });
  });

  it('200 avec une page HTML (défi anti-robot) : erreur signalée', async () => {
    fetchMock.mockImplementation(async () => new Response('<html>Just a moment…</html>', { status: 200, headers: { 'content-type': 'text/html' } }));
    expect((await ctrl.getImage('Guilliman')).erreur).toBe(true);
  });

  it('503 avec un corps JSON : erreur signalée (le statut compte, pas seulement le corps)', async () => {
    fetchMock.mockImplementation(async () => json({ error: 'unavailable' }, 503));
    expect((await ctrl.getImage('Guilliman')).erreur).toBe(true);
  });

  it('délai dépassé : erreur signalée', async () => {
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted due to timeout', 'TimeoutError'));
    expect((await ctrl.getImage('Guilliman')).erreur).toBe(true);
  });

  it('panne pendant la recherche de repli (la page directe a répondu sans image) : erreur signalée', async () => {
    fetchMock.mockImplementationOnce(async () => json(SANS_IMAGE)).mockRejectedValue(new TypeError('fetch failed'));
    expect((await ctrl.getImage('Guilliman')).erreur).toBe(true);
  });

  it('une panne n\'est pas gardée en cache : la recherche suivante aboutit', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect((await ctrl.getImage('Guilliman')).erreur).toBe(true);
    fetchMock.mockImplementation(async () => json(AVEC_IMAGE));
    const r = await ctrl.getImage('Guilliman');
    expect(r.imageUrl).toBe('https://static.wikia.nocookie.net/g.jpg');
    expect(r).not.toHaveProperty('erreur');
  });

  it('le wiki répond sans image : imageUrl null SANS champ erreur, et la réponse est gardée en cache', async () => {
    fetchMock.mockImplementation(async (url) =>
      json(String(url).includes('list=search') ? { query: { search: [] } } : SANS_IMAGE));
    const r = await ctrl.getImage('Introuvable');
    expect(r).toEqual({ imageUrl: null, pageTitle: null, pageUrl: null });
    const appels = fetchMock.mock.calls.length;
    expect(await ctrl.getImage('Introuvable')).toEqual(r);
    expect(fetchMock.mock.calls.length).toBe(appels);
  });
});
