---
name: angular
description: Angular 19 expert for the warhammer40k frontend (Angular 19.2, zone.js, no SSR) — Signals, standalone components, signal inputs/queries, routing, DI, @defer. Anything that only exists from v20 on (zoneless, provideZonelessChangeDetection, Signal Forms, stable incremental hydration…) is marked "v20+ — non applicable ici".
risk: safe
source: "Antigravity Awesome Skills (Angular Expert v1.0.0, v20+) — adapté à Angular 19 pour warhammer40k le 2026-09-29"
date_added: '2026-02-27'
---

# Angular Expert (adapté à Angular 19)

Master modern Angular development with Signals, Standalone Components and the reactive patterns **available in Angular 19**.

> **Adaptation du 2026-09-29.** Ce skill tiers visait Angular v20+. Ce projet est en
> **Angular 19** et n'y montera pas dans le cadre de ce skill : tout ce qui n'existe ou
> n'est stable qu'à partir de la v20 est retiré ou marqué **« v20+ — non applicable ici »**.
> Ne jamais proposer une montée de version d'Angular pour appliquer une recette de ce skill.

## Ce projet (warhammer40k/frontend) — à lire avant tout

Versions installées (source : `frontend/package.json` + `node_modules/*/package.json`, relevées le 2026-09-29) :

| Paquet | Déclaré | Installé |
| --- | --- | --- |
| `@angular/core` (et common, router, forms, animations, platform-browser) | `^19.0.0` | 19.2.21 |
| `@angular/build`, `@angular/cli`, `@angular/compiler-cli` | `^19.0.0` | 19.2.24, 19.2.26, 19.2.21 |
| `typescript` | `~5.6.0` | 5.6.3 |
| `rxjs` | `^7.8.0` | 7.8.2 |
| `zone.js` | `^0.15.0` | 0.15.1 |

Pas de `@angular/ssr`, pas de `@angular/material` ni `@angular/cdk` dans `package.json`.

Conventions en place :

- **zone.js** : `polyfills: ["zone.js"]` dans `angular.json`, `provideZoneChangeDetection({ eventCoalescing: true })` dans `app.config.ts`. L'application n'est **pas** zoneless.
- **Pas de SSR ni d'hydratation** : SPA servie par nginx (`frontend/nginx.conf`).
- **Standalone partout** (zéro NgModule) ; Signals + interop RxJS ; control flow `@if`/`@for`.
- **Tests** : Vitest (`npm test`) sur les helpers **purs** (`*.utils.ts`) uniquement — pas de TestBed ni de bootstrap Angular (cf. `frontend/vitest.config.ts`). Toujours `npm run build` (`ng build`) avant de déclarer une livraison frontend.
- Identité visuelle custom (voir `CLAUDE.md` du projet), pas de Material pour les nouvelles pages.

Stabilité des API en 19.2.21 (lue dans les `.d.ts` installés : `@developerPreview`, `@experimental`, absence de balise = stable) :

