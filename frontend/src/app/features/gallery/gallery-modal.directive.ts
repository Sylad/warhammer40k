import { AfterViewInit, Directive, ElementRef, EventEmitter, HostListener, OnDestroy, Output, inject } from '@angular/core';

/** Nombre de boîtes ouvertes : le défilement du fond n'est rendu qu'à la fermeture de la dernière. */
let ouvertes = 0;
let overflowAvant = '';

/**
 * L7/t2 — boîte de dialogue modale de la galerie (WCAG 2.4.3, 4.1.2) : `showModal()` la place dans la
 * couche supérieure du navigateur (au-dessus de la barre collante, fond inerte, Tab bouclé), le focus
 * va au bouton ×, le défilement du fond est bloqué, et le focus revient à l'élément d'origine à la
 * fermeture. Échap (événement `cancel`) est annulé et remonté par `dismiss` : l'état du composant décide.
 */
@Directive({ selector: 'dialog[appGalleryModal]', standalone: true })
export class GalleryModalDirective implements AfterViewInit, OnDestroy {
  private readonly dialog = inject<ElementRef<HTMLDialogElement>>(ElementRef).nativeElement;
  private origine: HTMLElement | null = null;
  /** @Output et non output() : le JIT des tests (Vitest) n'applique pas la transformation des API à signaux. */
  @Output() readonly dismiss = new EventEmitter<void>();

  ngAfterViewInit(): void {
    this.origine = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!this.dialog.hasAttribute('open')) this.dialog.showModal();
    this.dialog.querySelector<HTMLElement>('.close')?.focus();
    if (ouvertes++ === 0) {
      overflowAvant = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
  }

  @HostListener('cancel', ['$event'])
  onCancel(event: Event): void {
    event.preventDefault();
    this.dismiss.emit();
  }

  ngOnDestroy(): void {
    if (this.dialog.hasAttribute('open')) this.dialog.close();
    if (--ouvertes === 0) document.body.style.overflow = overflowAvant;
    if (this.origine?.isConnected) this.origine.focus();
  }
}
