// L157 (Nielsen n°3) — Échap ne ferme que la couche du dessus : une autre couche (la recherche Ctrl+K)
// qui a déjà pris l'Échap (preventDefault) ou qui est affichée garde la visionneuse ouverte.
import { setupTestBed } from '../../../../testing/angular-testbed';
import { afterEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FigureLightboxComponent, LightboxState } from './figure-lightbox.component';

const ETAT: LightboxState = {
  title: 'Horus', subtitle: '', description: '', contextName: 'Les Primarques', contextColor: '#fff', contextSigil: '⚜',
  searchQuery: 'Horus', mainUrl: 'a', thumbUrls: ['a'], selectedIdx: 0,
};

async function monter() {
  await setupTestBed([FigureLightboxComponent]);
  const f = TestBed.createComponent(FigureLightboxComponent);
  // Les entrées-signaux ne se posent pas sous TestBed JIT (cf. CLAUDE.md) : l'état est remplacé à la main.
  (f.componentInstance as unknown as { state: () => LightboxState }).state = () => ETAT;
  const fermetures: number[] = [];
  f.componentInstance.closed.subscribe(() => fermetures.push(1));
  return { fermetures };
}
const echap = (cancelable = true) => {
  const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable });
  document.dispatchEvent(e);
  return e;
};

describe('Visionneuse partagée — Échap (L157)', () => {
  afterEach(() => { document.querySelectorAll('.cmdk-panel').forEach((n) => n.remove()); });

  it('R11 — seule, un Échap la ferme', async () => {
    const { fermetures } = await monter();
    echap();
    expect(fermetures).toHaveLength(1);
  });

  it('R11 — un Échap déjà pris par une couche au-dessus (preventDefault) ne la ferme pas', async () => {
    const { fermetures } = await monter();
    document.addEventListener('keydown', (e) => e.preventDefault(), { once: true, capture: true });
    echap();
    expect(fermetures).toHaveLength(0);
  });

  it('R11 — la recherche globale affichée au-dessus : Échap ne ferme pas la visionneuse', async () => {
    const { fermetures } = await monter();
    const panneau = document.createElement('div');
    panneau.className = 'cmdk-panel';
    document.body.appendChild(panneau);
    echap();
    expect(fermetures).toHaveLength(0);
  });
});
