#!/usr/bin/env node
// L39 — vérification À LA DEMANDE des liens externes du site (jamais en CI : le réseau rend un test
// instable). Avec ménagement : 2 requêtes simultanées au plus, 1,5 s entre deux requêtes vers le
// même hôte, agent utilisateur de navigateur, délai de 15 s, une seule reprise.
//
//   cd frontend && npm run liens:externes -- [--out <fichier.json>] [--wiki <url du backend>]
//
// Classes : ok, redirige (URL finale relevée), mort (404/410/nom de domaine inconnu, vidéo absente),
// invérifiable (403/429/5xx ou délai : sites qui filtrent les robots — pas une preuve de mort).
// Vidéos YouTube : point d'accès public oEmbed (404/400 = vidéo ou liste supprimée ou privée).
// `--wiki http://localhost:3001` : résout aussi chaque requête d'image `wikiQuery` des données via
// le proxy du backend local (qui interroge Fandom) et relève celles qui ne donnent aucune image.
import { writeFileSync } from 'node:fs';
import { apiAssets, inventory, loadSeed } from './liens-lib.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const OUT = arg('--out', new URL('../../../tmp/wh-liens-externes.json', import.meta.url).pathname);
const WIKI = arg('--wiki', null);
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const HOST_DELAY = 1500;
const TIMEOUT = 15000;
const CONCURRENCY = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastHit = new Map();
async function politeFetch(url, init = {}) {
  const host = new URL(url).host;
  for (;;) {
    const wait = (lastHit.get(host) ?? 0) + HOST_DELAY - Date.now();
    if (wait <= 0) break;
    await sleep(wait);
  }
  lastHit.set(host, Date.now());
  return fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT),
    ...init,
    headers: {
      'user-agent': UA,
      'accept-language': 'fr-FR,fr;q=0.9,en;q=0.8',
      accept: 'text/html,application/xhtml+xml,application/json,image/*;q=0.9,*/*;q=0.8',
      // Consentement YouTube / Google pré-accepté : sinon toute page renvoie vers consent.youtube.com.
      cookie: 'SOCS=CAI; CONSENT=YES+',
      // Les images de Fandom refusent les requêtes sans page d'origine (comme le navigateur du visiteur en envoie une).
      ...(host === 'static.wikia.nocookie.net' ? { referer: 'https://warhammer.sladoire.dev/' } : {}),
      ...(init.headers ?? {}),
    },
  });
}

function youtubeKind(url) {
  const u = new URL(url);
  if (!/(^|\.)youtube\.com$|^youtu\.be$/.test(u.hostname)) return null;
  if (u.hostname === 'youtu.be' || u.pathname === '/watch' || u.pathname === '/playlist') return 'oembed';
  return 'page';
}

