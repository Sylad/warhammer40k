import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

/** L38 — état d'erreur d'une page dont les données n'ont pas pu être chargées (404/500, backend absent). */
@Component({
  selector: 'app-load-error',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (notFound || heading) {
      <h1 class="load-error-title">{{ heading || 'Fiche introuvable' }}</h1>
    }
    <div class="load-error" role="alert">
      <p>{{ notFound ? 'Cette fiche est introuvable.' : message }}</p>
      @if (!notFound) {
        <button type="button" (click)="retry.emit()">Réessayer</button>
      } @else if (backLink) {
        <a class="back" [routerLink]="backLink">{{ backLabel }}</a>
      }
    </div>
  `,
  styles: [`
    .load-error {
      display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px;
      margin: 24px 0; padding: 14px 22px;
      background: var(--panel, #0d0a07); border: 1px solid var(--border, #3a2f1c); color: var(--text, #e8dfc8);
    }
    .load-error-title { margin: 24px 0 0; font: 600 1.6rem var(--serif, 'Cinzel', serif); color: var(--gold-bright, #f0d276); }
    .back {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px;
      color: var(--gold-bright, #f0d276); font: 600 0.85rem var(--sans, 'Inter', sans-serif); letter-spacing: 0.08em;
    }
    .back:hover { color: var(--gold, #c9a24a); }
    .back:focus-visible { outline: 2px solid var(--gold-bright, #f0d276); outline-offset: 3px; }
    p { margin: 0; flex: 1 1 260px; }
    button {
      min-height: 44px; padding: 0 16px; border: 1px solid var(--border-strong, #6b5a2e); background: transparent;
      color: var(--gold-bright, #f0d276); font: 600 0.85rem var(--sans, 'Inter', sans-serif); letter-spacing: 0.08em; cursor: pointer;
    }
    button:hover { border-color: var(--gold, #c9a24a); }
    button:focus-visible { outline: 2px solid var(--gold-bright, #f0d276); outline-offset: 3px; }
  `],
})
export class LoadErrorComponent {
  @Input() message = 'Les données n’ont pas pu être chargées. Vérifiez la connexion, puis réessayez.';
  /** 404 : la fiche n'existe pas, « Réessayer » ne pourrait pas aboutir. */
  @Input() notFound = false;
  /** Titre h1 de l'état ; par défaut « Fiche introuvable » quand notFound, aucun sinon (la page garde le sien). */
  @Input() heading = '';
  /** Lien vers la liste, affiché seulement quand notFound. */
  @Input() backLink: string | null = null;
  @Input() backLabel = 'Retour à la liste';
  @Output() retry = new EventEmitter<void>();
}
