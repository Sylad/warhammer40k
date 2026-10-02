// L30 (option b) — bouton à divulgation « À propos ▾ » de la barre du haut : Nouveautés,
// Plan de travail, À propos du codex. Pas un menu ARIA (role=menu) : un bouton qui montre
// ou cache une liste de liens.
import { setupTestBed } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AboutMenuComponent } from './about-menu.component';

@Component({ standalone: true, template: `<h1>Page</h1>` })
class Page {}

@Component({
  standalone: true,
  imports: [AboutMenuComponent],
  template: `<button id="ailleurs">ailleurs</button><app-about-menu [badge]="badge" [unseenText]="unseen" />`,
})
class Host {
  badge = '';
  unseen = '';
}

const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const button = (f: ComponentFixture<unknown>) => el(f).querySelector<HTMLButtonElement>('button.about-toggle')!;
const panel = (f: ComponentFixture<unknown>) => el(f).querySelector<HTMLElement>('#menu-a-propos')!;

async function render(): Promise<ComponentFixture<Host>> {
  await TestBed.inject(Router).navigateByUrl('/'); // navigation initiale, comme au chargement
  const f = TestBed.createComponent(Host);
  f.detectChanges();
  await f.whenStable();
  return f;
}

describe('« À propos ▾ » — bouton à divulgation (L30)', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
    await setupTestBed([Host], [provideRouter([
      { path: 'nouveautes', component: Page }, { path: 'plan', component: Page }, { path: 'about', component: Page },
      { path: 'factions', component: Page }, { path: '', component: Page },
    ])]);
  });

  it('bouton (pas de role=menu) relié à son panneau, fermé au départ', async () => {
    const f = await render();
    const b = button(f);
    expect(b.getAttribute('type')).toBe('button');
    expect(b.getAttribute('aria-controls')).toBe('menu-a-propos');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.textContent).toContain('À propos');
    expect(panel(f).hidden).toBe(true);
    expect(el(f).querySelector('[role="menu"], [role="menuitem"]')).toBeNull();
  });

  it('panneau : Nouveautés, Plan de travail, À propos du codex — dans cet ordre', async () => {
    const f = await render();
    const links = [...panel(f).querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/nouveautes', '/plan', '/about']);
    expect(links.map((a) => a.textContent!.replace(/\s+/g, ' ').trim())).toEqual(['Nouveautés', 'Plan de travail', 'À propos du codex']);
  });

  it('clic (= Entrée / Espace sur un bouton) : ouvre, puis referme ; le focus reste sur le bouton', async () => {
    const f = await render();
    const b = button(f);
    b.focus();
    b.click();
    f.detectChanges();
    expect(b.getAttribute('aria-expanded')).toBe('true');
    expect(panel(f).hidden).toBe(false);
    expect(document.activeElement).toBe(b);
    b.click();
    f.detectChanges();
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(b);
  });

  it('Échap : referme et rend le focus au bouton (depuis un lien du panneau)', async () => {
    const f = await render();
    button(f).click();
    f.detectChanges();
    const link = panel(f).querySelector('a')!;
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(button(f));
  });

  it('clic à l’extérieur : referme', async () => {
    const f = await render();
    button(f).click();
    f.detectChanges();
    el(f).querySelector<HTMLButtonElement>('#ailleurs')!.click();
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('false');
  });

  it('le focus quitte le bouton et le panneau : referme ; passer du bouton à un lien : reste ouvert', async () => {
    const f = await render();
    button(f).click();
    f.detectChanges();
    const host = el(f).querySelector('app-about-menu')!;
    const link = panel(f).querySelector('a')!;
    host.querySelector('.about-menu')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('true');
    host.querySelector('.about-menu')!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: el(f).querySelector('#ailleurs') }));
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('false');
  });

  it('fin de la navigation initiale après un premier clic : le panneau reste ouvert', async () => {
    const f = TestBed.createComponent(Host); // créé avant la fin de la navigation initiale
    f.detectChanges();
    button(f).click();
    f.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/about');
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('true');
  });

  it('après une navigation : referme', async () => {
    const f = await render();
    button(f).click();
    f.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/plan');
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('false');
  });

  it('clic sur un lien du panneau, même vers la page courante : referme', async () => {
    const f = await render();
    await TestBed.inject(Router).navigateByUrl('/plan');
    button(f).click();
    f.detectChanges();
    panel(f).querySelector<HTMLAnchorElement>('a[href="/plan"]')!.click();
    await f.whenStable();
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('false');
  });

  it('état actif du bouton sur /nouveautes, /plan et /about, pas ailleurs', async () => {
    const f = await render();
    const router = TestBed.inject(Router);
    for (const [url, active] of [['/factions', false], ['/nouveautes', true], ['/plan', true], ['/about', true], ['/', false]] as const) {
      await router.navigateByUrl(url);
      f.detectChanges();
      expect(button(f).classList.contains('active'), url).toBe(active);
    }
  });

  it('nouveautés non vues : pastille sur le bouton et sur le lien Nouveautés ; nom accessible « À propos, N nouveautés non vues »', async () => {
    const f = TestBed.createComponent(Host);
    f.componentInstance.badge = '2';
    f.componentInstance.unseen = '2 nouveautés non vues';
    f.detectChanges();
    const b = button(f);
    expect(b.querySelector('.news-badge')!.textContent!.trim()).toBe('2');
    expect(b.getAttribute('aria-label')).toBe('À propos, 2 nouveautés non vues');
    const news = panel(f).querySelector('a[href="/nouveautes"]')!;
    expect(news.querySelector('.news-badge')!.textContent!.trim()).toBe('2');
    expect(news.querySelector('.sr-only')!.textContent).toContain('2 nouveautés non vues');
  });

  it('sans nouveauté non vue : ni pastille ni nom accessible forcé', async () => {
    const f = await render();
    expect(button(f).hasAttribute('aria-label')).toBe(false);
    expect(el(f).querySelectorAll('.news-badge')).toHaveLength(0);
  });
});
