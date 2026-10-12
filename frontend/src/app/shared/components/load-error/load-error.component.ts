import { Component, EventEmitter, Input, Output } from '@angular/core';

/** L38 — état d'erreur d'une page dont les données n'ont pas pu être chargées (404/500, backend absent). */
@Component({
  selector: 'app-load-error',
  standalone: true,
  template: `
    <div class="load-error" role="alert">
      <p>{{ message }}</p>
      <button type="button" (click)="retry.emit()">Réessayer</button>
    </div>
  `,
  styles: [`
    .load-error {
      display: flex; flex-wrap: wrap; align-items: center; gap: 12px 18px;
      margin: 24px 0; padding: 14px 22px;
      background: var(--panel, #0d0a07); border: 1px solid var(--border, #3a2f1c); color: var(--text, #e8dfc8);
    }
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
  @Output() retry = new EventEmitter<void>();
}
