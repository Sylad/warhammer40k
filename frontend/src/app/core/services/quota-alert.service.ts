import { Injectable, signal } from '@angular/core';

export type ClaudeErrorKind = 'quota' | 'auth' | 'rate' | null;

@Injectable({ providedIn: 'root' })
export class QuotaAlertService {
  readonly errorKind = signal<ClaudeErrorKind>(null);
  readonly hasError = signal(false);

  setError(kind: ClaudeErrorKind = 'quota') {
    this.errorKind.set(kind);
    this.hasError.set(true);
  }

  dismiss() {
    this.hasError.set(false);
    this.errorKind.set(null);
  }
}
