// L163 (WCAG 2.4.3) — la recherche Ctrl+K rend le focus à l'élément d'avant quand elle se ferme sans
// destination, et Tab boucle dans la recherche au lieu de sortir vers la page dessous.
import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed } from '../../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../../core/services/warhammer.service';
import { CommandPaletteComponent } from './command-palette.component';

async function monter() {
  await setupTestBed([CommandPaletteComponent as never], [
    provideRouter([{ path: '**', children: [] }]),
    { provide: WarhammerService, useValue: fakeWarhammerService({
      factions$: of([{ id: 'a', nom: 'Aaa un', alignement: 'x' }, { id: 'b', nom: 'Aaa deux', alignement: 'x' }]),
    }) },
  ]);
  const avant = document.createElement('button');
  avant.textContent = 'avant';
  document.body.appendChild(avant);
  avant.focus();
  const f = TestBed.createComponent(CommandPaletteComponent);
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  const palette = f.componentInstance;
  const el = f.nativeElement as HTMLElement;
  return { f, palette, el, avant };
}
const touche = (cible: Element, key: string, shiftKey = false) => {
  const e = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  cible.dispatchEvent(e);
  return e;
};

describe('focus de la recherche Ctrl+K (L163)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    document.body.innerHTML = '';
  });

  it('R1 — Échap rend le focus à l\'élément qui l\'avait avant l\'ouverture', async () => {
    const { f, palette, avant } = await monter();
    palette.open(); f.detectChanges();
    el_input(f).focus();
    touche(document.body, 'Escape');
    f.detectChanges();
    expect(palette.isOpen()).toBe(false);
    expect(document.activeElement).toBe(avant);
  });

  it('R2 — Ctrl+K de nouveau et clic sur le fond rendent aussi le focus', async () => {
    const { f, palette, el, avant } = await monter();
    palette.open(); f.detectChanges();
    el_input(f).focus();
    palette.onGlobalKey(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    f.detectChanges();
    expect(document.activeElement).toBe(avant);
    avant.focus();
    palette.open(); f.detectChanges();
    el_input(f).focus();
    el.querySelector<HTMLElement>('.cmdk-backdrop')!.click();
    f.detectChanges();
    expect(document.activeElement).toBe(avant);
  });

  it('R3 — un résultat choisi ne reprend pas le focus : la page d\'arrivée le place sur son titre', async () => {
    const { f, palette, el, avant } = await monter();
    palette.open(); f.detectChanges();
    palette.query = 'aaa'; palette.onQueryChange('aaa'); f.detectChanges();
    el_input(f).focus();
    el.querySelector<HTMLAnchorElement>('.cmdk-item')!.click();
    f.detectChanges();
    expect(palette.isOpen()).toBe(false);
    expect(document.activeElement).not.toBe(avant);
  });

  it('R4 — si l\'élément d\'avant a disparu, rien ne plante et le focus ne va nulle part de faux', async () => {
    const { f, palette, avant } = await monter();
    palette.open(); f.detectChanges();
    avant.remove();
    expect(() => { palette.close(); f.detectChanges(); }).not.toThrow();
    expect(document.activeElement).toBe(document.body);
  });

  it('R5 — Tab sur le dernier élément revient au champ, Maj+Tab sur le champ va au dernier', async () => {
    const { f, palette, el } = await monter();
    palette.open(); f.detectChanges();
    palette.query = 'aaa'; palette.onQueryChange('aaa'); f.detectChanges();
    const champ = el_input(f);
    const liens = Array.from(el.querySelectorAll<HTMLElement>('.cmdk-item'));
    expect(liens).toHaveLength(2);
    liens[1].focus();
    expect(touche(liens[1], 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(champ);
    expect(touche(champ, 'Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(liens[1]);
  });

  it('R6 — Tab au milieu de la recherche garde son comportement natif', async () => {
    const { f, palette, el } = await monter();
    palette.open(); f.detectChanges();
    palette.query = 'aaa'; palette.onQueryChange('aaa'); f.detectChanges();
    const champ = el_input(f);
    champ.focus();
    expect(touche(champ, 'Tab').defaultPrevented).toBe(false);
    const liens = Array.from(el.querySelectorAll<HTMLElement>('.cmdk-item'));
    liens[0].focus();
    expect(touche(liens[0], 'Tab', true).defaultPrevented).toBe(false);
  });

  it('R7 — sans résultat, Tab reste sur le champ (seul élément focalisable)', async () => {
    const { f, palette } = await monter();
    palette.open(); f.detectChanges();
    const champ = el_input(f);
    champ.focus();
    expect(touche(champ, 'Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(champ);
  });

  it('R8 — un clic dans une zone non focalisable du panneau ne fait pas perdre le focus (Tab ne fuit pas)', async () => {
    const { f, palette, el } = await monter();
    palette.open(); f.detectChanges();
    const champ = el_input(f);
    champ.focus();
    const pied = el.querySelector<HTMLElement>('.cmdk-footer')!;
    const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    pied.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    const surChamp = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    champ.dispatchEvent(surChamp);
    expect(surChamp.defaultPrevented).toBe(false);
  });
});

function el_input(f: { nativeElement: HTMLElement }): HTMLInputElement {
  return f.nativeElement.querySelector<HTMLInputElement>('.cmdk-input')!;
}
