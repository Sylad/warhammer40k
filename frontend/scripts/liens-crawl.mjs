#!/usr/bin/env node
// L39 — parcours de l'application EN MARCHE (ng serve + backend locaux) : suit une fois chaque lien
// interne depuis « / », relève les destinations introuvables (redirection « ** » vers /factions,
// appel d'API en erreur, page restée vide), les ancres absentes, les images locales en échec, les
// erreurs de console, et mesure la densité (hauteur en écrans, liens, titres) d'une page par gabarit.
//
//   cd frontend && npm run liens:crawl -- [--base http://localhost:4201] [--out <fichier.json>] [--max N]
//
// Prérequis : backend sur :3001 (`PORT=3001 npm run dev:backend` à la racine) et `npm run dev:frontend`
// (:4201, build de développement : le parcours lit les directives RouterLink via `window.ng`).
// Rien ne sort vers Internet : les requêtes externes sont coupées et `/api/wiki-image` répond
// « pas d'image » (les requêtes Fandom sont vérifiées à part, avec ménagement, par liens-externes.mjs).
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { inventory, matchRoute, readRoutes } from './liens-lib.mjs';

const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const BASE = arg('--base', 'http://localhost:4201');
const OUT = arg('--out', new URL('../../../tmp/wh-liens-crawl.json', import.meta.url).pathname);
const MAX = Number(arg('--max', '5000'));
const CONCURRENCY = 3;

const routes = readRoutes();
const origin = new URL(BASE).origin;

/** Chemin normalisé (sans requête ni ancre) d'une URL interne. */
function pathOf(u) {
  const url = new URL(u, BASE);
  return decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
}

const queue = ['/'];
const seen = new Set(['/']);
// Pages liées seulement derrière une interaction (élément déplié, palette Ctrl+K, popup de la carte) :
// l'inventaire statique fournit leurs adresses, le parcours les visite aussi.
if (!process.argv.includes('--sans-inventaire')) {
  for (const l of inventory()) {
    if (l.cls !== 'route' || l.dynamic || !l.target.startsWith('/') || l.target.includes(':')) continue;
    const p = l.target.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
    if (!seen.has(p)) {
      seen.add(p);
      queue.push(p);
    }
  }
}
const pages = new Map(); // path -> résultat
const links = []; // { from, to, kind, text, raw }
const densityDone = new Set();

const browser = await chromium.launch();

async function newPage(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (!u.startsWith(origin) && !u.startsWith('http://localhost:3001')) return route.abort();
    if (u.includes('/api/wiki-image')) {
      return route.fulfill({ json: { imageUrl: null, pageTitle: null, pageUrl: null } });
    }
    return route.continue();
  });
  // La pastille des nouveautés et le plan n'influent pas sur les liens : rien à préparer.
  return ctx.newPage();
}

async function settle(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 12000 });
  } catch {
    /* page qui ne s'apaise pas : on mesure quand même */
  }
  await page.waitForTimeout(250);
}

/** Lecture des liens et de l'état de la page, dans le navigateur. */
function collect() {
  const ng = window.ng;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    let dirs = [];
    try {
      dirs = ng ? ng.getDirectives(el) : [];
    } catch {
      dirs = [];
    }
    const rl = dirs.find((d) => d && d.constructor && /RouterLink(?!Active)/.test(d.constructor.name) && 'urlTree' in d);
    const text = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (rl) {
      const t = rl.urlTree;
      if (t) out.push({ kind: 'router', url: t.toString(), tag: el.tagName.toLowerCase(), text });
      continue;
    }
    if (el.tagName === 'A' && el.hasAttribute('href')) {
      let listeners = [];
      try {
        listeners = ng ? ng.getListeners(el).map((l) => l.name) : [];
      } catch {
        listeners = [];
      }
      out.push({ kind: 'href', raw: el.getAttribute('href'), url: el.href, listeners, text });
    }
  }
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  const main = document.querySelector('main') || document.body;
  const headings = [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => h.offsetParent !== null);
  const loading = [...document.querySelectorAll('.loading, .spinner, [aria-busy="true"]')].filter((e) => e.offsetParent !== null).map((e) => e.textContent.trim().slice(0, 60));
  return {
    links: out,
    ids,
    title: document.title,
    h1: [...document.querySelectorAll('h1')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()).slice(0, 3),
    headings: headings.length,
    textLength: main.innerText.trim().length,
    loading,
    height: document.documentElement.scrollHeight,
    anchorsVisible: [...main.querySelectorAll('a')].filter((a) => a.offsetParent !== null).length,
  };
}

