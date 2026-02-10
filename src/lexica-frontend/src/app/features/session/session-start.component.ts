import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, GroupDto } from '../../core/services/api.service';

@Component({
  selector: 'app-session-start',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Sessie starten</h1>
      </header>

      <div class="content">
        <h2>Kies groep(en)</h2>
        <div class="group-select">
          @for (group of groups; track group.id) {
            <label class="group-option" [class.selected]="selectedGroupIds.has(group.id)">
              <input type="checkbox"
                [checked]="selectedGroupIds.has(group.id)"
                (change)="toggleGroup(group.id)" />
              <span class="group-lang"><i class="fa-solid" [class.fa-landmark]="group.language === 'Latin'" [class.fa-scroll]="group.language !== 'Latin'"></i></span>
              <div class="group-info">
                <strong>{{ group.name }}</strong>
                <span>{{ group.wordCount }} woorden</span>
              </div>
            </label>
          } @empty {
            <p class="empty">Geen groepen gevonden. <a routerLink="/groups/new">Maak er een aan.</a></p>
          }
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
          [disabled]="selectedGroupIds.size === 0 || loading"
          (click)="startSession()">
          {{ loading ? 'Laden...' : 'Start sessie' }}
        </button>
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
  groups: GroupDto[] = [];
  selectedGroupIds = new Set<string>();
  direction = 'TargetToNl';
  sessionSize = 20;
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
    }
    this.api.getGroups().subscribe(g => this.groups = g);
  }

  toggleGroup(id: string) {
    if (this.selectedGroupIds.has(id)) this.selectedGroupIds.delete(id);
    else this.selectedGroupIds.add(id);
  }

  startSession() {
    this.loading = true;
    const groupIds = Array.from(this.selectedGroupIds);

    localStorage.setItem('session_prefs', JSON.stringify({
      direction: this.direction,
      sessionSize: this.sessionSize
    }));

    // Store session config and navigate to play
    sessionStorage.setItem('session_config', JSON.stringify({
      groupIds,
      direction: this.direction,
      sessionSize: this.sessionSize
    }));

    this.router.navigate(['/session/play']);
  }
}
