// L5/t2 — la visionneuse de couverture est un dialogue nommé qui garde le focus (comme la modale de /videos).
import { setupTestBed } from '../../../testing/angular-testbed';
import { beforeEach, describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import type { LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SeriesCoverViewerComponent } from './series-cover-viewer.component';

const ETAT: LightboxState = {
  title: 'Eisenhorn', subtitle: 'Abnett', contextName: 'Black Library', contextColor: '#c9a24a', contextSigil: '▤',
  searchQuery: 'Eisenhorn', mainUrl: 'x.jpg', thumbUrls: ['x.jpg', 'y.jpg'], selectedIdx: 0,
};

const $ = (f: ComponentFixture<unknown>, sel: string) => (f.nativeElement as HTMLElement).querySelector(sel) as HTMLElement | null;
const tick = async (f: ComponentFixture<unknown>) => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };

async function ouvert(): Promise<ComponentFixture<SeriesCoverViewerComponent>> {
  await setupTestBed([SeriesCoverViewerComponent], [provideRouter([])]);
  const opener = document.createElement('button');
  opener.id = 'opener';
  document.body.appendChild(opener);
  const f = TestBed.createComponent(SeriesCoverViewerComponent);
  // Le JIT de Vitest ne reconnaît pas les entrées-signaux (pas de transformation AOT) : on remplace le champ.
  const state = signal<LightboxState | null>(null);
  (f.componentInstance as unknown as { state: unknown }).state = state;
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  opener.focus();
  f.componentInstance.closed.subscribe(() => state.set(null));
  state.set(ETAT);
  await tick(f);
  return f;
}

beforeEach(() => { document.body.innerHTML = ''; });

describe('Visionneuse de couverture (L5/t2)', () => {
  it('t2 — rôle dialog, modale, nommée par son titre, image avec alternative', async () => {
    const f = await ouvert();
    const d = $(f, '[role="dialog"]')!;
    expect(d.getAttribute('aria-modal')).toBe('true');
    const titre = $(f, `#${d.getAttribute('aria-labelledby')}`);
    expect(titre?.textContent).toContain('Eisenhorn');
    expect($(f, '.lightbox-image')?.getAttribute('role')).toBe('img');
    expect($(f, '.lightbox-image')?.getAttribute('aria-label')).toContain('Eisenhorn');
  });

  it('t2 — le focus entre dans le dialogue (bouton Fermer) à l’ouverture', async () => {
    const f = await ouvert();
    expect(document.activeElement).toBe($(f, '.lightbox-close'));
  });

  it('t2 — Tab et Maj+Tab bouclent dans le dialogue', async () => {
    const f = await ouvert();
    const items = [...(f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.lightbox button, .lightbox a[href]')];
    const last = items[items.length - 1];
    last.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    $(f, '.lightbox')!.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items[0]);
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    $(f, '.lightbox')!.dispatchEvent(back);
    expect(document.activeElement).toBe(last);
  });

  it('t2 — à la fermeture le focus revient au bouton d’origine', async () => {
    const f = await ouvert();
    $(f, '.lightbox-close')!.click();
    await tick(f);
    expect($(f, '.lightbox')).toBeNull();
    expect(document.activeElement).toBe(document.getElementById('opener'));
  });
});
