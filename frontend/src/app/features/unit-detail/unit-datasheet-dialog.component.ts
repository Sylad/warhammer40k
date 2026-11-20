import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { CreditLegendeComponent } from '../../shared/components/credit-legende/credit-legende.component';

const STEP = 48;
const SCROLL_KEYS: Record<string, (c: HTMLElement) => [number, number]> = {
  ArrowUp: () => [0, -STEP], ArrowDown: () => [0, STEP], ArrowLeft: () => [-STEP, 0], ArrowRight: () => [STEP, 0],
  PageUp: c => [0, -c.clientHeight * 0.9], PageDown: c => [0, c.clientHeight * 0.9],
  Home: c => [-c.scrollWidth, -c.scrollHeight], End: c => [c.scrollWidth, c.scrollHeight],
};

/**
 * L120 : agrandissement de la fiche technique (ou du portrait) de la fiche unité. Fenêtre modale native
 * dédiée : un vrai <img> (alt hérité de la figure), sans filtre ni voile. Le composant partagé
 * `app-figure-lightbox` n'est pas touché (R10).
 */
@Component({
  selector: 'app-unit-datasheet-dialog',
  standalone: true,
  imports: [CreditLegendeComponent],
  template: `
    <dialog #dlg class="ds-dialog" role="dialog" aria-modal="true" [attr.aria-label]="label"
            (keydown)="onKey($event)" (cancel)="$event.preventDefault(); closed.emit()" (click)="onBackdrop($event)">
      <button #closeBtn class="ds-close" type="button" aria-label="Fermer" (click)="closed.emit()">✕</button>
      <div #scroll class="ds-scroll">
        <img class="ds-img" [src]="src" [alt]="alt" [style.--ds-min-w]="minWidth + 'px'" [style.--ds-min-h]="minHeight + 'px'" (error)="failed.emit()" />
      </div>
      <!-- L238 r1 : crédit visible de l'image vue en grand (l'infobulle n'existe pas au toucher). -->
      <app-credit-legende class="ds-credit" [adresse]="src" />
    </dialog>
  `,
  styleUrl: './unit-datasheet-dialog.component.scss',
})
export class UnitDatasheetDialogComponent implements AfterViewInit, OnDestroy {
  // Décorateurs plutôt que signaux : la transformation AOT des entrées/requêtes-signaux manque sous TestBed JIT (voir CLAUDE.md).
  @Input({ required: true }) src!: string;
  @Input({ required: true }) alt!: string;
  @Input({ required: true }) label!: string;
  /** Taille à l'écran (px) de l'image dans la figure d'où vient l'ouverture : la fenêtre ne l'affiche jamais plus petite. */
  @Input() minWidth = 0;
  @Input() minHeight = 0;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly failed = new EventEmitter<void>();

  @ViewChild('dlg', { static: true }) private dlg!: ElementRef<HTMLDialogElement>;
  @ViewChild('closeBtn', { static: true }) private closeBtn!: ElementRef<HTMLButtonElement>;
  @ViewChild('scroll', { static: true }) private scroll!: ElementRef<HTMLElement>;

  ngAfterViewInit(): void {
    const d = this.dlg.nativeElement;
    if (!d.hasAttribute('open')) d.showModal();
    this.closeBtn.nativeElement.focus();
  }

  ngOnDestroy(): void {
    const d = this.dlg.nativeElement;
    if (d.hasAttribute('open')) d.close();
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.closed.emit();
    } else if (e.key === 'Tab') {
      // Boucle entre Fermer et le lien du crédit (s'il existe) : le focus ne sort pas de la fenêtre.
      const pieges = [this.closeBtn.nativeElement, ...Array.from(this.dlg.nativeElement.querySelectorAll<HTMLElement>('.ds-credit a'))];
      const i = pieges.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      pieges[(i + (e.shiftKey ? pieges.length - 1 : 1)) % pieges.length].focus();
    } else if (SCROLL_KEYS[e.key]) {
      // Le focus reste sur Fermer : les flèches, pages, Début et Fin font défiler l'image (WCAG 2.1.1).
      const c = this.scroll.nativeElement;
      const [dx, dy] = SCROLL_KEYS[e.key](c);
      e.preventDefault();
      c.scrollBy({ left: dx, top: dy });
    }
  }

  /** Un clic hors de l'image (le fond, ou le vide du conteneur, pas sa barre de défilement) ferme la fenêtre. */
  onBackdrop(e: MouseEvent): void {
    const c = this.scroll.nativeElement;
    if (e.target === e.currentTarget) this.closed.emit();
    else if (e.target === c && e.offsetX < c.clientWidth && e.offsetY < c.clientHeight) this.closed.emit();
  }
}
