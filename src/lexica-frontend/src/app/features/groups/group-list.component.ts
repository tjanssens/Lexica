import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, GroupDto } from '../../core/services/api.service';
import { GroupItemComponent } from '../../shared/components/group-item.component';

@Component({
  selector: 'app-group-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GroupItemComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Groepen</h1>
        <a routerLink="/groups/new" class="add-btn"><i class="fa-solid fa-plus"></i></a>
      </header>

      <div class="filter">
        <select [(ngModel)]="languageFilter" (change)="loadGroups()">
          <option value="">Alle talen</option>
          <option value="Latin">Latijn</option>
          <option value="Greek">Grieks</option>
        </select>
      </div>

      <div class="group-list">
        @for (group of groups; track group.id) {
          <app-group-item [group]="group"></app-group-item>
        } @empty {
          <div class="empty-state">
            <p>Nog geen groepen.</p>
            <a routerLink="/groups/new">Maak je eerste groep aan</a>
          </div>
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

    .back-btn, .add-btn { color: white; text-decoration: none; font-size: 1.5rem; width: 2rem; text-align: center; }
    h1 { flex: 1; font-size: 1.25rem; margin: 0; }

    .filter { padding: 1rem; }
    .filter select {
      padding: 0.6rem 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.9rem;
      background: white;
    }

    .group-list { padding: 0 1rem 1rem; }


    .empty-state {
      text-align: center; padding: 3rem 1rem; color: #888;
      a { display: inline-block; margin-top: 0.75rem; color: #0f3460; font-weight: 600; text-decoration: none; }
    }
  `]
})
export class GroupListComponent implements OnInit {
  groups: GroupDto[] = [];
  languageFilter = '';

  constructor(private api: ApiService) {}

  ngOnInit() { this.loadGroups(); }

  loadGroups() {
    this.api.getGroups(this.languageFilter || undefined).subscribe(g => this.groups = g);
  }
}
