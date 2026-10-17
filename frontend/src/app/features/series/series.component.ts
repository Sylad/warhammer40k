import { Component, ElementRef, Injector, afterNextRender, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Serie, SerieBadge } from '../../core/models/models';
import { FigureLightboxComponent, LightboxState } from '../../shared/components/figure-lightbox/figure-lightbox.component';
import { LoadErrorComponent } from '../../shared/components/load-error/load-error.component';
import { toSafeSignal } from '../../shared/safe-signal';

const SERIES_WIKI: Record<string, string> = {
  'heresie-horus':    'Horus Heresy Warhammer 40k',
  'fantomes-gaunt':   "Gaunt's Ghosts Tanith First and Only",
  'eisenhorn':        'Eisenhorn Inquisitor Warhammer 40k',
  'ravenor':          'Ravenor Inquisitor Warhammer 40k',
  'bequin':           'Bequin Magos Inquisition Warhammer',
  'ciaphas-cain':     'Ciaphas Cain Commissar Warhammer',
  'night-lords':      'Night Lords Chaos Space Marines',
  'ahriman':          'Ahriman Thousand Sons Warhammer',
  'ultramarines':     'Ultramarines Space Marines Graham McNeill',
  'space-wolves':     'Space Wolves Fenris Warhammer',
  'mechanicum':       'Mechanicum Adeptus Mechanicus Warhammer',
};

const HERO_QUERY = 'Black Library gothic warhammer 40k';

const ALPHABET = ['#','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',      label: 'Toutes les séries' },
  { key: 'library',  label: 'Ma bibliothèque' },
  { key: 'order',    label: 'Ordre de lecture' },
  { key: 'tbr',      label: 'À lire' },
];

type TabKey = 'all' | 'library' | 'order' | 'tbr';
type SortKey = 'az' | 'count' | 'progression';

const BADGE_LABELS: Record<SerieBadge, string> = {
  'Fondamental':       'Essentiel pour comprendre le lore',
  'Inquisition':       'Intrigues, enquêtes et secrets',
  'Space Marines':     'Fils de l\'Empereur',
  'Garde Impériale':   'Soldats et batailles',
  'Adeptus Sororitas': 'Sœurs de Bataille',
  'Aventure':          'Aventures et explorations',
  'Papier':            'Disponible en édition papier',
  'Audible':           'Disponible en livre audio',
  'FR':                'Disponible en français',
  'EN':                'Disponible en anglais',
};

const PAGE_SIZE = 8;

