import { Component, inject, signal, computed, effect, HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { WarhammerService, ImageMeta, RedditPost } from '../../core/services/warhammer.service';
import type { Artwork, ArtworkCategory, ArtworkCollection, ArtworkArtist, Faction } from '../../core/models/models';

interface CategoryDef {
  key: ArtworkCategory;
  label: string;
  query: string;
}

const CATEGORIES: CategoryDef[] = [
  { key: 'Space Marines', label: 'Space Marines', query: 'Space Marine warhammer 40k' },
  { key: 'Chaos', label: 'Chaos', query: 'Chaos Space Marine warhammer 40k' },
  { key: 'Xénos', label: 'Xénos', query: 'Tyranid warhammer 40k' },
  { key: 'Imperium', label: 'Imperium', query: 'Imperium gothic cathedral warhammer' },
  { key: 'Personnages', label: 'Personnages', query: 'Sister of Battle warhammer' },
  { key: 'Véhicules', label: 'Véhicules', query: 'Leman Russ tank warhammer' },
  { key: 'Mes images', label: 'Mes images', query: 'warhammer 40k personal collection' },
];

const PAGE_SIZE = 8;
type SortBy = 'recent' | 'popular' | 'alpha';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="gallery-page">

      <!-- HERO -->
      <header class="hero">
        <div class="hero-bg" [style.background-image]="heroBgUrl()"></div>
        <div class="hero-content">
          <div class="hero-text">
            <span class="eyebrow">Codex visuel du 41e millénaire</span>
            <h1>Galerie Impériale</h1>
            <p class="hero-desc">
              Explorez les illustrations, artworks et visuels du 41e millénaire.<br/>
              {{ artworks().length }} œuvres triées, classées et archivées.
            </p>
            <div class="search-bar-wrap">
              <div class="search-bar">
                <span class="s-icon">⌕</span>
                <input
                  type="text"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  placeholder="Rechercher une œuvre, un artiste, une faction…" />
              </div>
              <button type="button" class="import-btn-hero" (click)="openImport()">
                <span>+</span> Importer
              </button>
            </div>
          </div>
          <aside class="hero-stats">
            <div class="stat-card">
              <div class="stat-icon">▦</div>
              <div class="stat-num">{{ artworks().length }}</div>
              <div class="stat-label">Œuvres</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">◐</div>
              <div class="stat-num">{{ artists().length }}</div>
              <div class="stat-label">Artistes</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">◇</div>
              <div class="stat-num">{{ collections().length }}</div>
              <div class="stat-label">Collections</div>
            </div>
          </aside>
        </div>
      </header>

      <!-- LAYOUT MAIN + SIDEBAR -->
      <section class="layout">
        <div class="main-col">

          <!-- CATEGORIES -->
          <section class="section">
            <h2 class="section-title">Parcourir par catégorie</h2>
            <div class="category-grid">
              @for (cat of availableCategories(); track cat.key) {
                <button class="category-card"
                  type="button"
                  [class.active]="filterCategory() === cat.key"
                  [style.--cat-bg]="categoryBg(cat.key)"
                  (click)="toggleCategoryFilter(cat.key)">
                  <span class="cat-name">{{ cat.label }}</span>
                  <span class="cat-count">{{ categoryCount(cat.key) }} œuvres</span>
                </button>
              }
            </div>
          </section>

          <!-- ARTWORKS GRID -->
          <section class="section">
            <header class="section-head">
              <div>
                <h2 class="section-title">
                  {{ filterCategory() ?? 'Œuvres récentes' }}
                </h2>
                @if (totalFiltered() > 0) {
                  <span class="results-count">{{ totalFiltered() }} résultat{{ totalFiltered() > 1 ? 's' : '' }}</span>
                }
              </div>
              @if (hasActiveFilters()) {
                <button class="see-all" type="button" (click)="resetFilters()">Réinitialiser →</button>
              }
            </header>

            @if (totalFiltered() === 0) {
              <div class="empty">Aucune œuvre ne correspond à ces filtres.</div>
            } @else {
              <div class="art-grid">
                @for (art of pagedArtworks(); track art.id; let i = $index) {
                  <article class="art-card"
                    [style.--art]="artBg(art)"
                    (click)="openViewer(art, i)">
                    <button class="bookmark"
                      type="button"
                      [class.on]="bookmarks().has(art.id)"
                      (click)="$event.stopPropagation(); toggleBookmark(art.id)"
                      aria-label="Favori">
                      ♥
                    </button>
                    <div class="art-content">
                      <div class="art-title">{{ art.title }}</div>
                      <div class="art-meta">
                        <span class="art-artist">{{ art.artist }}</span>
                        <span class="art-likes">♥ {{ art.likes ?? 0 }}</span>
                      </div>
                    </div>
                  </article>
                }
              </div>
              @if (canLoadMore()) {
                <button class="load-more" type="button" (click)="loadMore()">
                  Charger plus d'œuvres ▾
                </button>
              }
            }
          </section>
        </div>

        <!-- SIDEBAR -->
        <aside class="sidebar">
          <section class="side-panel">
            <div class="panel-head">
              <h3>Filtres</h3>
              @if (hasActiveFilters()) {
                <button class="reset-btn" type="button" (click)="resetFilters()">Réinitialiser</button>
              }
            </div>
            <div class="filter-row">
              <label>Faction</label>
              <select [ngModel]="filterFaction()" (ngModelChange)="filterFaction.set($event)">
                <option value="">Toutes</option>
                @for (f of factionList(); track f) {
                  <option [value]="f">{{ f }}</option>
                }
              </select>
            </div>
            <div class="filter-row">
              <label>Catégorie</label>
              <select [ngModel]="filterCategory() ?? ''" (ngModelChange)="filterCategory.set($event || null)">
                <option value="">Toutes</option>
                @for (c of availableCategories(); track c.key) {
                  <option [value]="c.key">{{ c.label }}</option>
                }
              </select>
            </div>
            <div class="filter-row">
              <label>Trier par</label>
              <select [ngModel]="sortBy()" (ngModelChange)="sortBy.set($event)">
                <option value="recent">Plus récentes</option>
                <option value="popular">Populaires</option>
                <option value="alpha">A — Z</option>
              </select>
            </div>
          </section>

          <section class="side-panel">
            <h3>Artistes à découvrir</h3>
            @if (artists().length === 0) {
              <div class="empty-mini">Aucun artiste indexé.</div>
            }
            @for (a of topArtists(); track a.id) {
              <button class="artist-row" type="button"
                [class.active]="filterArtist() === a.name"
                (click)="toggleArtistFilter(a.name)">
                <span class="ar-avatar">{{ initials(a.name) }}</span>
                <span class="ar-info">
                  <strong>{{ a.name }}</strong>
                  <small>{{ a.artworkCount }} œuvre{{ a.artworkCount > 1 ? 's' : '' }}</small>
                </span>
              </button>
            }
          </section>

          <section class="side-panel">
            <h3>Collections populaires</h3>
            @for (col of collections(); track col.id) {
              <button class="col-row" type="button"
                [class.active]="filterCollection() === col.id"
                (click)="toggleCollectionFilter(col.id)">
                <span class="col-icon">▤</span>
                <span class="col-info">
                  <strong>{{ col.name }}</strong>
                  <small>{{ col.count }} œuvres</small>
                </span>
              </button>
            }
          </section>
        </aside>
      </section>

      <footer class="page-footer">
        Site fan non officiel Warhammer 40,000. Toutes les images appartiennent à leurs auteurs respectifs.
      </footer>
    </section>

    <!-- VIEWER MODAL -->
    @if (selectedArt(); as art) {
      <div class="modal" (click)="onModalBackdrop($event)">
        <button class="close" type="button" (click)="closeViewer()" aria-label="Fermer">×</button>
        <button class="nav-arrow left" type="button"
          (click)="$event.stopPropagation(); navViewer(-1)"
          aria-label="Précédent">‹</button>
        <button class="nav-arrow right" type="button"
          (click)="$event.stopPropagation(); navViewer(1)"
          aria-label="Suivant">›</button>
        <div class="viewer" (click)="$event.stopPropagation()">
          <div class="viewer-img" [style.background-image]="viewerBg()"></div>
          <div class="viewer-info">
            <div class="vi-title">{{ art.title }}</div>
            <div class="vi-meta">
              <span>{{ art.artist }}</span>
              <span class="vi-dot">·</span>
              <span>{{ art.category }}</span>
              @if (art.likes) {
                <span class="vi-dot">·</span>
                <span>♥ {{ art.likes }}</span>
              }
            </div>
            <div class="vi-actions">
              <button type="button" class="vi-btn"
                [class.on]="bookmarks().has(art.id)"
                (click)="toggleBookmark(art.id)">
                ♥ {{ bookmarks().has(art.id) ? 'Favori' : 'Ajouter aux favoris' }}
              </button>
              @if (art.isLocal) {
                <button type="button" class="vi-btn" (click)="openCategorize()">
                  ✦ Catégoriser
                </button>
              }
              @if (art.source) {
                <a class="vi-btn" [href]="art.source" target="_blank" rel="noopener">
                  Source ↗
                </a>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- CATEGORIZE MODAL -->
    @if (catModalOpen()) {
      <div class="modal cat-modal" (click)="onCatBackdrop($event)">
        <div class="cat-box" (click)="$event.stopPropagation()">
          <button class="close" type="button" (click)="closeCategorize()" aria-label="Fermer">×</button>
          <h3>Catégoriser l'image</h3>
          <p class="cat-hint">Assigne plusieurs catégories, un titre, un artiste ou une faction. Tape une nouvelle catégorie et appuie sur Entrée.</p>

          <div class="cat-row">
            <label>Catégories <span class="opt">({{ catSelectedTags().length }})</span></label>
            <div class="chip-input">
              @for (tag of catSelectedTags(); track tag) {
                <span class="chip">
                  {{ tag }}
                  <button type="button" class="chip-x" (click)="removeCatTag(tag)" aria-label="Retirer">×</button>
                </span>
              }
              <input
                type="text"
                list="cat-suggestions"
                placeholder="Tape ou choisis…"
                [ngModel]="catInput()"
                (ngModelChange)="catInput.set($event)"
                (keydown.enter)="$event.preventDefault(); addCatTag()"
                (keydown.tab)="catInput().trim() && addCatTag()" />
              <datalist id="cat-suggestions">
                @for (c of allCategories(); track c) {
                  <option [value]="c"></option>
                }
              </datalist>
              @if (catInput().trim()) {
                <button type="button" class="chip-add" (click)="addCatTag()" aria-label="Ajouter">+</button>
              }
            </div>
          </div>

          <div class="cat-row">
            <label>Titre <span class="opt">(optionnel)</span></label>
            <input type="text" placeholder="ex: Space Marine en armure"
              [ngModel]="catTitle()" (ngModelChange)="catTitle.set($event)" />
          </div>

          <div class="cat-row">
            <label>Artiste <span class="opt">(optionnel)</span></label>
            <input type="text" placeholder="ex: John Blanche"
              [ngModel]="catArtist()" (ngModelChange)="catArtist.set($event)" />
          </div>

          <div class="cat-row">
            <label>Faction <span class="opt">(optionnel)</span></label>
            <input type="text" placeholder="ex: space-marines"
              [ngModel]="catFaction()" (ngModelChange)="catFaction.set($event)" />
          </div>

          <div class="cat-actions">
            <button type="button" class="vi-btn ghost" (click)="closeCategorize()">Annuler</button>
            <button type="button" class="vi-btn primary" (click)="saveCategorize()">Enregistrer</button>
          </div>
        </div>
      </div>
    }

    <!-- IMPORT MODAL -->
    @if (importModalOpen()) {
      <div class="modal import-modal" (click)="onImportBackdrop($event)">
        <div class="import-box" (click)="$event.stopPropagation()">
          <button class="close" type="button" (click)="closeImport()" aria-label="Fermer">×</button>
          <h3>Importer une image</h3>
          <p class="cat-hint">Recherche sur Wikipedia, parcours r/Warhammer40k, ou colle une URL directe.</p>

          <div class="import-tabs">
            <button type="button" [class.active]="importTab() === 'reddit'" (click)="setImportTab('reddit')">▲ Reddit</button>
            <button type="button" [class.active]="importTab() === 'wiki'" (click)="setImportTab('wiki')">⌕ Wiki</button>
            <button type="button" [class.active]="importTab() === 'url'" (click)="setImportTab('url')">↗ URL</button>
          </div>

          @if (importTab() === 'reddit') {
            <div class="import-content">
              @if (importRedditLoading()) {
                <div class="empty">Chargement de r/Warhammer40k…</div>
              } @else if (importRedditPosts().length === 0) {
                <div class="empty">Aucun post avec image. <button type="button" class="cat-toggle" (click)="loadRedditPosts()">Réessayer</button></div>
              } @else {
                <div class="reddit-grid">
                  @for (p of importRedditPosts(); track p.id) {
                    <article class="reddit-card">
                      <div class="reddit-thumb" [style.background-image]="'url(' + p.imageUrl + ')'"></div>
                      <div class="reddit-info">
                        <div class="reddit-title">{{ p.title }}</div>
                        <div class="reddit-meta">u/{{ p.author }} · ▲ {{ p.upvotes }}</div>
                      </div>
                      <button type="button" class="vi-btn primary import-btn"
                        [disabled]="importPending() === p.imageUrl"
                        (click)="importImageFromUrl(p.imageUrl)">
                        {{ importPending() === p.imageUrl ? '…' : '+ Importer' }}
                      </button>
                    </article>
                  }
                </div>
              }
            </div>
          }

          @if (importTab() === 'wiki') {
            <div class="import-content">
              <div class="wiki-search">
                <input type="text" placeholder="ex: Roboute Guilliman"
                  [ngModel]="importWikiQuery()" (ngModelChange)="importWikiQuery.set($event)"
                  (keydown.enter)="searchImportWiki()" />
                <button type="button" class="vi-btn primary" (click)="searchImportWiki()" [disabled]="importWikiLoading()">
                  {{ importWikiLoading() ? '…' : 'Chercher' }}
                </button>
              </div>
              @if (importWikiResult()) {
                @if (importWikiResult()!.imageUrl) {
                  <article class="reddit-card wide">
                    <div class="reddit-thumb large" [style.background-image]="'url(' + importWikiResult()!.imageUrl + ')'"></div>
                    <div class="reddit-info">
                      <div class="reddit-title">{{ importWikiResult()!.pageTitle }}</div>
                      <div class="reddit-meta">Wiki Warhammer Fandom</div>
                    </div>
                    <button type="button" class="vi-btn primary import-btn"
                      [disabled]="importPending() === importWikiResult()!.imageUrl"
                      (click)="importImageFromUrl(importWikiResult()!.imageUrl!)">
                      {{ importPending() === importWikiResult()!.imageUrl ? '…' : '+ Importer' }}
                    </button>
                  </article>
                } @else {
                  <div class="empty">Aucune image trouvée pour cette recherche.</div>
                }
              }
            </div>
          }

          @if (importTab() === 'url') {
            <div class="import-content">
              <div class="cat-row">
                <label>URL de l'image</label>
                <input type="url" placeholder="https://..."
                  [ngModel]="importUrlInput()" (ngModelChange)="importUrlInput.set($event)" />
              </div>
              @if (importUrlInput().trim()) {
                <article class="reddit-card wide">
                  <div class="reddit-thumb large" [style.background-image]="'url(' + importUrlInput() + ')'"></div>
                  <div class="reddit-info">
                    <div class="reddit-title">Aperçu de l'URL</div>
                    <div class="reddit-meta">{{ importUrlInput() }}</div>
                  </div>
                  <button type="button" class="vi-btn primary import-btn"
                    [disabled]="importPending() === importUrlInput()"
                    (click)="importImageFromUrl(importUrlInput().trim())">
                    {{ importPending() === importUrlInput() ? '…' : '+ Importer' }}
                  </button>
                </article>
              }
            </div>
          }

          @if (importMessage()) {
            <div class="import-message" [class.error]="importMessage().startsWith('Échec')">
              {{ importMessage() }}
            </div>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./gallery.component.scss'],
})
export class GalleryComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly categories = CATEGORIES;

  private readonly catalogArtworks = toSignal(this.service.artworks$, { initialValue: [] as Artwork[] });
  private readonly localImages = toSignal(this.service.images$, { initialValue: [] as string[] });
  readonly collections = toSignal(this.service.artworkCollections$, { initialValue: [] as ArtworkCollection[] });
  readonly artists = toSignal(this.service.artworkArtists$, { initialValue: [] as ArtworkArtist[] });
  readonly factions = toSignal(this.service.factions$, { initialValue: [] as Faction[] });

  readonly imageMeta = signal<Record<string, ImageMeta>>({});

  readonly artworks = computed<Artwork[]>(() => {
    const catalog = this.catalogArtworks();
    const meta = this.imageMeta();
    const local = this.localImages().map((filename, idx): Artwork => {
      const m = meta[filename];
      const cats = m?.categories ?? [];
      const primary = (cats[0] as ArtworkCategory) || 'Mes images';
      const extra = cats.slice(1);
      return {
        id: `local-${idx}`,
        title: m?.title || `Œuvre #${idx + 1}`,
        artist: m?.artist || 'Collection personnelle',
        image: filename,
        category: primary,
        extraCategories: extra.length ? extra : undefined,
        faction: m?.faction,
        likes: 0,
        isLocal: true,
      };
    });
    return [...catalog, ...local];
  });

  readonly customCategories = computed(() => {
    const builtIn = new Set<string>(CATEGORIES.map(c => c.key as string));
    const set = new Set<string>();
    for (const m of Object.values(this.imageMeta())) {
      for (const c of m.categories ?? []) {
        if (!builtIn.has(c)) set.add(c);
      }
    }
    return Array.from(set).sort();
  });

  // Œuvres filtrées par TOUS les filtres SAUF la catégorie — base pour
  // calculer dynamiquement les catégories pertinentes à la recherche en cours.
  readonly searchedArtworks = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const fac = this.filterFaction();
    const artist = this.filterArtist();
    const coll = this.filterCollection();
    let list = this.artworks().slice();
    if (q) {
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.artist.toLowerCase().includes(q) ||
        (a.faction ?? '').toLowerCase().includes(q) ||
        (a.category ?? '').toLowerCase().includes(q) ||
        (a.extraCategories ?? []).some(c => c.toLowerCase().includes(q))
      );
    }
    if (fac) list = list.filter(a => a.faction === fac);
    if (artist) list = list.filter(a => a.artist === artist);
    if (coll) list = list.filter(a => a.collectionId === coll);
    return list;
  });

  readonly availableCategories = computed<{ key: string; label: string }[]>(() => {
    const counts = new Map<string, number>();
    for (const a of this.searchedArtworks()) {
      const tags = [a.category, ...(a.extraCategories ?? [])].filter(Boolean) as string[];
      for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const out: { key: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const c of CATEGORIES) {
      if ((counts.get(c.key) ?? 0) > 0) {
        out.push({ key: c.key, label: c.label });
        seen.add(c.key);
      }
    }
    for (const fname of this.factionCategories()) {
      if (!seen.has(fname) && (counts.get(fname) ?? 0) > 0) {
        out.push({ key: fname, label: fname });
        seen.add(fname);
      }
    }
    for (const c of this.customCategories()) {
      if (!seen.has(c) && (counts.get(c) ?? 0) > 0) {
        out.push({ key: c, label: c });
        seen.add(c);
      }
    }
    return out;
  });

  readonly factionCategories = computed<string[]>(() =>
    this.factions().map(f => f.nom).sort((a, b) => a.localeCompare(b, 'fr')),
  );

  readonly allCategories = computed<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (s: string) => { if (!seen.has(s)) { seen.add(s); out.push(s); } };
    // 6 built-in (catégories visuelles globales)
    CATEGORIES.filter(c => c.key !== 'Mes images').forEach(c => push(c.key as string));
    // 17 factions (intégration F10)
    this.factionCategories().forEach(push);
    // Custom (créées par user)
    this.customCategories().forEach(push);
    return out;
  });

  // Categorize modal state — multi-cat
  readonly catModalOpen = signal(false);
  readonly catSelectedTags = signal<string[]>([]);
  readonly catInput = signal('');
  readonly catTitle = signal('');
  readonly catArtist = signal('');
  readonly catFaction = signal('');

  // Import modal state
  readonly importModalOpen = signal(false);
  readonly importTab = signal<'wiki' | 'reddit' | 'url'>('reddit');
  readonly importWikiQuery = signal('');
  readonly importWikiResult = signal<{ imageUrl: string | null; pageTitle: string | null; pageUrl: string | null } | null>(null);
  readonly importWikiLoading = signal(false);
  readonly importRedditPosts = signal<RedditPost[]>([]);
  readonly importRedditLoading = signal(false);
  readonly importUrlInput = signal('');
  readonly importPending = signal<string | null>(null); // url being imported
  readonly importMessage = signal<string>('');

  readonly searchQuery = signal('');
  readonly filterCategory = signal<string | null>(null);
  readonly filterFaction = signal<string>('');
  readonly filterArtist = signal<string>('');
  readonly filterCollection = signal<string>('');
  readonly sortBy = signal<SortBy>('recent');
  readonly bookmarks = signal<Set<string>>(new Set());
  readonly pageCount = signal(1);

  readonly selectedArt = signal<Artwork | null>(null);
  private viewerIndex = 0;

  readonly heroBgUrl = signal<string>('linear-gradient(135deg, #1a0a08 0%, #050403 100%)');
  private readonly imgCache = signal<Record<string, string>>({});
  private readonly imgInflight = new Set<string>();

  readonly factionList = computed(() => {
    const set = new Set<string>();
    for (const a of this.artworks()) {
      if (a.faction) set.add(a.faction);
    }
    return Array.from(set).sort();
  });

  readonly topArtists = computed(() =>
    [...this.artists()].sort((a, b) => b.artworkCount - a.artworkCount).slice(0, 6),
  );

  readonly hasActiveFilters = computed(() =>
    !!(this.filterCategory() || this.filterFaction() || this.filterArtist() || this.filterCollection() || this.searchQuery().trim()),
  );

  readonly filteredArtworks = computed(() => {
    const cat = this.filterCategory();
    let list = this.searchedArtworks().slice();
    if (cat) list = list.filter(a => a.category === cat || (a.extraCategories ?? []).includes(cat));

    const sort = this.sortBy();
    if (sort === 'popular') list.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    else if (sort === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  });

  readonly totalFiltered = computed(() => this.filteredArtworks().length);
  readonly pagedArtworks = computed(() => this.filteredArtworks().slice(0, this.pageCount() * PAGE_SIZE));
  readonly canLoadMore = computed(() => this.pagedArtworks().length < this.filteredArtworks().length);

  constructor() {
    // Read ?q= or ?search= query param to pre-fill search (links from /lore figures)
    this.route.queryParamMap.subscribe(params => {
      const q = params.get('q') ?? params.get('search');
      if (q) this.searchQuery.set(q);
    });

    this.service.getWikiImage('warhammer 40k Imperium gothic city space marine').subscribe(r => {
      if (r.imageUrl) this.heroBgUrl.set(`url('${r.imageUrl}')`);
    });

    this.service.getImageMeta().subscribe(meta => this.imageMeta.set(meta));

    for (const cat of CATEGORIES) {
      this.fetchImage(`cat:${cat.key}`, cat.query);
    }

    effect(() => {
      const list = this.artworks();
      const cache = this.imgCache();
      for (const a of list) {
        if (a.isLocal) continue;
        const key = `art:${a.id}`;
        if (cache[key] || this.imgInflight.has(key)) continue;
        this.fetchImage(key, a.wikiQuery ?? `${a.title} warhammer 40k`);
      }
    });
  }

  private fetchImage(key: string, query: string): void {
    if (this.imgCache()[key] || this.imgInflight.has(key)) return;
    this.imgInflight.add(key);
    this.service.getWikiImage(query).subscribe({
      next: r => {
        if (r.imageUrl) this.imgCache.update(c => ({ ...c, [key]: r.imageUrl! }));
        this.imgInflight.delete(key);
      },
      error: () => { this.imgInflight.delete(key); },
    });
  }

  categoryBg(key: string): string {
    const cached = this.imgCache()[`cat:${key}`];
    if (cached) return `url('${cached}')`;
    const arts = this.artworks().filter(a => a.category === key || (a.extraCategories ?? []).includes(key));
    if (arts.length > 0) {
      const first = arts[0];
      if (first.isLocal) return `url('${this.service.imageUrl(first.image)}')`;
      const url = this.imgCache()[`art:${first.id}`];
      if (url) return `url('${url}')`;
    }
    return 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
  }

  artBg(art: Artwork): string {
    if (art.isLocal) {
      return `url('${this.service.imageUrl(art.image)}')`;
    }
    const url = this.imgCache()[`art:${art.id}`];
    return url ? `url('${url}')` : 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
  }

  viewerBg(): string {
    const a = this.selectedArt();
    if (!a) return '';
    if (a.isLocal) {
      return `url('${this.service.imageUrl(a.image)}')`;
    }
    const url = this.imgCache()[`art:${a.id}`];
    return url ? `url('${url}')` : '';
  }

  categoryCount(key: string): number {
    return this.searchedArtworks().filter(a => a.category === key || (a.extraCategories ?? []).includes(key)).length;
  }

  toggleCategoryFilter(key: string): void {
    this.filterCategory.set(this.filterCategory() === key ? null : key);
    this.pageCount.set(1);
  }

  toggleArtistFilter(name: string): void {
    this.filterArtist.set(this.filterArtist() === name ? '' : name);
    this.pageCount.set(1);
  }

  toggleCollectionFilter(id: string): void {
    this.filterCollection.set(this.filterCollection() === id ? '' : id);
    this.pageCount.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterCategory.set(null);
    this.filterFaction.set('');
    this.filterArtist.set('');
    this.filterCollection.set('');
    this.pageCount.set(1);
  }

  toggleBookmark(id: string): void {
    const set = new Set(this.bookmarks());
    if (set.has(id)) set.delete(id); else set.add(id);
    this.bookmarks.set(set);
  }

  loadMore(): void {
    this.pageCount.update(n => n + 1);
  }

  openViewer(art: Artwork, idx: number): void {
    this.selectedArt.set(art);
    this.viewerIndex = idx;
  }

  closeViewer(): void {
    this.selectedArt.set(null);
  }

  onModalBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeViewer();
    }
  }

  navViewer(delta: number): void {
    const list = this.pagedArtworks();
    if (list.length === 0) return;
    this.viewerIndex = (this.viewerIndex + delta + list.length) % list.length;
    this.selectedArt.set(list[this.viewerIndex]);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.selectedArt()) this.closeViewer(); }

  @HostListener('document:keydown.arrowleft')
  onLeft(): void { if (this.selectedArt()) this.navViewer(-1); }

  @HostListener('document:keydown.arrowright')
  onRight(): void { if (this.selectedArt()) this.navViewer(1); }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .map(p => p[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('') || '?';
  }

  openCategorize(): void {
    const a = this.selectedArt();
    if (!a?.isLocal) return;
    const tags = [a.category, ...(a.extraCategories ?? [])].filter(t => t && t !== 'Mes images') as string[];
    this.catSelectedTags.set(tags);
    this.catInput.set('');
    this.catTitle.set(a.title.startsWith('Œuvre #') ? '' : a.title);
    this.catArtist.set(a.artist === 'Collection personnelle' ? '' : a.artist);
    this.catFaction.set(a.faction ?? '');
    this.catModalOpen.set(true);
  }

  closeCategorize(): void {
    this.catModalOpen.set(false);
  }

  onCatBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('cat-modal')) {
      this.closeCategorize();
    }
  }

  addCatTag(value?: string): void {
    const v = (value ?? this.catInput()).trim();
    if (!v) return;
    const list = this.catSelectedTags();
    if (!list.includes(v)) {
      this.catSelectedTags.set([...list, v]);
    }
    this.catInput.set('');
  }

  removeCatTag(tag: string): void {
    this.catSelectedTags.set(this.catSelectedTags().filter(t => t !== tag));
  }

  saveCategorize(): void {
    const a = this.selectedArt();
    if (!a?.isLocal) return;
    let categories = this.catSelectedTags().slice();
    const pending = this.catInput().trim();
    if (pending && !categories.includes(pending)) {
      categories.push(pending);
    }
    const meta: ImageMeta = {
      categories: categories.length ? categories : undefined,
      title: this.catTitle().trim() || undefined,
      artist: this.catArtist().trim() || undefined,
      faction: this.catFaction().trim() || undefined,
    };
    this.service.saveImageMeta(a.image, meta).subscribe(updated => {
      this.imageMeta.set(updated);
      this.closeCategorize();
    });
  }

  // === Import modal ===
  openImport(): void {
    this.importModalOpen.set(true);
    this.importMessage.set('');
    if (this.importTab() === 'reddit' && this.importRedditPosts().length === 0) {
      this.loadRedditPosts();
    }
  }

  closeImport(): void {
    this.importModalOpen.set(false);
  }

  onImportBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('import-modal')) {
      this.closeImport();
    }
  }

  setImportTab(tab: 'wiki' | 'reddit' | 'url'): void {
    this.importTab.set(tab);
    if (tab === 'reddit' && this.importRedditPosts().length === 0) {
      this.loadRedditPosts();
    }
  }

  loadRedditPosts(): void {
    this.importRedditLoading.set(true);
    this.service.searchReddit('Warhammer40k', 30).subscribe({
      next: posts => {
        this.importRedditPosts.set(posts);
        this.importRedditLoading.set(false);
      },
      error: () => {
        this.importRedditPosts.set([]);
        this.importRedditLoading.set(false);
      },
    });
  }

  searchImportWiki(): void {
    const q = this.importWikiQuery().trim();
    if (!q) return;
    this.importWikiLoading.set(true);
    this.importWikiResult.set(null);
    this.service.getWikiImage(q).subscribe({
      next: r => {
        this.importWikiResult.set(r);
        this.importWikiLoading.set(false);
      },
      error: () => {
        this.importWikiResult.set(null);
        this.importWikiLoading.set(false);
      },
    });
  }

  importImageFromUrl(url: string): void {
    if (!url || this.importPending()) return;
    this.importPending.set(url);
    this.importMessage.set('');
    this.service.saveImportedImage(url).subscribe({
      next: result => {
        this.importPending.set(null);
        this.importMessage.set(`Importé : ${result.filename} (${Math.round(result.size / 1024)} ko)`);
        // Refresh images list to show the new one
        // The shareReplay cache won't auto-refresh, so we hard reload images
        location.reload();
      },
      error: err => {
        this.importPending.set(null);
        this.importMessage.set(`Échec : ${err?.error?.message ?? err?.message ?? 'erreur inconnue'}`);
      },
    });
  }
}
