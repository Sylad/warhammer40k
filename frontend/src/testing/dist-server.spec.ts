// @vitest-environment node
// L52 — le serveur des specs navigateur répond comme nginx.conf (L51) : un fichier de
// ressource absent est un 404, jamais le repli HTML ; une route de l'application garde le repli.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { DIST, startDistServer } from './dist-server';
import { existsSync } from 'node:fs';

describe.skipIf(!existsSync(`${DIST}/index.html`))('dist-server (L52)', () => {
  let base = '';
  let server: Server;
  beforeAll(async () => ({ base, server } = await startDistServer()));
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it.each(['/chunk-00000000.js', '/absent.css', '/ABSENT.JS', '/media/absent-00000000.woff2', '/assets/absent.svg', '/nouveautes-data/absent.json', '/lore/primarchs/absent.js', '/absent.js?v=1'])(
    'R1 — %s absent : 404, pas le repli HTML',
    async (path) => {
      const res = await fetch(base + path);
      expect(res.status).toBe(404);
      expect(res.headers.get('content-type') ?? '').not.toContain('text/html');
      expect(res.headers.get('cache-control')).toBe('no-store');
    },
  );

  it.each(['/', '/factions', '/units/mk.iv', '/route/inconnue'])('R2 — la route %s garde le repli index.html en 200', async (path) => {
    const res = await fetch(base + path);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('R3 — un fichier présent est servi en 200', async () => {
    const res = await fetch(base + '/index.html');
    expect(res.status).toBe(200);
  });

  it('R4 — /api/ n’est pas touché par la règle des extensions', async () => {
    const res = await fetch(base + '/api/absent.js');
    expect(res.status).toBe(200);
  });
});
