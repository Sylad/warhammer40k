import { Component, computed, inject } from '@angular/core';
import { DemoStatusService } from '../../../core/services/demo-status.service';

/**
 * Bannière fine sticky-top affichée quand le backend signale que l'hôte
 * courant est forcé en démo (ex. `*.trycloudflare.com`).
 *
 * Palette stricte gothique 40K : or sur surface très sombre, accent rouge
 * pour l'icône de verrou. Pas de Material — pure custom Cinzel/Inter.
 * Le mode est verrouillé côté backend : aucun bouton "Quitter".
 */
@Component({
  selector: 'app-demo-banner',
  standalone: true,
  imports: [],
  template: `
    @if (visible()) {
      <div class="demo-banner" role="status" aria-live="polite">
        <span class="lock" aria-hidden="true">⛨</span>
        <span class="title">Mode démo verrouillée</span>
        <span class="sub">— codex public Warhammer 40K, écritures désactivées</span>
      </div>
    }
  `,
  styles: [`
    .demo-banner {
      position: sticky;
      top: 0;
      z-index: 110;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 7px 16px;
      background: rgba(8, 4, 4, 0.96);
      border-bottom: 1px solid rgba(123, 17, 19, 0.55);
      box-shadow: 0 0 24px rgba(123, 17, 19, 0.18);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      font-family: var(--sans, 'Inter', sans-serif);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold-bright, #f0d276);
    }

    .lock {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      color: var(--red, #7b1113);
      font-size: 0.95rem;
      line-height: 1;
      text-shadow: 0 0 10px rgba(123, 17, 19, 0.5);
    }

    .title {
      color: var(--gold-bright, #f0d276);
      text-shadow: 0 0 12px rgba(201, 162, 74, 0.25);
    }

    .sub {
      color: var(--muted, #8c7a4f);
      font-weight: 500;
      letter-spacing: 0.04em;
      text-transform: none;
    }

    @media (max-width: 680px) {
      .demo-banner { padding: 6px 10px; font-size: 0.62rem; gap: 6px; }
      .sub { display: none; }
    }
  `],
})
export class DemoBannerComponent {
  private readonly demoStatus = inject(DemoStatusService);

  /**
   * On n'affiche la bannière que si le host est *forcé* en démo (Cloudflare
   * tunnel, etc.). Le simple opt-in via `X-Demo-Mode` ne déclenche pas le
   * badge — c'est un mode de test local.
   */
  readonly visible = computed(() => this.demoStatus.status().forced);
}
