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
        path: 'about',
        loadComponent: () => import('./features/about/about.component')
          .then(m => m.AboutComponent)
      },
      { path: '**', redirectTo: 'factions' },
    ],
  },
];
