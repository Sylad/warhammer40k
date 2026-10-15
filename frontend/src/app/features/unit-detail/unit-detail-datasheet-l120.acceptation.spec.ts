// L120 — Fiche unité : la fiche technique devient une figure lisible et agrandissable
// (docs/specs/unit-detail-datasheet/fiche.yaml). Test d'acceptation écrit AVANT le code, d'après la fiche seule.
// Contrats simulés : A1 HEAD /api/images/datasheets/:id (fetch), A2 GET /api/wiki-image?q= (WarhammerService.getWikiImage).
// Pas de maquette : sélecteurs sémantiques (figure du hero, bouton « Agrandir… », [role=dialog], h2 « Fiche technique »).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { UnitDetailComponent } from './unit-detail.component';

const A = { id: 'sm-tactique', factionId: 'space-marines', nom: 'Escouade Tactique', type: 'Infanterie', role: 'Troupe de ligne', description: 'Description A.', equipment: [{ name: 'Bolter', description: 'Arme de base' }] };
const B = { id: 'sm-terminator', factionId: 'space-marines', nom: 'Terminators', type: 'Infanterie', role: 'Élite', description: 'Description B.' };
const UNITS: Record<string, typeof A> = { [A.id]: A as never, [B.id]: B as never };
const FACTION = { id: 'space-marines', nom: 'Space Marines', alignement: 'Imperium', symbole: 'S', description: 'd', couleurThematique: '#14a' };
const DS = (id: string) => `/api/images/datasheets/${id}`;
const WIKI = (id: string) => `https://wiki.example/${id}.jpg`;

type Head = number | 'reseau' | Promise<number>;
interface Env { heads: Record<string, Head>; wiki: Record<string, 'erreur' | 'vide' | Subject<{ imageUrl: string | null }> | string>; wikiCalls: string[]; params: BehaviorSubject<ReturnType<typeof convertToParamMap>> }

async function mount(opts: { id?: string; heads?: Record<string, Head>; wiki?: Env['wiki'] } = {}): Promise<{ f: ComponentFixture<UnitDetailComponent>; root: HTMLElement; env: Env }> {
  polyfillDialog();
  const env: Env = {
    heads: { [A.id]: 200, [B.id]: 200, ...(opts.heads ?? {}) },
    wiki: { [A.id]: WIKI(A.id), [B.id]: WIKI(B.id), ...(opts.wiki ?? {}) },
    wikiCalls: [],
    params: new BehaviorSubject(convertToParamMap({ id: opts.id ?? A.id })),
  };
  const service = fakeWarhammerService({
    datasheetUrl: (id: string) => DS(id),
    getUnit: (id: string) => of(UNITS[id]),
    getFaction: () => of(FACTION),
    getUnits: () => of([]),
    getWikiImage: (q: string) => {
      env.wikiCalls.push(q);
      const unit = Object.values(UNITS).find((u) => u.nom === q);
      if (!unit) return of({ imageUrl: null, pageTitle: null, pageUrl: null }); // image d'ambiance du lore
      const w = env.wiki[unit.id];
      if (w === 'erreur') return throwError(() => new Error('wiki'));
      if (w === 'vide') return of({ imageUrl: null, pageTitle: null, pageUrl: null });
      if (typeof w === 'string') return of({ imageUrl: w, pageTitle: null, pageUrl: null });
      return w;
    },
  });
  await setupTestBed([UnitDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: env.params, snapshot: { fragment: null } } },
  ]);
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const id = Object.keys(UNITS).find((k) => url.endsWith(DS(k)));
    const h = id ? env.heads[id] : 404;
    if (h === 'reseau') throw new TypeError('network');
    const status = await h;
    return { ok: status >= 200 && status < 300, status } as Response;
  }) as typeof fetch;
  const f = TestBed.createComponent(UnitDetailComponent);
  await settle(f);
  return { f, root: f.nativeElement as HTMLElement, env };
}

async function settle(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    f.detectChanges();
    await f.whenStable();
    await new Promise((r) => setTimeout(r, 0));
  }
  f.detectChanges();
}

