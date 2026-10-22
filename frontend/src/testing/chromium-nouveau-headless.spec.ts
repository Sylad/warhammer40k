import { afterEach, describe, expect, it, vi } from 'vitest';
import { chromium } from 'playwright-core';

// L165 — le setup de `vitest.e2e.config.ts` impose le canal `chromium` aux seuls lancements qui n'en choisissent pas.
const reel = chromium.launch;

async function lancerAvecSetup(options?: Record<string, unknown>) {
  const appels: unknown[] = [];
  chromium.launch = (async (o: unknown) => { appels.push(o); }) as unknown as typeof chromium.launch;
  vi.resetModules();
  await import('./chromium-nouveau-headless');
  await (chromium.launch as (o?: unknown) => Promise<unknown>)(options);
  return appels[0];
}

describe('L165 — setup Chromium « nouveau » headless', () => {
  afterEach(() => { chromium.launch = reel; });

  it('un lancement sans canal ni exécutable reçoit channel: chromium, ses autres options conservées', async () => {
    expect(await lancerAvecSetup({ args: ['--x'] })).toEqual({ args: ['--x'], channel: 'chromium' });
    expect(await lancerAvecSetup()).toEqual({ channel: 'chromium' });
  });

  it('un lancement qui fixe déjà channel ou executablePath est laissé tel quel', async () => {
    expect(await lancerAvecSetup({ channel: 'chrome' })).toEqual({ channel: 'chrome' });
    expect(await lancerAvecSetup({ executablePath: '/usr/bin/x' })).toEqual({ executablePath: '/usr/bin/x' });
  });
});
