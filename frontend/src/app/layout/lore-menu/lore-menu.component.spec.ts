// L37 — « Lore ▾ » de la barre du haut : bouton à divulgation (comme « À propos ▾ », L30), ses
// liens ne sont dans l'ordre de tabulation que panneau ouvert.
import { setupTestBed } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoreMenuComponent } from './lore-menu.component';

@Component({ standalone: true, template: `<h1>Page</h1>` })
class Page {}

@Component({
  standalone: true,
  imports: [LoreMenuComponent],
  template: `<button id="ailleurs">ailleurs</button><app-lore-menu />`,
})
class Host {}

const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
const button = (f: ComponentFixture<unknown>) => el(f).querySelector<HTMLButtonElement>('button.lore-toggle')!;
const panel = (f: ComponentFixture<unknown>) => el(f).querySelector<HTMLElement>('#menu-lore')!;

/** Liens atteignables par Tab : ni dans un parent `hidden`, ni inertes (jsdom ne calcule pas `display`). */
const tabbable = (f: ComponentFixture<unknown>) =>
  [...el(f).querySelectorAll<HTMLAnchorElement>('a[href]')].filter((a) => !a.closest('[hidden], [inert]'));

async function render(): Promise<ComponentFixture<Host>> {
  await TestBed.inject(Router).navigateByUrl('/');
  const f = TestBed.createComponent(Host);
  f.detectChanges();
  await f.whenStable();
  return f;
}

describe('« Lore ▾ » — bouton à divulgation (L37)', () => {
  beforeEach(async () => {
    document.body.innerHTML = '';
    await setupTestBed([Host], [provideRouter([
      { path: 'lore', component: Page }, { path: 'lore/emperor', component: Page }, { path: 'factions', component: Page }, { path: '', component: Page },
    ])]);
  });

  it('R1 — bouton (pas de role=menu) relié à son panneau, fermé au départ', async () => {
    const f = await render();
    const b = button(f);
    expect(b.getAttribute('type')).toBe('button');
    expect(b.getAttribute('aria-controls')).toBe('menu-lore');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.textContent).toContain('Lore');
    expect(panel(f).hidden).toBe(true);
    expect(el(f).querySelector('[role="menu"], [role="menuitem"]')).toBeNull();
  });

  it('R2 — fermé, aucun des liens du panneau n’est dans l’ordre de tabulation ; ouvert, ils y sont tous', async () => {
    const f = await render();
    expect(panel(f).querySelectorAll('a').length).toBe(12);
    expect(tabbable(f)).toEqual([]);
    button(f).click();
    f.detectChanges();
    expect(tabbable(f).length).toBe(12);
  });

  it('R3 — panneau : « Vue d’ensemble » (/lore, la page d’accueil du lore) puis les 11 sections, dans l’ordre des colonnes', async () => {
    const f = await render();
    expect([...panel(f).querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      '/lore', '/lore/emperor', '/lore/primarchs', '/lore/saints',
      '/lore/chaos-gods', '/lore/galaxy', '/lore/concepts', '/lore/civilians',
      '/lore/timeline', '/lore/equipment', '/lore/ships', '/lore/titans',
    ]);
    expect([...panel(f).querySelectorAll('h4')].map((h) => h.textContent)).toEqual(['Origines', 'Cosmologie', 'Guerre & Histoire']);
  });

  it('R4 — Entrée / clic ouvre puis ferme, aria-expanded suit', async () => {
    const f = await render();
    button(f).click();
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('true');
    expect(panel(f).hidden).toBe(false);
    button(f).click();
    f.detectChanges();
    expect(button(f).getAttribute('aria-expanded')).toBe('false');
    expect(panel(f).hidden).toBe(true);
  });

  it('R5 — Échap ferme et rend le focus au bouton', async () => {
    const f = await render();
    button(f).click();
    f.detectChanges();
    const link = panel(f).querySelector<HTMLAnchorElement>('a[href="/lore/saints"]')!;
    link.focus();
    link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    f.detectChanges();
    expect(panel(f).hidden).toBe(true);
    expect(document.activeElement).toBe(button(f));
  });

  it('R6 — le focus qui quitte le groupe ferme ; un focus interne ne ferme pas', async () => {
    const f = await render();
    document.body.appendChild(el(f));
    button(f).click();
    f.detectChanges();
    const link = panel(f).querySelector<HTMLAnchorElement>('a[href="/lore/saints"]')!;
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: panel(f).querySelector('a[href="/lore/galaxy"]') }));
    f.detectChanges();
    expect(panel(f).hidden).toBe(false);
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: el(f).querySelector('#ailleurs') }));
    f.detectChanges();
    expect(panel(f).hidden).toBe(true);
  });

  it('R7 — un clic à l’extérieur ferme ; un clic dans le panneau ne ferme pas par lui-même', async () => {
    const f = await render();
    document.body.appendChild(el(f));
    button(f).click();
    f.detectChanges();
    panel(f).querySelector('h4')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    f.detectChanges();
    expect(panel(f).hidden).toBe(false);
    el(f).querySelector<HTMLElement>('#ailleurs')!.click();
    f.detectChanges();
    expect(panel(f).hidden).toBe(true);
  });

  it('R8 — suivre un lien ferme le panneau et signale la navigation (focus à l’arrivée)', async () => {
    const f = await render();
    let navigated = 0;
    f.debugElement.query((d) => d.name === 'app-lore-menu').componentInstance.navigated.subscribe(() => navigated++);
    button(f).click();
    f.detectChanges();
    panel(f).querySelector<HTMLAnchorElement>('a[href="/lore/emperor"]')!.click();
    await f.whenStable();
    f.detectChanges();
    expect(panel(f).hidden).toBe(true);
    expect(navigated).toBe(1);
  });

  it('R9 — le bouton est actif sur /lore et ses sous-pages, pas ailleurs (« /lorem » exclu)', async () => {
    const f = await render();
    const router = TestBed.inject(Router);
    expect(button(f).classList.contains('active')).toBe(false);
    for (const [url, actif] of [['/lore/emperor', true], ['/lore', true], ['/factions', false]] as const) {
      await router.navigateByUrl(url);
      f.detectChanges();
      expect(button(f).classList.contains('active'), url).toBe(actif);
    }
  });

  it('R10 — close() referme sans déplacer le focus et émet openChange', async () => {
    const f = await render();
    const emis: boolean[] = [];
    f.debugElement.query((d) => d.name === 'app-lore-menu').componentInstance.openChange.subscribe((v: boolean) => emis.push(v));
    button(f).click();
    f.detectChanges();
    f.debugElement.query((d) => d.name === 'app-lore-menu').componentInstance.close();
    f.detectChanges();
    expect(panel(f).hidden).toBe(true);
    expect(emis).toEqual([true, false]);
  });
});
