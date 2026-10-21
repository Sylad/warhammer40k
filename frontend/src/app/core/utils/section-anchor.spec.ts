import { afterEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { goToSection, revealSection } from './section-anchor';

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

describe('chaque barre d’ancres, la frise et les concepts passent par section-anchor (L160)', () => {
  const features = join(__dirname, '../../features');
  const sources = readdirSync(features, { withFileTypes: true }).filter((d) => d.isDirectory()).flatMap(({ name: d }) => {
    const dir = join(features, d);
    return readdirSync(dir).filter((f) => f.endsWith('.component.ts')).map((f) => ({ nom: `${d}/${f}`, src: readFileSync(join(dir, f), 'utf8') }));
  });

  it('les six fiches à barre .anchor-nav délèguent leur lien à goToSection, sans scrollIntoView local', () => {
    const fiches = sources.filter((s) => s.src.includes('class="anchor-nav"'));
    expect(fiches.map((s) => s.nom.split('/')[0]).sort()).toEqual(
      ['equipment-detail', 'faction-detail', 'primarch-detail', 'saint-detail', 'ship-detail', 'titan-detail'],
    );
    for (const f of fiches) {
      expect(f.src, f.nom).toMatch(/scrollTo\(e: Event, id: string\): void \{ goToSection\(e, id\); \}/);
      expect(f.src, f.nom).not.toMatch(/scrollTo\([^)]*\)[^{]*\{[^}]*scrollIntoView/);
    }
  });

  it('la frise et les concepts reçoivent le focus via revealSection', () => {
    for (const nom of ['lore-timeline/lore-timeline.component.ts', 'lore-concepts/lore-concepts.component.ts']) {
      expect(sources.find((s) => s.nom === nom)!.src, nom).toContain('revealSection(');
    }
  });
});