| Statut en 19.2 | API |
| --- | --- |
| Stable | `signal`, `computed`, `untracked`, `input`/`input.required`, `model`, `output`, `viewChild(ren)`, `contentChild(ren)`, `inject`, `toSignal`, `takeUntilDestroyed`, `outputFromObservable`/`outputToObservable`, `@defer`, `@if`/`@for`/`@switch`, `provideZoneChangeDetection` |
| Developer preview (utilisable, l'API peut encore bouger) | `effect`, `linkedSignal`, `toObservable`, `afterRender`/`afterNextRender` |
| Expérimental (à éviter sans raison forte) | `resource`, `rxResource`, `httpResource`, `provideExperimentalZonelessChangeDetection`, `withIncrementalHydration` |
| **Absent en 19 (v20+ — non applicable ici)** | `provideZonelessChangeDetection`, `afterEveryRender`, Signal Forms |

## When to Use This Skill

- Working on this Angular 19 frontend
- Implementing Signals-based reactive patterns
- Creating Standalone Components
- Optimizing Angular performance (OnPush, `@defer`, NgOptimizedImage)
- Adopting modern Angular patterns and best practices

## Do Not Use This Skill When

- Migrating from AngularJS (1.x) → use `angular-migration` skill
- General TypeScript issues → use `typescript-expert` skill
- Configuring zoneless, SSR or hydration → **v20+ / hors périmètre de ce projet**

## Instructions

1. Assess the Angular version and project structure (ici : 19.2, zone.js — voir le tableau ci-dessus)
2. Apply modern patterns available in 19 (Signals, Standalone, signal inputs/queries) — jamais Zoneless
3. Implement with proper typing and reactivity
4. Validate with build and tests

## Safety

- Always test changes in development before production
- Gradual migration for existing apps (don't big-bang refactor)
- Keep backward compatibility during transitions

---

## Angular Version Timeline

| Version        | Release | Key Features                                           |
| -------------- | ------- | ------------------------------------------------------ |
| **Angular 19** ← **ce projet** | Q4 2024 | Standalone par défaut ; `input`/`model`/`output` et requêtes signal stables ; `effect`, `linkedSignal` en developer preview ; `resource`, incremental hydration et zoneless expérimentaux |
| Angular 20 — *v20+, non applicable ici* | Q2 2025 | Signals stable, Zoneless stable, Incremental hydration |
| Angular 21 — *v20+, non applicable ici* | Q4 2025 | Signals-first default, Enhanced SSR                    |
| Angular 22 — *v20+, non applicable ici* | Q2 2026 | Signal Forms, Selectorless components                  |

Les lignes v20+ viennent du skill d'origine et n'ont pas été revérifiées : elles ne servent qu'à reconnaître une recette qui ne s'applique pas ici.

---

## 1. Signals: The New Reactive Primitive

Signals are Angular's fine-grained reactivity system. **En Angular 19 avec zone.js (ce projet)**, ils cohabitent avec la détection de changements pilotée par zone.js — ils ne la remplacent pas.

### Core Concepts

```typescript
import { signal, computed, effect } from "@angular/core";

// Writable signal
const count = signal(0);

// Read value
console.log(count()); // 0

// Update value
count.set(5); // Direct set
count.update((v) => v + 1); // Functional update

// Computed (derived) signal
const doubled = computed(() => count() * 2);

// Effect (side effects) — developer preview en 19.2
effect(() => {
  console.log(`Count changed to: ${count()}`);
});
```

### Signal-Based Inputs and Outputs

```typescript
import { Component, input, output, model } from "@angular/core";

@Component({
  selector: "app-user-card",
  standalone: true,
  template: `
    <div class="card">
      <h3>{{ name() }}</h3>
      <span>{{ role() }}</span>
      <button (click)="select.emit(id())">Select</button>
    </div>
  `,
})
export class UserCardComponent {
  // Signal inputs (read-only)
  id = input.required<string>();
  name = input.required<string>();
  role = input<string>("User"); // With default

  // Output
  select = output<string>();

  // Two-way binding (model)
  isSelected = model(false);
}

// Usage:
// <app-user-card [id]="'123'" [name]="'John'" [(isSelected)]="selected" />
```

### Signal Queries (ViewChild/ContentChild)

```typescript
import {
  Component,
  viewChild,
  viewChildren,
  contentChild,
} from "@angular/core";

@Component({
  selector: "app-container",
  template: `
    <input #searchInput />
    @for (item of items(); track item) {
      <app-item />
    }
  `,
})
export class ContainerComponent {
  // Signal-based queries
  searchInput = viewChild<ElementRef>("searchInput");
  items = viewChildren(ItemComponent);
  projectedContent = contentChild(HeaderDirective);

  focusSearch() {
    this.searchInput()?.nativeElement.focus();
  }
}
```

### When to Use Signals vs RxJS

| Use Case                | Signals         | RxJS                             |
| ----------------------- | --------------- | -------------------------------- |
| Local component state   | ✅ Preferred    | Overkill                         |
| Derived/computed values | ✅ `computed()` | `combineLatest` works            |
| Side effects            | ✅ `effect()`   | `tap` operator                   |
| HTTP requests           | ❌              | ✅ HttpClient returns Observable |
| Event streams           | ❌              | ✅ `fromEvent`, operators        |
| Complex async flows     | ❌              | ✅ `switchMap`, `mergeMap`       |

---

## 2. Standalone Components

Standalone components are self-contained and don't require NgModule declarations.
Depuis Angular 19, `standalone: true` est la valeur **par défaut** : l'écrire est inutile (mais sans effet).

### Creating Standalone Components

```typescript
import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterLink], // Direct imports
  template: `
    <header>
      <a routerLink="/">Home</a>
      <a routerLink="/about">About</a>
    </header>
  `,
})
export class HeaderComponent {}
```

### Bootstrapping Without NgModule

```typescript
// main.ts
import { bootstrapApplication } from "@angular/platform-browser";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { AppComponent } from "./app/app.component";
import { routes } from "./app/app.routes";

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient()],
});
```

### Lazy Loading Standalone Components

```typescript
// app.routes.ts
import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "dashboard",
    loadComponent: () =>
      import("./dashboard/dashboard.component").then(
        (m) => m.DashboardComponent,
      ),
  },
  {
    path: "admin",
    loadChildren: () =>
      import("./admin/admin.routes").then((m) => m.ADMIN_ROUTES),
  },
];
```

---

## 3. Zoneless Angular — v20+, non applicable ici

Ce projet tourne **avec zone.js** (`polyfills: ["zone.js"]`, `provideZoneChangeDetection({ eventCoalescing: true })`).

- `provideZonelessChangeDetection()` **n'existe pas** en Angular 19 (apparu en v20).
- L'équivalent 19, `provideExperimentalZonelessChangeDetection()`, est **expérimental** : ne pas l'activer ici.
- Ne pas retirer zone.js des polyfills, ne pas écrire de composant qui compte sur l'absence de zone.

Ce qui reste utile en 19 : `ChangeDetectionStrategy.OnPush` + signaux (voir §10), qui fonctionne très bien avec zone.js.

---

## 4. Server-Side Rendering & Hydration — non applicable ici

Ce projet n'a **pas de SSR** (pas de `@angular/ssr`, SPA servie par nginx) : pas de `provideClientHydration`, pas de déclencheurs `hydrate on …`.

Pour mémoire, en Angular 19 : `withEventReplay()` est stable, `withIncrementalHydration()` (blocs `@defer (hydrate on …)`) n'est qu'expérimental — l'hydratation incrémentale stable est **v20+, non applicable ici**. Ajouter du SSR serait une décision d'architecture, pas une recette de ce skill.

Les blocs `@defer` **sans** `hydrate` (chargement paresseux côté client) restent pertinents : voir §10.

---

## 5. Modern Routing Patterns

### Functional Route Guards

```typescript
// auth.guard.ts
import { inject } from "@angular/core";
import { Router, CanActivateFn } from "@angular/router";
import { AuthService } from "./auth.service";

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(["/login"], {
    queryParams: { returnUrl: state.url },
  });
};

// Usage in routes
export const routes: Routes = [
  {
    path: "dashboard",
    loadComponent: () => import("./dashboard.component"),
    canActivate: [authGuard],
  },
];
```

### Route-Level Data Resolvers

```typescript
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { UserService } from './user.service';
import { User } from './user.model';

export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getUser(route.paramMap.get('id')!);
};

// In routes
{
  path: 'user/:id',
  loadComponent: () => import('./user.component'),
  resolve: { user: userResolver }
}

// In component
export class UserComponent {
  private route = inject(ActivatedRoute);
  user = toSignal(this.route.data.pipe(map(d => d['user'])));
}
```

---

## 6. Dependency Injection Patterns

### Modern inject() Function

```typescript
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserService } from './user.service';

@Component({...})
export class UserComponent {
  // Modern inject() - no constructor needed
  private http = inject(HttpClient);
  private userService = inject(UserService);

  // Works in any injection context
  users = toSignal(this.userService.getUsers());
}
```

### Injection Tokens for Configuration

```typescript
import { InjectionToken, inject } from "@angular/core";

// Define token
export const API_BASE_URL = new InjectionToken<string>("API_BASE_URL");

// Provide in config
bootstrapApplication(AppComponent, {
  providers: [{ provide: API_BASE_URL, useValue: "https://api.example.com" }],
});

// Inject in service
@Injectable({ providedIn: "root" })
export class ApiService {
  private baseUrl = inject(API_BASE_URL);

  get(endpoint: string) {
    return this.http.get(`${this.baseUrl}/${endpoint}`);
  }
}
```

---

## 7. Component Composition & Reusability

### Content Projection (Slots)

```typescript
@Component({
  selector: 'app-card',
  template: `
    <div class="card">
      <div class="header">
        <!-- Select by attribute -->
        <ng-content select="[card-header]"></ng-content>
      </div>
      <div class="body">
        <!-- Default slot -->
        <ng-content></ng-content>
      </div>
    </div>
  `
})
export class CardComponent {}

// Usage
<app-card>
  <h3 card-header>Title</h3>
  <p>Body content</p>
</app-card>
```

### Host Directives (Composition)

```typescript
// Reusable behaviors without inheritance
@Directive({
  standalone: true,
  selector: '[appTooltip]',
  inputs: ['tooltip'] // Signal input alias
})
export class TooltipDirective { ... }

@Component({
  selector: 'app-button',
  standalone: true,
  hostDirectives: [
    {
      directive: TooltipDirective,
      inputs: ['tooltip: title'] // Map input
    }
  ],
  template: `<ng-content />`
})
export class ButtonComponent {}
```

---

## 8. State Management Patterns

### Signal-Based State Service

```typescript
import { Injectable, signal, computed } from "@angular/core";

interface AppState {
  user: User | null;
  theme: "light" | "dark";
  notifications: Notification[];
}

@Injectable({ providedIn: "root" })
export class StateService {
  // Private writable signals
  private _user = signal<User | null>(null);
  private _theme = signal<"light" | "dark">("light");
  private _notifications = signal<Notification[]>([]);

  // Public read-only computed
  readonly user = computed(() => this._user());
  readonly theme = computed(() => this._theme());
  readonly notifications = computed(() => this._notifications());
  readonly unreadCount = computed(
    () => this._notifications().filter((n) => !n.read).length,
  );

  // Actions
  setUser(user: User | null) {
    this._user.set(user);
  }

  toggleTheme() {
    this._theme.update((t) => (t === "light" ? "dark" : "light"));
  }

  addNotification(notification: Notification) {
    this._notifications.update((n) => [...n, notification]);
  }
}
```

### Component Store Pattern with Signals

```typescript
import { Injectable, signal, computed, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { toSignal } from "@angular/core/rxjs-interop";

@Injectable()
export class ProductStore {
  private http = inject(HttpClient);

  // State
  private _products = signal<Product[]>([]);
  private _loading = signal(false);
  private _filter = signal("");

  // Selectors
  readonly products = computed(() => this._products());
  readonly loading = computed(() => this._loading());
  readonly filteredProducts = computed(() => {
    const filter = this._filter().toLowerCase();
    return this._products().filter((p) =>
      p.name.toLowerCase().includes(filter),
    );
  });

  // Actions
  loadProducts() {
    this._loading.set(true);
    this.http.get<Product[]>("/api/products").subscribe({
      next: (products) => {
        this._products.set(products);
        this._loading.set(false);
      },
      error: () => this._loading.set(false),
    });
  }

  setFilter(filter: string) {
    this._filter.set(filter);
  }
}
```

---

## 9. Forms (Reactive Forms en 19 ; Signal Forms = v20+, non applicable ici)

### Current Reactive Forms

```typescript
import { Component, inject } from "@angular/core";
import { FormBuilder, Validators, ReactiveFormsModule } from "@angular/forms";

@Component({
  selector: "app-user-form",
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="name" placeholder="Name" />
      <input formControlName="email" type="email" placeholder="Email" />
      <button [disabled]="form.invalid">Submit</button>
    </form>
  `,
})
export class UserFormComponent {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    name: ["", Validators.required],
    email: ["", [Validators.required, Validators.email]],
  });

  onSubmit() {
    if (this.form.valid) {
      console.log(this.form.value);
    }
  }
}
```

### Signal Forms — v20+, non applicable ici

L'API Signal Forms n'existe pas en Angular 19. Pour une validation simple pilotée par signaux, un `computed()` sur des `signal()` locaux suffit ; sinon, Reactive Forms ci-dessus.

---

## 10. Performance Optimization

### Change Detection Strategies

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Only checks when (avec zone.js, comme ici) :
  // 1. Input signal/reference changes
  // 2. Event handler runs
  // 3. Async pipe emits
  // 4. Signal read in the template changes
})
```

