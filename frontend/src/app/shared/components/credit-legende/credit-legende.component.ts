import { Component, Input } from '@angular/core';
import { creditImage, type CreditImage } from '../../../core/credits/credit-image';

/**
 * L238 r1 — crédit visible (12 px) d'une image vue en grand (visionneuse de la galerie, agrandissement
 * de la fiche unité) : au toucher, l'infobulle n'existe pas. Même texte que l'infobulle et que la liste
 * du pied de page (`creditImage`), avec le lien vers le fichier d'origine quand l'adresse le donne.
 * `texte` remplace le texte déduit de l'adresse quand la source est connue autrement.
 */
@Component({
  selector: 'app-credit-legende',
  standalone: true,
  template: `
    @if (credit; as c) {
      <p class="credit-legende" data-testid="credit-legende">
        <span>{{ texte || c.texte }}</span>
        @if (c.lien) {
          <a [href]="c.lien" target="_blank" rel="noopener noreferrer">{{ c.source === 'youtube' ? 'Voir la vidéo' : 'Page du fichier' }}<span class="sr-only"> (nouvel onglet)</span></a>
        }
      </p>
    }
  `,
  styles: [`
    :host { display: block; }
    .credit-legende { margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted); overflow-wrap: anywhere; }
    .credit-legende a { margin-left: 8px; color: var(--gold); text-decoration: underline; text-underline-offset: 3px; white-space: nowrap; display: inline-block; min-height: 24px; line-height: 24px; }
    .credit-legende a:hover { color: var(--gold-bright); }
    .credit-legende a:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
    .sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  `],
})
export class CreditLegendeComponent {
  credit: CreditImage | null = null;
  /** Texte du crédit quand la source est connue autrement que par l'adresse. */
  @Input() texte: string | null = null;

  /** Adresse de l'image affichée (relative ou absolue). `@Input` : TestBed JIT sans entrées-signaux. */
  @Input({ required: true }) set adresse(a: string | null | undefined) {
    const origine = typeof location !== 'undefined' ? location.origin : 'http://localhost';
    this.credit = a ? creditImage(a, origine) : null;
  }
}