@Component({
  selector: 'app-series',
  standalone: true,
  imports: [CommonModule, FormsModule, FigureLightboxComponent, LoadErrorComponent],
  template: `
    <section class="romans-page">

      <!-- HERO -->
      <header class="hero">
        <div class="hero-text">
          <span class="eyebrow">Bibliothèque du 41e millénaire</span>
          <h1>Romans Black Library</h1>
          <p class="hero-desc">
            Explorez les grandes sagas du 41e millénaire.<br/>
            Des héroïques Space Marines aux sombres intrigues
            de l'Imperium, chaque histoire façonne la légende.
          </p>
          <div class="search-bar">
            <span class="s-icon">⌕</span>
            <input
              type="text"
              aria-label="Rechercher un roman, une série ou un auteur"
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
              placeholder="Rechercher un roman, une série, un auteur…" />
          </div>
        </div>
        <div class="hero-image" [style.background-image]="heroBgUrl()">
          <div class="hero-overlay"></div>
          <div class="hero-grain"></div>
        </div>
      </header>

      @if (series.failed()) {
        <app-load-error (retry)="series.retry()" />
      }

      <!-- TABS -->
      <nav class="tabs" aria-label="Affichage des séries">
        @for (t of tabs; track t.key) {
          <button class="tab"
            [class.active]="activeTab() === t.key"
            [attr.aria-pressed]="activeTab() === t.key"
            (click)="activeTab.set(t.key)">
            {{ t.label }}
          </button>
        }
      </nav>

      <!-- TOOLBAR -->
      <div class="toolbar">
        <div class="t-block">
          <label class="t-label" for="tri-series">Trier par</label>
          <div class="select-wrap">
            <select id="tri-series" [ngModel]="sort()" (ngModelChange)="sort.set($event)"
                    [disabled]="activeTab() === 'order'">
              <option value="az">A — Z</option>
              <option value="count">Nombre de livres</option>
              <option value="progression">Progression</option>
            </select>
            <span class="caret">▾</span>
          </div>
          @if (activeTab() === 'order') {
            <span class="sort-note">L'ordre de lecture impose l'ordre des séries.</span>
          }
        </div>

        <div class="t-block letter-block">
          <span class="t-label" id="lettres-label">Filtrer par lettre</span>
          <div class="letters" role="group" aria-labelledby="lettres-label">
            @for (l of alphabet; track l) {
              <button class="letter"
                [class.active]="selectedLetter() === l"
                [attr.aria-pressed]="selectedLetter() === l"
                [disabled]="!letterEnabled(l)"
                (click)="toggleLetter(l)">{{ l }}</button>
            }
          </div>
        </div>

      </div>

      <!-- LAYOUT (main + sidebar) -->
      <div class="layout">

        <!-- MAIN -->
        <div class="main">
          <div class="grid" id="liste-series" tabindex="-1" role="region" aria-label="Liste des séries">
            @for (s of visibleSeries(); track s.id) {
              <article class="serie-card">
                <button class="card-image" type="button"
                     [style.background-image]="wikiImages().get(s.id) ? 'url(' + wikiImages().get(s.id) + ')' : ''"
                     (click)="openLightbox(s)" [attr.aria-label]="'Voir la couverture de ' + s.titre">
                  <div class="card-overlay"></div>
                  <span class="card-zoom">⛶</span>
                </button>
                <div class="card-body">
                  <h3 class="card-title">{{ s.titre }}</h3>
                  <div class="card-author">{{ formatAuthors(s.auteurs) }}</div>
                  <p class="card-desc">{{ s.description }}</p>
                  <div class="card-count">
                    <span class="count-ico">📖</span>
                    {{ s.nbLivres }} {{ s.nbLivres > 1 ? 'livres' : 'livre' }}
                  </div>
                  <div class="card-progress">
                    <span class="prog-text">{{ s.readBooks ?? 0 }} / {{ s.nbLivres }} lus</span>
                    <div class="prog-bar">
                      <div class="prog-fill"
                           [style.width.%]="progressPercent(s)"></div>
                    </div>
                  </div>
                  @if (s.badges?.length) {
                    <div class="card-badges">
                      @for (b of s.badges; track b) {
                        <span class="badge" [class]="badgeClass(b)">{{ b }}</span>
                      }
                    </div>
                  }
                </div>
              </article>
            }
            @empty {
              @if (!series.failed()) {
                <div class="empty" role="status">
                  <p>{{ emptyMessage() }}</p>
                  @if (hasFilters()) {
                    <button type="button" class="empty-reset" (click)="resetFilters()">Effacer les filtres</button>
                  }
                </div>
              }
            }
          </div>

          @if (filteredSeries().length > visibleCount()) {
            <div class="load-more-wrap">
              <p class="lm-count">{{ visibleSeries().length }} séries affichées sur {{ filteredSeries().length }}</p>
              <button class="load-more" (click)="loadMore()">
                Charger plus de séries
                <span class="lm-arrow">▾</span>
              </button>
            </div>
          }
        </div>

        <!-- SIDEBAR -->
        <aside class="sidebar">

          <div class="panel">
            <h4 class="panel-title">Votre progression</h4>
            <div class="progression-row">
              <div class="donut">
                <svg viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34"
                          fill="none" stroke="rgba(201,162,74,0.12)" stroke-width="8" />
                  <circle cx="40" cy="40" r="34"
                          fill="none" stroke="url(#donutGold)" stroke-width="8"
                          stroke-dasharray="213.6"
                          [attr.stroke-dashoffset]="213.6 - (213.6 * progressionPercent() / 100)"
                          stroke-linecap="round"
                          transform="rotate(-90 40 40)" />
                  <defs>
                    <linearGradient id="donutGold" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stop-color="#f0d276" />
                      <stop offset="100%" stop-color="#c9a24a" />
                    </linearGradient>
                  </defs>
                </svg>
                <div class="donut-label">
                  <div class="donut-pct">{{ progressionPercent() }}%</div>
                  <div class="donut-sub">terminé</div>
                </div>
              </div>
              <ul class="prog-list">
                <li><span class="dot d-read"></span><strong>{{ progressionStats().read }}</strong> Lus</li>
                <li><span class="dot d-cur"></span><strong>{{ progressionStats().inProgress }}</strong> En cours</li>
                <li><span class="dot d-tbr"></span><strong>{{ progressionStats().tbr }}</strong> À lire</li>
              </ul>
            </div>
            <div class="prog-total">Total : {{ progressionStats().total }} romans</div>
          </div>

          <div class="panel">
            <h4 class="panel-title">Actions rapides</h4>
            <ul class="link-list">
              <li>
                <button type="button" (click)="showReadingOrder()">
                  <span class="li-ico">≡</span>Voir l'ordre de lecture<span class="li-arrow">›</span>
                </button>
              </li>
              <li>
                <button type="button" (click)="showInProgress()">
                  <span class="li-ico">▶</span>Continuer ma lecture<span class="li-arrow">›</span>
                </button>
              </li>
            </ul>
          </div>

          <div class="panel">
            <h4 class="panel-title">Séries populaires</h4>
            <ol class="popular">
              @for (p of popular(); track p.id; let i = $index) {
                <li>
                  <span class="pop-rank">{{ i + 1 }}</span>
                  <span class="pop-name">{{ p.titre }}</span>
                  <span class="pop-count">{{ p.nbLivres }} livres</span>
                </li>
              }
            </ol>
          </div>

          <div class="panel">
            <h4 class="panel-title">Légende</h4>
            <ul class="legend">
              @for (b of legendBadges; track b) {
                <li>
                  <span class="badge" [class]="badgeClass(b)">{{ b }}</span>
                  <span class="legend-desc">{{ badgeLabels[b] }}</span>
                </li>
              }
            </ul>
          </div>

        </aside>
      </div>
    </section>

    <app-figure-lightbox [state]="lightbox()" (closed)="closeLightbox()" (thumbSelected)="selectThumb($event)" />
  `,
  styleUrls: ['./series.component.scss'],
})
export class SeriesComponent {
  private readonly service = inject(WarhammerService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly tabs = TABS;
  readonly alphabet = ALPHABET;
  readonly badgeLabels = BADGE_LABELS;
  readonly legendBadges: SerieBadge[] = [
    'Fondamental', 'Inquisition', 'Space Marines', 'Garde Impériale', 'Adeptus Sororitas', 'Aventure',
  ];

  readonly series = toSafeSignal(this.service.series$, [] as Serie[]);
  readonly wikiImages = signal(new Map<string, string>());
  readonly lightbox = signal<LightboxState | null>(null);
  readonly heroImageUrl = signal<string | null>(null);

  readonly activeTab = signal<TabKey>('all');
  readonly searchQuery = signal('');
  readonly selectedLetter = signal<string | null>(null);
  readonly sort = signal<SortKey>('az');
  readonly visibleCount = signal<number>(PAGE_SIZE);

  constructor() {
    effect(() => {
      const series = this.series();
      if (!series.length) return;
      series.forEach(s => {
        const query = SERIES_WIKI[s.id] ?? s.titreVO;
        this.service.getWikiImage(query).subscribe({
          next: (res) => {
            if (res.imageUrl) {
              this.wikiImages.update(m => new Map(m).set(s.id, res.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });

    this.service.getWikiImage(HERO_QUERY).subscribe({
      next: (res) => {
        if (res.imageUrl) this.heroImageUrl.set(res.imageUrl);
      },
      error: () => {},
    });
  }

  heroBgUrl() {
    const url = this.heroImageUrl();
    return url ? `url(${url})` : '';
  }

  /** Série filtrée par onglet et recherche, avant la lettre : sert aussi à savoir quelles lettres ont des séries. */
  private readonly beforeLetter = computed<Serie[]>(() => {
    let list = this.series().slice();
    const tab = this.activeTab();
    if (tab === 'library') {
      list = list.filter(s => (s.readBooks ?? 0) > 0);
    } else if (tab === 'tbr') {
      list = list.filter(s => (s.readBooks ?? 0) === 0);
    } else if (tab === 'order') {
      list = list.slice().sort((a, b) => a.epoque.localeCompare(b.epoque));
    }

    const query = this.searchQuery().trim().toLowerCase();
    if (query) {
      list = list.filter(s =>
        s.titre.toLowerCase().includes(query) ||
        s.titreVO.toLowerCase().includes(query) ||
        s.auteurs.some(a => a.toLowerCase().includes(query)) ||
        s.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    return list;
  });

  private readonly lettersWithSeries = computed(() => new Set(this.beforeLetter().map(s => firstLetter(s.titre))));

  readonly filteredSeries = computed<Serie[]>(() => {
    let list = this.beforeLetter();
    const letter = this.selectedLetter();
    if (letter) list = list.filter(s => firstLetter(s.titre) === letter);

    if (this.activeTab() !== 'order') {
      list = list.slice();
      const sortKey = this.sort();
      if (sortKey === 'az') {
        list.sort((a, b) => stripPrefix(a.titre).localeCompare(stripPrefix(b.titre)));
      } else if (sortKey === 'count') {
        list.sort((a, b) => b.nbLivres - a.nbLivres);
      } else if (sortKey === 'progression') {
        list.sort((a, b) => this.progressPercent(b) - this.progressPercent(a));
      }
    }

    return list;
  });

  /** Filtres actifs, nommés pour l'état vide : onglet de filtrage, recherche, lettre. */
  readonly activeFilters = computed<string[]>(() => {
    const out: string[] = [];
    const tab = this.activeTab();
    if (tab === 'library' || tab === 'tbr') out.push(`l'onglet « ${this.tabs.find(t => t.key === tab)!.label} »`);
    const query = this.searchQuery().trim();
    if (query) out.push(`la recherche « ${query} »`);
    const letter = this.selectedLetter();
    if (letter) out.push(`la lettre « ${letter} »`);
    return out;
  });

  readonly hasFilters = computed(() => this.activeFilters().length > 0);

  readonly emptyMessage = computed(() => {
    const filters = this.activeFilters();
    return filters.length
      ? `Aucune série ne correspond à ${filters.join(' + ')}.`
      : 'Aucune série à afficher.';
  });

  readonly visibleSeries = computed<Serie[]>(() =>
    this.filteredSeries().slice(0, this.visibleCount())
  );

  readonly progressionStats = computed(() => {
    const series = this.series();
    const total = series.reduce((acc, s) => acc + s.nbLivres, 0);
    const read = series.reduce((acc, s) => acc + (s.readBooks ?? 0), 0);
    const inProgress = series.filter(s => {
      const r = s.readBooks ?? 0;
      return r > 0 && r < s.nbLivres;
    }).length;
    const tbr = total - read;
    return { total, read, inProgress, tbr };
  });

  readonly progressionPercent = computed(() => {
    const { total, read } = this.progressionStats();
    if (!total) return 0;
    return Math.round((read / total) * 100);
  });

  readonly popular = computed(() =>
    this.series().slice().sort((a, b) => b.nbLivres - a.nbLivres).slice(0, 5)
  );

  /** Une lettre sans série (dans l'onglet et la recherche en cours) est inutilisable, sauf si elle est déjà active. */
  letterEnabled(l: string): boolean {
    return this.selectedLetter() === l || this.lettersWithSeries().has(l);
  }

  toggleLetter(l: string) {
    this.selectedLetter.set(this.selectedLetter() === l ? null : l);
    this.visibleCount.set(PAGE_SIZE);
  }

  resetFilters(): void {
    this.activeTab.set('all');
    this.searchQuery.set('');
    this.selectedLetter.set(null);
    this.visibleCount.set(PAGE_SIZE);
  }

  loadMore() {
    const shown = this.visibleCount();
    this.visibleCount.update(n => n + PAGE_SIZE);
    afterNextRender(() => {
      this.host.nativeElement.querySelectorAll<HTMLElement>('.serie-card')[shown]?.querySelector<HTMLElement>('.card-image')?.focus();
    }, { injector: this.injector });
  }

  showReadingOrder(): void {
    this.activeTab.set('order');
    this.selectedLetter.set(null);
    this.visibleCount.set(PAGE_SIZE);
    this.backToList();
  }

  showInProgress(): void {
    this.activeTab.set('library');
    this.sort.set('progression');
    this.selectedLetter.set(null);
    this.visibleCount.set(PAGE_SIZE);
    this.backToList();
  }

  /** Dès que la colonne latérale passe sous la liste (≤ 1100 px), l'action rapide ramène à la liste et y place le focus. */
  private backToList(): void {
    if (typeof window.matchMedia !== 'function' || !window.matchMedia('(max-width: 1100px)').matches) return;
    afterNextRender(() => {
      const list = this.host.nativeElement.querySelector<HTMLElement>('#liste-series');
      list?.scrollIntoView({ block: 'start' });
      list?.focus({ preventScroll: true });
    }, { injector: this.injector });
  }

  formatAuthors(authors: string[]): string {
    if (!authors?.length) return '';
    if (authors.length === 1) return authors[0];
    if (authors.length === 2) return authors.join(' & ');
    return authors[0] + ' et al.';
  }

  progressPercent(s: Serie): number {
    if (!s.nbLivres) return 0;
    return Math.round(((s.readBooks ?? 0) / s.nbLivres) * 100);
  }

  badgeClass(b: SerieBadge): string {
    switch (b) {
      case 'Fondamental':       return 'b-fond';
      case 'Inquisition':       return 'b-inq';
      case 'Space Marines':     return 'b-sm';
      case 'Garde Impériale':   return 'b-gi';
      case 'Adeptus Sororitas': return 'b-ss';
      case 'Aventure':          return 'b-adv';
      case 'Papier':            return 'b-papier';
      case 'Audible':           return 'b-audible';
      case 'FR':                return 'b-fr';
      case 'EN':                return 'b-en';
    }
  }

  openLightbox(s: Serie): void {
    const baseUrl = this.wikiImages().get(s.id);
    if (!baseUrl) return;
    this.lightbox.set({
      title: s.titre,
      subtitle: this.formatAuthors(s.auteurs ?? []) + ' · ' + (s.epoque ?? ''),
      description: s.description,
      contextName: 'Black Library',
      contextColor: '#c9a24a',
      contextSigil: '▤',
      searchQuery: s.titreVO || s.titre,
      mainUrl: baseUrl,
      thumbUrls: [baseUrl],
      selectedIdx: 0,
    });
    const baseQuery = s.titreVO || s.titre;
    const variants = [
      `${baseQuery} cover`,
      `${baseQuery} Black Library`,
      `${s.premierLivre || baseQuery} novel`,
      `${baseQuery} art warhammer 40k`,
    ];
    for (const q of variants) {
      this.service.getWikiImage(q).subscribe({
        next: r => {
          if (!r.imageUrl) return;
          const cur = this.lightbox();
          if (!cur || cur.title !== s.titre) return;
          if (cur.thumbUrls.includes(r.imageUrl)) return;
          this.lightbox.set({ ...cur, thumbUrls: [...cur.thumbUrls, r.imageUrl] });
        },
        error: () => {},
      });
    }
  }

  selectThumb(idx: number): void {
    const cur = this.lightbox();
    if (!cur) return;
    const url = cur.thumbUrls[idx];
    if (!url) return;
    this.lightbox.set({ ...cur, mainUrl: url, selectedIdx: idx });
  }

  closeLightbox(): void { this.lightbox.set(null); }
}

/** Lettre d'index d'un titre (article et accent écartés) ; « # » pour un titre qui ne commence pas par une lettre. */
function firstLetter(titre: string): string {
  const c = stripPrefix(titre).normalize('NFD').charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : '#';
}

function stripPrefix(t: string): string {
  return t
    .replace(/^l['']/i, '')
    .replace(/^la /i, '')
    .replace(/^le /i, '')
    .replace(/^les /i, '')
    .trim();
}
