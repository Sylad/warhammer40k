// L238 — crédits des images de la page (pied de page) : infobulle sur chaque image tierce, liste par source,
// mention des droits de Games Workshop sur chaque route, section « Crédits et droits » d'À propos.
import { setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, type Route } from '@angular/router';
import { CreditsPageComponent } from './credits-page.component';
import { MainLayoutComponent } from '../main-layout/main-layout.component';
import { AboutComponent, CREDITS } from '../../features/about/about.component';
import { SOURCES_IMAGES } from '../../core/credits/credit-image';
import { routes } from '../../app.routes';

const WIKI = 'https://static.wikia.nocookie.net/warhammer40k/images/3/36/Orks_symbol.png/revision/latest';

@Component({
  standalone: true,
  imports: [CreditsPageComponent],
  template: `
    <main #main>
      <img id="fiche" src="/api/images/datasheets/sm-captain" alt="" />
      <div id="fond" [style.background-image]="fond()"></div>
      <img id="titre" src="${WIKI}" title="Titre de la page" alt="" />
      <img id="capture" src="/nouveautes-data/captures/x.png" alt="" />
    </main>
    <app-credits-page [cible]="main" />
  `,
})
class Hote {
  readonly fond = signal(`url('${WIKI}')`);
}

const attendre = () => new Promise((r) => setTimeout(r, 200));

describe('crédits des images de la page (L238)', () => {
  beforeEach(async () => {
    await setupTestBed([Hote], [provideRouter([])]);
  });

  it('chaque image tierce porte son crédit en infobulle et data-credit ; une image du site n’en a pas', async () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    await attendre();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('#fiche')!.getAttribute('title')).toBe('Fiche technique © Games Workshop');
    expect(el.querySelector<HTMLElement>('#fiche')!.dataset['credit']).toBe('fiche');
    expect(el.querySelector("#fond")!.getAttribute("title")).toContain('fichier « Orks symbol.png »');
    expect(el.querySelector('#titre')!.getAttribute('title')).toBe('Titre de la page'); // infobulle existante gardée
    expect(el.querySelector<HTMLElement>('#titre')!.dataset['credit']).toBe('fandom');
    expect(el.querySelector('#capture')!.hasAttribute('title')).toBe(false);
  });

  it('le pied de page liste une ligne par source, avec le lien vers chaque fichier du wiki', async () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    await attendre();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const lignes = [...el.querySelectorAll('[data-testid="credits-page"] li')];
    expect(lignes.map((l) => l.getAttribute('data-source'))).toEqual(['fandom', 'fiche']);
    expect(lignes[0].textContent).toContain(SOURCES_IMAGES.fandom.droits);
    expect(lignes[0].textContent).toContain('(1 image)'); // même fichier deux fois : une image
    expect([...lignes[0].querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://warhammer40k.fandom.com/wiki/File:Orks_symbol.png']);
    expect(el.querySelector('.credits-tout')!.getAttribute('href')).toBe('/about#credits');
  });

  it('suit les changements de la page : une image qui change de source change de crédit', async () => {
    const f = TestBed.createComponent(Hote);
    f.detectChanges();
    await attendre();
    f.componentInstance.fond.set(`url('https://i.ytimg.com/vi/abc/hqdefault.jpg')`);
    f.detectChanges();
    await attendre();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('#fond')!.getAttribute('title')).toBe('Miniature YouTube © la chaîne de la vidéo');
    expect([...el.querySelectorAll('[data-testid="credits-page"] li')].map((l) => l.getAttribute('data-source'))).toEqual(['fandom', 'fiche', 'youtube']);
  });
});

describe('mention des droits sur chaque route (L238)', () => {
  it('toute route servie est enfant de la mise en page, qui porte le pied de page', () => {
    const layout = routes.find((r) => r.component === MainLayoutComponent)!;
    const hors = routes.filter((r) => r !== layout && !r.redirectTo);
    expect(hors).toEqual([]);
    const pages = (layout.children as Route[]).filter((r) => !r.redirectTo);
    expect(pages.length).toBeGreaterThan(25);
  });

  it('le pied de page dit : fan non officiel, sans approbation, © Games Workshop Limited, lien vers les crédits', async () => {
    stubFetch({ '/nouveautes-data/nouveautes.json': { entries: [] }, '/nouveautes-data/tailles.json': {} });
    await setupTestBed([MainLayoutComponent], [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]);
    const f = TestBed.createComponent(MainLayoutComponent);
    f.detectChanges();
    const mention = (f.nativeElement as HTMLElement).querySelector('footer [data-testid="mention-droits"]')!;
    const texte = mention.textContent!.replace(/\s+/g, ' ');
    expect(texte).toContain('Site de fan non officiel, sans approbation de Games Workshop.');
    expect(texte).toContain('Warhammer 40,000 et ses marques, logos, images et textes sont © Games Workshop Limited.');
    expect(mention.querySelector('a')!.getAttribute('href')).toBe('/about#credits');
    expect((f.nativeElement as HTMLElement).querySelector('footer app-credits-page')).not.toBeNull();
  });
});

describe('À propos — Crédits et droits (L238)', () => {
  it('une ligne par source ; chaque source d’image recensée y figure avec les mêmes droits que le pied de page', async () => {
    await setupTestBed([AboutComponent], [provideRouter([])]);
    const f = TestBed.createComponent(AboutComponent);
    f.detectChanges();
    const section = (f.nativeElement as HTMLElement).querySelector('section#credits')!;
    expect(section.querySelector('h2')!.textContent).toBe('Crédits et droits');
    const lignes = [...section.querySelectorAll('[data-testid="credits-liste"] li')];
    expect(lignes).toHaveLength(CREDITS.length);
    expect(new Set(CREDITS.map((c) => c.id)).size).toBe(CREDITS.length);
    const tout = section.textContent!;
    for (const [cle, s] of Object.entries(SOURCES_IMAGES)) {
      if (cle === 'externe') continue; // aucune source externe permanente : seulement l'aperçu d'un import
      expect(tout, cle).toContain(s.droits);
    }
    expect(tout).toContain('© Games Workshop Limited');
  });
});
