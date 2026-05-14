import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ApiService, DayStatsDto, MonthlyStatsDto, SetDto, UserStatsDto, WeeklyStatsDto } from '../../core/services/api.service';
import { SetItemComponent } from '../../shared/components/set-item.component';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, SetItemComponent, LoadingComponent],
  template: `
    <div class="home-container">
      <header class="home-header">
        <div class="header-top">
          <h1>Lexica</h1>
          <div class="header-actions">
            <a routerLink="/profile" class="profile-btn">
              @if (auth.profilePicture()) {
                <img [src]="api.resolveUrl(auth.profilePicture())" class="profile-img" alt="Profiel" />
              } @else {
                <i class="fa-solid fa-user"></i>
              }
            </a>
            <button class="logout-btn" (click)="logout()">Uitloggen</button>
          </div>
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

      @if (loading) {
        <app-loading message="Dashboard laden..."></app-loading>
      } @else {
        <main class="home-content">
        @if (hasAnyError()) {
          <div class="error-banner" role="alert">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div class="error-text">
              <strong>Er ging iets mis bij het laden</strong>
              <span>Sommige onderdelen konden niet geladen worden.</span>
            </div>
            <button (click)="loadDashboard()">Opnieuw</button>
          </div>
        }

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
            <span class="stat-value">{{ stats?.inProgressWords ?? 0 }}</span>
            <span class="stat-label">Bezig</span>
          </div>
        </section>

        <section class="overview">
          <div class="overview-tabs" role="tablist">
            <button role="tab" [class.active]="view === 'week'" [attr.aria-selected]="view === 'week'" (click)="view = 'week'">Deze week</button>
            <button role="tab" [class.active]="view === 'month'" [attr.aria-selected]="view === 'month'" (click)="view = 'month'">Deze maand</button>
          </div>

          @if (view === 'week') {
            @if (errors.weekly) {
              <p style="margin:0;color:#8a1f1f;font-size:0.85rem">Weekoverzicht kon niet geladen worden.</p>
            } @else if (weeklyStats) {
              <div class="week-chart">
                @for (day of weeklyStats.days; track day.date) {
                  <div class="day-col">
                    <div class="bar-container">
                      @if (day.totalReviews > 0) {
                        <div class="stacked-bar" [style.height.%]="barHeight(day)">
                          <div class="seg-easy" [style.flex-grow]="day.easy"></div>
                          <div class="seg-known" [style.flex-grow]="day.known"></div>
                          <div class="seg-unknown" [style.flex-grow]="day.unknown"></div>
                        </div>
                      } @else {
                        <div class="bar-empty"></div>
                      }
                    </div>
                    <span class="day-label">{{ dayLabel(day) }}</span>
                    <span class="day-count">{{ day.totalReviews || '' }}</span>
                  </div>
                }
              </div>
              <div class="week-legend">
                <span class="legend-item"><span class="dot dot-easy"></span> Makkelijk</span>
                <span class="legend-item"><span class="dot dot-known"></span> Gekend</span>
                <span class="legend-item"><span class="dot dot-unknown"></span> Fout</span>
              </div>
            }
          } @else {
            @if (errors.monthly && !monthlyStats) {
              <p style="margin:0;color:#8a1f1f;font-size:0.85rem">Maandoverzicht kon niet geladen worden.</p>
            } @else if (monthlyStats) {
              <div class="month-header">
                <button class="month-nav" (click)="changeMonth(-1)" aria-label="Vorige maand">
                  <i class="fa-solid fa-chevron-left"></i>
                </button>
                <h2>{{ monthLabel(monthlyStats) }}</h2>
                <button class="month-nav" (click)="changeMonth(1)" [disabled]="isCurrentMonth()" aria-label="Volgende maand">
                  <i class="fa-solid fa-chevron-right"></i>
                </button>
              </div>
              <div class="month-grid">
                @for (label of weekdayLabels; track label) {
                  <div class="weekday-label">{{ label }}</div>
                }
                @for (i of leadingBlanks(monthlyStats); track i) {
                  <div class="month-cell blank"></div>
                }
                @for (day of monthlyStats.days; track day.date) {
                  <div class="month-cell"
                       [style.background]="dayColor(day)"
                       [title]="dayTooltip(day)">
                    <span class="cell-num">{{ dayOfMonth(day) }}</span>
                  </div>
                }
              </div>
              <div class="week-legend">
                <span class="legend-item"><span class="dot dot-easy"></span> Makkelijk</span>
                <span class="legend-item"><span class="dot dot-known"></span> Gekend</span>
                <span class="legend-item"><span class="dot dot-unknown"></span> Fout</span>
              </div>
            }
          }
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
            <a routerLink="/sets" class="action-card">
              <span class="action-icon"><i class="fa-solid fa-layer-group"></i></span>
              <span class="action-title">Sets</span>
              <span class="action-desc">Organiseer en deel sets</span>
            </a>
            <a routerLink="/sets" [queryParams]="{tab: 'discover'}" class="action-card">
              <span class="action-icon"><i class="fa-solid fa-compass"></i></span>
              <span class="action-title">Ontdek</span>
              <span class="action-desc">Browse publieke sets</span>
            </a>
          </div>
        </section>

        @if (sets.length > 0) {
          <section class="sets-overview">
            <div class="section-header">
              <h2>Jouw sets</h2>
              <a routerLink="/sets" class="see-all">Alles bekijken</a>
            </div>
            @for (set of sets; track set.id) {
              <app-set-item [set]="set"></app-set-item>
            }
          </section>
        }
      </main>
      }
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

    .header-actions { display: flex; gap: 0.5rem; align-items: center; }

    .profile-btn {
      background: rgba(255,255,255,0.15); color: white; border: none;
      width: 36px; height: 36px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; text-decoration: none;
      font-size: 0.9rem; overflow: hidden;
      &:hover { background: rgba(255,255,255,0.25); }
    }

    .profile-img { width: 100%; height: 100%; object-fit: cover; }

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

    .error-banner {
      display: flex; align-items: center; gap: 0.75rem; color: #8a1f1f;
      background: #fff4f4; border: 1px solid #f5c2c2;
      border-radius: 12px; padding: 0.85rem 1rem; margin-bottom: 1rem;
      .error-text { flex: 1; display: flex; flex-direction: column; font-size: 0.8rem; }
      button {
        background: #b91c1c; color: white; border: none; border-radius: 8px;
        padding: 0.4rem 0.85rem; font-size: 0.8rem; cursor: pointer;
      }
    }

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

    .overview {
      background: white; border-radius: 12px; padding: 1.25rem;
      margin-bottom: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .overview-tabs {
      display: flex; margin-bottom: 1rem;
      background: #f0f0f0; border-radius: 8px; padding: 3px;
      button {
        flex: 1; background: transparent; border: none; cursor: pointer;
        padding: 0.5rem; font-size: 0.85rem; color: #666; font-weight: 600;
        border-radius: 6px;
        &.active { background: white; color: #0f3460; }
      }
    }

    .week-chart {
      display: flex; gap: 0.5rem; align-items: flex-end; height: 120px;
      margin-bottom: 0.75rem;
    }

    .day-col {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
    }

    .bar-container {
      width: 100%; height: 90px; display: flex; align-items: flex-end; justify-content: center;
    }

    .stacked-bar {
      width: 70%; min-height: 4px; border-radius: 4px 4px 0 0;
      display: flex; flex-direction: column; overflow: hidden;
    }

    .seg-easy { background: #4caf50; min-height: 0; }
    .seg-known { background: #f59e0b; min-height: 0; }
    .seg-unknown { background: #f44336; min-height: 0; }

    .bar-empty {
      width: 70%; height: 4px; border-radius: 2px; background: #e8e8e8;
    }

    .day-label { font-size: 0.7rem; color: #888; }
    .day-count { font-size: 0.7rem; font-weight: 600; color: #0f3460; min-height: 0.9rem; }

    .week-legend {
      display: flex; justify-content: center; gap: 1rem;
    }

    .legend-item { font-size: 0.7rem; color: #888; display: flex; align-items: center; gap: 0.3rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-easy { background: #4caf50; }
    .dot-known { background: #f59e0b; }
    .dot-unknown { background: #f44336; }

    .month-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .month-header h2 {
      margin: 0; text-align: center; flex: 1; text-transform: capitalize;
    }

    .month-nav {
      background: transparent; border: none; color: #0f3460;
      width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
      font-size: 0.9rem; display: flex; align-items: center; justify-content: center;
      &:hover:not(:disabled) { background: #f0f0f0; }
      &:disabled { color: #ccc; cursor: not-allowed; }
    }

    .month-grid {
      display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;
      margin-bottom: 0.75rem;
    }

    .weekday-label {
      font-size: 0.7rem; color: #888; text-align: center; padding: 0.25rem 0;
    }

    .month-cell {
      aspect-ratio: 1; border-radius: 6px; background: #ececec;
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }

    .month-cell.blank { background: transparent; }

    .cell-num {
      font-size: 0.7rem; font-weight: 600;
      color: rgba(0,0,0,0.55);
      text-shadow: 0 1px 1px rgba(255,255,255,0.4);
    }

    .sets-overview { }

    .section-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 0.75rem;
    }

    .section-header h2 { margin: 0; }

    .see-all {
      font-size: 0.85rem; color: #0f3460; text-decoration: none; font-weight: 600;
      &:hover { text-decoration: underline; }
    }
  `]
})
export class HomeComponent implements OnInit {
  sets: SetDto[] = [];
  stats: UserStatsDto | null = null;
  weeklyStats: WeeklyStatsDto | null = null;
  monthlyStats: MonthlyStatsDto | null = null;
  pausedSession: { remaining: number; totalWords: number } | null = null;
  loading = true;
  view: 'week' | 'month' = 'week';

