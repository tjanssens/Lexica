import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, GroupDto, UserStatsDto } from '../../core/services/api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home-container">
      <header class="home-header">
        <div class="header-top">
          <h1>Lexica</h1>
          <button class="logout-btn" (click)="logout()">Uitloggen</button>
        </div>
        @if (stats) {
          <div class="header-stats">
            <div class="streak">
              <span class="streak-count">{{ stats.streak }}</span>
              <span class="streak-label">dagen streak</span>
            </div>
            <div class="level-info">
              <span class="level-title">{{ stats.levelTitle }}</span>
              <span class="level-num">Lvl {{ stats.level }}</span>
            </div>
          </div>
        }
      </header>

      <main class="home-content">
        @if (pausedSession) {
          <a routerLink="/session/play" class="resume-cta">
            <div class="cta-icon"><i class="fa-solid fa-play"></i></div>
            <div class="cta-text">
              <strong>Sessie hervatten</strong>
              <span>{{ pausedSession.remaining }} van {{ pausedSession.totalWords }} woorden resterend</span>
            </div>
            <span class="cta-arrow"><i class="fa-solid fa-arrow-right"></i></span>
          </a>
        }

        @if (stats && stats.dueToday > 0) {
          <a routerLink="/session" class="study-cta">
            <div class="cta-text">
              <strong>{{ stats.dueToday }} woorden te herhalen</strong>
              <span>Start een studiesessie</span>
            </div>
            <span class="cta-arrow"><i class="fa-solid fa-arrow-right"></i></span>
          </a>
        }

        <section class="quick-stats">
          <div class="stat-card">
            <span class="stat-value">{{ stats?.totalWords ?? 0 }}</span>
            <span class="stat-label">Woorden</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats?.masteredWords ?? 0 }}</span>
            <span class="stat-label">Gemeesterd</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats?.xp ?? 0 }}</span>
            <span class="stat-label">XP</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ groups.length }}</span>
            <span class="stat-label">Groepen</span>
          </div>
        </section>

        <section class="actions">
          <h2>Aan de slag</h2>
          <div class="action-grid">
            <a routerLink="/session" class="action-card">
              <span class="action-icon"><i class="fa-solid fa-graduation-cap"></i></span>
              <span class="action-title">Studeren</span>
              <span class="action-desc">Start een flashcard sessie</span>
            </a>
            <a routerLink="/words" class="action-card">
              <span class="action-icon"><i class="fa-solid fa-book"></i></span>
              <span class="action-title">Woordenlijst</span>
              <span class="action-desc">Bekijk en beheer woorden</span>
            </a>
            <a routerLink="/groups" class="action-card">
              <span class="action-icon"><i class="fa-solid fa-folder"></i></span>
              <span class="action-title">Groepen</span>
              <span class="action-desc">Organiseer vocabulaire</span>
            </a>
            <a routerLink="/import" class="action-card">
              <span class="action-icon"><i class="fa-solid fa-file-import"></i></span>
              <span class="action-title">Importeren</span>
              <span class="action-desc">Import vanuit Excel</span>
            </a>
          </div>
        </section>

        @if (groups.length > 0) {
          <section class="groups-overview">
            <h2>Jouw groepen</h2>
            @for (group of groups; track group.id) {
              <a [routerLink]="['/groups', group.id]" class="group-item">
                <div class="group-info">
                  <span class="group-lang"><i class="fa-solid" [class.fa-landmark]="group.language === 'Latin'" [class.fa-scroll]="group.language !== 'Latin'"></i></span>
                  <div>
                    <strong>{{ group.name }}</strong>
                    <span class="word-count">{{ group.wordCount }} woorden</span>
                  </div>
                </div>
                <span class="arrow"><i class="fa-solid fa-chevron-right"></i></span>
              </a>
            }
          </section>
        }
      </main>
    </div>
  `,
  styles: [`
    .home-container { min-height: 100vh; background: #f5f5f5; }

    .home-header {
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
      color: white;
      padding: 1.5rem;
    }

    .header-top { display: flex; justify-content: space-between; align-items: center; }
    h1 { margin: 0; font-size: 1.5rem; }

    .logout-btn {
      background: rgba(255,255,255,0.15); color: white; border: none;
      padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
      &:hover { background: rgba(255,255,255,0.25); }
    }

    .header-stats {
      display: flex; justify-content: space-between; margin-top: 1rem;
      padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.15);
    }

    .streak { display: flex; align-items: center; gap: 0.5rem; }
    .streak-count { font-size: 1.5rem; font-weight: 700; }
    .streak-label { font-size: 0.8rem; opacity: 0.7; }

    .level-info { text-align: right; }
    .level-title { display: block; font-weight: 600; }
    .level-num { font-size: 0.8rem; opacity: 0.7; }

    .home-content { padding: 1.5rem; max-width: 600px; margin: 0 auto; }

    .resume-cta {
      display: flex; align-items: center; gap: 1rem;
      background: linear-gradient(135deg, #0f3460, #1a1a2e);
      border-radius: 14px; padding: 1.25rem; margin-bottom: 0.75rem;
      text-decoration: none; color: white; transition: transform 0.2s;
      border: 2px solid #f59e0b;
      &:hover { transform: scale(1.02); }
    }

    .resume-cta .cta-icon {
      width: 40px; height: 40px; border-radius: 50%;
      background: #f59e0b; display: flex; align-items: center; justify-content: center;
      font-size: 1rem; flex-shrink: 0;
    }

    .resume-cta .cta-text {
      flex: 1; display: flex; flex-direction: column; gap: 0.15rem;
      strong { font-size: 1rem; } span { font-size: 0.85rem; opacity: 0.8; }
    }

    .resume-cta .cta-arrow { font-size: 1.25rem; opacity: 0.7; }

    .study-cta {
      display: flex; align-items: center; justify-content: space-between;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      border-radius: 14px; padding: 1.25rem; margin-bottom: 1.5rem;
      text-decoration: none; color: white; transition: transform 0.2s;
      &:hover { transform: scale(1.02); }
    }

    .cta-text { display: flex; flex-direction: column; gap: 0.15rem;
      strong { font-size: 1rem; } span { font-size: 0.85rem; opacity: 0.9; }
    }
    .cta-arrow { font-size: 1.5rem; }

    .quick-stats {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem;
    }

    .stat-card {
      background: white; border-radius: 12px; padding: 1rem;
      text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: #0f3460; }
    .stat-label { color: #666; font-size: 0.8rem; }

    h2 { font-size: 1rem; color: #333; margin: 0 0 0.75rem; }

    .action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }

    .action-card {
      background: white; border-radius: 12px; padding: 1.25rem;
      text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      transition: transform 0.2s; display: flex; flex-direction: column; gap: 0.25rem;
      &:hover { transform: translateY(-2px); }
    }

    .action-icon { font-size: 1.5rem; }
    .action-title { font-weight: 600; color: #1a1a2e; font-size: 0.9rem; }
    .action-desc { color: #888; font-size: 0.75rem; }

    .groups-overview { }

    .group-item {
      display: flex; align-items: center; justify-content: space-between;
      background: white; border-radius: 12px; padding: 1rem 1.25rem;
      margin-bottom: 0.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      text-decoration: none; color: inherit;
      &:hover { transform: translateX(2px); }
    }

    .group-info { display: flex; align-items: center; gap: 0.75rem; }
    .group-lang { font-size: 1.5rem; }
    .word-count { display: block; color: #888; font-size: 0.8rem; }
    .arrow { font-size: 1.5rem; color: #ccc; }
  `]
})
export class HomeComponent implements OnInit {
  groups: GroupDto[] = [];
  stats: UserStatsDto | null = null;
  pausedSession: { remaining: number; totalWords: number } | null = null;

  constructor(
    public auth: AuthService,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.api.getGroups().subscribe(groups => this.groups = groups);
    this.api.getStats().subscribe(stats => this.stats = stats);

    const pausedStr = sessionStorage.getItem('session_paused');
    if (pausedStr) {
      const paused = JSON.parse(pausedStr);
      this.pausedSession = {
        remaining: paused.stack.length,
        totalWords: paused.totalWords
      };
    }
  }

  logout() {
    this.auth.logout();
  }
}
