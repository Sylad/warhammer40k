/**
 * L23 — Angular sous Vitest (JIT, jsdom) pour les tests de composants.
 * À importer en tête d'un spec qui crée des composants avec TestBed.
 * Les feuilles `styleUrl` (.scss) sont résolues à vide : le JIT ne sait pas compiler
 * du SCSS ; ng build (et src/styles/component-styles.spec.ts) restent juges des styles.
 */
import '@angular/compiler';
import 'zone.js';
import 'zone.js/testing';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { JEUX_VIDEO_NOW } from '../app/features/jeux-video/jeux-video.component';

const KEY = Symbol.for('wh40k.testbed.ready');
const g = globalThis as Record<symbol, unknown>;
if (!g[KEY]) {
  TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  g[KEY] = true;
}

/** jsdom n'implémente pas <dialog> modal : open + événement close, comme un navigateur. */
export function polyfillDialog(): void {
  const proto = window.HTMLDialogElement.prototype;
  proto.showModal = function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  proto.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return;
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
}

/** Réponse fetch minimale pour les JSON servis en statique. */
export function stubFetch(files: Record<string, unknown>): void {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const key = Object.keys(files).find((k) => url.endsWith(k));
    if (!key) return { ok: false, status: 404, json: async () => null } as Response;
    return { ok: true, status: 200, json: async () => structuredClone(files[key]) } as Response;
  }) as typeof fetch;
}

/** Gabarits externes (`templateUrl`) : lus sur le disque par nom de fichier ; les feuilles de style restent vides. */
function gabarit(url: string): string {
  if (!url.endsWith('.html')) return '';
  const nom = basename(url);
  const cherche = (dir: string): string | null => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const chemin = join(dir, e.name);
      if (e.isDirectory()) { const r = cherche(chemin); if (r) return r; }
      else if (e.name === nom) return chemin;
    }
    return null;
  };
  const f = cherche(join(process.cwd(), 'src/app'));
  return f ? readFileSync(f, 'utf8') : '';
}

/** Configure TestBed pour `imports` ; les `styleUrl` (.scss) sont résolues à vide. */
export async function setupTestBed(imports: unknown[], providers: unknown[] = []): Promise<void> {
  TestBed.resetTestingModule();
  // Les pages chargées à la demande (loadComponent) n'existent qu'une fois importées : les charger
  // avant de résoudre les ressources, sinon leur `styleUrl` reste non résolu au premier createComponent.
  const { routes } = await import('../app/app.routes');
  const pages = routes.flatMap((r) => [r, ...(r.children ?? [])]);
  await Promise.all(pages.map((r) => (r.loadComponent as (() => Promise<unknown>) | undefined)?.()));
  await resolveComponentResources(async (url) => gabarit(url));
  TestBed.configureTestingModule({ imports: imports as never[], providers: [{ provide: JEUX_VIDEO_NOW, useValue: () => new Date(2026, 9, 12) }, ...providers] as never[] });
  await TestBed.compileComponents();
}
