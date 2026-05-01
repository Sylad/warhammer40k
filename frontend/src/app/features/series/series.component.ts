import { Component, inject, signal, computed, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WarhammerService } from '../../core/services/warhammer.service';
import type { Serie, SerieBadge } from '../../core/models/models';

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
  imports: [CommonModule, FormsModule],
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

      <!-- TABS -->
      <nav class="tabs">
        @for (t of tabs; track t.key) {
          <button class="tab"
            [class.active]="activeTab() === t.key"
            (click)="activeTab.set(t.key)">
            {{ t.label }}
          </button>
        }
      </nav>

      <!-- TOOLBAR -->
      <div class="toolbar">
        <div class="t-block">
          <span class="t-label">Trier par</span>
          <div class="select-wrap">
            <select [ngModel]="sort()" (ngModelChange)="sort.set($event)">
              <option value="az">A — Z</option>
              <option value="count">Nombre de livres</option>
              <option value="progression">Progression</option>
            </select>
            <span class="caret">▾</span>
          </div>
        </div>

        <div class="t-block letter-block">
          <span class="t-label">Filtrer par lettre</span>
          <div class="letters">
            @for (l of alphabet; track l) {
              <button class="letter"
                [class.active]="selectedLetter() === l"
                (click)="toggleLetter(l)">{{ l }}</button>
            }
          </div>
        </div>

        <button class="advanced-btn">
          <span class="adv-ico">⚙</span>
          Filtres avancés
        </button>
      </div>

      <!-- LAYOUT (main + sidebar) -->
      <div class="layout">

        <!-- MAIN -->
        <div class="main">
          <div class="grid">
            @for (s of visibleSeries(); track s.id) {
              <article class="serie-card">
                <div class="card-image"
                     [style.background-image]="wikiImages().get(s.id) ? 'url(' + wikiImages().get(s.id) + ')' : ''">
                  <div class="card-overlay"></div>
                </div>
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
                  <button class="card-cta">
                    Voir la collection
                    <span class="cta-arrow">›</span>
                  </button>
                </div>
              </article>
            }
            @empty {
              <div class="empty">Aucune série ne correspond à votre recherche.</div>
            }
          </div>

          @if (filteredSeries().length > visibleCount()) {
            <div class="load-more-wrap">
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
              <li><span class="li-ico">≡</span>Voir l'ordre de lecture<span class="li-arrow">›</span></li>
              <li><span class="li-ico">▶</span>Continuer ma lecture<span class="li-arrow">›</span></li>
              <li><span class="li-ico">♡</span>Ma liste de souhaits<span class="li-arrow">›</span></li>
              <li><span class="li-ico">⤓</span>Téléchargements<span class="li-arrow">›</span></li>
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
  `,
  styles: [`
    :host {
      display: block;
      color: var(--text);
    }

    .romans-page {
      max-width: 1840px;
      margin: 0 auto;
      padding: 18px 4px 60px;
      display: flex;
      flex-direction: column;
      gap: 26px;
    }

    /* HERO */
    .hero {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      gap: 28px;
      align-items: stretch;
      min-height: 320px;
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      background: linear-gradient(180deg, rgba(20, 14, 8, 0.5), rgba(8, 5, 3, 0.85));
      position: relative;
    }
    .hero-text {
      padding: 38px 42px 42px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      justify-content: center;
    }
    .eyebrow {
      font-family: 'Cinzel', serif;
      font-size: 11px;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--gold);
      opacity: 0.85;
    }
    .hero h1 {
      font-family: 'Cinzel', serif;
      font-size: clamp(40px, 4.5vw, 64px);
      line-height: 1.05;
      margin: 0;
      color: var(--text);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-shadow: 0 4px 18px rgba(0,0,0,0.7);
    }
    .hero-desc {
      max-width: 540px;
      font-size: 15px;
      line-height: 1.65;
      color: rgba(232, 222, 202, 0.78);
      margin: 0;
    }
    .search-bar {
      margin-top: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      border-radius: 3px;
      background: rgba(8, 5, 3, 0.7);
      max-width: 540px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .search-bar:focus-within {
      border-color: rgba(240, 210, 118, 0.6);
      box-shadow: 0 0 0 3px rgba(201, 162, 74, 0.12);
    }
    .s-icon {
      color: var(--gold);
      font-size: 16px;
      opacity: 0.7;
    }
    .search-bar input {
      flex: 1;
      background: transparent;
      border: 0;
      color: var(--text);
      font-family: inherit;
      font-size: 14px;
      padding: 14px 0;
      outline: none;
    }
    .search-bar input::placeholder {
      color: rgba(232, 222, 202, 0.4);
    }

    .hero-image {
      position: relative;
      background-size: cover;
      background-position: center;
      background-color: #0c0805;
      min-height: 280px;
    }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(8, 5, 3, 0.55) 0%, rgba(8, 5, 3, 0.05) 30%, transparent 100%),
        linear-gradient(180deg, transparent 60%, rgba(8, 5, 3, 0.7) 100%);
    }
    .hero-grain {
      position: absolute;
      inset: 0;
      background-image:
        repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0 1px, transparent 1px 3px);
      mix-blend-mode: multiply;
      pointer-events: none;
    }

    /* TABS */
    .tabs {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0;
    }
    .tab {
      background: transparent;
      border: 0;
      color: rgba(232, 222, 202, 0.55);
      font-family: 'Cinzel', serif;
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      padding: 14px 22px;
      cursor: pointer;
      position: relative;
      transition: color 0.2s;
    }
    .tab:hover { color: rgba(232, 222, 202, 0.9); }
    .tab.active {
      color: var(--gold-light, #f0d276);
    }
    .tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 18px;
      right: 18px;
      height: 2px;
      background: linear-gradient(90deg, transparent, var(--gold) 40%, var(--gold) 60%, transparent);
    }

    /* TOOLBAR */
    .toolbar {
      display: grid;
      grid-template-columns: minmax(180px, 220px) 1fr auto;
      align-items: end;
      gap: 22px;
    }
    .t-block { display: flex; flex-direction: column; gap: 8px; }
    .t-label {
      font-family: 'Cinzel', serif;
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(232, 222, 202, 0.55);
    }
    .select-wrap { position: relative; }
    .select-wrap select {
      appearance: none;
      width: 100%;
      padding: 11px 36px 11px 14px;
      background: rgba(8, 5, 3, 0.6);
      border: 1px solid var(--border);
      border-radius: 3px;
      color: var(--text);
      font-family: inherit;
      font-size: 13px;
      cursor: pointer;
    }
    .select-wrap select:focus { outline: none; border-color: rgba(201, 162, 74, 0.55); }
    .caret {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--gold);
      pointer-events: none;
      font-size: 12px;
    }

    .letters {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }
    .letter {
      width: 30px;
      height: 30px;
      background: transparent;
      border: 1px solid rgba(201, 162, 74, 0.18);
      border-radius: 50%;
      color: rgba(232, 222, 202, 0.65);
      font-family: 'Cinzel', serif;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.18s;
    }
    .letter:hover { border-color: rgba(201, 162, 74, 0.5); color: var(--gold-light, #f0d276); }
    .letter.active {
      background: rgba(201, 162, 74, 0.18);
      border-color: var(--gold);
      color: var(--gold-light, #f0d276);
    }

    .advanced-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 18px;
      background: transparent;
      border: 1px solid rgba(201, 162, 74, 0.32);
      border-radius: 3px;
      color: rgba(232, 222, 202, 0.85);
      font-family: 'Cinzel', serif;
      font-size: 11px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s;
    }
    .advanced-btn:hover {
      border-color: var(--gold);
      color: var(--gold-light, #f0d276);
    }
    .adv-ico { color: var(--gold); }

    /* LAYOUT */
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 28px;
      align-items: flex-start;
    }
    .main { display: flex; flex-direction: column; gap: 26px; }

    /* GRID */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 22px;
    }

    /* CARD */
    .serie-card {
      background: linear-gradient(180deg, rgba(18, 12, 6, 0.6) 0%, rgba(8, 5, 3, 0.95) 100%);
      border: 1px solid var(--border);
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s ease, border-color 0.25s, box-shadow 0.25s;
      position: relative;
    }
    .serie-card:hover {
      transform: translateY(-4px);
      border-color: rgba(201, 162, 74, 0.55);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(201, 162, 74, 0.18);
    }
    .card-image {
      position: relative;
      height: 150px;
      background-color: #0c0805;
      background-size: cover;
      background-position: center 30%;
      transition: transform 0.4s ease;
    }
    .serie-card:hover .card-image { transform: scale(1.04); }
    .card-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(8, 5, 3, 0.05) 0%, rgba(8, 5, 3, 0.55) 60%, rgba(8, 5, 3, 0.95) 100%);
    }
    .card-body {
      padding: 14px 18px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }
    .card-title {
      font-family: 'Cinzel', serif;
      font-size: 16px;
      letter-spacing: 0.04em;
      color: var(--gold-light, #f0d276);
      margin: 0;
      line-height: 1.2;
      text-transform: uppercase;
    }
    .card-author {
      font-style: italic;
      font-size: 12px;
      color: rgba(232, 222, 202, 0.6);
    }
    .card-desc {
      font-size: 12.5px;
      line-height: 1.6;
      color: rgba(232, 222, 202, 0.75);
      margin: 4px 0 6px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .card-count {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'Cinzel', serif;
      font-size: 10.5px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold);
      margin-top: 2px;
    }
    .count-ico { font-size: 12px; }

    .card-progress { display: flex; flex-direction: column; gap: 4px; }
    .prog-text {
      font-size: 12px;
      color: rgba(232, 222, 202, 0.7);
    }
    .prog-bar {
      height: 4px;
      background: rgba(201, 162, 74, 0.12);
      border-radius: 2px;
      overflow: hidden;
    }
    .prog-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--gold), var(--gold-light, #f0d276));
      border-radius: 2px;
      transition: width 0.4s;
    }

    .card-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 4px;
    }
    .badge {
      font-size: 10px;
      letter-spacing: 0.06em;
      padding: 3px 9px;
      border-radius: 2px;
      border: 1px solid;
      font-weight: 500;
    }
    .b-fond {
      background: rgba(201, 162, 74, 0.12);
      border-color: rgba(201, 162, 74, 0.45);
      color: var(--gold-light, #f0d276);
    }
    .b-inq {
      background: rgba(110, 75, 165, 0.14);
      border-color: rgba(150, 110, 200, 0.45);
      color: rgba(190, 160, 220, 0.95);
    }
    .b-sm {
      background: rgba(50, 95, 165, 0.14);
      border-color: rgba(80, 130, 200, 0.45);
      color: rgba(150, 185, 230, 0.95);
    }
    .b-gi {
      background: rgba(80, 130, 70, 0.14);
      border-color: rgba(120, 170, 100, 0.45);
      color: rgba(180, 215, 160, 0.95);
    }
    .b-ss {
      background: rgba(165, 50, 90, 0.14);
      border-color: rgba(200, 80, 120, 0.45);
      color: rgba(230, 165, 195, 0.95);
    }
    .b-adv {
      background: rgba(180, 110, 60, 0.14);
      border-color: rgba(220, 145, 80, 0.45);
      color: rgba(235, 195, 145, 0.95);
    }
    .b-papier, .b-audible, .b-fr, .b-en {
      background: rgba(232, 222, 202, 0.06);
      border-color: rgba(232, 222, 202, 0.22);
      color: rgba(232, 222, 202, 0.7);
    }

    .card-cta {
      margin-top: 10px;
      padding: 11px 14px;
      background: transparent;
      border: 1px solid rgba(201, 162, 74, 0.42);
      border-radius: 3px;
      color: var(--gold);
      font-family: 'Cinzel', serif;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      transition: all 0.2s;
    }
    .card-cta:hover {
      background: rgba(201, 162, 74, 0.12);
      border-color: var(--gold);
      color: var(--gold-light, #f0d276);
    }
    .cta-arrow { font-size: 16px; line-height: 1; }

    .empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 60px 20px;
      color: rgba(232, 222, 202, 0.55);
      border: 1px dashed var(--border);
      border-radius: 4px;
      font-style: italic;
    }

    .load-more-wrap {
      display: flex;
      justify-content: center;
      padding: 8px 0 4px;
    }
    .load-more {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 13px 32px;
      background: transparent;
      border: 1px solid rgba(201, 162, 74, 0.4);
      border-radius: 3px;
      color: var(--gold-light, #f0d276);
      font-family: 'Cinzel', serif;
      font-size: 12px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.2s;
    }
    .load-more:hover {
      background: rgba(201, 162, 74, 0.1);
      border-color: var(--gold);
      box-shadow: 0 0 0 1px rgba(201, 162, 74, 0.2);
    }
    .lm-arrow { color: var(--gold); }

    /* SIDEBAR */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 18px;
      position: sticky;
      top: 90px;
    }
    .panel {
      background: linear-gradient(180deg, rgba(18, 12, 6, 0.5) 0%, rgba(8, 5, 3, 0.85) 100%);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 18px 20px;
    }
    .panel-title {
      font-family: 'Cinzel', serif;
      font-size: 12px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--gold);
      margin: 0 0 14px;
    }

    /* Progression panel */
    .progression-row {
      display: grid;
      grid-template-columns: 110px 1fr;
      align-items: center;
      gap: 14px;
    }
    .donut {
      position: relative;
      width: 100px;
      height: 100px;
    }
    .donut svg { width: 100%; height: 100%; }
    .donut-label {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .donut-pct {
      font-family: 'Cinzel', serif;
      font-size: 22px;
      color: var(--gold-light, #f0d276);
      line-height: 1;
    }
    .donut-sub {
      font-size: 9px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: rgba(232, 222, 202, 0.5);
      margin-top: 3px;
    }
    .prog-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .prog-list li {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: rgba(232, 222, 202, 0.8);
    }
    .prog-list strong {
      color: var(--gold-light, #f0d276);
      font-weight: 600;
      margin-right: 4px;
    }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .d-read { background: linear-gradient(135deg, #6fbd5e, #4a9942); }
    .d-cur { background: linear-gradient(135deg, var(--gold-light, #f0d276), var(--gold)); }
    .d-tbr { background: rgba(232, 222, 202, 0.25); }

    .prog-total {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      letter-spacing: 0.04em;
      color: rgba(232, 222, 202, 0.65);
      text-align: center;
    }

    /* Action links */
    .link-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
    }
    .link-list li {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 4px;
      border-bottom: 1px solid rgba(201, 162, 74, 0.08);
      font-size: 13px;
      color: rgba(232, 222, 202, 0.85);
      cursor: pointer;
      transition: color 0.2s, padding-left 0.2s;
    }
    .link-list li:last-child { border-bottom: 0; }
    .link-list li:hover { color: var(--gold-light, #f0d276); padding-left: 8px; }
    .li-ico {
      color: var(--gold);
      width: 20px;
      text-align: center;
      font-size: 14px;
    }
    .li-arrow { margin-left: auto; color: rgba(201, 162, 74, 0.4); }

    /* Popular */
    .popular {
      list-style: none;
      padding: 0;
      margin: 0;
      counter-reset: pop;
      display: flex;
      flex-direction: column;
    }
    .popular li {
      display: grid;
      grid-template-columns: 22px 1fr auto;
      align-items: center;
      gap: 8px;
      padding: 8px 4px;
      border-bottom: 1px solid rgba(201, 162, 74, 0.08);
      font-size: 12.5px;
    }
    .popular li:last-child { border-bottom: 0; }
    .pop-rank {
      font-family: 'Cinzel', serif;
      color: var(--gold);
      font-size: 14px;
    }
    .pop-name {
      color: rgba(232, 222, 202, 0.85);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pop-count {
      color: rgba(232, 222, 202, 0.5);
      font-size: 11px;
    }

    /* Legend */
    .legend {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .legend li {
      display: grid;
      grid-template-columns: 100px 1fr;
      align-items: center;
      gap: 10px;
      font-size: 11.5px;
      color: rgba(232, 222, 202, 0.7);
    }
    .legend-desc { line-height: 1.4; }

    /* Responsive */
    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: static; }
      .hero { grid-template-columns: 1fr; }
      .hero-image { display: none; }
      .toolbar { grid-template-columns: 1fr; }
    }
  `],
})
export class SeriesComponent {
  private readonly service = inject(WarhammerService);

  readonly tabs = TABS;
  readonly alphabet = ALPHABET;
  readonly badgeLabels = BADGE_LABELS;
  readonly legendBadges: SerieBadge[] = [
    'Fondamental', 'Inquisition', 'Space Marines', 'Garde Impériale', 'Adeptus Sororitas', 'Aventure',
  ];

  readonly series = toSignal(this.service.series$, { initialValue: [] as Serie[] });
  readonly wikiImages = signal(new Map<string, string>());
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

  readonly filteredSeries = computed<Serie[]>(() => {
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

    const letter = this.selectedLetter();
    if (letter && letter !== '#') {
      list = list.filter(s => {
        const first = stripPrefix(s.titre).charAt(0).toUpperCase();
        return first === letter;
      });
    }

    if (tab !== 'order') {
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

  toggleLetter(l: string) {
    if (this.selectedLetter() === l || l === '#') {
      this.selectedLetter.set(null);
    } else {
      this.selectedLetter.set(l);
    }
    this.visibleCount.set(PAGE_SIZE);
  }

  loadMore() {
    this.visibleCount.update(n => n + PAGE_SIZE);
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
}

function stripPrefix(t: string): string {
  return t
    .replace(/^l['']/i, '')
    .replace(/^la /i, '')
    .replace(/^le /i, '')
    .replace(/^les /i, '')
    .trim();
}
