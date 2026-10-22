import { Directive, Input } from '@angular/core';
import { goToSection, sectionHref } from '../core/utils/section-anchor';

/**
 * L160 — lien vers une section de la page courante (barres d'ancres des fiches, cartes de concepts liés).
 * Attribut `sectionAnchor="histoire"` sur un lien : href réel = chemin courant + #histoire (clic du milieu, « copier l'adresse »
 * et Ctrl+clic mènent à la bonne page) ; le clic simple défile et donne le focus à la section ; un clic
 * modifié suit le comportement natif (voir `goToSection`).
 */
@Directive({
  selector: 'a[sectionAnchor]',
  standalone: true,
  host: {
    '[attr.href]': 'href',
    '(click)': 'onClick($event)',
  },
})
export class SectionAnchorDirective {
  // @Input et non input() : la suite de tests compile en JIT, qui ne connaît pas les entrées signal.
  @Input({ required: true }) sectionAnchor!: string;

  get href(): string {
    return sectionHref(this.sectionAnchor);
  }

  onClick(ev: MouseEvent): void {
    goToSection(ev, this.sectionAnchor);
  }
}
