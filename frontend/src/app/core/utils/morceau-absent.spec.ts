import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { RECHARGEMENT_CLE, adresseDuMorceau, estMorceauAbsent, rechargerSiMorceauAbsent, surEchecDeNavigation } from './morceau-absent';

const morceau = new TypeError('Failed to fetch dynamically imported module: https://x/chunk-ABCD2345.js');
const safari = new TypeError('Importing a module script failed.');
function stock(init: Record<string, string> = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}
/** Vérificateur HEAD bouchonné : le statut rendu pour chaque adresse, ou `rejette` (réseau coupé). */
function head(statuts: Record<string, number | 'rejette'>) {
  return vi.fn(async (url: string) => {
    const s = statuts[url];
    if (s === undefined) throw new Error(`HEAD inattendu : ${url}`);
    if (s === 'rejette') throw new TypeError('Failed to fetch');
    return s;
  });
}
const options = (extra: Partial<Parameters<typeof rechargerSiMorceauAbsent>[3]> = {}) => ({
  maintenant: 1000,
  storage: stock(),
  verifier: head({ 'https://x/chunk-ABCD2345.js': 404 }),
  enLigne: true,
  ...extra,
});

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

  it('R1 — l’adresse du morceau est lue dans le message (Chromium, Firefox), absente chez Safari', () => {
    expect(adresseDuMorceau(morceau)).toBe('https://x/chunk-ABCD2345.js');
    expect(adresseDuMorceau(new TypeError('error loading dynamically imported module: http://h/chunk-Z.js'))).toBe('http://h/chunk-Z.js');
    expect(adresseDuMorceau(safari)).toBeNull();
    expect(adresseDuMorceau('pas une erreur')).toBeNull();
  });

  it('R2 — recharge sur l’adresse visée, et note l’heure', async () => {
    const recharger = vi.fn();
    const o = options();
    expect(await rechargerSiMorceauAbsent(morceau, '/units/x', recharger, o)).toBe(true);
    expect(recharger).toHaveBeenCalledWith('/units/x');
    expect(o.storage.getItem(RECHARGEMENT_CLE)).toBe('1000');
  });

  it('R3 — pas de boucle : un second échec dans la minute ne recharge pas (sans même interroger le serveur), une minute plus tard si', async () => {
    const recharger = vi.fn();
    const o = options({ storage: stock({ [RECHARGEMENT_CLE]: '1000' }), maintenant: 30_000 });
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, o)).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
    expect(o.verifier).not.toHaveBeenCalled();
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, { ...o, maintenant: 61_001 })).toBe(true);
  });

  it('R3 — une valeur illisible dans le stockage n’empêche pas de recharger', async () => {
    const recharger = vi.fn();
    const o = options({ storage: stock({ [RECHARGEMENT_CLE]: 'abc' }), maintenant: 100_000 });
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, o)).toBe(true);
  });

  it('R4 — une autre erreur ne recharge pas, ni n’interroge le serveur', async () => {
    const recharger = vi.fn();
    const o = options();
    expect(await rechargerSiMorceauAbsent(new Error('boom'), '/a', recharger, o)).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
    expect(o.verifier).not.toHaveBeenCalled();
  });

  it('R5 — sans stockage utilisable (absent ou qui lève), pas de rechargement : le risque de boucle prime', async () => {
    const recharger = vi.fn();
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, options({ storage: null }))).toBe(false);
    const casse = { getItem: () => { throw new Error('refusé'); }, setItem: () => undefined };
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, options({ storage: casse }))).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
  });

  it('R6 — le routeur de l’application déclare ce gestionnaire', () => {
    const config = readFileSync(join(process.cwd(), 'src/app/app.config.ts'), 'utf8');
    expect(config).toMatch(/withNavigationErrorHandler\(surEchecDeNavigation\)/);
  });

  it('R6 — le gestionnaire ne lève pas pour une erreur sans rapport (stockage de la session de test)', () => {
    expect(() => surEchecDeNavigation({ error: new Error('x'), url: '/a' })).not.toThrow();
  });

  it('R7 — navigateur hors ligne : pas de rechargement, pas de requête, pas de marque dans le stockage', async () => {
    const recharger = vi.fn();
    const o = options({ enLigne: false });
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, o)).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
    expect(o.verifier).not.toHaveBeenCalled();
    expect(o.storage.getItem(RECHARGEMENT_CLE)).toBeNull();
  });

  it('R8 — le 404 est confirmé par une requête HEAD sur le morceau : 404 → rechargement', async () => {
    const recharger = vi.fn();
    const o = options();
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, o)).toBe(true);
    expect(o.verifier).toHaveBeenCalledWith('https://x/chunk-ABCD2345.js');
  });

  it.each([
    ['200 (le morceau existe : autre cause)', 200],
    ['502 (passerelle en redémarrage)', 502],
    ['503', 503],
    ['requête rejetée (réseau coupé sans que le navigateur le sache)', 'rejette' as const],
  ])('R8 — HEAD sur le morceau : %s → pas de rechargement, pas de marque', async (_n, statut) => {
    const recharger = vi.fn();
    const o = options({ verifier: head({ 'https://x/chunk-ABCD2345.js': statut }) });
    expect(await rechargerSiMorceauAbsent(morceau, '/a', recharger, o)).toBe(false);
    expect(recharger).not.toHaveBeenCalled();
    expect(o.storage.getItem(RECHARGEMENT_CLE)).toBeNull();
  });

  it('R9 — message sans adresse (Safari) : c’est la page visée qui est interrogée ; elle répond → rechargement', async () => {
    const recharger = vi.fn();
    const o = options({ verifier: head({ '/romans': 200 }) });
    expect(await rechargerSiMorceauAbsent(safari, '/romans', recharger, o)).toBe(true);
    expect(o.verifier).toHaveBeenCalledWith('/romans');
    expect(recharger).toHaveBeenCalledWith('/romans');
  });

  it.each([['502', 502], ['requête rejetée', 'rejette' as const]])(
    'R9 — message sans adresse (Safari) : la page visée ne répond pas (%s) → pas de rechargement',
    async (_n, statut) => {
      const recharger = vi.fn();
      const o = options({ verifier: head({ '/romans': statut }) });
      expect(await rechargerSiMorceauAbsent(safari, '/romans', recharger, o)).toBe(false);
      expect(recharger).not.toHaveBeenCalled();
    },
  );
});
