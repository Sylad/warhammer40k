import { afterEach, describe, expect, it, vi } from 'vitest';
import { avantFiltre, enteteEnVue, GEL_MAX_MS, garderResultatsEnVue, limiteCollee, relacherColonneTenue } from './resultats-en-vue';

/** Section de résultats dont l'en-tête est à `haut` px du bord de la fenêtre (768 px sous jsdom), 60 px de haut. */
function resultats(haut: number): HTMLElement {
  document.body.innerHTML = `<section tabindex="-1"><header>Titre · 12 résultats</header><div>…</div></section>`;
  const section = document.querySelector('section')!;
  const rect = (top: number, h: number) => ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) });
  section.getBoundingClientRect = () => rect(haut, 2000) as DOMRect;
  section.querySelector('header')!.getBoundingClientRect = () => rect(haut, 60) as DOMRect;
  return section;
}

// jsdom n'a pas de matchMedia : vitest 4 refuse vi.spyOn sur une propriété absente (L264), on la pose le temps du cas.
function simulerMatchMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches }) as MediaQueryList));
}

describe('L239 — après un filtre, le titre et le compte des résultats sont en vue', () => {
  afterEach(() => {
    Reflect.deleteProperty(document.documentElement, 'scrollHeight'); // posé par sousLaListe (L241)
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  // L240, revue UX r2 (M1-bis) : colonne collée gardée à sa place d'avant le clic. Modèle de mise en page (jsdom n'en a
  // pas) : conteneur au haut du document, contenu naturel `nat` px ou sa `min-height` ; colonne de 430 px, collée à
  // 96 px, dans le flux à 0 : à scrollY S elle est à min(max(96, −S), fin − 430 − S) ; liste des résultats, en-tête à
  // `tete` px du haut du document ; fenêtre de 768 px (jsdom), sans barre (`scroll-padding-top` non lu par jsdom).
  function colonneCollee(depart: number, nat: { avant: number; apres: number }, tete: number) {
    document.body.innerHTML = `<div class="grille"><main><section tabindex="-1"><header>2 résultats</header></section></main>`
      + `<aside style="position: sticky; top: 96px"><button>Durée courte</button></aside></div>`;
    const grille = document.querySelector<HTMLElement>('.grille')!;
    const aside = document.querySelector('aside')!;
    const bouton = document.querySelector('button')!;
    const section = document.querySelector('section')!;
    const etat = { y: depart, nat: nat.avant };
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => etat.y });
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(((o: ScrollToOptions) => { etat.y = o.top!; }) as typeof window.scrollTo);
    const rect = (top: number, h: number) => ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    const fin = () => Math.max(etat.nat, parseFloat(grille.style.minHeight) || 0);
    const colonne = () => {
      if (aside.style.position === 'static') return -etat.y;
      return Math.min(Math.max(parseFloat(aside.style.top), -etat.y), fin() - 430 - etat.y);
    };
    grille.getBoundingClientRect = () => rect(-etat.y, fin());
    aside.getBoundingClientRect = () => rect(colonne(), 430);
    bouton.getBoundingClientRect = () => rect(colonne() + 54, 36);
    section.getBoundingClientRect = () => rect(tete - etat.y, 300);
    section.querySelector('header')!.getBoundingClientRect = () => rect(tete - etat.y, 60);
    document.body.getBoundingClientRect = () => rect(-etat.y, fin() + 200);
    return { grille, aside, bouton, section, scroll, etat, colonne, filtrer: (apres = nat.apres) => {
      const f = avantFiltre(bouton);
      etat.nat = apres;
      return f(section);
    } };
  }

  it('colonne à son top, rien à défiler (bande 1460-1540) : la liste raccourcie ne la repousse plus, conteneur tenu', () => {
    const c = colonneCollee(1500, { avant: 2100, apres: 1600 }, 1500);
    expect(c.colonne()).toBe(96);
    expect(c.filtrer()).toBe(false);
    expect(c.scroll).not.toHaveBeenCalled();
    expect(c.colonne()).toBe(96); // sans la tenue : 1600 − 430 − 1500 = −330
    expect(c.grille.style.minHeight).toBe(`${96 + 430 + 1500}px`);
    expect(document.activeElement).not.toBe(c.section);
    window.dispatchEvent(new Event('resize')); // redimensionnement : hauteur rendue
    expect(c.grille.style.minHeight).toBe('');
  });

  // revue de code r4 de L240, constat 1 : la hauteur tenue survivait à un filtre sans contrôle (puce des Vidéos)
  it('hauteur tenue de la colonne rendue au filtre suivant qui ne vient pas d’elle (puce), écouteur resize retiré', () => {
    const c = colonneCollee(1500, { avant: 2100, apres: 1600 }, 1500);
    expect(c.filtrer()).toBe(false);
    expect(c.grille.style.minHeight).toBe(`${96 + 430 + 1500}px`);
    const retrait = vi.spyOn(window, 'removeEventListener');
    const puce = avantFiltre(); // puce « Lore » : la liste raccourcit encore
    expect(c.grille.style.minHeight).toBe(`${96 + 430 + 1500}px`); // rien ne bouge avant le rendu
    c.etat.nat = 900;
    puce(c.section);
    expect(c.grille.style.minHeight).toBe(''); // sans la correction : 2026px, bande vide sous la liste courte
    expect(retrait).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('second filtre de la même colonne : la hauteur tenue n’est pas rendue entre les deux (la colonne ne bouge pas)', () => {
    const c = colonneCollee(1500, { avant: 2100, apres: 1600 }, 1500);
    expect(c.filtrer()).toBe(false);
    expect(c.filtrer(1400)).toBe(false);
    expect(c.colonne()).toBe(96);
    expect(c.grille.style.minHeight).toBe(`${96 + 430 + 1500}px`);
    relacherColonneTenue();
  });

  // revue de code r4 de L240, constat 2 : l'écouteur resize survivait à la destruction de la page
  it('relacherColonneTenue : hauteur rendue, écouteur resize retiré (un redimensionnement ultérieur ne touche rien)', () => {
    const c = colonneCollee(1500, { avant: 2100, apres: 1600 }, 1500);
    c.filtrer();
    expect(c.grille.style.minHeight).not.toBe('');
    const retrait = vi.spyOn(window, 'removeEventListener');
    relacherColonneTenue();
    expect(c.grille.style.minHeight).toBe('');
    const relacher = retrait.mock.calls.find(([type]) => type === 'resize')?.[1];
    expect(relacher).toBeTypeOf('function');
    c.grille.style.minHeight = '1234px'; // posé par autre chose : un resize ne doit plus y toucher
    window.dispatchEvent(new Event('resize'));
    expect(c.grille.style.minHeight).toBe('1234px');
    relacherColonneTenue(); // sans tenue : sans effet
    expect(c.grille.style.minHeight).toBe('1234px');
  });

  it('fin de page, colonne repoussée au-dessus de son top : la page défile vers les résultats, la colonne ne bouge pas', () => {
    const c = colonneCollee(1700, { avant: 2100, apres: 1600 }, 1200);
    const place = c.colonne();
    expect(place).toBe(2100 - 430 - 1700); // −30 : repoussée par le bas du conteneur
    expect(c.filtrer()).toBe(true);
    expect(c.etat.y).toBe(1200);
    expect(c.colonne()).toBe(place); // l'ancien code la ramenait à 96 (+126 px)
    expect(document.activeElement).toBe(c.section);
    // second clic : la liste reprend sa longueur ; la page revient là où la colonne reste à sa place, en-tête hors de vue,
    // focus sur la rangée (il n'est pas déplacé)
    c.bouton.focus();
    expect(c.filtrer(2100)).toBe(true);
    expect(c.etat.y).toBe(1700);
    expect(c.colonne()).toBe(place);
    expect(document.activeElement).toBe(c.bouton);
  });

  it('glissé : top collé posé à la place de la colonne pendant le défilement, rétabli à la fin, conteneur tenu', () => {
    simulerMatchMedia(false);
    const c = colonneCollee(1700, { avant: 2100, apres: 1600 }, 1200);
    const place = c.colonne();
    expect(c.filtrer()).toBe(true);
    expect(c.scroll).toHaveBeenCalledWith({ top: 1200, behavior: 'smooth' });
    expect(c.aside.style.top).toBe(`${place}px`);
    for (const y of [1650, 1400, 1200]) {
      c.etat.y = y;
      expect(c.colonne(), `scrollY ${y}`).toBe(place);
    }
    window.dispatchEvent(new Event('scrollend'));
    expect(c.aside.style.top).toBe('96px');
    expect(c.colonne()).toBe(place);
    expect(c.grille.style.minHeight).toBe(`${place + 430 + 1200}px`);
  });

  // L241 : 768 et 1024 px, « Filtres avancés » sous la liste, sans colonne collée. Modèle : en-tête des résultats à
  // 1000 px du haut du document, liste de `liste` px, rangée 300 px sous la fin de la liste, page qui finit 600 px plus
  // bas ; fenêtre de 768 px (jsdom).
  function sousLaListe(depart: number, liste: { avant: number; apres: number }) {
    document.body.innerHTML = `<section tabindex="-1"><header>2 résultats</header></section><aside><button>Durée courte</button></aside>`;
    const section = document.querySelector('section')!;
    const bouton = document.querySelector('button')!;
    const etat = { y: depart, liste: liste.avant };
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => etat.y });
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(((o: ScrollToOptions) => { etat.y = o.top!; }) as typeof window.scrollTo);
    const rect = (top: number, h: number) => ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
    section.getBoundingClientRect = () => rect(1000 - etat.y, etat.liste);
    section.querySelector('header')!.getBoundingClientRect = () => rect(1000 - etat.y, 60);
    bouton.getBoundingClientRect = () => rect(1000 + etat.liste + 300 - etat.y, 36);
    document.body.getBoundingClientRect = () => rect(-etat.y, 1000 + etat.liste + 900);
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, get: () => 1000 + etat.liste + 900 });
    return { section, bouton, scroll, etat, filtrer: (apres: number, options = { sousLePointeur: true }) => {
      const f = avantFiltre(bouton, options);
      etat.liste = apres;
      return f(section);
    } };
  }

  it('sous la liste, hors téléphone : la rangée garde sa place dans la fenêtre (défilement instantané), au filtre et quand on le défait', () => {
    simulerMatchMedia(false); // glissé permis : il ne doit pas servir
    const c = sousLaListe(3000, { avant: 2400, apres: 300 });
    const place = c.bouton.getBoundingClientRect().top; // 700
    c.bouton.focus();
    expect(c.filtrer(300)).toBe(true);
    expect(c.scroll).toHaveBeenCalledWith({ top: 3000 - 2100, behavior: 'instant' });
    expect(c.bouton.getBoundingClientRect().top).toBe(place);
    expect(document.activeElement).toBe(c.bouton); // en-tête hors de vue : le focus n'est pas déplacé vers la liste
    expect(document.documentElement.style.minHeight).toBe(''); // dégel immédiat
    expect(c.filtrer(2400)).toBe(true);
    expect(c.etat.y).toBe(3000);
    expect(c.bouton.getBoundingClientRect().top).toBe(place);
  });

  it('sous la liste, téléphone (option absente) : défilement vers les résultats de L239, inchangé', () => {
    const c = sousLaListe(3000, { avant: 2400, apres: 300 });
    expect(c.filtrer(300, { sousLePointeur: false })).toBe(true);
    expect(c.etat.y).toBe(1000);
    expect(document.activeElement).toBe(c.section);
  });

  it('sous la liste, longueur de liste inchangée : rien ne bouge', () => {
    const c = sousLaListe(3000, { avant: 2400, apres: 2400 });
    expect(c.filtrer(2400)).toBe(false);
    expect(c.scroll).not.toHaveBeenCalled();
  });
});

