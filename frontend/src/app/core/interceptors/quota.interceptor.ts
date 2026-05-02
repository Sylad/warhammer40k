import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { QuotaAlertService } from '../services/quota-alert.service';

export const quotaInterceptor: HttpInterceptorFn = (req, next) => {
  const quota = inject(QuotaAlertService);
  return next(req).pipe(
    catchError(err => {
      const code = err?.error?.message;
      // Only set Claude-specific error banners (don't bind to PinGuard 401 etc.)
      if (code === 'CLAUDE_QUOTA_EXCEEDED' || err.status === 402) quota.setError('quota');
      else if (code === 'CLAUDE_AUTH_FAILED') quota.setError('auth');
      else if (code === 'CLAUDE_RATE_LIMITED') quota.setError('rate');
      return throwError(() => err);
    })
  );
};
