import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, GroupDto, WordDto } from '../../core/services/api.service';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/groups" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>{{ isNew ? 'Groep aanmaken' : group?.name }}</h1>
        @if (!isNew && group) {
          <button class="delete-btn" (click)="deleteGroup()"><i class="fa-solid fa-trash"></i></button>
        }
      </header>

      <div class="content">
        @if (isNew) {
          <form (ngSubmit)="createGroup()" class="form">
            <div class="form-group">
              <label>Naam</label>
              <input type="text" [(ngModel)]="newGroup.name" name="name" required placeholder="bijv. Week 12" />
            </div>
            <div class="form-group">
              <label>Taal</label>
              <select [(ngModel)]="newGroup.language" name="language">
                <option value="Latin">Latijn</option>
                <option value="Greek">Grieks</option>
              </select>
            </div>
            <div class="form-group">
              <label>Standaard richting</label>
              <select [(ngModel)]="newGroup.defaultDirection" name="direction">
                <option value="NlToTarget">NL &#8594; Doeltaal</option>
                <option value="TargetToNl">Doeltaal &#8594; NL</option>
              </select>
            </div>
            <div class="form-group">
              <label>Nummerreeks (optioneel)</label>
              <div class="range-inputs">
                <input type="number" [(ngModel)]="newGroup.fromNumber" name="from" placeholder="Van" />
                <span>t/m</span>
                <input type="number" [(ngModel)]="newGroup.toNumber" name="to" placeholder="Tot" />
              </div>
            </div>
            @if (error) { <div class="error">{{ error }}</div> }
            <button type="submit">Aanmaken</button>
          </form>
        } @else if (group) {
          <div class="group-meta">
            <span><i class="fa-solid" [class.fa-landmark]="group.language === 'Latin'" [class.fa-scroll]="group.language !== 'Latin'"></i> {{ group.language === 'Latin' ? 'Latijn' : 'Grieks' }}</span>
            <span>{{ group.wordCount }} woorden</span>
          </div>

          <div class="add-words-section">
            <h3>Woorden toevoegen</h3>
            <div class="range-inputs">
              <input type="number" [(ngModel)]="addFrom" placeholder="Van nummer" />
              <span>t/m</span>
              <input type="number" [(ngModel)]="addTo" placeholder="Tot nummer" />
              <button class="btn-small" (click)="addByRange()">Toevoegen</button>
            </div>
          </div>

          <h3>Woorden in groep</h3>
          <div class="word-list">
            @for (word of groupWords; track word.id) {
              <div class="word-item">
                <span class="word-num">{{ word.number }}</span>
                <div class="word-content">
                  <span class="word-term">{{ word.term }}</span>
                  <span class="word-translation">{{ word.translation }}</span>
                </div>
              </div>
            } @empty {
              <p class="empty">Geen woorden in deze groep.</p>
            }
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

    .back-btn { color: white; text-decoration: none; font-size: 1.5rem; }
    h1 { flex: 1; font-size: 1.25rem; margin: 0; }
    .delete-btn { background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer; }

    .content { padding: 1.5rem; max-width: 600px; margin: 0 auto; }

    .form { }

    .form-group { margin-bottom: 1.25rem; }

    label { display: block; font-size: 0.85rem; font-weight: 600; color: #333; margin-bottom: 0.4rem; }

    input, select {
      width: 100%; padding: 0.75rem; border: 2px solid #e0e0e0;
      border-radius: 8px; font-size: 1rem; box-sizing: border-box; background: white;
      &:focus { outline: none; border-color: #0f3460; }
    }

    .range-inputs {
      display: flex; align-items: center; gap: 0.5rem;
      input { width: auto; flex: 1; }
      span { color: #666; font-size: 0.9rem; }
    }

    button[type="submit"] {
      width: 100%; padding: 0.85rem; background: #0f3460; color: white;
      border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer;
      &:hover { background: #1a1a2e; }
    }

    .btn-small {
      padding: 0.6rem 1rem; background: #0f3460; color: white;
      border: none; border-radius: 8px; font-size: 0.85rem; cursor: pointer;
      white-space: nowrap;
      &:hover { background: #1a1a2e; }
    }

    .group-meta {
      display: flex; gap: 1rem; margin-bottom: 1.5rem;
      font-size: 0.9rem; color: #555;
    }

    .add-words-section {
      background: white; border-radius: 12px; padding: 1rem 1.25rem;
      margin-bottom: 1.5rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      h3 { font-size: 0.9rem; margin: 0 0 0.75rem; }
    }

    h3 { font-size: 1rem; color: #333; margin: 0 0 0.75rem; }

    .word-list { }

    .word-item {
      display: flex; align-items: center; background: white;
      border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 0.4rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }

    .word-num { width: 3rem; font-weight: 700; color: #0f3460; font-size: 0.85rem; }
    .word-content { flex: 1; display: flex; flex-direction: column; }
    .word-term { font-weight: 600; color: #1a1a2e; }
    .word-translation { font-size: 0.85rem; color: #666; }
    .empty { text-align: center; color: #888; padding: 2rem; }
    .error { background: #fee2e2; color: #dc2626; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; }
  `]
})
export class GroupDetailComponent implements OnInit {
  group: GroupDto | null = null;
  groupWords: WordDto[] = [];
  isNew = false;
  newGroup = { name: '', language: 'Latin', defaultDirection: 'NlToTarget', fromNumber: null as number | null, toNumber: null as number | null };
  addFrom: number | null = null;
  addTo: number | null = null;
  error = '';

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || this.route.snapshot.data['id'];
    if (id === 'new') {
      this.isNew = true;
    } else if (id) {
      this.loadGroup(id);
    }
  }

  loadGroup(id: string) {
    this.api.getGroup(id).subscribe({
      next: (g) => {
        this.group = g;
        this.api.getGroupWords(id).subscribe(words => {
          this.groupWords = words;
        });
      },
      error: () => this.router.navigate(['/groups'])
    });
  }

  createGroup() {
    this.error = '';
    this.api.createGroup({
      name: this.newGroup.name,
      language: this.newGroup.language,
      defaultDirection: this.newGroup.defaultDirection,
      fromNumber: this.newGroup.fromNumber ?? undefined,
      toNumber: this.newGroup.toNumber ?? undefined
    }).subscribe({
      next: (g) => this.router.navigate(['/groups', g.id]),
      error: (err) => this.error = err.error || 'Fout bij aanmaken.'
    });
  }

  addByRange() {
    if (!this.group || !this.addFrom || !this.addTo) return;
    this.api.addWordsToGroup(this.group.id, {
      fromNumber: this.addFrom,
      toNumber: this.addTo
    }).subscribe({
      next: () => this.loadGroup(this.group!.id),
      error: () => this.error = 'Fout bij toevoegen.'
    });
  }

  deleteGroup() {
    if (!this.group) return;
    if (confirm('Weet je zeker dat je deze groep wilt verwijderen?')) {
      this.api.deleteGroup(this.group.id).subscribe({
        next: () => this.router.navigate(['/groups']),
        error: () => this.error = 'Fout bij verwijderen.'
      });
    }
  }
}
