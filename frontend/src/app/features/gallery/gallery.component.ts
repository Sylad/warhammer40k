import { Component, inject, signal, computed, effect, HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarhammerService, ImageMeta, RedditPost } from '../../core/services/warhammer.service';
import type { Artwork, ArtworkCategory, ArtworkCollection, ArtworkArtist } from '../../core/models/models';

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

const PALETTE: { hex: string; label: string }[] = [
  { hex: '#c9a24a', label: 'Or' },
  { hex: '#7b1113', label: 'Rouge sang' },
  { hex: '#1f3d75', label: 'Bleu profond' },
  { hex: '#2f5f8f', label: 'Bleu acier' },
  { hex: '#0f6b43', label: 'Vert épidémie' },
  { hex: '#5a2d8f', label: 'Violet psyker' },
  { hex: '#3a2410', label: 'Brun cuir' },
  { hex: '#0c0c0c', label: 'Noir abysse' },
  { hex: '#e8deca', label: 'Os' },
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
              @for (cat of categories; track cat.key) {
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
                @for (c of categories; track c.key) {
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
            <h3>Couleurs dominantes</h3>
            <div class="color-palette">
              @for (c of palette; track c.hex) {
                <button class="color-dot"
                  type="button"
                  [style.background]="c.hex"
                  [class.active]="filterColor() === c.hex"
                  [title]="c.label"
                  (click)="toggleColorFilter(c.hex)"></button>
              }
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
  styles: [`
    :host { display: block; }

    .gallery-page {
      width: min(1440px, calc(100% - 64px));
      margin: 0 auto;
      padding: 28px 0 64px;
    }

    /* HERO */
    .hero {
      position: relative;
      min-height: 320px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: var(--panel);
      box-shadow: var(--shadow), inset 0 0 110px rgba(201, 162, 74, 0.045);
      margin-bottom: 28px;
    }
    .hero-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      filter: contrast(1.42) saturate(0.92) brightness(0.55);
      transform: scale(1.03);
    }
    .hero-content {
      position: relative;
      z-index: 1;
      min-height: 320px;
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) auto;
      gap: 26px;
      align-items: end;
      padding: 36px 40px;
    }
    .eyebrow {
      display: block;
      color: var(--gold);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 10px;
    }
    .hero h1 {
      margin: 0 0 14px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: clamp(40px, 5vw, 68px);
      line-height: 0.95;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 38px rgba(201, 162, 74, 0.28);
    }
    .hero-desc {
      max-width: 620px;
      margin: 0 0 22px;
      color: #cfc3ad;
      font-size: 16px;
      line-height: 1.65;
    }
    .search-bar {
      position: relative;
      max-width: 520px;
      display: flex;
      align-items: center;
    }
    .s-icon {
      position: absolute;
      left: 14px;
      color: var(--gold);
      font-size: 16px;
      pointer-events: none;
    }
    .search-bar input {
      width: 100%;
      height: 44px;
      padding: 0 18px 0 40px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      background: rgba(5, 4, 3, 0.78);
      color: var(--text);
      outline: none;
      font: inherit;
      font-size: 14px;
    }
    .search-bar input:focus { border-color: var(--border-strong); }

    .hero-stats {
      display: flex;
      gap: 18px;
    }
    .stat-card {
      text-align: center;
      min-width: 92px;
    }
    .stat-icon {
      color: var(--gold);
      font-size: 22px;
      margin-bottom: 6px;
    }
    .stat-num {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
    }
    .stat-label {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-top: 4px;
    }

    /* LAYOUT */
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 24px;
    }
    .main-col { min-width: 0; }
    .section { margin-bottom: 32px; }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 18px;
      margin-bottom: 16px;
    }
    .section-title {
      margin: 0;
      color: var(--gold-bright);
      font-family: var(--serif);
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-size: 22px;
    }
    .results-count {
      display: block;
      color: var(--gold);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .see-all {
      color: var(--gold);
      background: transparent;
      border: 0;
      cursor: pointer;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-family: inherit;
      transition: color 0.15s ease;
    }
    .see-all:hover { color: var(--gold-bright); }

    /* CATEGORIES */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 12px;
    }
    .category-card {
      position: relative;
      aspect-ratio: 1 / 1.15;
      overflow: hidden;
      border: 1px solid rgba(201, 162, 74, 0.24);
      background: var(--panel);
      box-shadow: 0 12px 38px rgba(0, 0, 0, 0.5);
      cursor: pointer;
      padding: 0;
      text-align: center;
      font-family: inherit;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .category-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.55) 60%, rgba(0, 0, 0, 0.95) 100%),
        var(--cat-bg);
      background-size: cover;
      background-position: center;
      filter: contrast(1.25) saturate(0.95) brightness(0.78);
      transition: transform 0.4s ease, filter 0.4s ease;
    }
    .category-card:hover {
      transform: translateY(-4px);
      border-color: rgba(201, 162, 74, 0.7);
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.6), 0 0 32px rgba(201, 162, 74, 0.12);
    }
    .category-card:hover::before {
      transform: scale(1.06);
      filter: contrast(1.35) saturate(1.05) brightness(0.88);
    }
    .category-card.active {
      border-color: rgba(201, 162, 74, 0.85);
      box-shadow: 0 0 0 1px rgba(201, 162, 74, 0.35), 0 22px 60px rgba(0, 0, 0, 0.55), inset 0 0 60px rgba(201, 162, 74, 0.12);
    }
    .cat-name, .cat-count {
      position: relative;
      z-index: 1;
      display: block;
    }
    .cat-name {
      position: absolute;
      bottom: 32px;
      left: 0; right: 0;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0 8px;
    }
    .cat-count {
      position: absolute;
      bottom: 12px;
      left: 0; right: 0;
      color: #c9beaa;
      font-size: 11px;
      letter-spacing: 0.05em;
    }

    /* ART GRID */
    .art-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    .art-card {
      position: relative;
      aspect-ratio: 1 / 1.08;
      overflow: hidden;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: var(--panel);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
      cursor: pointer;
      padding: 0;
      font: inherit;
      color: inherit;
      text-align: left;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .art-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.55) 55%, rgba(0, 0, 0, 0.95) 100%),
        var(--art);
      background-size: cover;
      background-position: center;
      filter: contrast(1.2) saturate(0.95) brightness(0.85);
      transition: transform 0.4s ease, filter 0.4s ease;
    }
    .art-card:hover { transform: translateY(-5px); border-color: rgba(201, 162, 74, 0.62); box-shadow: 0 28px 80px rgba(0, 0, 0, 0.7); }
    .art-card:hover::before { transform: scale(1.06); filter: contrast(1.3) saturate(1.05) brightness(0.95); }
    .art-content {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      z-index: 2;
      padding: 14px 16px;
    }
    .art-title {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 16px;
      line-height: 1.2;
      letter-spacing: 0.03em;
      margin-bottom: 6px;
    }
    .art-meta {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
    }
    .art-artist { color: #c9beaa; }
    .art-likes { color: var(--gold); white-space: nowrap; }
    .bookmark {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 3;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.45);
      background: rgba(0, 0, 0, 0.62);
      color: rgba(201, 162, 74, 0.55);
      font-size: 16px;
      cursor: pointer;
      transition: color 0.15s ease, transform 0.15s ease;
    }
    .bookmark:hover { color: var(--gold-bright); transform: scale(1.08); }
    .bookmark.on { color: #ff5c6b; border-color: rgba(255, 92, 107, 0.55); background: rgba(255, 92, 107, 0.1); }

    .load-more {
      display: block;
      margin: 24px auto 0;
      padding: 12px 28px;
      border: 1px solid rgba(201, 162, 74, 0.42);
      background: rgba(5, 4, 3, 0.6);
      color: var(--gold-bright);
      font-family: inherit;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s ease, border-color 0.15s ease;
    }
    .load-more:hover {
      background: rgba(201, 162, 74, 0.1);
      border-color: var(--gold);
    }

    .empty {
      padding: 60px 24px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed rgba(201, 162, 74, 0.3);
      background: rgba(8, 7, 6, 0.4);
    }

    /* SIDEBAR */
    .sidebar {
      position: sticky;
      top: 96px;
      align-self: start;
      display: grid;
      gap: 18px;
    }
    .side-panel {
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(19, 15, 11, 0.92), rgba(5, 4, 3, 0.96));
      padding: 18px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.55);
    }
    .side-panel h3 {
      margin: 0 0 14px;
      color: var(--gold-bright);
      font-family: var(--serif);
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-size: 14px;
    }
    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .panel-head h3 { margin: 0; }
    .reset-btn {
      background: transparent;
      border: 0;
      color: var(--gold);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      cursor: pointer;
      font-family: inherit;
    }
    .reset-btn:hover { color: var(--gold-bright); }

    .filter-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    .filter-row:last-child { margin-bottom: 0; }
    .filter-row label {
      color: var(--muted);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .filter-row select {
      height: 36px;
      border: 1px solid rgba(201, 162, 74, 0.28);
      background: rgba(5, 4, 3, 0.78);
      color: var(--text);
      padding: 0 10px;
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    .filter-row select:focus { border-color: var(--border-strong); }

    .color-palette {
      display: grid;
      grid-template-columns: repeat(9, minmax(0, 1fr));
      gap: 8px;
    }
    .color-dot {
      aspect-ratio: 1;
      border: 1px solid rgba(201, 162, 74, 0.32);
      cursor: pointer;
      padding: 0;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .color-dot:hover { transform: scale(1.12); border-color: var(--gold); }
    .color-dot.active { border-color: var(--gold-bright); box-shadow: 0 0 0 1px var(--gold-bright), 0 0 12px rgba(201, 162, 74, 0.4); }

    .artist-row, .col-row {
      display: grid;
      grid-template-columns: 32px 1fr;
      gap: 10px;
      align-items: center;
      padding: 8px 0;
      width: 100%;
      background: transparent;
      border: 0;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
      color: inherit;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: color 0.15s ease;
    }
    .artist-row:first-of-type, .col-row:first-of-type { border-top: 0; }
    .artist-row:hover, .col-row:hover { color: var(--gold-bright); }
    .artist-row.active, .col-row.active { color: var(--gold-bright); }

    .ar-avatar {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.26);
      background: rgba(201, 162, 74, 0.08);
      color: var(--gold);
      font-size: 11px;
      font-weight: 900;
      font-family: var(--serif);
      letter-spacing: 0.05em;
    }
    .col-icon {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.26);
      background: rgba(201, 162, 74, 0.08);
      color: var(--gold);
      font-size: 14px;
    }
    .ar-info, .col-info { display: flex; flex-direction: column; min-width: 0; }
    .ar-info strong, .col-info strong {
      color: #ead7a2;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ar-info small, .col-info small {
      color: var(--muted);
      font-size: 11px;
    }
    .empty-mini {
      color: var(--muted);
      font-size: 12px;
      font-style: italic;
    }

    /* FOOTER */
    .page-footer {
      margin-top: 48px;
      padding: 22px;
      border-top: 1px solid rgba(201, 162, 74, 0.2);
      color: var(--muted);
      text-align: center;
      font-size: 12px;
      line-height: 1.5;
    }

    /* MODAL VIEWER */
    .modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 28px;
      background: rgba(0, 0, 0, 0.94);
      backdrop-filter: blur(12px);
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .viewer {
      position: relative;
      width: min(1200px, 100%);
      max-height: 90vh;
      display: grid;
      grid-template-rows: 1fr auto;
      gap: 16px;
    }
    .viewer-img {
      flex: 1;
      aspect-ratio: 16/10;
      max-height: 70vh;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      border: 1px solid rgba(201, 162, 74, 0.42);
      background-color: #050403;
    }
    .viewer-info {
      padding: 14px 18px;
      border: 1px solid rgba(201, 162, 74, 0.28);
      background: rgba(8, 6, 4, 0.85);
    }
    .vi-title {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.04em;
      margin-bottom: 8px;
    }
    .vi-meta {
      color: #c9beaa;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .vi-dot { color: var(--muted); }
    .vi-actions {
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }
    .vi-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 16px;
      border: 1px solid rgba(201, 162, 74, 0.42);
      background: transparent;
      color: var(--gold-bright);
      font-family: inherit;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .vi-btn:hover { background: rgba(201, 162, 74, 0.1); }
    .vi-btn.on { color: #ff5c6b; border-color: rgba(255, 92, 107, 0.55); }

    .close, .nav-arrow {
      position: absolute;
      z-index: 102;
      border: 1px solid rgba(201, 162, 74, 0.45);
      background: rgba(0, 0, 0, 0.7);
      color: var(--gold-bright);
      cursor: pointer;
      font-family: inherit;
    }
    .close {
      top: 18px;
      right: 18px;
      width: 40px;
      height: 40px;
      font-size: 22px;
    }
    .close:hover { border-color: var(--gold); }
    .nav-arrow {
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 60px;
      font-size: 32px;
      line-height: 1;
    }
    .nav-arrow.left { left: 18px; }
    .nav-arrow.right { right: 18px; }
    .nav-arrow:hover { border-color: var(--gold); background: rgba(201, 162, 74, 0.1); }

    /* RESPONSIVE */
    @media (max-width: 1280px) {
      .category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .art-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    @media (max-width: 1024px) {
      .hero-content { grid-template-columns: 1fr; }
      .hero-stats { gap: 14px; }
      .stat-num { font-size: 24px; }
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: relative; top: auto; grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 760px) {
      .gallery-page { width: min(100% - 28px, 1440px); }
      .hero-content { padding: 24px; }
      .category-grid { grid-template-columns: repeat(2, 1fr); }
      .art-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
      .sidebar { grid-template-columns: 1fr; }
      .nav-arrow { width: 40px; height: 50px; font-size: 26px; }
      .nav-arrow.left { left: 8px; }
      .nav-arrow.right { right: 8px; }
    }

    /* CATEGORIZE MODAL */
    .cat-modal { z-index: 110; }
    .cat-box {
      position: relative;
      width: min(520px, calc(100% - 32px));
      padding: 28px 26px 22px;
      border: 1px solid rgba(201, 162, 74, 0.42);
      background: linear-gradient(180deg, rgba(19, 15, 11, 0.98), rgba(5, 4, 3, 0.99));
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.85);
      max-height: 90vh;
      overflow-y: auto;
    }
    .cat-box h3 {
      margin: 0 0 8px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 22px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .cat-hint {
      color: var(--muted);
      font-size: 13px;
      margin: 0 0 20px;
      line-height: 1.5;
    }
    .cat-row {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 14px;
    }
    .cat-row label {
      color: #c9beaa;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .cat-row .opt {
      color: var(--muted);
      font-weight: 400;
      letter-spacing: 0.05em;
      text-transform: none;
    }
    .cat-row select, .cat-row input[type="text"] {
      height: 38px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      background: rgba(5, 4, 3, 0.78);
      color: var(--text);
      padding: 0 12px;
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    .cat-row select:focus, .cat-row input[type="text"]:focus { border-color: var(--border-strong); }
    .cat-toggle {
      align-self: flex-start;
      background: transparent;
      border: 0;
      color: var(--gold);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      font-family: inherit;
      padding: 4px 0;
      margin-top: 4px;
    }
    .cat-toggle:hover { color: var(--gold-bright); }
    .cat-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid rgba(201, 162, 74, 0.18);
    }
    .vi-btn.primary {
      background: rgba(201, 162, 74, 0.18);
      border-color: var(--gold);
      color: var(--gold-bright);
    }
    .vi-btn.primary:hover { background: rgba(201, 162, 74, 0.28); }
    .vi-btn.ghost {
      background: transparent;
      border-color: rgba(201, 162, 74, 0.25);
      color: var(--muted);
    }
    .vi-btn.ghost:hover { color: var(--text); border-color: rgba(201, 162, 74, 0.45); }

    /* Hero import button */
    .search-bar-wrap {
      display: flex;
      gap: 10px;
      align-items: center;
      max-width: 720px;
    }
    .search-bar { flex: 1; }
    .import-btn-hero {
      height: 44px;
      padding: 0 18px;
      border: 1px solid var(--gold);
      background: rgba(201, 162, 74, 0.12);
      color: var(--gold-bright);
      font-family: inherit;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: background 0.15s ease;
    }
    .import-btn-hero:hover { background: rgba(201, 162, 74, 0.22); }
    .import-btn-hero span { font-size: 16px; line-height: 1; }

    /* Chips input */
    .chip-input {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
      padding: 6px 8px;
      min-height: 38px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      background: rgba(5, 4, 3, 0.78);
    }
    .chip-input input {
      flex: 1;
      min-width: 120px;
      height: 26px;
      border: 0;
      background: transparent;
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      outline: none;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 4px 3px 9px;
      background: rgba(201, 162, 74, 0.18);
      border: 1px solid rgba(201, 162, 74, 0.5);
      color: var(--gold-bright);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .chip-x {
      width: 18px;
      height: 18px;
      display: grid;
      place-items: center;
      background: transparent;
      border: 0;
      color: var(--gold);
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
    }
    .chip-x:hover { color: #ff5c6b; }
    .chip-add {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.5);
      background: rgba(201, 162, 74, 0.12);
      color: var(--gold-bright);
      font-size: 14px;
      cursor: pointer;
      font-family: inherit;
    }
    .chip-add:hover { background: rgba(201, 162, 74, 0.22); }

    /* Import modal */
    .import-modal { z-index: 110; }
    .import-box {
      position: relative;
      width: min(900px, calc(100% - 32px));
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px 26px 22px;
      border: 1px solid rgba(201, 162, 74, 0.42);
      background: linear-gradient(180deg, rgba(19, 15, 11, 0.98), rgba(5, 4, 3, 0.99));
      box-shadow: 0 30px 90px rgba(0, 0, 0, 0.85);
    }
    .import-box h3 {
      margin: 0 0 8px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 22px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .import-tabs {
      display: flex;
      gap: 4px;
      margin: 16px 0 18px;
      border-bottom: 1px solid rgba(201, 162, 74, 0.2);
    }
    .import-tabs button {
      padding: 10px 18px;
      background: transparent;
      border: 0;
      border-bottom: 2px solid transparent;
      color: var(--muted);
      font-family: inherit;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: color 0.15s ease, border-color 0.15s ease;
    }
    .import-tabs button:hover { color: var(--text); }
    .import-tabs button.active {
      color: var(--gold-bright);
      border-bottom-color: var(--gold);
    }

    .import-content { min-height: 200px; }
    .wiki-search {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }
    .wiki-search input {
      flex: 1;
      height: 40px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      background: rgba(5, 4, 3, 0.78);
      color: var(--text);
      padding: 0 14px;
      font: inherit;
      font-size: 14px;
      outline: none;
    }

    .reddit-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    .reddit-card {
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 8px;
      padding: 10px;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: rgba(5, 4, 3, 0.6);
    }
    .reddit-card.wide {
      grid-template-columns: 200px 1fr;
      grid-template-rows: auto;
      gap: 14px;
      align-items: stretch;
    }
    .reddit-thumb {
      aspect-ratio: 16 / 10;
      background-size: cover;
      background-position: center;
      background-color: #050403;
      border: 1px solid rgba(201, 162, 74, 0.18);
    }
    .reddit-thumb.large {
      aspect-ratio: 1 / 1;
      grid-row: span 2;
    }
    .reddit-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .reddit-title {
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .reddit-meta {
      color: var(--muted);
      font-size: 11px;
    }
    .import-btn { justify-self: stretch; height: 32px; font-size: 11px; }
    .import-btn:disabled { opacity: 0.5; cursor: wait; }

    .import-message {
      margin-top: 16px;
      padding: 10px 14px;
      border: 1px solid rgba(15, 107, 67, 0.5);
      background: rgba(15, 107, 67, 0.15);
      color: #80e0ad;
      font-size: 13px;
    }
    .import-message.error {
      border-color: rgba(170, 45, 45, 0.55);
      background: rgba(123, 17, 19, 0.25);
      color: #ff8a8a;
    }
  `],
})
export class GalleryComponent {
  private readonly service = inject(WarhammerService);

  readonly categories = CATEGORIES;
  readonly palette = PALETTE;

  private readonly catalogArtworks = toSignal(this.service.artworks$, { initialValue: [] as Artwork[] });
  private readonly localImages = toSignal(this.service.images$, { initialValue: [] as string[] });
  readonly collections = toSignal(this.service.artworkCollections$, { initialValue: [] as ArtworkCollection[] });
  readonly artists = toSignal(this.service.artworkArtists$, { initialValue: [] as ArtworkArtist[] });

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

  readonly allCategories = computed<string[]>(() => [
    ...CATEGORIES.filter(c => c.key !== 'Mes images').map(c => c.key as string),
    ...this.customCategories(),
  ]);

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
  readonly filterCategory = signal<ArtworkCategory | null>(null);
  readonly filterFaction = signal<string>('');
  readonly filterArtist = signal<string>('');
  readonly filterCollection = signal<string>('');
  readonly filterColor = signal<string>('');
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
    !!(this.filterCategory() || this.filterFaction() || this.filterArtist() || this.filterCollection() || this.filterColor() || this.searchQuery().trim()),
  );

  readonly filteredArtworks = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.filterCategory();
    const fac = this.filterFaction();
    const artist = this.filterArtist();
    const coll = this.filterCollection();
    const color = this.filterColor();

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
    if (cat) list = list.filter(a => a.category === cat || (a.extraCategories ?? []).includes(cat));
    if (fac) list = list.filter(a => a.faction === fac);
    if (artist) list = list.filter(a => a.artist === artist);
    if (coll) list = list.filter(a => a.collectionId === coll);
    if (color) list = list.filter(a => Array.isArray(a.colors) && a.colors.includes(color));

    const sort = this.sortBy();
    if (sort === 'popular') list.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    else if (sort === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));

    return list;
  });

  readonly totalFiltered = computed(() => this.filteredArtworks().length);
  readonly pagedArtworks = computed(() => this.filteredArtworks().slice(0, this.pageCount() * PAGE_SIZE));
  readonly canLoadMore = computed(() => this.pagedArtworks().length < this.filteredArtworks().length);

  constructor() {
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

  categoryBg(key: ArtworkCategory): string {
    const url = this.imgCache()[`cat:${key}`];
    return url ? `url('${url}')` : 'linear-gradient(135deg, #1a0a08 0%, #050403 100%)';
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

  categoryCount(key: ArtworkCategory): number {
    return this.artworks().filter(a => a.category === key || (a.extraCategories ?? []).includes(key)).length;
  }

  toggleCategoryFilter(key: ArtworkCategory): void {
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

  toggleColorFilter(hex: string): void {
    this.filterColor.set(this.filterColor() === hex ? '' : hex);
    this.pageCount.set(1);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterCategory.set(null);
    this.filterFaction.set('');
    this.filterArtist.set('');
    this.filterCollection.set('');
    this.filterColor.set('');
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
