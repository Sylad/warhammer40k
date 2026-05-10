import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DemoStatusService } from './core/services/demo-status.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent {
  constructor() {
    // Au boot, on demande au backend si l'hôte courant est forcé en démo
    // (cf. Cloudflare quick tunnel). Le résultat alimente DemoBanner et
    // pourra servir à désactiver des CTAs côté UI plus tard.
    inject(DemoStatusService).load();
  }
}
