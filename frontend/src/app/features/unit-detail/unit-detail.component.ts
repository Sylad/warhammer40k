import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { WarhammerService } from '../../core/services/warhammer.service';
import { Faction, Unit, UnitType } from '../../core/models/models';

type TabKey = 'apercu' | 'equipement' | 'lore' | 'regles' | 'variantes' | 'galerie';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'apercu',     label: 'Aperçu' },
  { key: 'equipement', label: 'Équipement' },
  { key: 'lore',       label: 'Histoire & Lore' },
  { key: 'regles',     label: 'Règles (optionnel)' },
  { key: 'variantes',  label: 'Variantes' },
  { key: 'galerie',    label: 'Galerie' },
];

const STAT_ROWS: { key: keyof NonNullable<Unit['stats']>; label: string }[] = [
  { key: 'endurance',    label: 'Endurance' },
  { key: 'resistance',   label: 'Résistance' },
  { key: 'puissanceFeu', label: 'Puissance de feu' },
  { key: 'mobilite',     label: 'Mobilité' },
  { key: 'portee',       label: 'Portée' },
  { key: 'soutien',      label: 'Soutien' },
];

const DEFAULT_LIENS = [
  { ico: '⚜', key: 'faction',     label: 'Voir la faction' },
  { ico: '⚔', key: 'all-units',   label: 'Voir toutes les unités' },
  { ico: '▤', key: 'lore',        label: 'Histoire & contexte' },
  { ico: '☖', key: 'codex',       label: 'Codex de référence' },
];

const DEFAULT_RESOURCES = [
  { ico: '▤', label: 'Lexique Warhammer 40,000' },
  { ico: '⊛', label: 'Carte galactique' },
  { ico: '☖', label: 'Bibliothèque des archives' },
  { ico: '✎', label: 'Voir les romans liés' },
];

const KEY_ICONS = ['⚜', '✠', '⚔'];

const DEFAULT_CAPACITIES = [
  'Polyvalent dans toutes les situations de combat.',
  'Équilibré entre offensive et défense.',
  'Idéal pour tenir des objectifs stratégiques.',
  'Efficace à moyenne portée.',
];

const DEFAULT_EQUIPMENT_ICONS = ['⌖', '⚔', '◈', '※'];

