// L39 — fil d'Ariane valide : <nav aria-label> + liste ordonnée, aria-current="page" sur le seul
// dernier élément ; un intermédiaire sans page (« Unités » sur /units/x) a un style neutre, pas
// celui de l'élément courant (deux « courants » prêtaient à confusion).
import { setupTestBed } from '../../../../testing/angular-testbed';
import { describe, expect, it } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { BreadcrumbComponent } from './breadcrumb.component';
import { PageTitleService, PageTitleStrategy } from '../../../core/services/page-title.service';

@Component({ standalone: true, template: '' })
class Page {}

async function render(url: string): Promise<HTMLElement> {
  await setupTestBed([BreadcrumbComponent], [
    provideRouter([{ path: '', children: [
      { path: 'lore', component: Page },
      { path: 'lore/primarchs', component: Page },
      { path: 'lore/primarchs/:id', component: Page },
      { path: 'units/:id', component: Page, title: 'Unité' },
    ] }]),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
  ]);
  await TestBed.inject(Router).navigateByUrl(url);
  const f = TestBed.createComponent(BreadcrumbComponent);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  return f.nativeElement as HTMLElement;
}

describe('fil d’Ariane — balisage (L39)', () => {
  it('/units/ork-boyz : nav > ol > li ; « Unités » neutre (ni lien ni courant) ; seul le dernier est courant', async () => {
    const el = await render('/units/ork-boyz');
    const nav = el.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Fil d\'Ariane');
    const items = [...nav.querySelectorAll(':scope > ol > li')];
    expect(items.map((li) => li.textContent!.replace('›', '').trim())).toEqual(['Accueil', 'Unités', 'Ork Boyz']);
    expect(items[0].querySelector('a')!.getAttribute('href')).toBe('/');
    expect(items[1].querySelector('a')).toBeNull();
    expect(items[1].querySelector('.bc-text')).not.toBeNull();
    expect(items[1].querySelector('.bc-current')).toBeNull();
    const current = nav.querySelectorAll('[aria-current]');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('aria-current')).toBe('page');
    expect(current[0].textContent!.trim()).toBe('Ork Boyz');
    // Séparateurs décoratifs : ignorés par les lecteurs d'écran.
    expect([...nav.querySelectorAll('.bc-sep')].every((s) => s.getAttribute('aria-hidden') === 'true')).toBe(true);
  });

  it('L36 : dernier élément = nom de la page (titre), plus l’identifiant de l’URL ; balisage inchangé', async () => {
    const el = await render('/units/sm-calgar');
    expect(el.querySelector('[aria-current="page"]')!.textContent!.trim()).toBe('Sm Calgar'); // en attendant le nom
    TestBed.inject(PageTitleService).setName('Marneus Calgar');
    const f = TestBed.createComponent(BreadcrumbComponent);
    f.detectChanges();
    const nav = (f.nativeElement as HTMLElement).querySelector('nav[aria-label="Fil d\'Ariane"]')!;
    const items = [...nav.querySelectorAll(':scope > ol > li')];
    expect(items.map((li) => li.textContent!.replace('›', '').trim())).toEqual(['Accueil', 'Unités', 'Marneus Calgar']);
    const current = nav.querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0].textContent!.trim()).toBe('Marneus Calgar');
    expect(items[0].querySelector('a.bc-link')!.getAttribute('href')).toBe('/');
  });

  it('/lore/primarchs/horus : intermédiaires liés, dernier courant', async () => {
    const el = await render('/lore/primarchs/horus');
    expect([...el.querySelectorAll('ol > li a')].map((a) => a.getAttribute('href'))).toEqual(['/', '/lore', '/lore/primarchs']);
    expect(el.querySelector('[aria-current="page"]')!.textContent!.trim()).toBe('Horus');
  });
});