const heroFigure = (root: HTMLElement) => root.querySelector('.hero figure') as HTMLElement | null;
const heroImg = (root: HTMLElement) => root.querySelector('.hero figure img') as HTMLImageElement | null;
const buttons = (root: HTMLElement) => Array.from(root.querySelectorAll('button.zoom-btn')) as HTMLButtonElement[];
const heroBtn = (root: HTMLElement) => buttons(root).find((b) => b.closest('.hero')) ?? null;
const panelBtn = (root: HTMLElement) => buttons(root).find((b) => !b.closest('.hero')) ?? null;
const panelTitle = (root: HTMLElement) => Array.from(root.querySelectorAll('h2')).find((h) => h.textContent!.trim() === 'Fiche technique') ?? null;
const dialogEl = (): HTMLElement | null => {
  const d = document.querySelector('[role="dialog"]') as HTMLElement | null;
  if (!d) return null;
  if (d.tagName === 'DIALOG' && !d.hasAttribute('open')) return null;
  return d;
};
const tabs = (root: HTMLElement) => Array.from(root.querySelectorAll('nav.tabs button')) as HTMLButtonElement[];
const flush = async (f: ComponentFixture<unknown>) => settle(f);
const keydown = (el: Element | null, key: string) => (el ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
async function open(f: ComponentFixture<unknown>, btn: HTMLButtonElement | null): Promise<void> {
  expect(btn).not.toBeNull();
  btn!.focus();
  btn!.click();
  await flush(f);
}
const nameOf = (d: HTMLElement) => {
  const label = d.getAttribute('aria-label');
  if (label) return label.trim();
  const ref = d.getAttribute('aria-labelledby');
  return ref ? ref.split(/\s+/).map((i) => document.getElementById(i)?.textContent?.trim() ?? '').join(' ').trim() : '';
};

// ---------------------------------------------------------------- feuilles de style
const SCSS = resolve(__dirname, 'unit-detail.component.scss');
function allCss(): string {
  const dir = resolve(__dirname);
  return readdirSync(dir).filter((n) => n.endsWith('.scss')).map((n) => sass.compile(resolve(dir, n)).css).join('\n');
}
function rules(css: string): { selectors: string[]; media: string | null; decls: Record<string, string> }[] {
  const out: { selectors: string[]; media: string | null; decls: Record<string, string> }[] = [];
  postcss.parse(css).walkRules((rule) => {
    const p = rule.parent;
    const decls: Record<string, string> = {};
    rule.walkDecls((d) => { decls[d.prop] = d.value; });
    out.push({ selectors: rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()), media: p && p.type === 'atrule' ? (p as postcss.AtRule).params : null, decls });
  });
  return out;
}
const css = sass.compile(SCSS).css;
const figureSel = (s: string) => /figure/.test(s) && !/equip-figure/.test(s);

