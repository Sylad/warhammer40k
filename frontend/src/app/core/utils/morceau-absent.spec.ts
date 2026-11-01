import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { RECHARGEMENT_CLE, estMorceauAbsent, rechargerSiMorceauAbsent, surEchecDeNavigation } from './morceau-absent';

const morceau = new TypeError('Failed to fetch dynamically imported module: https://x/chunk-ABCD2345.js');
function stock(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('morceau absent (L52)', () => {
  it.each([
    ['Chromium', 'Failed to fetch dynamically imported module: https://x/chunk-A.js'],
    ['Firefox', 'error loading dynamically imported module: https://x/chunk-A.js'],
    ['Safari', 'Importing a module script failed.'],
  ])('R1 — reconnu : %s', (_n, msg) => expect(estMorceauAbsent(new TypeError(msg))).toBe(true));

  it.each([[new Error('HTTP 500')], [null], [undefined], [42], [{ message: 'Failed to fetch dynamically imported module' }]])(
    'R1 — une autre erreur (%o) n’est pas un morceau absent',
    (e) => expect(estMorceauAbsent(e)).toBe(false),
  );

  it('R2 — recharge sur l’adresse visée, et note l’heure', () => {
    const recharger = vi.fn();
    const s = stock();
    expect(rechargerSiMorceauAbsent(morceau, '/units/x', recharger, 1000, s)).toBe(true);
    expect(recharger).toHaveBeenCalledWith('/units/x');
    expect(s.getItem(RECHARGEMENT_CLE)).toBe('1000');
  });

  it('R3 — pas de boucle : un second échec dans la minute ne recharge pas, une heure plus tard si', () => {
    const recharger = vi.fn();
    const s = stock({ [RECHARGEMENT_CLE]: '1000' });
    expect(rechargerSiMorceauAbsent(morceau, '/a', recharger, 30_000, s)).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
    expect(rechargerSiMorceauAbsent(morceau, '/a', recharger, 61_001, s)).toBe(true);
  });

  it('R4 — une autre erreur ne recharge pas', () => {
    const recharger = vi.fn();
    expect(rechargerSiMorceauAbsent(new Error('boom'), '/a', recharger, 1, stock())).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
  });

  it('R5 — sans stockage utilisable (absent ou qui lève), pas de rechargement : le risque de boucle prime', () => {
    const recharger = vi.fn();
    expect(rechargerSiMorceauAbsent(morceau, '/a', recharger, 1, null)).toBe(false);
    const casse = { getItem: () => { throw new Error('refusé'); }, setItem: () => undefined };
    expect(rechargerSiMorceauAbsent(morceau, '/a', recharger, 1, casse)).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
  });

  it('R3 — une valeur illisible dans le stockage n’empêche pas de recharger', () => {
    const recharger = vi.fn();
    expect(rechargerSiMorceauAbsent(morceau, '/a', recharger, 100_000, stock({ [RECHARGEMENT_CLE]: 'abc' }))).toBe(true);
  });

  it('R6 — le routeur de l’application déclare ce gestionnaire', () => {
    const config = readFileSync(join(process.cwd(), 'src/app/app.config.ts'), 'utf8');
    expect(config).toMatch(/withNavigationErrorHandler\(surEchecDeNavigation\)/);
  });

  it('R6 — le gestionnaire ne lève pas pour une erreur sans rapport (stockage de la session de test)', () => {
    expect(() => surEchecDeNavigation({ error: new Error('x'), url: '/a' })).not.toThrow();
  });
});
