import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class QuotaAlertService {
  readonly hasError = signal(false);
  setError() { this.hasError.set(true); }
  dismiss() { this.hasError.set(false); }
}
