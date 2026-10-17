// L5 (revue UX de la page Romans) : t1 onglets sans débordement, t3 tri, t4–t5 noms accessibles,
// t6 retour à la liste, t7 compteur et focus de « Charger plus », t8 état vide, t9 boutons de couverture.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';
import { SeriesComponent } from './series.component';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Serie } from '../../core/models/models';

const css = sass.compile(resolve(__dirname, 'series.component.scss')).css;

function decls(sel: string): Record<string, string> {
  const out: Record<string, string> = {};
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type !== 'root') return;
    if (!rule.selectors.map((s) => s.replace(/\s+/g, ' ').trim()).includes(sel)) return;
    rule.walkDecls((d) => { out[d.prop] = d.value; });
  });
  return out;
}

const lum = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function serie(i: number, over: Partial<Serie> = {}): Serie {
  return {
    id: `s${i}`, titre: `Série ${String.fromCharCode(65 + (i % 26))}${i}`, titreVO: `VO ${i}`, auteurs: ['Auteur'],
    nbLivres: 3, epoque: String(100 + i), factionIds: [], tags: [], premierLivre: 'Livre', description: 'Desc',
    niveauEntree: 'Facile', readBooks: 0, ...over,
  };
}

async function render(list: Serie[]): Promise<ComponentFixture<SeriesComponent>> {
  await setupTestBed([SeriesComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ series$: of(list) }) },
  ]);
  const f = TestBed.createComponent(SeriesComponent);
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
const $ = (f: ComponentFixture<unknown>, sel: string) => (f.nativeElement as HTMLElement).querySelector(sel) as HTMLElement | null;
const $$ = (f: ComponentFixture<unknown>, sel: string) => [...(f.nativeElement as HTMLElement).querySelectorAll(sel)] as HTMLElement[];
const tick = async (f: ComponentFixture<unknown>) => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
const tab = (f: ComponentFixture<unknown>, label: string) => $$(f, '.tab').find((t) => t.textContent?.trim() === label)!;

beforeEach(() => { document.body.innerHTML = ''; });

describe('Romans — onglets (L5/t1)', () => {
  it('t1 — la barre d’onglets passe à la ligne au lieu de déborder de l’écran', () => {
    expect(decls('.tabs')['flex-wrap']).toBe('wrap');
  });
});

describe('Romans — tri (L5/t3)', () => {
  it('t3 — l’onglet Ordre de lecture désactive le tri et dit pourquoi', async () => {
    const f = await render([serie(1), serie(2)]);
    const select = $(f, 'select') as HTMLSelectElement;
    expect(select.disabled).toBe(false);
    tab(f, 'Ordre de lecture').click();
    await tick(f);
    expect(select.disabled).toBe(true);
    expect($(f, '.sort-note')?.textContent).toContain('ordre de lecture');
    tab(f, 'Toutes les séries').click();
    await tick(f);
    expect(select.disabled).toBe(false);
    expect($(f, '.sort-note')).toBeNull();
  });
});

