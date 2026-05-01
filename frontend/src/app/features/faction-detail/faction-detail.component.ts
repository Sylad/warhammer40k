import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { Faction, Unit, UnitType, SubFaction, SubFactionType } from '../../core/models/models';

const FACTION_WIKI: Record<string, string> = {
  'space-marines':       'Space Marines Adeptus Astartes',
  'chaos-space-marines': 'Chaos Space Marines Traitor Legion',
  'aeldari':             'Eldrad Ulthran',
  'orks':                'Warboss Ork',
  'tyranides':           'Tyranid Warrior hive',
  'necrons':             'Szarekh Silent King Necron',
  'tau':                 'Fire Warriors T au',
  'astra-militarum':     'Cadian Shock Troops',
  'adeptus-mechanicus':  'Tech-Priest Adeptus Mechanicus',
  'soeurs-de-bataille':  'Adepta Sororitas warrior',
  'inquisition':         'Inquisitor Torquemada Coteaz',
};

const FACTION_LORE_IMG: Record<string, string> = {
  'space-marines':       'Ultramarines battle',
  'chaos-space-marines': 'Chaos Space Marines battle',
  'aeldari':             'Aeldari Craftworld',
  'orks':                'Ork Waaagh battle',
  'tyranides':           'Tyranid swarm',
  'necrons':             'Necron tomb world',
  'tau':                 'Tau battle suit',
  'astra-militarum':     'Imperial Guard battle',
  'adeptus-mechanicus':  'Skitarii battle',
  'soeurs-de-bataille':  'Sisters of Battle',
  'inquisition':         'Inquisition agents',
};

const TYPE_FILTERS: { key: UnitType | 'Tous'; label: string }[] = [
  { key: 'Tous',       label: 'Tous' },
  { key: 'Infanterie', label: 'Infanterie' },
  { key: 'Véhicule',   label: 'Véhicule' },
  { key: 'Héros',      label: 'Héros' },
  { key: 'Psyker',     label: 'Psyker' },
];

const DEFAULT_LIENS = [
  { ico: '⌚', label: 'Chronologie' },
  { ico: '☗', label: 'Personnages célèbres' },
  { ico: '⊛', label: 'Monde d\'origine' },
  { ico: '⚜', label: 'Héraldique et symboles' },
  { ico: '⚔', label: 'Relations et alliances' },
];

const DEFAULT_RESOURCES = [
  { ico: '▤', label: 'Lexique Warhammer 40,000' },
  { ico: '⊛', label: 'Carte galactique' },
  { ico: '☖', label: 'Bibliothèque des archives' },
  { ico: '✎', label: 'Voir les romans liés' },
];