  errors = {
    sets: false,
    stats: false,
    weekly: false,
    monthly: false
  };

  weekdayLabels = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

  private maxReviews = 1;
  private dayNames = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
  private monthNames = [
    'januari', 'februari', 'maart', 'april', 'mei', 'juni',
    'juli', 'augustus', 'september', 'oktober', 'november', 'december'
  ];

  constructor(
    public auth: AuthService,
    public api: ApiService
  ) {}

  ngOnInit() {
    this.loadDashboard();

    const pausedStr = sessionStorage.getItem('session_paused');
    if (pausedStr) {
      try {
        const paused = JSON.parse(pausedStr);
        this.pausedSession = {
          remaining: paused.stack.length,
          totalWords: paused.totalWords
        };
      } catch {
        sessionStorage.removeItem('session_paused');
      }
    }
  }

  loadDashboard() {
    this.loading = true;
    this.errors = { sets: false, stats: false, weekly: false, monthly: false };

    forkJoin({
      sets: this.api.getSets().pipe(catchError(err => { this.errors.sets = true; console.error('getSets failed', err); return of<SetDto[]>([]); })),
      stats: this.api.getStats().pipe(catchError(err => { this.errors.stats = true; console.error('getStats failed', err); return of<UserStatsDto | null>(null); })),
      weeklyStats: this.api.getWeeklyStats().pipe(catchError(err => { this.errors.weekly = true; console.error('getWeeklyStats failed', err); return of<WeeklyStatsDto | null>(null); })),
      monthlyStats: this.api.getMonthlyStats().pipe(catchError(err => { this.errors.monthly = true; console.error('getMonthlyStats failed', err); return of<MonthlyStatsDto | null>(null); }))
    }).subscribe({
      next: result => {
        this.sets = result.sets;
        this.stats = result.stats;
        this.weeklyStats = result.weeklyStats;
        this.monthlyStats = result.monthlyStats;
        this.maxReviews = result.weeklyStats
          ? Math.max(1, ...result.weeklyStats.days.map(d => d.totalReviews))
          : 1;
        this.loading = false;
      },
      error: err => {
        console.error('Dashboard load failed', err);
        this.errors = { sets: true, stats: true, weekly: true, monthly: true };
        this.loading = false;
      }
    });
  }

