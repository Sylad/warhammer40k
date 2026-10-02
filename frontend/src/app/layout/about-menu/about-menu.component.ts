import { Component, DestroyRef, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs/operators';

/** Routes regroupées sous « À propos ▾ » : le bouton prend l'état actif sur chacune. */
const GROUP = ['/nouveautes', '/plan', '/about'];

/**
 * L30 (option b de la revue UX) — « À propos ▾ » de la barre du haut : un BOUTON à
 * divulgation (aria-expanded / aria-controls), pas un menu ARIA ni un menu au survol.
 * Il montre Nouveautés (avec la pastille des non vues), Plan de travail et À propos du codex.
 * Entrée / Espace ouvrent et ferment (le focus reste sur le bouton), Tab parcourt les liens,
 * Échap ferme et rend le focus au bouton ; fermé aussi par un clic à l'extérieur, quand le
 * focus quitte le groupe, et après une navigation.
 */
@Component({
  selector: 'app-about-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="about-menu" (focusout)="onFocusOut($event)" (keydown.escape)="closeAndFocus()">
      <button #toggleButton type="button" class="about-toggle" [class.active]="groupActive()"
              aria-controls="menu-a-propos" [attr.aria-expanded]="open()"
              [attr.aria-label]="badge ? 'À propos, ' + unseenText : null" (click)="toggle()">
        <span class="nav-ico" aria-hidden="true">⚜</span>À propos<span class="nav-caret" aria-hidden="true">▾</span>
        @if (badge) { <span class="news-badge" aria-hidden="true">{{ badge }}</span> }
      </button>
      <div id="menu-a-propos" class="about-panel" [hidden]="!open()">
        <a routerLink="/nouveautes" routerLinkActive="active" (click)="follow()">
          Nouveautés
          @if (badge) {
            <span class="news-badge" aria-hidden="true">{{ badge }}</span><span class="sr-only">, {{ unseenText }}</span>
          }
        </a>
        <a routerLink="/plan" routerLinkActive="active" (click)="follow()">Plan de travail</a>
        <a routerLink="/about" routerLinkActive="active" (click)="follow()">À propos du codex</a>
      </div>
    </div>
  `,
  styles: [`
    :host { position: relative; display: inline-flex; }
    .about-toggle {
      display: inline-flex; align-items: center; gap: 8px; padding: 8px 4px; white-space: nowrap;
      background: transparent; border: 0; border-bottom: 2px solid transparent; cursor: pointer;
      color: var(--text); opacity: 0.75; transition: color 0.2s, opacity 0.2s;
      font: inherit; font-weight: 700; letter-spacing: inherit; text-transform: uppercase;
    }
    .about-toggle:hover, .about-toggle[aria-expanded='true'] { opacity: 1; color: var(--gold-bright); }
    .about-toggle.active {
      color: var(--gold); opacity: 1; border-bottom-color: var(--gold);
      text-shadow: 0 0 12px rgba(201, 162, 74, 0.35);
    }
    .nav-ico { font-size: 1rem; line-height: 1; }
    .nav-caret { margin-left: -4px; font-size: 0.65rem; opacity: 0.6; }
    .news-badge {
      display: inline-block; min-width: 1.35em; padding: 1px 5px; border-radius: 999px;
      background: var(--gold); color: var(--bg); font-size: 0.66rem; line-height: 1.35;
      letter-spacing: 0; text-align: center; text-shadow: none;
    }
    .about-panel {
      position: absolute; top: calc(100% + 8px); right: 0; z-index: 100; min-width: 240px;
      display: flex; flex-direction: column; padding: 8px 18px;
      background: rgba(11, 9, 7, 0.97); border: 1px solid var(--border-strong);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7);
    }
    .about-panel[hidden] { display: none; }
    .about-panel a {
      display: flex; align-items: center; gap: 8px; min-height: 44px; white-space: nowrap;
      color: var(--text); text-decoration: none; text-transform: none; letter-spacing: 0.06em;
      font-size: 0.85rem; font-weight: 600; border-bottom: 1px solid rgba(201, 162, 74, 0.12);
    }
    .about-panel a:last-child { border-bottom: none; }
    .about-panel a:hover { color: var(--gold-bright); }
    .about-panel a.active { color: var(--gold); }
    .about-toggle:focus-visible, .about-panel a:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
    }
    @media (width < 106.25em) { .nav-ico { display: none; } }
  `],
})
export class AboutMenuComponent {
  /** Pastille des nouveautés non vues (« », « 3 », « 9+ »). */
  @Input() badge = '';
  /** Texte pour lecteur d'écran (« 3 nouveautés non vues »). */
  @Input() unseenText = '';

  /**
   * Un lien du panneau est suivi : le panneau disparaît avec le lien qui avait le focus, la
   * mise en page place le focus sur le titre de la page d'arrivée (WCAG 2.4.3).
   */
  @Output() readonly navigated = new EventEmitter<void>();

  @ViewChild('toggleButton', { static: true }) private toggleButton?: ElementRef<HTMLButtonElement>;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly router = inject(Router);
  readonly open = signal(false);
  readonly groupActive = signal(false);

  constructor() {
    // Avant la fin de la navigation initiale, router.url vaut encore « / » : rien à comparer.
    let url: string | null = this.router.navigated ? this.router.url : null;
    const update = () => this.groupActive.set(GROUP.includes(this.router.url.split(/[?#]/)[0]));
    // Fermé après une navigation vers une autre page — pas à la fin de la navigation initiale
    // (même adresse), qui peut arriver après un premier clic sur le bouton.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        update();
        if (url !== null && this.router.url !== url) this.setOpen(false);
        url = this.router.url;
      });
    update();
  }

  /** Ouvert / fermé : la barre masque le méga-menu Lore pendant que le panneau est ouvert. */
  @Output() readonly openChange = new EventEmitter<boolean>();

  /** Fermeture sans déplacer le focus (survol ou focus du méga-menu Lore). */
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
