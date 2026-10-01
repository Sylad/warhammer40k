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

/** Configure TestBed pour `imports` ; les `styleUrl` (.scss) sont résolues à vide. */
export async function setupTestBed(imports: unknown[], providers: unknown[] = []): Promise<void> {
  TestBed.resetTestingModule();
  await resolveComponentResources(async () => '');
  TestBed.configureTestingModule({ imports: imports as never[], providers: providers as never[] });
  await TestBed.compileComponents();
}
