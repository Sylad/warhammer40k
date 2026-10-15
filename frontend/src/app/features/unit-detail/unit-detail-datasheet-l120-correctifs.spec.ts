import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import * as sass from 'sass';
import postcss from 'postcss';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setupTestBed, polyfillDialog } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { WarhammerService } from '../../core/services/warhammer.service';
import { UnitDetailComponent } from './unit-detail.component';

const A = { id: 'sm-tactique', factionId: 'space-marines', nom: 'Escouade Tactique', type: 'Infanterie', role: 'Troupe', description: 'D.' };
const FACTION = { id: 'space-marines', nom: 'Space Marines', alignement: 'Imperium', symbole: 'S', description: 'd', couleurThematique: '#14a' };

async function settle(f: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    f.detectChanges();
    await f.whenStable();
    await new Promise((r) => setTimeout(r, 0));
  }
  f.detectChanges();
}

async function mount(status: number) {
  polyfillDialog();
  const service = fakeWarhammerService({
    datasheetUrl: (id: string) => `/api/images/datasheets/${id}`,
    getUnit: () => of(A),
    getFaction: () => of(FACTION),
    getUnits: () => of([]),
    getWikiImage: () => of({ imageUrl: null, pageTitle: null, pageUrl: null }),
  });
  await setupTestBed([UnitDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: A.id })), snapshot: { fragment: null } } },
  ]);
  globalThis.fetch = (async () => ({ ok: status === 200, status }) as Response) as typeof fetch;
  const f = TestBed.createComponent(UnitDetailComponent);
  await settle(f);
  return { f, root: f.nativeElement as HTMLElement };
}

describe('fiche unité — correctifs de revue (L120)', () => {
  it('R8 — le focus est rendu au bouton une fois la fenêtre retirée du document (le reste du document n\'est plus inerte)', async () => {
    const { f, root } = await mount(200);
    const b = root.querySelector('.hero button.zoom-btn') as HTMLButtonElement;
    const dialogAtFocus: (boolean | null)[] = [];
    const orig = b.focus.bind(b);
    b.focus = () => { dialogAtFocus.push(!!document.querySelector('dialog')); orig(); };
    b.click();
    await settle(f);
    expect(document.querySelector('dialog')).not.toBeNull();
    dialogAtFocus.length = 0;
    (document.querySelector('.ds-close') as HTMLButtonElement).click();
    await settle(f);
    expect(dialogAtFocus).toContain(false);
    expect(dialogAtFocus).not.toContain(true);
    expect(document.activeElement).toBe(b);
  });

  it('R5 — sans figure, le hero ne réserve pas de place sous 761 px', async () => {
    const { root } = await mount(404);
    expect(root.querySelector('.hero figure')).toBeNull();
    expect(root.querySelector('.hero')!.classList.contains('hero--figure')).toBe(false);
  });

  it('R11 — avec figure, le hero porte la classe qui réserve la place de la figure', async () => {
    const { root } = await mount(200);
    expect(root.querySelector('.hero')!.classList.contains('hero--figure')).toBe(true);
  });

  it('R5 — la marge basse de 297 px n\'est posée que sur .hero--figure', () => {
    const css = sass.compile(resolve(__dirname, 'unit-detail.component.scss')).css;
    const found: string[] = [];
    postcss.parse(css).walkRules((rule) => {
      rule.walkDecls('margin-bottom', (d) => { if (d.value === '297px') found.push(rule.selector); });
    });
    expect(found).toEqual(['.hero.hero--figure']);
  });

  it('R5 — plus de sélecteur :only-child sur .hero-text (il ne correspondait jamais) : 56 % et 80 % sont portés par .hero:not(.hero--figure)', () => {
    const css = sass.compile(resolve(__dirname, 'unit-detail.component.scss')).css;
    const root = postcss.parse(css);
    const textRules: { selector: string; media: string; maxWidth: string }[] = [];
    root.walkRules((rule) => {
      if (!rule.selector.includes('.hero-text')) return;
      rule.walkDecls('max-width', (d) => {
        const at = rule.parent && rule.parent.type === 'atrule' ? (rule.parent as postcss.AtRule).params : '';
        textRules.push({ selector: rule.selector, media: at, maxWidth: d.value });
      });
    });
    expect(textRules.filter((r) => r.selector.includes(':only-child') && !r.selector.includes('hero--figure'))).toEqual([]);
    const sans = textRules.filter((r) => r.selector.includes('.hero:not(.hero--figure) .hero-text'));
    expect(sans.map((r) => [r.media, r.maxWidth])).toEqual([['', '56%'], ['(max-width: 1280px)', '80%'], ['(max-width: 760px)', '100%']]);
  });

  it('C3 — l\'image échoue fenêtre ouverte : la fenêtre se ferme et le focus est rendu au titre du hero (tabindex -1), pas à body', async () => {
    const { f, root } = await mount(200);
    (root.querySelector('.hero button.zoom-btn') as HTMLButtonElement).click();
    await settle(f);
    expect(document.querySelector('dialog')).not.toBeNull();
    (document.querySelector('dialog img') as HTMLImageElement).dispatchEvent(new Event('error'));
    await settle(f);
    expect(document.querySelector('dialog')).toBeNull();
    expect(root.querySelector('.hero figure')).toBeNull();
    const h1 = root.querySelector('.hero h1') as HTMLElement;
    expect(h1.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(h1);
  });

  it('C3 — l\'image échoue pendant que le focus est sur le bouton d\'agrandissement (fenêtre fermée) : le focus va au titre', async () => {
    const { f, root } = await mount(200);
    (root.querySelector('.hero button.zoom-btn') as HTMLButtonElement).focus();
    (root.querySelector('.hero figure img') as HTMLImageElement).dispatchEvent(new Event('error'));
    await settle(f);
    expect(document.activeElement).toBe(root.querySelector('.hero h1'));
  });

  it('C3 — l\'image échoue sans que le focus soit dans la figure : le focus ne bouge pas', async () => {
    const { f, root } = await mount(200);
    const other = root.querySelector('.back-btn') as HTMLElement;
    other.focus();
    (root.querySelector('.hero figure img') as HTMLImageElement).dispatchEvent(new Event('error'));
    await settle(f);
    expect(document.activeElement).toBe(other);
  });
});
