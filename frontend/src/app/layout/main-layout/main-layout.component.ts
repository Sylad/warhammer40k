import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';
import { DemoBannerComponent } from '../../shared/components/demo-banner/demo-banner.component';
import { QuotaAlertService } from '../../core/services/quota-alert.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BreadcrumbComponent, CommandPaletteComponent, DemoBannerComponent],
  template: `
    <app-demo-banner />
    <header class="topbar">
      <a class="brand" routerLink="/">
        <span class="aigle">⚜</span>
        <strong>Warhammer 40,000</strong>
        <span class="brand-sub">Codex numérique</span>
      </a>
      <nav class="nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
          <span class="nav-ico">⌂</span>Accueil
        </a>
        <a routerLink="/factions" routerLinkActive="active">
          <span class="nav-ico">⚔</span>Factions
        </a>
        <a routerLink="/romans" routerLinkActive="active">
          <span class="nav-ico">▤</span>Romans
        </a>
        <a routerLink="/videos" routerLinkActive="active">
          <span class="nav-ico">▶</span>Vidéos
        </a>
        <a routerLink="/gallery" routerLinkActive="active">
          <span class="nav-ico">▦</span>Galerie
        </a>
        <div class="nav-dropdown">
          <a routerLink="/lore" routerLinkActive="active">
            <span class="nav-ico">✠</span>Lore<span class="nav-caret">▾</span>
          </a>
          <div class="mega-menu">
            <div class="mega-col">
              <h4>Origines</h4>
              <a routerLink="/lore/emperor">L'Empereur</a>
              <a routerLink="/lore/primarchs">Primarques</a>
              <a routerLink="/lore/saints">Saints & Saintes</a>
            </div>
            <div class="mega-col">
              <h4>Cosmologie</h4>
              <a routerLink="/lore/chaos-gods">Dieux du Chaos</a>
              <a routerLink="/lore/galaxy">Galaxie</a>
              <a routerLink="/lore/concepts">Concepts</a>
              <a routerLink="/lore/civilians">Imperial Orgs</a>
            </div>
            <div class="mega-col">
              <h4>Guerre & Histoire</h4>
              <a routerLink="/lore/timeline">Chronologie</a>
              <a routerLink="/lore/equipment">Armement</a>
              <a routerLink="/lore/ships">Vaisseaux</a>
              <a routerLink="/lore/titans">Titans & Knights</a>
            </div>
          </div>
        </div>
        <a routerLink="/about" routerLinkActive="active">
          <span class="nav-ico">⚜</span>À propos
        </a>
        <button class="nav-search-btn" type="button" (click)="palette.open()" title="Recherche globale (Ctrl+K)" aria-label="Recherche">
          <span class="nav-ico">⌕</span>
          <span class="nav-search-kbd">⌘K</span>
        </button>
      </nav>

      <app-command-palette #palette />
    </header>

    @if (quota.hasError()) {
      <div class="quota-banner">
        @switch (quota.errorKind()) {
          @case ('auth') {
            <span>⚠ Clé Claude invalide — régénère une clé sur
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>
              et mets-la dans <code>backend/.env</code>.
            </span>
          }
          @case ('rate') {
            <span>⏳ Rate-limit Claude atteint — réessaye dans quelques secondes.</span>
          }
          @default {
            <span>⚠ Quota Claude épuisé — rechargez des crédits sur
              <a href="https://console.anthropic.com" target="_blank" rel="noopener">anthropic.com</a>
            </span>
          }
        }
        <button class="quota-dismiss" (click)="quota.dismiss()">✕</button>
      </div>
    }

    <app-breadcrumb />

    <main class="wrap">
      <router-outlet />
    </main>

    <footer class="legal">
      <div class="ornament">
        <span class="line"></span>
        <span class="aigle">⚜</span>
        <span class="line"></span>
      </div>
      <div class="legal-text">
        Site fan non officiel Warhammer 40,000. Toutes les images appartiennent à leurs auteurs respectifs.
      </div>
    </footer>
  `,
  styles: [`
    .topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 34px;
      background: rgba(4, 4, 4, 0.86);
      border-bottom: 1px solid rgba(150, 0, 0, 0.7);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
    }

    .brand {
      display: flex;
      align-items: baseline;
      gap: 14px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      cursor: pointer;
      text-decoration: none;
    }
    .brand .aigle {
      font-size: 1.6rem;
      color: var(--gold);
      align-self: center;
      text-shadow: 0 0 18px rgba(201, 162, 74, 0.4);
    }
    .brand strong {
      color: var(--gold);
      font-family: var(--serif);
      font-size: 1.4rem;
      font-weight: 700;
      text-shadow: 0 0 18px rgba(201, 162, 74, 0.25);
      letter-spacing: 0.1em;
    }
    .brand .brand-sub {
      color: var(--muted);
      font-size: 0.7rem;
      letter-spacing: 0.18em;
    }

    .nav {
      display: flex;
      align-items: center;
      gap: 24px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .nav a {
      color: var(--text);
      opacity: 0.75;
      transition: color 0.2s, opacity 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 4px;
      border-bottom: 2px solid transparent;
      text-decoration: none;
    }
    .nav a:hover { opacity: 1; color: var(--gold-bright); }
    .nav a.active {
      color: var(--gold);
      opacity: 1;
      border-bottom-color: var(--gold);
      text-shadow: 0 0 12px rgba(201, 162, 74, 0.35);
    }

    /* Search button + Cmd+K */
    .nav-search-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent; border: 1px solid var(--border);
      color: var(--gold); padding: 6px 10px; cursor: pointer;
      font-family: var(--sans); font-size: 0.7rem; letter-spacing: 0.1em;
      transition: all 0.18s; margin-left: 8px;
    }
    .nav-search-btn:hover {
      border-color: var(--gold); color: var(--gold-bright);
      background: rgba(201,162,74,0.06);
    }
    .nav-search-kbd {
      font-size: 0.62rem; opacity: 0.7; letter-spacing: 0.08em;
      border-left: 1px solid var(--border); padding-left: 6px;
    }

    /* Mega-menu Lore */
    .nav-dropdown {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    .nav-caret {
      margin-left: 4px;
      font-size: 0.65rem;
      opacity: 0.6;
    }
    .mega-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      min-width: 540px;
      background: rgba(11, 9, 7, 0.97);
      border: 1px solid var(--border-strong);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
      padding: 22px 24px;
      display: none;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 22px;
      z-index: 100;
    }
    .nav-dropdown:hover .mega-menu,
    .nav-dropdown:focus-within .mega-menu {
      display: grid;
    }
    .mega-col h4 {
      font-family: var(--serif);
      font-size: 0.62rem;
      letter-spacing: 0.22em;
      color: var(--gold-bright);
      margin: 0 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
      text-transform: uppercase;
    }
    .mega-col a {
      display: block;
      padding: 7px 0;
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      color: var(--text);
      opacity: 0.78;
      text-decoration: none;
      text-transform: none;
      font-weight: 500;
      border-bottom: 1px solid rgba(201, 162, 74, 0.08);
    }
    .mega-col a:last-child { border-bottom: none; }
    .mega-col a:hover {
      color: var(--gold-bright);
      opacity: 1;
    }
    @media (max-width: 900px) {
      .mega-menu { display: none !important; }
    }
    .nav-ico { font-size: 1rem; line-height: 1; }

    .quota-banner {
      background: var(--red-deep);
      color: #fff;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 0.9rem;
      position: sticky;
      top: 70px;
      z-index: 99;
      border-bottom: 1px solid rgba(150, 0, 0, 0.5);
    }
    .quota-banner a { color: #ffcdd2; text-decoration: underline; }
    .quota-dismiss {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.4);
      color: #fff;
      cursor: pointer;
      padding: 2px 8px;
      border-radius: 2px;
      margin-left: 8px;
    }

    .wrap {
      width: 100%;
      max-width: 1920px;
      margin: 0 auto;
      padding: 32px 34px 60px;
      position: relative;
      z-index: 1;
      min-height: calc(100vh - 70px - 48px);
    }

    .legal {
      padding: 22px 16px 28px;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .ornament {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      max-width: 560px;
    }
    .ornament .line {
      flex: 1;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent 0%,
        rgba(201, 162, 74, 0.45) 50%,
        transparent 100%
      );
    }
    .ornament .aigle {
      color: var(--gold);
      font-size: 1.25rem;
      text-shadow: 0 0 14px rgba(201, 162, 74, 0.45);
      line-height: 1;
    }
    .legal-text {
      color: var(--muted);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-align: center;
      max-width: 720px;
    }

    @media (max-width: 900px) {
      .topbar { padding: 0 18px; }
      .brand .brand-sub { display: none; }
      .nav { gap: 14px; font-size: 0.7rem; }
      .nav-ico { display: none; }
    }
    @media (max-width: 680px) {
      .nav a:not(.active) span:not(.nav-ico) { display: none; }
      .wrap { padding: 22px 16px 40px; }
    }
  `],
})
export class MainLayoutComponent {
  readonly quota = inject(QuotaAlertService);
}
