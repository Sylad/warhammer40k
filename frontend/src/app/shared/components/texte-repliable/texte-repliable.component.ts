import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild, inject, signal } from '@angular/core';

let suivant = 0;

/**
 * L40, règle D2 (docs/densite/regles.md) — un bloc de texte de plus de 8 lignes (`max`) n'affiche
 * au repos que ses 6 premières (`lignes`), suivies de « Lire la suite ». On ne replie pas un texte
 * de 7 ou 8 lignes pour en cacher une ou deux. Le texte entier reste dans la page (lecteurs
 * d'écran, impression, recherche) : seul l'affichage est replié.
 *
 *   <app-texte-repliable [texte]="f.longHistory" sujet="Chronique complète">
 *     <p class="bible-text">{{ f.longHistory }}</p>
 *   </app-texte-repliable>
 *
 * Le paragraphe est projeté : il garde les styles de la page qui l'emploie. `texte` ne sert qu'à
 * décider du repli et à le refermer quand le texte change (autre fiche, même composant).
 * Candidat au-delà de `seuil` caractères ; dans un navigateur, le nombre de lignes du texte entier
 * est mesuré (ResizeObserver : il change avec la largeur) et décide du repli et du bouton. Sans
 * mesure (jsdom), un candidat est replié. Styles : src/styles/_densite.scss (budget des feuilles
 * de composant).
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
  @Input() lignes = 6;
  /** Au-delà de ce nombre de lignes, le texte se replie (seuil de la règle D2). */
  @Input() max = 8;
  /** En deçà de ce nombre de caractères, jamais de repli ni de mesure. */
  @Input() seuil = 200;
  /** Titre de la section, ajouté au nom accessible du bouton (« Lire la suite : Chronique »). */
  @Input() sujet = '';

  @ViewChild('corps', { static: true }) private corps!: ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private observer?: ResizeObserver;

  readonly id = `texte-repliable-${++suivant}`;
  readonly ouvert = signal(false);
  /** null = pas encore mesuré (jsdom, ou avant le premier rendu) ; false = le texte tient en `max` lignes. */
  readonly deborde = signal<boolean | null>(null);

  get candidat(): boolean {
    return this._texte.length > this.seuil;
  }

  ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.observer = new ResizeObserver(() => this.zone.run(() => this.mesurer()));
    this.observer.observe(this.corps.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  basculer(): void {
    const ouvrir = !this.ouvert();
    this.ouvert.set(ouvrir);
    if (!ouvrir) {
      // Replier un long texte peut laisser le lecteur loin sous le paragraphe : on le ramène au début.
      const el = this.corps.nativeElement;
      queueMicrotask(() => {
        if (el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
      });
    }
  }

  /**
   * Nombre de lignes du texte entier (premier élément projeté, qui porte le line-clamp) : sa
   * hauteur de défilement est celle du texte entier, replié ou non.
   */
  private mesurer(): void {
    if (this.ouvert() || !this.candidat || !this.corps) return;
    const bloc = (this.corps.nativeElement.firstElementChild as HTMLElement | null) ?? this.corps.nativeElement;
    if (!bloc.clientHeight) return;
    const style = getComputedStyle(bloc);
    const ligne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    if (!ligne) return;
    this.deborde.set(Math.round(bloc.scrollHeight / ligne) > this.max);
  }
}
