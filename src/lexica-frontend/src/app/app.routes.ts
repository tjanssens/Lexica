import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent) },
      { path: 'words', loadComponent: () => import('./features/words/word-list.component').then(m => m.WordListComponent) },
      { path: 'words/new', loadComponent: () => import('./features/words/word-detail.component').then(m => m.WordDetailComponent), data: { id: 'new' } },
      { path: 'words/:id', loadComponent: () => import('./features/words/word-detail.component').then(m => m.WordDetailComponent) },
{ path: 'import', loadComponent: () => import('./features/import/import.component').then(m => m.ImportComponent) },
      { path: 'session', loadComponent: () => import('./features/session/session-start.component').then(m => m.SessionStartComponent) },
      { path: 'session/play', loadComponent: () => import('./features/session/session-play.component').then(m => m.SessionPlayComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'sets', loadComponent: () => import('./features/sets/set-list.component').then(m => m.SetListComponent) },
      { path: 'sets/new', loadComponent: () => import('./features/sets/set-detail.component').then(m => m.SetDetailComponent), data: { id: 'new' } },
      { path: 'sets/:id', loadComponent: () => import('./features/sets/set-detail.component').then(m => m.SetDetailComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
