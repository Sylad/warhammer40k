/**
 * L31/L32/L42 — serveur de test pour les specs navigateur (`*.e2e.spec.ts`, environnement node) :
 * sert l'application construite (dist) et une API bouchonnée tirée de `backend/seed` (lecture
 * seule, aucune requête externe ; `/api/wiki-image` répond « pas d'image »).
 */
import { createServer, type Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

export const FRONTEND = resolve(__dirname, '../..');
export const DIST = join(FRONTEND, 'dist/frontend/browser');
const SEED = resolve(FRONTEND, '../backend/seed');

/** Vrai si l'application est construite ET plus récente que chacune des sources données. */
export function distState(sources: string[]): { built: boolean; stale: boolean } {
  const index = join(DIST, 'index.html');
  const built = existsSync(index);
  const stale = built && sources.some((s) => statSync(join(FRONTEND, s)).mtimeMs > statSync(index).mtimeMs);
  return { built, stale };
}

const COLLECTIONS: Record<string, string> = {
  factions: 'factions.json',
  subfactions: 'subfactions.json',
  units: 'units.json',
  series: 'series.json',
  videos: 'videos.json',
  channels: 'channels.json',
  artworks: 'artworks.json',
  'artwork-collections': 'artwork-collections.json',
  'timeline-events': 'timeline-events.json',
  lore: 'lore-feed.json',
  'lore/all': 'lore-feed.json',
  'lore/emperor': 'emperor.json',
  'lore/primarchs': 'primarchs.json',
  'lore/chaos-gods': 'chaos-gods.json',
  'lore/imperial-orgs': 'imperial-orgs.json',
  'lore/concepts': 'lore-concepts.json',
  'lore/equipment': 'equipment.json',
  'lore/ships': 'legendary-ships.json',
  'lore/god-machines': 'god-machines.json',
  'lore/saints': 'living-saints.json',
};
const OBJECTS = ['demo', 'wiki-image', 'image-meta'];
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const cache = new Map<string, unknown>();
function seed(file: string): unknown {
  if (!cache.has(file)) cache.set(file, JSON.parse(readFileSync(join(SEED, file), 'utf8')));
  return cache.get(file);
}

function api(path: string, query: URLSearchParams): [number, unknown] {
  const p = path.replace(/^\/api\//, '').replace(/\/$/, '');
  if (OBJECTS.some((o) => p === o || p.startsWith(o + '/'))) return [200, p.startsWith('wiki-image') ? { imageUrl: null } : {}];
  if (COLLECTIONS[p]) {
    let data = seed(COLLECTIONS[p]);
    const fid = query.get('factionId');
    if (fid && Array.isArray(data)) data = data.filter((x: { factionId?: string }) => x.factionId === fid);
    return [200, data];
  }
  const m = /^(.*)\/([^/]+)$/.exec(p);
  if (m && COLLECTIONS[m[1]]) {
    const item = (seed(COLLECTIONS[m[1]]) as { id: string }[]).find((x) => x.id === m[2]);
    return item ? [200, item] : [404, { statusCode: 404 }];
  }
  return [200, []];
}

export async function startDistServer(): Promise<{ base: string; server: Server }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url!, 'http://x');
    const path = normalize(decodeURIComponent(url.pathname));
    if (path.startsWith('/api/')) {
      const [status, body] = api(path, url.searchParams);
      res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(body));
      return;
    }
    let file = join(DIST, path);
    if (path.includes('..') || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  return { base: `http://127.0.0.1:${(server.address() as { port: number }).port}`, server };
}
