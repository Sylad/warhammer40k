import { Component, DestroyRef, Input, NgZone, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SOURCES_IMAGES, adressesImages, creditDeclare, creditImage, type SourceImage } from '../../core/credits/credit-image';

export interface GroupeCredits {
  source: SourceImage;
  nom: string;
  droits: string;
  nombre: number;
  /** Origines exactes (fichier du wiki, vidéo), dédoublonnées. */
  liens: { texte: string; lien: string }[];
}

const ORDRE = Object.keys(SOURCES_IMAGES) as SourceImage[];
/** `[style]` puis filtre sur « url( » : le sélecteur `[style*="url("]` n'est pas reconnu par jsdom (nwsapi). */
const SELECTEUR = 'img[src], [style]';

/**
 * L238 — crédits des images de la page courante.
 * Observe le contenu (`cible`, le `<main>` de la mise en page) : chaque image d'un tiers reçoit son
 * crédit en infobulle (`title`, sauf si l'élément en a déjà une) et `data-credit="<source>"` ;
 * le pied de page en donne la liste, une ligne par source, avec le lien vers chaque fichier d'origine.
 */
@Component({
  selector: 'app-credits-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (groupes().length) {
      <details class="credits-page" data-testid="credits-page">
        <summary>Crédits des images de cette page</summary>
        <ul>
          @for (g of groupes(); track g.source) {
            <li [attr.data-source]="g.source">
              <strong>{{ g.nom }}</strong> ({{ g.nombre }} image{{ g.nombre > 1 ? 's' : '' }}) — {{ g.droits }}
              @if (g.liens.length) {
                <span class="credits-liens">
                  @for (l of g.liens; track l.lien) {
                    <a [href]="l.lien" target="_blank" rel="noopener noreferrer">{{ l.texte }}<span class="sr-only"> (nouvel onglet)</span></a>
                  }
                </span>
              }
            </li>
          }
        </ul>
        <a class="credits-tout" routerLink="/about" fragment="credits">Tous les crédits et droits</a>
      </details>
    }
  `,
  styles: [`
    :host { display: block; max-width: 720px; width: 100%; }
    .credits-page { color: var(--muted); font-size: 0.75rem; letter-spacing: 0.04em; line-height: 1.5; }
    summary { cursor: pointer; text-align: center; color: var(--gold); min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 6px; }
    summary::-webkit-details-marker { display: none; }
    /* Indicateur d'ouverture (le display:flex retire le triangle natif) ; texte de remplacement vide : non lu. */
    summary::before { content: '▸' / ''; font-size: 0.9em; }
    details[open] > summary::before { content: '▾' / ''; }
    summary:focus-visible, a:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
    ul { margin: 4px 0 8px; padding-left: 1.2em; }
    li { margin: 6px 0; overflow-wrap: anywhere; }
    .credits-liens { display: flex; flex-wrap: wrap; column-gap: 12px; }
    /* L238 r1 (WCAG 1.4.1) : souligné, l'or seul ne se distingue pas assez du texte voisin (1,51:1). */
    .credits-liens a, .credits-tout { color: var(--gold); display: inline-flex; align-items: center; min-height: 24px; text-decoration: underline; text-underline-offset: 3px; }
    .credits-liens a:hover, .credits-tout:hover { color: var(--gold-bright); }
    .credits-tout { min-height: 44px; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  `],
})
export class CreditsPageComponent implements OnInit {
  /** `@Input` et non `input()` : le TestBed JIT du dépôt ne transforme pas les entrées-signaux. */
  @Input({ required: true }) cible!: HTMLElement;
  readonly groupes = signal<GroupeCredits[]>([]);

  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private planifie = 0;

  ngOnInit(): void {
    const racine = this.cible;
    this.zone.runOutsideAngular(() => {
      const obs = new MutationObserver(() => this.planifier());
      obs.observe(racine, { subtree: true, childList: true, attributes: true, attributeFilter: ['src', 'style'] });
      this.destroyRef.onDestroy(() => { obs.disconnect(); clearTimeout(this.planifie); });
    });
    this.planifier(); // après le premier rendu du contenu (liaisons de style comprises)
  }

  private planifier(): void {
    clearTimeout(this.planifie);
    this.planifie = setTimeout(() => this.zone.run(() => this.relever()), 150) as unknown as number;
  }

  /** Relève les images tierces de la page, pose leurs infobulles et met la liste à jour. */
  relever(): void {
    const racine = this.cible;
    const origine = racine.ownerDocument.defaultView?.location.origin ?? 'http://localhost';
    const parSource = new Map<SourceImage, { nombre: number; liens: Map<string, string>; vues: Set<string> }>();
    for (const el of Array.from(racine.querySelectorAll<HTMLElement>(SELECTEUR))) {
      const credits = adressesImages(el).map((a) => ({ a, c: creditImage(a, origine) })).filter((x) => x.c);
      // Source connue par l'élément (auteur et post d'un aperçu Reddit…) : remplace le crédit déduit de l'adresse.
      if (credits.length) credits[0].c = creditDeclare(el, credits[0].c!);
      if (!credits.length) {
        if (el.dataset['credit']) { delete el.dataset['credit']; if (el.dataset['creditTitre']) { el.removeAttribute('title'); delete el.dataset['creditTitre']; } }
        continue;
      }
      const texte = credits.map((x) => x.c!.texte).join(' · ');
      el.dataset['credit'] = credits[0].c!.source;
      if (!el.hasAttribute('title') || el.dataset['creditTitre']) {
        el.setAttribute('title', texte);
        el.dataset['creditTitre'] = '1';
      }
      for (const { a, c } of credits) {
        const g = parSource.get(c!.source) ?? { nombre: 0, liens: new Map(), vues: new Set() };
        if (!g.vues.has(a)) { g.vues.add(a); g.nombre++; }
        if (c!.lien) g.liens.set(c!.lien, c!.source === 'youtube' ? `vidéo ${c!.detail}` : (c!.detail ?? c!.lien));
        parSource.set(c!.source, g);
      }
    }
    this.groupes.set(ORDRE.filter((s) => parSource.has(s)).map((s) => {
      const g = parSource.get(s)!;
      return {
        source: s,
        ...SOURCES_IMAGES[s],
        nombre: g.nombre,
        liens: [...g.liens].map(([lien, texte]) => ({ lien, texte })),
      };
    }));
  }
}
