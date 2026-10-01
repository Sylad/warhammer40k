// L23 — navigation : lien « Nouveautés » au bureau et dans le menu du téléphone, pastille des
// nouveautés non vues, menu du téléphone (tiroir) inerte quand il est fermé.
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MainLayoutComponent } from './main-layout.component';
import { NEWS_SEEN_KEY } from '../../features/nouveautes/news-badge';
import { routes } from '../../app.routes';

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
    await setupTestBed([MainLayoutComponent], [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]);
  });

  it('la route /nouveautes charge la page Nouveautés', async () => {
    const layout = routes.find((r) => r.component === MainLayoutComponent)!;
    const route = layout.children!.find((r) => r.path === 'nouveautes')!;
    const component = await (route.loadComponent as () => Promise<{ name: string }>)();
    expect(component.name).toBe('NouveautesComponent');
  });

  it('lien « Nouveautés » dans la barre du bureau, juste avant « À propos »', async () => {
    const f = await render();
    const links = [...el(f).querySelectorAll<HTMLAnchorElement>('nav.nav > a')];
    const labels = links.map((a) => a.textContent!.replace(/\s+/g, ' ').trim());
    const i = labels.findIndex((l) => l.includes('Nouveautés'));
    expect(i).toBeGreaterThan(-1);
    expect(links[i].getAttribute('href')).toBe('/nouveautes');
    expect(labels[i + 1]).toContain('À propos');
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
});
