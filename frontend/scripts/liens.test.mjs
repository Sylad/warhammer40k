// L39 — garde des liens internes : échoue dès qu'un lien interne du site ne mène plus nulle part
// (route inconnue, identifiant absent des données, ancre absente de la page, ancre nue renvoyée à
// l'accueil par <base href="/">, fichier absent ou de mauvaise casse). Statique : ni réseau ni serveur.
// Les liens EXTERNES ne sont pas vérifiés ici (réseau) : `npm run liens:externes`, à la demande.
import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  checkInternal, codeLinks, existsCaseSensitive, fieldValues, loadSeed, readRoutes,
} from './liens-lib.mjs';

const routes = readRoutes();
const data = loadSeed();

describe('vérificateur de liens (cas fabriqués)', () => {
  const page = (body) => {
    const dir = mkdtempSync(join(tmpdir(), 'wh-liens-'));
    const f = join(dir, 'x.component.ts');
    writeFileSync(f, body);
    return f;
  };
  const check = (links) => checkInternal(links, { routes, data, news: { entries: [] } }).map((b) => b.cause);

  it('route inconnue → cassé (le routeur renverrait vers /factions)', () => {
    expect(check([{ cls: 'route', target: '/units', source: 's' }])[0]).toMatch(/aucune route/);
    expect(check([{ cls: 'route', target: '/lore/titans', source: 's' }])).toEqual([]);
  });

  it('identifiant absent des données → cassé ; présent → sain', () => {
    expect(check([{ cls: 'route', target: '/factions/nexiste-pas', source: 's' }])[0]).toMatch(/absent des données/);
    expect(check([{ cls: 'route', target: '/factions/orks', source: 's' }])).toEqual([]);
  });

  it('ancre absente de la page cible → cassée', () => {
    expect(check([{ cls: 'anchor', target: '/factions/orks#units', source: 's' }])).toEqual([]);
    expect(check([{ cls: 'anchor', target: '/factions/orks#nulle-part', source: 's' }])[0]).toMatch(/absente/);
    expect(check([{ cls: 'anchor', target: '/lore/concepts#cadia', source: 's' }])).toEqual([]);
    expect(check([{ cls: 'anchor', target: '/lore/concepts#atlantide', source: 's' }])[0]).toMatch(/absente/);
  });

  it('ancre nue sans (click) → cassée ; avec (click) → vérifiée sur la page même', () => {
    const f = page('@Component({template: `<a href="#a">x</a><a href="#b" (click)="go($event)">y</a><section id="b"></section>`})');
    const links = codeLinks([f]);
    expect(links.filter((l) => l.cls === 'anchor').map((l) => l.target)).toEqual(['~#a', '~#b']);
    const causes = checkInternal(links, { routes, data, news: { entries: [] } });
    expect(causes).toHaveLength(1);
    expect(causes[0].target).toBe('~#a');
    expect(causes[0].cause).toMatch(/ancre nue/);
  });

  it('ancre calculée vers une page qui ne pose pas d’ancres de données → cassée', () => {
    const f = page(`@Component({template: \`<a [routerLink]="['/lore/primarchs']" [fragment]="p.id">x</a>\`})`);
    const causes = checkInternal(codeLinks([f]), { routes, data, news: { entries: [] } }).map((b) => b.cause);
    expect(causes.some((c) => /ne pose aucune ancre/.test(c))).toBe(true);
  });

  it('destination calculée non déclarée → cassée tant qu’on ne dit pas ce qui la vérifie', () => {
    const f = page('@Component({template: `<a [routerLink]="x.cible">x</a>`})');
    const causes = checkInternal(codeLinks([f]), { routes, data, news: { entries: [] } }).map((b) => b.cause);
    expect(causes[0]).toMatch(/sans vérification déclarée/);
  });

  it('gabarit paramétré : la forme est vérifiée (« /units/:param » existe, « /unites/:param » non)', () => {
    const f = page(`@Component({template: \`<a [routerLink]="['/units', u.id]">a</a><a [routerLink]="['/unites', u.id]">b</a>\`})`);
    const broken = checkInternal(codeLinks([f]), { routes, data, news: { entries: [] } });
    expect(broken.map((b) => b.target)).toEqual(['/unites/:param']);
  });

  it('fichiers : la casse compte (la prod est sous Linux)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'wh-liens-'));
    mkdirSync(join(dir, 'a'));
    writeFileSync(join(dir, 'a/Image.jpg'), '');
    expect(existsCaseSensitive(dir, 'a/Image.jpg')).toBe(true);
    expect(existsCaseSensitive(dir, 'a/image.jpg')).toBe(false);
  });

  it('champs de données : « a[].b », « a[] », « a »', () => {
    const rec = { a: [{ b: 1 }, { b: 2 }, {}], c: ['x', 'y'], d: 'z', e: '' };
    expect(fieldValues(rec, 'a[].b')).toEqual([1, 2]);
    expect(fieldValues(rec, 'c[]')).toEqual(['x', 'y']);
    expect(fieldValues(rec, 'd')).toEqual(['z']);
    expect(fieldValues(rec, 'e')).toEqual([]);
  });
});
