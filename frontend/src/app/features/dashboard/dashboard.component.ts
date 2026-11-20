import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WarhammerService } from '../../core/services/warhammer.service';
import { combineLatest, map, take, type Observable } from 'rxjs';
import type { LoreEvent } from '../../core/models/models';
import { wikiThumbWidth } from '../../shared/media-thumb';
import { accord } from '../../core/utils/pluriel';
import { nombreOeuvresGalerie } from '../../core/utils/galerie';

/** L84 : largeurs demandées à Fandom — le héros s'étale sur tout l'écran, les cartes font ~330 px (écrans 2x). */
const HERO_WIDTH = 1400;
const CARD_WIDTH = 700;

interface ShortcutCard {
  route: string;
  title: string;
  subtitle: string;
  ico: string;
  count: () => number | null;
  /** Nom du compteur, singulier puis pluriel (accordé par `accord`, L69). */
  countLabel: [one: string, many: string];
  wikiQuery: string;
  /** Image trop claire pour le texte : assombrie (L78). */
  dim?: boolean;
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
    <section class="hero hero-flicker">
      <div class="hero-bg" [style.background-image]="heroImg()"></div>
      <div class="hero-grad"></div>
      <div class="hero-glow"></div>
      <div class="dust-motes" aria-hidden="true"></div>
      <div class="hero-content">
        <div class="eyebrow">Codex Numérique du 41<sup>e</sup> millénaire</div>
        <h1>Bienvenue, Initié</h1>
        <p class="lede">
          Sa lumière guide tes pas dans les archives sacrées de l'Imperium.
          Factions, primarques, romans, daemons du Warp — un codex immersif pour
          explorer la galaxie en guerre éternelle.
        </p>
        <div class="hero-actions">
          <a routerLink="/factions" class="cta-primary"><span aria-hidden="true">⚔</span> Explorer les factions</a>
          <a routerLink="/lore/emperor" class="cta-secondary"><span aria-hidden="true">✠</span> Le Trône d'Or</a>
        </div>
        <div class="hero-citation">
          « Dans les ténèbres du lointain futur, il n'y a que la guerre. »
        </div>
      </div>
    </section>

    <section class="quick-lore">
      <a routerLink="/lore/emperor" class="ql-card">
        <span class="ql-sigil" aria-hidden="true">✠</span>
        <div>
          <div class="ql-title">L'Empereur</div>
          <div class="ql-meta">6 sections lore</div>
        </div>
      </a>
      <a routerLink="/lore/primarchs" class="ql-card">
        <span class="ql-sigil" aria-hidden="true">⚜</span>
        <div>
          <div class="ql-title">Les 20 Primarques</div>
          <div class="ql-meta">9 loyalistes · 9 traîtres · 2 perdus</div>
        </div>
      </a>
      <a routerLink="/lore/chaos-gods" class="ql-card">
        <span class="ql-sigil chaos" aria-hidden="true">☠</span>
        <div>
          <div class="ql-title">Le Panthéon Chaos</div>
          <div class="ql-meta">Khorne · Tzeentch · Nurgle · Slaanesh</div>
        </div>
      </a>
    </section>

    @if (failed()) {
      <div class="counts-error" role="alert">
        <p>Certains chiffres n’ont pas pu être chargés. Vérifiez la connexion, puis réessayez.</p>
        <button type="button" class="counts-retry" (click)="loadCounts()">Réessayer</button>
      </div>
    }

