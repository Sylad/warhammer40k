import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { polyfillDialog, setupTestBed } from '../../../testing/angular-testbed';
import { UnitDatasheetDialogComponent } from './unit-datasheet-dialog.component';

// L120 (revue UX, F2) : la fenêtre défile (conteneur .ds-scroll) ; le focus restant sur « Fermer », le clavier
// fait défiler l'image (WCAG 2.1.1). Les mesures de largeur sont dans le test e2e (navigateur).
async function mount() {
  polyfillDialog();
  await setupTestBed([UnitDatasheetDialogComponent]);
  const f = TestBed.createComponent(UnitDatasheetDialogComponent);
  f.componentRef.setInput('src', '/x.jpg');
  f.componentRef.setInput('alt', 'alt');
  f.componentRef.setInput('label', 'label');
  f.detectChanges();
  const dlg = f.nativeElement.querySelector('dialog') as HTMLDialogElement;
  const scroll = f.nativeElement.querySelector('.ds-scroll') as HTMLElement;
  const scrollBy = vi.fn();
  scroll.scrollBy = scrollBy as never;
  const press = (key: string) => {
    const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    dlg.dispatchEvent(e);
    return e;
  };
  return { f, dlg, scroll, scrollBy, press };
}

describe('fenêtre d\'agrandissement — défilement au clavier (L120)', () => {
  it('l\'image est dans un conteneur .ds-scroll, après le bouton Fermer', async () => {
    const { dlg, scroll } = await mount();
    expect(scroll.querySelector('img.ds-img')).not.toBeNull();
    expect(Array.from(dlg.children).map((c) => c.className)).toEqual(['ds-close', 'ds-scroll']);
  });

  it('les flèches, pages, Début et Fin font défiler le conteneur et ne laissent pas la page défiler', async () => {
    const { scrollBy, press } = await mount();
    expect(press('ArrowDown').defaultPrevented).toBe(true);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 0, top: 48 });
    press('ArrowUp');
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 0, top: -48 });
    press('ArrowRight');
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 48, top: 0 });
    press('ArrowLeft');
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -48, top: 0 });
    press('PageDown');
    press('PageUp');
    press('Home');
    press('End');
    expect(scrollBy).toHaveBeenCalledTimes(8);
  });

  it('Tab reste sur Fermer et Échap ferme, comme avant', async () => {
    const { f, press } = await mount();
    const closed = vi.fn();
    f.componentInstance.closed.subscribe(closed);
    expect(press('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement?.className).toBe('ds-close');
    expect(press('Escape').defaultPrevented).toBe(true);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it('les touches sans rapport avec le défilement ne sont pas interceptées', async () => {
    const { scrollBy, press } = await mount();
    expect(press('a').defaultPrevented).toBe(false);
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
