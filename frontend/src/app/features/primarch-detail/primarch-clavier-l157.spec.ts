// L157 (revue UX L10, WCAG 2.1.1, 2.4.3, 4.1.2) — fiche Primarque au clavier : portrait, images
// intercalées et image d'Origines sont de vrais boutons (Entrée et Espace les activent), la
// visionneuse est un dialogue (role=dialog, aria-modal) où le focus entre, boucle et d'où il revient
// à l'élément d'origine ; les filtres de la liste portent aria-pressed.
import { setupTestBed } from '../../../testing/angular-testbed';
import { fakeWarhammerService } from '../../../testing/fake-warhammer-service';
import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { WarhammerService } from '../../core/services/warhammer.service';
import { PrimarchDetailComponent } from './primarch-detail.component';
import { LorePrimarchsComponent } from '../lore-primarchs/lore-primarchs.component';

const PRIMARCHS = JSON.parse(readFileSync(resolve(__dirname, '../../../../../backend/seed/primarchs.json'), 'utf8'));
const HORUS = PRIMARCHS.find((p: { id: string }) => p.id === 'horus');
const IMG = 'data:image/svg+xml;base64,PHN2Zy8+';

async function monterFiche(params$: BehaviorSubject<ReturnType<typeof convertToParamMap>> = new BehaviorSubject(convertToParamMap({ id: 'horus' }))) {
  const service = fakeWarhammerService({
    getPrimarch: () => of(HORUS),
    getWikiImage: (q: string) => of({ imageUrl: `${IMG}#${q}`, pageTitle: null, pageUrl: null }),
  });
  await setupTestBed([PrimarchDetailComponent], [
    provideRouter([]),
    { provide: WarhammerService, useValue: service },
    { provide: ActivatedRoute, useValue: { paramMap: params$, snapshot: { fragment: null } } },
  ]);
  const f = TestBed.createComponent(PrimarchDetailComponent);
  const settle = async () => { f.detectChanges(); await f.whenStable(); f.detectChanges(); };
  await settle();
  await settle();
  return { f, el: f.nativeElement as HTMLElement, settle };
}
const dialogue = (el: HTMLElement) => el.querySelector<HTMLElement>('app-figure-lightbox[role="dialog"]');

describe('Fiche Primarque — images au clavier (L157)', () => {
  it('R1 — portrait, 3 images intercalées et image d’Origines sont de vrais boutons (Entrée/Espace natifs), plus de role=button', async () => {
    const { el } = await monterFiche();
    expect(el.querySelectorAll('[role="button"]')).toHaveLength(0);
    for (const sel of ['.hero-portrait', '#description .inline-figure-img', '#origines .info-card-img', '#croisade .inline-figure-img', '#heresie .inline-figure-img']) {
      const b = el.querySelector<HTMLElement>(sel);
      expect(b, sel).not.toBeNull();
      expect(b!.tagName, sel).toBe('BUTTON');
      expect(b!.getAttribute('type'), sel).toBe('button');
    }
  });

  it('R1 — chaque bouton d’image a un nom accessible propre, et un clic l’ouvre', async () => {
    const { f, el, settle } = await monterFiche();
    const boutons = [...el.querySelectorAll<HTMLButtonElement>('.hero-portrait, .inline-figure-img, .info-card-img')];
    expect(boutons).toHaveLength(5);
    const noms = boutons.map((b) => b.getAttribute('aria-label') ?? '');
    expect(noms.every((n) => /^Agrandir /.test(n))).toBe(true);
    expect(new Set(noms).size).toBe(5);
    expect(dialogue(el)).toBeNull();
    boutons[1].click();
    await settle();
    expect(dialogue(el)).not.toBeNull();
    expect(f.componentInstance.lightbox()).not.toBeNull();
  });
});

describe('Fiche Primarque — visionneuse en dialogue, attributs (L157 ; focus : primarch-clavier-l157.e2e.spec.ts)', () => {
  it('R2 — fermée, aucun role=dialog ; ouverte, role=dialog, aria-modal et nom accessible', async () => {
    const { el, settle } = await monterFiche();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    el.querySelector<HTMLButtonElement>('.hero-portrait')!.click();
    await settle();
    const d = dialogue(el)!;
    expect(d.getAttribute('aria-modal')).toBe('true');
    expect(d.getAttribute('aria-label')).toBe('Visionneuse — Horus Lupercal');
  });

  it('R5 — le composant partagé figure-lightbox reste intact (test scellé L120 R10)', () => {
    const src = readFileSync(resolve(__dirname, '../../shared/components/figure-lightbox/figure-lightbox.component.ts'), 'utf8');
    expect(src).not.toMatch(/role=|aria-modal/);
  });
});

describe('Fiche Primarque — changement de Primarque, visionneuse ouverte (L157, WCAG 4.1.2)', () => {
  it('R10 — la fiche est réutilisée au changement d’id : la visionneuse ouverte est fermée, pas gardée au nom de l’ancien Primarque', async () => {
    const params$ = new BehaviorSubject(convertToParamMap({ id: 'horus' }));
    const { f, el, settle } = await monterFiche(params$);
    el.querySelector<HTMLButtonElement>('.hero-portrait')!.click();
    await settle();
    expect(f.componentInstance.lightbox()).not.toBeNull();
    params$.next(convertToParamMap({ id: 'sanguinius' }));
    await settle();
    expect(f.componentInstance.lightbox()).toBeNull();
    expect(dialogue(el)).toBeNull();
  });
});

describe('Liste des Primarques — filtres (L157)', () => {
  it('R6 — chaque filtre porte aria-pressed, vrai seulement pour le filtre actif, et se met à jour', async () => {
    await setupTestBed([LorePrimarchsComponent], [provideRouter([]), { provide: WarhammerService, useValue: fakeWarhammerService({ primarchs$: of(PRIMARCHS) }) }]);
    const f = TestBed.createComponent(LorePrimarchsComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const filtres = [...el.querySelectorAll<HTMLButtonElement>('.filter')];
    expect(filtres).toHaveLength(4);
    const etat = () => filtres.map((b) => b.getAttribute('aria-pressed'));
    expect(etat()).toEqual(['true', 'false', 'false', 'false']);
    filtres[2].click();
    f.detectChanges();
    expect(etat()).toEqual(['false', 'false', 'true', 'false']);
    expect(filtres.every((b) => b.getAttribute('type') === 'button')).toBe(true);
  });
});
