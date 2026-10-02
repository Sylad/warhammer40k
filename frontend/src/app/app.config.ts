import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withInMemoryScrolling } from '@angular/router';
import { PageTitleStrategy } from './core/services/page-title.service';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
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
    ),
    // L36 : un titre de document par page (WCAG 2.4.2).
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([pinInterceptor, quotaInterceptor])),
  ],
};
