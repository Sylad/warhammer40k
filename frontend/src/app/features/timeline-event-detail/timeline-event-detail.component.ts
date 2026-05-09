import { Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { TimelineEvent, TimelineEra } from '../../core/models/models';

const ERA_LABEL: Record<TimelineEra, string> = {
  'pre-imperium': 'Pré-Imperium',
  'horus-heresy': "Hérésie d'Horus",
  'time-of-rebirth': 'Temps de la Renaissance',
  'm32-m40': 'Long Crépuscule',
  'm41': '41ᵉ Millénaire',
  'm42': 'Cicatrix & Indomitus',
};

@Component({
  selector: 'app-timeline-event-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (event(); as e) {
      <a class="back-btn" routerLink="/lore/timeline">← RETOUR À LA CHRONOLOGIE</a>

      <section class="hero" [style.--hero-img]="heroImg()">
        <div class="hero-overlay"></div>
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="hero-era">{{ eraLabel(e.era) }}</span>
            <span class="hero-date">{{ e.date }}</span>
          </div>
          <h1>{{ e.title }}</h1>
          <p class="hero-short">{{ e.shortDescription }}</p>
        </div>
      </section>

      <section class="layout">
        <div class="main">
          <article class="panel">
            <h2>Récit Complet</h2>
            <p class="bible-text">{{ e.longDescription }}</p>
          </article>

          @if (e.tags?.length) {
            <article class="panel">
              <h2>Tags</h2>
              <div class="tags">
                @for (t of e.tags; track t) {
                  <span class="tag">{{ t }}</span>
                }
              </div>
            </article>
          }

          @if (e.sources?.length) {
            <article class="panel">
              <h2>Sources</h2>
              <ul class="sources-list">
                @for (src of e.sources; track src) {
                  <li><a [href]="src" target="_blank" rel="noopener">{{ shortenSource(src) }} →</a></li>
                }
              </ul>
            </article>
          }
        </div>

        <aside class="sidebar">
          <section class="sp">
            <h3>Données</h3>
            <div class="info-row"><strong>Ère</strong><span>{{ eraLabel(e.era) }}</span></div>
            <div class="info-row"><strong>Date</strong><span>{{ e.date }}</span></div>
          </section>

          <a class="cta" routerLink="/lore/timeline">RETOUR CHRONOLOGIE</a>
        </aside>
      </section>
    } @else {
      <div class="loading"><p>Chargement de l'événement...</p></div>
    }
  `,
  styleUrls: ['../ship-detail/ship-detail.component.scss'],
})
export class TimelineEventDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly heroImage = signal<string | null>(null);

  readonly event = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getTimelineEvent(p.get('id')!))),
  );

  constructor() {
    effect(() => {
      const e = this.event();
      if (!e) return;
      this.heroImage.set(null);
      if (e.image) {
        this.service.getWikiImage(e.image).subscribe(r => {
          if (r.imageUrl) this.heroImage.set(r.imageUrl);
        });
      }
    });
  }

  heroImg(): string {
    const url = this.heroImage();
    return url ? `url('${url}')` : 'none';
  }

  eraLabel(era: TimelineEra): string { return ERA_LABEL[era]; }

  shortenSource(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  scrollTo(e: Event, id: string): void {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
