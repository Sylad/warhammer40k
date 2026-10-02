// L39 — garde des liens internes : échoue dès qu'un lien interne du site ne mène plus nulle part
// (route inconnue, identifiant absent des données, ancre absente de la page, ancre nue renvoyée à
// l'accueil par <base href="/">, fichier absent ou de mauvaise casse). Statique : ni réseau ni serveur.
// Les liens EXTERNES ne sont pas vérifiés ici (réseau) : `npm run liens:externes`, à la demande.
import { afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import {
  APP, ROOT, checkInternal, codeLinks, dataLinks, existsCaseSensitive, fieldValues, galaxyLinks, inventory, loadSeed,
  newsLinks, readRoutes, staleDeclarations,
} from './liens-lib.mjs';

const routes = readRoutes();
const data = loadSeed();

// Un seul dossier temporaire par exécution, supprimé à la fin (L39 : 145 restes avant correction).
const TMP = mkdtempSync(join(tmpdir(), 'wh-liens-test-'));
afterAll(() => rmSync(TMP, { recursive: true, force: true }));
let n = 0;
const tmpFile = (name, body) => {
  const dir = join(TMP, String(n++));
  mkdirSync(dir);
  const f = join(dir, name);
  writeFileSync(f, body);
  return f;
};

describe('vérificateur de liens (cas fabriqués)', () => {
  const page = (body) => tmpFile('x.component.ts', body);
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

  it('gabarit paramétré : route inconnue (« /unites ») → cassé ; route connue mais lien non déclaré → cassé', () => {
    const f = page(`@Component({template: \`<a [routerLink]="['/units', u.id]">a</a><a [routerLink]="['/unites', u.id]">b</a>\`})`);
    const broken = checkInternal(codeLinks([f]), { routes, data, news: { entries: [] } });
    expect(broken.map((b) => [b.target, /aucune route/.test(b.cause) ? 'route' : /sans déclaration/.test(b.cause) ? 'décl' : b.cause]))
      .toEqual([['/units/:param', 'décl'], ['/unites/:param', 'route']]);
  });

  it('couplage gabarit ↔ DATA_LINKS : un champ nouveau non déclaré → cassé ; déclaré, sa valeur « nope » → cassée', () => {
    const f = page(`@Component({template: \`<a [routerLink]="['/units', d.subfaction.leaderUnitId]">chef</a>\`})`);
    const planted = { ...data, subfactions: [...data.subfactions, { id: 'planted', leaderUnitId: 'nope' }] };
    const opts = { routes, data: planted, news: { entries: [] } };
    expect(checkInternal(codeLinks([f]), opts).map((b) => b.cause)[0]).toMatch(/sans déclaration/);
    const key = `${relative(ROOT, f)}|d.subfaction.leaderUnitId`;
    const defs = [{ seed: 'subfactions', field: 'leaderUnitId', to: '/units/:id', templates: [key] }];
    const broken = checkInternal([...codeLinks([f]), ...dataLinks(planted, defs)], { ...opts, defs });
    expect(broken.map((b) => b.target)).toEqual(['/units/nope']);
    expect(broken[0].cause).toMatch(/absent des données/);
  });

  it('couplage : échanger le champ d’un lien existant (faction-detail, h.primarchId vers /units) → cassé', () => {
    const file = join(APP, 'features/faction-detail/faction-detail.component.ts');
    const swapped = { cls: 'route', target: '/units/:param', dynamic: 'h.primarchId', source: 's', file };
    expect(checkInternal([swapped], { routes, data, news: { entries: [] } })[0].cause).toMatch(/déclaré vers \/lore\/primarchs\/:id/);
    // … et la déclaration de h.unitId, que plus aucun lien ne lit, devient orpheline.
    const inv = inventory().filter((l) => !(l.file === file && l.dynamic === 'h.unitId'));
    expect(staleDeclarations(inv)).toEqual(['frontend/src/app/features/faction-detail/faction-detail.component.ts|h.unitId']);
  });

  it('identifiant LITTÉRAL dans un tableau de commandes : vérifié contre les données', () => {
    const f = page(`@Component({template: \`<a [routerLink]="['/factions', 'nope']">a</a><a [routerLink]="['/factions', 'orks']">b</a>\`})`);
    const broken = checkInternal(codeLinks([f]), { routes, data, news: { entries: [] } });
    expect(broken.map((b) => b.target)).toEqual(['/factions/nope']);
    expect(broken[0].cause).toMatch(/absent des données/);
  });

  it('router.navigate avec plusieurs éléments : inventorié et vérifié', () => {
    const f = page(`class X { go() { this.router.navigate(['/unites', x.id]); this.router.navigate(['/factions', 'nope']); } }`);
    const links = codeLinks([f]).filter((l) => l.cls === 'route');
    expect(links.map((l) => l.target)).toEqual(['/unites/:param', '/factions/nope']);
    const broken = checkInternal(links, { routes, data, news: { entries: [] } });
    expect(broken.map((b) => b.target)).toEqual(['/unites/:param', '/factions/nope']);
  });

  it('carte galactique : les chemins viennent de linkToPath (lore-galaxy.utils.ts), pas d’une copie', () => {
    const utils = tmpFile('lore-galaxy.utils.ts', `export function linkToPath(link: HotZoneLink): string {
  switch (link.type) {
    case 'primarch': return \`/lore/primarques/\${link.id}\`;
    case 'saint':    return \`/lore/saints/\${link.id}\`;
    case 'ship':     return \`/lore/ships/\${link.id}\`;
  }
}
`);
    const links = galaxyLinks(undefined, utils).filter((l) => l.cls === 'route');
    const broken = checkInternal(links, { routes, data, news: { entries: [] } });
    expect(broken.some((b) => b.target.startsWith('/lore/primarques/'))).toBe(true); // chemin faux
    expect(broken.some((b) => /type « timeline »/.test(b.cause))).toBe(true); // type sans chemin
    expect(checkInternal(galaxyLinks(), { routes, data, news: { entries: [] } })).toEqual([]);
  });

  it('HTML des Nouveautés : liens internes inventoriés et vérifiés', () => {
    const news = { entries: [{ slug: 'n', html: '<p><a href="/units">a</a> <a href="#plus-bas">b</a> <a href="/factions/orks">c</a> <a href="https://example.org/">d</a></p>' }] };
    const links = newsLinks(news);
    expect(links.map((l) => `${l.cls} ${l.target}`)).toEqual(['route /units', 'anchor /nouveautes#plus-bas', 'route /factions/orks', 'external https://example.org/']);
    const broken = checkInternal(links, { routes, data, news });
    expect(broken.map((b) => b.target)).toEqual(['/units', '/nouveautes#plus-bas']);
  });

  it('fichiers : la casse compte (la prod est sous Linux)', () => {
    const dir = join(TMP, 'casse');
    mkdirSync(dir);
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

describe('liens internes du site (garde L39)', () => {
  const inv = inventory();

  it('l’inventaire n’est pas vide (l’extraction marche encore)', () => {
    const count = (c) => inv.filter((l) => l.cls === c).length;
    expect(count('route')).toBeGreaterThan(500);
    expect(count('anchor')).toBeGreaterThan(50);
    expect(count('external')).toBeGreaterThan(50);
    expect(inv.filter((l) => l.kind === 'datasheet')).toHaveLength(data.units.length);
    expect(dataLinks(data).length).toBeGreaterThan(300);
  });

  it('aucun lien interne cassé (route, identifiant, ancre, fichier, fiche technique)', () => {
    const broken = checkInternal(inv).map((b) => `${b.target} @ ${b.source} — ${b.cause}`);
    expect(broken).toEqual([]);
  });

  it('aucune déclaration orpheline (DATA_LINKS, SELF_LINKS, COVERED : chaque gabarit déclaré existe)', () => {
    expect(staleDeclarations(inv)).toEqual([]);
  });
});
