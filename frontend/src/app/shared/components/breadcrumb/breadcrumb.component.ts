import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { Crumb, crumbsFor, pagePaths } from './breadcrumb.utils';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (crumbs().length > 1) {
      <nav class="bc" aria-label="Fil d'Ariane">
        <ol class="bc-list">
          @for (c of crumbs(); track $index; let last = $last) {
            <li class="bc-item">
              @if (last) {
                <span class="bc-current" aria-current="page">{{ c.label }}</span>
              } @else if (c.link) {
                <a class="bc-link" [routerLink]="c.link">{{ c.label }}</a>
              } @else {
                <!-- Préfixe sans page (/units, /subfactions) : texte neutre, ni lien ni « courant ». -->
                <span class="bc-text">{{ c.label }}</span>
              }
              @if (!last) {
                <span class="bc-sep" aria-hidden="true">›</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
  styles: [`
    :host { display: block; }
    .bc {
      padding: 10px 34px;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--muted);
      background: rgba(8, 7, 6, 0.55);
      border-bottom: 1px solid var(--border);
    }
    .bc-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .bc-item { display: flex; align-items: center; gap: 8px; }
    /* L39 : --gold-soft donnait 3,7:1 sur ce fond ; --gold dépasse 4,5:1. */
    .bc-link {
      color: var(--gold);
      text-decoration: none;
      transition: color 0.15s;
    }
    .bc-link:hover { color: var(--gold-bright); }
    .bc-sep { color: var(--gold-soft); opacity: 0.65; font-weight: 400; }
    .bc-text { color: var(--muted); }
    .bc-current { color: var(--gold-bright); }
  `],
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Chemins des pages (enfants de la mise en page, redirections exclues). */
  private readonly isPage = pagePaths(
    this.router.config
      .flatMap(r => (r.path === '' && r.children ? r.children : [r]))
      .filter(r => r.path !== undefined && r.path !== '**' && !r.redirectTo)
      .map(r => r.path!),
  );

  readonly crumbs = computed<Crumb[]>(() => crumbsFor(this.url() ?? '/', this.isPage));
}
