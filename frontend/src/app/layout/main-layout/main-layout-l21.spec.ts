// L21 (revue UX du gabarit) — lien d'évitement, navigation nommée, page courante annoncée.
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MainLayoutComponent } from './main-layout.component';
import { QuotaAlertService } from '../../core/services/quota-alert.service';

@Component({ standalone: true, template: `<h1>Page</h1>` })
class Page {}

async function render(url = '/'): Promise<ComponentFixture<MainLayoutComponent>> {
  const f = TestBed.createComponent(MainLayoutComponent);
  await TestBed.inject(Router).navigateByUrl(url);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;

describe('Gabarit — revue UX L21', () => {
  beforeEach(async () => {
    localStorage.clear();
    stubFetch({ '/nouveautes-data/nouveautes.json': { project: 'warhammer40k', generated: '', entries: [] }, '/nouveautes-data/tailles.json': {} });
    await setupTestBed([MainLayoutComponent], [
      provideRouter([{ path: 'factions', component: Page }, { path: 'lore', component: Page }, { path: 'lore/emperor', component: Page }, { path: 'about', component: Page }, { path: '', component: Page }]),
      provideHttpClient(), provideHttpClientTesting(),
    ]);
  });

  it('R1 — le lien « Aller au contenu » est le premier élément focalisable et mène à <main id="contenu">', async () => {
    const f = await render('/factions');
    const first = el(f).querySelector<HTMLElement>('a[href], button, [tabindex]')!;
    expect(first.classList.contains('skip-link')).toBe(true);
    expect(first.textContent!.trim()).toBe('Aller au contenu');
    expect(first.getAttribute('href')).toBe(`${location.pathname}${location.search}#contenu`);
    expect(el(f).querySelector('main')!.id).toBe('contenu');
  });

  it('R1 — activer le lien d\'évitement donne le focus à <main>', async () => {
    const f = await render('/factions');
    Element.prototype.scrollIntoView = () => {}; // absent de jsdom
    document.body.appendChild(el(f));
    el(f).querySelector<HTMLElement>('.skip-link')!.click();
    expect(document.activeElement).toBe(el(f).querySelector('main'));
    el(f).remove();
  });

  it('R2 — la barre du bureau est une navigation nommée « Menu principal »', async () => {
    const f = await render();
    expect(el(f).querySelector('nav.nav')!.getAttribute('aria-label')).toBe('Menu principal');
  });

  it('R3 — la page courante est annoncée (aria-current) dans la barre, le tiroir et « À propos », pas seulement par la couleur', async () => {
    const f = await render('/factions');
    const courants = (sel: string) => [...el(f).querySelectorAll(`${sel} [aria-current]`)].map((a) => a.getAttribute('href'));
    expect(courants('nav.nav')).toEqual(['/factions']);
    expect(courants('nav.drawer')).toEqual(['/factions']);
    expect(courants('footer')).toEqual([]);
    await TestBed.inject(Router).navigateByUrl('/about');
    f.detectChanges();
    expect(courants('#menu-a-propos')).toEqual(['/about']);
    expect(courants('nav.nav').sort()).toEqual(['/about']);
  });

  it('R3 — « Accueil » n\'est courant que sur /, pas sur les autres pages', async () => {
    const f = await render('/');
    expect([...el(f).querySelectorAll('nav.nav [aria-current]')].map((a) => a.getAttribute('href'))).toEqual(['/']);
    await TestBed.inject(Router).navigateByUrl('/lore/emperor');
    f.detectChanges();
    expect([...el(f).querySelectorAll('nav.nav [aria-current]')].map((a) => a.getAttribute('href'))).toEqual(['/lore']);
  });

  it('R3 — L216 : sur une fiche du Lore, le tiroir marque Lore comme la barre, et Accueil reste réservé à /', async () => {
    const f = await render('/lore/emperor');
    const courants = (sel: string) => [...el(f).querySelectorAll(`${sel} [aria-current]`)].map((a) => a.getAttribute('href'));
    expect(courants('nav.drawer')).toEqual(['/lore']);
    expect(courants('nav.drawer')).toEqual(courants('nav.nav'));
    await TestBed.inject(Router).navigateByUrl('/');
    f.detectChanges();
    expect(courants('nav.drawer')).toEqual(['/']);
  });

  it('R4 — l\'alerte Claude est annoncée (role=alert) et son bouton de fermeture a un nom accessible', async () => {
    const f = await render();
    TestBed.inject(QuotaAlertService).setError('rate');
    f.detectChanges();
    const banner = el(f).querySelector('.quota-banner')!;
    expect(banner.getAttribute('role')).toBe('alert');
    const close = banner.querySelector<HTMLButtonElement>('button.quota-dismiss')!;
    expect(close.getAttribute('aria-label')).toBe('Fermer l\'alerte');
    expect(close.querySelector('[aria-hidden="true"]')!.textContent).toBe('✕');
    close.click();
    f.detectChanges();
    expect(el(f).querySelector('.quota-banner')).toBeNull();
  });
});
