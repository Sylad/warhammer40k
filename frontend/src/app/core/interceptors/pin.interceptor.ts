import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { PinService } from '../services/pin.service';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Intercepteur PIN : pour les requêtes d'écriture, ajoute le header
 * `Authorization: Bearer <pin>` si un PIN est en sessionStorage. En cas
 * de 401, prompt l'utilisateur, mémorise le nouveau PIN, et rejoue la
 * requête.
 */
export const pinInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  if (!WRITE_METHODS.has(req.method)) return next(req);

  const pin = inject(PinService);
  const current = pin.pin();
  const authed = current ? req.clone({ setHeaders: { Authorization: `Bearer ${current}` } }) : req;

  return next(authed).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      const reason = current
        ? 'PIN refusé. Entrez le bon PIN du codex.'
        : 'Entrez le PIN du codex pour cette opération.';
      const fresh = pin.prompt(reason);
      if (!fresh) {
        return throwError(() => err);
      }
      const retried = req.clone({ setHeaders: { Authorization: `Bearer ${fresh}` } });
      return next(retried).pipe(
        catchError((err2: HttpErrorResponse) => {
          if (err2.status === 401) pin.clear();
          return throwError(() => err2);
        }),
      );
    }),
  );
};