@Component({
  selector: 'app-faction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (faction(); as f) {
      <a class="back-btn" routerLink="/factions">← RETOUR AUX FACTIONS</a>

      <section class="hero" [style.--hero-img]="heroImg()">
        <div class="hero-text">
          <span class="badge-type" [class]="'b-' + f.alignement.toLowerCase()">{{ f.alignement }}</span>
          <h1>{{ f.nom }}</h1>
          @if (f.sousTitre) {
            <div class="hero-sub">
              {{ f.sousTitre }}<span class="sub-line"></span>
            </div>
          }
          <p class="hero-desc">{{ f.description }}</p>
          <button class="cta" (click)="scrollToUnits()">
            <span class="cta-ico">⚔</span>EXPLORER LES UNITÉS
          </button>
          @if (f.citation) {
            <blockquote class="hero-quote">
              <span class="quote-sigil">{{ f.symbole }}</span>
              <span class="quote-text">« {{ f.citation }} »</span>
            </blockquote>
          }
        </div>
      </section>

      <section class="layout">
        <div class="main">
          <section class="lore" [style.--lore-img]="loreImg()">
            <h2 class="section-title"><span class="t-flourish">✠</span>Histoire & Lore</h2>
            <div class="lore-grid">
              <div class="lore-cols">
                <article class="lore-col">
                  <div class="lc-head"><span class="lc-ico">⊛</span><strong>Origine</strong></div>
                  <p>{{ f.lore?.origine || loreFallback(f, 'origine') }}</p>
                </article>
                <article class="lore-col">
                  <div class="lc-head"><span class="lc-ico">⚜</span><strong>Organisation</strong></div>
                  <p>{{ f.lore?.organisation || loreFallback(f, 'organisation') }}</p>
                </article>
                <article class="lore-col">
                  <div class="lc-head"><span class="lc-ico">⚔</span><strong>Doctrine</strong></div>
                  <p>{{ f.lore?.doctrine || loreFallback(f, 'doctrine') }}</p>
                </article>
              </div>
              <div class="lore-image"></div>
            </div>
          </section>

          @if (subFactions().length > 0) {
            <section class="subfactions" id="subfactions">
              <div class="units-head">
                <h2 class="section-title">
                  <span class="t-flourish">✠</span>{{ subFactionLabel() }}
                </h2>
                <span class="sf-count">{{ subFactions().length }} {{ subFactionLabelLower() }}</span>
              </div>
              <div class="sf-grid">
                @for (sf of subFactions(); track sf.id) {
                  <a class="sf-card" [routerLink]="['/subfactions', sf.id]"
                     [style.--sf-img]="subFactionImg(sf.id)">
                    @if (primarchImgUrl(sf.id); as pImg) {
                      <div class="sf-primarch" [title]="sf.primarch">
                        <img [src]="pImg" [alt]="sf.primarch || ''" loading="lazy" />
                      </div>
                    }
                    <div class="sf-content">
                      <span class="sf-type">{{ subFactionTypeLabel(sf.type) }}</span>
                      <h3>{{ sf.name }}</h3>
                      <p>{{ sf.loreShort || sf.description }}</p>
                      @if (sf.primarch) { <span class="sf-meta">Primarque · {{ sf.primarch }}</span> }
                      @else if (sf.homeworld) { <span class="sf-meta">{{ sf.homeworld }}</span> }
                      <span class="u-arrow">→</span>
                    </div>
                  </a>
                }
              </div>
            </section>
          }

          <section class="units" id="units">
            <div class="units-head">
              <h2 class="section-title"><span class="t-flourish">✠</span>Explorer les unités</h2>
            </div>

            <div class="toolbar">
              <div class="filters">
                @for (t of typeFilters; track t.key) {
                  <button class="filter" [class.active]="typeFilter() === t.key" (click)="typeFilter.set(t.key)">
                    {{ t.label }}
                  </button>
                }
              </div>
              <input class="search" type="text" placeholder="Rechercher une unité..."
                     [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
            </div>

            @if (visibleUnits().length === 0) {
              <div class="empty">
                <p>Aucune unité ne correspond pour cette faction.</p>
              </div>
            } @else {
              <div class="units-grid">
                @for (u of displayedUnits(); track u.id) {
                  <article class="unit-card" [routerLink]="['/units', u.id]"
                           [style.--unit-img]="unitImg(u)">
                    <span class="u-badge" [class]="unitBadgeClass(u.type)">{{ u.type }}</span>
                    <div class="unit-content">
                      <h3>{{ u.nom }}</h3>
                      <p>{{ u.loreCourt || u.description || u.role || '—' }}</p>
                      <span class="u-arrow">→</span>
                    </div>
                  </article>
                }
                @if (extraUnitCount() > 0) {
                  <article class="unit-extra" (click)="resetUnitFilters()">
                    <div class="ue-sigil">⚜</div>
                    <h3>Voir toutes les unités</h3>
                    <p>+{{ extraUnitCount() }} autres unités disponibles</p>
                    <span class="u-arrow">→</span>
                  </article>
                }
              </div>
            }
          </section>
        </div>

        <aside class="sidebar">
          <section class="sp">
            <h3>À propos des {{ f.nom }}</h3>
            <p>{{ f.description }}</p>
          </section>

          <section class="sp">
            <h3>Liens rapides</h3>
            @for (l of liensRapides(); track l.label) {
              <div class="row-link">
                <span class="rl-ico">{{ l.ico }}</span>
                <span class="rl-label">{{ l.label }}</span>
              </div>
            }
          </section>

          @if (hasStats()) {
            <section class="sp">
              <h3>Statistiques</h3>
              @if (f.stats?.chapitresConnus) {
                <div class="row-stat"><span>Chapitres connus</span><strong>{{ f.stats!.chapitresConnus }}</strong></div>
              }
              @if (f.stats?.effectifs) {
                <div class="row-stat"><span>Effectifs estimés</span><strong>{{ f.stats!.effectifs }}</strong></div>
              }
              @if (f.stats?.mondeOrigine) {
                <div class="row-stat"><span>Monde d'origine</span><strong>{{ f.stats!.mondeOrigine }}</strong></div>
              }
              @if (f.stats?.allegiance) {
                <div class="row-stat"><span>Allégeance</span><strong>{{ f.stats!.allegiance }}</strong></div>
              }
            </section>
          }

          <section class="sp">
            <h3>Médias</h3>
            @if (featuredVideo(); as v) {
              <a class="media-card" [routerLink]="'/videos'">
                <div class="media-thumb" [style.--m-img]="videoThumb(v)">
                  <span class="play">▶</span>
                  @if (v.duration) { <span class="dur">{{ v.duration }}</span> }
                </div>
                <strong>Vidéo à la une</strong>
                <span>{{ v.titre }}</span>
              </a>
            }
            <a class="media-card" routerLink="/gallery">
              <div class="media-thumb" [style.--m-img]="galleryThumb()">
                <span class="play">▦</span>
              </div>
              <strong>Galerie</strong>
              <span>Illustrations et artworks</span>
            </a>
          </section>

          <section class="sp">
            <h3>Ressources</h3>
            @for (r of ressources(); track r.label) {
              <div class="row-link">
                <span class="rl-ico">{{ r.ico }}</span>
                <span class="rl-label">{{ r.label }}</span>
              </div>
            }
          </section>

          @if (f.citation) {
            <blockquote class="side-quote">
              « {{ f.citation }} »
            </blockquote>
          }
        </aside>
      </section>
    } @else {
      <div class="loading">
        <p>Chargement de la faction...</p>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* BACK */
    .back-btn {
      display: inline-block;
      color: var(--gold);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-decoration: none;
      margin-bottom: 18px;
      transition: opacity 0.2s;
    }
    .back-btn:hover { opacity: 0.7; }

    /* HERO */
    .hero {
      position: relative;
      min-height: 480px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #080706;
      box-shadow: var(--shadow), inset 0 0 110px rgba(201, 162, 74, 0.045);
      margin-bottom: 36px;
      display: flex;
      align-items: center;
      padding: 44px 50px;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(0,0,0,.97) 0%, rgba(0,0,0,.7) 38%, rgba(0,0,0,.18) 65%, transparent 100%),
        linear-gradient(0deg, rgba(0,0,0,.85) 0%, transparent 55%),
        var(--hero-img, none);
      background-size: cover;
      background-position: right center;
      filter: contrast(1.4) saturate(0.9) brightness(0.6);
    }
    .hero-text {
      position: relative;
      z-index: 1;
      max-width: 56%;
    }
    .badge-type {
      display: inline-block;
      padding: 5px 12px;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      border: 1px solid var(--gold);
      color: var(--gold-bright);
      background: rgba(201, 162, 74, 0.1);
      margin-bottom: 14px;
    }
    .b-imperium { border-color: rgba(110, 165, 230, 0.6); color: #aac8ee; background: rgba(73, 125, 190, 0.18); }
    .b-chaos    { border-color: rgba(220, 80, 80, 0.6); color: #ff9a9a; background: rgba(170, 45, 45, 0.18); }
    .b-xenos    { border-color: rgba(50, 200, 130, 0.55); color: #8af0bc; background: rgba(35, 145, 90, 0.18); }
    .hero h1 {
      margin: 0 0 8px;
      font-family: var(--serif);
      color: var(--gold-bright);
      font-size: clamp(48px, 5.5vw, 92px);
      line-height: 0.92;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.85), 0 0 40px rgba(201, 162, 74, 0.32);
    }
    .hero-sub {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--gold);
      font-family: var(--serif);
      font-size: 16px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      margin-bottom: 18px;
    }
    .sub-line {
      flex: 1;
      max-width: 110px;
      height: 1px;
      background: linear-gradient(90deg, var(--gold), transparent);
    }
    .hero-desc {
      color: #cfc3ad;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 22px;
      max-width: 540px;
    }
    .cta {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(180deg, #c9a24a, #a0822f);
      color: #1c1206;
      border: 1px solid var(--gold-bright);
      padding: 13px 24px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      cursor: pointer;
      transition: filter 0.2s, transform 0.2s;
      box-shadow: 0 16px 40px rgba(201, 162, 74, 0.18);
    }
    .cta:hover { filter: brightness(1.08); transform: translateY(-2px); }
    .cta-ico { font-size: 14px; }
    .hero-quote {
      display: flex;
      align-items: center;
      gap: 18px;
      margin: 30px 0 0;
      padding: 0;
      max-width: 540px;
    }
    .quote-sigil {
      font-size: 38px;
      color: var(--gold);
      opacity: 0.65;
      line-height: 1;
    }
    .quote-text {
      font-family: var(--serif);
      font-style: italic;
      color: #d4c8aa;
      font-size: 14px;
      line-height: 1.55;
    }

    /* LAYOUT */
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 28px;
    }
    .main { min-width: 0; display: flex; flex-direction: column; gap: 36px; }

    .section-title {
      margin: 0 0 22px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 26px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 14px;
    }
    .t-flourish {
      color: var(--gold);
      font-size: 0.6em;
      opacity: 0.85;
    }

    /* LORE */
    .lore {
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(19,15,11,0.92), rgba(5,4,3,0.96));
      padding: 28px 30px;
      box-shadow: var(--shadow);
    }
    .lore-grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
      gap: 26px;
    }
    .lore-cols {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 22px;
    }
    .lore-col p {
      margin: 0;
      color: #c3baaa;
      font-size: 13px;
      line-height: 1.65;
    }
    .lc-head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .lc-ico {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.4);
      color: var(--gold);
      background: rgba(201, 162, 74, 0.08);
      font-size: 14px;
    }
    .lc-head strong {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 16px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .lore-image {
      min-height: 240px;
      border: 1px solid rgba(201, 162, 74, 0.18);
      background:
        linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%),
        var(--lore-img, none);
      background-size: cover;
      background-position: center;
      filter: contrast(1.2) saturate(0.95) brightness(0.7);
    }

    /* SUBFACTIONS */
    .subfactions { margin-bottom: 36px; }
    .sf-count {
      color: var(--gold);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .sf-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 14px;
      margin-top: 18px;
    }
    .sf-card {
      position: relative;
      display: block;
      aspect-ratio: 1 / 1.05;
      overflow: hidden;
      border: 1px solid rgba(201, 162, 74, 0.24);
      background: var(--panel);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
      text-decoration: none;
      color: inherit;
      transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
    }
    .sf-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.95) 100%),
        var(--sf-img, linear-gradient(135deg, #1a0a08, #050403));
      background-size: cover;
      background-position: center;
      filter: contrast(1.2) saturate(0.95) brightness(0.85);
      transition: transform 0.4s ease, filter 0.4s ease;
    }
    .sf-card:hover { transform: translateY(-5px); border-color: rgba(201, 162, 74, 0.65); box-shadow: 0 28px 80px rgba(0, 0, 0, 0.7), 0 0 28px rgba(201, 162, 74, 0.1); }
    .sf-card:hover::before { transform: scale(1.06); filter: contrast(1.3) saturate(1.05) brightness(0.95); }

    /* Mini-portrait primarque dans coin haut-droit de la card */
    .sf-primarch {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 2;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid rgba(201, 162, 74, 0.6);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.7), 0 0 16px rgba(201, 162, 74, 0.25);
      background: #050403;
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
    }
    .sf-primarch img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center top;
      filter: contrast(1.1) saturate(1.05);
      display: block;
    }
    .sf-card:hover .sf-primarch {
      transform: scale(1.1);
      border-color: var(--gold-bright);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.8), 0 0 22px rgba(240, 210, 118, 0.5);
    }
    .sf-content {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      z-index: 2;
      padding: 16px 18px;
    }
    .sf-type {
      display: inline-block;
      color: var(--gold);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-bottom: 6px;
      border: 1px solid rgba(201, 162, 74, 0.35);
      background: rgba(201, 162, 74, 0.1);
      padding: 2px 8px;
    }
    .sf-content h3 {
      margin: 0 0 6px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 18px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .sf-content p {
      color: #cfc3ad;
      font-size: 13px;
      line-height: 1.45;
      margin: 0 0 6px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .sf-meta {
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.04em;
    }
    .sf-card .u-arrow {
      position: absolute;
      bottom: 14px;
      right: 16px;
      color: var(--gold);
      font-size: 16px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    .sf-card:hover .u-arrow { opacity: 1; }

    /* UNITS */
    .units-head { display: flex; align-items: center; justify-content: space-between; }

    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
      gap: 14px;
      margin-bottom: 22px;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; }
    .filter {
      height: 36px;
      padding: 0 16px;
      border: 1px solid rgba(201, 162, 74, 0.28);
      background: rgba(0, 0, 0, 0.42);
      color: var(--text);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;
    }
    .filter:hover { border-color: rgba(201, 162, 74, 0.5); }
    .filter.active {
      color: #1c1206;
      background: linear-gradient(180deg, #c9a24a, #a0822f);
      border-color: var(--gold-bright);
    }
    .search {
      height: 36px;
      border: 1px solid rgba(201, 162, 74, 0.32);
      background: rgba(5, 4, 3, 0.78);
      color: var(--text);
      padding: 0 14px;
      outline: none;
      font-family: inherit;
      font-size: 13px;
    }
    .search::placeholder { color: var(--muted); }
    .search:focus { border-color: var(--border-strong); }

    .units-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .unit-card {
      position: relative;
      min-height: 280px;
      overflow: hidden;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: var(--panel);
      box-shadow: 0 14px 50px rgba(0, 0, 0, 0.55);
      transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
      cursor: pointer;
      display: flex;
      flex-direction: column;
    }
    .unit-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.96) 100%),
        var(--unit-img, none);
      background-size: cover;
      background-position: center;
      filter: contrast(1.3) saturate(1.05) brightness(0.75);
      transition: transform 0.35s, filter 0.35s;
    }
    .unit-card:hover {
      transform: translateY(-5px);
      border-color: rgba(201, 162, 74, 0.65);
      box-shadow: 0 24px 70px rgba(0, 0, 0, 0.75);
    }
    .unit-card:hover::before {
      transform: scale(1.05);
      filter: contrast(1.42) saturate(1.2) brightness(0.85);
    }
    .u-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      z-index: 2;
      padding: 4px 10px;
      font-size: 9px;
      letter-spacing: 0.14em;
      font-weight: 900;
      text-transform: uppercase;
      border: 1px solid;
    }
    .ub-infanterie { border-color: rgba(73, 125, 190, 0.7); color: #9dbfff; background: rgba(20, 40, 70, 0.82); }
    .ub-vehicule   { border-color: rgba(201, 162, 74, 0.7); color: var(--gold-bright); background: rgba(60, 50, 25, 0.85); }
    .ub-heros      { border-color: rgba(220, 80, 80, 0.6); color: #ff9a9a; background: rgba(70, 20, 20, 0.85); }
    .ub-psyker     { border-color: rgba(178, 105, 222, 0.6); color: #d6a8f4; background: rgba(50, 25, 75, 0.85); }
    .ub-monstre    { border-color: rgba(50, 200, 130, 0.55); color: #8af0bc; background: rgba(20, 50, 35, 0.85); }
    .unit-content {
      position: relative;
      z-index: 1;
      margin-top: auto;
      padding: 16px 18px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .unit-content h3 {
      margin: 0;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 17px;
      line-height: 1.05;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .unit-content p {
      margin: 4px 0 0;
      color: #c3baaa;
      font-size: 12px;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .u-arrow {
      align-self: flex-end;
      color: var(--gold);
      font-size: 18px;
      margin-top: 4px;
    }

    .unit-extra {
      min-height: 280px;
      border: 1px dashed rgba(201, 162, 74, 0.45);
      background: linear-gradient(180deg, rgba(201, 162, 74, 0.06), rgba(0, 0, 0, 0.92));
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 22px 18px;
      cursor: pointer;
      transition: border-color 0.25s;
    }
    .unit-extra:hover { border-color: var(--gold-bright); }
    .ue-sigil {
      font-size: 44px;
      color: var(--gold);
      margin-bottom: 14px;
      text-shadow: 0 0 22px rgba(201, 162, 74, 0.4);
    }
    .unit-extra h3 {
      margin: 0 0 8px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 16px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .unit-extra p {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 12px;
    }

    .empty {
      border: 1px dashed rgba(201, 162, 74, 0.3);
      padding: 40px;
      text-align: center;
      color: var(--muted);
    }

    /* SIDEBAR */
    .sidebar {
      display: flex;
      flex-direction: column;
      gap: 18px;
      align-self: start;
      position: sticky;
      top: 96px;
    }
    .sp {
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(19, 15, 11, 0.92), rgba(5, 4, 3, 0.96));
      padding: 20px 22px;
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55);
    }
    .sp h3 {
      margin: 0 0 14px;
      color: var(--gold-bright);
      font-family: var(--serif);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 14px;
    }
    .sp p {
      margin: 0;
      color: #c3baaa;
      font-size: 13px;
      line-height: 1.6;
    }

    .row-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .row-link:first-of-type { border-top: 0; padding-top: 2px; }
    .row-link:hover { opacity: 0.78; }
    .rl-ico {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.3);
      color: var(--gold);
      font-size: 14px;
      background: rgba(201, 162, 74, 0.05);
    }
    .rl-label {
      color: #d6cdb6;
      font-size: 12.5px;
      letter-spacing: 0.04em;
    }

    .row-stat {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 9px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.1);
    }
    .row-stat:first-of-type { border-top: 0; padding-top: 2px; }
    .row-stat span {
      color: var(--muted);
      font-size: 11.5px;
      letter-spacing: 0.06em;
    }
    .row-stat strong {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 14px;
      letter-spacing: 0.08em;
    }

    .media-card {
      display: block;
      margin-top: 12px;
      text-decoration: none;
      color: inherit;
    }
    .media-card:first-of-type { margin-top: 0; }
    .media-card strong {
      display: block;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .media-card span {
      display: block;
      color: var(--muted);
      font-size: 11.5px;
      margin-top: 2px;
    }
    .media-thumb {
      position: relative;
      height: 110px;
      border: 1px solid rgba(201, 162, 74, 0.2);
      background:
        linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 100%),
        var(--m-img, linear-gradient(135deg, #1a1612, #050403));
      background-size: cover;
      background-position: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .media-thumb .play {
      width: 42px;
      height: 42px;
      border: 1px solid rgba(201, 162, 74, 0.55);
      background: rgba(0, 0, 0, 0.55);
      color: var(--gold);
      display: grid;
      place-items: center;
      font-size: 16px;
    }
    .media-thumb .dur {
      position: absolute;
      bottom: 8px;
      right: 8px;
      background: rgba(0, 0, 0, 0.78);
      color: var(--gold-bright);
      font-size: 11px;
      padding: 3px 7px;
      letter-spacing: 0.08em;
    }

    .side-quote {
      margin: 0;
      padding: 18px 22px;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: rgba(5, 4, 3, 0.78);
      color: #d4c8aa;
      font-family: var(--serif);
      font-style: italic;
      font-size: 13px;
      line-height: 1.65;
      text-align: center;
    }

    .loading {
      padding: 60px;
      text-align: center;
      color: var(--muted);
    }

    /* RESPONSIVE */
    @media (max-width: 1280px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar { position: relative; top: auto; }
      .hero-text { max-width: 80%; }
    }
    @media (max-width: 900px) {
      .lore-grid { grid-template-columns: 1fr; }
      .lore-cols { grid-template-columns: 1fr; gap: 16px; }
      .lore-image { min-height: 180px; }
    }
    @media (max-width: 760px) {
      .hero { padding: 26px 22px; }
      .hero-text { max-width: 100%; }
      .toolbar { grid-template-columns: 1fr; }
    }
  `],
})
export class FactionDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);

  readonly typeFilters = TYPE_FILTERS;
  readonly typeFilter = signal<UnitType | 'Tous'>('Tous');
  readonly searchQuery = signal('');
  readonly heroImage = signal<string | null>(null);
  readonly loreImage = signal<string | null>(null);
  readonly unitImages = signal(new Map<string, string>());

  readonly faction = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getFaction(p.get('id')!)))
  );
  readonly units = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getUnits(p.get('id')!))),
    { initialValue: [] as Unit[] }
  );
  readonly subFactions = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getSubFactions(p.get('id')!))),
    { initialValue: [] as SubFaction[] }
  );
  readonly subFactionImages = signal(new Map<string, string>());
  readonly primarchImages = signal(new Map<string, string>());

  readonly subFactionLabel = computed(() => {
    const list = this.subFactions();
    if (!list.length) return 'Sous-factions';
    const types = new Set(list.map(s => s.type));
    if (types.size === 1) {
      const t = list[0].type;
      const map: Record<string, string> = {
        chapter: 'Chapitres', regiment: 'Régiments', klan: 'Klans',
        craftworld: 'Vaisseaux-Mondes', hivefleet: 'Flottes-Ruches',
        dynasty: 'Dynasties', sept: 'Septs', forgeworld: 'Mondes-Forges',
        order: 'Ordres', legion: 'Légions',
        shield_host: 'Shield Hosts', temple: 'Temples',
        kabal: 'Kabales', wych_cult: 'Cultes Wych',
        haemonculus_coven: 'Covens Haemonculus', brotherhood: 'Brotherhoods',
        kindred: 'Kindreds', cult: 'Cultes',
        other: 'Sous-factions',
      };
      return map[t] ?? 'Sous-factions';
    }
    return 'Sous-factions';
  });

  readonly subFactionLabelLower = computed(() => this.subFactionLabel().toLowerCase());

  subFactionTypeLabel(type: SubFactionType): string {
    const map: Record<SubFactionType, string> = {
      chapter: 'Chapitre', regiment: 'Régiment', klan: 'Klan',
      craftworld: 'Vaisseau-Monde', hivefleet: 'Flotte-Ruche',
      dynasty: 'Dynastie', sept: 'Sept', forgeworld: 'Monde-Forge',
      order: 'Ordre', legion: 'Légion',
      shield_host: 'Shield Host', temple: 'Temple',
      kabal: 'Kabale', wych_cult: 'Culte Wych',
      haemonculus_coven: 'Coven Haemonculus', brotherhood: 'Brotherhood',
      kindred: 'Kindred', cult: 'Culte',
      other: 'Sous-faction',
    };
    return map[type] ?? type;
  }

  primarchImgUrl(id: string): string | null {
    return this.primarchImages().get(id) ?? null;
  }

  subFactionImg(id: string): string | null {
    const url = this.subFactionImages().get(id);
    return url ? `url('${url}')` : null;
  }
  readonly videos = toSignal(this.service.videos$, { initialValue: [] });
  readonly artworks = toSignal(this.service.artworks$, { initialValue: [] });

  readonly visibleUnits = computed(() => {
    const t = this.typeFilter();
    const q = this.searchQuery().toLowerCase().trim();
    let out = this.units();
    if (t !== 'Tous') out = out.filter(u => u.type === t);
    if (q) {
      out = out.filter(u =>
        u.nom.toLowerCase().includes(q) ||
        (u.role ?? '').toLowerCase().includes(q) ||
        (u.description ?? '').toLowerCase().includes(q)
      );
    }
    return out;
  });

  readonly displayedUnits = computed(() => this.visibleUnits().slice(0, 7));
  readonly extraUnitCount = computed(() => Math.max(0, this.visibleUnits().length - 7));

  readonly featuredVideo = computed(() => {
    const vids = this.videos();
    return vids.find(v => v.featured) ?? vids.find(v => v.incontournable) ?? vids[0] ?? null;
  });

  constructor() {
    effect(() => {
      const f = this.faction();
      if (!f) return;
      this.heroImage.set(null);
      this.loreImage.set(null);

      const heroQ = FACTION_WIKI[f.id] ?? f.nom;
      this.service.getWikiImage(heroQ).subscribe({
        next: r => { if (r.imageUrl) this.heroImage.set(r.imageUrl); },
        error: () => {},
      });

      const loreQ = FACTION_LORE_IMG[f.id] ?? f.nom + ' battle';
      this.service.getWikiImage(loreQ).subscribe({
        next: r => { if (r.imageUrl) this.loreImage.set(r.imageUrl); },
        error: () => {},
      });
    });

    effect(() => {
      const list = this.units();
      if (!list.length) return;
      list.forEach(u => {
        if (this.unitImages().has(u.id)) return;
        const datasheetUrl = `/api/images/datasheets/${u.id}`;
        fetch(datasheetUrl, { method: 'HEAD' }).then(head => {
          if (head.ok) {
            this.unitImages.update(m => new Map(m).set(u.id, datasheetUrl));
          } else {
            this.service.getWikiImage(u.wikiQuery ?? u.nom).subscribe({
              next: r => {
                if (r.imageUrl) {
                  this.unitImages.update(m => new Map(m).set(u.id, r.imageUrl!));
                }
              },
              error: () => {},
            });
          }
        }).catch(() => {});
      });
    });

    effect(() => {
      const list = this.subFactions();
      if (!list.length) return;
      list.forEach(s => {
        if (this.subFactionImages().has(s.id)) return;
        const q = s.wikiQuery ?? `${s.name} warhammer`;
        this.service.getWikiImage(q).subscribe({
          next: r => {
            if (r.imageUrl) {
              this.subFactionImages.update(m => new Map(m).set(s.id, r.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });

    // Charge images primarques pour mini-portrait dans sous-faction card
    effect(() => {
      const list = this.subFactions();
      if (!list.length) return;
      list.forEach(s => {
        if (!s.primarchWikiQuery || this.primarchImages().has(s.id)) return;
        this.service.getWikiImage(s.primarchWikiQuery).subscribe({
          next: r => {
            if (r.imageUrl) {
              this.primarchImages.update(m => new Map(m).set(s.id, r.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });
  }

  scrollToUnits() {
    document.getElementById('units')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  resetUnitFilters() {
    this.typeFilter.set('Tous');
    this.searchQuery.set('');
  }

  heroImg(): string {
    const url = this.heroImage();
    if (url) return `url('${url}')`;
    const f = this.faction();
    if (f) return `linear-gradient(135deg, ${f.couleurThematique}cc 0%, #050403 80%)`;
    return 'none';
  }

  loreImg(): string {
    const url = this.loreImage();
    if (url) return `url('${url}')`;
    return 'linear-gradient(135deg, #2a1c10 0%, #050403 100%)';
  }

  unitImg(u: Unit): string {
    const url = this.unitImages().get(u.id);
    if (url) return `url('${url}')`;
    const f = this.faction();
    return `linear-gradient(135deg, ${f?.couleurThematique ?? '#1a3a6e'}aa 0%, #050403 100%)`;
  }

  unitBadgeClass(t: UnitType): string {
    switch (t) {
      case 'Infanterie': return 'u-badge ub-infanterie';
      case 'Véhicule':   return 'u-badge ub-vehicule';
      case 'Héros':      return 'u-badge ub-heros';
      case 'Psyker':     return 'u-badge ub-psyker';
      case 'Monstre':    return 'u-badge ub-monstre';
      default: return 'u-badge';
    }
  }

  liensRapides() {
    const f = this.faction();
    if (f?.liensRapides?.length) {
      return f.liensRapides.map((label, i) => ({
        ico: DEFAULT_LIENS[i % DEFAULT_LIENS.length].ico,
        label,
      }));
    }
    return DEFAULT_LIENS;
  }

  ressources() {
    const f = this.faction();
    if (f?.resources?.length) {
      return f.resources.map((label, i) => ({
        ico: DEFAULT_RESOURCES[i % DEFAULT_RESOURCES.length].ico,
        label,
      }));
    }
    return DEFAULT_RESOURCES;
  }

  hasStats(): boolean {
    const s = this.faction()?.stats;
    return !!(s?.chapitresConnus || s?.effectifs || s?.mondeOrigine || s?.allegiance);
  }

  loreFallback(f: Faction, key: 'origine' | 'organisation' | 'doctrine'): string {
    const fallbacks = {
      origine: `Les ${f.nom} trouvent leurs racines dans les profondeurs du 41e millénaire. Leur histoire est marquée par la guerre éternelle qui ravage la galaxie.`,
      organisation: `Structurés selon leurs propres traditions et doctrines, les ${f.nom} forment une force redoutable au sein de leur faction.`,
      doctrine: `${f.description} Leur doctrine guide chacun de leurs actes dans la sombre éternité de l'Imperium et au-delà.`,
    };
    return fallbacks[key];
  }

  videoThumb(v: { thumbnail?: string; embedId: string | null }): string {
    if (v.thumbnail) return `url('${v.thumbnail}')`;
    if (v.embedId) return `url('https://i.ytimg.com/vi/${v.embedId}/hqdefault.jpg')`;
    return 'linear-gradient(135deg, #1a1612, #050403)';
  }

  galleryThumb(): string {
    const arts = this.artworks();
    const first = arts[0];
    if (first?.image) return `url('${first.image}')`;
    return 'linear-gradient(135deg, #2a1c10, #050403)';
  }
}
