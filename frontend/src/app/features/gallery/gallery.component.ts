import { afterNextRender, ChangeDetectorRef, Component, DestroyRef, ElementRef, inject, signal, computed, effect, HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { toSafeSignal } from '../../shared/safe-signal';
import { CommonModule, ViewportScroller } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, NavigationCancel, NavigationCancellationCode, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router } from '@angular/router';
import { BehaviorSubject, catchError, concat, filter, map, of, switchMap, type Observable } from 'rxjs';
import { PinService } from '../../core/services/pin.service';
import { WarhammerService, ImageMeta, RedditPost, SuggestedCategories } from '../../core/services/warhammer.service';
import { GalleryModalDirective } from './gallery-modal.directive';
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

const PAGE_SIZE = 24;
type SortBy = 'recent' | 'popular' | 'alpha';

@Component({
  selector: 'app-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, GalleryModalDirective],
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
              @if (catalogOk()) {
                {{ artworks().length }} {{ artworks().length > 1 ? 'œuvres triées, classées et archivées' : 'œuvre triée, classée et archivée' }}.
              }
            </p>
            <div class="search-bar-wrap">
              <!-- L45/t1 (WCAG 1.3.1 / 2.5.3 / 3.3.2) : libellé VISIBLE relié au champ, qui en fait le nom
                   accessible ; le placeholder (disparaît à la saisie, coupé à 390 px) reste une indication. -->
              <div class="search-field">
              <label class="search-label" for="gallery-search">Rechercher</label>
              <div class="search-bar">
                <span class="s-icon" aria-hidden="true">⌕</span>
                <input
                  id="gallery-search" data-testid="recherche"
                  type="text"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="onSearchChange($event)"
                  placeholder="Rechercher une œuvre, un artiste, une faction…" />
              </div>
              </div>
              @if (editMode()) {
                <button type="button" class="import-btn-hero" (click)="openImport()">
                  <span>+</span> Importer
                </button>
              }
              <!-- L49 (WCAG 2.4.3) : bouton à divulgation, au téléphone seulement, juste avant le panneau Filtres. -->
              <button type="button" class="import-btn-hero btn-filtres" data-testid="bouton-filtres"
                [attr.aria-expanded]="filtersOpen()" aria-controls="panneau-filtres"
                (click)="toggleFilters()">
                Filtres
                @if (activeFilterCount() > 0) {
                  <span class="count" data-testid="compteur-filtres-actifs">{{ activeFilterCount() }}</span>
                }
                <span class="caret" aria-hidden="true">{{ filtersOpen() ? '▲' : '▼' }}</span>
              </button>
            </div>
            @if (catalogReady() && totalFiltered() === 0) {
              <!-- L49/R12 : au téléphone, le vide se voit dans le premier écran, sous la recherche. -->
              <div class="rappel-vide" data-testid="rappel-vide">
                <span class="rv-text">{{ emptyFactionName() ? 'Aucune illustration de la faction ' + emptyFactionName() + ' pour l’instant' : 'Aucune œuvre ne correspond' }}</span>
                <button type="button" class="reset-btn" data-testid="bouton-reinitialiser-rappel" (click)="resetFilters()">Réinitialiser les filtres</button>
              </div>
            }
          </div>
          <aside class="hero-stats" [class.filtres-ouverts]="filtersOpen()">
            <div class="stat-card">
              <div class="stat-icon">▦</div>
              <div class="stat-num">{{ catalogOk() ? artworks().length : '–' }}</div>
              <div class="stat-label">Œuvres</div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">◐</div>
              <div class="stat-num">{{ catalogOk() ? artists().length : '–' }}</div>
              <div class="stat-label">Artistes</div>
            </div>
            @if (nonEmptyCollections().length > 0 || !catalogOk()) {
            <div class="stat-card">
              <div class="stat-icon">◇</div>
              <div class="stat-num">{{ catalogOk() ? nonEmptyCollections().length : '–' }}</div>
              <div class="stat-label">Collections</div>
            </div>
            }
          </aside>
        </div>
      </header>

      <!-- LAYOUT MAIN + SIDEBAR -->
      <section class="layout" data-testid="mise-en-page">
        <!-- L49 : le panneau Filtres précède la grille dans le DOM (ordre de tabulation, WCAG 2.4.3) ;
             la grille CSS le replace en haut de la colonne de droite. -->
        <section class="side-panel p-filtres" [class.ferme]="!filtersOpen()" id="panneau-filtres" data-testid="panneau-filtres" aria-labelledby="filtres-titre">
          <div class="panel-head">
            <h3 id="filtres-titre">Filtres</h3>
            @if (hasActiveFilters()) {
              <button class="reset-btn" type="button" data-testid="bouton-reinitialiser" (click)="resetFilters()">Réinitialiser</button>
            }
          </div>
          <!-- L45 (WCAG 1.3.1 / 4.1.2 / 3.3.2) : chaque libellé visible est associé à sa liste (for/id). -->
          <div class="filter-row">
            <label for="gallery-filter-faction">Faction</label>
            <select id="gallery-filter-faction" data-testid="filtre-faction" [disabled]="!catalogReady()" [ngModel]="unknownFaction() ? '' : factionKey(filterFaction())" (ngModelChange)="onFactionChange($event)">
              <option value="">Toutes</option>
              @for (f of factionOptions(); track f) {
                <option [value]="f">{{ factionName(f) }}</option>
              }
            </select>
          </div>
          <div class="filter-row">
            <label for="gallery-filter-category">Catégorie</label>
            <select id="gallery-filter-category" data-testid="filtre-categorie" [disabled]="!catalogReady()" [ngModel]="filterCategory() ?? ''" (ngModelChange)="onCategoryChange($event)">
              <option value="">Toutes</option>
              @for (c of categoryOptions(); track c.key) {
                <option [value]="c.key">{{ c.label }}</option>
              }
            </select>
          </div>
          <div class="filter-row">
            <label for="gallery-filter-sort">Trier par</label>
            <select id="gallery-filter-sort" data-testid="filtre-tri" [disabled]="!catalogReady()" [ngModel]="sortBy()" (ngModelChange)="onSortChange($event)">
              <option value="recent">Plus récentes</option>
              <option value="popular">Populaires</option>
              <option value="alpha">A — Z</option>
            </select>
          </div>
          @if (catalogReady()) {
            <!-- L49/R6 : rappel visible au téléphone ; aria-hidden, la région d'état de la grille reste la seule annoncée. -->
            <p class="panel-count" data-testid="resultats-panneau" aria-hidden="true">{{ resultsLabel() }}</p>
          }
        </section>

        <div class="main-col">
          <!-- L42 (relecture) : ?faction= inconnu → dit, jamais une grille vide muette.
               Revue UX R5 (WCAG 4.1.3) : la région d'état existe dès le premier rendu, vide ; le
               texte y entre ensuite (liveReady), sinon il naît avec elle et n'est pas annoncé. -->
          <div role="status" data-testid="faction-status" [class.empty]="liveReady() && unknownFaction()" [class.section]="liveReady() && unknownFaction()">
            @if (liveReady() && unknownFaction(); as unknown) {
              <p>Faction inconnue : « {{ unknown }} ». Ce lien ne correspond à aucune faction du codex : toute la galerie est affichée.</p>
              <button class="see-all" type="button" (click)="onFactionChange('')">Retirer ce filtre</button>
            }
          </div>

          <!-- CATEGORIES -->
          <section class="section">
            <h2 class="section-title">Parcourir par catégorie</h2>
            <div class="category-grid" [class.attente]="!catalogReady() || catalogFailed()">
              @if (catalogReady()) {
                @for (cat of availableCategories(); track cat.key) {
                  <button class="category-card"
                    type="button"
                    [class.active]="filterCategory() === cat.key"
                    [attr.aria-pressed]="filterCategory() === cat.key"
                    [style.--cat-bg]="categoryBg(cat.key)"
                    (click)="toggleCategoryFilter(cat.key)">
                    <span class="cat-name">{{ cat.label }}</span>
                    <span class="cat-count">{{ categoryCount(cat.key) }} œuvre{{ categoryCount(cat.key) > 1 ? 's' : '' }}</span>
                  </button>
                }
              } @else {
                <!-- L49/R8-R9 : pendant la lecture (ou son échec) les cartes restent là, désactivées, sans effectif. -->
                @for (cat of categories; track cat.key) {
                  <button class="category-card" type="button" disabled [style.--cat-bg]="categoryBg(cat.key)">
                    <span class="cat-name">{{ cat.label }}</span>
                    <span class="cat-count">–</span>
                  </button>
                }
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
                <!-- L45/t4 (WCAG 4.1.3) : région d'état PERSISTANTE — le nombre de résultats, ou le
                     message « aucune œuvre » (visible plus bas, ici pour lecteur d'écran), est annoncé
                     après chaque recherche ou filtre. -->
                <span class="results-count" role="status" data-testid="resultats-statut">
                  @if (!catalogReady()) {
                    &nbsp;
                  } @else if (totalFiltered() > 0) {
                    {{ resultsLabel() }}
                  } @else if (emptyFactionName()) {
                    <span class="sr-only">Aucune illustration de la faction {{ emptyFactionName() }} pour l’instant.</span>
                  } @else {
                    <span class="sr-only">Aucune œuvre ne correspond à ces filtres.</span>
                  }
                </span>
              </div>
              @if (catalogReady() && hasActiveFilters()) {
                <button class="see-all" type="button" (click)="resetFilters()">Réinitialiser →</button>
              }
            </header>

            @if (catalogFailed()) {
              <!-- R9 : l'échec n'est jamais avalé, même quand des images perso restent affichées dessous. -->
              <div class="empty">
                <p data-testid="message-erreur" role="alert">Impossible de charger la galerie.</p>
                <button type="button" class="import-btn-hero" data-testid="bouton-reessayer" (click)="retryCatalog()">Réessayer</button>
              </div>
            }
            @if (imagesFailed()) {
              <div class="empty">
                <p data-testid="message-erreur-images" role="alert">Impossible de charger Mes images.</p>
                <button type="button" class="import-btn-hero" data-testid="bouton-reessayer-images" (click)="retryImages()">Réessayer</button>
              </div>
            }
            @if (catalogLoading()) {
              <p class="state-msg" data-testid="message-chargement" role="status">Chargement de la galerie…</p>
              <div class="art-grid" aria-hidden="true">
                @for (n of skeletons; track n) { <div class="skel"></div> }
              </div>
            } @else if (catalogFailed() && !catalogReady()) {
              <!-- erreur et Réessayer : affichés au-dessus, ni grille ni état vide -->
            } @else if (emptyFactionName()) {
              <!-- L42 (revue UX R3) : faction connue sans illustration → nommée, avec une sortie. -->
              <div class="empty" data-testid="faction-vide">
                <p>Aucune illustration de la faction {{ emptyFactionName() }} pour l’instant.</p>
                <button class="see-all" type="button" (click)="onFactionChange('')">Retirer ce filtre</button>
              </div>
            } @else if (totalFiltered() === 0) {
              <div class="empty" data-testid="message-vide">Aucune œuvre ne correspond à ces filtres.</div>
            } @else {
              <div class="art-grid" data-testid="grille-oeuvres">
                @for (art of pagedArtworks(); track art.id; let i = $index) {
                  <article class="art-card"
                    [style.--art]="artBg(art)">
                    <!-- L7/t1 (WCAG 2.1.1 / 4.1.2) : vrai bouton nommé par le titre, étiré sur toute la carte ;
                         seul bouton de la carte. -->
                    <button type="button" class="art-open" [attr.data-art-id]="art.id" (click)="openViewer(art, i)">{{ art.title }}</button>
                    <div class="art-content">
                      <div class="art-title" aria-hidden="true">{{ art.title }}</div>
                      <div class="art-meta">
                        <span class="art-artist">{{ art.artist }}</span>
                        <span class="art-likes">♥ {{ art.likes ?? 0 }}</span>
                      </div>
                    </div>
                  </article>
                }
              </div>
              @if (totalPages() > 1) {
                <nav class="pagination" aria-label="Pagination galerie">
                  <button type="button" class="page-btn" [disabled]="currentPage() === 1" (click)="goToPage(1)" aria-label="Première page">«</button>
                  <button type="button" class="page-btn" [disabled]="currentPage() === 1" (click)="prevPage()" aria-label="Page précédente">‹</button>
                  <span class="page-indicator">
                    Page <strong>{{ currentPage() }}</strong> sur <strong>{{ totalPages() }}</strong> ·
                    <span class="page-range">{{ pageRangeStart() }}–{{ pageRangeEnd() }} sur <strong>{{ totalFiltered() }}</strong></span>
                  </span>
                  <button type="button" class="page-btn" [disabled]="currentPage() === totalPages()" (click)="nextPage()" aria-label="Page suivante">›</button>
                  <button type="button" class="page-btn" [disabled]="currentPage() === totalPages()" (click)="goToPage(totalPages())" aria-label="Dernière page">»</button>
                </nav>
              }
            }
          </section>
        </div>

        <!-- SIDEBAR : Artistes et Collections restent après la grille (L49/R10) -->
        <aside class="sidebar">
          <section class="side-panel">
            <h3>Artistes à découvrir</h3>
            @if (artists().length === 0) {
              <div class="empty-mini">Aucun artiste indexé.</div>
            }
            @for (a of topArtists(); track a.id) {
              <button class="artist-row" type="button"
                [class.active]="filterArtist() === a.name"
                [attr.aria-pressed]="filterArtist() === a.name"
                (click)="toggleArtistFilter(a.name)">
                <span class="ar-avatar">{{ initials(a.name) }}</span>
                <span class="ar-info">
                  <strong>{{ a.name }}</strong>
                  <small>{{ a.artworkCount }} œuvre{{ a.artworkCount > 1 ? 's' : '' }}</small>
                </span>
              </button>
            }
          </section>

          @if (nonEmptyCollections().length > 0) {
          <section class="side-panel">
            <h3>Collections populaires</h3>
            @for (col of nonEmptyCollections(); track col.id) {
              <button class="col-row" type="button"
                [class.active]="filterCollection() === col.id"
                [attr.aria-pressed]="filterCollection() === col.id"
                (click)="toggleCollectionFilter(col.id)">
                <span class="col-icon">▤</span>
                <span class="col-info">
                  <strong>{{ col.name }}</strong>
                  <small>{{ col.count }} œuvre{{ col.count > 1 ? 's' : '' }}</small>
                </span>
              </button>
            }
          </section>
          }
        </aside>
      </section>

      <footer class="page-footer">
        Site fan non officiel Warhammer 40,000. Toutes les images appartiennent à leurs auteurs respectifs.
        <button class="edit-toggle" type="button" [attr.aria-pressed]="editMode()" (click)="toggleEditMode()">{{ editMode() ? 'Quitter l’édition' : 'Mode édition' }}</button>
      </footer>
    </section>

    <!-- VIEWER MODAL -->
    @if (selectedArt(); as art) {
      <dialog class="modal" appGalleryModal role="dialog" aria-modal="true" aria-labelledby="viewer-titre"
        (dismiss)="closeViewer()" (click)="onModalBackdrop($event)">
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
            <div class="vi-title" id="viewer-titre">{{ art.title }}</div>
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
              @if (art.isLocal && editMode()) {
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
      </dialog>
    }

    <!-- CATEGORIZE MODAL -->
    @if (catModalOpen()) {
      <dialog class="modal cat-modal" appGalleryModal role="dialog" aria-modal="true" aria-labelledby="cat-titre"
        (dismiss)="closeCategorize()" (click)="onCatBackdrop($event)">
        <div class="cat-box" (click)="$event.stopPropagation()">
          <button class="close" type="button" (click)="closeCategorize()" aria-label="Fermer">×</button>
          <h3 id="cat-titre">Catégoriser l'image</h3>
          <p class="cat-hint">Assigne plusieurs catégories, un titre, un artiste ou une faction. Tape une nouvelle catégorie et appuie sur Entrée.</p>

          <div class="cat-row cat-combo-row">
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
                placeholder="Tape pour filtrer ou choisir…"
                [ngModel]="catInput()"
                (ngModelChange)="catInput.set($event); catDropdownOpen.set(true)"
                (focus)="catDropdownOpen.set(true)"
                (keydown.enter)="$event.preventDefault(); addCatTag()"
                (keydown.escape)="onCatEscape($event)" />
              @if (catInput().trim()) {
                <button type="button" class="chip-add" (click)="addCatTag()" aria-label="Ajouter">+</button>
              }
            </div>

            @if (catDropdownOpen() && catSections().length > 0) {
              <div class="cat-dropdown" (click)="$event.stopPropagation()">
                @for (section of catSections(); track section.key) {
                  <div class="cat-section">
                    <div class="cat-section-header">
                      {{ section.label }}
                      <span class="cat-section-count">{{ section.items.length }}</span>
                    </div>
                    <ul class="cat-section-items">
                      @for (item of section.items; track item) {
                        <li
                          class="cat-section-item"
                          [class.selected]="catSelectedTags().includes(item)"
                          (click)="toggleCatFromSuggestion(item)">
                          <span class="cat-item-name">{{ item }}</span>
                          @if (catSelectedTags().includes(item)) {
                            <span class="cat-item-check">✓</span>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              </div>
            }
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

          @if (catError()) {
            <p class="import-message error" role="alert">{{ catError() }}</p>
          }
          <div class="cat-actions">
            <button type="button" class="vi-btn ghost" (click)="closeCategorize()">Annuler</button>
            <button type="button" class="vi-btn primary" (click)="saveCategorize()">Enregistrer</button>
          </div>
        </div>
      </dialog>
    }

    <!-- IMPORT MODAL -->
    @if (importModalOpen()) {
      <dialog class="modal import-modal" appGalleryModal role="dialog" aria-modal="true" aria-labelledby="import-titre"
        (dismiss)="closeImport()" (click)="onImportBackdrop($event)">
        <div class="import-box" (click)="$event.stopPropagation()">
          <button class="close" type="button" (click)="closeImport()" aria-label="Fermer">×</button>
          <h3 id="import-titre">Importer une image</h3>
          <p class="cat-hint">Recherche sur le wiki Warhammer (Fandom), parcours r/Warhammer40k, ou colle une URL directe.</p>

          <div class="import-tabs" role="tablist" aria-label="Source de l'image">
            <button type="button" role="tab" id="import-tab-wiki" aria-controls="import-panel" [attr.aria-selected]="importTab() === 'wiki'"
              [class.active]="importTab() === 'wiki'" (click)="setImportTab('wiki')">⌕ Wiki</button>
            <button type="button" role="tab" id="import-tab-reddit" aria-controls="import-panel" [attr.aria-selected]="importTab() === 'reddit'"
              [class.active]="importTab() === 'reddit'" (click)="setImportTab('reddit')">▲ Reddit</button>
            <button type="button" role="tab" id="import-tab-url" aria-controls="import-panel" [attr.aria-selected]="importTab() === 'url'"
              [class.active]="importTab() === 'url'" (click)="setImportTab('url')">↗ URL</button>
          </div>

          <div id="import-panel" role="tabpanel" [attr.aria-labelledby]="'import-tab-' + importTab()">
          @if (importTab() === 'reddit') {
            <div class="import-content">
              @if (importRedditLoading()) {
                <div class="empty">Chargement de r/Warhammer40k…</div>
              } @else if (importRedditError()) {
                <div class="empty"><p class="import-message error" role="alert">{{ importRedditError() }}</p>
                  <button type="button" class="cat-toggle" (click)="loadRedditPosts()">Réessayer</button></div>
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
          </div>

          @if (importMessage()) {
            <div class="import-message" [class.error]="importMessage().startsWith('Échec')">
              {{ importMessage() }}
            </div>
          }
        </div>
      </dialog>
    }
  `,
  styleUrls: ['./gallery.component.scss'],
})
export class GalleryComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly viewportScroller = inject(ViewportScroller);
  private readonly pinService = inject(PinService);

  /** L144 : l'édition (importer, catégoriser) n'est offerte qu'une fois le PIN saisi, comme Vidéos. */
  readonly editMode = computed(() => !!this.pinService.pin());
  /** Échec du dernier « Enregistrer » de « Catégoriser » (vide : aucun). */
  readonly catError = signal('');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Anti-rebond de la réécriture de ?q= pendant la frappe (une navigation, pas une par touche). */
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  /** Dernière adresse écrite par syncUrl() (pour reconnaître son écho dans queryParamMap). */
  private written: { q: string; faction: string } | null = null;
  /** Adresse visée par la dernière réécriture de syncUrl() (pour reconnaître SA navigation). */
  private ownUrl: string | null = null;
  /** L48 : une navigation d'ailleurs (sortie de la page) est en vol — syncUrl() ne doit pas la supplanter. */
  private leaving = false;
  /** L48 : une réécriture demandée pendant cette navigation, rejouée si elle n'emmène pas ailleurs. */
  private syncDeferred = false;
  /** L48 : une frappe attend son anti-rebond (la réécriture de ?q= n'est pas encore partie). */
  private searchPending = false;
  /** L48 : rétablissement du défilement après une réécriture d'adresse (annulé si la page est quittée). */
  private scrollTimer: ReturnType<typeof setTimeout> | undefined;

  readonly categories = CATEGORIES;

  // L49/R9 : le catalogue a trois états (lecture, lu, échec) ; « Réessayer » le relit. Source en échec →
  // liste vide (toSignal relancerait l'erreur à chaque lecture), mais l'échec n'est plus pris pour un vide.
  private readonly catalogReload = new BehaviorSubject<void>(undefined);
  private readonly catalogState = toSignal(
    this.catalogReload.pipe(
      switchMap(() =>
        concat(
          of({ status: 'loading' as const, list: [] as Artwork[] }),
          this.service.artworks$.pipe(
            map((list) => ({ status: 'ok' as const, list })),
            catchError(() => of({ status: 'error' as const, list: [] as Artwork[] })),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' as const, list: [] as Artwork[] } },
  );
  private readonly catalogArtworks = computed(() => this.catalogState().list);
  readonly catalogLoading = computed(() => this.catalogState().status === 'loading');
  /**
   * Faux pendant la lecture et en cas d'échec : listes, pastilles et cartes de catégorie restent muettes.
   * Exception (L42) : catalogue en échec mais images perso présentes → elles restent affichées, comme avant.
   */
  readonly catalogReady = computed(() => {
    const status = this.catalogState().status;
    return status === 'ok' || (status === 'error' && this.artworks().length > 0);
  });
  /** R9 : l'échec se dit toujours (message + Réessayer), les images perso restent affichées dessous. */
  readonly catalogFailed = computed(() => this.catalogState().status === 'error');
  readonly skeletons = [1, 2, 3, 4, 5, 6];
  /** Le DOM suit tout de suite le clic (aria-expanded lu par les lecteurs d'écran), sans attendre le tick regroupé. */
  toggleFilters(): void {
    this.filtersOpen.set(!this.filtersOpen());
    this.cdr.detectChanges();
  }
  retryCatalog(): void { this.catalogReload.next(); }
  /** L49 : panneau Filtres déplié (téléphone ; au-dessus de 760 px il est toujours affiché). */
  readonly filtersOpen = signal(false);
  // L48 : une lecture des images personnelles en échec se dit (message + Réessayer) au lieu d'une liste vide muette.
  private readonly imagesReload = new BehaviorSubject<void>(undefined);
  private readonly imagesState = toSignal(
    this.imagesReload.pipe(
      switchMap(() => this.service.images$.pipe(
        map((list) => ({ failed: false, list })),
        catchError(() => of({ failed: true, list: [] as string[] })),
      )),
    ),
    { initialValue: { failed: false, list: [] as string[] } },
  );
  private readonly localImages = computed(() => this.imagesState().list);
  readonly imagesFailed = computed(() => this.imagesState().failed);
  retryImages(): void { this.imagesReload.next(); }
  readonly collections = toSafeSignal(this.service.artworkCollections$, [] as ArtworkCollection[]);
  /** L64 : une collection à 0 œuvre est une impasse (filtre → grille vide) — jamais proposée ni comptée. */
  readonly nonEmptyCollections = computed(() => this.collections().filter((c) => c.count > 0));
  readonly artists = toSafeSignal(this.service.artworkArtists$, [] as ArtworkArtist[]);
  readonly factions = toSignal(this.service.factions$.pipe(catchError(() => of([] as Faction[]))), { initialValue: [] as Faction[] });
  /** Vrai dès la première valeur OU l'échec d'une source (une source en échec ne bloque rien). */
  private static settled(source: Observable<unknown>) {
    return toSignal(source.pipe(map(() => true), catchError(() => of(true))), { initialValue: false });
  }
  private readonly catalogLoaded = computed(() => this.catalogState().status !== 'loading');
  private readonly factionsLoaded = GalleryComponent.settled(this.service.factions$);
  private readonly imagesLoaded = GalleryComponent.settled(this.service.images$);
  private readonly metaLoaded = signal(false);
  /** 3e relecture : source VRAIMENT chargée (fausse en attente comme en échec). */
  private static loadedOk(source: Observable<unknown>) {
    return toSignal(source.pipe(map(() => true), catchError(() => of(false))), { initialValue: false });
  }
  /** R9 : le catalogue a répondu ; faux pendant la lecture et en cas d'échec, même si des images perso sont là. */
  readonly catalogOk = computed(() => this.catalogState().status === 'ok');
  private readonly factionsOk = GalleryComponent.loadedOk(this.service.factions$);
  /**
   * 2e relecture : toutes les sources qui peuvent rendre une faction valide ou illustrée sont là
   * (ou en échec) — codex, catalogue, images perso et leurs métadonnées (faction en texte libre).
   * Avant elles, aucun verdict « inconnue » / « aucune illustration » (annoncé puis démenti).
   */
  private readonly factionSourcesSettled = computed(() =>
    this.factionsLoaded() && this.catalogLoaded() && this.imagesLoaded() && this.metaLoaded());

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
        artist: m?.artist || 'Mes images',
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
      // L45 : titre, artiste, catégorie ET faction comparés sans casse, accents, ligatures ni
      // apostrophe typographique (« celestine », « soeurs ») ; la faction aussi par son NOM affiché
      // (« T'au »), l'identifiant marchant toujours.
      const nq = GalleryComponent.foldText(q);
      const has = (v: string | undefined) => !!v && GalleryComponent.foldText(v).includes(nq);
      const matchesFaction = (raw: string | undefined) => {
        if (!raw) return false;
        const key = this.factionKey(raw);
        return [raw, key, this.factionName(key)].some(has);
      };
      list = list.filter(a =>
        has(a.title) ||
        has(a.artist) ||
        matchesFaction(a.faction) ||
        has(a.category) ||
        (a.extraCategories ?? []).some(has)
      );
    }
    if (fac && !this.unknownFaction()) {
      const key = this.factionKey(fac);
      list = list.filter(a => this.factionKey(a.faction) === key);
    }
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
  // Suggested categories (sectioned) loaded from backend at init
  readonly suggestedCategories = signal<SuggestedCategories | null>(null);
  // Combobox popover state
  readonly catDropdownOpen = signal(false);
  // Sections sectionnées + filtrées dynamiquement par catInput()
  readonly catSections = computed<{ key: string; label: string; items: string[] }[]>(() => {
    const filter = this.catInput().trim().toLowerCase();
    const data = this.suggestedCategories();
    const matches = (item: string) =>
      filter === '' || item.toLowerCase().includes(filter);
    const all: { key: string; label: string; items: string[] }[] = [
      // Built-in du frontend (visuels globaux) — toujours en tête
      {
        key: 'builtin',
        label: 'Catégories de base',
        items: CATEGORIES.filter(c => c.key !== 'Mes images').map(c => c.key as string),
      },
    ];
    if (data) {
      all.push(
        { key: 'factions', label: 'Factions', items: data.factions },
        { key: 'subfactions', label: 'Sous-factions / Chapitres / Légions', items: data.subfactions },
        { key: 'primarchs', label: 'Primarques', items: data.primarchs },
        { key: 'custom', label: 'Tes catégories', items: data.custom },
      );
    }
    return all
      .map(s => ({ ...s, items: s.items.filter(matches) }))
      .filter(s => s.items.length > 0);
  });

  // Import modal state
  readonly importModalOpen = signal(false);
  readonly importTab = signal<'wiki' | 'reddit' | 'url'>('wiki');
  readonly importWikiQuery = signal('');
  readonly importWikiResult = signal<{ imageUrl: string | null; pageTitle: string | null; pageUrl: string | null } | null>(null);
  readonly importWikiLoading = signal(false);
  readonly importRedditPosts = signal<RedditPost[]>([]);
  readonly importRedditLoading = signal(false);
  /** Message du serveur quand Reddit refuse ou n'est pas joignable ; vide hors échec. */
  readonly importRedditError = signal('');
  readonly importUrlInput = signal('');
  readonly importPending = signal<string | null>(null); // url being imported
  readonly importMessage = signal<string>('');

  readonly searchQuery = signal('');
  readonly filterCategory = signal<string | null>(null);
  readonly filterFaction = signal<string>('');
  readonly filterArtist = signal<string>('');
  readonly filterCollection = signal<string>('');
  readonly sortBy = signal<SortBy>('recent');
  /** Page courante (1-indexed) — pagination numérotée plutôt que load-more. */
  readonly currentPage = signal(1);

  readonly selectedArt = signal<Artwork | null>(null);
  private viewerIndex = 0;

  readonly heroBgUrl = signal<string>('linear-gradient(135deg, #1a0a08 0%, #050403 100%)');
  private readonly imgCache = signal<Record<string, string>>({});
  private readonly imgInflight = new Set<string>();

  /** Cap simultaneous wiki-image fetches to ease load on the backend proxy. */
  private static readonly FETCH_QUEUE_LIMIT = 6;
  private fetchActive = 0;
  private readonly fetchQueue: Array<() => void> = [];

  /**
   * L45 : forme de comparaison d'un texte (recherche, noms de faction) — casse, accents, ligatures
   * (œ, æ), apostrophe typographique et espaces de bord ignorés (« Sœurs » = « soeurs », « Khârn » =
   * « kharn »).
   */
  static foldText(s: string): string {
    return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/[’‘]/g, "'");
  }

  /** Nom (et identifiant) normalisé d'une faction du codex → son identifiant. */
  private readonly codexFactionKeys = computed(() => {
    const m = new Map<string, string>();
    for (const x of this.factions()) {
      m.set(GalleryComponent.foldText(x.nom), x.id);
      m.set(GalleryComponent.foldText(x.id), x.id);
    }
    return m;
  });

  /**
   * Relecture L45 (décision du lead) : une faction saisie en texte libre sur une image perso
   * (« Nécrons ») dont le nom est celui d'une faction du codex est rattachée à son identifiant
   * (« necrons ») — une seule option par nom, qui filtre les deux écritures. Rattachement à la
   * LECTURE : `a.faction` et image-meta.json restent tels que saisis. Texte libre sans
   * correspondance → inchangé (option propre).
   */
  factionKey(raw: string | null | undefined): string {
    if (!raw) return '';
    return this.codexFactionKeys().get(GalleryComponent.foldText(raw)) ?? raw;
  }

  readonly factionList = computed(() => {
    const set = new Set<string>();
    for (const a of this.artworks()) {
      if (a.faction) set.add(this.factionKey(a.faction));
    }
    return Array.from(set).sort();
  });

  /**
   * Options de la liste « Faction » : valeurs `faction` des illustrations (catalogue ET images
   * perso, voir factionList), plus la faction active si elle n'en a aucune (L42, revue UX R3 :
   * /gallery?faction=grey-knights laissait la liste vide).
   * L45 : triées sur le nom affiché (factionName), pas sur l'identifiant — « Nécrons » se range à N.
   */
  readonly factionOptions = computed(() => {
    const list = this.factionList();
    const f = this.factionKey(this.filterFaction());
    const options = !f || this.unknownFaction() || list.includes(f) ? list : [...list, f];
    return [...options].sort((a, b) => this.factionName(a).localeCompare(this.factionName(b), 'fr'));
  });

  /**
   * Nom lisible d'un identifiant de faction (« grey-knights » → « Grey Knights »), sinon tel quel
   * (faction saisie en texte libre sur une image perso). L45 : utilisé pour TOUTES les options.
   */
  factionName(id: string): string {
    return this.factions().find(x => x.id === id)?.nom ?? id;
  }

  /**
   * L42 (revue UX R3) : faction active connue mais sans aucune illustration → son nom, pour un
   * message dédié. Rien avant factionSourcesSettled (pas de message prématuré).
   */
  readonly emptyFactionName = computed<string | null>(() => {
    const f = this.factionKey(this.filterFaction());
    if (!f || this.unknownFaction() || !this.factionSourcesSettled()) return null;
    // 3e relecture : catalogue en échec → on ne sait pas ; pas d'« aucune illustration » affirmé.
    if (!this.catalogOk()) return null;
    if (this.artworks().some(a => this.factionKey(a.faction) === f)) return null;
    return this.factionName(f);
  });

  /**
   * L42 (relecture) : ?faction= qui n'est ni l'identifiant d'une faction du codex ni une valeur
   * `faction` d'une illustration (catalogue ou images perso, factionList) → nommé à l'écran, filtre
   * non appliqué. Rien avant factionSourcesSettled (pas de message prématuré).
   */
  readonly unknownFaction = computed<string | null>(() => {
    const f = this.filterFaction();
    if (!f || !this.factionSourcesSettled()) return null;
    // 3e relecture : « inconnue » exige la liste des factions VRAIMENT chargée — un échec n'en est
    // pas une preuve (le filtre s'applique alors tel quel).
    if (!this.factionsOk()) return null;
    const key = this.factionKey(f);
    if (this.factions().some(x => x.id === key) || this.factionList().includes(key)) return null;
    return f;
  });

  readonly topArtists = computed(() =>
    [...this.artists()].sort((a, b) => b.artworkCount - a.artworkCount).slice(0, 6),
  );

  readonly hasActiveFilters = computed(() =>
    !!(this.filterCategory() || this.filterFaction() || this.filterArtist() || this.filterCollection() || this.searchQuery().trim()),
  );

  /** L49/R5 : filtres de la liste (Faction, Catégorie) comptés sur le bouton « Filtres ». */
  readonly activeFilterCount = computed(() => (this.filterFaction() ? 1 : 0) + (this.filterCategory() ? 1 : 0));
  /** L49 : la liste Catégorie propose toutes les catégories du catalogue (pas seulement celles de la recherche en cours). */
  readonly categoryOptions = computed<{ key: string; label: string }[]>(() => {
    const present = new Set<string>();
    for (const a of this.artworks()) for (const t of [a.category, ...(a.extraCategories ?? [])]) if (t) present.add(t);
    const keys = [...CATEGORIES.map((c) => c.key as string), ...this.factionCategories(), ...this.customCategories()];
    const active = this.filterCategory();
    return [...new Set(keys)].filter((k) => present.has(k) || k === active).map((k) => ({ key: k, label: k }));
  });
  readonly resultsLabel = computed(() => `${this.totalFiltered()} résultat${this.totalFiltered() > 1 ? 's' : ''}`);

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
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalFiltered() / PAGE_SIZE)));
  readonly pagedArtworks = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filteredArtworks().slice(start, start + PAGE_SIZE);
  });
  /** Index 1-based "X-Y" pour le compteur. */
  readonly pageRangeStart = computed(() => this.totalFiltered() === 0 ? 0 : (this.currentPage() - 1) * PAGE_SIZE + 1);
  readonly pageRangeEnd = computed(() => Math.min(this.currentPage() * PAGE_SIZE, this.totalFiltered()));

  constructor() {
    // L49/R2 : au bureau le panneau Filtres est en tête de la colonne de droite ; la rangée « filtres »
    // de la grille prend sa hauteur (--filtres-h) et l'aside, seul collant, occupe la rangée suivante.
    afterNextRender(() => {
      const layout = this.host.nativeElement.querySelector<HTMLElement>('.layout');
      const panel = this.host.nativeElement.querySelector<HTMLElement>('#panneau-filtres');
      if (!layout || !panel || typeof ResizeObserver === 'undefined') return;
      const ro = new ResizeObserver(() => layout.style.setProperty('--filtres-h', `${panel.offsetHeight}px`));
      ro.observe(panel);
      this.destroyRef.onDestroy(() => ro.disconnect());
    });
    // L42 : ?q= (alias historique ?search=, liens des pages Lore) et ?faction=<id> (carte
    // « Galerie » des pages faction) SUIVENT l'adresse : paramètre absent → recherche vide / plus
    // de filtre (composant réutilisé de /gallery?faction=x à /gallery : le filtre restait collé).
    // Dans l'autre sens, syncUrl() écrit les deux ensemble depuis l'état : une fusion qui gardait
    // l'ancien ?q= le ressuscitait (« Réinitialiser » en deux clics, frappe perdue).
    this.route.queryParamMap.subscribe(params => {
      const q = params.get('q') ?? params.get('search') ?? '';
      const faction = params.get('faction') ?? '';
      const own = this.written;
      this.written = null;
      // Écho de notre propre réécriture : l'état est déjà juste (ou en avance, frappe en cours).
      if (own && own.q === q && own.faction === faction) return;
      this.applyAddress(q, faction);
    });
    // 2e relecture : toute AUTRE navigation qui démarre (clic vers une page, même en chargement
    // différé — la galerie vit encore) ne doit pas être supplantée par une réécriture d'adresse :
    // l'anti-rebond et les choix de la page attendent sa fin (L48 : syncUrl() les diffère).
    const navEvents = this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        if (e.url !== this.ownUrl) this.leaving = true;
      } else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
        if (!this.leaving) return;
        // Supplantée par une autre navigation : elle démarre juste après, la sortie continue (rien à rejouer).
        if (e instanceof NavigationCancel && e.code === NavigationCancellationCode.SupersededByNewNavigation) return;
        this.leaving = false;
        // La sortie n'a pas eu lieu (annulée, ou elle aboutit sur la galerie) : rejouer ce qui attendait.
        this.replayDeferred();
      } else if (e instanceof NavigationSkipped) {
        if (this.searchPending) {
          // « Galerie » cliqué sur l'adresse même de la galerie : navigation ignorée par le routeur, mais la
          // frappe en attente ne doit pas écrire ?q= après ce clic — l'adresse fait foi, comme pour une vraie navigation.
          clearTimeout(this.searchTimer);
          this.searchPending = false;
          const params = this.route.snapshot.queryParamMap;
          this.applyAddress(params.get('q') ?? params.get('search') ?? '', params.get('faction') ?? '');
        }
        // Une sortie supplantée par cette navigation ignorée n'aura pas de fin : rejouer ce qui attendait.
        if (this.leaving) {
          this.leaving = false;
          this.replayDeferred();
        }
      }
    });
    const live = setTimeout(() => this.liveReady.set(true), GalleryComponent.LIVE_REGION_DELAY_MS);
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.searchTimer);
      clearTimeout(this.scrollTimer);
      clearTimeout(live);
      navEvents.unsubscribe();
    });

    this.service.getWikiImage('warhammer 40k Imperium gothic city space marine').subscribe(r => {
      if (r.imageUrl) this.heroBgUrl.set(`url('${r.imageUrl}')`);
    });

    this.service.getImageMeta().subscribe({
      next: meta => { this.imageMeta.set(meta); this.metaLoaded.set(true); },
      error: () => this.metaLoaded.set(true),
    });
    this.service.getSuggestedCategories().subscribe(s => this.suggestedCategories.set(s));

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
    this.fetchQueue.push(() => {
      this.service.getWikiImage(query).subscribe({
        next: r => {
          if (r.imageUrl) this.imgCache.update(c => ({ ...c, [key]: r.imageUrl! }));
          this.imgInflight.delete(key);
          this.releaseFetchSlot();
        },
        error: () => {
          this.imgInflight.delete(key);
          this.releaseFetchSlot();
        },
      });
    });
    this.pumpFetchQueue();
  }

  private pumpFetchQueue(): void {
    while (this.fetchActive < GalleryComponent.FETCH_QUEUE_LIMIT && this.fetchQueue.length) {
      const job = this.fetchQueue.shift()!;
      this.fetchActive++;
      job();
    }
  }

  private releaseFetchSlot(): void {
    this.fetchActive = Math.max(0, this.fetchActive - 1);
    this.pumpFetchQueue();
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
    this.currentPage.set(1);
  }

  toggleArtistFilter(name: string): void {
    this.filterArtist.set(this.filterArtist() === name ? '' : name);
    this.currentPage.set(1);
  }

  toggleCollectionFilter(id: string): void {
    this.filterCollection.set(this.filterCollection() === id ? '' : id);
    this.currentPage.set(1);
  }

  /** L42 : l'état suit l'adresse (paramètre absent → recherche vide / plus de filtre). */
  private applyAddress(q: string, faction: string): void {
    if (q !== this.searchQuery()) {
      this.searchQuery.set(q);
      this.currentPage.set(1);
    }
    if (faction !== this.filterFaction()) {
      this.filterFaction.set(faction);
      this.currentPage.set(1);
    }
  }

  onSearchChange(q: string): void {
    this.searchQuery.set(q);
    this.currentPage.set(1); // page 5 + recherche → grille vide sans ça
    clearTimeout(this.searchTimer);
    this.searchPending = true;
    this.searchTimer = setTimeout(() => this.syncUrl(), GalleryComponent.SEARCH_URL_DEBOUNCE_MS);
  }

  onFactionChange(f: string): void {
    this.filterFaction.set(f);
    this.currentPage.set(1);
    this.syncUrl();
    this.cdr.detectChanges();
  }

  /** L49/R6 : le rappel « N résultats » du panneau suit tout de suite le choix (sans attendre le prochain cycle). */
  onCategoryChange(c: string): void {
    this.filterCategory.set(c || null);
    this.currentPage.set(1);
    this.cdr.detectChanges();
  }

  onSortChange(s: SortBy): void {
    this.sortBy.set(s);
    this.currentPage.set(1);
    this.cdr.detectChanges();
  }

  private static readonly SEARCH_URL_DEBOUNCE_MS = 400;
  /** R5 : délai entre la mise en place de la région d'état et son premier texte (annonce fiable). */
  private static readonly LIVE_REGION_DELAY_MS = 150;
  /** R5 : la région d'état est dans le DOM depuis assez longtemps pour qu'un ajout soit annoncé. */
  readonly liveReady = signal(false);

  /**
   * L42 (relecture) : l'adresse suit la recherche et le filtre faction — les DEUX, écrits ensemble
   * depuis l'état (autres paramètres conservés, historique remplacé). Sinon un rechargement ramène
   * l'ancien filtre, et l'écho d'une fusion partielle ressuscite l'ancienne recherche.
   */
  private syncUrl(replay = false): void {
    clearTimeout(this.searchTimer);
    this.searchPending = false;
    // L48 : une navigation d'ailleurs est en vol (sortie de la page, route à charger) — la supplanter
    // ferait perdre le clic. L'état est déjà à jour ; l'adresse est réécrite si la sortie n'aboutit pas.
    if (this.leaving) { this.syncDeferred = true; return; }
    const q = this.searchQuery();
    const faction = this.filterFaction();
    const target = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { faction: faction || null, q: q || null, search: null },
      queryParamsHandling: 'merge',
    });
    const url = this.router.serializeUrl(target);
    // 2e relecture : adresse inchangée (« Réinitialiser » avec seulement une catégorie) → le
    // routeur ignorerait la navigation et l'écho attendu resterait armé, prêt à avaler plus tard
    // une vraie navigation aux mêmes q/faction. Rien à écrire — sauf si une navigation est en vol
    // (router.url n'est pas encore l'adresse qu'elle va écrire).
    // Rejouée depuis la fin d'une sortie (replay), la navigation « en vol » est celle qui se termine : elle
    // n'écrit rien, donc une adresse déjà juste n'a pas à être renavigée (NavigationSkipped, retour en haut).
    if (url === this.router.url && (replay || !this.router.getCurrentNavigation())) return;
    const armed = { q, faction };
    this.written = armed;
    this.ownUrl = url;
    // L45/L48 : scrollPositionRestoration: 'enabled' ramène en haut après CHAQUE navigation, même cette
    // réécriture d'adresse (390 px : choisir une faction renvoyait en haut, focus hors écran).
    const scroll = this.viewportScroller.getScrollPosition();
    void this.router.navigateByUrl(target, { replaceUrl: true }).then(ok => {
      // L'écho (queryParamMap) a lieu avant cette résolution : encore armé = la navigation n'en a pas
      // émis (annulée, supplantée, ou seul le fragment change) — désarmer, sauf réécriture plus récente.
      if (this.written === armed) this.written = null;
      // Le défilement du routeur part d'un setTimeout(0) planifié à la fin de la navigation, donc avant celui-ci.
      if (ok) this.scrollTimer = setTimeout(() => {
        const now = this.viewportScroller.getScrollPosition();
        if (now[0] !== scroll[0] || now[1] !== scroll[1]) this.viewportScroller.scrollToPosition(scroll);
      });
    });
  }

  /** Fin d'une sortie sans départ de la galerie : réécrire l'adresse que syncUrl() avait différée. */
  private replayDeferred(): void {
    if (!this.syncDeferred) return;
    this.syncDeferred = false;
    this.syncUrl(true);
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.filterCategory.set(null);
    this.filterFaction.set('');
    this.filterArtist.set('');
    this.filterCollection.set('');
    this.currentPage.set(1);
    this.syncUrl();
    this.cdr.detectChanges();
  }

  goToPage(n: number): void {
    const total = this.totalPages();
    this.currentPage.set(Math.max(1, Math.min(total, n)));
    // Scroll to top of grid pour ne pas rester en bas après changement de page.
    if (typeof window !== 'undefined') {
      const grid = document.querySelector('.art-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  nextPage(): void { this.goToPage(this.currentPage() + 1); }
  prevPage(): void { this.goToPage(this.currentPage() - 1); }

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

  /** ← → ne font défiler la visionneuse que si elle est la boîte du dessus (sinon ils déplaceraient
   *  le curseur d'un champ de « Catégoriser » et changeraient l'œuvre qu'enregistre la boîte). */
  private viewerOnTop(): boolean {
    return !!this.selectedArt() && !this.catModalOpen() && !this.importModalOpen();
  }

  @HostListener('document:keydown.arrowleft')
  onLeft(): void { if (this.viewerOnTop()) this.navViewer(-1); }

  @HostListener('document:keydown.arrowright')
  onRight(): void { if (this.viewerOnTop()) this.navViewer(1); }

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
    this.catArtist.set(a.artist === 'Mes images' ? '' : a.artist);
    this.catFaction.set(a.faction ?? '');
    this.catError.set('');
    this.catModalOpen.set(true);
    this.catDropdownOpen.set(false);
  }

  /** Échap dans le champ : ferme la liste de suggestions seule (keydown annulé : pas de `cancel`, la boîte reste). */
  onCatEscape(event: Event): void {
    if (!this.catDropdownOpen()) return;
    event.preventDefault();
    this.catDropdownOpen.set(false);
  }

  closeCategorize(): void {
    this.catModalOpen.set(false);
    this.catDropdownOpen.set(false);
  }

  /** Toggle add/remove d'une suggestion via le dropdown sectionné. */
  toggleCatFromSuggestion(item: string): void {
    const list = this.catSelectedTags();
    if (list.includes(item)) {
      this.catSelectedTags.set(list.filter(t => t !== item));
    } else {
      this.catSelectedTags.set([...list, item]);
    }
    this.catInput.set('');
  }

  /** Click hors du combobox (mais dans la modal) ferme le dropdown. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.catDropdownOpen()) return;
    const target = event.target as HTMLElement;
    if (target.closest('.cat-combo-row')) return;
    this.catDropdownOpen.set(false);
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
    this.catError.set('');
    this.service.saveImageMeta(a.image, meta).subscribe({
      next: updated => {
        this.imageMeta.set(updated);
        this.closeCategorize();
      },
      error: err => this.catError.set(err?.status === 401
        ? 'Échec de l’enregistrement : PIN absent ou refusé.'
        : 'Échec de l’enregistrement : réessayez dans un instant.'),
    });
  }

  /** Active l'édition en demandant le PIN du codex, ou la quitte en l'oubliant. */
  toggleEditMode(): void {
    if (this.editMode()) this.pinService.clear();
    else this.pinService.prompt();
  }

  // === Import modal ===
  openImport(): void {
    this.importModalOpen.set(true);
    this.importMessage.set('');
    this.importTab.set('wiki');
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
    this.importRedditError.set('');
    this.service.searchReddit('Warhammer40k', 30).subscribe({
      next: posts => {
        this.importRedditPosts.set(posts);
        this.importRedditLoading.set(false);
      },
      error: err => {
        this.importRedditPosts.set([]);
        this.importRedditError.set(err?.error?.message ?? 'Reddit ne répond pas pour le moment.');
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
