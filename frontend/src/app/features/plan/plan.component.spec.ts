// L30 — page « Plan de travail » (/plan) : rendu réel du composant (TestBed JIT sous jsdom).
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlanComponent } from './plan.component';
import { NewsService } from '../nouveautes/news.service';

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const PLAN = {
  version: 1,
  project: 'warhammer40k',
  lots: [
    { id: 'L23', title: 'Une page Nouveautés', status: 'done', started: day(2), finished: day(1) },
    { id: 'L30', title: 'Une page Plan de travail', status: 'doing', started: day(0), tasks: { done: 1, total: 3 } },
    { id: 'L31', title: 'Une fiche faction lisible au téléphone', status: 'todo' },
    { id: 'L5', title: 'Une vieille livraison', status: 'done', finished: '2020-01-01' },
  ],
};
const NEWS = {
  project: 'warhammer40k', generated: '',
  entries: [{ slug: '2026-10-01-nouveautes', title: 'Une page Nouveautés', date: day(1), lots: ['L23'], captures: [], html: '' }],
};

async function render(): Promise<ComponentFixture<PlanComponent>> {
  const f = TestBed.createComponent(PlanComponent);
  f.detectChanges();
  await f.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  f.detectChanges();
  await f.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  f.detectChanges();
  return f;
}
const $ = (f: ComponentFixture<unknown>, sel: string) => (f.nativeElement as HTMLElement).querySelector(sel) as HTMLElement;
const $$ = (f: ComponentFixture<unknown>, sel: string) => [...(f.nativeElement as HTMLElement).querySelectorAll(sel)] as HTMLElement[];
const text = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();

