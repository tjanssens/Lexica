import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, SetDto } from '../../core/services/api.service';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-session-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Sessie starten</h1>
      </header>

      <div class="content">
        @if (loadingSets) {
          <app-loading message="Sets laden..."></app-loading>
        } @else {
        <h2>Kies set(s)</h2>
        <div class="group-select">
          @for (set of sets; track set.id) {
            <label class="group-option" [class.selected]="selectedSetIds.has(set.id)">
              <input type="checkbox"
                [checked]="selectedSetIds.has(set.id)"
                (change)="toggleSet(set.id)" />
              <span class="group-lang"><i class="fa-solid" [class.fa-landmark]="set.language === 'Latin'" [class.fa-scroll]="set.language !== 'Latin'"></i></span>
              <div class="group-info">
                <strong>{{ set.name }}</strong>
                <span>{{ set.wordCount }} woorden</span>
              </div>
            </label>
          } @empty {
            <p class="empty">Geen sets gevonden. <a routerLink="/sets/new">Maak er een aan.</a></p>
          }
        </div>

        <h2>Modus</h2>
        <div class="mode-grid">
          <button type="button" class="mode-card" [class.selected]="mode === 'quick'" (click)="mode = 'quick'">
            <span class="mode-icon mode-icon-quick"><i class="fa-solid fa-bolt"></i></span>
            <strong>Snel</strong>
            <span class="mode-desc">Eén passage door alle woorden — fouten komen niet meer terug.</span>
          </button>
          <button type="button" class="mode-card" [class.selected]="mode === 'intensive'" (click)="mode = 'intensive'">
            <span class="mode-icon mode-icon-intensive"><i class="fa-solid fa-bullseye"></i></span>
            <strong>Intensief</strong>
            <span class="mode-desc">Woorden komen terug tot je ze allemaal kent.</span>
          </button>
        </div>

        <div class="settings">
          <div class="setting">
            <label>Richting</label>
            <select [(ngModel)]="direction">
              <option value="NlToTarget">NL &#8594; Doeltaal</option>
              <option value="TargetToNl">Doeltaal &#8594; NL</option>
            </select>
          </div>

          <div class="setting">
            <label>Sessiegrootte</label>
            <input type="range" min="5" max="50" step="5" [(ngModel)]="sessionSize" />
            <span class="range-value">{{ sessionSize }}</span>
          </div>
        </div>

        <button class="start-btn"
          [disabled]="selectedSetIds.size === 0 || loading"
          (click)="startSession()">
          {{ loading ? 'Laden...' : 'Start sessie' }}
        </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f5f5f5; }

    .page-header {
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
      color: white;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .back-btn { color: white; text-decoration: none; font-size: 1.5rem; }
    h1 { flex: 1; font-size: 1.25rem; margin: 0; }

    .content { padding: 1.5rem; max-width: 500px; margin: 0 auto; }

    h2 { font-size: 1rem; margin: 0 0 0.75rem; color: #333; }

    .group-select { margin-bottom: 1.5rem; }

    .group-option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: white;
      border: 2px solid #e0e0e0;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: border-color 0.2s;

      input { display: none; }
      &.selected { border-color: #0f3460; background: #f0f4ff; }
    }

    .group-lang { font-size: 1.3rem; }
    .group-info {
      display: flex; flex-direction: column;
      strong { font-size: 0.9rem; color: #1a1a2e; }
      span { font-size: 0.8rem; color: #888; }
    }

    .mode-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .mode-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      gap: 0.5rem; padding: 1rem 0.75rem;
      background: white; border: 2px solid #e0e0e0; border-radius: 12px;
      cursor: pointer; font-family: inherit; transition: border-color 0.2s, transform 0.15s;
      &:hover:not(.selected) { border-color: #c0c0c0; }
      &.selected { border-color: #0f3460; background: #f0f4ff; }
      strong { font-size: 0.95rem; color: #1a1a2e; }
    }

    .mode-icon {
      width: 44px; height: 44px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.25rem; color: white;
    }
    .mode-icon-quick { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .mode-icon-intensive { background: linear-gradient(135deg, #0f3460, #1a1a2e); }

    .mode-desc { font-size: 0.75rem; color: #666; line-height: 1.3; }

    .settings { margin-bottom: 1.5rem; }

    .setting {
      margin-bottom: 1rem;
      label { display: block; font-size: 0.85rem; font-weight: 600; color: #333; margin-bottom: 0.4rem; }
      select {
        width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0;
        border-radius: 8px; font-size: 1rem; background: white;
      }
    }

    input[type="range"] { width: calc(100% - 3rem); vertical-align: middle; }
    .range-value { font-weight: 600; color: #0f3460; margin-left: 0.5rem; }

    .start-btn {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #0f3460, #1a1a2e);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 700;
      cursor: pointer;
      transition: transform 0.2s;
      &:hover:not(:disabled) { transform: scale(1.02); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .empty { color: #888; text-align: center; padding: 1rem; a { color: #0f3460; text-decoration: none; font-weight: 600; } }
  `]
})
export class SessionStartComponent implements OnInit {
  sets: SetDto[] = [];
  selectedSetIds = new Set<string>();
  direction = 'TargetToNl';
  sessionSize = 20;
  mode: 'quick' | 'intensive' = 'intensive';
  loadingSets = true;
  loading = false;

  constructor(
    private api: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    const saved = localStorage.getItem('session_prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      this.direction = prefs.direction ?? this.direction;
      this.sessionSize = prefs.sessionSize ?? this.sessionSize;
      this.mode = prefs.mode ?? this.mode;
    }
    this.api.getSets().subscribe(s => {
      this.sets = s;
      this.loadingSets = false;
    });
  }

  toggleSet(id: string) {
    if (this.selectedSetIds.has(id)) this.selectedSetIds.delete(id);
    else this.selectedSetIds.add(id);
  }

  startSession() {
    this.loading = true;
    const setIds = Array.from(this.selectedSetIds);

    localStorage.setItem('session_prefs', JSON.stringify({
      direction: this.direction,
      sessionSize: this.sessionSize,
      mode: this.mode
    }));

    // Store session config and navigate to play
    sessionStorage.setItem('session_config', JSON.stringify({
      setIds,
      direction: this.direction,
      sessionSize: this.sessionSize,
      mode: this.mode
    }));

    this.router.navigate(['/session/play']);
  }
}
