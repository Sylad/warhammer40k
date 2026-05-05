import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';

@Component({
  selector: 'app-lore-emperor',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    @if (emperor(); as e) {
      <section class="hero">
        <div class="hero-overlay" [style.background-image]="heroBg()"></div>
        <div class="hero-grad"></div>
        <div class="hero-content">
          <div class="badge gold">✠ Maître de l'Humanité</div>
          <h1>{{ e.title }}</h1>
          <div class="subtitle">{{ e.subtitle }}</div>
          <p class="lede">{{ e.description }}</p>
          <div class="citation"><span class="quote">«</span>{{ e.citation }}<span class="quote">»</span></div>
        </div>
      </section>

      <section class="stats">
        @for (s of e.stats; track s.domaine) {
          <div class="stat-row">
            <span class="stat-key">{{ s.domaine }}</span>
            <span class="stat-val">{{ s.valeur }}</span>
          </div>
        }
      </section>

      <section class="sections">
        @for (s of e.sections; track s.id; let i = $index) {
          <article class="section" [attr.data-i]="i">
            <header class="section-head">
              <span class="section-ico">{{ s.icon }}</span>
              <h2>{{ s.title }}</h2>
            </header>
            <div class="section-body">
              <p>{{ s.body }}</p>
              @if (sectionImg(i); as img) {
                <div class="section-img" [style.background-image]="'url(\\'' + img + '\\')'"></div>
              }
            </div>
          </article>
        }
      </section>

      <section class="cta-bottom">
        <div class="ornament"><span class="line"></span><span class="aigle">⚜</span><span class="line"></span></div>
        <p class="cta-text">
          La main qui Le maintient en vie est aussi la main qui Le tue.
          Le Trône d'Or se brise plus vite qu'on ne le répare.
          Combien de millénaires reste-t-il avant la fin ?
        </p>
        <div class="cta-actions">
          <a routerLink="/lore/primarchs" class="cta-link">Voir les vingt Primarques →</a>
        </div>
      </section>
    } @else {
      <div class="loading">Chargement des archives sacrées…</div>
    }
  `,
  styleUrls: ['./lore-emperor.component.scss'],
})
export class LoreEmperorComponent {
  private readonly service = inject(WarhammerService);

  readonly emperor = toSignal(this.service.emperor$);

  readonly heroBg = signal<string>('');
  readonly sectionImages = signal<Map<number, string>>(new Map());

  constructor() {
    // Hero image
    this.service.getWikiImage('Emperor of Mankind Warhammer Golden Throne').subscribe(r => {
      if (r.imageUrl) this.heroBg.set(`url('${r.imageUrl}')`);
    });

    // Per-section images
    this.service.emperor$.subscribe(e => {
      e.sections.forEach((s, idx) => {
        if (s.wikiQuery) {
          this.service.getWikiImage(s.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              const m = new Map(this.sectionImages());
              m.set(idx, r.imageUrl);
              this.sectionImages.set(m);
            }
          });
        }
      });
    });
  }

  sectionImg(idx: number): string | null {
    return this.sectionImages().get(idx) ?? null;
  }
}
