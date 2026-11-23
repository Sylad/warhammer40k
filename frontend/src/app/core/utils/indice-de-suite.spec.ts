// L108 r1 (M2) — data-suite : posé sur une liste qui déborde et n'est pas au bout, retiré au bout, suivi au défilement.
import { describe, expect, it } from 'vitest';
import { suivreIndiceDeSuite } from './indice-de-suite';

function liste(scrollHeight: number, clientHeight: number): HTMLElement {
  const e = document.createElement('div');
  e.className = 'side-list';
  Object.defineProperty(e, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(e, 'clientHeight', { value: clientHeight, configurable: true });
  return e;
}

describe('suivreIndiceDeSuite (L108 r1)', () => {
  it('déborde et pas au bout → data-suite ; au bout ou sans débordement → rien ; suit le défilement', () => {
    const racine = document.createElement('aside');
    const longue = liste(195, 86);
    const courte = liste(146, 146);
    racine.append(longue, courte);
    document.body.append(racine);
    const arreter = suivreIndiceDeSuite(racine, '.side-list');
    expect(longue.hasAttribute('data-suite')).toBe(true);
    expect(courte.hasAttribute('data-suite')).toBe(false);
    longue.scrollTop = 109;
    longue.dispatchEvent(new Event('scroll'));
    expect(longue.hasAttribute('data-suite')).toBe(false);
    longue.scrollTop = 20;
    longue.dispatchEvent(new Event('scroll'));
    expect(longue.hasAttribute('data-suite')).toBe(true);
    arreter();
    longue.scrollTop = 109;
    longue.dispatchEvent(new Event('scroll'));
    expect(longue.hasAttribute('data-suite')).toBe(true); // plus suivi après l'arrêt
    racine.remove();
  });
});