/** Une vérification, avec une reprise. */
async function check(url) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (youtubeKind(url) === 'oembed') {
        const r = await politeFetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`);
        if (r.ok) {
          const j = await r.json();
          return { url, status: r.status, cls: 'ok', title: j.title };
        }
        if (r.status === 401) return { url, status: 401, cls: 'ok', note: 'existe, intégration désactivée' };
        if (r.status === 404 || r.status === 400) return { url, status: r.status, cls: 'mort', note: 'oEmbed : vidéo ou liste supprimée / privée' };
        last = { url, status: r.status, cls: 'invérifiable' };
      } else {
        let r = await politeFetch(url, { method: 'HEAD' });
        // Beaucoup de serveurs refusent HEAD (405/403/404 trompeur) : on confirme en GET.
        if (!r.ok) r = await politeFetch(url, { method: 'GET' });
        const final = r.url;
        const body = r.ok && youtubeKind(url) === 'page' ? await r.text() : '';
        if (r.ok && /consent\.(youtube|google)\.com/.test(final)) return { url, status: r.status, cls: 'invérifiable', note: 'page de consentement' };
        if (r.ok && youtubeKind(url) === 'page' && /"isUnavailable"|This channel does not exist|Cette chaîne n'existe pas/.test(body)) {
          return { url, status: r.status, cls: 'mort', note: 'chaîne inexistante' };
        }
        if (r.ok) {
          const same = (a, b) => a.replace(/\/$/, '') === b.replace(/\/$/, '');
          return same(final, url) ? { url, status: r.status, cls: 'ok' } : { url, status: r.status, cls: 'redirige', final };
        }
        if (r.status === 404 || r.status === 410) return { url, status: r.status, cls: 'mort' };
        last = { url, status: r.status, cls: 'invérifiable', note: r.headers.get('server') ?? undefined };
      }
    } catch (e) {
      const code = e?.cause?.code ?? e?.name;
      if (code === 'ENOTFOUND') return { url, status: 'DNS', cls: 'mort', note: 'nom de domaine inconnu' };
      last = { url, status: code ?? 'erreur', cls: 'invérifiable', note: String(e?.message ?? e).slice(0, 80) };
    }
    await sleep(2000);
  }
  return last;
}

async function pool(items, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
      process.stderr.write(`\r${out.filter(Boolean).length}/${items.length}`);
    }
  }));
  process.stderr.write('\n');
  return out;
}

const inv = inventory();
const sources = new Map();
for (const l of inv.filter((l) => l.cls === 'external' && !l.dynamic)) {
  sources.set(l.target, [...(sources.get(l.target) ?? []), l.source]);
}
const urls = [...sources.keys()];

// Pages du wiki Fandom : les pages HTML sont derrière Cloudflare (403 aux scripts), mais l'API
// MediaWiki publique répond — 50 titres par requête, redirections résolues.
const FANDOM = /^https:\/\/warhammer40k\.fandom\.com\/wiki\/(.+)$/;
async function checkFandom(list) {
  const out = [];
  for (let i = 0; i < list.length; i += 50) {
    const batch = list.slice(i, i + 50);
    const titles = batch.map((u) => decodeURIComponent(FANDOM.exec(u)[1]).replace(/_/g, ' '));
    const r = await politeFetch(`https://warhammer40k.fandom.com/api.php?action=query&format=json&redirects=1&titles=${encodeURIComponent(titles.join('|'))}`);
    const j = await r.json();
    const q = j.query ?? {};
    const norm = new Map((q.normalized ?? []).map((n) => [n.from, n.to]));
    const redir = new Map((q.redirects ?? []).map((n) => [n.from, n.to]));
    const pages = new Map(Object.values(q.pages ?? {}).map((p) => [p.title, p]));
    batch.forEach((u, k) => {
      const t0 = norm.get(titles[k]) ?? titles[k];
      const t = redir.get(t0) ?? t0;
      const page = pages.get(t);
      if (!page || 'missing' in page) out.push({ url: u, status: 'API', cls: 'mort', note: 'page absente du wiki (API MediaWiki)' });
      else if (t !== t0) out.push({ url: u, status: 'API', cls: 'redirige', final: `https://warhammer40k.fandom.com/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}`, note: 'redirection du wiki' });
      else out.push({ url: u, status: 'API', cls: 'ok' });
    });
  }
  return out;
}
const fandom = await checkFandom(urls.filter((u) => FANDOM.test(u)));
const others = await pool(urls.filter((u) => !FANDOM.test(u)), check);
const results = [...fandom, ...others].map((r) => ({ ...r, sources: sources.get(r.url) }));

let wiki = null;
if (WIKI) {
  const data = loadSeed();
  const primary = new Map();
  for (const [name, list] of Object.entries(data)) {
    (Array.isArray(list) ? list : [list]).forEach((rec) => {
      if (rec && typeof rec.wikiQuery === 'string' && !primary.has(rec.wikiQuery)) primary.set(rec.wikiQuery, `backend/seed/${name}.json#${rec.id}`);
    });
  }
  const all = apiAssets(data).filter((a) => a.kind === 'wiki-image').length;
  const qs = [...primary.keys()];
  const res = await pool(qs, async (q) => {
    await sleep(500);
    try {
      const r = await fetch(`${WIKI}/api/wiki-image?q=${encodeURIComponent(q)}`, { signal: AbortSignal.timeout(60000) });
      const j = await r.json();
      return { query: q, source: primary.get(q), imageUrl: j.imageUrl, page: j.pageTitle };
    } catch (e) {
      return { query: q, source: primary.get(q), error: String(e?.message ?? e).slice(0, 80) };
    }
  });
  wiki = { totalQueries: all, checked: qs.length, results: res };
}

writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), results, wiki }, null, 1));
const count = {};
for (const r of results) count[r.cls] = (count[r.cls] ?? 0) + 1;
console.log(`${urls.length} URL externes uniques :`, count);
if (wiki) console.log(`images du wiki : ${wiki.checked} requêtes vérifiées, ${wiki.results.filter((r) => !r.imageUrl).length} sans image`);
console.log(`→ ${OUT}`);