    <section class="shortcuts">
      @for (s of shortcuts; track s.route) {
        <a class="shortcut" [routerLink]="s.route">
          <div class="shortcut-img" [class.dim]="s.dim" [style.background-image]="shortcutImg(s.route)"></div>
          <div class="shortcut-overlay"></div>
          <div class="shortcut-content">
            <div class="shortcut-ico" aria-hidden="true">{{ s.ico }}</div>
            <h2>{{ s.title }}</h2>
            <p [innerHTML]="s.subtitle"></p>
            <div class="shortcut-foot">
              <span class="num">{{ shown(s.count()) }}</span>
              <span class="lbl">{{ countLabel(s) }}</span>
              <span class="arrow" aria-hidden="true">→</span>
            </div>
            @if (s.route === '/factions') {
              <p class="shortcut-sub">{{ shown(subFactions()) }} sous-factions</p>
            }
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
              <div class="lf-icon" aria-hidden="true">{{ e.icon }}</div>
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
        <strong>{{ shown(factions()) }}</strong>
        <span>Factions</span>
      </div>
      <div class="stat">
        <strong>{{ shown(subFactions()) }}</strong>
        <span>Sous-factions</span>
      </div>
      <div class="stat">
        <strong>{{ shown(series()) }}</strong>
        <span>Romans</span>
      </div>
      <div class="stat">
        <strong>{{ shown(videos()) }}</strong>
        <span>Vidéos</span>
      </div>
      <div class="stat">
        <strong>{{ shown(artworks()) }}</strong>
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

  // null = pas encore reçu (chargement ou erreur) : affiché « — », jamais un faux « 0 » (L79).
  readonly factions = signal<number | null>(null);
  readonly series = signal<number | null>(null);
  readonly videos = signal<number | null>(null);
  readonly artworks = signal<number | null>(null);
  readonly subFactions = signal<number | null>(null);
  readonly failed = signal(false);

  readonly events = signal<LoreEvent[]>([]);
  readonly heroImg = signal<string>('');
  readonly shortcutImages = signal<Map<string, string>>(new Map());

  readonly shortcuts: ShortcutCard[] = [
    {
      route: '/factions',
      title: 'Factions',
      subtitle: 'Les peuples du 41<sup>e</sup> millénaire — Imperium, Chaos, xénos.',
      ico: '⚔',
      count: () => this.factions(),
      countLabel: ['faction majeure', 'factions majeures'],
      wikiQuery: 'Space Marines battle Adeptus Astartes',
    },
    {
      route: '/romans',
      title: 'Romans',
      subtitle: 'La bibliothèque Black Library — Hérésie d\'Horus, Eisenhorn…',
      ico: '▤',
      count: () => this.series(),
      countLabel: ['série', 'séries'],
      wikiQuery: 'Horus Rising',
      dim: true,
    },
    {
      route: '/videos',
      title: 'Vidéos',
      subtitle: 'Archives cinématiques — chaînes lore, animations cultes.',
      ico: '▶',
      count: () => this.videos(),
      countLabel: ['vidéo', 'vidéos'],
      wikiQuery: 'Warhammer 40,000: Space Marine 2',
    },
    {
      route: '/gallery',
      title: 'Galerie',
      subtitle: 'Galerie impériale — artworks, illustrations, visuels.',
      ico: '▦',
      count: () => this.artworks(),
      countLabel: ['œuvre', 'œuvres'],
      wikiQuery: 'Warhammer 40k art fresco imperial',
    },
  ];

  constructor() {
    // Hero image — Empereur sur Trône d'Or
    this.service.getWikiImage('Emperor of Mankind Golden Throne').subscribe(r => {
      if (r.imageUrl) this.heroImg.set(`url('${wikiThumbWidth(r.imageUrl, HERO_WIDTH)}')`);
    });

    // Shortcut images
    this.shortcuts.forEach(s => {
      this.service.getWikiImage(s.wikiQuery).subscribe(r => {
        if (r.imageUrl) {
          const m = new Map(this.shortcutImages());
          m.set(s.route, wikiThumbWidth(r.imageUrl, CARD_WIDTH));
          this.shortcutImages.set(m);
        }
      });
    });

    // Lore feed (3 events random)
    this.service.loreFeed(3).subscribe(events => this.events.set(events));

    this.loadCounts();
  }

  /** Charge les cinq compteurs ; un échec laisse « — » et affiche le message avec « Réessayer ». */
  loadCounts(): void {
    this.failed.set(false);
    const count = (source: Observable<unknown[]>) => source.pipe(take(1), map((list) => list.length));
    // L73 : « Œuvres » = ce que montre la galerie (catalogue + images perso), même calcul qu'elle.
    const oeuvres = combineLatest([this.service.artworks$.pipe(take(1)), this.service.images$.pipe(take(1))])
      .pipe(map(([catalogue, images]) => nombreOeuvresGalerie(catalogue, images)));
    const sources: Array<[Observable<number>, typeof this.factions]> = [
      [count(this.service.factions$), this.factions],
      [count(this.service.series$), this.series],
      [count(this.service.videos$), this.videos],
      [oeuvres, this.artworks],
      [count(this.service.getSubFactions()), this.subFactions],
    ];
    for (const [source, target] of sources) {
      target.set(null);
      source.subscribe({
        next: (n) => target.set(n),
        error: () => this.failed.set(true),
      });
    }
  }

  /** Nom accordé au compteur ; pluriel tant que le nombre n'est pas connu (« — œuvres »). */
  countLabel(s: ShortcutCard): string {
    const [one, many] = s.countLabel;
    const n = s.count();
    return n === null ? many : accord(n, one, many);
  }

  shown(n: number | null): string {
    return n === null ? '—' : String(n);
  }

  shortcutImg(route: string): string | null {
    const url = this.shortcutImages().get(route);
    return url ? `url('${url}')` : null;
  }

  typeLabel(type: string): string {
    return TYPE_LABEL[type] ?? type;
  }
}
