import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'wh40k.pin';

@Injectable({ providedIn: 'root' })
export class PinService {
  readonly pin = signal<string | null>(this.read());

  private read(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  set(value: string): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch {}
    this.pin.set(value);
  }

  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.pin.set(null);
  }

  /** Demande le PIN à l'utilisateur via prompt natif. Retourne le PIN ou null si annulé. */
  prompt(reason = 'Entrez le PIN du codex pour cette opération.'): string | null {
    const value = window.prompt(reason);
    if (!value) return null;
    this.set(value);
    return value;
  }
}
