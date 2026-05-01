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
  styles: [`
    :host { display: block; }

    .back-link {
      display: inline-block;
      margin-bottom: 18px;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold);
      border-bottom: 1px solid transparent;
      padding-bottom: 2px;
    }
    .back-link:hover { border-bottom-color: var(--gold-soft); color: var(--gold-bright); }

    .hero {
      position: relative;
      min-height: 420px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #050403;
      box-shadow: var(--shadow);
      margin-bottom: 32px;
      display: flex;
      align-items: end;
      padding: 60px 60px 50px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.42;
      filter: grayscale(0.3) contrast(1.1);
    }
    .hero-grad {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 80% 30%, rgba(201, 162, 74, 0.22), transparent 55%),
        radial-gradient(circle at 20% 90%, rgba(123, 17, 19, 0.45), transparent 55%),
        linear-gradient(180deg, rgba(0,0,0,0.35), rgba(0,0,0,0.94) 75%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 760px; }

    .badge {
      display: inline-block;
      padding: 5px 12px;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      margin-bottom: 14px;
    }
    .badge.gold { color: var(--gold-bright); border: 1px solid rgba(201, 162, 74, 0.5); background: rgba(201, 162, 74, 0.1); }

    .hero h1 {
      font-size: clamp(42px, 5vw, 64px);
      line-height: 1.04;
      margin: 0 0 8px;
      color: var(--gold-bright);
      text-shadow: 0 0 35px rgba(201, 162, 74, 0.32);
    }
    .subtitle {
      color: var(--gold);
      font-family: var(--serif);
      letter-spacing: 0.05em;
      font-size: 14px;
      text-transform: uppercase;
      margin-bottom: 18px;
    }
    .lede {
      font-size: 16px;
      color: var(--text);
      line-height: 1.7;
      margin: 0 0 18px;
    }
    .citation {
      font-style: italic;
      color: var(--gold-bright);
      font-size: 15px;
      padding: 10px 0 0;
      border-top: 1px solid var(--border);
      max-width: 600px;
    }
    .citation .quote { color: var(--gold); font-size: 22px; font-family: var(--serif); margin: 0 4px; }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0;
      border: 1px solid var(--border);
      background: rgba(11, 9, 7, 0.6);
      margin-bottom: 36px;
    }
    .stat-row {
      padding: 14px 18px;
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
    }
    .stat-row:last-child { border-right: none; }
    @media (max-width: 800px) { .stat-row { border-right: none; } }
    .stat-key {
      display: block;
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 4px;
    }
    .stat-val {
      color: var(--gold);
      font-family: var(--serif);
      font-size: 15px;
      letter-spacing: 0.04em;
    }

    .sections { display: flex; flex-direction: column; gap: 32px; margin-bottom: 50px; }
    .section {
      border: 1px solid var(--border);
      background: rgba(8, 6, 4, 0.55);
      padding: 32px 38px;
    }
    .section-head {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .section-ico {
      font-size: 28px;
      color: var(--gold);
      filter: drop-shadow(0 0 10px rgba(201, 162, 74, 0.45));
      width: 40px;
      text-align: center;
    }
    .section-head h2 {
      margin: 0;
      font-size: 24px;
      color: var(--gold);
    }
    .section-body {
      display: grid;
      grid-template-columns: 1fr;
      gap: 22px;
    }
    .section[data-i="0"] .section-body,
    .section[data-i="2"] .section-body,
    .section[data-i="4"] .section-body {
      grid-template-columns: 1fr 200px;
    }
    .section[data-i="1"] .section-body,
    .section[data-i="3"] .section-body,
    .section[data-i="5"] .section-body {
      grid-template-columns: 200px 1fr;
    }
    .section[data-i="1"] .section-img,
    .section[data-i="3"] .section-img,
    .section[data-i="5"] .section-img { order: -1; }

    @media (max-width: 800px) {
      .section[data-i] .section-body { grid-template-columns: 1fr !important; }
      .section[data-i] .section-img { order: 0 !important; }
    }

    .section-body p {
      color: var(--text);
      line-height: 1.75;
      font-size: 14.5px;
      margin: 0;
    }
    .section-img {
      width: 200px;
      height: 240px;
      background-size: cover;
      background-position: center;
      border: 1px solid var(--border-strong);
      filter: grayscale(0.15) contrast(1.05);
    }
    @media (max-width: 800px) { .section-img { width: 100%; height: 200px; } }

    .cta-bottom {
      max-width: 720px;
      margin: 30px auto 8px;
      text-align: center;
      padding: 32px 24px;
      border: 1px solid var(--border);
      background: radial-gradient(circle at 50% 100%, rgba(201, 162, 74, 0.1), transparent 70%);
    }
    .ornament {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .ornament .line {
      flex: 0 0 80px;
      height: 1px;
      background: linear-gradient(to right, transparent, var(--gold-soft), transparent);
    }
    .ornament .aigle { color: var(--gold); font-size: 18px; }
    .cta-text {
      color: var(--gold);
      font-family: var(--serif);
      font-style: italic;
      letter-spacing: 0.04em;
      font-size: 16px;
      line-height: 1.7;
      margin: 0 0 20px;
    }
    .cta-link {
      display: inline-block;
      color: var(--gold-bright);
      font-size: 12px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      padding: 10px 20px;
      border: 1px solid var(--gold-soft);
    }
    .cta-link:hover { border-color: var(--gold-bright); background: rgba(201, 162, 74, 0.08); }

    .loading {
      text-align: center;
      padding: 60px 20px;
      color: var(--muted);
      font-style: italic;
    }
  `],
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
