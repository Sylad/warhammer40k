import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'factions',
        loadComponent: () => import('./features/factions/factions.component')
          .then(m => m.FactionsComponent)
      },
      {
        path: 'factions/:id',
        loadComponent: () => import('./features/faction-detail/faction-detail.component')
          .then(m => m.FactionDetailComponent)
      },
      {
        path: 'units/:id',
        loadComponent: () => import('./features/unit-detail/unit-detail.component')
          .then(m => m.UnitDetailComponent)
      },
      {
        path: 'factions/:factionId/units/:unitId',
        redirectTo: (info) => `/units/${info.params['unitId']}`,
      },
      {
        path: 'subfactions/:id',
        loadComponent: () => import('./features/subfaction-detail/subfaction-detail.component')
          .then(m => m.SubFactionDetailComponent)
      },
      {
        path: 'romans',
        loadComponent: () => import('./features/series/series.component')
          .then(m => m.SeriesComponent)
      },
      {
        path: 'videos',
        loadComponent: () => import('./features/videos/videos.component')
          .then(m => m.VideosComponent)
      },
      {
        path: 'gallery',
        loadComponent: () => import('./features/gallery/gallery.component')
          .then(m => m.GalleryComponent)
      },
      { path: 'galerie', redirectTo: '/gallery', pathMatch: 'full' },
      {
        path: 'lore',
        loadComponent: () => import('./features/lore-hub/lore-hub.component')
          .then(m => m.LoreHubComponent)
      },
      {
        path: 'lore/emperor',
        loadComponent: () => import('./features/lore-emperor/lore-emperor.component')
          .then(m => m.LoreEmperorComponent)
      },
      {
        path: 'lore/primarchs',
        loadComponent: () => import('./features/lore-primarchs/lore-primarchs.component')
          .then(m => m.LorePrimarchsComponent)
      },
      {
        path: 'lore/chaos-gods',
        loadComponent: () => import('./features/lore-chaos-gods/lore-chaos-gods.component')
          .then(m => m.LoreChaosGodsComponent)
      },
      {
        path: 'lore/civilians',
        loadComponent: () => import('./features/lore-civilians/lore-civilians.component')
          .then(m => m.LoreCiviliansComponent)
      },
      {
        path: 'lore/concepts',
        loadComponent: () => import('./features/lore-concepts/lore-concepts.component')
          .then(m => m.LoreConceptsComponent)
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about.component')
          .then(m => m.AboutComponent)
      },
      { path: '**', redirectTo: 'factions' },
    ],
  },
];
