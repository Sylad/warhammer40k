// L86 (suite de L81, QA prod 10-10) : le logo ⚜ (en-tête et pied) et les pictos de la navigation
// (⌂ ⚔ ▤ ▶ ▦ ✠ et le chevron ▾) sont décoratifs — masqués aux lecteurs d'écran.
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MainLayoutComponent } from './main-layout.component';

const GLYPHES = /[⌂⚔▤▶▦✠⚜▾]/;

// Texte lu par un lecteur d'écran : les sous-arbres aria-hidden sont ignorés.
function texteAccessible(n: Node): string {
  if (n.nodeType === Node.TEXT_NODE) return n.textContent ?? '';
  if (n.nodeType !== Node.ELEMENT_NODE) return '';
  if ((n as Element).getAttribute('aria-hidden') === 'true') return '';
  return [...n.childNodes].map(texteAccessible).join('');
}

describe('Gabarit — glyphes décoratifs (L86)', () => {
  it('le logo, les pictos et le chevron de la navigation ne sont pas lus', async () => {
    stubFetch({ '/nouveautes-data/nouveautes.json': { project: 'warhammer40k', generated: '', entries: [] }, '/nouveautes-data/tailles.json': {} });
    await setupTestBed([MainLayoutComponent], [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]);
    const f = TestBed.createComponent(MainLayoutComponent);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const root = f.nativeElement as HTMLElement;
    const zones = [root.querySelector('header.topbar')!, root.querySelector('nav.nav')!, root.querySelector('footer.legal')!];
    for (const z of zones) expect(texteAccessible(z)).not.toMatch(GLYPHES);
    expect(root.querySelectorAll('.aigle')).toHaveLength(2);
    for (const a of root.querySelectorAll('.aigle')) expect(a.getAttribute('aria-hidden')).toBe('true');
    const pictos = [...root.querySelectorAll('nav.nav .nav-ico')];
    expect(pictos.length).toBeGreaterThanOrEqual(6);
    for (const p of pictos) expect(p.getAttribute('aria-hidden')).toBe('true');
    expect(texteAccessible(root.querySelector('nav.nav a[href="/factions"]')!).trim()).toBe('Factions');
  });
});
