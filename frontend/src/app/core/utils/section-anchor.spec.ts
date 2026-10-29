import { afterEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { goToSection, revealSection, sectionHref } from './section-anchor';

function page(): { link: HTMLAnchorElement; section: HTMLElement } {
  document.body.innerHTML = `<nav class="anchor-nav"><a href="#histoire">Histoire</a></nav><article id="histoire">…</article>`;
  const section = document.getElementById('histoire')!;
  section.scrollIntoView = vi.fn();
  return { link: document.querySelector('a')!, section };
}

describe('barre d’ancres : l’activation mène vraiment à la section (L160)', () => {
  afterEach(() => { document.body.innerHTML = ''; history.replaceState(null, '', '/'); });

  it('focus sur la section : tabindex=-1 posé, document.activeElement = la section', () => {
    const { section } = page();
    goToSection(new Event('click', { cancelable: true }), 'histoire');
    expect(section.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(section);
  });

  it('le focus ne défile pas à lui seul (preventScroll) : le défilement est celui de scrollIntoView', () => {
    const { section } = page();
    const focus = vi.spyOn(section, 'focus');
    goToSection(new Event('click', { cancelable: true }), 'histoire');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('le hash de l’adresse devient #histoire, sans nouvelle entrée d’historique', () => {
    page();
    const avant = history.length;
    goToSection(new Event('click', { cancelable: true }), 'histoire');
    expect(location.hash).toBe('#histoire');
    expect(history.length).toBe(avant);
  });

  it('le clic natif est annulé (pas de saut d’ancre avec <base href="/">)', () => {
    page();
    const ev = new Event('click', { cancelable: true });
    goToSection(ev, 'histoire');
    expect(ev.defaultPrevented).toBe(true);
  });

  it.each([
    ['Ctrl', { ctrlKey: true }], ['Méta', { metaKey: true }], ['Maj', { shiftKey: true }], ['Alt', { altKey: true }],
    ['bouton du milieu', { button: 1 }], ['bouton droit', { button: 2 }],
  ])('clic modifié (%s) : non annulé, ni focus ni hash (le navigateur ouvre l’onglet de l’href)', (_nom, init) => {
    page();
    const ev = new MouseEvent('click', { cancelable: true, ...init });
    goToSection(ev, 'histoire');
    expect(ev.defaultPrevented).toBe(false);
    expect(location.hash).toBe('');
    expect(document.activeElement).toBe(document.body);
  });

  it('clic simple de souris (bouton 0, aucune touche) : annulé et section atteinte', () => {
    const { section } = page();
    const ev = new MouseEvent('click', { cancelable: true, button: 0 });
    goToSection(ev, 'histoire');
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(section);
  });

  it('section absente : rien ne bouge, ni focus ni hash', () => {
    page();
    goToSection(new Event('click', { cancelable: true }), 'inconnue');
    expect(location.hash).toBe('');
    expect(document.activeElement).toBe(document.body);
  });

  it('revealSection (sans événement) : même focus et même hash', () => {
    const { section } = page();
    revealSection('histoire');
    expect(document.activeElement).toBe(section);
    expect(location.hash).toBe('#histoire');
  });

  it('prefers-reduced-motion : défilement instantané', () => {
    const { section } = page();
    window.matchMedia = ((q: string) => ({ matches: q.includes('reduce') })) as typeof window.matchMedia;
    goToSection(new Event('click', { cancelable: true }), 'histoire');
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});

describe('href d’une ancre de section (L160)', () => {
  afterEach(() => history.replaceState(null, '', '/'));

  it('sectionHref : page courante + requête + #id encodé (jamais « #id » seul, que <base href="/"> résout en « /#id »)', () => {
    history.replaceState(null, '', '/factions/orks?x=1#ancien');
    expect(sectionHref('histoire')).toBe('/factions/orks?x=1#histoire');
    expect(sectionHref('é t')).toBe('/factions/orks?x=1#%C3%A9%20t');
  });
});

describe('chaque barre d’ancres, la frise et les concepts passent par section-anchor (L160)', () => {
  const features = join(__dirname, '../../features');
  const sources = readdirSync(features, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap(({ name: d }) => {
    const dir = join(features, d);
    return readdirSync(dir).filter((f) => f.endsWith('.component.ts')).map((f) => ({ nom: `${d}/${f}`, src: readFileSync(join(dir, f), 'utf8') }));
  });

  it('les six fiches à barre .anchor-nav posent leurs liens par la directive sectionAnchor : pas de href="#x" nu, plus de scrollTo(e) local', () => {
    const fiches = sources.filter((s) => s.src.includes('class="anchor-nav"'));
    expect(fiches.map((s) => s.nom.split('/')[0]).sort()).toEqual(
      ['equipment-detail', 'faction-detail', 'primarch-detail', 'saint-detail', 'ship-detail', 'titan-detail'],
    );
    for (const f of fiches) {
      const barre = /<nav class="anchor-nav"[^>]*>([\s\S]*?)<\/nav>/.exec(f.src)![1];
      const liens = barre.match(/<a\b[^>]*>/g) ?? [];
      expect(liens.length, f.nom).toBeGreaterThan(2);
      for (const a of liens) expect(a, f.nom).toMatch(/\bsectionAnchor="[a-z]+"/);
      expect(barre, f.nom).not.toMatch(/href="#/);
      expect(f.src, f.nom).toContain('SectionAnchorDirective');
      expect(f.src, f.nom).not.toMatch(/scrollTo\(e: Event/);
    }
  });

  it('les cartes de concepts liés passent aussi par la directive, sans href="#…" calculé', () => {
    const src = sources.find((s) => s.nom === 'lore-concepts/lore-concepts.component.ts')!.src;
    expect(src).toMatch(/class="related-card"[^>]*\[sectionAnchor\]="r\.conceptId"/);
    expect(src).not.toMatch(/\[href\]="'#'/);
  });

  it('aucun composant n’appelle goToSection à la main : c’est la directive sectionAnchor qui le fait', () => {
    for (const s of sources) expect(s.src, s.nom).not.toMatch(/goToSection\(/);
  });

  it('la frise et les concepts reçoivent le focus via revealSection', () => {
    for (const nom of ['lore-timeline/lore-timeline.component.ts', 'lore-concepts/lore-concepts.component.ts']) {
      expect(sources.find((s) => s.nom === nom)!.src, nom).toContain('revealSection(');
    }
  });
});
