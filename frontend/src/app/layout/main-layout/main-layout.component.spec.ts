// L23 — navigation : lien « Nouveautés » au bureau et dans le menu du téléphone, pastille des
// nouveautés non vues, menu du téléphone (tiroir) inerte quand il est fermé.
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { By } from '@angular/platform-browser';
import { MainLayoutComponent } from './main-layout.component';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';
import { NEWS_SEEN_KEY } from '../../features/nouveautes/news-badge';
import { routes } from '../../app.routes';

@Component({ standalone: true, template: `<h1>Page d’arrivée</h1><p>contenu</p>` })
class ArrivalPage {}

const NEWS = {
  project: 'warhammer40k', generated: '',
  entries: [
    { slug: 'b', title: 'B', date: '2026-10-01', lots: [], captures: [], html: '' },
    { slug: 'a', title: 'A', date: '2026-09-28', lots: [], captures: [], html: '' },
  ],
};

async function render(): Promise<ComponentFixture<MainLayoutComponent>> {
  const f = TestBed.createComponent(MainLayoutComponent);
  f.detectChanges();
  await f.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  f.detectChanges();
  return f;
}
const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;

describe('navigation — Nouveautés et menu du téléphone (L23)', () => {
  beforeEach(async () => {
    localStorage.clear();
    document.body.style.overflow = '';
    stubFetch({ '/nouveautes-data/nouveautes.json': NEWS, '/nouveautes-data/tailles.json': {} });
    await setupTestBed([MainLayoutComponent], [
      provideRouter([{ path: 'about', component: ArrivalPage }, { path: 'plan', component: ArrivalPage }, { path: '', component: ArrivalPage }]),
      provideHttpClient(), provideHttpClientTesting(),
    ]);
  });

  it('la route /nouveautes charge la page Nouveautés', async () => {
    const layout = routes.find((r) => r.component === MainLayoutComponent)!;
    const route = layout.children!.find((r) => r.path === 'nouveautes')!;
    const component = await (route.loadComponent as () => Promise<{ name: string }>)();
    expect(component.name).toBe('NouveautesComponent');
  });

  it('barre du bureau (option b) : Accueil … Lore, puis le bouton « À propos ▾ » qui regroupe Nouveautés, Plan de travail, À propos du codex (L30)', async () => {
    const f = await render();
    const nav = el(f).querySelector('nav.nav')!;
    const top = [...nav.querySelectorAll<HTMLAnchorElement>(':scope > a, :scope > .nav-dropdown > a')].map((a) => a.getAttribute('href'));
    expect(top).toEqual(['/', '/factions', '/romans', '/videos', '/gallery', '/lore']);
    const menu = nav.lastElementChild!;
    expect(menu.tagName.toLowerCase()).toBe('app-about-menu');
    expect([...menu.querySelectorAll('#menu-a-propos a')].map((a) => a.getAttribute('href'))).toEqual(['/nouveautes', '/plan', '/about']);
  });

  it('pied de page : « Nouveautés · Plan de travail · À propos » sur chaque page (L30)', async () => {
    const f = await render();
    const footer = el(f).querySelector('footer')!;
    const links = [...footer.querySelectorAll<HTMLAnchorElement>('nav.legal-nav a')];
    expect(footer.querySelector('nav.legal-nav')!.getAttribute('aria-label')).toBe('Le codex');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/nouveautes', '/plan', '/about']);
    expect(links.map((a) => a.textContent!.trim())).toEqual(['Nouveautés', 'Plan de travail', 'À propos']);
    await TestBed.inject(Router).navigateByUrl('/about');
    f.detectChanges();
    expect(el(f).querySelectorAll('footer nav.legal-nav a')).toHaveLength(3);
  });

  it('la route /plan charge la page Plan de travail (L30)', async () => {
    const layout = routes.find((r) => r.component === MainLayoutComponent)!;
    const route = layout.children!.find((r) => r.path === 'plan')!;
    const component = await (route.loadComponent as () => Promise<{ name: string }>)();
    expect(component.name).toBe('PlanComponent');
  });

  it('menu du téléphone : « Plan de travail » juste après « Nouveautés » (L30)', async () => {
    const f = await render();
    const hrefs = [...el(f).querySelectorAll<HTMLAnchorElement>('#menu-telephone a')].map((a) => a.getAttribute('href'));
    const i = hrefs.indexOf('/nouveautes');
    expect(i).toBeGreaterThan(-1);
    expect(hrefs[i + 1]).toBe('/plan');
    expect(el(f).querySelector('#menu-telephone a[href="/plan"]')!.textContent!.trim()).toBe('Plan de travail');
  });

  it('fil d’Ariane : « Plan de travail » pour /plan (L30)', () => {
    const src = readFileSync(resolve(__dirname, '../../shared/components/breadcrumb/breadcrumb.component.ts'), 'utf8');
    expect(src).toMatch(/plan: 'Plan de travail'/);
  });

  it('menu du téléphone : bouton « Menu » relié au tiroir, tiroir inerte et caché quand il est fermé', async () => {
    const f = await render();
    const button = el(f).querySelector<HTMLButtonElement>('button.menu-toggle')!;
    const drawer = el(f).querySelector<HTMLElement>('#menu-telephone')!;
    expect(button.getAttribute('aria-controls')).toBe('menu-telephone');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.textContent).toContain('Menu');
    expect(drawer.hasAttribute('inert')).toBe(true);
    expect(drawer.querySelector('a[href="/nouveautes"]')).not.toBeNull();
    expect(drawer.querySelector('a[href="/about"]')).not.toBeNull();
  });

  it('ouvrir le menu : tiroir actif, page bloquée, focus dans le tiroir ; Échap ferme et rend le focus', async () => {
    const f = await render();
    const button = el(f).querySelector<HTMLButtonElement>('button.menu-toggle')!;
    button.click();
    f.detectChanges();
    const drawer = el(f).querySelector<HTMLElement>('#menu-telephone')!;
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(drawer.hasAttribute('inert')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');
    expect(drawer.contains(document.activeElement)).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(drawer.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(button);
  });

  it('menu ouvert : Tab boucle dans le tiroir (le focus ne part pas derrière le voile)', async () => {
    const f = await render();
    el(f).querySelector<HTMLButtonElement>('button.menu-toggle')!.click();
    f.detectChanges();
    const drawer = el(f).querySelector<HTMLElement>('#menu-telephone')!;
    const focusables = [...drawer.querySelectorAll<HTMLElement>('a, button')];
    focusables[focusables.length - 1].focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(focusables[0]);
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    document.activeElement!.dispatchEvent(back);
    expect(document.activeElement).toBe(focusables[focusables.length - 1]);
  });

  it('tiroir ouvert : le reste de la page est inerte (en-tête hors bouton Menu, fil d’Ariane, main, pied) ; rendu à la fermeture', async () => {
    const f = await render();
    const outside = ['.brand', 'nav.nav', '.nav-search-btn', 'app-demo-banner', 'app-breadcrumb', 'main', 'footer'];
    const button = el(f).querySelector<HTMLButtonElement>('button.menu-toggle')!;
    button.click();
    f.detectChanges();
    for (const sel of outside) expect(el(f).querySelector(sel)!.hasAttribute('inert'), sel).toBe(true);
    expect(button.hasAttribute('inert')).toBe(false);
    expect(button.closest('[inert]')).toBeNull();
    expect(el(f).querySelector('#menu-telephone')!.closest('[inert]')).toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    for (const sel of outside) expect(el(f).querySelector(sel)!.hasAttribute('inert'), sel).toBe(false);
  });

  it('lien du tiroir : à l’arrivée, le focus va au titre h1 de la page (pas sur BODY)', async () => {
    const f = await render();
    el(f).querySelector<HTMLButtonElement>('button.menu-toggle')!.click();
    f.detectChanges();
    el(f).querySelector<HTMLAnchorElement>('#menu-telephone a[href="/about"]')!.click();
    await f.whenStable();
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 20));
    const h1 = el(f).querySelector('main h1')!;
    expect(document.activeElement).toBe(h1);
    expect(h1.getAttribute('tabindex')).toBe('-1');
  });

  it('recherche rapide : Ctrl+K → « Plan de travail » → Entrée : le focus va au titre h1 de la page (L30)', async () => {
    const f = await render();
    const palette = f.debugElement.query(By.directive(CommandPaletteComponent)).componentInstance as CommandPaletteComponent;
    palette.open();
    f.detectChanges();
    palette.query = 'plan de';
    palette.onQueryChange('plan de');
    f.detectChanges();
    expect(palette.results()[0].label).toBe('Plan de travail');
    palette.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));
    await f.whenStable();
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 20));
    expect(TestBed.inject(Router).url).toBe('/plan');
    const h1 = el(f).querySelector('main h1')!;
    expect(document.activeElement).toBe(h1);
  });

  it('recherche rapide : clic sur un résultat → même arrivée sur le h1 (L30)', async () => {
    const f = await render();
    const palette = f.debugElement.query(By.directive(CommandPaletteComponent)).componentInstance as CommandPaletteComponent;
    palette.open();
    palette.query = 'plan de';
    palette.onQueryChange('plan de');
    f.detectChanges();
    el(f).querySelector<HTMLAnchorElement>('.cmdk-item')!.click();
    await f.whenStable();
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 20));
    expect(document.activeElement).toBe(el(f).querySelector('main h1'));
  });

  it('« À propos ▾ » : lien du panneau → le focus va au titre h1 de la page d’arrivée (L30, WCAG 2.4.3)', async () => {
    const f = await render();
    el(f).querySelector<HTMLButtonElement>('button.about-toggle')!.click();
    f.detectChanges();
    el(f).querySelector<HTMLAnchorElement>('#menu-a-propos a[href="/plan"]')!.click();
    await f.whenStable();
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 20));
    expect(TestBed.inject(Router).url).toBe('/plan');
    expect(document.activeElement).toBe(el(f).querySelector('main h1'));
  });

  it('navigation hors tiroir : le focus n’est pas déplacé', async () => {
    const f = await render();
    const button = el(f).querySelector<HTMLButtonElement>('button.menu-toggle')!;
    button.focus();
    await TestBed.inject(Router).navigateByUrl('/about');
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 20));
    expect(document.activeElement).toBe(button);
  });

  it('le menu se referme après un changement de page', async () => {
    const f = await render();
    el(f).querySelector<HTMLButtonElement>('button.menu-toggle')!.click();
    f.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    f.detectChanges();
    expect(el(f).querySelector('#menu-telephone')!.hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('');
  });

  it('premier visiteur : pas de pastille', async () => {
    const f = await render();
    expect(el(f).querySelectorAll('.news-badge')).toHaveLength(0);
  });

  it('nouveautés non vues : pastille sur le lien (bureau et tiroir) et sur le bouton Menu, texte pour lecteur d’écran', async () => {
    localStorage.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-28', slugs: ['a'] }));
    const f = await render();
    const desk = el(f).querySelector('nav.nav a[href="/nouveautes"]')!;
    expect(desk.querySelector('.news-badge')!.textContent!.trim()).toBe('1');
    expect(desk.querySelector('.sr-only')!.textContent).toContain('1 nouveauté non vue');
    expect(el(f).querySelector('#menu-telephone a[href="/nouveautes"] .news-badge')!.textContent!.trim()).toBe('1');
    expect(el(f).querySelector('button.menu-toggle .news-badge')).not.toBeNull();
    expect(el(f).querySelector('button.menu-toggle')!.getAttribute('aria-label')).toContain('1 nouveauté non vue');
  });

  it('la recherche rapide (Ctrl+K) propose la page Nouveautés', () => {
    const src = readFileSync(resolve(__dirname, '../../shared/components/command-palette/command-palette.component.ts'), 'utf8');
    expect(src).toMatch(/label: 'Nouveautés'.*routerLink: \['\/nouveautes'\]/);
  });

  it('la recherche rapide (Ctrl+K) propose la page Plan de travail (L30)', () => {
    const src = readFileSync(resolve(__dirname, '../../shared/components/command-palette/command-palette.component.ts'), 'utf8');
    expect(src).toMatch(/label: 'Plan de travail'.*routerLink: \['\/plan'\]/);
  });
});
