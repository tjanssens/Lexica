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
      { path: 'groups', loadComponent: () => import('./features/groups/group-list.component').then(m => m.GroupListComponent) },
      { path: 'groups/new', loadComponent: () => import('./features/groups/group-detail.component').then(m => m.GroupDetailComponent), data: { id: 'new' } },
      { path: 'groups/:id', loadComponent: () => import('./features/groups/group-detail.component').then(m => m.GroupDetailComponent) },
      { path: 'import', loadComponent: () => import('./features/import/import.component').then(m => m.ImportComponent) },
      { path: 'session', loadComponent: () => import('./features/session/session-start.component').then(m => m.SessionStartComponent) },
      { path: 'session/play', loadComponent: () => import('./features/session/session-play.component').then(m => m.SessionPlayComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
