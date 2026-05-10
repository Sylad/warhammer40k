import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DemoStatus {
  demoMode: boolean;
  forced: boolean;
}

/**
 * Récupère l'état démo pour l'hôte courant. Quand `forced=true`, le frontend
 * doit afficher la bannière "Mode démo verrouillée" et désactiver toute
 * action d'écriture (de toute façon le backend la refuserait avec un 403).
 *
 * Le flag est stable pour la session entière — le host ne change pas en cours
 * de route.
 */
@Injectable({ providedIn: 'root' })
export class DemoStatusService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  readonly status = signal<DemoStatus>({ demoMode: false, forced: false });
  readonly loaded = signal(false);

  load(): void {
    this.http
      .get<DemoStatus>(`${this.base}/demo/status`)
      .pipe(
        tap((s) => this.status.set(s)),
        catchError(() => {
          // Backend pas joignable → on reste sur le défaut "pas en démo".
          return of(null);
        }),
      )
      .subscribe(() => this.loaded.set(true));
  }
}
