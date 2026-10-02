import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationSkipped, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NewsService } from '../../features/nouveautes/news.service';
import { badgeLabel, unseenLabel } from '../../features/nouveautes/news-badge';
import { AboutMenuComponent } from '../about-menu/about-menu.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';
import { DemoBannerComponent } from '../../shared/components/demo-banner/demo-banner.component';
import { QuotaAlertService } from '../../core/services/quota-alert.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AboutMenuComponent, BreadcrumbComponent, CommandPaletteComponent, DemoBannerComponent],
  template: `
    <app-demo-banner [attr.inert]="pageInert()" />
    <header class="topbar">
      <a class="brand" routerLink="/" [attr.inert]="pageInert()">
        <span class="aigle">⚜</span>
        <strong>Warhammer 40,000</strong>
        <span class="brand-sub">Codex numérique</span>
      </a>
      <nav class="nav" [class.about-open]="aboutOpen()" [attr.inert]="pageInert()">
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
        <!-- L30 : Lore et « À propos ▾ » jamais ouverts ensemble (le panneau couvrait « Guerre & Histoire »). -->
        <div class="nav-dropdown" (pointerenter)="aboutMenu.close()" (focusin)="aboutMenu.close()">
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
        <!-- L30 (option b) : Nouveautés, Plan de travail et À propos regroupés sous un bouton à divulgation. -->
        <app-about-menu #aboutMenu [badge]="badge()" [unseenText]="unseenText()" (navigated)="focusOnArrival = true" (openChange)="aboutOpen.set($event)" />
      </nav>

      <div class="topbar-actions">
        <button class="nav-search-btn" type="button" [attr.inert]="pageInert()" (click)="palette.open()" title="Recherche globale (Ctrl+K)" aria-label="Recherche">
          <span class="nav-ico">⌕</span>
          <span class="nav-search-kbd">⌘K</span>
        </button>
        <!-- L23 : sous 80em (1280 px), la navigation passe dans un tiroir (inerte quand il est fermé). -->
        <button #menuButton class="menu-toggle" type="button" aria-controls="menu-telephone" [class.has-badge]="badge()"
                [attr.aria-expanded]="menuOpen()" [attr.aria-label]="badge() ? 'Menu, ' + unseenText() : null"
                (click)="toggleMenu()">
          <span aria-hidden="true">☰</span> <span class="menu-word">Menu</span>
          @if (badge()) { <span class="news-badge" aria-hidden="true">{{ badge() }}</span> }
        </button>
      </div>

      <app-command-palette #palette (navigated)="focusOnArrival = true" />
    </header>

    <div class="drawer-backdrop" [class.open]="menuOpen()" aria-hidden="true" (click)="closeMenu()"></div>
    <nav #drawer id="menu-telephone" class="drawer" [class.open]="menuOpen()" [attr.inert]="menuOpen() ? null : ''"
         aria-label="Menu principal" (keydown)="trapTab($event)">
      <div class="drawer-head">
        <span class="drawer-title">Menu</span>
        <button #drawerClose type="button" class="drawer-close" (click)="closeMenu(true)">
          <span aria-hidden="true">✕</span> Fermer
        </button>
      </div>
      <a (click)="focusOnArrival = true" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Accueil</a>
      <a (click)="focusOnArrival = true" routerLink="/factions" routerLinkActive="active">Factions</a>
      <a (click)="focusOnArrival = true" routerLink="/romans" routerLinkActive="active">Romans</a>
      <a (click)="focusOnArrival = true" routerLink="/videos" routerLinkActive="active">Vidéos</a>
      <a (click)="focusOnArrival = true" routerLink="/gallery" routerLinkActive="active">Galerie</a>
      <a (click)="focusOnArrival = true" routerLink="/lore" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">Lore</a>
      <a (click)="focusOnArrival = true" routerLink="/nouveautes" routerLinkActive="active">
        Nouveautés
        @if (badge()) {
          <span class="news-badge" aria-hidden="true">{{ badge() }}</span><span class="sr-only">, {{ unseenText() }}</span>
        }
      </a>
      <a (click)="focusOnArrival = true" routerLink="/plan" routerLinkActive="active">Plan de travail</a>
      <a (click)="focusOnArrival = true" routerLink="/about" routerLinkActive="active">À propos</a>
    </nav>

    @if (quota.hasError()) {
      <div class="quota-banner" [attr.inert]="pageInert()">
        @switch (quota.errorKind()) {
          @case ('auth') {
            <span>⚠ Clé Claude invalide — régénère une clé sur
              <a href="https://platform.claude.com/settings/keys" target="_blank" rel="noopener">platform.claude.com</a>
              et mets-la dans <code>backend/.env</code>.
            </span>
          }
          @case ('rate') {
            <span>⏳ Rate-limit Claude atteint — réessaye dans quelques secondes.</span>
          }
          @default {
            <span>⚠ Quota Claude épuisé — rechargez des crédits sur
              <a href="https://platform.claude.com/" target="_blank" rel="noopener">platform.claude.com</a>
            </span>
          }
        }
        <button class="quota-dismiss" (click)="quota.dismiss()">✕</button>
      </div>
    }

    <app-breadcrumb [attr.inert]="pageInert()" />

    <main #main class="wrap" tabindex="-1" [attr.inert]="pageInert()">
      <router-outlet />
    </main>

    <footer class="legal" [attr.inert]="pageInert()">
      <div class="ornament">
        <span class="line"></span>
        <span class="aigle">⚜</span>
        <span class="line"></span>
      </div>
      <!-- L30 : les pages du codex à une action de chaque page, à toute largeur. -->
      <nav class="legal-nav" aria-label="Le codex">
        <!-- Écart porté par le gap flex, sans « · » : rien d'orphelin au retour à la ligne (320 px). -->
        <a routerLink="/nouveautes">Nouveautés</a><a routerLink="/plan">Plan de travail</a><a routerLink="/about">À propos</a>
      </nav>
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
    .nav.about-open .mega-menu { display: none; }
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
    .legal-nav {
      display: flex; flex-wrap: wrap; justify-content: center; align-items: center; column-gap: 18px;
      font-size: 0.78rem; letter-spacing: 0.08em;
    }
    .legal-nav a { display: inline-flex; align-items: center; min-height: 44px; padding: 0 6px; color: var(--gold); }
    .legal-nav a:hover { color: var(--gold-bright); text-decoration: underline; text-underline-offset: 4px; }
    .legal-nav a:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
    .legal-text {
      color: var(--muted);
      font-size: 0.72rem;
      letter-spacing: 0.08em;
      text-align: center;
      max-width: 720px;
    }

    /* L23 : pastille des nouveautés non vues, menu du téléphone (tiroir). */
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    .news-badge {
      display: inline-block; min-width: 1.35em; padding: 1px 5px; border-radius: 999px;
      background: var(--gold); color: var(--bg); font-size: 0.66rem; line-height: 1.35;
      letter-spacing: 0; text-align: center; text-shadow: none;
    }
    .nav a { white-space: nowrap; }
    .topbar { gap: 16px; }
    .brand { margin-right: auto; }
    .topbar > app-command-palette { position: absolute; }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .menu-toggle, .drawer-close {
      display: none; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px;
      background: transparent; border: 1px solid var(--border-strong); color: var(--gold);
      font: 700 0.72rem var(--sans); letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
    }
    .menu-toggle:hover, .drawer-close:hover { border-color: var(--gold); color: var(--gold-bright); }
    .drawer-close { display: inline-flex; }
    :is(.nav a, .menu-toggle, .drawer a, .drawer-close, .nav-search-btn, .brand):focus-visible {
      outline: 2px solid var(--gold-bright); outline-offset: 2px;
    }
    .drawer-backdrop {
      position: fixed; inset: 0; z-index: 110; background: rgba(0, 0, 0, 0.7);
      opacity: 0; pointer-events: none; transition: opacity 0.2s;
    }
    .drawer-backdrop.open { opacity: 1; pointer-events: auto; }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 120; width: min(320px, 86vw);
      display: flex; flex-direction: column; overflow-y: auto; overscroll-behavior: contain;
      padding: 14px 20px 28px; background: var(--panel); border-left: 1px solid var(--border-strong);
      transform: translateX(100%); visibility: hidden;
      transition: transform 0.2s ease, visibility 0s linear 0.2s;
    }
    .drawer.open { transform: none; visibility: visible; transition: transform 0.2s ease, visibility 0s; }
    .drawer-head {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 12px; margin-bottom: 6px; border-bottom: 1px solid var(--border);
    }
    .drawer-title {
      font-family: var(--serif); color: var(--gold); letter-spacing: 0.18em; text-transform: uppercase;
    }
    .drawer a {
      display: flex; align-items: center; gap: 10px; min-height: 48px;
      border-bottom: 1px solid rgba(201, 162, 74, 0.12); color: var(--text);
      font-size: 0.85rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    }
    .drawer a.active { color: var(--gold); }
    @media (prefers-reduced-motion: reduce) {
      .drawer, .drawer.open, .drawer-backdrop { transition: none; }
    }

    /* L30 (option b) : seuils de la barre en em (suivent la taille de police par défaut du
       navigateur) — barre complète (icônes, sous-titre) dès 106,25em (1700 px à 16 px),
       compacte en dessous, tiroir sous 80em (1280 px à 16 px). Mesurés par topbar.e2e.spec.ts. */
    .nav { min-width: 0; }
    @media (width < 106.25em) {
      .brand .brand-sub, .nav-ico { display: none; }
      .nav { gap: 16px; }
      .nav-search-btn .nav-ico { display: inline; }
    }
    @media (width < 80em) {
      .topbar { padding: 0 18px; }
      .nav { display: none; }
      .menu-toggle { display: inline-flex; }
      .nav-search-btn { min-height: 44px; margin-left: 0; }
    }
    @media (width >= 80em) {
      .brand { white-space: nowrap; flex-shrink: 0; } /* au téléphone, le logo garde le droit de passer sur deux lignes */
      .drawer, .drawer-backdrop { display: none; }
    }
    @media (max-width: 680px) {
      .wrap { padding: 22px 16px 40px; }
    }
    @media (width <= 26.25em) {
      .topbar { padding: 0 12px; gap: 8px; }
      .topbar-actions { gap: 6px; }
      .nav-search-btn { padding: 0 12px; }
      .brand { gap: 8px; }
      .brand strong { font-size: 1.05rem; }
      .nav-search-kbd { display: none; }
      .menu-toggle { padding: 0 10px; min-width: 44px; justify-content: center; }
      /* L30 : avec la pastille, « ☰ + pastille » — le mot reste le nom accessible (aria-label). */
      .menu-toggle.has-badge .menu-word { display: none; }
    }
  `],
})
export class MainLayoutComponent implements OnInit {
  readonly quota = inject(QuotaAlertService);
  private readonly news = inject(NewsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('menuButton', { static: true }) private menuButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('drawer', { static: true }) private drawer?: ElementRef<HTMLElement>;
  @ViewChild('drawerClose', { static: true }) private drawerClose?: ElementRef<HTMLButtonElement>;

  /** L23 : nouveautés parues depuis la dernière visite de /nouveautes. */
  readonly badge = computed(() => badgeLabel(this.news.unseen()));
  readonly unseenText = computed(() => unseenLabel(this.news.unseen()));
  readonly menuOpen = signal(false);
  /** Panneau « À propos ▾ » ouvert : le méga-menu Lore est masqué. */
  readonly aboutOpen = signal(false);
  /** Tiroir ouvert : le reste de la page (hors bouton Menu et tiroir) est inerte. */
  readonly pageInert = computed(() => (this.menuOpen() ? '' : null));
  /**
   * La navigation en cours vient d'un lien du tiroir, du panneau « À propos ▾ » ou d'un résultat
   * de la recherche rapide (L30) : l'élément cliqué disparaît, le focus est à placer à l'arrivée.
   */
  focusOnArrival = false;

  @ViewChild('main', { static: true }) private main?: ElementRef<HTMLElement>;

  constructor() {
    inject(Router).events
      .pipe(filter((e) => e instanceof NavigationEnd || e instanceof NavigationSkipped), takeUntilDestroyed())
      .subscribe(() => {
        const focus = this.focusOnArrival;
        this.focusOnArrival = false;
        this.closeMenu();
        if (focus) this.focusArrival();
      });
  }

  /**
   * Après un lien du tiroir ou de la recherche rapide, le focus irait sur BODY (le lien disparaît) :
   * il va au titre h1 de la page d'arrivée, ou à défaut à <main> (revue UX L23).
   */
  private focusArrival(): void {
    this.cdr.detectChanges(); // retire `inert` de <main> avant d'y placer le focus
    setTimeout(() => {
      const main = this.main?.nativeElement;
      if (!main) return;
      const h1 = main.querySelector<HTMLElement>('h1');
      const target = h1 ?? main;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  ngOnInit(): void {
    void this.news.load();
    // Passage au bureau (≥ 80em) menu ouvert : le tiroir disparaît, la page doit redéfiler.
    const desktop = window.matchMedia?.('(min-width: 80em)');
    if (desktop) {
      const onChange = (e: MediaQueryListEvent) => { if (e.matches) this.closeMenu(); };
      desktop.addEventListener('change', onChange);
      this.destroyRef.onDestroy(() => desktop.removeEventListener('change', onChange));
    }
  }

  toggleMenu(): void {
    if (this.menuOpen()) this.closeMenu(true);
    else this.openMenu();
  }

  openMenu(): void {
    this.menuOpen.set(true);
    document.body.style.overflow = 'hidden';
    // Rendu immédiat (tiroir visible et plus inerte) pour pouvoir y placer le focus.
    this.cdr.detectChanges();
    this.drawerClose?.nativeElement.focus();
  }

  /** Ferme le tiroir ; `returnFocus` : le focus revient au bouton Menu (Échap, Fermer). */
  closeMenu(returnFocus = false): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    document.body.style.overflow = '';
    if (returnFocus) this.menuButton?.nativeElement.focus();
  }

  /** Tiroir ouvert : Tab et Maj+Tab bouclent entre ses liens (le voile couvre la page). */
  trapTab(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.drawer) return;
    const items = Array.from(this.drawer.nativeElement.querySelectorAll<HTMLElement>('a, button'));
    const first = items[0];
    const last = items[items.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen()) this.closeMenu(true);
  }
}