// Balayage exhaustif de la règle de L240 r2 (« la rangée pressée reste sous le pointeur »), au pixel près, sur le vrai
// `avantFiltre` et une mise en page modèle de /videos à 1440 px. Il tournait dans le navigateur par pas de 20 px
// (filtres-defilement-l239.e2e.spec.ts, 1456 navigations, plus de 7 min en CI) ; le navigateur n'y garde que les cas
// limites (départs calculés sur la page). Géométrie mesurée le 21-11 sur l'application construite (1440 × 900, 768 et
// 700 : identique en coordonnées du document) : colonne « Filtres avancés » de 418 px, collée à 96 px, dans le flux à
// 808 ; conteneur de 808 à 2541 (contenu naturel), 1962 avec un filtre à 2 résultats, 2223 avec « Animations » (5) ;
// pied de page 502 px sous le conteneur ; en-tête des résultats à 1616 (57 px) ; barre du haut 78 px.
describe('L240 r2 — balayage exhaustif : colonne collée des Vidéos sous le pointeur, au filtre et quand on le défait', () => {
  const G = { flux: 808, top: 96, hauteur: 418, finAvant: 2541, pied: 502, tete: 1616, teteH: 57, marge: 78 };
  const rect = (top: number, h: number) => ({ top, bottom: top + h, left: 0, right: 0, width: 0, height: h, x: 0, y: top, toJSON: () => ({}) }) as DOMRect;
  let fenetre = 900;
  let etat = { y: 0, nat: G.finAvant };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.documentElement.removeAttribute('style');
    window.dispatchEvent(new Event('resize')); // tenue rendue : le module n'en garde aucune pour le cas suivant
  });

  /** Page modèle : le navigateur borne `scrollY` à la hauteur du document (min-height comprises). */
  function page(innerHeight: number, lisse: boolean) {
    fenetre = innerHeight;
    vi.spyOn(window, 'innerHeight', 'get').mockImplementation(() => fenetre);
    simulerMatchMedia(!lisse);
    Object.defineProperty(window, 'scrollY', { configurable: true, get: () => etat.y });
    const html = document.documentElement;
    html.style.scrollPaddingTop = `${G.marge}px`;
    document.body.innerHTML = `<section class="layout"><div class="liste"><section tabindex="-1"><header>2 résultats</header></section></div>`
      + `<aside style="position: sticky; top: ${G.top}px"><button>Durée courte</button></aside></section>`;
    const conteneur = document.querySelector<HTMLElement>('.layout')!;
    const aside = document.querySelector('aside')!;
    const bouton = document.querySelector('button')!;
    const section = document.querySelector<HTMLElement>('.liste > section')!;
    // conteneur en border-box (comme .layout), min-height posée en px depuis son haut (808 dans le document)
    const fin = () => Math.max(etat.nat, G.flux + (parseFloat(conteneur.style.minHeight) || 0));
    const hauteurPage = () => Math.max(fin() + G.pied, parseFloat(html.style.minHeight) || 0);
    const maxY = () => Math.max(0, hauteurPage() - fenetre);
    Object.defineProperty(html, 'scrollHeight', { configurable: true, get: hauteurPage });
    const colonne = () => {
      if (aside.style.position === 'static') return G.flux - etat.y;
      return Math.min(Math.max(parseFloat(aside.style.top), G.flux - etat.y), fin() - G.hauteur - etat.y);
    };
    const trajets: { de: number; a: number; lisse: boolean }[] = [];
    vi.spyOn(window, 'scrollTo').mockImplementation(((o: ScrollToOptions) => {
      trajets.push({ de: etat.y, a: o.top!, lisse: o.behavior === 'smooth' });
      etat.y = Math.min(Math.max(0, o.top!), maxY());
    }) as typeof window.scrollTo);
    // Coût (CI du 21-11, « Timeout calling onTaskUpdate ») : ~70 % d'un départ passait dans le `getComputedStyle` de jsdom,
    // qui parcourt sa feuille de style par défaut à chaque appel. Sur ce modèle, il ne rend pour les propriétés que lit
    // `resultats-en-vue.ts` que les styles en ligne : vérifié ici, élément par élément, avant de le remplacer.
    const lues: [HTMLElement, (keyof CSSStyleDeclaration & string)[]][] = [
      [html, ['scrollPaddingTop']],
      [conteneur, ['position', 'paddingTop', 'paddingBottom', 'borderTopWidth', 'borderBottomWidth', 'boxSizing']],
      [aside, ['position', 'top', 'marginBottom']],
      [bouton, ['position']],
    ];
    for (const [el, proprietes] of lues) {
      const vrai = getComputedStyle(el);
      for (const k of proprietes) expect(el.style[k], `${el.tagName}.${k}`).toBe(vrai[k]);
    }
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element) => (el as HTMLElement).style);
    conteneur.getBoundingClientRect = () => rect(G.flux - etat.y, fin() - G.flux);
    aside.getBoundingClientRect = () => rect(colonne(), G.hauteur);
    bouton.getBoundingClientRect = () => rect(colonne() + 54, 35);
    section.getBoundingClientRect = () => rect(G.tete - etat.y, 300);
    section.querySelector('header')!.getBoundingClientRect = () => rect(G.tete - etat.y, G.teteH);
    document.body.getBoundingClientRect = () => rect(-etat.y, hauteurPage());
    /** Un clic : liste naturelle `apres` ; rend la place de la colonne à chaque étape du glissé, et à la fin. */
    const cliquer = (apres: number) => {
      const f = avantFiltre(bouton);
      etat.nat = apres;
      const depart = etat.y;
      trajets.length = 0;
      etat.y = depart;
      f(section);
      const places: number[] = [];
      const t = trajets[0];
      if (t?.lisse) {
        // glissé : la page passe par chaque scrollY entre départ et but avant `scrollend`
        const but = etat.y;
        for (let y = t.de; y !== but; y += Math.sign(but - y)) { etat.y = y; places.push(colonne()); }
        etat.y = but;
        places.push(colonne());
        window.dispatchEvent(new Event('scrollend'));
      }
      places.push(colonne());
      return { places, defile: trajets.length > 0 };
    };
    /** Page neuve au défilement `depart` : liste complète, aucune hauteur tenue ni `top` posé (une seule mise en page par cas). */
    const remettre = (depart: number) => {
      window.dispatchEvent(new Event('resize')); // tenue rendue, comme au redimensionnement
      expect(conteneur.style.minHeight).toBe('');
      expect(aside.style.top).toBe(`${G.top}px`);
      expect(html.style.minHeight).toBe('');
      etat = { y: depart, nat: G.finAvant };
    };
    return { colonne, cliquer, maxY, remettre, section, bouton };
  }

  /** Départs balayés entre deux retours à la boucle d'événements du worker. */
  const TRANCHE = 100;

  for (const lisse of [false, true]) {
    for (const hauteur of [900, 768, 700]) {
      for (const [filtre, apres] of [['2 résultats (Durée courte, Long format, FR uniquement)', 1962], ['Animations (5 résultats)', 2223]] as const) {
        it(`1440×${hauteur}, ${lisse ? 'glissé' : 'reduce'}, ${filtre} : chaque départ de 1300 à la fin de page, au pixel → la colonne ne bouge pas, au filtre ni quand on le défait`, async () => {
          const echecs: string[] = [];
          let defilements = 0;
          etat = { y: 0, nat: G.finAvant };
          const p = page(hauteur, lisse);
          const finDePage = p.maxY();
          for (let depart = 1300; depart <= finDePage; depart++) {
            // rendre la main au worker par tranches : un balayage d'un bloc l'empêchait de répondre au RPC de vitest
            if (depart % TRANCHE === 0) await new Promise((r) => setTimeout(r, 0));
            p.remettre(depart);
            const place = p.colonne();
            const enVueAvant = enteteEnVue(p.section);
            const un = p.cliquer(apres);
            const apresUn = etat.y;
            if (un.defile) defilements++;
            if (un.places.some((x) => Math.abs(x - place) > 0.5)) echecs.push(`${depart} : colonne ${place} → ${un.places.find((x) => Math.abs(x - place) > 0.5)} au filtre`);
            // en-tête déjà en vue : rien ne défile ; sinon la page remonte vers les résultats (jamais au-delà de la fin)
            if (enVueAvant && apresUn !== depart) echecs.push(`${depart} : en-tête en vue, la page a défilé jusqu'à ${apresUn}`);
            if (!enVueAvant && (apresUn > depart || apresUn > p.maxY())) echecs.push(`${depart} : défilement vers ${apresUn} (fin ${p.maxY()})`);
            p.bouton.focus();
            const deux = p.cliquer(G.finAvant);
            if (deux.places.some((x) => Math.abs(x - place) > 0.5)) echecs.push(`${depart}, second clic : colonne ${place} → ${deux.places.find((x) => Math.abs(x - place) > 0.5)}`);
          }
          expect(echecs.slice(0, 10), `${echecs.length} échecs sur ${finDePage - 1300 + 1} départs`).toEqual([]);
          // le balayage passe bien par les deux régimes : page immobile (bande 1300-1538) et défilement vers les résultats
          expect(defilements).toBeGreaterThan(0);
          expect(defilements).toBeLessThan(finDePage - 1300 + 1);
        });
      }
    }
  }
});
