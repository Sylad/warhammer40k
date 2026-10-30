import { Component, DestroyRef, ElementRef, EventEmitter, HostListener, Output, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

/** Le bouton est actif sur /lore et ses sous-pages (pas sur « /lorem »). */
const isLorePath = (url: string): boolean => /^\/lore(\/|$)/.test(url.split(/[?#]/)[0]);

/**
 * L37 (revue UX L30) — « Lore ▾ » de la barre du haut : un BOUTON à divulgation
 * (aria-expanded / aria-controls) comme « À propos ▾ », plus un méga-menu au survol dont les
 * 11 liens restaient dans l'ordre de tabulation panneau fermé (20 Tab pour atteindre la suite).
 * Fermé, le panneau est `hidden` : aucun de ses liens n'est focalisable. Le lien vers /lore,
 * que portait l'ancien intitulé, devient « Vue d'ensemble » en tête du panneau.
 * Entrée / Espace / clic ouvrent et ferment (le focus reste sur le bouton), Tab parcourt les
 * liens, Échap ferme et rend le focus au bouton ; fermé aussi par un clic à l'extérieur, quand
 * le focus quitte le groupe, et après une navigation.
 */
@Component({
  selector: 'app-lore-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="lore-menu" (focusout)="onFocusOut($event)" (keydown.escape)="closeAndFocus()">
      <button #toggleButton type="button" class="lore-toggle" [class.active]="groupActive()"
              aria-controls="menu-lore" [attr.aria-expanded]="open()" (click)="toggle()">
        <span class="nav-ico" aria-hidden="true">✠</span>Lore<span class="nav-caret" aria-hidden="true">▾</span>
      </button>
      <div id="menu-lore" class="mega-menu" [hidden]="!open()">
        <a class="mega-all" routerLink="/lore" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" [ariaCurrentWhenActive]="true" (click)="follow()">Vue d'ensemble</a>
        <div class="mega-col">
          <h4>Origines</h4>
          <a routerLink="/lore/emperor" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">L'Empereur</a>
          <a routerLink="/lore/primarchs" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Primarques</a>
          <a routerLink="/lore/saints" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Saints & Saintes</a>
        </div>
        <div class="mega-col">
          <h4>Cosmologie</h4>
          <a routerLink="/lore/chaos-gods" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Dieux du Chaos</a>
          <a routerLink="/lore/galaxy" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Galaxie</a>
          <a routerLink="/lore/concepts" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Concepts</a>
          <a routerLink="/lore/civilians" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Imperial Orgs</a>
        </div>
        <div class="mega-col">
          <h4>Guerre & Histoire</h4>
          <a routerLink="/lore/timeline" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Chronologie</a>
          <a routerLink="/lore/equipment" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Armement</a>
          <a routerLink="/lore/ships" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Vaisseaux</a>
          <a routerLink="/lore/titans" routerLinkActive="active" [ariaCurrentWhenActive]="true" (click)="follow()">Titans & Knights</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { position: relative; display: inline-flex; }
    .lore-toggle {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 4px; white-space: nowrap;
      background: transparent; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
      color: var(--text); opacity: 0.75; transition: color 0.2s, opacity 0.2s;
      font: inherit; font-weight: 700; letter-spacing: inherit; text-transform: uppercase;
    }
    .lore-toggle:hover, .lore-toggle[aria-expanded='true'] { opacity: 1; color: var(--gold-bright); }
    .lore-toggle.active {
      color: var(--gold); opacity: 1; border-bottom-color: var(--gold);
      text-shadow: 0 0 12px rgba(201, 162, 74, 0.35);
    }
    .nav-ico { font-size: 1rem; line-height: 1; }
    .nav-caret { margin-left: 4px; font-size: 0.65rem; opacity: 0.6; }
    .mega-menu {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 100; min-width: 540px;
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 22px; padding: 14px 24px 22px;
      background: rgba(11, 9, 7, 0.97); border: 1px solid var(--border-strong);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
    }
    .mega-menu[hidden] { display: none; }
    .mega-all { grid-column: 1 / -1; margin-bottom: 14px; }
    .mega-col h4 {
      font-family: var(--serif); font-size: 0.75rem; letter-spacing: 0.22em; color: var(--gold-bright);
      margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); text-transform: uppercase;
    }
    .mega-menu a {
      display: block; padding: 7px 0; font-size: 0.75rem; letter-spacing: 0.08em; color: var(--text);
      opacity: 0.78; text-decoration: none; text-transform: none; font-weight: 500;
      border-bottom: 1px solid rgba(201, 162, 74, 0.08);
    }
    .mega-col a:last-child { border-bottom: none; }
    .mega-menu a:hover { color: var(--gold-bright); opacity: 1; }
    .mega-menu a.active { color: var(--gold); opacity: 1; }
    .lore-toggle:focus-visible, .mega-menu a:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; opacity: 1; }
    @media (width < 106.25em) { .nav-ico { display: none; } }
  `],
})
export class LoreMenuComponent {
  /** Un lien du panneau est suivi : la mise en page place le focus sur le titre de la page d'arrivée (WCAG 2.4.3). */
  @Output() readonly navigated = new EventEmitter<void>();
  /** Ouvert / fermé : la mise en page referme « À propos ▾ » quand celui-ci s'ouvre. */
  @Output() readonly openChange = new EventEmitter<boolean>();

  @ViewChild('toggleButton', { static: true }) private toggleButton?: ElementRef<HTMLButtonElement>;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  readonly open = signal(false);
  readonly groupActive = signal(false);

  constructor() {
    // Avant la fin de la navigation initiale, router.url vaut encore « / » : rien à comparer.
    let url: string | null = this.router.navigated ? this.router.url : null;
    const update = () => this.groupActive.set(isLorePath(this.router.url));
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        update();
        if (url !== null && this.router.url !== url) this.setOpen(false);
        url = this.router.url;
      });
    update();
  }

  /** Fermeture sans déplacer le focus (l'autre panneau de la barre vient de s'ouvrir). */
  close(): void {
    this.setOpen(false);
  }

  private setOpen(v: boolean): void {
    if (this.open() === v) return;
    this.open.set(v);
    this.openChange.emit(v);
  }

  follow(): void {
    this.setOpen(false);
    this.navigated.emit();
  }

  toggle(): void {
    this.setOpen(!this.open());
  }

  closeAndFocus(): void {
    if (!this.open()) return;
    this.setOpen(false);
    this.toggleButton?.nativeElement.focus();
  }

  /** Le focus sort du bouton et du panneau : on referme. */
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) return;
    this.setOpen(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.setOpen(false);
  }
}
