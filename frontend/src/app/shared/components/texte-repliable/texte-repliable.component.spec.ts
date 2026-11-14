// L40, règle D2 — texte long replié à quelques lignes, « Lire la suite » le déplie (docs/densite/regles.md).
import { setupTestBed } from '../../../../testing/angular-testbed';
import { describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TexteRepliableComponent } from './texte-repliable.component';

const LONG = 'Lorem ipsum dolor sit amet. '.repeat(20); // 560 caractères
@Component({
  standalone: true,
  imports: [TexteRepliableComponent],
  template: `<app-texte-repliable [texte]="texte()" sujet="Chronique"><p class="bible-text">{{ texte() }}</p></app-texte-repliable>`,
})
class HoteComponent {
  readonly texte = signal(LONG);
}

async function rendre(texte = LONG) {
  await setupTestBed([HoteComponent], []);
  const f = TestBed.createComponent(HoteComponent);
  f.componentInstance.texte.set(texte);
  f.detectChanges();
  await f.whenStable();
  f.detectChanges();
  const el = f.nativeElement as HTMLElement;
  return { f, el, bouton: () => el.querySelector<HTMLButtonElement>('button.tr-bouton'), corps: () => el.querySelector<HTMLElement>('.tr-corps')! };
}

describe('texte repliable (L40, D2)', () => {
  it('texte long : replié au repos, le paragraphe projeté garde sa classe, bouton nommé avec la section', async () => {
    const { el, bouton, corps } = await rendre();
    expect(corps().classList).toContain('tr-replie');
    expect(corps().querySelector('p.bible-text')!.textContent).toContain('Lorem');
    const b = bouton()!;
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(b.getAttribute('aria-controls')).toBe(corps().id);
    expect(b.textContent!.replace(/\s+/g, ' ').trim()).toBe('Lire la suite : Chronique');
    expect(el.querySelector('.tr-corps')!.textContent!.trim().length).toBe(LONG.trim().length); // texte entier dans la page
  });

  it('« Lire la suite » déplie, « Réduire » replie', async () => {
    const { f, bouton, corps } = await rendre();
    bouton()!.click();
    f.detectChanges();
    expect(corps().classList).not.toContain('tr-replie');
    expect(bouton()!.getAttribute('aria-expanded')).toBe('true');
    expect(bouton()!.textContent).toContain('Réduire');
    bouton()!.click();
    f.detectChanges();
    expect(corps().classList).toContain('tr-replie');
  });

  it('texte court : ni repli ni bouton', async () => {
    const { bouton, corps } = await rendre('Court.');
    expect(corps().classList).not.toContain('tr-replie');
    expect(bouton()).toBeNull();
  });

  it('un nouveau texte (autre fiche, même composant) revient replié', async () => {
    const { f, bouton, corps } = await rendre();
    bouton()!.click();
    f.detectChanges();
    f.componentInstance.texte.set(LONG + ' Autre fiche.');
    f.detectChanges();
    expect(corps().classList).toContain('tr-replie');
    expect(bouton()!.getAttribute('aria-expanded')).toBe('false');
  });

  it('mesuré sans gain d’au moins 3 lignes (texte court, encart voisin plus haut) : ni repli ni bouton', async () => {
    const { f, bouton, corps } = await rendre();
    const c = f.debugElement.children[0].componentInstance as TexteRepliableComponent;
    c.deborde.set(false);
    f.detectChanges();
    expect(corps().classList).not.toContain('tr-replie');
    expect(bouton()).toBeNull();
  });

  it('« Réduire » ramène la section (son titre) sous la barre collante quand le titre est caché', async () => {
    await setupTestBed([SectionComponent], []);
    const f = TestBed.createComponent(SectionComponent);
    document.body.appendChild(f.nativeElement);
    f.detectChanges();
    await f.whenStable();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const section = el.querySelector<HTMLElement>('section#chronique')!;
    const h2 = section.querySelector('h2')!;
    const vers: Element[] = [];
    section.scrollIntoView = function (this: Element) { vers.push(this); };
    el.querySelector<HTMLElement>('.tr-corps')!.scrollIntoView = function (this: Element) { vers.push(this); };
    const bouton = el.querySelector<HTMLButtonElement>('button.tr-bouton')!;
    bouton.click(); // déplie
    f.detectChanges();
    h2.getBoundingClientRect = () => ({ top: 40 } as DOMRect); // sous l'en-tête et la barre d'ancres
    document.documentElement.style.scrollPaddingTop = '114px';
    bouton.click(); // replie
    f.detectChanges();
    await Promise.resolve();
    expect(vers).toEqual([section]);
    h2.getBoundingClientRect = () => ({ top: 300 } as DOMRect); // titre visible : on ne bouge pas
    bouton.click();
    bouton.click();
    await Promise.resolve();
    expect(vers).toEqual([section]);
    document.documentElement.style.scrollPaddingTop = '';
    f.nativeElement.remove();
  });
});

@Component({
  standalone: true,
  imports: [TexteRepliableComponent],
  template: `<section id="chronique"><h2>Chronique</h2><app-texte-repliable [texte]="texte" sujet="Chronique"><p>{{ texte }}</p></app-texte-repliable></section>`,
})
class SectionComponent {
  readonly texte = LONG;
}
