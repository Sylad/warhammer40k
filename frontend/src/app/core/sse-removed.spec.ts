import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * L24 : le flux SSE /api/events a disparu côté backend. Le client SSE et le
 * bloc nginx dédié (proxy sans buffering, timeout 24 h) disparaissent avec lui.
 */
describe('flux SSE /api/events retiré (L24)', () => {
  const root = resolve(__dirname, '../../..');

  it('le service client SseService n’existe plus', () => {
    expect(existsSync(resolve(root, 'src/app/core/services/sse.service.ts'))).toBe(false);
  });

  it('nginx ne déclare plus de location dédiée à /api/events', () => {
    const conf = readFileSync(resolve(root, 'nginx.conf'), 'utf8');
    // le relais générique reste (« ^~ » : prioritaire sur le bloc des fichiers statiques)
    expect(conf).toMatch(/location (\^~ )?\/api\/ \{/);
    expect(conf).not.toMatch(/api\/events/);
  });
});
