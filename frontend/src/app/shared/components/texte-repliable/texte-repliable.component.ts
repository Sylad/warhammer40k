import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { REPLI, gainDuRepli, hauteurVoisine } from '../../../core/utils/densite';

let suivant = 0;

/**
 * L40, règle D2 (docs/densite/regles.md) — un bloc de texte long n'affiche au repos que ses
 * 6 premières lignes (`lignes`), suivies de « Lire la suite », si le repli fait gagner au moins
 * 3 lignes à la page (`gainMin`, voir `gainDuRepli`) : texte entier contre 6 lignes plus le bouton,
 * et, quand le texte partage une rangée de grille avec un encart (image, données, citation), ce que
 * la rangée perd vraiment. On ne fait pas cliquer pour un gain nul ou d'une ligne. Le texte entier
 * reste dans la page (lecteurs d'écran, impression, recherche) : seul l'affichage est replié.
 *
 *   <app-texte-repliable [texte]="f.longHistory" sujet="Chronique complète">
 *     <p class="bible-text">{{ f.longHistory }}</p>
 *   </app-texte-repliable>
 *
 * Le paragraphe est projeté : il garde les styles de la page qui l'emploie. `texte` ne sert qu'à
 * décider du repli et à le refermer quand le texte change (autre fiche, même composant).
 * Candidat au-delà de `seuil` caractères ; dans un navigateur, la hauteur du texte entier et celle
 * des encarts voisins sont mesurées (ResizeObserver : elles changent avec la largeur) et décident
 * du repli et du bouton. Sans mesure (jsdom), un candidat est replié. Styles :
 * src/styles/_densite.scss (budget des feuilles de composant).
 */
@Component({
  selector: 'app-texte-repliable',
  standalone: true,
  host: { class: 'texte-repliable' },
  template: `
    <div #corps class="tr-corps" [id]="id" [class.tr-replie]="candidat && !ouvert() && deborde() !== false" [style.--tr-lignes]="lignes">
      <ng-content />
    </div>
    @if (candidat && deborde() !== false) {
      <button type="button" class="tr-bouton" [attr.aria-expanded]="ouvert()" [attr.aria-controls]="id" (click)="basculer()">
        {{ ouvert() ? 'Réduire' : 'Lire la suite' }}@if (sujet) {<span class="tr-sujet"> : {{ sujet }}</span>}
      </button>
    }
  `,
})
export class TexteRepliableComponent implements AfterViewInit, OnDestroy {
  private _texte = '';
  // @Input et non input() : la suite de tests compile en JIT, qui ne connaît pas les entrées signal.
  @Input({ required: true })
  set texte(v: string | null | undefined) {
    this._texte = v ?? '';
    this.ouvert.set(false);
    this.deborde.set(null);
    queueMicrotask(() => this.mesurer());
  }
  get texte(): string {
    return this._texte;
  }
  /** Lignes affichées au repos. */
  @Input() lignes: number = REPLI.lignes;
  /** Le texte ne se replie que si la page y gagne au moins ce nombre de lignes (règle D2). */
  @Input() gainMin: number = REPLI.gainMinLignes;
  /** En deçà de ce nombre de caractères, jamais de repli ni de mesure. */
  @Input() seuil = 200;
  /** Titre de la section, ajouté au nom accessible du bouton (« Lire la suite : Chronique »). */
  @Input() sujet = '';

  @ViewChild('corps', { static: true }) private corps!: ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: ResizeObserver;

  readonly id = `texte-repliable-${++suivant}`;
  readonly ouvert = signal(false);
  /** null = pas encore mesuré (jsdom, ou avant le premier rendu) ; false = le repli ne gagnerait pas `gainMin` lignes. */
  readonly deborde = signal<boolean | null>(null);

  get candidat(): boolean {
    return this._texte.length > this.seuil;
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(() => this.zone.run(() => this.mesurer()));
    this.observer.observe(this.corps.nativeElement);
    // La rangée grandit avec l'encart voisin (image chargée, largeur) : on remesure.
    const parent = this.hote.nativeElement.parentElement;
    if (parent) this.observer.observe(parent);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  basculer(): void {
    const ouvrir = !this.ouvert();
    this.ouvert.set(ouvrir);
    if (!ouvrir) {
      // Replier un long texte peut laisser le lecteur loin sous le paragraphe : on le ramène à la
      // section (son titre, sous la barre d'ancres collante : scroll-padding), pas au seul paragraphe.
      const el = this.corps.nativeElement;
      const section = this.hote.nativeElement.closest<HTMLElement>('section[id], article[id]');
      queueMicrotask(() => {
        const titre = section?.querySelector('h2, h3') ?? el;
        const marge = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        if (titre.getBoundingClientRect().top < marge) (section ?? el).scrollIntoView({ block: 'start' });
      });
    }
  }

  /**
   * Gain du repli : hauteur de défilement du premier élément projeté (texte entier, replié ou non)
   * contre `lignes` lignes et le bouton, rangée de grille comprise (encart voisin).
   */
  private mesurer(): void {
    if (this.ouvert() || !this.candidat || !this.corps) return;
    const bloc = (this.corps.nativeElement.firstElementChild as HTMLElement | null) ?? this.corps.nativeElement;
    if (!bloc.clientHeight) return;
    const style = getComputedStyle(bloc);
    const ligne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    if (!ligne) return;
    const gain = gainDuRepli(bloc.scrollHeight, ligne, hauteurVoisine(this.hote.nativeElement), this.lignes);
    this.deborde.set(gain >= this.gainMin * ligne);
  }
}
