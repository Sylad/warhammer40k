import { afterNextRender, Directive, ElementRef, inject, Injector, Input, OnChanges, SimpleChanges } from '@angular/core';

/**
 * Fait de la visionneuse partagée un dialogue modal (L157, L169 ; WCAG 2.1.2, 2.4.3, 4.1.2) : role=dialog,
 * aria-modal et nom accessible tant qu'elle est ouverte, focus sur « Fermer » à l'ouverture, Tab qui boucle,
 * focus qui ne reste pas sur ce que le voile masque. Le composant partagé fige son gabarit (test scellé L120 R10) :
 * ces attributs vivent ici, sur son hôte. `appLightboxDialog` est le nom du dialogue, `null` quand elle est fermée.
 * Rendre le focus à l'élément d'origine reste à la page, seule à le connaître.
 */
@Directive({
  selector: 'app-figure-lightbox[appLightboxDialog]',
  standalone: true,
  host: {
    '[attr.role]': 'appLightboxDialog ? "dialog" : null',
    '[attr.aria-modal]': 'appLightboxDialog ? "true" : null',
    '[attr.aria-label]': 'appLightboxDialog',
    '(keydown)': 'onKey($event)',
    '(document:focusin)': 'onFocusIn($event)',
  },
})
export class LightboxDialogDirective implements OnChanges {
  @Input() appLightboxDialog: string | null = null;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  ngOnChanges(changes: SimpleChanges): void {
    const c = changes['appLightboxDialog'];
    if (c?.currentValue && !c.previousValue) {
      afterNextRender(() => this.close()?.focus(), { injector: this.injector });
    }
  }

  private close(): HTMLElement | null {
    return this.host.nativeElement.querySelector<HTMLElement>('.lightbox-close');
  }

  /** WCAG 2.4.3 : le focus boucle dans la visionneuse (Tab sur le dernier → premier, Maj+Tab sur le premier → dernier). */
  onKey(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const items = Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('button, a[href]'));
    if (items.length === 0) return;
    const [first, last] = [items[0], items[items.length - 1]];
    if (document.activeElement !== (e.shiftKey ? first : last)) return;
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
  }

  /**
   * Un clic dans une zone non focalisable du dialogue donne le focus à `main` (ancêtre focalisable le plus proche) ;
   * ce que le voile masque ne doit pas le garder, il revient sur « Fermer ». Pas d'`inert` possible : le dialogue
   * vit dans `main`, lui-même `inert` quand on l'applique. La recherche globale (Ctrl+K) s'ouvre au-dessus et y
   * prend le focus : on le lui laisse.
   */
  onFocusIn(e: FocusEvent): void {
    if (!this.appLightboxDialog || !(e.target instanceof Node)) return;
    const recherche = e.target instanceof Element && e.target.closest('.cmdk-panel');
    if (!this.host.nativeElement.contains(e.target) && !recherche) this.close()?.focus();
  }
}
