import { ChangeDetectorRef, Component, DestroyRef, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ViewportScroller } from '@angular/common';
import { NavigationEnd, NavigationSkipped, Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NewsService } from '../../features/nouveautes/news.service';
import { badgeLabel, unseenLabel } from '../../features/nouveautes/news-badge';
import { LoreMenuComponent } from '../lore-menu/lore-menu.component';
import { AboutMenuComponent } from '../about-menu/about-menu.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { CommandPaletteComponent } from '../../shared/components/command-palette/command-palette.component';
import { SectionAnchorDirective } from '../../shared/section-anchor.directive';
import { DemoBannerComponent } from '../../shared/components/demo-banner/demo-banner.component';
import { QuotaAlertService } from '../../core/services/quota-alert.service';
import { PageTitleService } from '../../core/services/page-title.service';
import { searchShortcut, type PlatformHints } from './search-shortcut';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AboutMenuComponent, LoreMenuComponent, BreadcrumbComponent, CommandPaletteComponent, DemoBannerComponent, SectionAnchorDirective],
  template: `
    <!-- L21 : premier élément focalisable — évite la barre (≈ 14 arrêts de Tab au bureau). -->
    <a class="skip-link" sectionAnchor="contenu" [attr.inert]="pageInert()">Aller au contenu</a>
    <app-demo-banner [attr.inert]="pageInert()" />
    <header class="topbar">
      <a class="brand" routerLink="/" [attr.inert]="pageInert()">
        <span class="aigle" aria-hidden="true">⚜</span>
        <strong>Warhammer 40,000</strong>
        <span class="brand-sub">Codex numérique</span>
      </a>
      <nav class="nav" aria-label="Menu principal" [attr.inert]="pageInert()">
        <a routerLink="/" routerLinkActive="active" [ariaCurrentWhenActive]="true" [routerLinkActiveOptions]="{exact: true}">
          <span class="nav-ico" aria-hidden="true">⌂</span>Accueil
        </a>
        <a routerLink="/factions" routerLinkActive="active" [ariaCurrentWhenActive]="true">
          <span class="nav-ico" aria-hidden="true">⚔</span>Factions
        </a>
        <a routerLink="/romans" routerLinkActive="active" [ariaCurrentWhenActive]="true">
          <span class="nav-ico" aria-hidden="true">▤</span>Romans
        </a>
        <a routerLink="/videos" routerLinkActive="active" [ariaCurrentWhenActive]="true">
          <span class="nav-ico" aria-hidden="true">▶</span>Vidéos
        </a>
        <a routerLink="/jeux-video" routerLinkActive="active" ariaCurrentWhenActive="page" data-testid="lien-navigation">
          <span class="nav-ico" aria-hidden="true" data-ico="✠"></span>Jeux vidéo
        </a>
        <a routerLink="/gallery" routerLinkActive="active" [ariaCurrentWhenActive]="true">
          <span class="nav-ico" aria-hidden="true">▦</span>Galerie
        </a>
        <!-- L37 : Lore en bouton à divulgation, comme « À propos ▾ » ; jamais ouverts ensemble (le panneau couvrirait l'autre). -->
        <app-lore-menu #loreMenu (navigated)="focusOnArrival = true" (openChange)="$event && aboutMenu.close()" />
        <!-- L30 (option b) : Nouveautés, Plan de travail et À propos regroupés sous un bouton à divulgation. -->
        <app-about-menu #aboutMenu [badge]="badge()" [unseenText]="unseenText()" (navigated)="focusOnArrival = true" (openChange)="$event && loreMenu.close()" />
      </nav>

      <div class="topbar-actions">
        <!-- L33 : raccourci de la plateforme (« Ctrl K » / « ⌘K »), repris dans le nom accessible. -->
        <button class="nav-search-btn" type="button" [attr.inert]="pageInert()" (click)="palette.open()" [attr.title]="shortcut.label" [attr.aria-label]="shortcut.label">
          <span class="nav-ico" aria-hidden="true">⌕</span>
          <span class="nav-search-kbd" aria-hidden="true">{{ shortcut.hint }}</span>
        </button>
        <!-- L23 : sous 84em (1344 px), la navigation passe dans un tiroir (inerte quand il est fermé). -->
        <button #menuButton class="menu-toggle" type="button" aria-controls="menu-telephone" [class.has-badge]="badge()"
                [attr.aria-expanded]="menuOpen()" [attr.aria-label]="badge() ? 'Menu, ' + unseenText() : 'Menu'"
                (click)="toggleMenu()">
          <span aria-hidden="true">☰</span> <span class="menu-word">Menu</span>
          @if (badge()) { <span class="news-badge" aria-hidden="true">{{ badge() }}</span> }
        </button>
      </div>
    </header>

    <!-- L163 : hors de la barre du haut — son backdrop-filter ferait d'elle le bloc conteneur du fond (position: fixed). -->
    <app-command-palette #palette (navigated)="focusOnArrival = true" />

    <div class="drawer-backdrop" [class.open]="menuOpen()" aria-hidden="true" (click)="closeMenu()"></div>
    <nav #drawer id="menu-telephone" class="drawer" [class.open]="menuOpen()" [attr.inert]="menuOpen() ? null : ''"
         aria-label="Menu principal" (keydown)="trapTab($event)">
      <div class="drawer-head">
        <span class="drawer-title">Menu</span>
        <button #drawerClose type="button" class="drawer-close" (click)="closeMenu(true)">
          <span aria-hidden="true">✕</span> Fermer
        </button>
      </div>
      <a (click)="focusOnArrival = true" routerLink="/" routerLinkActive="active" [ariaCurrentWhenActive]="true" [routerLinkActiveOptions]="{exact: true}">Accueil</a>
      <a (click)="focusOnArrival = true" routerLink="/factions" routerLinkActive="active" [ariaCurrentWhenActive]="true">Factions</a>
      <a (click)="focusOnArrival = true" routerLink="/romans" routerLinkActive="active" [ariaCurrentWhenActive]="true">Romans</a>
      <a (click)="focusOnArrival = true" routerLink="/videos" routerLinkActive="active" [ariaCurrentWhenActive]="true">Vidéos</a>
      <a (click)="focusOnArrival = true" routerLink="/jeux-video" routerLinkActive="active" ariaCurrentWhenActive="page" data-testid="lien-navigation-tiroir">Jeux vidéo</a>
      <a (click)="focusOnArrival = true" routerLink="/gallery" routerLinkActive="active" [ariaCurrentWhenActive]="true">Galerie</a>
      <a (click)="focusOnArrival = true" routerLink="/lore" routerLinkActive="active" [ariaCurrentWhenActive]="true">Lore</a>
      <a (click)="focusOnArrival = true" routerLink="/nouveautes" routerLinkActive="active" [ariaCurrentWhenActive]="true">
        Nouveautés
        @if (badge()) {
          <span class="news-badge" aria-hidden="true">{{ badge() }}</span><span class="sr-only">, {{ unseenText() }}</span>
        }
      </a>
      <a (click)="focusOnArrival = true" routerLink="/plan" routerLinkActive="active" [ariaCurrentWhenActive]="true">Plan de travail</a>
      <a (click)="focusOnArrival = true" routerLink="/about" routerLinkActive="active" [ariaCurrentWhenActive]="true">À propos</a>
    </nav>

    @if (quota.hasError()) {
      <div class="quota-banner" role="alert" [attr.inert]="pageInert()">
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
        <button class="quota-dismiss" type="button" aria-label="Fermer l'alerte" (click)="quota.dismiss()"><span aria-hidden="true">✕</span></button>
      </div>
    }

    <app-breadcrumb [attr.inert]="pageInert()" />
    <!-- L36 : changement de page annoncé aux lecteurs d'écran, sauf quand le focus va au h1. -->
    <p class="sr-only" aria-live="polite" aria-atomic="true">{{ pages.announcement() }}</p>

    <main #main id="contenu" class="wrap" tabindex="-1" [attr.inert]="pageInert()">
      <router-outlet />
    </main>

    <footer class="legal" [attr.inert]="pageInert()">
      <div class="ornament">
        <span class="line"></span>
        <span class="aigle" aria-hidden="true">⚜</span>
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
      font-size: 0.75rem;
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
      font-family: var(--sans); font-size: 0.75rem; letter-spacing: 0.1em;
      transition: all 0.18s; margin-left: 8px;
    }
    .nav-search-btn:hover {
      border-color: var(--gold); color: var(--gold-bright);
      background: rgba(201,162,74,0.06);
    }
    /* L33 : or à 70 % d'opacité = 4,05:1 ; à 85 %, ≥ 4,5:1 mesuré sur les pixels rendus. */
    .nav-search-kbd {
      font-size: 0.75rem; opacity: 0.85; letter-spacing: 0.08em; white-space: nowrap;
      border-left: 1px solid var(--border); padding-left: 6px;
    }

    .nav-ico { font-size: 1rem; line-height: 1; }
    .nav-ico[data-ico]::before { content: attr(data-ico); }

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
    /* .wrap crée un contexte d'empilement (z-index 1) : une visionneuse en dialogue qu'il contient doit
       passer au-dessus de la barre du haut (z-index 100), sinon « Fermer » s'y cache à 390 px. */
    .wrap:has(app-figure-lightbox[role='dialog']) { z-index: 1000; }

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
      font-size: 0.75rem; /* L21 : 12 px, seuil de texte lu du gabarit (R5) */
      letter-spacing: 0.08em;
      text-align: center;
      max-width: 720px;
    }

    /* L21 : lien d'évitement, hors écran tant qu'il n'a pas le focus. */
    .skip-link {
      position: fixed; top: 8px; left: 8px; z-index: 300; padding: 12px 16px; min-height: 44px; box-sizing: border-box;
      background: var(--bg); color: var(--gold-bright); border: 2px solid var(--gold-bright);
      font: 700 0.85rem var(--sans); letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none;
      transform: translateY(-200%);
    }
    .skip-link:focus { transform: none; }

    /* L23 : pastille des nouveautés non vues, menu du téléphone (tiroir). */
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    .news-badge {
      display: inline-block; min-width: 1.35em; padding: 1px 5px; border-radius: 999px;
      background: var(--gold); color: var(--bg); font-size: 0.75rem; line-height: 1.35;
      letter-spacing: 0; text-align: center; text-shadow: none;
    }
    .nav a { white-space: nowrap; }
    .topbar { gap: 16px; }
    .brand { margin-right: auto; }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .menu-toggle, .drawer-close {
      display: none; align-items: center; gap: 8px; min-height: 44px; padding: 0 14px;
      background: transparent; border: 1px solid var(--border-strong); color: var(--gold);
      font: 700 0.75rem var(--sans); letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer;
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
      border-left: 3px solid transparent; padding-left: 8px;
      font-size: 0.85rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
    }
    .drawer a.active { color: var(--gold); border-left-color: var(--gold); }
    @media (prefers-reduced-motion: reduce) {
      .drawer, .drawer.open, .drawer-backdrop { transition: none; }
    }

    /* L30 (option b) : seuils de la barre en em (suivent la taille de police par défaut du
       navigateur) — barre complète (icônes, sous-titre) dès 106,25em (1700 px à 16 px),
       compacte en dessous, tiroir sous 84em (1344 px à 16 px). Mesurés par topbar.e2e.spec.ts. */
    .nav { min-width: 0; }
    @media (width < 106.25em) {
      .brand .brand-sub, .nav-ico { display: none; }
      .nav { gap: 16px; }
      .nav-search-btn .nav-ico { display: inline; }
    }
    @media (width < 84em) {
      .topbar { padding: 0 18px; }
      .nav { display: none; }
      .menu-toggle { display: inline-flex; }
      .nav-search-btn { min-height: 44px; margin-left: 0; }
    }
    @media (width >= 84em) {
      .brand { white-space: nowrap; flex-shrink: 0; } /* au téléphone, le logo garde le droit de passer sur deux lignes */
      .drawer, .drawer-backdrop { display: none; }
    }
    @media (max-width: 680px) {
      .wrap { padding: 22px 16px 40px; }
    }
    /* L33 (relecture) : 30em, plus 26,25em ; L46 : 31em (polices web bloquées + pastille : 480–483 px débordaient) — entre 421 et 465 px (16 px), « Ctrl K » et
       « ☰ Menu 9+ » faisaient déborder la barre. Balayé px par px par search-hint.e2e.spec.ts. */
    @media (width < 31em) {
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
    /* L46 : police par défaut de 18 ou 20 px, 320–371 px — « ⚜ WARHAMMER 40,000 » + « ☰ Menu » ne
       tiennent plus côte à côte : le mot s'efface aussi sans pastille (« ☰ » seul, nom accessible
       « Menu »), et l'aigle du logo sous 19em. 20em = 320 px à 16 px, 360 px à 18 px,
       400 px à 20 px ; 19em = 304 px à 16 px, 342 px à 18 px, 380 px à 20 px. */
    @media (width < 20em) {
      .menu-toggle .menu-word { display: none; }
    }
    @media (width < 19em) {
      .brand .aigle { display: none; }
    }
  `],
})
export class MainLayoutComponent implements OnInit {
  readonly quota = inject(QuotaAlertService);
  readonly pages = inject(PageTitleService);
  /** L33 : « Ctrl K » hors Mac, « ⌘K » sur Mac (le raccourci marche des deux façons partout). */
  readonly shortcut = searchShortcut(typeof navigator === 'undefined' ? undefined : (navigator as PlatformHints));
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
  /** Tiroir ouvert : le reste de la page (hors bouton Menu et tiroir) est inerte. */
  readonly pageInert = computed(() => (this.menuOpen() ? '' : null));
  /**
   * La navigation en cours vient d'un lien du tiroir, du panneau « À propos ▾ » ou d'un résultat
   * de la recherche rapide (L30) : l'élément cliqué disparaît, le focus est à placer à l'arrivée.
   */
  focusOnArrival = false;

