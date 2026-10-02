// L23 — page Nouveautés (/nouveautes) : rendu réel du composant (TestBed JIT sous jsdom).
import { polyfillDialog, setupTestBed, stubFetch } from '../../../testing/angular-testbed';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { NouveautesComponent } from './nouveautes.component';
import { NewsService } from './news.service';
import { NEWS_SEEN_KEY } from './news-badge';

const JSON_DATA = {
  project: 'warhammer40k',
  generated: '2026-10-01 22:00',
  entries: [
    {
      slug: '2026-10-01-recente', title: 'La plus récente', date: '2026-10-01', lots: ['L23'],
      captures: ['captures/L23-telephone.png', 'captures/L23-bureau.png'],
      html: '<p>Texte <strong>gras</strong>.</p>',
    },
    {
      slug: '2026-09-28-ancienne', title: 'Une ancienne', date: '2026-09-28', lots: ['L1'],
      captures: ['captures/L1-haute.png'], html: '<p>Avant.</p>',
    },
  ],
};
const SIZES = {
  'captures/L23-telephone.png': [390, 844],
  'captures/L23-bureau.png': [1440, 900],
  'captures/L1-haute.png': [390, 2400],
};

async function render(): Promise<ComponentFixture<NouveautesComponent>> {
  const fixture = TestBed.createComponent(NouveautesComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r, 0));
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const $ = (f: ComponentFixture<unknown>, sel: string) => (f.nativeElement as HTMLElement).querySelector(sel) as HTMLElement;
const $$ = (f: ComponentFixture<unknown>, sel: string) => [...(f.nativeElement as HTMLElement).querySelectorAll(sel)] as HTMLElement[];

