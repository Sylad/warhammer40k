import { Component, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith, switchMap, catchError, of, Subject, merge } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SseService } from '../../../core/services/sse.service';

interface UsageResponse {
  month: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  estimatedCostEur: number;
  budgetEur: number;
  percent: number;
  hasBalance: boolean;
  estimatedRemainingEur: number | null;
  configuredBalanceEur: number | null;
  remainingPercent: number | null;
}

const USD_TO_EUR = 0.93;

@Component({
  selector: 'app-claude-usage-badge',
  standalone: true,
  template: `
    @if (usage(); as u) {
      <div class="claude-badge" [class]="badgeClass()" [title]="badgeTitle(u)" (click)="startEdit($event)">
        @if (!editing()) {
          <span class="badge-label">Claude</span>
          @if (u.hasBalance && u.estimatedRemainingEur !== null) {
            <span class="badge-value">~{{ u.estimatedRemainingEur.toFixed(2) }}€ restant</span>
          } @else {
            <span class="badge-value">{{ u.estimatedCostEur.toFixed(2) }}€ consommé</span>
          }
          <span class="badge-bar"><span class="badge-fill" [style.width.%]="progressWidth(u)"></span></span>
        } @else {
          <input #balInput class="badge-input" type="number" step="0.01" min="0" autofocus
                 [placeholder]="u.configuredBalanceEur ? u.configuredBalanceEur.toFixed(2) : 'solde €'"
                 (keyup.enter)="saveBalance(balInput.value)"
                 (keyup.escape)="editing.set(false)"
                 (click)="$event.stopPropagation()" />
          <button class="badge-btn" (click)="saveBalance(balInput.value); $event.stopPropagation()">✓</button>
        }
      </div>
    }
  `,
  styles: [`
    .claude-badge { display:flex; align-items:center; gap:6px; padding:3px 10px; border-radius:12px; font-size:0.72rem; border:1px solid currentColor; transition:color 0.4s; cursor:pointer; user-select:none; }
    .badge-green  { color:#4caf50; background:rgba(76,175,80,0.08); }
    .badge-yellow { color:#ff9800; background:rgba(255,152,0,0.08); }
    .badge-red    { color:#f44336; background:rgba(244,67,54,0.08); }
    .badge-label  { font-weight:600; font-size:0.7rem; opacity:0.8; }
    .badge-bar    { width:48px; height:3px; background:rgba(255,255,255,0.12); border-radius:2px; overflow:hidden; }
    .badge-fill   { display:block; height:100%; background:currentColor; border-radius:2px; transition:width 0.5s; }
    .badge-input  { width:72px; background:transparent; border:none; border-bottom:1px solid currentColor; color:inherit; font-size:0.72rem; outline:none; padding:0 2px; }
    .badge-btn    { background:transparent; border:none; color:inherit; cursor:pointer; font-size:0.8rem; padding:0 2px; line-height:1; }
  `],
})
export class ClaudeUsageBadgeComponent {
  private readonly http = inject(HttpClient);
  private readonly sse = inject(SseService);
  private readonly manualRefresh$ = new Subject<void>();
  readonly editing = signal(false);

  readonly usage = toSignal(
    merge(this.manualRefresh$, this.sse.events$('claude-balance-changed')).pipe(
      startWith(null),
      switchMap(() => this.http.get<UsageResponse>(`${environment.apiUrl}/claude/usage`).pipe(
        catchError(() => of(null))
      ))
    )
  );

  badgeClass(): string {
    const u = this.usage();
    if (!u) return 'claude-badge badge-green';
    if (u.hasBalance && u.remainingPercent !== null) {
      if (u.remainingPercent < 20) return 'claude-badge badge-red';
      if (u.remainingPercent < 50) return 'claude-badge badge-yellow';
      return 'claude-badge badge-green';
    }
    if (u.percent >= 80) return 'claude-badge badge-red';
    if (u.percent >= 50) return 'claude-badge badge-yellow';
    return 'claude-badge badge-green';
  }

  progressWidth(u: UsageResponse): number {
    if (u.hasBalance && u.remainingPercent !== null) return u.remainingPercent;
    return u.percent;
  }

  badgeTitle(u: UsageResponse): string {
    if (u.hasBalance && u.estimatedRemainingEur !== null) {
      return `Claude · ~${u.estimatedRemainingEur.toFixed(2)}€ restant · ${u.calls} appels · cliquer pour modifier le solde`;
    }
    return `Claude · ${u.estimatedCostEur.toFixed(2)}€ consommé · ${u.calls} appels · cliquer pour saisir le solde`;
  }

  startEdit(e: MouseEvent): void {
    e.stopPropagation();
    this.editing.set(true);
  }

  saveBalance(value: string): void {
    const eur = parseFloat(value);
    if (!isNaN(eur) && eur > 0) {
      const balanceUsd = eur / USD_TO_EUR;
      this.http.put(`${environment.apiUrl}/claude/balance`, { balanceUsd }).subscribe(() => {
        this.manualRefresh$.next();
      });
    }
    this.editing.set(false);
  }
}