describe('page Plan de travail (/plan) — L30', () => {
  beforeEach(async () => {
    localStorage.clear();
    history.replaceState(null, '', '/plan');
    stubFetch({ '/plan-data/plan.json': PLAN, '/nouveautes-data/nouveautes.json': NEWS, '/nouveautes-data/tailles.json': {} });
    await setupTestBed([PlanComponent], [provideRouter([])]);
  });
  afterEach(() => vi.restoreAllMocks());

  it('titre, phrase d’introduction et résumé', async () => {
    const f = await render();
    expect(text($(f, 'h1'))).toBe('Ce qui se prépare');
    expect(text($(f, '.plan-summary'))).toContain('1 évolution en cours, 1 prévue, 1 livrée ces 30 derniers jours.');
  });

  it('trois groupes, chacun avec une phrase d’explication, dans l’ordre En cours / Prévu / Récemment livré', async () => {
    const f = await render();
    const groups = $$(f, 'section.plan-group');
    expect(groups.map((g) => text(g.querySelector('h2')))).toEqual(['En cours (1)', 'Prévu (1)', 'Récemment livré (1)']);
    for (const g of groups) {
      expect(g.getAttribute('aria-labelledby')).toBe(g.querySelector('h2')!.id);
      expect(text(g.querySelector('.plan-hint')).length).toBeGreaterThan(10);
    }
    expect(groups[2].querySelectorAll('li.plan-lot')).toHaveLength(1); // la vieille livraison n'est pas listée
    expect(text(groups[2].querySelector('.plan-older'))).toContain('1 évolution livrée plus ancienne');
  });

  it('état écrit en mots ; identifiant du lot jamais montré, mais ancre de la carte', async () => {
    const f = await render();
    const cards = $$(f, 'li.plan-lot');
    expect(cards.map((c) => c.id)).toEqual(['L30', 'L31', 'L23']);
    expect(cards.map((c) => text(c.querySelector('.plan-status')))).toEqual(['En cours', 'Prévu', 'Livré']);
    for (const c of cards) {
      expect(c.textContent).not.toMatch(/\bL\d+\b/);
      expect(c.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('ligne état + date : deux éléments séparés par l’écart, sans « · » (rien d’orphelin au retour à la ligne)', async () => {
    const f = await render();
    const meta = $(f, '#L23 .plan-meta');
    expect(meta.textContent).not.toContain('·');
    const time = meta.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe(day(1));
    expect(text(time)).toMatch(/^Livré le \d+(er)? \S+ \d{4}$/);
    expect(text($(f, '#L30 .plan-meta time'))).toMatch(/^Démarré le /);
    expect($(f, '#L31 .plan-meta time')).toBeNull();
  });

  it('avancement : role=progressbar avec valeurs et texte, et le même texte visible', async () => {
    const f = await render();
    const bar = $(f, '#L30 [role="progressbar"]');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('3');
    expect(bar.getAttribute('aria-valuenow')).toBe('1');
    expect(bar.getAttribute('aria-valuetext')).toBe('1 étape faite sur 3');
    expect(bar.getAttribute('aria-label')).toContain('Une page Plan de travail');
    expect(text($(f, '#L30 .plan-progress-text'))).toBe('1 étape faite sur 3');
    expect($(f, '#L31 [role="progressbar"]')).toBeNull();
  });

  it('un lot livré renvoie à son entrée des Nouveautés (ancre), nom accessible distinct', async () => {
    const f = await render();
    const a = $(f, '#L23 a.plan-news');
    expect(a.getAttribute('href')).toBe('/nouveautes#2026-10-01-nouveautes');
    expect(text(a)).toBe('Voir la nouveauté : Une page Nouveautés');
    expect($(f, '#L30 a.plan-news')).toBeNull();
  });

  it('arrivée sur /plan#<id> : la carte visée est signalée, défile et reçoit le focus UNE fois par arrivée', async () => {
    history.replaceState(null, '', '/plan#L31');
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const f = await render();
    const card = $(f, '#L31');
    expect(card.classList.contains('is-target')).toBe(true);
    expect(document.activeElement).toBe(card);
    expect(scroll).toHaveBeenCalledTimes(1);
    // Rechargement du plan sans changement d'ancre : ni défilement ni vol de focus.
    $(f, 'h1').setAttribute('tabindex', '-1');
    $(f, 'h1').focus();
    await f.componentInstance.load();
    f.detectChanges();
    await new Promise((r) => setTimeout(r, 0));
    f.detectChanges();
    expect($(f, '#L31').classList.contains('is-target')).toBe(true);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe($(f, 'h1'));
    // Nouvelle ancre : nouvelle arrivée.
    history.replaceState(null, '', '/plan#L23');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    f.detectChanges();
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(document.activeElement).toBe($(f, '#L23'));
    expect($(f, '#L31').classList.contains('is-target')).toBe(false);
  });

  it('ancre inconnue ou mal encodée : rien de visé', async () => {
    history.replaceState(null, '', '/plan#%E0%A4%A');
    const f = await render();
    expect($$(f, '.is-target')).toHaveLength(0);
  });

  it('groupes vides : phrase honnête par groupe', async () => {
    stubFetch({ '/plan-data/plan.json': { ...PLAN, lots: [PLAN.lots[1]] }, '/nouveautes-data/nouveautes.json': NEWS });
    const f = await render();
    expect(text($(f, '#plan-todo-groupe .plan-empty'))).toBe('Rien de prévu pour l’instant.');
    expect(text($(f, '#plan-done-groupe .plan-empty'))).toBe('Rien de livré ces 30 derniers jours.');
  });

  it('plan sans aucun lot affiché : message et lien vers les Nouveautés', async () => {
    stubFetch({ '/plan-data/plan.json': { ...PLAN, lots: [] }, '/nouveautes-data/nouveautes.json': NEWS });
    const f = await render();
    expect($$(f, 'section.plan-group')).toHaveLength(0);
    expect(text($(f, '.plan-empty'))).toContain('Rien en préparation pour l’instant.');
    expect($(f, '.plan-empty a').getAttribute('href')).toBe('/nouveautes');
  });

  it('plan non publié (404) : message dédié', async () => {
    stubFetch({ '/nouveautes-data/nouveautes.json': NEWS });
    const f = await render();
    expect(text($(f, '.plan-empty'))).toBe('Aucun plan publié pour l’instant.');
  });

  const settle = async (f: ComponentFixture<unknown>) => {
    for (let i = 0; i < 3; i++) {
      await f.whenStable();
      await new Promise((r) => setTimeout(r, 0));
      f.detectChanges();
    }
  };

  it('panne : alerte et bouton « Réessayer » ; succès → focus sur le résumé « En ce moment » (WCAG 2.4.3)', async () => {
    globalThis.fetch = (async () => { throw new TypeError('réseau'); }) as typeof fetch;
    const f = await render();
    const alert = $(f, '[role="alert"]');
    expect(text(alert)).toContain('Le plan n’a pas pu être chargé');
    expect(alert.querySelector('.plan-retry-failed')).toBeNull(); // premier échec : pas de « nouvel essai »
    stubFetch({ '/plan-data/plan.json': PLAN, '/nouveautes-data/nouveautes.json': NEWS });
    const button = alert.querySelector('button') as HTMLButtonElement;
    button.focus();
    button.click();
    await settle(f);
    expect($$(f, 'li.plan-lot')).toHaveLength(3);
    const summary = $(f, '.plan-summary');
    expect(summary.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(summary);
  });

  it('nouvel échec après « Réessayer » : focus sur le nouveau bouton, échec annoncé avec l’heure', async () => {
    globalThis.fetch = (async () => { throw new TypeError('réseau'); }) as typeof fetch;
    const f = await render();
    const first = $(f, '.plan-retry') as HTMLButtonElement;
    first.focus();
    first.click();
    await settle(f);
    const again = $(f, '.plan-retry');
    expect(document.activeElement).toBe(again);
    expect(document.activeElement).not.toBe(document.body);
    expect(text($(f, '[role="alert"] .plan-retry-failed'))).toMatch(/^Nouvel essai à \d{2}:\d{2} : échec\.$/);
  });

  it('premier chargement réussi : le focus n’est pas déplacé', async () => {
    const f = await render();
    expect(document.activeElement).not.toBe($(f, '.plan-summary'));
  });

  it('pendant le chargement : statut annoncé', () => {
    globalThis.fetch = (() => new Promise(() => {})) as typeof fetch;
    TestBed.inject(NewsService);
    const f = TestBed.createComponent(PlanComponent);
    f.detectChanges();
    expect(text($(f, '[role="status"]'))).toBe('Chargement…');
  });
});
