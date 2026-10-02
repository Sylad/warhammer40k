import { Injectable, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { tap, type MonoTypeOperatorFunction } from 'rxjs';
import { slugToLabel } from '../../shared/components/breadcrumb/breadcrumb.utils';

/**
 * L36 — titre de la page (WCAG 2.4.2), une seule source pour l'onglet, le fil d'Ariane et
 * l'annonce aux lecteurs d'écran :
 *  - page fixe : libellé de son dernier segment d'adresse (table du fil d'Ariane) ;
 *  - fiche (route avec `title`, ex. « Faction ») : ce libellé tant que l'entité charge, puis le
 *    NOM de l'entité (`setName`), ou « Faction introuvable » (`setNotFound`).
 * Titre du document : « <page> — Warhammer 40 000 ».
 */
export const SITE_NAME = 'Warhammer 40 000';

export function documentTitle(page: string): string {
  return `${page} — ${SITE_NAME}`;
}

function pathOf(url: string): string {
  return url.split(/[?#]/)[0] || '/';
}

@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private readonly title = inject(Title);

  /** Page courante : adresse (sans requête ni ancre), libellé, type d'entité pour une fiche. */
  private readonly current = signal<{ path: string; label: string; kind: string | null }>({ path: '', label: '', kind: null });
  /** Nom d'entité posé par une fiche, rattaché à l'adresse de cette fiche. */
  private readonly entity = signal<{ path: string; name: string } | null>(null);

  /** Nom de l'entité de la page courante (fiche chargée ou introuvable), sinon null. */
  readonly entityName = computed(() => {
    const e = this.entity();
    return e && e.path === this.current().path ? e.name : null;
  });
  /** Nom de la page courante, tel qu'il figure dans le titre du document. */
  readonly pageName = computed(() => this.entityName() ?? this.current().label);

  /** Texte de la région live (annonce polie du changement de page). */
  readonly announcement = signal('');
  private announcePending = false;
  private quietNext = false;
  private navigations = 0;

  /** Appelé par la stratégie de titre à chaque fin de navigation. */
  navigated(url: string, kind: string | null): void {
    const path = pathOf(url);
    const changed = path !== this.current().path;
    const segments = path.split('/').filter(Boolean);
    const label = kind ?? (segments.length ? slugToLabel(segments[segments.length - 1]) : 'Accueil');
    this.current.set({ path, label, kind });
    this.update();
    // Annonce : pas au premier chargement, pas pour une ancre de la même page, pas quand le focus
    // est déjà porté sur le titre h1 de l'arrivée (le lecteur d'écran le lit).
    const quiet = this.quietNext;
    this.quietNext = false;
    if (this.navigations++ === 0 || !changed || quiet) {
      this.announcePending = false;
      return;
    }
    this.announcePending = true;
    if (!kind || this.entityName()) this.announce();
  }

  /** La fiche a chargé son entité : son nom devient celui de la page. */
  setName(name: string): void {
    this.entity.set({ path: this.current().path, name });
    this.update();
    this.announce();
  }

  /** La fiche n'a pas trouvé son entité : « <type> introuvable ». */
  setNotFound(): void {
    this.setName(`${this.current().kind ?? 'Page'} introuvable`);
  }

  /** Le focus va être placé sur le titre h1 de la page d'arrivée : ne pas l'annoncer en plus. */
  skipNextAnnouncement(): void {
    this.quietNext = true;
  }

  private update(): void {
    this.title.setTitle(documentTitle(this.pageName()));
  }

  private announce(): void {
    if (!this.announcePending) return;
    this.announcePending = false;
    // Espace insécable alterné : le même nom deux fois de suite est quand même relu.
    const name = this.pageName();
    this.announcement.set(this.announcement() === name ? name + ' ' : name);
  }
}

/** Stratégie de titre du routeur : délègue au service (le `title` d'une route = type de fiche). */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly pages = inject(PageTitleService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.pages.navigated(snapshot.url, this.buildTitle(snapshot) ?? null);
  }
}

/**
 * Opérateur des fiches : à l'arrivée de l'entité, son nom devient celui de la page ; sur erreur
 * (identifiant inconnu), « <type> introuvable ». Le flux n'est pas modifié.
 */
export function namedPage<T>(pages: PageTitleService, nameOf: (entity: T) => string | null | undefined): MonoTypeOperatorFunction<T> {
  return tap<T>({
    next: (e) => {
      const name = e ? nameOf(e) : null;
      if (name) pages.setName(name);
      else pages.setNotFound();
    },
    error: () => pages.setNotFound(),
  });
}
