import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { ChaosGod } from '../../core/models/models';

@Component({
  selector: 'app-lore-chaos-gods',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a class="back-link" routerLink="/lore">← Retour aux archives lore</a>

    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="badge">☠ Les Quatre Puissances Ruineuses</div>
        <h1>Le Panthéon Chaos</h1>
        <p class="lede">
          Quatre dieux nés du chaos émotionnel de l'humanité — la guerre, l'ambition, la maladie, le désir.
          Leurs domaines couvrent toute la condition mortelle. Leurs daemons habitent l'Immaterium.
          Leurs champions corrompent l'Imperium depuis dix mille ans.
        </p>
        <div class="quick-nav">
          @for (g of gods(); track g.id) {
            <a class="quick-link" [href]="'#' + g.id" [style.color]="g.color">
              <span class="quick-sigil">{{ g.sigil }}</span>
              <span class="quick-name">{{ g.name }}</span>
            </a>
          }
        </div>
      </div>
    </section>

    @for (god of gods(); track god.id) {
      <article class="god" [id]="god.id" [style.--god-color]="god.color">
        <header class="god-head">
          <div class="god-bg" [style.background-image]="godImg(god.id)"></div>
          <div class="god-bg-overlay"></div>
          <div class="god-head-content">
            <div class="number">{{ formatNum(god.number) }} / IV</div>
            <div class="god-sigil-wrap">
              <span class="god-sigil" [style.color]="god.color">{{ god.sigil }}</span>
            </div>
            <h2 [style.color]="god.color">{{ god.name }}</h2>
            <div class="god-title">{{ god.title }}</div>
            <div class="god-sphere">Sphère : {{ god.sphere }}</div>
            <p class="citation"><span class="quote">«</span> {{ god.citation }} <span class="quote">»</span></p>
          </div>
        </header>

        <div class="god-body">
          <div class="god-main">
            <p class="description">{{ god.description }}</p>
            <p class="loreLong">{{ god.loreLong }}</p>

            <h3 class="section-title">Manifestations daemoniques</h3>
            <div class="daemons-hierarchy">
              <div class="daemon-tier">
                <span class="tier-label">Lesser</span>
                <span class="tier-value">{{ god.daemons.lesser }}</span>
              </div>
              <div class="daemon-tier">
                <span class="tier-label">Élite</span>
                <span class="tier-value">{{ god.daemons.elite }}</span>
              </div>
              <div class="daemon-tier">
                <span class="tier-label">Greater</span>
                <span class="tier-value">{{ god.daemons.greater }}</span>
              </div>
            </div>

            @if (god.daemons.notable.length > 0) {
              <h3 class="section-title">Daemons notables</h3>
              <div class="notable-grid">
                @for (d of god.daemons.notable; track d.name) {
                  <div class="notable-card">
                    <div class="notable-name">{{ d.name }}</div>
                    <p>{{ d.description }}</p>
                  </div>
                }
              </div>
            }
          </div>

          <aside class="god-side">
            <div class="side-block">
              <div class="side-title">Portfolio</div>
              <ul>
                @for (p of god.portfolio; track p) {
                  <li>{{ p }}</li>
                }
              </ul>
            </div>

            @if (god.primarchsCorrupted.length > 0) {
              <div class="side-block">
                <div class="side-title">Primarques corrompus</div>
                @for (p of god.primarchsCorrupted; track p.name) {
                  <div class="primarch-link">
                    <div class="primarch-name">{{ p.name }}</div>
                    <div class="primarch-legion">{{ p.legion }}</div>
                    @if (p.primarchId) {
                      <a class="primarch-go" [routerLink]="['/lore/primarchs']" [fragment]="p.primarchId">
                        Voir fiche →
                      </a>
                    }
                  </div>
                }
              </div>
            }

            <div class="side-block">
              <div class="side-title">Légions notables</div>
              <ul class="legions">
                @for (l of god.legions; track l) {
                  <li>{{ l }}</li>
                }
              </ul>
            </div>
          </aside>
        </div>
      </article>
    }

    <section class="cta-bottom">
      <div class="ornament"><span class="line"></span><span class="aigle">✠</span><span class="line"></span></div>
      <p class="cta-text">
        Quatre dieux. Trois primarques nommés ici. Six millénaires de corruption.<br>
        L'Imperium tient encore — mais l'Œil de la Terreur ne se ferme jamais.
      </p>
      <div class="cta-actions">
        <a routerLink="/lore/primarchs" class="cta-link">Voir les vingt Primarques →</a>
        <a routerLink="/lore" class="cta-link secondary">Retour Lore Hub</a>
      </div>
    </section>
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
      min-height: 320px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #050403;
      box-shadow: var(--shadow);
      margin-bottom: 36px;
      display: flex;
      align-items: end;
      padding: 50px 50px 36px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 25% 20%, rgba(139, 26, 26, 0.32), transparent 45%),
        radial-gradient(circle at 75% 20%, rgba(58, 108, 196, 0.28), transparent 45%),
        radial-gradient(circle at 25% 90%, rgba(106, 139, 58, 0.28), transparent 45%),
        radial-gradient(circle at 75% 90%, rgba(156, 38, 128, 0.28), transparent 45%),
        linear-gradient(180deg, rgba(0,0,0,0.4), rgba(0,0,0,0.94));
    }
    .hero-content { position: relative; z-index: 1; max-width: 800px; }

    .badge {
      display: inline-block;
      padding: 5px 12px;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      font-weight: 800;
      margin-bottom: 14px;
      color: #ff8a8a;
      border: 1px solid rgba(170, 45, 45, 0.55);
      background: rgba(123, 17, 19, 0.4);
    }

    h1 {
      font-size: clamp(40px, 5vw, 60px);
      line-height: 1.04;
      margin: 0 0 14px;
      color: var(--gold-bright);
      text-shadow: 0 0 35px rgba(201, 162, 74, 0.25);
    }
    .lede { font-size: 15px; color: var(--text); line-height: 1.7; margin: 0 0 22px; max-width: 720px; }

    .quick-nav {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    .quick-link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border: 1px solid currentColor;
      background: rgba(0, 0, 0, 0.3);
      font-size: 12px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .quick-link:hover { background: rgba(0, 0, 0, 0.55); }
    .quick-sigil { font-size: 16px; }

    /* Per-god article */
    .god {
      margin-bottom: 50px;
      border: 1px solid var(--border);
      background: #060504;
      overflow: hidden;
    }

    .god-head {
      position: relative;
      min-height: 300px;
      display: flex;
      align-items: end;
      padding: 60px 50px 40px;
      overflow: hidden;
    }
    .god-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.32;
      filter: grayscale(0.2) contrast(1.05);
    }
    .god-bg-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, color-mix(in srgb, var(--god-color) 22%, transparent) 0%, rgba(0,0,0,0.85) 75%);
    }
    .god-head-content { position: relative; z-index: 1; max-width: 760px; }

    .number {
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.2em;
      color: var(--gold);
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .god-sigil-wrap { margin-bottom: 14px; }
    .god-sigil {
      font-size: 56px;
      line-height: 1;
      filter: drop-shadow(0 0 16px currentColor);
    }
    h2 {
      font-size: 48px;
      line-height: 1;
      margin: 0 0 8px;
      text-shadow: 0 0 30px currentColor;
      letter-spacing: 0.04em;
    }
    .god-title {
      font-family: var(--serif);
      font-size: 14px;
      letter-spacing: 0.04em;
      color: var(--gold);
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .god-sphere {
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 18px;
    }
    .citation {
      font-style: italic;
      color: var(--text);
      font-size: 15px;
      max-width: 600px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      margin: 0;
    }
    .citation .quote { color: var(--gold); font-family: var(--serif); font-size: 22px; margin: 0 4px; }

    .god-body {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 32px;
      padding: 36px 50px 50px;
    }
    @media (max-width: 1024px) {
      .god-body { grid-template-columns: 1fr; padding: 28px; }
    }

    .god-main p.description {
      color: var(--gold-bright);
      font-size: 15.5px;
      line-height: 1.65;
      margin: 0 0 16px;
      font-style: italic;
    }
    .god-main p.loreLong {
      color: var(--text);
      font-size: 14px;
      line-height: 1.75;
      margin: 0 0 24px;
    }

    .section-title {
      font-size: 14px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--god-color, var(--gold));
      margin: 24px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .daemons-hierarchy {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 14px 18px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.3);
      margin-bottom: 12px;
    }
    .daemon-tier { display: flex; gap: 14px; align-items: baseline; }
    .tier-label {
      flex: 0 0 80px;
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .tier-value {
      color: var(--text);
      font-size: 13px;
    }

    .notable-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .notable-card {
      padding: 14px 16px 16px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.3);
    }
    .notable-name {
      color: var(--god-color, var(--gold));
      font-family: var(--serif);
      font-size: 14px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .notable-card p {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.55;
      margin: 0;
    }

    .god-side {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .side-block {
      padding: 14px 18px 16px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.35);
    }
    .side-title {
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--god-color, var(--gold));
      font-weight: 800;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border);
    }
    .side-block ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .side-block li { font-size: 12px; color: var(--text); padding: 3px 0; line-height: 1.5; }
    .side-block li::before { content: '› '; color: var(--gold-soft); }

    .primarch-link { padding: 8px 0; border-bottom: 1px solid var(--border); }
    .primarch-link:last-child { border-bottom: none; }
    .primarch-name {
      font-family: var(--serif);
      color: var(--gold);
      font-size: 13px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .primarch-legion {
      font-size: 11px;
      color: var(--muted);
      margin-top: 2px;
    }
    .primarch-go {
      display: inline-block;
      margin-top: 6px;
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--god-color, var(--gold));
    }
    .primarch-go:hover { color: var(--gold-bright); }

    .cta-bottom {
      max-width: 720px;
      margin: 30px auto 8px;
      text-align: center;
      padding: 32px 24px;
      border: 1px solid var(--border);
      background: radial-gradient(circle at 50% 100%, rgba(123, 17, 19, 0.18), transparent 70%);
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
    .cta-actions { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
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
    .cta-link.secondary { color: var(--muted); border-color: var(--border); }
    .cta-link.secondary:hover { color: var(--text); border-color: var(--border-strong); }
  `],
})
export class LoreChaosGodsComponent {
  private readonly service = inject(WarhammerService);
  readonly gods = toSignal(this.service.chaosGods$, { initialValue: [] as ChaosGod[] });
  readonly godImages = signal<Map<string, string>>(new Map());

  constructor() {
    this.service.chaosGods$.subscribe(list => {
      list.forEach(g => {
        if (g.wikiQuery) {
          this.service.getWikiImage(g.wikiQuery).subscribe(r => {
            if (r.imageUrl) {
              const m = new Map(this.godImages());
              m.set(g.id, r.imageUrl);
              this.godImages.set(m);
            }
          });
        }
      });
    });
  }

  godImg(id: string): string | null {
    const url = this.godImages().get(id);
    return url ? `url('${url}')` : null;
  }

  formatNum(n: number): string {
    return ['I', 'II', 'III', 'IV'][n - 1] ?? String(n);
  }
}
