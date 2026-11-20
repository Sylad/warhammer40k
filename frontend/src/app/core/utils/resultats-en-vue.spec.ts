import { afterEach, describe, expect, it, vi } from 'vitest';
import { avantFiltre, GEL_MAX_MS, garderResultatsEnVue, limiteCollee } from './resultats-en-vue';

/** Section de résultats dont l'en-tête est à `haut` px du bord de la fenêtre (768 px sous jsdom), 60 px de haut. */
function resultats(haut: number): HTMLElement {
  document.body.innerHTML = `<section tabindex="-1"><header>Titre · 12 résultats</header><div>…</div></section>`;
  const section = document.querySelector('section')!;
  const rect = (top: number, h: number) => ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) });
  section.getBoundingClientRect = () => rect(haut, 2000) as DOMRect;
  section.querySelector('header')!.getBoundingClientRect = () => rect(haut, 60) as DOMRect;
  return section;
}

describe('L239 — après un filtre, le titre et le compte des résultats sont en vue', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
  });

  it('en-tête dans la fenêtre → rien ne bouge, le focus reste où il est', () => {
    const section = resultats(200);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    expect(garderResultatsEnVue(section)).toBe(false);
    expect(scroll).not.toHaveBeenCalled();
    expect(document.activeElement).not.toBe(section);
  });

  it.each([
    ['sorti par le haut (filtre sous la liste)', -500],
    ['sous la fenêtre (filtre au-dessus de la liste, revue r1 M2)', 1300],
    ['coupé par le bas de la fenêtre', 740],
  ])('en-tête %s → un défilement, focus sur la liste sans défilement propre', (_, haut) => {
    const section = resultats(haut);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const focus = vi.spyOn(section, 'focus');
    expect(garderResultatsEnVue(section, 100_000)).toBe(true);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(document.activeElement).toBe(section);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ top: Math.max(0, haut), behavior: 'smooth' });
  });

  it('jamais au-delà de la fin de la page filtrée (sinon la page sauterait quand on lui rend sa hauteur)', () => {
    const section = resultats(1300);
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    garderResultatsEnVue(section, 1500);
    expect(scroll).toHaveBeenCalledWith({ top: 1500 - window.innerHeight, behavior: 'smooth' });
  });

  it('avantFiltre : ancrage coupé et hauteur gardée jusqu’au rendu, rendus ensuite (rien à défiler)', () => {
    const html = document.documentElement;
    html.style.overflowAnchor = 'auto';
    const section = resultats(200);
    const fin = avantFiltre();
    expect(html.style.overflowAnchor).toBe('none');
    expect(html.style.minHeight).toMatch(/px$/);
    expect(fin(section)).toBe(false);
    expect(html.style.overflowAnchor).toBe('auto');
    expect(html.style.minHeight).toBe('');
  });

  it('avantFiltre : avec un glissé, hauteur rendue à la fin du défilement (scrollend), ou au plus tard après le délai', () => {
    vi.useFakeTimers();
    const html = document.documentElement;
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const fin = avantFiltre();
    expect(fin(resultats(-500))).toBe(true);
    expect(html.style.minHeight).not.toBe('');
    window.dispatchEvent(new Event('scrollend'));
    expect(html.style.minHeight).toBe('');
    expect(html.style.overflowAnchor).toBe('');

    const fin2 = avantFiltre();
    fin2(resultats(-500));
    expect(html.style.minHeight).not.toBe('');
    vi.advanceTimersByTime(GEL_MAX_MS);
    expect(html.style.minHeight).toBe('');
  });

  it('un second filtre avant le rendu du premier : le premier ne rend plus rien, le second prend la main', () => {
    const html = document.documentElement;
    const section = resultats(200);
    const fin1 = avantFiltre();
    const fin2 = avantFiltre();
    expect(html.style.overflowAnchor).toBe('none');
    expect(fin1(section)).toBe(false);
    expect(html.style.overflowAnchor).toBe('none');
    fin2(section);
    expect(html.style.overflowAnchor).toBe('');
    expect(html.style.minHeight).toBe('');
  });

  // L240, revue UX r1 (M1) : la colonne entière se pose à son `top` collé (96 px), pas à la marge de la barre (78 px)
  it('limiteCollee : colonne entière posée à son top collé, contrôle seul à la marge ; conteneur gardé jusqu’au rendu', () => {
    document.body.innerHTML = `<div class="grille"><aside style="position: sticky; top: 96px"><button>Durée courte</button></aside></div>`;
    const grille = document.querySelector<HTMLElement>('.grille')!;
    const aside = document.querySelector('aside')!;
    const bouton = document.querySelector('button')!;
    const rect = (top: number, h: number) => ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    grille.getBoundingClientRect = () => rect(0, 2000);
    aside.getBoundingClientRect = () => rect(96, 430);
    bouton.getBoundingClientRect = () => rect(150, 36);
    expect(limiteCollee(bouton, 78, true)).toBe(2000 - 430 - 96);
    expect(limiteCollee(bouton, 78)).toBe(2000 - 430 + 54 - 78);
    aside.style.top = 'auto';
    expect(limiteCollee(bouton, 78, true)).toBe(2000 - 430 - 78);
    expect(limiteCollee(null, 78, true)).toBe(Infinity);

    const fin = avantFiltre(bouton);
    expect(grille.style.minHeight).toBe('2000px');
    fin(null);
    expect(grille.style.minHeight).toBe('');
  });
});