  @ViewChild('main', { static: true }) private main?: ElementRef<HTMLElement>;

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  constructor() {
    // L39 : le défilement d'ancre du routeur (window.scrollTo) ignore scroll-margin-top ; sans
    // décalage, la cible arrive SOUS la barre collante. Décalage = bas réel de la barre + 10 px.
    // L89 : sur une fiche, la barre d'ancres collée sous l'en-tête s'ajoute (sa hauteur varie : 44 px
    // au téléphone, 60 px de 761 à 1319 px et aussi à 1440 px, où elle tient sur une ligne), sinon le titre reste caché dessous.
    inject(ViewportScroller).setOffset(() => {
      const host = this.host.nativeElement;
      const top = Math.round(host.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 70);
      const nav = host.querySelector('.anchor-nav')?.getBoundingClientRect();
      return [0, Math.max(top, Math.round(nav ? nav.bottom - nav.top + top : 0)) + 10];
    });
    inject(Router).events
      .pipe(filter((e) => e instanceof NavigationEnd || e instanceof NavigationSkipped), takeUntilDestroyed())
      .subscribe((e) => {
        const focus = this.focusOnArrival;
        this.focusOnArrival = false;
        this.closeMenu();
        // Émis avant la mise à jour du titre (routeur) : le h1 recevra le focus, pas d'annonce en plus.
        if (focus && e instanceof NavigationEnd) this.pages.skipNextAnnouncement();
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
      if (!h1) this.focusLateHeading(main);
    });
  }

