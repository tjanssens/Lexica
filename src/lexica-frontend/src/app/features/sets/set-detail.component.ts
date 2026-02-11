import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, SetDto, WordDto } from '../../core/services/api.service';
import { WordItemComponent } from '../../shared/components/word-item.component';

@Component({
  selector: 'app-set-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WordItemComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/sets" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>{{ isNew ? 'Set aanmaken' : set?.name }}</h1>
        @if (!isNew && set && set.isOwner) {
          <button class="header-btn" (click)="showAddModal = true"><i class="fa-solid fa-plus"></i></button>
          <button class="header-btn delete" (click)="deleteSet()"><i class="fa-solid fa-trash"></i></button>
        }
      </header>

      <div class="content">
        @if (isNew) {
          <form (ngSubmit)="createSet()" class="form">
            <div class="form-group">
              <label>Naam</label>
              <input type="text" [(ngModel)]="newSet.name" name="name" required placeholder="bijv. Week 12" />
            </div>
            <div class="form-group">
              <label>Taal</label>
              <select [(ngModel)]="newSet.language" name="language">
                <option value="Latin">Latijn</option>
                <option value="Greek">Grieks</option>
              </select>
            </div>
            <div class="form-group">
              <label>Standaard richting</label>
              <select [(ngModel)]="newSet.defaultDirection" name="direction">
                <option value="NlToTarget">NL &#8594; Doeltaal</option>
                <option value="TargetToNl">Doeltaal &#8594; NL</option>
              </select>
            </div>
            <div class="form-group">
              <label>Nummerreeks (optioneel)</label>
              <div class="range-inputs">
                <input type="number" [(ngModel)]="newSet.fromNumber" name="from" placeholder="Van" />
                <span>t/m</span>
                <input type="number" [(ngModel)]="newSet.toNumber" name="to" placeholder="Tot" />
              </div>
            </div>
            @if (error) { <div class="error">{{ error }}</div> }
            <button type="submit">Aanmaken</button>
          </form>
        } @else if (set) {
          @if (!set.isOwner && set.ownerName) {
            <div class="owner-banner">
              @if (set.ownerPictureUrl) {
                <img [src]="api.resolveUrl(set.ownerPictureUrl)" class="owner-avatar" />
              }
              <span>Set van <strong>{{ set.ownerName }}</strong></span>
              <button class="unsubscribe-btn" (click)="unsubscribe()">Uitschrijven</button>
            </div>
          }

          @if (set.isOwner) {
            <div class="owner-settings">
              <label class="toggle-row">
                <span>Publiek delen</span>
                <input type="checkbox" [(ngModel)]="set.isPublic" (change)="updateSetSettings()" />
              </label>
              @if (set.isPublic) {
                <input type="text" [(ngModel)]="set.description" (blur)="updateSetSettings()" placeholder="Beschrijving (optioneel)" class="desc-input" />
                @if (set.subscriberCount > 0) {
                  <span class="subscriber-info">{{ set.subscriberCount }} abonnee{{ set.subscriberCount === 1 ? '' : 's' }}</span>
                }
              }
            </div>
          }

          <div class="stats-card">
            <div class="stats-header">
              <span class="stats-lang"><i class="fa-solid" [class.fa-landmark]="set.language === 'Latin'" [class.fa-scroll]="set.language !== 'Latin'"></i> {{ set.language === 'Latin' ? 'Latijn' : 'Grieks' }}</span>
              <span class="stats-total">{{ set.wordCount }} woorden</span>
            </div>

            @if (set.wordCount > 0) {
              <div class="progress-bar">
                <div class="progress-mastered" [style.width.%]="set.masteredWordCount / set.wordCount * 100"></div>
                <div class="progress-inprogress" [style.width.%]="set.inProgressWordCount / set.wordCount * 100"></div>
              </div>

              <div class="stats-grid">
                <button class="stat mastered" [class.active]="wordFilter === 'mastered'" (click)="toggleFilter('mastered')">
                  <span class="stat-value">{{ set.masteredWordCount }}</span>
                  <span class="stat-label">Gemeesterd</span>
                </button>
                <button class="stat inprogress" [class.active]="wordFilter === 'inprogress'" (click)="toggleFilter('inprogress')">
                  <span class="stat-value">{{ set.inProgressWordCount }}</span>
                  <span class="stat-label">Bezig</span>
                </button>
                <button class="stat notstarted" [class.active]="wordFilter === 'notstarted'" (click)="toggleFilter('notstarted')">
                  <span class="stat-value">{{ set.wordCount - set.masteredWordCount - set.inProgressWordCount }}</span>
                  <span class="stat-label">Nieuw</span>
                </button>
                <div class="stat percentage">
                  <span class="stat-value">{{ (set.masteredWordCount / set.wordCount * 100).toFixed(0) }}%</span>
                  <span class="stat-label">Klaar</span>
                </div>
              </div>
            }
          </div>

          @if (showAddModal) {
            <div class="modal-backdrop" (click)="showAddModal = false">
              <div class="modal" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>Woorden toevoegen</h3>
                  <button type="button" class="modal-close" (click)="showAddModal = false"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body">
                  <label>Nummerreeks</label>
                  <div class="range-inputs">
                    <input type="number" [(ngModel)]="addFrom" placeholder="Van" />
                    <span>t/m</span>
                    <input type="number" [(ngModel)]="addTo" placeholder="Tot" />
                  </div>
                  @if (addError) { <div class="error">{{ addError }}</div> }
                  <button class="btn-submit" (click)="addByRange()">Toevoegen</button>
                </div>
              </div>
            </div>
          }

          <div class="list-header">
            <h3>{{ wordFilter ? filterLabel : 'Woorden in set' }} <span class="filter-count">({{ filteredSetWords.length }})</span></h3>
            <div class="sort-bar">
              <button class="sort-btn" [class.active]="sortBy === 'number'" (click)="toggleSort('number')">
                Nr <i class="fa-solid" [class.fa-sort-up]="sortBy === 'number' && sortDir === 'asc'" [class.fa-sort-down]="sortBy === 'number' && sortDir === 'desc'" [class.fa-sort]="sortBy !== 'number'"></i>
              </button>
              <button class="sort-btn" [class.active]="sortBy === 'stars'" (click)="toggleSort('stars')">
                <i class="fa-solid fa-star"></i> <i class="fa-solid" [class.fa-sort-up]="sortBy === 'stars' && sortDir === 'asc'" [class.fa-sort-down]="sortBy === 'stars' && sortDir === 'desc'" [class.fa-sort]="sortBy !== 'stars'"></i>
              </button>
            </div>
          </div>
          <div class="word-list">
            @for (word of filteredSetWords; track word.id) {
              <app-word-item [word]="word"></app-word-item>
            } @empty {
              <p class="empty">Geen woorden in deze set.</p>
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
    .header-btn {
      background: none; border: none; color: white; font-size: 1.2rem;
      cursor: pointer; padding: 0.25rem; opacity: 0.85;
      &:hover { opacity: 1; }
    }

    .content { padding: 1.5rem; max-width: 600px; margin: 0 auto; }

    .owner-banner {
      display: flex; align-items: center; gap: 0.5rem;
      background: #f0f4ff; border-radius: 10px; padding: 0.75rem 1rem;
      margin-bottom: 1rem; font-size: 0.85rem; color: #555;
    }

    .owner-avatar { width: 24px; height: 24px; border-radius: 50%; }

    .unsubscribe-btn {
      margin-left: auto; padding: 0.4rem 0.75rem;
      border: 1.5px solid #e0e0e0; border-radius: 6px;
      background: white; color: #888; font-size: 0.8rem; cursor: pointer;
      &:hover { border-color: #dc2626; color: #dc2626; }
    }

    .owner-settings {
      background: white; border-radius: 10px; padding: 1rem;
      margin-bottom: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      display: flex; flex-direction: column; gap: 0.5rem;
    }

    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      font-size: 0.9rem; font-weight: 600; color: #333; cursor: pointer;
      input { width: auto; }
    }

    .desc-input {
      width: 100%; padding: 0.6rem; border: 1.5px solid #e0e0e0;
      border-radius: 8px; font-size: 0.85rem; box-sizing: border-box;
      &:focus { outline: none; border-color: #0f3460; }
    }

    .subscriber-info { font-size: 0.8rem; color: #888; }

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
      input { width: auto; flex: 1; min-width: 0; padding: 0.6rem; font-size: 0.9rem; }
      span { color: #666; font-size: 0.9rem; flex-shrink: 0; }
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

    .stats-card {
      background: white; border-radius: 14px; padding: 1.25rem;
      margin-bottom: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .stats-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1rem;
    }

    .stats-lang { font-size: 0.9rem; color: #555; display: flex; align-items: center; gap: 0.4rem; }
    .stats-total { font-size: 0.85rem; color: #888; font-weight: 600; }

    .progress-bar {
      display: flex; height: 10px; border-radius: 5px;
      background: #f44336; overflow: hidden; margin-bottom: 1rem;
    }

    .progress-mastered { background: #4caf50; transition: width 0.4s ease; }
    .progress-inprogress { background: #f59e0b; transition: width 0.4s ease; }

    .stats-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem;
    }

    .stat {
      text-align: center; padding: 0.5rem 0.25rem;
      border-radius: 8px; background: #f9f9f9;
      border: 2px solid transparent; cursor: pointer;
      transition: border-color 0.15s, transform 0.15s;
      &:hover { transform: scale(1.05); }
      &.active { border-color: currentColor; }
    }

    .stat.percentage { cursor: default; &:hover { transform: none; } }

    .filter-count { font-weight: 400; color: #888; font-size: 0.85rem; }

    .stat-value { display: block; font-size: 1.25rem; font-weight: 700; }
    .stat-label { font-size: 0.7rem; color: #888; }

    .stat.mastered .stat-value { color: #4caf50; }
    .stat.inprogress .stat-value { color: #f59e0b; }
    .stat.notstarted .stat-value { color: #f44336; }
    .stat.percentage .stat-value { color: #0f3460; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }

    .modal {
      background: white; border-radius: 14px; max-width: 400px; width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid #eee;
      h3 { margin: 0; font-size: 1rem; color: #1a1a2e; }
    }

    .modal-close {
      background: none; border: none; font-size: 1.25rem; color: #888;
      cursor: pointer; padding: 0.25rem;
      &:hover { color: #333; }
    }

    .modal-body {
      padding: 1.25rem;
      label { margin-bottom: 0.5rem; }
    }

    .btn-submit {
      width: 100%; margin-top: 1rem; padding: 0.75rem; background: #0f3460; color: white;
      border: none; border-radius: 8px; font-size: 0.9rem; font-weight: 600; cursor: pointer;
      &:hover { background: #1a1a2e; }
    }

    h3 { font-size: 1rem; color: #333; margin: 0; }

    .list-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .sort-bar { display: flex; gap: 0.4rem; }

    .sort-btn {
      background: white; border: 1.5px solid #e0e0e0; border-radius: 6px;
      padding: 0.3rem 0.5rem; font-size: 0.75rem; color: #666;
      cursor: pointer; display: flex; align-items: center; gap: 0.25rem;
      &:hover { border-color: #0f3460; color: #0f3460; }
      &.active { border-color: #0f3460; color: #0f3460; background: #f0f4ff; font-weight: 600; }
    }

    .word-list { }
    .empty { text-align: center; color: #888; padding: 2rem; }
    .error { background: #fee2e2; color: #dc2626; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; }
  `]
})
export class SetDetailComponent implements OnInit {
  set: SetDto | null = null;
  setWords: WordDto[] = [];
  filteredSetWords: WordDto[] = [];
  wordFilter: 'mastered' | 'inprogress' | 'notstarted' | null = null;
  sortBy: 'number' | 'stars' = 'number';
  sortDir: 'asc' | 'desc' = 'asc';
  isNew = false;
  newSet = { name: '', language: 'Latin', defaultDirection: 'NlToTarget', fromNumber: null as number | null, toNumber: null as number | null };
  addFrom: number | null = null;
  addTo: number | null = null;
  error = '';
  addError = '';
  showAddModal = false;

  constructor(
    public api: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') || this.route.snapshot.data['id'];
    if (id === 'new') {
      this.isNew = true;
    } else if (id) {
      this.loadSet(id);
    }
  }

  loadSet(id: string) {
    this.api.getSet(id).subscribe({
      next: (s) => {
        this.set = s;
        this.api.getSetWords(id).subscribe(words => {
          this.setWords = words;
          this.applyFilter();
        });
      },
      error: () => this.router.navigate(['/sets'])
    });
  }

  createSet() {
    this.error = '';
    this.api.createSet({
      name: this.newSet.name,
      language: this.newSet.language,
      defaultDirection: this.newSet.defaultDirection,
      fromNumber: this.newSet.fromNumber ?? undefined,
      toNumber: this.newSet.toNumber ?? undefined
    }).subscribe({
      next: (s) => this.router.navigate(['/sets', s.id]),
      error: (err) => this.error = err.error || 'Fout bij aanmaken.'
    });
  }

  addByRange() {
    if (!this.set || !this.addFrom || !this.addTo) return;
    this.addError = '';
    this.api.addWordsToSet(this.set.id, {
      fromNumber: this.addFrom,
      toNumber: this.addTo
    }).subscribe({
      next: () => {
        this.showAddModal = false;
        this.addFrom = null;
        this.addTo = null;
        this.loadSet(this.set!.id);
      },
      error: () => this.addError = 'Fout bij toevoegen.'
    });
  }

  toggleFilter(filter: 'mastered' | 'inprogress' | 'notstarted') {
    this.wordFilter = this.wordFilter === filter ? null : filter;
    this.applyFilter();
  }

  applyFilter() {
    let result = this.setWords;
    if (this.wordFilter) {
      result = result.filter(w => {
        const isMastered = w.repetitions > 5 && w.easiness > 2.3 && w.interval > 21;
        switch (this.wordFilter) {
          case 'mastered': return isMastered;
          case 'inprogress': return w.repetitions > 0 && !isMastered;
          case 'notstarted': return w.repetitions === 0;
          default: return true;
        }
      });
    }
    const dir = this.sortDir === 'asc' ? 1 : -1;
    if (this.sortBy === 'stars') {
      result = [...result].sort((a, b) => (this.getStars(a) - this.getStars(b)) * dir);
    } else {
      result = [...result].sort((a, b) => (a.number - b.number) * dir);
    }
    this.filteredSetWords = result;
  }

  toggleSort(by: 'number' | 'stars') {
    if (this.sortBy === by) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = by;
      this.sortDir = by === 'stars' ? 'desc' : 'asc';
    }
    this.applyFilter();
  }

  getStars(w: WordDto): number {
    if (w.repetitions === 0) return 0;
    if (w.repetitions <= 1) return 1;
    if (w.repetitions <= 3) return 2;
    if (w.repetitions <= 5) return 3;
    if (w.repetitions > 5 && w.interval > 21 && w.easiness > 2.3) return 5;
    return 4;
  }

  get filterLabel(): string {
    switch (this.wordFilter) {
      case 'mastered': return 'Gemeesterd';
      case 'inprogress': return 'Bezig';
      case 'notstarted': return 'Nieuw';
      default: return 'Woorden in set';
    }
  }

  deleteSet() {
    if (!this.set) return;
    if (confirm('Weet je zeker dat je deze set wilt verwijderen?')) {
      this.api.deleteSet(this.set.id).subscribe({
        next: () => this.router.navigate(['/sets']),
        error: () => this.error = 'Fout bij verwijderen.'
      });
    }
  }

  updateSetSettings() {
    if (!this.set) return;
    this.api.updateSet(this.set.id, {
      isPublic: this.set.isPublic,
      description: this.set.description
    }).subscribe();
  }

  unsubscribe() {
    if (!this.set) return;
    this.api.unsubscribeFromSet(this.set.id).subscribe({
      next: () => this.router.navigate(['/sets']),
      error: () => this.error = 'Fout bij uitschrijven.'
    });
  }
}