### Defer Blocks for Lazy Loading

```typescript
@Component({
  template: `
    <!-- Immediate loading -->
    <app-header />

    <!-- Lazy load when visible -->
    @defer (on viewport) {
      <app-heavy-chart />
    } @placeholder {
      <div class="skeleton" />
    } @loading (minimum 200ms) {
      <app-spinner />
    } @error {
      <p>Failed to load chart</p>
    }
  `
})
```

### NgOptimizedImage

```typescript
import { NgOptimizedImage } from '@angular/common';

@Component({
  imports: [NgOptimizedImage],
  template: `
    <img
      ngSrc="hero.jpg"
      width="800"
      height="600"
      priority
    />

    <img
      ngSrc="thumbnail.jpg"
      width="200"
      height="150"
      loading="lazy"
      placeholder="blur"
    />
  `
})
```

---

## 11. Testing Modern Angular

> **Ce projet** : Vitest sur les helpers purs uniquement (`frontend/vitest.config.ts`), **sans TestBed**.
> Les exemples TestBed ci-dessous sont génériques ; pour tester une logique de composant ici,
> l'extraire d'abord dans un `*.utils.ts` pur et la tester avec Vitest.

### Testing Signal Components

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CounterComponent } from "./counter.component";

describe("CounterComponent", () => {
  let component: CounterComponent;
  let fixture: ComponentFixture<CounterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CounterComponent], // Standalone import
    }).compileComponents();

    fixture = TestBed.createComponent(CounterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("should increment count", () => {
    expect(component.count()).toBe(0);

    component.increment();

    expect(component.count()).toBe(1);
  });

  it("should update DOM on signal change", () => {
    component.count.set(5);
    fixture.detectChanges();

    const el = fixture.nativeElement.querySelector(".count");
    expect(el.textContent).toContain("5");
  });
});
```

### Testing with Signal Inputs

```typescript
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ComponentRef } from "@angular/core";
import { UserCardComponent } from "./user-card.component";

