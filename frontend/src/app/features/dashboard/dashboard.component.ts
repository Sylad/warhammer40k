import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';

interface ShortcutCard {
  route: string;
  title: string;
  subtitle: string;
  ico: string;
  count: () => number;
  countLabel: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="eyebrow">Codex Numérique du 41<sup>e</sup> millénaire</div>
        <h1>Bienvenue, Initié</h1>
        <p>
          Plongez dans l'univers de Warhammer 40,000. Factions, romans, vidéos, galerie —
          un codex immersif pour explorer la galaxie en guerre éternelle.
        </p>
      </div>
    </section>

    <section class="shortcuts">
      @for (s of shortcuts; track s.route) {
        <a class="shortcut" [routerLink]="s.route">
          <div class="shortcut-ico">{{ s.ico }}</div>
          <h2>{{ s.title }}</h2>
          <p>{{ s.subtitle }}</p>
          <div class="shortcut-foot">
            <span class="num">{{ s.count() }}</span>
            <span class="lbl">{{ s.countLabel }}</span>
            <span class="arrow">→</span>
          </div>
        </a>
      }
    </section>

    <section class="stats-bar">
      <div class="stat">
        <strong>{{ factions().length }}</strong>
        <span>Factions</span>
      </div>
      <div class="stat">
        <strong>{{ series().length }}</strong>
        <span>Romans</span>
      </div>
      <div class="stat">
        <strong>{{ videos().length }}</strong>
        <span>Vidéos</span>
      </div>
      <div class="stat">
        <strong>{{ artworks().length }}</strong>
        <span>Œuvres</span>
      </div>
      <div class="quote">
        « Dans les ténèbres du lointain futur, il n'y a que la guerre. »
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .hero {
      position: relative;
      min-height: 320px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #080706;
      box-shadow: var(--shadow);
      margin-bottom: 28px;
      display: flex;
      align-items: end;
      padding: 60px 50px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 80% 50%, rgba(123, 17, 19, 0.4), transparent 50%),
        radial-gradient(circle at 20% 80%, rgba(201, 162, 74, 0.15), transparent 50%),
        linear-gradient(0deg, rgba(0,0,0,0.95), transparent 60%);
    }
    .hero-content { position: relative; z-index: 1; max-width: 800px; }
    .eyebrow {
      color: var(--gold);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .hero h1 {
      margin: 0 0 18px;
      font-family: var(--serif);
      color: var(--gold-bright);
      font-size: clamp(40px, 5vw, 76px);
      line-height: 0.9;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-shadow: 0 0 38px rgba(201, 162, 74, 0.3);
    }
    .hero p {
      margin: 0;
      color: #cfc3ad;
      font-size: 16px;
      line-height: 1.7;
    }

    .shortcuts {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 18px;
      margin-bottom: 28px;
    }
    .shortcut {
      position: relative;
      padding: 26px 24px;
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(19,15,11,0.92), rgba(5,4,3,0.96));
      box-shadow: 0 18px 50px rgba(0,0,0,0.5);
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
      cursor: pointer;
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .shortcut:hover {
      transform: translateY(-5px);
      border-color: var(--border-strong);
      box-shadow: 0 28px 80px rgba(0,0,0,0.7), 0 0 40px rgba(201, 162, 74, 0.08);
    }
    .shortcut-ico {
      font-size: 36px;
      color: var(--gold);
      margin-bottom: 14px;
      text-shadow: 0 0 20px rgba(201, 162, 74, 0.3);
    }
    .shortcut h2 {
      margin: 0 0 8px;
      font-family: var(--serif);
      color: var(--gold-bright);
      font-size: 20px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .shortcut p {
      margin: 0 0 18px;
      color: #c3baaa;
      font-size: 13px;
      line-height: 1.55;
    }
    .shortcut-foot {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding-top: 14px;
      border-top: 1px solid rgba(201, 162, 74, 0.18);
    }
    .shortcut-foot .num {
      color: var(--gold);
      font-family: var(--serif);
      font-size: 22px;
    }
    .shortcut-foot .lbl {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      flex: 1;
    }
    .shortcut-foot .arrow { color: var(--gold); font-size: 18px; }

    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, auto) 1fr;
      align-items: center;
      border: 1px solid var(--border);
      background: rgba(8,7,6,0.84);
      box-shadow: var(--shadow);
    }
    .stat {
      padding: 18px 28px;
      border-right: 1px solid rgba(201, 162, 74, 0.13);
      display: flex;
      align-items: baseline;
      gap: 12px;
    }
    .stat strong {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 28px;
      line-height: 1;
    }
    .stat span {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .quote {
      padding: 18px 30px;
      color: #b9b1a4;
      font-style: italic;
      line-height: 1.5;
      font-size: 13px;
      text-align: right;
    }
    @media (max-width: 760px) {
      .stats-bar { grid-template-columns: 1fr; }
      .quote { text-align: left; }
    }
  `],
})
export class DashboardComponent {
  private readonly service = inject(WarhammerService);

  readonly factions = toSignal(this.service.factions$, { initialValue: [] });
  readonly series = toSignal(this.service.series$, { initialValue: [] });
  readonly videos = toSignal(this.service.videos$, { initialValue: [] });
  readonly artworks = toSignal(this.service.artworks$, { initialValue: [] });

  readonly shortcuts: ShortcutCard[] = [
    {
      route: '/factions',
      title: 'Factions',
      subtitle: 'Les peuples du 41e millénaire — Imperium, Chaos, xénos.',
      ico: '⚔',
      count: () => this.factions().length,
      countLabel: 'factions majeures',
    },
    {
      route: '/romans',
      title: 'Romans',
      subtitle: 'La bibliothèque Black Library — Hérésie d\'Horus, Eisenhorn...',
      ico: '▤',
      count: () => this.series().length,
      countLabel: 'séries',
    },
    {
      route: '/videos',
      title: 'Vidéos',
      subtitle: 'Archives cinématiques — chaînes lore, animations cultes.',
      ico: '▶',
      count: () => this.videos().length,
      countLabel: 'vidéos',
    },
    {
      route: '/galerie',
      title: 'Galerie',
      subtitle: 'Galerie impériale — artworks, illustrations, visuels.',
      ico: '▦',
      count: () => this.artworks().length,
      countLabel: 'œuvres',
    },
  ];
}