describe('page Nouveautés (/nouveautes) — L23', () => {
  beforeEach(async () => {
    polyfillDialog();
    localStorage.clear();
    history.replaceState(null, '', '/nouveautes');
    document.body.style.overflow = '';
    stubFetch({ '/nouveautes-data/nouveautes.json': JSON_DATA, '/nouveautes-data/tailles.json': SIZES });
    await setupTestBed([NouveautesComponent]);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('entrées dans l’ordre du journal (la plus récente en haut), date, titre, texte', async () => {
    const f = await render();
    expect($(f, 'h1').textContent).toContain('Ce qui a changé');
    const articles = $$(f, 'article.news-entry');
    expect(articles.map((a) => a.id)).toEqual(['2026-10-01-recente', '2026-09-28-ancienne']);
    expect(articles[0].querySelector('time')!.getAttribute('datetime')).toBe('2026-10-01');
    expect(articles[0].querySelector('time')!.textContent).toBe('1er octobre 2026');
    expect(articles[0].querySelector('h2')!.textContent).toContain('La plus récente');
    expect(articles[0].querySelector('.news-body strong')!.textContent).toBe('gras');
  });

  it('place des captures réservée avant chargement (largeur, hauteur, aspect-ratio)', async () => {
    const f = await render();
    const link = $(f, 'a.news-capture');
    const img = link.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('/nouveautes-data/captures/L23-telephone.png');
    expect(img.getAttribute('width')).toBe('390');
    expect(img.getAttribute('height')).toBe('844');
    expect(img.style.aspectRatio).toMatch(/390 \/ 844/);
    expect(link.style.width).toContain('390px');
    expect(img.getAttribute('alt')).toBe('Capture d’écran 1 sur 2 : La plus récente');
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('journal vide : message explicite', async () => {
    stubFetch({ '/nouveautes-data/nouveautes.json': { ...JSON_DATA, entries: [] }, '/nouveautes-data/tailles.json': {} });
    const f = await render();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Aucune nouveauté publiée pour l’instant.');
  });

  it('journal introuvable : message d’erreur, pas de page blanche', async () => {
    stubFetch({});
    const f = await render();
    expect((f.nativeElement as HTMLElement).textContent).toContain('Le journal des nouveautés n’a pas pu être chargé.');
  });

  it('première visite : rien n’est « Nouveau », la visite est mémorisée', async () => {
    const f = await render();
    expect($$(f, '.news-new')).toHaveLength(0);
    expect($$(f, '.news-seen-sep')).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(NEWS_SEEN_KEY)!).slugs).toEqual(['2026-09-28-ancienne', '2026-10-01-recente']);
    expect(TestBed.inject(NewsService).unseen()).toBe(0);
  });

  it('retour après une nouveauté : marque « Nouveau », ligne de compte, séparateur « Déjà vu »', async () => {
    localStorage.setItem(NEWS_SEEN_KEY, JSON.stringify({ date: '2026-09-28', slugs: ['2026-09-28-ancienne'], at: '2026-09-29T08:30:00Z' }));
    const f = await render();
    const articles = $$(f, 'article.news-entry');
    expect(articles[0].querySelector('.news-new')!.textContent).toBe('Nouveau');
    expect(articles[1].querySelector('.news-new')).toBeNull();
    expect($(f, '.news-since').textContent).toContain('1 nouveauté depuis votre dernière visite');
    const items = $$(f, 'ol.news-list > li');
    expect(items[1].classList).toContain('news-seen-sep');
    expect(items[1].getAttribute('aria-hidden')).toBe('true');
    expect(items[1].textContent).toMatch(/^Déjà vu lors de votre visite du 29 septembre 2026 à \d\d:30$/);
    // La visite est mémorisée : la pastille de la barre s'éteint.
    expect(TestBed.inject(NewsService).unseen()).toBe(0);
  });

  it('lien permanent : arrivée sur /nouveautes#<slug> → entrée signalée et focalisée', async () => {
    history.replaceState(null, '', '/nouveautes#2026-09-28-ancienne');
    const f = await render();
    await new Promise((r) => setTimeout(r, 0));
    f.detectChanges();
    const target = $(f, '[id="2026-09-28-ancienne"]');
    expect(target.classList).toContain('is-target');
    expect(target.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(target);
  });

  it('L34 — titre en texte simple ; bouton « Copier le lien » toujours visible près de la date, nom accessible distinct', async () => {
    const f = await render();
    const entry = $(f, '[id="2026-10-01-recente"]');
    expect(entry.querySelector('h2 a')).toBeNull();
    expect(entry.querySelector('h2')!.textContent!.trim()).toBe('La plus récente');
    const btn = entry.querySelector<HTMLButtonElement>('.news-head-row button.news-copy')!;
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.querySelector('.sr-only')!.textContent).toBe('Copier le lien : La plus récente');
    const labels = [...btn.querySelectorAll<HTMLElement>('.news-copy-labels > span')];
    expect(labels.map((l) => l.textContent!.trim())).toEqual(['Copier le lien', 'Lien copié', 'Copie impossible']);
    expect(labels.map((l) => l.classList.contains('is-shown'))).toEqual([true, false, false]);
    expect(entry.querySelector('.news-link-status')).toBeNull(); // plus de ligne insérée dans la carte
  });

  it('L34 — « Copier le lien » : copie l’URL, sans toucher l’adresse ni défiler ; libellé « Lien copié » et annonce masquée', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const f = await render();
    scroll.mockClear();
    const before = location.href;
    const btn = $(f, '[id="2026-10-01-recente"] button.news-copy') as HTMLButtonElement;
    btn.click();
    await new Promise((r) => setTimeout(r, 0));
    f.detectChanges();
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/nouveautes#2026-10-01-recente`);
    expect(location.href).toBe(before);
    expect(scroll).not.toHaveBeenCalled();
    const shown = [...btn.querySelectorAll<HTMLElement>('.news-copy-labels > span.is-shown')].map((l) => l.textContent!.trim());
    expect(shown).toEqual(['Lien copié']);
    const live = $(f, '[id="2026-10-01-recente"] [role="status"].sr-only');
    expect(live.textContent!.trim()).toBe('Lien copié dans le presse-papiers');
    expect($(f, '[id="2026-09-28-ancienne"] [role="status"].sr-only').textContent!.trim()).toBe('');
  });

  it('L34 — presse-papiers refusé : « Copie impossible », adresse visible et sélectionnable sous le titre, annoncée une seule fois', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('refus')) }, configurable: true });
    const f = await render();
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    const entry = () => $(f, '[id="2026-10-01-recente"]');
    (entry().querySelector('button.news-copy') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(0);
    f.detectChanges();
    const url = `${location.origin}/nouveautes#2026-10-01-recente`;
    expect(entry().querySelector('.news-copy-labels > span.is-shown')!.textContent!.trim()).toBe('Copie impossible');
    const line = entry().querySelector<HTMLElement>('.news-copy-fallback')!;
    expect(line.previousElementSibling!.tagName).toBe('H2'); // sous le titre, pas dans la ligne du bouton
    expect(line.querySelector('.news-url')!.textContent!.trim()).toBe(url);
    expect(line.getAttribute('role')).toBeNull();
    const live = [...entry().querySelectorAll('[role="status"], [aria-live]')].filter((e) => e.textContent!.includes(url));
    expect(live).toHaveLength(1);
    // L'état d'échec dure : le temps de sélectionner l'adresse (pas d'effacement après 4 s).
    await vi.advanceTimersByTimeAsync(10_000);
    f.detectChanges();
    expect(entry().querySelector('.news-copy-fallback')).not.toBeNull();
  });

  it('L34 — copie réussie : aucune ligne d’adresse (pas de décalage)', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
    const f = await render();
    ($(f, '[id="2026-10-01-recente"] button.news-copy') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    f.detectChanges();
    expect($(f, '[id="2026-10-01-recente"] .news-copy-fallback')).toBeNull();
  });

  it('visionneuse : clic (ou Entrée sur le lien) ouvre, « Fermer » hors de la zone qui défile, page bloquée', async () => {
    const f = await render();
    const link = $(f, 'a.news-capture') as HTMLAnchorElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(ev);
    f.detectChanges();
    expect(ev.defaultPrevented).toBe(true);
    const dialog = $(f, 'dialog.news-viewer') as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.querySelector('.news-viewer-zone img')!.getAttribute('src')).toBe('/nouveautes-data/captures/L23-telephone.png');
    const close = dialog.querySelector('button.news-viewer-close')!;
    expect(close.textContent).toContain('Fermer');
    expect(close.closest('.news-viewer-zone')).toBeNull();
    expect(document.activeElement).toBe(close);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('Échap ferme la visionneuse et rend le focus à la capture ; la page redéfile', async () => {
    const f = await render();
    const link = $(f, 'a.news-capture') as HTMLAnchorElement;
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    f.detectChanges();
    const dialog = $(f, 'dialog.news-viewer') as HTMLDialogElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    f.detectChanges();
    expect(dialog.hasAttribute('open')).toBe(false);
    expect(document.activeElement).toBe(link);
    expect(document.body.style.overflow).toBe('');
  });

  it('Ctrl+clic sur une capture : comportement natif (nouvel onglet), pas de visionneuse', async () => {
    const f = await render();
    const link = $(f, 'a.news-capture');
    let preventedByPage: boolean | null = null;
    // Écouteur posé après celui d'Angular : relève sa décision, puis évite la navigation (jsdom).
    link.addEventListener('click', (e) => { preventedByPage = e.defaultPrevented; e.preventDefault(); });
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }));
    expect(preventedByPage).toBe(false);
    expect(($(f, 'dialog.news-viewer') as HTMLDialogElement).hasAttribute('open')).toBe(false);
  });

  it('au téléphone : capture à sa largeur naturelle (≤ 2 écrans) dans une zone qui défile', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
    const f = await render();
    $$(f, 'a.news-capture')[1].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    f.detectChanges();
    const dialog = $(f, 'dialog.news-viewer');
    expect(dialog.getAttribute('data-mode')).toBe('scroll');
    expect((dialog.querySelector('.news-viewer-zone img') as HTMLElement).style.width).toBe('780px');
    const zone = dialog.querySelector('.news-viewer-zone')!;
    expect(zone.getAttribute('tabindex')).toBe('0');
    expect(zone.getAttribute('role')).toBe('region');
  });

  it('au téléphone : capture à peine plus large que la zone (≤ 15 %) → ajustée à la zone, défilement vertical seul', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
    const f = await render();
    $$(f, 'a.news-capture')[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    f.detectChanges();
    const dialog = $(f, 'dialog.news-viewer');
    expect(dialog.hasAttribute('data-fill')).toBe(true);
    expect((dialog.querySelector('.news-viewer-zone img') as HTMLElement).style.width).toBe('100%');
  });

  it('au bureau : capture haute à sa largeur naturelle, défilement vertical', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900);
    const f = await render();
    $$(f, 'a.news-capture')[2].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    f.detectChanges();
    expect($(f, 'dialog.news-viewer').getAttribute('data-mode')).toBe('natural');
  });
});