describe("UserCardComponent", () => {
  let fixture: ComponentFixture<UserCardComponent>;
  let componentRef: ComponentRef<UserCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UserCardComponent);
    componentRef = fixture.componentRef;

    // Set signal inputs via setInput
    componentRef.setInput("id", "123");
    componentRef.setInput("name", "John Doe");

    fixture.detectChanges();
  });

  it("should display user name", () => {
    const el = fixture.nativeElement.querySelector("h3");
    expect(el.textContent).toContain("John Doe");
  });
});
```

---

## Best Practices Summary

| Pattern              | ✅ Do                          | ❌ Don't                        |
| -------------------- | ------------------------------ | ------------------------------- |
| **State**            | Use Signals for local state    | Overuse RxJS for simple state   |
| **Components**       | Standalone with direct imports | Bloated SharedModules           |
| **Change Detection** | OnPush + Signals               | Default CD everywhere           |
| **Lazy Loading**     | `@defer` and `loadComponent`   | Eager load everything           |
| **DI**               | `inject()` function            | Constructor injection (verbose) |
| **Inputs**           | `input()` signal function      | `@Input()` decorator (legacy)   |
| **Zoneless**         | *v20+ — non applicable ici* : garder zone.js | Activer l'API expérimentale 19 |

---

## Resources

- [Angular v19 documentation](https://v19.angular.dev) — **référence pour ce projet** (angular.dev documente la dernière version)
- [Angular.dev Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular SSR Guide](https://angular.dev/guide/ssr) — *non applicable ici (pas de SSR)*
- [Angular Update Guide](https://angular.dev/update-guide)
- [Angular Blog](https://blog.angular.dev)

---

## Common Troubleshooting

| Issue                          | Solution                                            |
| ------------------------------ | --------------------------------------------------- |
| Signal not updating UI         | Ensure `OnPush` + call signal as function `count()` |
| Circular dependency            | Use `inject()` with `forwardRef`                    |
| Signal array/object not re-rendering | `update()` with a new reference, never mutate in place |