describe('Romans — noms accessibles (L5/t4, t5)', () => {
  it('t4 — la barre d’onglets est nommée et l’onglet actif est exposé (aria-pressed)', async () => {
    const f = await render([serie(1)]);
    expect($(f, 'nav.tabs')?.getAttribute('aria-label')).toBeTruthy();
    expect(tab(f, 'Toutes les séries').getAttribute('aria-pressed')).toBe('true');
    expect(tab(f, 'À lire').getAttribute('aria-pressed')).toBe('false');
    tab(f, 'À lire').click();
    await tick(f);
    expect(tab(f, 'À lire').getAttribute('aria-pressed')).toBe('true');
    expect(tab(f, 'Toutes les séries').getAttribute('aria-pressed')).toBe('false');
  });

  it('t4 — la lettre active est exposée (aria-pressed) dans un groupe nommé', async () => {
    const f = await render([serie(1)]);
    expect($(f, '.letters')?.getAttribute('role')).toBe('group');
    expect($(f, `#${$(f, '.letters')?.getAttribute('aria-labelledby')}`)?.textContent).toContain('lettre');
    const s = $$(f, '.letter').find((b) => b.textContent?.trim() === 'S')!;
    expect(s.getAttribute('aria-pressed')).toBe('false');
    s.click();
    await tick(f);
    expect(s.getAttribute('aria-pressed')).toBe('true');
  });

  it('t5 — le tri et la recherche ont une étiquette accessible', async () => {
    const f = await render([serie(1)]);
    const select = $(f, 'select')!;
    const label = $(f, `label[for="${select.id}"]`);
    expect(select.id).toBeTruthy();
    expect(label?.textContent).toContain('Trier par');
    const input = $(f, '.search-bar input')!;
    expect(input.getAttribute('aria-label')).toContain('Rechercher');
  });

  it('t5 — le texte indicatif de la recherche atteint 4,5:1 sur le fond de la barre', () => {
    const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(decls('.search-bar input::placeholder').color)!;
    const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    const bg = [8, 5, 3]; // aplat le plus clair de la barre (rgba(8,5,3,.7) sur le fond de page)
    const fg = [r, g, b].map((v, i) => v * a + bg[i] * (1 - a));
    const [l1, l2] = [lum(fg), lum(bg)];
    expect((l1 + 0.05) / (l2 + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Romans — retour à la liste (L5/t6)', () => {
  const stacked = (matches: boolean) =>
    (window as unknown as { matchMedia: unknown }).matchMedia = vi.fn().mockReturnValue({ matches });

  it('t6 — empilé, « Voir l’ordre de lecture » ramène à la liste et y met le focus', async () => {
    stacked(true);
    const f = await render([serie(1), serie(2)]);
    const scroll = vi.fn();
    (HTMLElement.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = scroll;
    $$(f, '.link-list button')[0].click();
    await tick(f);
    expect(document.activeElement).toBe($(f, '#liste-series'));
    expect(scroll).toHaveBeenCalled();
  });

  it('t6 — « Continuer ma lecture » fait de même', async () => {
    stacked(true);
    const f = await render([serie(1, { readBooks: 1 })]);
    (HTMLElement.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = vi.fn();
    $$(f, '.link-list button')[1].click();
    await tick(f);
    expect(document.activeElement).toBe($(f, '#liste-series'));
  });

  it('t6 — sur grand écran (liste visible à côté), le focus ne bouge pas', async () => {
    stacked(false);
    const f = await render([serie(1)]);
    const btn = $$(f, '.link-list button')[0];
    btn.focus();
    btn.click();
    await tick(f);
    expect(document.activeElement).toBe(btn);
  });
});

describe('Romans — Charger plus (L5/t7)', () => {
  it('t7 — « 8 séries affichées sur 20 » près du bouton', async () => {
    const f = await render(Array.from({ length: 20 }, (_, i) => serie(i)));
    expect($(f, '.load-more-wrap .lm-count')?.textContent?.trim()).toBe('8 séries affichées sur 20');
  });

  it('t7 — le focus passe à la première nouvelle carte', async () => {
    const f = await render(Array.from({ length: 20 }, (_, i) => serie(i)));
    $(f, '.load-more')!.click();
    await tick(f);
    expect($$(f, '.serie-card').length).toBe(16);
    expect(document.activeElement).toBe($$(f, '.serie-card')[8].querySelector('.card-image'));
  });

  it('t7 — le dernier chargement fait disparaître le bouton sans perdre le focus', async () => {
    const f = await render(Array.from({ length: 10 }, (_, i) => serie(i)));
    $(f, '.load-more')!.click();
    await tick(f);
    expect($(f, '.load-more')).toBeNull();
    expect(document.activeElement).toBe($$(f, '.serie-card')[8].querySelector('.card-image'));
  });
});

describe('Romans — état vide et lettres (L5/t8)', () => {
  it('t8 — l’état vide nomme le filtre actif et propose de l’effacer', async () => {
    const f = await render([serie(1, { readBooks: 0 })]);
    tab(f, 'Ma bibliothèque').click();
    await tick(f);
    const empty = $(f, '.empty')!;
    expect(empty.textContent).toContain('Ma bibliothèque');
    const reset = empty.querySelector('button')!;
    expect(reset.textContent).toContain('Effacer');
    reset.click();
    await tick(f);
    expect($(f, '.empty')).toBeNull();
    expect($$(f, '.serie-card').length).toBe(1);
  });

  it('t8 — la recherche et la lettre sans résultat sont citées', async () => {
    const f = await render([serie(1)]);
    const input = $(f, '.search-bar input') as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await tick(f);
    expect($(f, '.empty')?.textContent).toContain('« zzz »');
  });

  it('t8 — l’onglet « Ordre de lecture » est cité quand « Effacer » le quitte', async () => {
    const f = await render([serie(1)]);
    tab(f, 'Ordre de lecture').click();
    await tick(f);
    const input = $(f, '.search-bar input') as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await tick(f);
    const text = $(f, '.empty')?.textContent ?? '';
    expect(text).toContain('Ordre de lecture');
    expect(text).toContain('« zzz »');
  });

  it('t8 — les lettres sans série sont désactivées, celle qui est active reste utilisable', async () => {
    const f = await render([serie(0, { titre: 'Alpha' }), serie(1, { titre: 'Bêta' })]);
    const letter = (l: string) => $$(f, '.letter').find((b) => b.textContent?.trim() === l) as HTMLButtonElement;
    expect(letter('A').disabled).toBe(false);
    expect(letter('B').disabled).toBe(false);
    expect(letter('C').disabled).toBe(true);
    expect(letter('#').disabled).toBe(true);
    letter('A').click();
    await tick(f);
    expect(letter('A').disabled).toBe(false);
    expect(letter('B').disabled).toBe(false);
  });

  it('t8 — « # » filtre les titres qui ne commencent pas par une lettre', async () => {
    const f = await render([serie(0, { titre: '40 000 ans' }), serie(1, { titre: 'Alpha' })]);
    const hash = $$(f, '.letter').find((b) => b.textContent?.trim() === '#') as HTMLButtonElement;
    expect(hash.disabled).toBe(false);
    hash.click();
    await tick(f);
    expect($$(f, '.card-title').map((e) => e.textContent?.trim())).toEqual(['40 000 ans']);
  });
});

describe('Romans — boutons de couverture (L5/t9)', () => {
  it('t9 — chaque bouton de couverture porte le titre de la série', async () => {
    const f = await render([serie(1, { titre: 'Les Fantômes de Gaunt' })]);
    (f.componentInstance as any).wikiImages.set(new Map([['s1', 'http://x/y.jpg']]));
    await tick(f);
    expect($(f, '.card-image')?.getAttribute('aria-label')).toBe('Voir la couverture de Les Fantômes de Gaunt');
  });

  it('t9 — sans image, le bouton le dit (aria-disabled, nom honnête, pas d’icône) et ne fait rien', async () => {
    const f = await render([serie(1, { titre: 'Les Fantômes de Gaunt' })]);
    const b = $(f, '.card-image')!;
    expect(b.getAttribute('aria-disabled')).toBe('true');
    expect(b.getAttribute('aria-label')).toBe('Couverture indisponible : Les Fantômes de Gaunt');
    expect(b.querySelector('.card-zoom')).toBeNull();
  });

  it('t9 — l’icône d’agrandissement apparaît aussi au focus clavier', () => {
    const shown = postcss.parse(css);
    let ok = false;
    shown.walkRules((r) => {
      const sels = r.selectors.map((s) => s.replace(/\s+/g, ' ').trim());
      if (sels.includes('.card-image:focus-visible .card-zoom')) r.walkDecls('opacity', (d) => { ok = d.value === '1'; });
    });
    expect(ok).toBe(true);
  });
});
