import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { QuotaAlertService } from '../services/quota-alert.service';

export const quotaInterceptor: HttpInterceptorFn = (req, next) => {
  const quota = inject(QuotaAlertService);
  return next(req).pipe(
    catchError(err => {
      if (err.status === 402) quota.setError();
      return throwError(() => err);
    })
  );
};