async function visit(page, path) {
  const apiErrors = [];
  const imgErrors = [];
  const consoleErrors = [];
  const onResp = (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith('http://localhost:3001')) return;
    const st = r.status();
    const rt = r.request().resourceType();
    // Image « servie » en 200 par le repli de l'application (index.html) : URL d'image fausse.
    const ct = r.headers()['content-type'] ?? '';
    if (rt === 'image' && st < 400 && r.request().method() === 'GET' && ct && !ct.startsWith('image/')) {
      imgErrors.push({ url: u.replace(/^https?:\/\/[^/]+/, ''), status: `${st} ${ct.split(';')[0]}` });
      return;
    }
    if (st < 400) return;
    if (u.includes('/api/')) apiErrors.push({ url: u.replace(/^https?:\/\/[^/]+/, ''), status: st, method: r.request().method() });
    else if (rt === 'image') imgErrors.push({ url: u.replace(/^https?:\/\/[^/]+/, ''), status: st });
  };
  const onFail = (req) => {
    const u = req.url();
    if (!u.startsWith(origin) && !u.startsWith('http://localhost:3001')) return;
    if (req.resourceType() === 'image') imgErrors.push({ url: u.replace(/^https?:\/\/[^/]+/, ''), status: 'failed' });
  };
  const onConsole = (m) => {
    // ERR_FAILED = requête externe coupée volontairement par ce parcours : pas une erreur du site.
    if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) consoleErrors.push(m.text().slice(0, 200));
  };
  page.on('response', onResp);
  page.on('requestfailed', onFail);
  page.on('console', onConsole);
  let status = null;
  try {
    const resp = await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    status = resp ? resp.status() : null;
  } catch (e) {
    status = 'error: ' + e.message.slice(0, 80);
  }
  await settle(page);
  let info;
  try {
    info = await page.evaluate(collect);
  } catch (e) {
    info = { links: [], ids: [], error: e.message };
  }
  page.off('response', onResp);
  page.off('requestfailed', onFail);
  page.off('console', onConsole);
  const finalPath = pathOf(page.url());
  return { path, status, finalPath, apiErrors, imgErrors, consoleErrors, ...info };
}

async function density(path) {
  const out = {};
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await newPage(w, h);
    try {
      await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await settle(p);
      const m = await p.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const vis = (e) => e.offsetParent !== null;
        const isLink = (e) => e.tagName === 'A' || (window.ng?.getDirectives(e) ?? []).some((d) => /RouterLink(?!Active)/.test(d?.constructor?.name ?? ''));
        return {
          height: document.documentElement.scrollHeight,
          links: [...main.querySelectorAll('*')].filter((e) => vis(e) && isLink(e)).length,
          headings: [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).length,
        };
      });
      out[w] = { ...m, screens: Math.round((m.height / h) * 10) / 10 };
    } finally {
      await p.context().close();
    }
  }
  return out;
}

const workers = [];
for (let i = 0; i < CONCURRENCY; i++) workers.push(newPage(1440, 900));
const workerPages = await Promise.all(workers);

let active = 0;
async function run(page) {
  for (;;) {
    const path = queue.shift();
    if (path === undefined) {
      if (active === 0) return;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    }
    if (pages.size >= MAX) return;
    active++;
    const res = await visit(page, path);
    const route = matchRoute(routes, path);
    res.route = route ? route.path : null;
    pages.set(path, res);
    for (const l of res.links ?? []) {
      let to;
      try {
        const url = new URL(l.url, BASE);
        if (url.origin !== origin) {
          links.push({ from: path, to: l.url, kind: 'external', text: l.text });
          continue;
        }
        to = pathOf(l.url);
        links.push({ from: path, to, hash: decodeURIComponent(url.hash.slice(1)), query: url.search, kind: l.kind, raw: l.raw, listeners: l.listeners, tag: l.tag, text: l.text });
      } catch {
        links.push({ from: path, to: l.url, kind: 'invalid', text: l.text });
        continue;
      }
      // Fichiers servis tels quels (captures, données) : vérifiés par requête, pas parcourus.
      if (/\.[a-z0-9]{2,5}$/i.test(to)) continue;
      if (!seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
    if (res.route && !densityDone.has(res.route)) {
      densityDone.add(res.route);
      res.density = await density(path);
    }
    active--;
    if (pages.size % 25 === 0) process.stderr.write(`… ${pages.size} pages, ${queue.length} en file\n`);
  }
}

await Promise.all(workerPages.map(run));

// Fichiers servis tels quels liés depuis les pages (captures des nouveautés…).
const files = [...new Set(links.filter((l) => l.kind !== 'external' && /\.[a-z0-9]{2,5}$/i.test(l.to ?? '')).map((l) => l.to))];
const fileStatus = {};
for (const f of files) {
  const r = await fetch(BASE + f, { method: 'GET' });
  fileStatus[f] = r.status;
}

await browser.close();
const result = { base: BASE, date: new Date().toISOString(), pages: [...pages.values()], links, fileStatus };
writeFileSync(OUT, JSON.stringify(result, null, 1));
console.log(`${pages.size} pages, ${links.length} liens relevés → ${OUT}`);