  /**
   * Fiche à données asynchrones (L122, WCAG 2.4.3) : le h1 n'existe qu'après la réponse de l'API,
   * donc après NavigationEnd. Le focus a été posé sur <main> en attendant ; il rejoint le h1 dès
   * qu'il apparaît, sauf si l'utilisateur l'a déplacé ailleurs entre-temps. Abandon après 10 s.
   */
  private focusLateHeading(main: HTMLElement): void {
    const stop = (observer: MutationObserver, timer: ReturnType<typeof setTimeout>) => {
      observer.disconnect();
      clearTimeout(timer);
    };
    const observer = new MutationObserver(() => {
      const h1 = main.querySelector<HTMLElement>('h1');
      if (!h1) return;
      stop(observer, timer);
      const active = document.activeElement;
      if (active && active !== document.body && active !== main) return;
      if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    });
    const timer = setTimeout(() => observer.disconnect(), 10_000);
    observer.observe(main, { childList: true, subtree: true });
    this.destroyRef.onDestroy(() => stop(observer, timer));
  }

  ngOnInit(): void {
    void this.news.load();
    // Passage au bureau (≥ 84em) menu ouvert : le tiroir disparaît, la page doit redéfiler.
    const desktop = window.matchMedia?.('(min-width: 84em)');
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