  hasAnyError(): boolean {
    return this.errors.sets || this.errors.stats || this.errors.weekly || this.errors.monthly;
  }

  barHeight(day: DayStatsDto): number {
    return (day.totalReviews / this.maxReviews) * 100;
  }

  dayLabel(day: DayStatsDto): string {
    const d = new Date(day.date);
    return this.dayNames[d.getDay()];
  }

  monthLabel(m: MonthlyStatsDto): string {
    return `${this.monthNames[m.month - 1]} ${m.year}`;
  }

  dayOfMonth(day: DayStatsDto): number {
    return new Date(day.date).getDate();
  }

  leadingBlanks(m: MonthlyStatsDto): number[] {
    const first = new Date(m.year, m.month - 1, 1);
    // Monday-first: shift so Mon=0, Sun=6
    const offset = (first.getDay() + 6) % 7;
    return Array(offset).fill(0).map((_, i) => i);
  }

  dayColor(day: DayStatsDto): string {
    if (day.totalReviews === 0) return '#ececec';
    const total = day.easy + day.known + day.unknown;
    if (total === 0) return '#ececec';
    // RGB anchors: easy=green, known=orange, unknown=red
    const easy = [76, 175, 80];
    const known = [245, 158, 11];
    const unknown = [244, 67, 54];
    const r = (day.easy * easy[0] + day.known * known[0] + day.unknown * unknown[0]) / total;
    const g = (day.easy * easy[1] + day.known * known[1] + day.unknown * unknown[1]) / total;
    const b = (day.easy * easy[2] + day.known * known[2] + day.unknown * unknown[2]) / total;
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  }

  dayTooltip(day: DayStatsDto): string {
    if (day.totalReviews === 0) return 'Geen reviews';
    return `${day.totalReviews} reviews — ${day.easy} makkelijk, ${day.known} gekend, ${day.unknown} fout`;
  }

  isCurrentMonth(): boolean {
    if (!this.monthlyStats) return true;
    const now = new Date();
    return this.monthlyStats.year === now.getFullYear() && this.monthlyStats.month === now.getMonth() + 1;
  }

  changeMonth(delta: number) {
    if (!this.monthlyStats) return;
    let y = this.monthlyStats.year;
    let m = this.monthlyStats.month + delta;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    this.errors.monthly = false;
    this.api.getMonthlyStats(y, m).subscribe({
      next: res => this.monthlyStats = res,
      error: err => {
        console.error('getMonthlyStats failed', err);
        this.errors.monthly = true;
      }
    });
  }

  logout() {
    this.auth.logout();
  }
}