@Component({
  selector: 'app-unit-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    @if (unit(); as u) {
      @if (faction(); as f) {
        <div class="topbar">
          <a class="back-btn" [routerLink]="['/factions', f.id]">← RETOUR AUX UNITÉS</a>
          <div class="topbar-actions">
            <button class="iconbtn" type="button" title="Bookmark"><span>☖</span></button>
            <button class="iconbtn" type="button" title="Partager"><span>↗</span></button>
          </div>
        </div>

        <section class="hero" [style.--hero-img]="unitImg()">
          <div class="hero-text">
            <h1>{{ u.nom }}</h1>
            <div class="hero-badges">
              @for (b of badges(u, f); track b.label) {
                <span class="ub" [class]="b.cls">{{ b.label }}</span>
              }
              @if (f.symbole || f.iconUrl) {
                <span class="hero-sigil">
                  @if (f.iconUrl) {
                    <img [src]="f.iconUrl" [alt]="f.nom" />
                  } @else {
                    {{ f.symbole }}
                  }
                </span>
              }
            </div>
            @if (u.role) {
              <p class="hero-role">{{ u.role }}.</p>
            }
            <p class="hero-desc">{{ u.description || u.loreCourt || f.description }}</p>
            <div class="hero-cta">
              <a class="cta cta-solid" routerLink="/galerie">
                <span class="cta-ico">▦</span>VOIR DANS LA GALERIE
              </a>
              <a class="cta cta-outline" routerLink="/videos">
                <span class="cta-ico">▶</span>VOIR LA VIDÉO
              </a>
            </div>
          </div>
        </section>

        <nav class="tabs">
          @for (t of tabs; track t.key) {
            <button class="tab" [class.active]="activeTab() === t.key" (click)="activeTab.set(t.key)">
              {{ t.label }}
            </button>
          }
        </nav>

        <section class="layout">
          <div class="main">
            <!-- APERÇU -->
            @if (activeTab() === 'apercu' || activeTab() === 'equipement') {
              <div class="grid-2">
                @if (activeTab() === 'apercu') {
                  <article class="panel">
                    <h2 class="panel-title">Description</h2>
                    <p class="panel-text">{{ u.loreLong || u.description || u.loreCourt || fallbackDesc(u, f) }}</p>
                  </article>

                  <article class="panel">
                    <h2 class="panel-title">Capacités principales</h2>
                    <ul class="cap-list">
                      @for (c of capacities(u); track c) {
                        <li>
                          <span class="cap-ico">⚜</span>
                          <span>{{ c }}</span>
                        </li>
                      }
                    </ul>
                  </article>
                }

                <article class="panel panel-equip">
                  <h2 class="panel-title">Équipement standard</h2>
                  <div class="equip-grid">
                    <div class="equip-figure" [style.--fig-img]="unitImg()"></div>
                    <ul class="equip-list">
                      @for (e of equipment(u); track e.name; let i = $index) {
                        <li>
                          <span class="eq-ico">{{ e.icon || equipIcon(i) }}</span>
                          <div>
                            <strong>{{ e.name }}</strong>
                            <span>{{ e.description || '—' }}</span>
                          </div>
                        </li>
                      }
                    </ul>
                  </div>
                </article>

                @if (activeTab() === 'apercu') {
                  <article class="panel panel-stats">
                    <h2 class="panel-title">Stats (approx.)</h2>
                    <div class="stats-list">
                      @for (s of statsRows(u); track s.label) {
                        <div class="stat-row">
                          <span class="stat-lbl">{{ s.label }}</span>
                          <span class="stat-val">{{ s.value }}</span>
                          <div class="stat-bar"><div class="stat-fill" [style.width.%]="s.value * 10"></div></div>
                          <span class="stat-val">{{ s.value }}</span>
                        </div>
                      }
                    </div>
                    <h3 class="panel-sub">Icônes clés</h3>
                    <div class="key-icons">
                      @for (k of keyIcons(u, f); track k.label; let i = $index) {
                        <div class="ki">
                          <span class="ki-glyph">{{ KEY_ICONS[i % KEY_ICONS.length] }}</span>
                          <span class="ki-lbl">{{ k.label }}</span>
                        </div>
                      }
                    </div>
                  </article>
                }
              </div>
            }

            <!-- HISTOIRE & LORE -->
            @if (activeTab() === 'apercu' || activeTab() === 'lore') {
              <article class="panel panel-lore">
                <h2 class="panel-title">Histoire & Lore</h2>
                <div class="lore-grid">
                  <p class="panel-text">{{ u.loreLong || u.description || fallbackLore(u, f) }}</p>
                  <div class="lore-img" [style.--lore-img]="loreImg()"></div>
                </div>
                @if (u.citation) {
                  <blockquote class="inline-quote">« {{ u.citation }} »</blockquote>
                }
              </article>
            }

            <!-- VARIANTES -->
            @if (activeTab() === 'apercu' || activeTab() === 'variantes') {
              @if (u.variants?.length) {
                <article class="panel">
                  <h2 class="panel-title">Variantes &amp; options</h2>
                  <div class="variants-grid">
                    @for (v of u.variants; track v.id) {
                      <div class="variant-card" [style.--v-img]="variantImg(v.image)">
                        <strong>{{ v.name }}</strong>
                        @if (v.description) {
                          <span>{{ v.description }}</span>
                        }
                      </div>
                    }
                  </div>
                </article>
              }
            }

            <!-- RÈGLES (placeholder) -->
            @if (activeTab() === 'regles') {
              <article class="panel">
                <h2 class="panel-title">Règles</h2>
                <p class="panel-text muted">Les règles détaillées de cette unité seront ajoutées dans une prochaine mise à jour. Consultez le codex de référence pour le moment.</p>
              </article>
            }

            <!-- GALERIE (placeholder) -->
            @if (activeTab() === 'galerie') {
              <article class="panel">
                <h2 class="panel-title">Galerie</h2>
                <p class="panel-text muted">La galerie d'œuvres dédiée à cette unité sera enrichie prochainement. En attendant, consultez la galerie générale de la faction.</p>
                <a class="cta cta-outline" routerLink="/galerie">
                  <span class="cta-ico">▦</span>OUVRIR LA GALERIE
                </a>
              </article>
            }
          </div>

          <aside class="sidebar">
            <section class="sp">
              <h3>Informations clés</h3>
              @for (info of infoRows(u, f); track info.label) {
                <div class="info-row">
                  <span class="info-ico">{{ info.ico }}</span>
                  <div>
                    <strong>{{ info.label }}</strong>
                    <span>{{ info.value }}</span>
                  </div>
                </div>
              }
            </section>

            <section class="sp">
              <h3>Liens rapides</h3>
              <a class="row-link" [routerLink]="['/factions', f.id]">
                <span class="rl-ico">⚜</span>
                <span class="rl-label">{{ f.nom }}</span>
                <span class="rl-arrow">›</span>
              </a>
              <a class="row-link" [routerLink]="['/factions', f.id]" fragment="units">
                <span class="rl-ico">⚔</span>
                <span class="rl-label">Voir toutes les unités</span>
                <span class="rl-arrow">›</span>
              </a>
              <a class="row-link" routerLink="/romans">
                <span class="rl-ico">▤</span>
                <span class="rl-label">Histoire de l'unité</span>
                <span class="rl-arrow">›</span>
              </a>
              <a class="row-link" routerLink="/romans">
                <span class="rl-ico">☖</span>
                <span class="rl-label">Codex {{ f.nom }}</span>
                <span class="rl-arrow">›</span>
              </a>
            </section>

            @if (relatedUnits().length) {
              <section class="sp">
                <h3>Unités associées</h3>
                @for (r of relatedUnits(); track r.id) {
                  <a class="related" [routerLink]="['/units', r.id]" [style.--r-img]="relatedImg(r)">
                    <div class="related-thumb"></div>
                    <div class="related-info">
                      <strong>{{ r.nom }}</strong>
                      <span>{{ r.type }}</span>
                    </div>
                  </a>
                }
                <a class="cta cta-outline cta-block" [routerLink]="['/factions', f.id]" fragment="units">
                  VOIR TOUTES LES UNITÉS
                </a>
              </section>
            }

            @if (u.citation) {
              <section class="sp sp-quote">
                <h3>Citation</h3>
                <blockquote>
                  <span class="q-mark">“</span>
                  <span class="q-text">{{ u.citation }}</span>
                  <span class="q-mark q-end">”</span>
                </blockquote>
                <span class="q-source">— Litanies de Bataille</span>
              </section>
            }

            <section class="sp">
              <h3>Ressources</h3>
              @for (r of resources; track r.label) {
                <div class="row-link">
                  <span class="rl-ico">{{ r.ico }}</span>
                  <span class="rl-label">{{ r.label }}</span>
                </div>
              }
            </section>

            <button class="report-btn" type="button">
              <span>⚠</span>SIGNALER UNE ERREUR
            </button>
          </aside>
        </section>
      } @else {
        <div class="loading"><p>Chargement de la faction...</p></div>
      }
    } @else {
      <div class="loading"><p>Chargement de l'unité...</p></div>
    }
  `,
  styles: [`
    :host { display: block; }

    .KEY_ICONS_HACK { display: none; }

    /* TOPBAR */
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
    }
    .back-btn {
      color: var(--gold);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .back-btn:hover { opacity: 0.7; }
    .topbar-actions { display: flex; gap: 8px; }
    .iconbtn {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      background: rgba(0,0,0,0.5);
      border: 1px solid rgba(201, 162, 74, 0.32);
      color: var(--gold);
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s, background 0.2s;
    }
    .iconbtn:hover { border-color: var(--gold-bright); background: rgba(201, 162, 74, 0.1); }

    /* HERO */
    .hero {
      position: relative;
      min-height: 440px;
      border: 1px solid var(--border);
      overflow: hidden;
      background: #080706;
      box-shadow: var(--shadow), inset 0 0 110px rgba(201, 162, 74, 0.045);
      margin-bottom: 26px;
      display: flex;
      align-items: center;
      padding: 38px 46px;
    }
    .hero::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(0,0,0,.96) 0%, rgba(0,0,0,.7) 38%, rgba(0,0,0,.18) 65%, transparent 100%),
        linear-gradient(0deg, rgba(0,0,0,.85) 0%, transparent 60%),
        var(--hero-img, none);
      background-size: cover;
      background-position: right center;
      filter: contrast(1.4) saturate(0.9) brightness(0.6);
    }
    .hero-text { position: relative; z-index: 1; max-width: 56%; }
    .hero h1 {
      margin: 0 0 14px;
      font-family: var(--serif);
      color: var(--gold-bright);
      font-size: clamp(38px, 4.4vw, 64px);
      line-height: 0.95;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-shadow: 0 0 36px rgba(201, 162, 74, 0.32);
    }
    .hero-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 14px;
    }
    .ub {
      padding: 4px 11px;
      font-size: 10px;
      letter-spacing: 0.16em;
      font-weight: 900;
      text-transform: uppercase;
      border: 1px solid;
    }
    .ub-infanterie { border-color: rgba(73, 125, 190, 0.7); color: #aac8ee; background: rgba(20, 40, 70, 0.78); }
    .ub-vehicule   { border-color: rgba(201, 162, 74, 0.7); color: var(--gold-bright); background: rgba(60, 50, 25, 0.85); }
    .ub-heros      { border-color: rgba(220, 80, 80, 0.6); color: #ff9a9a; background: rgba(70, 20, 20, 0.78); }
    .ub-psyker     { border-color: rgba(178, 105, 222, 0.6); color: #d6a8f4; background: rgba(50, 25, 75, 0.78); }
    .ub-monstre    { border-color: rgba(50, 200, 130, 0.55); color: #8af0bc; background: rgba(20, 50, 35, 0.78); }
    .ub-ligne      { border-color: rgba(201, 162, 74, 0.55); color: var(--gold-bright); background: rgba(40, 32, 16, 0.78); }
    .ub-imperium   { border-color: rgba(73, 125, 190, 0.7); color: #aac8ee; background: rgba(20, 40, 70, 0.78); }
    .ub-chaos      { border-color: rgba(220, 80, 80, 0.6); color: #ff9a9a; background: rgba(70, 20, 20, 0.78); }
    .ub-xenos      { border-color: rgba(50, 200, 130, 0.55); color: #8af0bc; background: rgba(20, 50, 35, 0.78); }
    .hero-sigil {
      display: inline-grid;
      place-items: center;
      width: 26px;
      height: 26px;
      color: var(--gold);
      font-size: 16px;
      margin-left: 4px;
    }
    .hero-sigil img { width: 22px; height: 22px; object-fit: contain; }
    .hero-role {
      margin: 0 0 12px;
      color: var(--gold);
      font-family: var(--serif);
      font-style: italic;
      font-size: 14px;
      letter-spacing: 0.04em;
    }
    .hero-desc {
      margin: 0 0 22px;
      color: #cfc3ad;
      font-size: 14.5px;
      line-height: 1.65;
      max-width: 530px;
    }
    .hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }
    .cta {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 12px 22px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      cursor: pointer;
      text-decoration: none;
      border: 1px solid;
      transition: filter 0.2s, transform 0.2s, background 0.2s;
    }
    .cta-solid {
      background: linear-gradient(180deg, #c9a24a, #a0822f);
      color: #1c1206;
      border-color: var(--gold-bright);
      box-shadow: 0 14px 36px rgba(201, 162, 74, 0.18);
    }
    .cta-solid:hover { filter: brightness(1.08); transform: translateY(-2px); }
    .cta-outline {
      background: rgba(0, 0, 0, 0.45);
      color: var(--gold-bright);
      border-color: rgba(201, 162, 74, 0.6);
    }
    .cta-outline:hover { border-color: var(--gold-bright); background: rgba(201, 162, 74, 0.1); }
    .cta-block { width: 100%; justify-content: center; margin-top: 12px; }
    .cta-ico { font-size: 14px; }

    /* TABS */
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0;
      border-bottom: 1px solid var(--border);
      margin-bottom: 22px;
    }
    .tab {
      background: transparent;
      border: 0;
      color: var(--muted);
      padding: 14px 22px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: color 0.2s, border-color 0.2s;
    }
    .tab:hover { color: var(--text); }
    .tab.active {
      color: var(--gold-bright);
      border-bottom-color: var(--gold);
    }

    /* LAYOUT */
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 26px;
    }
    .main { min-width: 0; display: flex; flex-direction: column; gap: 20px; }

    /* GRID 2 cols */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .panel-equip { grid-column: 1 / -1; }
    .panel-lore  { grid-column: 1 / -1; }

    /* PANELS */
    .panel {
      border: 1px solid var(--border);
      background: linear-gradient(180deg, rgba(15,12,9,0.92), rgba(5,4,3,0.96));
      padding: 22px 24px;
      box-shadow: 0 18px 56px rgba(0,0,0,0.55);
    }
    .panel-title {
      margin: 0 0 16px;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 18px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .panel-text {
      margin: 0;
      color: #c3baaa;
      font-size: 13.5px;
      line-height: 1.7;
    }
    .panel-text.muted { color: var(--muted); font-style: italic; }

    /* CAPACITÉS */
    .cap-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .cap-list li {
      display: flex;
      align-items: center;
      gap: 14px;
      color: #d6cdb6;
      font-size: 13px;
      line-height: 1.5;
    }
    .cap-ico {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201,162,74,0.4);
      border-radius: 50%;
      color: var(--gold);
      font-size: 14px;
      background: rgba(201,162,74,0.08);
      flex-shrink: 0;
    }

    /* ÉQUIPEMENT */
    .equip-grid {
      display: grid;
      grid-template-columns: minmax(140px, 220px) 1fr;
      gap: 24px;
      align-items: stretch;
    }
    .equip-figure {
      min-height: 280px;
      border: 1px solid rgba(201,162,74,0.18);
      background:
        linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.5) 100%),
        var(--fig-img, linear-gradient(135deg, #1a1612, #050403));
      background-size: cover;
      background-position: center;
      filter: contrast(1.18) saturate(0.95) brightness(0.85);
    }
    .equip-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
    .equip-list li { display: grid; grid-template-columns: 36px 1fr; gap: 14px; align-items: start; }
    .eq-ico {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201,162,74,0.3);
      color: var(--gold);
      background: rgba(201,162,74,0.06);
      font-size: 16px;
    }
    .equip-list li strong {
      display: block;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 14px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .equip-list li span {
      color: #c3baaa;
      font-size: 12.5px;
      line-height: 1.55;
    }

    /* STATS */
    .panel-stats { display: flex; flex-direction: column; gap: 18px; }
    .stats-list { display: flex; flex-direction: column; gap: 8px; }
    .stat-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 22px minmax(0, 2fr) 22px;
      gap: 10px;
      align-items: center;
    }
    .stat-lbl {
      color: var(--muted);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .stat-val {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 14px;
      text-align: center;
    }
    .stat-bar {
      height: 6px;
      background: rgba(201, 162, 74, 0.1);
      border: 1px solid rgba(201, 162, 74, 0.18);
      overflow: hidden;
    }
    .stat-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--gold), var(--gold-bright));
      box-shadow: 0 0 12px rgba(201, 162, 74, 0.4);
    }
    .panel-sub {
      margin: 4px 0 0;
      color: var(--gold);
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    .key-icons {
      display: flex;
      gap: 16px;
      justify-content: center;
      padding-top: 4px;
    }
    .ki { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; }
    .ki-glyph {
      width: 56px;
      height: 56px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.45);
      border-radius: 50%;
      color: var(--gold);
      font-size: 22px;
      background: rgba(201, 162, 74, 0.08);
    }
    .ki-lbl {
      color: var(--muted);
      font-size: 9.5px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      text-align: center;
      line-height: 1.3;
    }

    /* LORE */
    .lore-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 22px;
      margin-bottom: 14px;
    }
    .lore-img {
      min-height: 200px;
      border: 1px solid rgba(201,162,74,0.18);
      background:
        linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 100%),
        var(--lore-img, linear-gradient(135deg, #2a1c10, #050403));
      background-size: cover;
      background-position: center;
      filter: contrast(1.18) saturate(0.92) brightness(0.78);
    }
    .inline-quote {
      margin: 0;
      padding: 14px 18px;
      border-left: 2px solid rgba(201, 162, 74, 0.35);
      color: #d4c8aa;
      font-family: var(--serif);
      font-style: italic;
      font-size: 14px;
      line-height: 1.6;
    }

    /* VARIANTES */
    .variants-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
      gap: 14px;
    }
    .variant-card {
      position: relative;
      min-height: 200px;
      overflow: hidden;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background: var(--panel);
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 14px;
      transition: transform 0.25s, border-color 0.25s;
      cursor: pointer;
    }
    .variant-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0.95) 100%),
        var(--v-img, linear-gradient(135deg, #2a1c10, #050403));
      background-size: cover;
      background-position: center;
      filter: contrast(1.25) saturate(1) brightness(0.78);
      transition: transform 0.35s, filter 0.35s;
    }
    .variant-card:hover { transform: translateY(-4px); border-color: rgba(201, 162, 74, 0.6); }
    .variant-card:hover::before { transform: scale(1.05); filter: brightness(0.9); }
    .variant-card strong, .variant-card span {
      position: relative;
      z-index: 1;
      display: block;
    }
    .variant-card strong {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 14px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      line-height: 1.15;
      margin-bottom: 4px;
    }
    .variant-card span { color: var(--muted); font-size: 11.5px; letter-spacing: 0.05em; }

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
    .info-row {
      display: grid;
      grid-template-columns: 36px 1fr;
      gap: 12px;
      align-items: center;
      padding: 10px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
    }
    .info-row:first-of-type { border-top: 0; padding-top: 2px; }
    .info-ico {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.3);
      color: var(--gold);
      background: rgba(201, 162, 74, 0.05);
      font-size: 14px;
    }
    .info-row strong {
      display: block;
      color: var(--muted);
      font-size: 10.5px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .info-row span {
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 13.5px;
      letter-spacing: 0.04em;
    }
    .row-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
      cursor: pointer;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .row-link:first-of-type { border-top: 0; padding-top: 2px; }
    .row-link:hover { opacity: 0.8; }
    .rl-ico {
      width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(201, 162, 74, 0.3);
      color: var(--gold);
      font-size: 13px;
      background: rgba(201, 162, 74, 0.05);
    }
    .rl-label {
      flex: 1;
      color: #d6cdb6;
      font-size: 12.5px;
      letter-spacing: 0.04em;
    }
    .rl-arrow {
      color: var(--gold);
      font-size: 14px;
    }

    .related {
      display: grid;
      grid-template-columns: 56px 1fr;
      gap: 12px;
      align-items: center;
      padding: 8px 0;
      border-top: 1px solid rgba(201, 162, 74, 0.12);
      text-decoration: none;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .related:first-of-type { border-top: 0; padding-top: 2px; }
    .related:hover { opacity: 0.85; }
    .related-thumb {
      width: 56px;
      height: 56px;
      border: 1px solid rgba(201, 162, 74, 0.22);
      background:
        linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.45) 100%),
        var(--r-img, linear-gradient(135deg, #1a1612, #050403));
      background-size: cover;
      background-position: center;
      filter: contrast(1.2) saturate(1) brightness(0.85);
    }
    .related-info strong {
      display: block;
      color: var(--gold-bright);
      font-family: var(--serif);
      font-size: 13px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .related-info span {
      color: var(--muted);
      font-size: 11.5px;
      letter-spacing: 0.06em;
    }

    .sp-quote { padding: 22px; }
    .sp-quote blockquote {
      margin: 0;
      color: #d4c8aa;
      font-family: var(--serif);
      font-style: italic;
      font-size: 13.5px;
      line-height: 1.7;
      position: relative;
      padding: 0 22px;
    }
    .q-mark {
      color: var(--gold);
      font-family: var(--serif);
      font-size: 36px;
      line-height: 0.5;
      position: absolute;
      opacity: 0.6;
    }
    .q-mark:not(.q-end) { left: -2px; top: 12px; }
    .q-mark.q-end { right: -2px; bottom: 0; }
    .q-text { display: block; padding: 6px 0; }
    .q-source {
      display: block;
      margin-top: 10px;
      color: var(--muted);
      font-size: 11px;
      letter-spacing: 0.08em;
      text-align: right;
    }

    .report-btn {
      width: 100%;
      padding: 13px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(201, 162, 74, 0.3);
      color: var(--gold);
      font-family: inherit;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: border-color 0.2s, background 0.2s;
    }
    .report-btn:hover { border-color: var(--gold-bright); background: rgba(201, 162, 74, 0.08); }

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
      .grid-2 { grid-template-columns: 1fr; }
      .equip-grid { grid-template-columns: 1fr; }
      .lore-grid { grid-template-columns: 1fr; }
      .equip-figure { min-height: 200px; }
    }
    @media (max-width: 760px) {
      .hero { padding: 24px 20px; }
      .hero-text { max-width: 100%; }
      .tabs { overflow-x: auto; flex-wrap: nowrap; }
      .tab { white-space: nowrap; padding: 12px 14px; }
    }
  `],
})
export class UnitDetailComponent {
  private readonly service = inject(WarhammerService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly tabs = TABS;
  readonly resources = DEFAULT_RESOURCES;
  readonly KEY_ICONS = KEY_ICONS;
  readonly activeTab = signal<TabKey>('apercu');

  readonly heroImage = signal<string | null>(null);
  readonly loreImage = signal<string | null>(null);
  readonly relatedImages = signal(new Map<string, string>());
  readonly variantImages = signal(new Map<string, string>());

  readonly unit = toSignal(
    this.route.paramMap.pipe(switchMap(p => this.service.getUnit(p.get('id')!))),
  );

  readonly faction = toSignal<Faction | undefined>(
    this.route.paramMap.pipe(
      switchMap(p => this.service.getUnit(p.get('id')!)),
      switchMap(u => u ? this.service.getFaction(u.factionId) : of(undefined)),
    ),
  );

  readonly relatedUnits = toSignal(
    this.route.paramMap.pipe(
      switchMap(p => this.service.getUnit(p.get('id')!)),
      switchMap(u => {
        if (!u) return of([] as Unit[]);
        if (u.relatedUnitIds?.length) {
          return forkJoin(u.relatedUnitIds.slice(0, 4).map(id => this.service.getUnit(id)));
        }
        return this.service.getUnits(u.factionId).pipe(
          switchMap(list => of(list.filter(x => x.id !== u.id).slice(0, 4))),
        );
      }),
    ),
    { initialValue: [] as Unit[] },
  );

  constructor() {
    effect(() => {
      const u = this.unit();
      const f = this.faction();
      if (!u || !f) return;
      this.heroImage.set(null);
      this.loreImage.set(null);

      const heroQ = u.wikiQuery ?? u.nom;
      this.service.getWikiImage(heroQ).subscribe({
        next: r => { if (r.imageUrl) this.heroImage.set(r.imageUrl); },
        error: () => {},
      });

      const loreQ = `${f.nom} battle warhammer`;
      this.service.getWikiImage(loreQ).subscribe({
        next: r => { if (r.imageUrl) this.loreImage.set(r.imageUrl); },
        error: () => {},
      });
    });

    effect(() => {
      const list = this.relatedUnits();
      list.forEach(r => {
        if (this.relatedImages().has(r.id)) return;
        this.service.getWikiImage(r.wikiQuery ?? r.nom).subscribe({
          next: res => {
            if (res.imageUrl) {
              this.relatedImages.update(m => new Map(m).set(r.id, res.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });

    effect(() => {
      const u = this.unit();
      if (!u?.variants?.length) return;
      u.variants.forEach(v => {
        if (this.variantImages().has(v.id)) return;
        const q = v.image || `${u.nom} ${v.name}`;
        this.service.getWikiImage(q).subscribe({
          next: res => {
            if (res.imageUrl) {
              this.variantImages.update(m => new Map(m).set(v.id, res.imageUrl!));
            }
          },
          error: () => {},
        });
      });
    });
  }

  unitImg(): string {
    const url = this.heroImage();
    if (url) return `url('${url}')`;
    const f = this.faction();
    return `linear-gradient(135deg, ${f?.couleurThematique ?? '#1a3a6e'}cc, #050403)`;
  }

  loreImg(): string {
    const url = this.loreImage();
    if (url) return `url('${url}')`;
    return 'linear-gradient(135deg, #2a1c10, #050403)';
  }

  variantImg(image?: string): string {
    if (!image) return 'none';
    if (image.startsWith('http')) return `url('${image}')`;
    const u = this.unit();
    if (!u) return 'none';
    const found = u.variants?.find(v => v.image === image);
    if (found) {
      const url = this.variantImages().get(found.id);
      if (url) return `url('${url}')`;
    }
    return `url('${image}')`;
  }

  relatedImg(r: Unit): string {
    const url = this.relatedImages().get(r.id);
    if (url) return `url('${url}')`;
    const f = this.faction();
    return `linear-gradient(135deg, ${f?.couleurThematique ?? '#1a3a6e'}aa, #050403)`;
  }

  badges(u: Unit, f: Faction): { label: string; cls: string }[] {
    const arr: { label: string; cls: string }[] = [];
    arr.push({ label: u.type, cls: 'ub ' + this.typeBadgeClass(u.type) });
    if (u.badges?.length) {
      u.badges.forEach(b => arr.push({ label: b, cls: 'ub ' + this.simpleBadgeClass(b) }));
    } else {
      if (u.type === 'Infanterie') arr.push({ label: 'Ligne', cls: 'ub ub-ligne' });
    }
    arr.push({ label: f.alignement, cls: 'ub ' + this.alignBadgeClass(f.alignement) });
    return arr;
  }

  typeBadgeClass(t: UnitType): string {
    switch (t) {
      case 'Infanterie': return 'ub-infanterie';
      case 'Véhicule':   return 'ub-vehicule';
      case 'Héros':      return 'ub-heros';
      case 'Psyker':     return 'ub-psyker';
      case 'Monstre':    return 'ub-monstre';
      default: return '';
    }
  }
  simpleBadgeClass(b: string): string {
    const v = b.toLowerCase();
    if (v.includes('ligne')) return 'ub-ligne';
    if (v.includes('imperium')) return 'ub-imperium';
    if (v.includes('chaos')) return 'ub-chaos';
    return '';
  }
  alignBadgeClass(a: string): string {
    const v = a.toLowerCase();
    if (v === 'imperium') return 'ub-imperium';
    if (v === 'chaos') return 'ub-chaos';
    return 'ub-xenos';
  }

  capacities(u: Unit): string[] {
    if (u.capacities?.length) return u.capacities;
    return DEFAULT_CAPACITIES;
  }

  equipment(u: Unit): { name: string; description?: string; icon?: string }[] {
    if (u.equipment?.length) return u.equipment;
    return [
      { name: 'Arme principale', description: 'Équipement standard du modèle.', icon: '⌖' },
      { name: 'Arme de mêlée',   description: 'Couteau, épée, ou équivalent selon la doctrine.', icon: '⚔' },
      { name: 'Armure',          description: 'Protection adaptée au rôle de combat.', icon: '◈' },
      { name: 'Équipement supplémentaire', description: 'Grenades, équipement tactique, vox.', icon: '※' },
    ];
  }

  equipIcon(i: number): string {
    return DEFAULT_EQUIPMENT_ICONS[i % DEFAULT_EQUIPMENT_ICONS.length];
  }

  statsRows(u: Unit): { label: string; value: number }[] {
    return STAT_ROWS.map(s => ({ label: s.label, value: u.stats?.[s.key] ?? 3 }));
  }

  keyIcons(u: Unit, f: Faction): { label: string }[] {
    const arr: { label: string }[] = [];
    arr.push({ label: f.alignement });
    arr.push({ label: f.nom });
    if (u.badges?.[0]) arr.push({ label: u.badges[0] }); else arr.push({ label: u.type });
    return arr;
  }

  infoRows(u: Unit, f: Faction): { ico: string; label: string; value: string }[] {
    return [
      { ico: '☗', label: 'Rôle',              value: u.role || u.type },
      { ico: '⚜', label: 'Allégeance',         value: f.alignement },
      { ico: '✠', label: 'Faction d\'origine', value: f.nom },
      { ico: '☖', label: 'Taille d\'unité',    value: u.tailleUnite || '—' },
      { ico: '◈', label: 'Points (approx.)',   value: u.pointsCost ? `${u.pointsCost} pts` : '—' },
      { ico: '⌚', label: 'Apparition',         value: u.apparition || '—' },
    ];
  }

  fallbackDesc(u: Unit, f: Faction): string {
    return `${u.nom} est une unité au service des ${f.nom}. ${f.description}`;
  }

  fallbackLore(u: Unit, f: Faction): string {
    return `Au sein des ${f.nom}, les ${u.nom} jouent un rôle déterminant. Leur histoire se confond avec celle de leur faction et de la guerre éternelle qui ravage la galaxie.`;
  }
}
