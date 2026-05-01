import { Component, inject, signal, computed, effect, HostListener } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WarhammerService } from '../../core/services/warhammer.service';
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
      </section>

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
                @for (v of featuredVideos(); track v.id; let i = $index) {
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
              @for (ch of channels(); track ch.id) {
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
                @for (v of filteredVideos(); track v.id) {
                  <article class="video-card"
                    [style.--thumb]="thumbStyle(v)"
                    (click)="openModal(v)">
                    <span class="duration">{{ v.duration }}</span>
                    <span class="play">▶</span>
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
  styles: [`
    :host {
      display: block;
    }

    .videos-page {
      width: min(1440px, calc(100% - 64px));
      margin: 0 auto;
      padding: 28px 0 64px;
    }

    /* HERO */
    .hero {
      position: relative;
      min-height: 360px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: var(--panel);
      box-shadow: var(--shadow), inset 0 0 110px rgba(201, 162, 74, 0.045);
      margin-bottom: 24px;
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
      min-height: 360px;
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) 420px;
      gap: 26px;
      align-items: end;
      padding: 40px;
    }
    .eyebrow {
      display: block;
      color: var(--gold);
      font-size: 12px;
      font-weight: 950;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .hero h1 {
      margin: 0 0 16px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: clamp(44px, 5vw, 76px);
      line-height: 0.9;
      letter-spacing: 0.055em;
      text-transform: uppercase;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 38px rgba(201, 162, 74, 0.28);
    }
    .hero-desc {
      max-width: 720px;
      margin: 0;
      color: #cfc3ad;
      font-size: 17px;
      line-height: 1.72;
    }
    .hero-panel {
      border: 1px solid rgba(201, 162, 74, 0.3);
      background: rgba(0, 0, 0, 0.62);
      padding: 22px;
      box-shadow: 0 20px 80px rgba(0, 0, 0, 0.65);
    }
    .hero-panel h3 {
      margin: 0 0 14px;
      color: var(--gold-bright);
      font-family: var(--serif);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 16px;
    }
    .channel-mini {
      width: 100%;
      display: grid;
      grid-template-columns: 44px 1fr auto;
      gap: 12px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.13);
      background: transparent;
      border-left: 0;
      border-right: 0;
      border-bottom: 0;
      cursor: pointer;
      text-align: left;
      font: inherit;
      color: inherit;
      transition: background 0.15s ease;
    }
    .channel-mini:first-of-type { border-top: 0; }
    .channel-mini:hover { background: rgba(201, 162, 74, 0.06); }

    .avatar {
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.26);
      background: rgba(201, 162, 74, 0.08);
      color: var(--gold);
      font-weight: 900;
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.05em;
    }
    .ch-info { display: flex; flex-direction: column; min-width: 0; }
    .ch-info strong {
      color: #ead7a2;
      font-size: 14px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ch-info span {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lang {
      border: 1px solid rgba(201, 162, 74, 0.28);
      color: var(--gold);
      padding: 4px 7px;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.05em;
    }

    /* TOOLBAR */
    .toolbar {
      display: grid;
      grid-template-columns: minmax(260px, 420px) 1fr auto;
      gap: 14px;
      align-items: center;
      margin-bottom: 26px;
    }
    .search, .select {
      height: 44px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      background: rgba(5, 4, 3, 0.78);
      color: var(--text);
      padding: 0 15px;
      outline: none;
      box-shadow: inset 0 0 24px rgba(201, 162, 74, 0.035);
      font: inherit;
      font-size: 14px;
    }
    .search:focus, .select:focus { border-color: var(--border-strong); }
    .select { padding-right: 32px; cursor: pointer; appearance: none; background-image: linear-gradient(45deg, transparent 50%, var(--gold) 50%), linear-gradient(135deg, var(--gold) 50%, transparent 50%); background-position: calc(100% - 16px) 19px, calc(100% - 11px) 19px; background-size: 5px 5px, 5px 5px; background-repeat: no-repeat; }
    .filters { display: flex; flex-wrap: wrap; gap: 9px; }
    .filter {
      height: 38px;
      border: 1px solid rgba(201, 162, 74, 0.26);
      background: rgba(0, 0, 0, 0.42);
      color: var(--text);
      padding: 0 13px;
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
    }
    .filter:hover { border-color: rgba(201, 162, 74, 0.5); }
    .filter.active {
      color: var(--gold-bright);
      border-color: rgba(201, 162, 74, 0.68);
      background: rgba(201, 162, 74, 0.1);
    }

    /* LAYOUT */
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 24px;
    }
    .main-col { min-width: 0; }
    .section { margin-bottom: 28px; }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 18px;
      margin-bottom: 16px;
    }
    .section-head h2 {
      margin: 0;
      color: var(--gold-bright);
      font-family: var(--serif);
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-size: 26px;
    }
    .section-head p {
      margin: 6px 0 0;
      color: var(--muted);
      line-height: 1.5;
      max-width: 680px;
      font-size: 14px;
    }
    .results-count {
      color: var(--gold);
      font-size: 12px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    /* CARDS */
    .featured-grid {
      display: grid;
      grid-template-columns: 1.35fr 1fr 1fr;
      gap: 16px;
    }
    .video-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }
    .video-card {
      position: relative;
      min-height: 245px;
      overflow: hidden;
      border: 1px solid rgba(201, 162, 74, 0.24);
      background: var(--panel);
      box-shadow: 0 20px 80px rgba(0, 0, 0, 0.58);
      cursor: pointer;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
      padding: 0;
      text-align: left;
      font: inherit;
      color: inherit;
    }
    .video-card.large { min-height: 330px; }
    .video-card:hover {
      transform: translateY(-5px);
      border-color: rgba(201, 162, 74, 0.68);
      box-shadow: 0 30px 100px rgba(0, 0, 0, 0.76), 0 0 42px rgba(201, 162, 74, 0.08);
    }
    .video-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.45) 48%, rgba(0, 0, 0, 0.94) 100%),
        var(--thumb);
      background-size: cover;
      background-position: center;
      filter: contrast(1.28) saturate(0.98) brightness(0.76);
      transition: transform 0.35s ease, filter 0.35s ease;
    }
    .video-card:hover::before {
      transform: scale(1.05);
      filter: contrast(1.4) saturate(1.08) brightness(0.9);
    }
    .duration {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 2;
      color: #fff;
      background: rgba(0, 0, 0, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.16);
      padding: 5px 8px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.05em;
    }
    .play {
      position: absolute;
      z-index: 2;
      top: 50%;
      left: 50%;
      width: 62px;
      height: 62px;
      transform: translate(-50%, -50%);
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.65);
      background: rgba(0, 0, 0, 0.62);
      color: var(--gold-bright);
      font-size: 24px;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.55);
      opacity: 0.9;
    }
    .video-content {
      position: absolute;
      z-index: 2;
      inset: auto 0 0 0;
      padding: 20px;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }
    .tag {
      border: 1px solid rgba(201, 162, 74, 0.26);
      color: var(--gold);
      background: rgba(201, 162, 74, 0.09);
      padding: 4px 7px;
      font-size: 10px;
      font-weight: 950;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .tag.fr {
      color: #9ec5ff;
      border-color: rgba(60, 120, 210, 0.55);
      background: rgba(60, 120, 210, 0.18);
    }
    .tag.official {
      color: #9df0b2;
      border-color: rgba(14, 108, 63, 0.55);
      background: rgba(14, 108, 63, 0.18);
    }
    .video-title {
      margin: 0 0 7px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 19px;
      line-height: 1.15;
      text-transform: uppercase;
      letter-spacing: 0.045em;
    }
    .video-card.large .video-title { font-size: 28px; }
    .video-meta {
      color: #c9beaa;
      font-size: 13px;
      line-height: 1.45;
    }

    /* CHANNEL GRID */
    .channel-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }
    .channel-card {
      display: grid;
      grid-template-columns: 58px 1fr auto;
      gap: 14px;
      align-items: center;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: linear-gradient(180deg, rgba(19, 15, 11, 0.92), rgba(5, 4, 3, 0.95));
      padding: 16px;
      cursor: pointer;
      transition: transform 0.2s ease, border-color 0.2s ease;
      text-align: left;
      font: inherit;
      color: inherit;
    }
    .channel-card:hover {
      transform: translateY(-4px);
      border-color: rgba(201, 162, 74, 0.62);
    }
    .channel-card .avatar { width: 58px; height: 58px; font-size: 14px; }
    .channel-card .ch-info strong { color: var(--gold-bright); margin-bottom: 4px; }

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
      padding: 20px;
      box-shadow: 0 20px 80px rgba(0, 0, 0, 0.62);
    }
    .side-panel h3 {
      margin: 0 0 15px;
      color: var(--gold-bright);
      font-family: var(--serif);
      text-transform: uppercase;
      letter-spacing: 0.09em;
      font-size: 16px;
    }
    .check-row, .recent-row {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
      color: #c9beaa;
      font-size: 13px;
      cursor: pointer;
      background: transparent;
      border-left: 0;
      border-right: 0;
      border-bottom: 0;
      text-align: left;
      font-family: inherit;
      transition: color 0.15s ease;
    }
    .check-row:first-of-type, .recent-row:first-of-type { border-top: 0; }
    .check-row:hover, .recent-row:hover { color: var(--gold-bright); }
    .check-row.active { color: var(--gold-bright); }
    .check-row .count { color: var(--gold); font-weight: 800; }
    .check-row .cr-label { display: inline-flex; align-items: center; gap: 9px; }
    .check-row .dot {
      width: 8px;
      height: 8px;
      border: 1px solid rgba(201, 162, 74, 0.55);
      background: transparent;
      flex-shrink: 0;
    }
    .check-row .dot.on {
      background: var(--gold);
      box-shadow: 0 0 10px rgba(201, 162, 74, 0.6);
    }
    .recent-row.static { cursor: default; }
    .recent-row.static:hover { color: #c9beaa; }
    .recent-row .rr-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .recent-row small { color: var(--muted); white-space: nowrap; }

    /* EMPTY STATE */
    .empty {
      padding: 60px 24px;
      text-align: center;
      color: var(--muted);
      border: 1px dashed rgba(201, 162, 74, 0.3);
      background: rgba(8, 7, 6, 0.4);
    }

    /* FOOTER */
    .page-footer {
      margin-top: 42px;
      padding: 22px;
      border-top: 1px solid rgba(201, 162, 74, 0.2);
      color: var(--muted);
      text-align: center;
      font-size: 12px;
      line-height: 1.5;
    }

    /* MODAL */
    .modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 34px;
      background: rgba(0, 0, 0, 0.92);
      backdrop-filter: blur(10px);
      animation: fadeIn 0.2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal-box {
      position: relative;
      width: min(1100px, 100%);
      aspect-ratio: 16 / 9;
      border: 1px solid rgba(201, 162, 74, 0.42);
      background: #000;
      box-shadow: 0 40px 150px rgba(0, 0, 0, 0.9);
    }
    .modal-box iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }
    .modal-fallback {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      text-align: center;
      padding: 24px;
      color: var(--muted);
    }
    .modal-fallback strong { color: var(--gold-bright); font-family: var(--serif); font-size: 22px; display: block; margin-bottom: 8px; }
    .modal-fallback p { margin: 0 0 16px; }
    .modal-link {
      display: inline-block;
      padding: 10px 20px;
      border: 1px solid var(--gold);
      color: var(--gold-bright);
      text-decoration: none;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      font-size: 12px;
    }
    .modal-link:hover { background: rgba(201, 162, 74, 0.15); }
    .close {
      position: absolute;
      top: -44px;
      right: 0;
      border: 1px solid rgba(201, 162, 74, 0.38);
      background: rgba(0, 0, 0, 0.7);
      color: var(--gold-bright);
      width: 36px;
      height: 36px;
      cursor: pointer;
      font-size: 18px;
      font-family: inherit;
    }
    .close:hover { border-color: var(--gold); }

    /* RESPONSIVE */
    @media (max-width: 1220px) {
      .hero-content { grid-template-columns: 1fr; }
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: relative; top: auto; grid-template-columns: repeat(2, 1fr); }
      .featured-grid { grid-template-columns: 1fr; }
      .channel-grid { grid-template-columns: repeat(2, 1fr); }
      .video-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 760px) {
      .videos-page { width: min(100% - 28px, 1440px); padding-top: 22px; }
      .hero-content { padding: 24px; }
      .toolbar { grid-template-columns: 1fr; }
      .video-grid, .channel-grid { grid-template-columns: 1fr; }
      .sidebar { grid-template-columns: 1fr; }
      .video-card.large, .video-card { min-height: 270px; }
      .section-head { flex-direction: column; align-items: flex-start; }
    }
  `],
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

  private readonly thumbCache = signal<Record<string, string>>({});
  private readonly thumbInflight = new Set<string>();

  readonly featuredVideos = computed(() => this.videos().filter(v => v.featured));

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
  }

  openModal(v: Video): void { this.selectedVideo.set(v); }
  closeModal(): void { this.selectedVideo.set(null); }

  onModalBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal')) {
      this.closeModal();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { if (this.selectedVideo()) this.closeModal(); }

  openExternal(url: string): void {
    window.open(url, '_blank', 'noopener');
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