describe('fiche unité — fiche technique en figure agrandissable (L120)', () => {
  // ---------------------------------------------------------------- R1
  it('R1 — fiche technique présente : le hero contient un figure avec un img dont src est l\'URL de la fiche', async () => {
    const { root } = await mount();
    expect(heroFigure(root)).not.toBeNull();
    expect(heroImg(root)!.getAttribute('src')).toBe(DS(A.id));
  });
  it('R1 — la feuille de style donne object-fit contain à l\'image de la figure (assertion CSS sur la feuille compilée, comme L128)', () => {
    const r = rules(allCss()).filter((x) => x.selectors.some((s) => figureSel(s) && /img/.test(s)) && !x.media);
    expect(r.length).toBeGreaterThan(0);
    expect(r.some((x) => x.decls['object-fit'] === 'contain')).toBe(true);
  });

  // ---------------------------------------------------------------- R2
  it('R2 — alt de la fiche technique de l\'Escouade Tactique', async () => {
    const { root } = await mount();
    expect(heroImg(root)!.getAttribute('alt')).toBe('Fiche technique de Escouade Tactique : profil, armes et aptitudes');
  });
  it('R2 — l\'alt change avec le nom quand l\'unité change', async () => {
    const { f, root, env } = await mount();
    expect(heroImg(root)!.getAttribute('alt')).toBe('Fiche technique de Escouade Tactique : profil, armes et aptitudes');
    env.params.next(convertToParamMap({ id: B.id }));
    await flush(f);
    expect(heroImg(root)!.getAttribute('alt')).toBe('Fiche technique de Terminators : profil, armes et aptitudes');
  });

  // ---------------------------------------------------------------- R3
  it('R3 — la figure et son img n\'ont ni filter ni pseudo-élément de dégradé', async () => {
    const { root } = await mount();
    expect(heroFigure(root)).not.toBeNull();
    for (const el of [heroFigure(root)!, heroImg(root)!]) expect(el.getAttribute('style') ?? '').not.toMatch(/filter|gradient/);
    for (const r of rules(allCss()).filter((x) => x.selectors.some(figureSel))) {
      const flat = JSON.stringify(r.decls);
      expect(flat, r.selectors.join()).not.toMatch(/gradient/);
      expect(r.decls['filter'], r.selectors.join()).toBeUndefined();
    }
    expect(rules(allCss()).some((x) => x.selectors.some((s) => /figure.*::?(before|after)/.test(s)))).toBe(false);
  });
  it('R3 — le filtre du hero ne s\'applique qu\'à l\'ambiance, pas à la figure', async () => {
    const { root } = await mount();
    expect(heroFigure(root)).not.toBeNull();
    const all = rules(allCss());
    const hero = all.filter((x) => x.selectors.some((s) => /(^| )\.hero$/.test(s)));
    expect(hero.length).toBeGreaterThan(0);
    for (const r of hero) expect(r.decls['filter']).toBeUndefined();
    for (const r of all.filter((x) => x.decls['filter'] && /contrast|brightness|saturate/.test(x.decls['filter']))) {
      expect(r.selectors.some((s) => /figure/.test(s) && !/equip-figure/.test(s)), r.selectors.join()).toBe(false);
    }
  });

  // ---------------------------------------------------------------- R4
  it('R4 — sans fiche technique, image du wiki : alt « Illustration de <nom> »', async () => {
    const { root } = await mount({ heads: { [A.id]: 404 } });
    expect(heroImg(root)!.getAttribute('src')).toBe(WIKI(A.id));
    expect(heroImg(root)!.getAttribute('alt')).toBe('Illustration de Escouade Tactique');
  });
  it('R4 — la légende d\'un portrait ne dit pas « Fiche technique »', async () => {
    const { root } = await mount({ heads: { [A.id]: 404 } });
    const text = heroFigure(root)!.textContent!;
    expect(text).toContain('Illustration · agrandir');
    expect(text).not.toContain('Fiche technique');
  });

  // ---------------------------------------------------------------- R5
  it('R5 — ni datasheet ni wiki : pas de figure dans le hero', async () => {
    expect(heroFigure((await mount()).root)).not.toBeNull(); // témoin : avec une image, la figure existe
    const { root } = await mount({ heads: { [A.id]: 404 }, wiki: { [A.id]: 'vide' } });
    expect(heroFigure(root)).toBeNull();
    expect(root.querySelector('img[src=""]')).toBeNull();
    expect(root.querySelector('.hero')!.textContent).toContain('Escouade Tactique');
  });
  it('R5 — wiki en erreur : pas de figure et pas d\'erreur affichée', async () => {
    expect(heroFigure((await mount()).root)).not.toBeNull();
    const { root } = await mount({ heads: { [A.id]: 404 }, wiki: { [A.id]: 'erreur' } });
    expect(heroFigure(root)).toBeNull();
    expect(root.querySelector('app-load-error')).toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
  });

  // ---------------------------------------------------------------- R6
  it('R6 — changement d\'unité : la figure disparaît avant l\'arrivée de la nouvelle image', async () => {
    let release!: (n: number) => void;
    const lent = new Promise<number>((r) => { release = r; });
    const { f, root, env } = await mount({ heads: { [B.id]: lent } });
    expect(heroFigure(root)).not.toBeNull();
    env.params.next(convertToParamMap({ id: B.id }));
    await flush(f);
    expect(root.querySelector('h1')!.textContent).toContain('Terminators');
    expect(heroFigure(root)).toBeNull();
    release(200);
    await flush(f);
    expect(heroImg(root)!.getAttribute('src')).toBe(DS(B.id));
  });
  it('R6 — course : HEAD de A répondu après le changement vers B, l\'image de A est ignorée', async () => {
    let releaseA!: (n: number) => void;
    const lentA = new Promise<number>((r) => { releaseA = r; });
    const { f, root, env } = await mount({ heads: { [A.id]: lentA } });
    env.params.next(convertToParamMap({ id: B.id }));
    await flush(f);
    expect(heroImg(root)!.getAttribute('src')).toBe(DS(B.id));
    releaseA(200);
    await flush(f);
    expect(heroImg(root)!.getAttribute('src')).toBe(DS(B.id));
    expect(heroImg(root)!.getAttribute('alt')).toContain('Terminators');
  });
  it('R6 — course : portrait du wiki de A arrivé après le changement, ignoré', async () => {
    const wikiA = new Subject<{ imageUrl: string | null }>();
    const { f, root, env } = await mount({ heads: { [A.id]: 404 }, wiki: { [A.id]: wikiA } });
    env.params.next(convertToParamMap({ id: B.id }));
    await flush(f);
    expect(heroImg(root)!.getAttribute('src')).toBe(DS(B.id));
    wikiA.next({ imageUrl: WIKI(A.id) });
    await flush(f);
    expect(heroImg(root)!.getAttribute('src')).toBe(DS(B.id));
    expect(heroImg(root)!.getAttribute('alt')).toContain('Terminators');
  });
  it('R6 — fenêtre ouverte puis changement d\'unité : fermée', async () => {
    const { f, root, env } = await mount();
    await open(f, heroBtn(root));
    expect(dialogEl()).not.toBeNull();
    env.params.next(convertToParamMap({ id: B.id }));
    await flush(f);
    expect(dialogEl()).toBeNull();
  });

  // ---------------------------------------------------------------- R7
  it('R7 — onglet Aperçu : panneau Fiche technique avec img et bouton agrandir', async () => {
    const { root } = await mount();
    const h = panelTitle(root);
    expect(h).not.toBeNull();
    const panel = h!.parentElement!;
    expect(panel.querySelector('img')!.getAttribute('src')).toBe(DS(A.id));
    expect(panel.querySelector('img')!.getAttribute('alt')).toBe('Fiche technique de Escouade Tactique : profil, armes et aptitudes');
    expect(panelBtn(root)).not.toBeNull();
  });
  it('R7 — portrait : pas de panneau Fiche technique', async () => {
    expect(panelTitle((await mount()).root)).not.toBeNull(); // témoin
    const { root } = await mount({ heads: { [A.id]: 404 } });
    expect(heroFigure(root)).not.toBeNull();
    expect(panelTitle(root)).toBeNull();
    expect(panelBtn(root)).toBeNull();
  });
  it('R7 — autres onglets : pas de panneau', async () => {
    const { f, root } = await mount();
    expect(panelTitle(root)).not.toBeNull();
    for (const i of [1, 2]) {
      tabs(root)[i].click();
      await flush(f);
      expect(panelTitle(root), `onglet ${i}`).toBeNull();
    }
  });

  // ---------------------------------------------------------------- R8
  it('R8 — Entrée sur la légende ouvre la fenêtre', async () => {
    const { f, root } = await mount();
    const b = heroBtn(root)!;
    expect(b.tagName).toBe('BUTTON'); // bouton natif : Entrée et Espace le déclenchent
    expect(b.textContent).toContain('agrandir');
    expect(dialogEl()).toBeNull();
    await open(f, b);
    expect(dialogEl()).not.toBeNull();
    expect(dialogEl()!.contains(document.activeElement)).toBe(true);
  });
  it('R8 — Échap ferme et le focus revient sur le bouton d\'origine', async () => {
    const { f, root } = await mount();
    const b = heroBtn(root)!;
    await open(f, b);
    expect(dialogEl()).not.toBeNull();
    keydown(document.activeElement, 'Escape');
    await flush(f);
    expect(dialogEl()).toBeNull();
    expect(document.activeElement).toBe(b);
  });
  it('R8 — Tab ne sort pas de la fenêtre', async () => {
    const { f, root } = await mount();
    await open(f, heroBtn(root));
    const d = dialogEl()!;
    expect(d).not.toBeNull();
    const focusables = Array.from(d.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'));
    expect(focusables.length).toBeGreaterThan(0);
    const last = focusables[focusables.length - 1];
    last.focus();
    keydown(last, 'Tab');
    await flush(f);
    expect(d.contains(document.activeElement)).toBe(true);
  });
  it('R8 — ouverte depuis le panneau Aperçu, le focus revient sur le panneau', async () => {
    const { f, root } = await mount();
    const b = panelBtn(root)!;
    await open(f, b);
    expect(dialogEl()).not.toBeNull();
    keydown(document.activeElement, 'Escape');
    await flush(f);
    expect(dialogEl()).toBeNull();
    expect(document.activeElement).toBe(b);
    expect(b.closest('.hero')).toBeNull();
  });
  it('R8 — clic hors de l\'image et bouton Fermer ferment la fenêtre', async () => {
    const { f, root } = await mount();
    await open(f, heroBtn(root));
    const fermer = Array.from(dialogEl()!.querySelectorAll('button')).find((b) => /fermer/i.test(b.getAttribute('aria-label') ?? b.textContent ?? ''));
    expect(fermer).toBeDefined();
    fermer!.click();
    await flush(f);
    expect(dialogEl()).toBeNull();
    await open(f, heroBtn(root));
    dialogEl()!.click(); // clic sur le fond de la fenêtre, hors de l'image
    await flush(f);
    expect(dialogEl()).toBeNull();
  });

  // ---------------------------------------------------------------- R9
  it('R9 — erreur de chargement de l\'img : figure retirée', async () => {
    const { f, root } = await mount();
    expect(heroImg(root)).not.toBeNull();
    heroImg(root)!.dispatchEvent(new Event('error'));
    await flush(f);
    expect(heroFigure(root)).toBeNull();
    expect(panelTitle(root)).toBeNull();
  });
  it('R9 — erreur de chargement : pas d\'appel au wiki', async () => {
    const { f, root, env } = await mount();
    expect(heroImg(root)).not.toBeNull();
    heroImg(root)!.dispatchEvent(new Event('error'));
    await flush(f);
    expect(heroFigure(root)).toBeNull();
    expect(env.wikiCalls).not.toContain('Escouade Tactique');
  });
  it('R9 — erreur de l\'img de la fenêtre agrandie : fenêtre fermée, figure et panneau retirés', async () => {
    const { f, root } = await mount();
    const b = heroBtn(root)!;
    await open(f, b);
    const img = dialogEl()!.querySelector('img')!;
    expect(img).not.toBeNull();
    img.dispatchEvent(new Event('error'));
    await flush(f);
    expect(dialogEl()).toBeNull();
    expect(heroFigure(root)).toBeNull();
    expect(panelTitle(root)).toBeNull();
  });

  // ---------------------------------------------------------------- R10
  it('R10 — le composant partagé figure-lightbox est inchangé : rendu primarque identique (miniatures et lien galerie présents)', () => {
    const shared = readFileSync(resolve(__dirname, '../../shared/components/figure-lightbox/figure-lightbox.component.ts'));
    expect(createHash('sha1').update(shared).digest('hex')).toBe('4173db3dc6ea246d302319a920edf8978410808f');
    // et la fenêtre dédiée vit dans features/unit-detail, à côté de la page
    const sources = readdirSync(__dirname).filter((n) => n.endsWith('.ts') && !/\.spec\.ts$/.test(n) && n !== 'unit-detail.component.ts');
    expect(sources.length).toBeGreaterThan(0);
  });
  it('R10 — la fiche unité n\'utilise pas app-figure-lightbox', async () => {
    const { f, root } = await mount();
    await open(f, heroBtn(root));
    expect(dialogEl()).not.toBeNull();
    expect(document.querySelector('app-figure-lightbox')).toBeNull();
    expect(readFileSync(resolve(__dirname, 'unit-detail.component.ts'), 'utf8')).not.toMatch(/figure-lightbox|FigureLightbox/);
  });

  // ---------------------------------------------------------------- R11
  it('R11 — ≤ 760 px : le hero n\'applique plus l\'image de fond', () => {
    const r = rules(css).filter((x) => x.media === '(max-width: 760px)' && x.selectors.some((s) => /\.hero(::before)?$/.test(s)));
    const noBg = r.some((x) => x.decls['display'] === 'none' && x.selectors.some((s) => /::before$/.test(s)))
      || r.some((x) => /^none$/.test(x.decls['background'] ?? x.decls['background-image'] ?? ''));
    expect(noBg).toBe(true);
  });
  it('R11 — l\'ordre Informations clés / onglets de L128 est inchangé', async () => {
    const { root } = await mount();
    expect(heroFigure(root)).not.toBeNull();
    const media = '(max-width: 760px)';
    const get = (sel: string) => Object.assign({}, ...rules(css).filter((x) => x.media === media && x.selectors.some((s) => s.endsWith(sel))).map((x) => x.decls));
    expect(get('.sidebar')['display']).toBe('contents');
    expect(get('.sp-info')['order']).toBe('-1');
    expect(get('.tabs')['flex-wrap']).toBe('wrap');
  });

  // ---------------------------------------------------------------- R12
  it('R12 — le texte du hero garde titre, rôle, description et boutons', async () => {
    const { root } = await mount();
    expect(heroFigure(root)).not.toBeNull();
    const t = root.querySelector('.hero .hero-text')!;
    expect(t.querySelector('h1')!.textContent).toContain('Escouade Tactique');
    expect(t.querySelector('.hero-role')!.textContent).toContain('Troupe de ligne');
    expect(t.querySelector('.hero-desc')!.textContent).toContain('Description A.');
    expect(t.querySelectorAll('.hero-cta a').length).toBeGreaterThan(0);
    expect(heroFigure(root)!.closest('.hero-text')).toBeNull();
  });
  it('R12 — la colonne texte fait 44 % à 1440 px (assertion CSS sur la feuille compilée ou e2e Playwright)', () => {
    const r = rules(css).filter((x) => !x.media && x.selectors.some((s) => /(^| )\.hero-text$/.test(s)));
    expect(r.some((x) => x.decls['max-width'] === '44%')).toBe(true);
  });

  // ---------------------------------------------------------------- R13
  it('R13 — nom accessible du bouton d\'une fiche technique', async () => {
    const { root } = await mount();
    // WCAG 2.5.3 : le nom commence par le texte visible de la légende
    expect(heroBtn(root)!.getAttribute('aria-label')).toBe('Fiche technique · agrandir — Escouade Tactique');
    expect(panelBtn(root)!.getAttribute('aria-label')).toBe('Fiche technique · agrandir — Escouade Tactique');
    expect(heroBtn(root)!.getAttribute('aria-label')!.startsWith(heroBtn(root)!.textContent!.trim())).toBe(true);
  });
  it('R13 — nom accessible du bouton d\'un portrait', async () => {
    const { root } = await mount({ heads: { [A.id]: 404 } });
    expect(heroBtn(root)!.getAttribute('aria-label')).toBe('Illustration · agrandir — Escouade Tactique');
    expect(heroBtn(root)!.getAttribute('aria-label')!.startsWith(heroBtn(root)!.textContent!.trim())).toBe(true);
  });

  // ---------------------------------------------------------------- R14
  it('R14 — URL de fiche technique : type fiche technique, alt et légende de fiche', async () => {
    const { root } = await mount();
    expect(heroImg(root)!.getAttribute('alt')).toMatch(/^Fiche technique de /);
    expect(heroFigure(root)!.textContent).toContain('Fiche technique · agrandir');
  });
  it('R14 — URL du wiki : type portrait, alt « Illustration de <nom> »', async () => {
    const { root } = await mount({ heads: { [A.id]: 'reseau' } });
    expect(heroImg(root)!.getAttribute('src')).toBe(WIKI(A.id));
    expect(heroImg(root)!.getAttribute('alt')).toBe('Illustration de Escouade Tactique');
    expect(heroFigure(root)!.textContent).toContain('Illustration · agrandir');
  });
  it('R14 — changement d\'unité : le type est remis à zéro avec l\'image', async () => {
    let release!: (n: number) => void;
    const lent = new Promise<number>((r) => { release = r; });
    const { f, root, env } = await mount({ heads: { [B.id]: lent } });
    expect(heroImg(root)!.getAttribute('alt')).toMatch(/^Fiche technique de/);
    env.params.next(convertToParamMap({ id: B.id }));
    await flush(f);
    expect(heroFigure(root)).toBeNull();
    expect(panelTitle(root)).toBeNull();
    release(404);
    await flush(f);
    expect(heroImg(root)!.getAttribute('alt')).toBe('Illustration de Terminators');
    expect(panelTitle(root)).toBeNull();
  });

  // ---------------------------------------------------------------- R15
  it('R15 — .equip-figure et variantImg lisent toujours l\'URL de l\'unité', async () => {
    const { f, root } = await mount();
    expect(heroFigure(root)).not.toBeNull();
    tabs(root)[1].click();
    await flush(f);
    const fig = root.querySelector('.equip-figure') as HTMLElement;
    expect(fig).not.toBeNull();
    expect(fig.style.getPropertyValue('--fig-img') || fig.getAttribute('style')).toContain(DS(A.id));
    expect((f.componentInstance as unknown as { variantImg(i?: string): string }).variantImg(undefined)).toContain(DS(A.id));
  });
  it('R15 — la figure du hero n\'utilise pas unitImg() en fond', async () => {
    const { root } = await mount();
    const fig = heroFigure(root)!;
    expect(fig).not.toBeNull();
    for (const el of [fig, ...Array.from(fig.querySelectorAll<HTMLElement>('*'))]) {
      expect(el.getAttribute('style') ?? '', el.tagName).not.toMatch(/url\(|--hero-img|--fig-img/);
    }
    expect(heroImg(root)!.tagName).toBe('IMG');
  });

  // ---------------------------------------------------------------- R16
  it('R16 — HEAD 404 : appel au wiki', async () => {
    const { root, env } = await mount({ heads: { [A.id]: 404 } });
    expect(env.wikiCalls).toContain('Escouade Tactique');
    expect(heroImg(root)!.getAttribute('src')).toBe(WIKI(A.id));
  });
  it('R16 — HEAD 500 : appel au wiki, portrait affiché', async () => {
    const { root, env } = await mount({ heads: { [A.id]: 500 } });
    expect(env.wikiCalls).toContain('Escouade Tactique');
    expect(heroImg(root)!.getAttribute('alt')).toBe('Illustration de Escouade Tactique');
    expect(root.querySelector('app-load-error')).toBeNull();
  });
  it('R16 — HEAD en échec réseau : appel au wiki', async () => {
    const { root, env } = await mount({ heads: { [A.id]: 'reseau' } });
    expect(env.wikiCalls).toContain('Escouade Tactique');
    expect(heroFigure(root)).not.toBeNull();
  });

  // ---------------------------------------------------------------- R17
  it('R17 — la fenêtre contient un img avec l\'alt de la fiche technique', async () => {
    const { f, root } = await mount();
    await open(f, heroBtn(root));
    const img = dialogEl()!.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(DS(A.id));
    expect(img.getAttribute('alt')).toBe('Fiche technique de Escouade Tactique : profil, armes et aptitudes');
  });
  it('R17 — la fenêtre contient un img avec l\'alt « Illustration de <nom> » pour un portrait', async () => {
    const { f, root } = await mount({ heads: { [A.id]: 404 } });
    await open(f, heroBtn(root));
    const img = dialogEl()!.querySelector('img')!;
    expect(img.getAttribute('src')).toBe(WIKI(A.id));
    expect(img.getAttribute('alt')).toBe('Illustration de Escouade Tactique');
  });
  it('R17 — l\'img de la fenêtre n\'a pas de filter ni de voile', async () => {
    const { f, root } = await mount();
    await open(f, heroBtn(root));
    const d = dialogEl()!;
    expect(d.querySelector('img')).not.toBeNull();
    for (const el of [d, ...Array.from(d.querySelectorAll<HTMLElement>('*'))]) {
      expect(el.getAttribute('style') ?? '', el.tagName).not.toMatch(/filter|gradient|background/);
    }
    for (const r of rules(allCss()).filter((x) => x.selectors.some((s) => /dialog|lightbox|fenetre|viewer|zoom/i.test(s)))) {
      expect(r.decls['filter'], r.selectors.join()).toBeUndefined();
      expect(JSON.stringify(r.decls), r.selectors.join()).not.toMatch(/gradient/);
    }
  });
  it('R17 — la fenêtre a role dialog, aria-modal et un nom accessible', async () => {
    const { f, root } = await mount();
    await open(f, heroBtn(root));
    const d = dialogEl()!;
    expect(d.getAttribute('role')).toBe('dialog');
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(nameOf(d)).toBe('Fiche technique de Escouade Tactique');
  });
});
