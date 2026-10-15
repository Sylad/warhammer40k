import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

/**
 * L120 : agrandissement de la fiche technique (ou du portrait) de la fiche unité. Fenêtre modale native
 * dédiée : un vrai <img> (alt hérité de la figure), sans filtre ni voile. Le composant partagé
 * `app-figure-lightbox` n'est pas touché (R10).
 */
@Component({
  selector: 'app-unit-datasheet-dialog',
  standalone: true,
  template: `
    <dialog #dlg class="ds-dialog" role="dialog" aria-modal="true" [attr.aria-label]="label"
            (keydown)="onKey($event)" (cancel)="$event.preventDefault(); closed.emit()" (click)="onBackdrop($event)">
      <button #closeBtn class="ds-close" type="button" aria-label="Fermer" (click)="closed.emit()">✕</button>
      <img class="ds-img" [src]="src" [alt]="alt" (error)="failed.emit()" />
    </dialog>
  `,
  styles: [`
    .ds-dialog {
      position: fixed; inset: 0;
      width: 100vw; height: 100vh; max-width: none; max-height: none;
      margin: 0; padding: 24px; border: 0;
      background: rgba(2, 1, 1, 0.94);
      align-items: center; justify-content: center;
    }
    .ds-dialog[open] { display: flex; }
    .ds-img {
      max-width: 100%; max-height: 100%;
      object-fit: contain;
      border: 1px solid rgba(201, 162, 74, 0.4);
    }
    .ds-close {
      position: fixed; top: 12px; right: 12px;
      width: 44px; height: 44px;
      background: rgba(8, 7, 6, 0.85);
      border: 1px solid rgba(201, 162, 74, 0.5);
      color: var(--gold-bright);
      font-size: 18px; font-family: inherit; cursor: pointer;
    }
    .ds-close:hover, .ds-close:focus-visible { border-color: var(--gold-bright); background: rgba(123, 17, 19, 0.6); }
  `],
})
export class UnitDatasheetDialogComponent implements AfterViewInit, OnDestroy {
  // Décorateurs plutôt que signaux : la transformation AOT des entrées/requêtes-signaux manque sous TestBed JIT (voir CLAUDE.md).
  @Input({ required: true }) src!: string;
  @Input({ required: true }) alt!: string;
  @Input({ required: true }) label!: string;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly failed = new EventEmitter<void>();

  @ViewChild('dlg', { static: true }) private dlg!: ElementRef<HTMLDialogElement>;
  @ViewChild('closeBtn', { static: true }) private closeBtn!: ElementRef<HTMLButtonElement>;

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
      // Le bouton Fermer est le seul élément focalisable : le focus y reste.
      e.preventDefault();
      this.closeBtn.nativeElement.focus();
    }
  }

  onBackdrop(e: MouseEvent): void {
    if (e.target === e.currentTarget) this.closed.emit();
  }
}
