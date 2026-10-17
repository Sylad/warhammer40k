// L138 (accessibilité résiduelle de Romans, suite de la revue UX de L136) : R1 focus après « Effacer les filtres »,
// R2 focus après le « Réessayer » du bandeau d'erreur partagé, R3 contraste du nombre de livres du panneau populaire.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { defer, of, throwError, type Observable } from 'rxjs';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';
import { SeriesComponent } from './series.component';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Serie } from '../../core/models/models';

const css = sass.compile(resolve(__dirname, 'series.component.scss')).css;

function color(sel: string): string {
  let out = '';
  postcss.parse(css).walkRules((rule) => {
    if (rule.parent?.type !== 'root' || !rule.selectors.map((s) => s.trim()).includes(sel)) return;
    rule.walkDecls('color', (d) => { out = d.value; });
  });
  return out;
}

const lum = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function serie(id: string, over: Partial<Serie> = {}): Serie {
  return {
    id, titre: id, titreVO: id, auteurs: ['Auteur'], nbLivres: 4, epoque: 'M41', epoqueOrdre: 410,
    factionIds: [], tags: [], premierLivre: 'Livre', description: 'Desc', niveauEntree: 'Facile', readBooks: 0, ...over,
  };
}

async function render(series$: Observable<Serie[]>): Promise<ComponentFixture<SeriesComponent>> {
  await setupTestBed([SeriesComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: fakeWarhammerService({ series$ }) },
  ]);
  const f = TestBed.createComponent(SeriesComponent);
  document.body.appendChild(f.nativeElement);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f;
}
const $ = (f: ComponentFixture<unknown>, sel: string) => (f.nativeElement as HTMLElement).querySelector(sel) as HTMLElement | null;
const tick = async (f: ComponentFixture<unknown>) => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };

beforeEach(() => { document.body.innerHTML = ''; });

describe('Romans — focus et contraste (L138)', () => {
  it('R1 — « Effacer les filtres » retire le bouton qui porte le focus : le focus passe au bloc de la liste, pas au body', async () => {
    const f = await render(of([serie('Gaunt'), serie('Horus')]));
    const input = $(f, '.search-bar input') as HTMLInputElement;
    input.value = 'zzz';
    input.dispatchEvent(new Event('input'));
    await tick(f);
    const effacer = $(f, '.empty-reset')!;
    expect(effacer.textContent).toContain('Effacer les filtres');
    effacer.focus();
    expect(document.activeElement).toBe(effacer);
    effacer.click();
    await tick(f);
    expect($(f, '.empty-reset')).toBeNull();
    expect(document.activeElement).toBe($(f, '#bloc-series'));
  });

  it('R2 — le « Réessayer » du bandeau d’erreur relance le chargement et le focus passe au bloc de la liste, pas au body', async () => {
    let essais = 0;
    const f = await render(defer(() => (++essais === 1 ? throwError(() => new Error('500')) : of([serie('Gaunt')]))));
    const reessayer = $(f, 'app-load-error button')!;
    reessayer.focus();
    expect(document.activeElement).toBe(reessayer);
    reessayer.click();
    await tick(f);
    expect(essais).toBe(2);
    expect($(f, 'app-load-error')).toBeNull();
    expect(document.activeElement).toBe($(f, '#bloc-series'));
  });

  it('R3 — « N livres » du panneau populaire atteint 4,5:1 sur le fond le plus clair du panneau', () => {
    const m = /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/.exec(color('.pop-count'))!;
    const [r, g, b, a] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    const bg = [18, 12, 6]; // départ du dégradé du panneau (rgba(18,12,6,.5) sur le fond de page, majoré en opaque)
    const fg = [r, g, b].map((v, i) => v * a + bg[i] * (1 - a));
    expect((lum(fg) + 0.05) / (lum(bg) + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
