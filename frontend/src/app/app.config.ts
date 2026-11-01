import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling, withNavigationErrorHandler } from '@angular/router';
import { PageTitleStrategy } from './core/services/page-title.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { surEchecDeNavigation } from './core/utils/morceau-absent';
import { quotaInterceptor } from './core/interceptors/quota.interceptor';
import { pinInterceptor } from './core/interceptors/pin.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
      // L52 : un morceau d'une ancienne version répond 404 (confirmé par HEAD, navigateur en ligne) → recharger la page (une fois par minute).
      withNavigationErrorHandler(surEchecDeNavigation),
    ),
    // L36 : un titre de document par page (WCAG 2.4.2).
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([pinInterceptor, quotaInterceptor])),
  ],
};
