import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';

interface Crumb {
  label: string;
  link: string | null;
}

const STATIC_LABELS: Record<string, string> = {
  '': 'Accueil',
  factions: 'Factions',
  subfactions: 'Sous-Factions',
  units: 'Unités',
  romans: 'Romans',
  videos: 'Vidéos',
  gallery: 'Galerie',
  galerie: 'Galerie',
  about: 'À propos',
  lore: 'Lore',
  emperor: 'L\'Empereur',
  primarchs: 'Les Primarques',
  'chaos-gods': 'Panthéon Chaos',
  civilians: 'Civils Impériaux',
  concepts: 'Concepts & Lieux',
  galaxy: 'La Galaxie',
  equipment: 'Armement & Reliques',
  timeline: 'Chronologie',
};

function slugToLabel(slug: string): string {
  if (STATIC_LABELS[slug] !== undefined) return STATIC_LABELS[slug];
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (crumbs().length > 1) {
      <nav class="bc" aria-label="Fil d'Ariane">
        @for (c of crumbs(); track c.link; let last = $last) {
          @if (c.link && !last) {
            <a class="bc-link" [routerLink]="c.link">{{ c.label }}</a>
          } @else {
            <span class="bc-current">{{ c.label }}</span>
          }
          @if (!last) {
            <span class="bc-sep">›</span>
          }
        }
      </nav>
    }
  `,
  styles: [`
    :host { display: block; }
    .bc {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      padding: 10px 34px;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
      color: var(--muted);
      background: rgba(8, 7, 6, 0.55);
      border-bottom: 1px solid var(--border);
    }
    .bc-link {
      color: var(--gold-soft);
      text-decoration: none;
      transition: color 0.15s;
    }
    .bc-link:hover { color: var(--gold-bright); }
    .bc-sep { color: var(--gold-soft); opacity: 0.65; font-weight: 400; }
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

  readonly crumbs = computed<Crumb[]>(() => {
    const url = this.url() ?? '/';
    const segments = url.split('?')[0].split('#')[0].split('/').filter(Boolean);
    const out: Crumb[] = [{ label: 'Accueil', link: '/' }];
    let acc = '';
    for (const seg of segments) {
      acc += '/' + seg;
      out.push({ label: slugToLabel(seg), link: acc });
    }
    if (out.length > 0) {
      out[out.length - 1] = { ...out[out.length - 1], link: null };
    }
    return out;
  });
}
