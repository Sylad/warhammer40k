import { Component, inject, signal, computed, effect, HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WarhammerService, VideoPreview, VideoImportBody } from '../../core/services/warhammer.service';
import type { Video, Channel } from '../../core/models/models';

type FilterKey = 'all' | 'lore' | 'animation' | 'official' | 'FR' | 'EN';
type SortKey = 'recommended' | 'duration' | 'channel' | 'recent';
type SidebarFilter = 'short' | 'long' | 'fr' | 'animation';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'lore', label: 'Lore' },
  { key: 'animation', label: 'Animations' },
  { key: 'official', label: 'Officiel' },
  { key: 'FR', label: 'FR' },
  { key: 'EN', label: 'EN' },
];

const SIDEBAR_OPTIONS: { key: SidebarFilter; label: string }[] = [
  { key: 'short', label: 'Durée courte' },
  { key: 'long', label: 'Long format' },
  { key: 'fr', label: 'FR uniquement' },
  { key: 'animation', label: 'Animations' },
];

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="videos-page">

      <!-- HERO -->
      <header class="hero">
        <div class="hero-bg" [style.background-image]="heroBgUrl()"></div>
        <div class="hero-content">
          <div class="hero-text">
            <span class="eyebrow">Archives vidéo du 41e millénaire</span>
            <h1>Archives Cinématiques</h1>
            <p class="hero-desc">
              Retrouve les chaînes lore FR, les animations iconiques, les cinématiques
              officielles et les vidéos cultes liées à Warhammer 40,000.
            </p>
          </div>
          <aside class="hero-panel">
            <h3>Chaînes prioritaires</h3>
            @for (ch of priorityChannels(); track ch.id) {
              <button class="channel-mini" type="button" (click)="openExternal(ch.url)">
                <span class="avatar">{{ ch.avatar }}</span>
                <span class="ch-info">
                  <strong>{{ ch.name }}</strong>
                  <span>{{ ch.description }}</span>
                </span>
                <span class="lang">{{ ch.language }}</span>
              </button>
            }
          </aside>
        </div>
      </header>

      <!-- TOOLBAR -->
      <section class="toolbar">
        <input
          class="search"
          type="text"
          [ngModel]="searchQuery()"
          (ngModelChange)="searchQuery.set($event)"
          placeholder="Rechercher une vidéo, une chaîne, un sujet..." />
        <div class="filters">
          @for (f of filters; track f.key) {
            <button class="filter" type="button"
              [class.active]="activeFilter() === f.key"
              (click)="activeFilter.set(f.key)">{{ f.label }}</button>
          }
        </div>
        <select class="select"
          [ngModel]="sortOrder()"
          (ngModelChange)="sortOrder.set($event)">
          <option value="recommended">Tri : recommandées</option>
          <option value="duration">Durée</option>
          <option value="channel">Chaîne</option>
          <option value="recent">Récentes</option>
        </select>
        <button class="add-btn" type="button" (click)="openAddVideo()">+ Ajouter une vidéo</button>
      </section>

      <!-- ADD VIDEO MODAL -->
      @if (addVideoOpen()) {
        <div class="add-modal" (click)="closeAddVideo()">
          <div class="add-stage" (click)="$event.stopPropagation()">
            <button class="add-close" type="button" (click)="closeAddVideo()" aria-label="Fermer">✕</button>
            <h2>Ajouter une vidéo YouTube</h2>
            <p class="add-lede">Colle l'URL d'une vidéo YouTube. La chaîne sera détectée et ajoutée si nouvelle.</p>

            <div class="add-form">
              <label class="add-label">URL YouTube</label>
              <div class="add-row">
                <input class="add-input" type="text" [ngModel]="addUrl()" (ngModelChange)="addUrl.set($event)"
                       placeholder="https://youtu.be/... ou https://www.youtube.com/watch?v=..." />
                <button class="add-action" type="button" [disabled]="!addUrl() || addLoading()" (click)="previewVideo()">
                  {{ addLoading() ? '…' : 'Aperçu' }}
                </button>
              </div>
              @if (addError()) { <div class="add-error">⚠ {{ addError() }}</div> }
            </div>

            @if (preview(); as p) {
              <div class="add-preview">
                <div class="preview-thumb" [style.background-image]="'url(\\'' + p.thumbnailUrl + '\\')'"></div>
                <div class="preview-info">
                  <div class="preview-title">{{ p.title }}</div>
                  <div class="preview-author">par <strong>{{ p.authorName }}</strong></div>

                  @if (p.matchedChannel) {
                    <div class="preview-chan match">
                      <span class="chan-tag">✓ Chaîne déjà présente</span>
                      <span>{{ p.matchedChannel.name }} ({{ p.matchedChannel.language }})</span>
                    </div>
                  } @else {
                    <div class="preview-chan new">
                      <span class="chan-tag">+ Nouvelle chaîne</span>
                      <span>« {{ p.authorName }} » sera créée avec id <code>{{ p.suggestedChannelId }}</code></span>
                      <div class="chan-lang">
                        <label><input type="radio" name="lang" value="FR" [checked]="newChannelLang() === 'FR'" (change)="newChannelLang.set('FR')" /> FR</label>
                        <label><input type="radio" name="lang" value="EN" [checked]="newChannelLang() === 'EN'" (change)="newChannelLang.set('EN')" /> EN</label>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="add-extras">
                <label class="add-label">Description (optionnel)</label>
                <textarea class="add-textarea" rows="3" [ngModel]="addDesc()" (ngModelChange)="addDesc.set($event)"
                          placeholder="Décris brièvement la vidéo (lore traité, ton, format)"></textarea>

                <div class="add-grid">
                  <div>
                    <label class="add-label">Catégorie</label>
                    <select [ngModel]="addCategory()" (ngModelChange)="addCategory.set($event)">
                      <option value="lore">Lore</option>
                      <option value="animation">Animation</option>
                      <option value="official">Officiel</option>
                      <option value="other">Autre</option>
                    </select>
                  </div>
                  <div>
                    <label class="add-label">Type</label>
                    <select [ngModel]="addType()" (ngModelChange)="addType.set($event)">
                      <option value="Chaîne lore">Chaîne lore</option>
                      <option value="Animation fan">Animation fan</option>
                      <option value="Parodie">Parodie</option>
                      <option value="Série officielle">Série officielle</option>
                      <option value="Chaîne officielle">Chaîne officielle</option>
                    </select>
                  </div>
                  <div>
                    <label class="add-label">
                      <input type="checkbox" [checked]="addFeatured()" (change)="addFeatured.set($any($event.target).checked)" />
                      Incontournable
                    </label>
                  </div>
                </div>
              </div>

              <div class="add-cta-row">
                <button class="add-cta" type="button" [disabled]="addSaving()" (click)="confirmAdd()">
                  {{ addSaving() ? 'Enregistrement…' : 'Ajouter au codex' }}
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- LAYOUT MAIN + SIDEBAR -->
      <section class="layout">
        <div class="main-col">

          <!-- INCONTOURNABLES -->
          @if (featuredVideos().length > 0) {
            <section class="section">
              <header class="section-head">
                <div>
                  <h2>Incontournables</h2>
                  <p>Les vidéos à mettre en avant : animations cultes, lore essentiel, contenus parfaits pour découvrir l'univers.</p>
                </div>
              </header>
              <div class="featured-grid">
                @for (v of displayedFeatured(); track v.id; let i = $index) {
                  <article class="video-card"
                    [class.large]="i === 0"
                    [style.--thumb]="thumbStyle(v)"
                    (click)="openModal(v)">
                    <span class="duration">{{ v.duration }}</span>
                    <span class="play">▶</span>
                    <div class="video-content">
                      <div class="tags">
                        <span class="tag official">Culte</span>
                        @if (v.language === 'FR') { <span class="tag fr">FR</span> }
                        @if (v.language === 'EN') { <span class="tag">EN</span> }
                        @if (v.language === 'FR/EN') { <span class="tag fr">FR/EN</span> }
                        @if (v.language === 'Sans dialogue') { <span class="tag">Mute</span> }
                        <span class="tag">{{ categoryLabel(v.category) }}</span>
                      </div>
                      <h3 class="video-title">{{ v.titre }}</h3>
                      <div class="video-meta">{{ v.createur }} · {{ shortDesc(v.description) }}</div>
                    </div>
                  </article>
                }
              </div>
              @if (featuredVideos().length > displayedFeatured().length) {
                <div class="load-more-row">
                  <button class="load-more" type="button" (click)="loadMoreFeatured()">
                    Charger plus d'incontournables ({{ featuredVideos().length - displayedFeatured().length }} restantes) ▾
                  </button>
                </div>
              }
            </section>
          }

          <!-- CHAINES RECOMMANDEES -->
          <section class="section">
            <header class="section-head">
              <div>
                <h2>Chaînes recommandées</h2>
                <p>Un accès rapide aux créateurs que tu veux suivre, surtout les chaînes FR dédiées au lore.</p>
              </div>
            </header>
            <div class="channel-grid">
              @for (ch of displayedChannels(); track ch.id) {
                <button class="channel-card" type="button" (click)="openExternal(ch.url)">
                  <span class="avatar">{{ ch.avatar }}</span>
                  <span class="ch-info">
                    <strong>{{ ch.name }}</strong>
                    <span>{{ ch.description }}</span>
                  </span>
                  <span class="lang">{{ ch.language }}</span>
                </button>
              }
            </div>
            @if (channels().length > displayedChannels().length) {
              <div class="load-more-row">
                <button class="load-more" type="button" (click)="loadMoreChannels()">
                  Charger plus de chaînes ({{ channels().length - displayedChannels().length }} restantes) ▾
                </button>
              </div>
            }
          </section>

          <!-- TOUTES LES VIDEOS -->
          <section class="section">
            <header class="section-head">
              <div>
                <h2>Toutes les vidéos</h2>
                <p>Catalogue filtrable des contenus ajoutés au codex.</p>
              </div>
              <span class="results-count">{{ filteredVideos().length }} résultat{{ filteredVideos().length > 1 ? 's' : '' }}</span>
            </header>
            @if (filteredVideos().length === 0) {
              <div class="empty">Aucune vidéo ne correspond à ces filtres.</div>
            } @else {
              <div class="video-grid">
                @for (v of displayedAll(); track v.id) {
                  <article class="video-card"
                    [style.--thumb]="thumbStyle(v)"
                    (click)="openModal(v)">
                    <span class="duration">{{ v.duration }}</span>
                    <span class="play">▶</span>
                    <button class="vc-delete" type="button" (click)="deleteVideo(v, $event)" aria-label="Supprimer la vidéo">✕</button>
                    <div class="video-content">
                      <div class="tags">
                        @if (v.language === 'FR') { <span class="tag fr">FR</span> }
                        @if (v.language === 'EN') { <span class="tag">EN</span> }
                        @if (v.language === 'FR/EN') { <span class="tag fr">FR/EN</span> }
                        @if (v.language === 'Sans dialogue') { <span class="tag">Mute</span> }
                        <span class="tag">{{ categoryLabel(v.category) }}</span>
                      </div>
                      <h3 class="video-title">{{ v.titre }}</h3>
                      <div class="video-meta">{{ v.createur }}</div>
                    </div>
                  </article>
                }
              </div>
              @if (filteredVideos().length > displayedAll().length) {
                <div class="load-more-row">
                  <button class="load-more" type="button" (click)="loadMoreAll()">
                    Charger plus de vidéos ({{ filteredVideos().length - displayedAll().length }} restantes) ▾
                  </button>
                </div>
              }
            }
          </section>
        </div>

        <!-- SIDEBAR -->
        <aside class="sidebar">
          <section class="side-panel">
            <h3>Filtres avancés</h3>
            @for (sf of sidebarOptions; track sf.key) {
              <button class="check-row" type="button"
                [class.active]="sidebarFilters().has(sf.key)"
                (click)="toggleSidebar(sf.key)">
                <span class="cr-label">
                  <span class="dot" [class.on]="sidebarFilters().has(sf.key)"></span>
                  {{ sf.label }}
                </span>
                <span class="count">{{ counts()[sf.key] }}</span>
              </button>
            }
          </section>
          <section class="side-panel">
            <h3>Vidéos récentes</h3>
            @for (v of recentVideos(); track v.id) {
              <button class="recent-row" type="button" (click)="openModal(v)">
                <span class="rr-title">{{ v.titre }}</span>
                <small>{{ v.duration }}</small>
              </button>
            }
          </section>
          <section class="side-panel">
            <h3>Règle UX</h3>
            <div class="recent-row static">
              <span class="rr-title">Une vidéo = thumbnail dominante + bouton play visible.</span>
            </div>
            <div class="recent-row static">
              <span class="rr-title">Pas de liste texte YouTube brute.</span>
            </div>
          </section>
        </aside>
      </section>

      <footer class="page-footer">
        Site fan non officiel Warhammer 40,000. Toutes les images appartiennent à leurs auteurs respectifs.
      </footer>
    </section>

    <!-- MODAL -->
    @if (selectedVideo(); as sv) {
      <div class="modal" (click)="onModalBackdrop($event)">
        <div class="modal-box">
          <button class="close" type="button" (click)="closeModal()" aria-label="Fermer">×</button>
          @if (modalEmbedUrl(); as url) {
            <iframe [src]="url"
              [title]="sv.titre"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen></iframe>
          } @else {
            <div class="modal-fallback">
              <strong>{{ sv.titre }}</strong>
              <p>Cette ressource n'est pas embarquable.</p>
              <a class="modal-link" [href]="sv.url" target="_blank" rel="noopener">Ouvrir sur YouTube ↗</a>
            </div>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./videos.component.scss'],
})
export class VideosComponent {
  private readonly service = inject(WarhammerService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly filters = FILTERS;
  readonly sidebarOptions = SIDEBAR_OPTIONS;

  readonly videos = toSignal(this.service.videos$, { initialValue: [] as Video[] });
  readonly channels = toSignal(this.service.channels$, { initialValue: [] as Channel[] });
  readonly priorityChannels = toSignal(this.service.channelsPriority$, { initialValue: [] as Channel[] });

  readonly searchQuery = signal('');
  readonly activeFilter = signal<FilterKey>('all');
  readonly sortOrder = signal<SortKey>('recommended');
  readonly sidebarFilters = signal<Set<SidebarFilter>>(new Set());
  readonly selectedVideo = signal<Video | null>(null);
  readonly heroBgUrl = signal<string>('linear-gradient(135deg, #1a0a08 0%, #050403 100%)');

  // Add Video modal state
  // Pagination par section (3 sections indépendantes)
  static readonly PAGE_FEATURED = 3;
  static readonly PAGE_CHANNELS = 6;
  static readonly PAGE_ALL = 9;
  readonly featuredLimit = signal(VideosComponent.PAGE_FEATURED);
  readonly channelsLimit = signal(VideosComponent.PAGE_CHANNELS);
  readonly allLimit = signal(VideosComponent.PAGE_ALL);

  readonly addVideoOpen = signal(false);
  readonly addUrl = signal('');
  readonly addLoading = signal(false);
  readonly addSaving = signal(false);
  readonly addError = signal<string | null>(null);
  readonly preview = signal<VideoPreview | null>(null);
  readonly newChannelLang = signal<'FR' | 'EN'>('EN');
  readonly addDesc = signal('');
  readonly addCategory = signal<string>('lore');
  readonly addType = signal<string>('Chaîne lore');
  readonly addFeatured = signal(false);

  private readonly thumbCache = signal<Record<string, string>>({});
  private readonly thumbInflight = new Set<string>();

  readonly featuredVideos = computed(() => this.videos().filter(v => v.featured));
  readonly displayedFeatured = computed(() => this.featuredVideos().slice(0, this.featuredLimit()));
  readonly displayedChannels = computed(() => this.channels().slice(0, this.channelsLimit()));

  readonly counts = computed(() => {
    const list = this.videos();
    return {
      short: list.filter(v => this.isShort(v.duration)).length,
      long: list.filter(v => this.isLong(v.duration)).length,
      fr: list.filter(v => v.language === 'FR').length,
      animation: list.filter(v => v.category === 'animation').length,
    };
  });

  readonly recentVideos = computed(() => this.videos().slice(-3).reverse());
  readonly displayedAll = computed(() => this.filteredVideos().slice(0, this.allLimit()));

  readonly filteredVideos = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filter = this.activeFilter();
    const sort = this.sortOrder();
    const sidebar = this.sidebarFilters();

    let list = this.videos().filter(v => !v.featured);

    if (q) {
      list = list.filter(v =>
        v.titre.toLowerCase().includes(q) ||
        v.createur.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (filter === 'lore' || filter === 'animation' || filter === 'official') {
      list = list.filter(v => v.category === filter);
    } else if (filter === 'FR') {
      list = list.filter(v => v.language === 'FR' || v.language === 'FR/EN');
    } else if (filter === 'EN') {
      list = list.filter(v => v.language === 'EN' || v.language === 'FR/EN' || v.language === 'Sans dialogue');
    }

    if (sidebar.has('short')) list = list.filter(v => this.isShort(v.duration));
    if (sidebar.has('long')) list = list.filter(v => this.isLong(v.duration));
    if (sidebar.has('fr')) list = list.filter(v => v.language === 'FR');
    if (sidebar.has('animation')) list = list.filter(v => v.category === 'animation');

    if (sort === 'duration') {
      list = [...list].sort((a, b) => this.durationSec(a.duration) - this.durationSec(b.duration));
    } else if (sort === 'channel') {
      list = [...list].sort((a, b) => a.createur.localeCompare(b.createur));
    } else if (sort === 'recent') {
      list = [...list].reverse();
    }

    return list;
  });

  readonly modalEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const v = this.selectedVideo();
    if (!v?.embedId) return null;
    const raw = v.embedType === 'playlist'
      ? `https://www.youtube.com/embed/videoseries?list=${v.embedId}&autoplay=1`
      : `https://www.youtube.com/embed/${v.embedId}?autoplay=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(raw);
  });

  constructor() {
    this.service.getWikiImage('warhammer 40k cinematic dark grimdark').subscribe(r => {
      if (r.imageUrl) {
        this.heroBgUrl.set(`url('${r.imageUrl}')`);
      }
    });

    // Reset pagination "Toutes les vidéos" quand search/filter/sort change
    effect(() => {
      void this.searchQuery();
      void this.activeFilter();
      void this.sortOrder();
      this.allLimit.set(VideosComponent.PAGE_ALL);
    });

    effect(() => {
      const list = this.videos();
      const cache = this.thumbCache();
      for (const v of list) {
        if (cache[v.id] || this.thumbInflight.has(v.id)) continue;

        if (v.embedType === 'video' && v.embedId) {
          const url = `https://img.youtube.com/vi/${v.embedId}/mqdefault.jpg`;
          this.thumbCache.update(c => ({ ...c, [v.id]: url }));
          continue;
        }

        if (typeof v.thumbnail === 'string' && v.thumbnail.length > 0) {
          this.thumbInflight.add(v.id);
          this.service.getWikiImage(v.thumbnail).subscribe({
            next: r => {
              if (r.imageUrl) {
                this.thumbCache.update(c => ({ ...c, [v.id]: r.imageUrl! }));
              }
              this.thumbInflight.delete(v.id);
            },
            error: () => { this.thumbInflight.delete(v.id); },
          });
        }
      }
    });
  }

  thumbStyle(v: Video): string {
    const url = this.thumbCache()[v.id];
    if (!url) {
      return 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
    }
    return `url('${url}')`;
  }

  toggleSidebar(key: SidebarFilter): void {
    const set = new Set(this.sidebarFilters());
    if (set.has(key)) set.delete(key); else set.add(key);
    this.sidebarFilters.set(set);
    this.allLimit.set(VideosComponent.PAGE_ALL);  // reset pagination "Toutes" sur changement filtre
  }

  loadMoreFeatured(): void {
    this.featuredLimit.update(n => n + VideosComponent.PAGE_FEATURED);
  }
  loadMoreChannels(): void {
    this.channelsLimit.update(n => n + VideosComponent.PAGE_CHANNELS);
  }
  loadMoreAll(): void {
    this.allLimit.update(n => n + VideosComponent.PAGE_ALL);
  }

  openModal(v: Video): void { this.selectedVideo.set(v); }
  closeModal(): void { this.selectedVideo.set(null); }

  onModalBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedVideo()) this.closeModal();
    else if (this.addVideoOpen()) this.closeAddVideo();
  }

  openExternal(url: string): void {
    window.open(url, '_blank', 'noopener');
  }

  // === Add Video flow ===
  openAddVideo(): void {
    this.addVideoOpen.set(true);
  }

  closeAddVideo(): void {
    this.addVideoOpen.set(false);
    this.addUrl.set('');
    this.preview.set(null);
    this.addError.set(null);
    this.addDesc.set('');
    this.addFeatured.set(false);
  }

  previewVideo(): void {
    const url = this.addUrl().trim();
    if (!url) return;
    this.addError.set(null);
    this.preview.set(null);
    this.addLoading.set(true);
    this.service.previewVideo(url).subscribe({
      next: p => {
        this.preview.set(p);
        if (p.matchedChannel) {
          this.newChannelLang.set(p.matchedChannel.language);
        }
        this.addLoading.set(false);
      },
      error: err => {
        this.addError.set(err?.error?.message ?? 'URL YouTube invalide ou inaccessible');
        this.addLoading.set(false);
      },
    });
  }

  confirmAdd(): void {
    const p = this.preview();
    if (!p) return;
    this.addSaving.set(true);
    this.addError.set(null);

    const body: VideoImportBody = {
      url: this.addUrl(),
      description: this.addDesc().trim() || undefined,
      type: this.addType(),
      category: this.addCategory(),
      incontournable: this.addFeatured(),
      langue: this.newChannelLang(),
    };
    if (p.matchedChannel) {
      body.channelId = p.matchedChannel.id;
    } else {
      body.channel = {
        id: p.suggestedChannelId,
        name: p.authorName,
        language: this.newChannelLang(),
        url: p.authorUrl,
      };
    }

    this.service.importVideo(body).subscribe({
      next: () => {
        this.service.refreshVideos();
        this.service.refreshChannels();
        this.addSaving.set(false);
        this.closeAddVideo();
      },
      error: err => {
        this.addError.set(err?.error?.message ?? 'Erreur lors de l\'enregistrement');
        this.addSaving.set(false);
      },
    });
  }

  deleteVideo(v: Video, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Supprimer la vidéo « ${v.titre} » du codex ?`)) return;
    this.service.deleteVideo(v.id).subscribe({
      next: () => this.service.refreshVideos(),
      error: err => alert(err?.error?.message ?? 'Suppression refusée'),
    });
  }

  shortDesc(d: string): string {
    return d.length > 90 ? d.slice(0, 90).trim() + '…' : d;
  }

  categoryLabel(cat?: string): string {
    switch (cat) {
      case 'lore':      return 'Lore';
      case 'animation': return 'Animation';
      case 'official':  return 'Officiel';
      default:          return 'Autre';
    }
  }

  private isShort(duration?: string): boolean {
    if (!duration) return false;
    const m = duration.match(/^(\d{1,2}):\d{2}$/);
    return !!m && parseInt(m[1], 10) < 10;
  }

  private isLong(duration?: string): boolean {
    if (!duration) return false;
    if (/^\d+:\d{2}:\d{2}$/.test(duration)) return true;
    const m = duration.match(/^(\d{1,2}):\d{2}$/);
    return !!m && parseInt(m[1], 10) >= 30;
  }

  private durationSec(duration?: string): number {
    if (!duration) return Number.MAX_SAFE_INTEGER;
    const h = duration.match(/^(\d+):(\d{2}):(\d{2})$/);
    if (h) return parseInt(h[1], 10) * 3600 + parseInt(h[2], 10) * 60 + parseInt(h[3], 10);
    const m = duration.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return Number.MAX_SAFE_INTEGER - 1;
  }
}
