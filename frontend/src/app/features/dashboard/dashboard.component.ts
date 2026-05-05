import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { LoreEvent } from '../../core/models/models';

interface ShortcutCard {
  route: string;
  title: string;
  subtitle: string;
  ico: string;
  count: () => number;
  countLabel: string;
  wikiQuery: string;
}

const TYPE_LABEL: Record<string, string> = {
  menace: 'Menace',
  evenement: 'Événement',
  decouverte: 'Découverte',
  guerre: 'Guerre',
  prophetie: 'Prophétie',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="hero">
      <div class="hero-bg" [style.background-image]="heroImg()"></div>
      <div class="hero-grad"></div>
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="eyebrow">Codex Numérique du 41<sup>e</sup> millénaire</div>
        <h1>Bienvenue, Initié</h1>
        <p class="lede">
          Sa lumière guide tes pas dans les archives sacrées de l'Imperium.
          Factions, primarques, romans, daemons du Warp — un codex immersif pour
          explorer la galaxie en guerre éternelle.
        </p>
        <div class="hero-actions">
          <a routerLink="/factions" class="cta-primary">⚔ Explorer les factions</a>
          <a routerLink="/lore/emperor" class="cta-secondary">✠ Le Trône d'Or</a>
        </div>
        <div class="hero-citation">
          « Dans les ténèbres du lointain futur, il n'y a que la guerre. »
        </div>
      </div>
    </section>

    <section class="quick-lore">
      <a routerLink="/lore/emperor" class="ql-card">
        <span class="ql-sigil">✠</span>
        <div>
          <div class="ql-title">L'Empereur</div>
          <div class="ql-meta">6 sections lore</div>
        </div>
      </a>
      <a routerLink="/lore/primarchs" class="ql-card">
        <span class="ql-sigil">⚜</span>
        <div>
          <div class="ql-title">Les 20 Primarques</div>
          <div class="ql-meta">9 loyalistes · 9 traîtres · 2 perdus</div>
        </div>
      </a>
      <a routerLink="/lore/chaos-gods" class="ql-card">
        <span class="ql-sigil chaos">☠</span>
        <div>
          <div class="ql-title">Le Panthéon Chaos</div>
          <div class="ql-meta">Khorne · Tzeentch · Nurgle · Slaanesh</div>
        </div>
      </a>
    </section>

    <section class="shortcuts">
      @for (s of shortcuts; track s.route) {
        <a class="shortcut" [routerLink]="s.route">
          <div class="shortcut-img" [style.background-image]="shortcutImg(s.route)"></div>
          <div class="shortcut-overlay"></div>
          <div class="shortcut-content">
            <div class="shortcut-ico">{{ s.ico }}</div>
            <h2>{{ s.title }}</h2>
            <p>{{ s.subtitle }}</p>
            <div class="shortcut-foot">
              <span class="num">{{ s.count() }}</span>
              <span class="lbl">{{ s.countLabel }}</span>
              <span class="arrow">→</span>
            </div>
          </div>
        </a>
      }
    </section>

    @if (events().length > 0) {
      <section class="lore-feed">
        <header class="lf-head">
          <h2>Brèves du 41<sup>e</sup> millénaire</h2>
          <span class="lf-sub">Signaux astropathiques captés à la veille de la Cicatrice</span>
        </header>
        <div class="lf-grid">
          @for (e of events(); track e.id) {
            <article class="lf-card" [attr.data-type]="e.type">
              <div class="lf-icon">{{ e.icon }}</div>
              <div class="lf-body">
                <div class="lf-type">{{ typeLabel(e.type) }}</div>
                <h3>{{ e.title }}</h3>
                <p>{{ e.body }}</p>
              </div>
            </article>
          }
        </div>
      </section>
    }

    <section class="stats-bar">
      <div class="stat">
        <strong>{{ factions().length }}</strong>
        <span>Factions</span>
      </div>
      <div class="stat">
        <strong>{{ subFactionsCount() }}</strong>
        <span>Sous-factions</span>
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
        « Le Trône veille. Et nous chantons Sa garde éternelle. »
      </div>
    </section>
  `,
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  private readonly service = inject(WarhammerService);

  readonly factions = toSignal(this.service.factions$, { initialValue: [] });
  readonly series = toSignal(this.service.series$, { initialValue: [] });
  readonly videos = toSignal(this.service.videos$, { initialValue: [] });
  readonly artworks = toSignal(this.service.artworks$, { initialValue: [] });

  readonly events = signal<LoreEvent[]>([]);
  readonly heroImg = signal<string>('');
  readonly shortcutImages = signal<Map<string, string>>(new Map());
  readonly subFactionsCount = signal<number>(0);

  readonly shortcuts: ShortcutCard[] = [
    {
      route: '/factions',
      title: 'Factions',
      subtitle: 'Les peuples du 41ᵉ millénaire — Imperium, Chaos, xénos.',
      ico: '⚔',
      count: () => this.factions().length,
      countLabel: 'factions majeures',
      wikiQuery: 'Space Marines battle Adeptus Astartes',
    },
    {
      route: '/romans',
      title: 'Romans',
      subtitle: 'La bibliothèque Black Library — Hérésie d\'Horus, Eisenhorn…',
      ico: '▤',
      count: () => this.series().length,
      countLabel: 'séries',
      wikiQuery: 'Black Library Warhammer 40000 books',
    },
    {
      route: '/videos',
      title: 'Vidéos',
      subtitle: 'Archives cinématiques — chaînes lore, animations cultes.',
      ico: '▶',
      count: () => this.videos().length,
      countLabel: 'vidéos',
      wikiQuery: 'Astartes animated film',
    },
    {
      route: '/gallery',
      title: 'Galerie',
      subtitle: 'Galerie impériale — artworks, illustrations, visuels.',
      ico: '▦',
      count: () => this.artworks().length,
      countLabel: 'œuvres',
      wikiQuery: 'Warhammer 40k art fresco imperial',
    },
  ];

  constructor() {
    // Hero image — Empereur sur Trône d'Or
    this.service.getWikiImage('Emperor of Mankind Golden Throne').subscribe(r => {
      if (r.imageUrl) this.heroImg.set(`url('${r.imageUrl}')`);
    });

    // Shortcut images
    this.shortcuts.forEach(s => {
      this.service.getWikiImage(s.wikiQuery).subscribe(r => {
        if (r.imageUrl) {
          const m = new Map(this.shortcutImages());
          m.set(s.route, r.imageUrl);
          this.shortcutImages.set(m);
        }
      });
    });

    // Lore feed (3 events random)
    this.service.loreFeed(3).subscribe(events => this.events.set(events));

    // SubFactions count
    this.service.getSubFactions().subscribe(list => this.subFactionsCount.set(list.length));
  }

  shortcutImg(route: string): string | null {
    const url = this.shortcutImages().get(route);
    return url ? `url('${url}')` : null;
  }

  typeLabel(type: string): string {
    return TYPE_LABEL[type] ?? type;
  }
}
