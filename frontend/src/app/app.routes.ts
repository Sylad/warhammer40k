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
        path: 'lore/primarchs/:id',
        loadComponent: () => import('./features/primarch-detail/primarch-detail.component')
          .then(m => m.PrimarchDetailComponent)
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
        path: 'lore/galaxy',
        loadComponent: () => import('./features/lore-galaxy/lore-galaxy.component')
          .then(m => m.LoreGalaxyComponent)
      },
      {
        path: 'lore/equipment',
        loadComponent: () => import('./features/lore-equipment/lore-equipment.component')
          .then(m => m.LoreEquipmentComponent)
      },
      {
        path: 'lore/timeline',
        loadComponent: () => import('./features/lore-timeline/lore-timeline.component')
          .then(m => m.LoreTimelineComponent)
      },
      {
        path: 'lore/ships',
        loadComponent: () => import('./features/lore-ships/lore-ships.component')
          .then(m => m.LoreShipsComponent)
      },
      {
        path: 'lore/ships/:id',
        loadComponent: () => import('./features/ship-detail/ship-detail.component')
          .then(m => m.ShipDetailComponent)
      },
      {
        path: 'lore/titans',
        loadComponent: () => import('./features/lore-titans/lore-titans.component')
          .then(m => m.LoreTitansComponent)
      },
      {
        path: 'lore/titans/:id',
        loadComponent: () => import('./features/titan-detail/titan-detail.component')
          .then(m => m.TitanDetailComponent)
      },
      {
        path: 'lore/saints',
        loadComponent: () => import('./features/lore-saints/lore-saints.component')
          .then(m => m.LoreSaintsComponent)
      },
      {
        path: 'lore/saints/:id',
        loadComponent: () => import('./features/saint-detail/saint-detail.component')
          .then(m => m.SaintDetailComponent)
      },
      {
        path: 'lore/timeline/:id',
        loadComponent: () => import('./features/timeline-event-detail/timeline-event-detail.component')
          .then(m => m.TimelineEventDetailComponent)
      },
      {
        path: 'lore/equipment/:id',
        loadComponent: () => import('./features/equipment-detail/equipment-detail.component')
          .then(m => m.EquipmentDetailComponent)
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
