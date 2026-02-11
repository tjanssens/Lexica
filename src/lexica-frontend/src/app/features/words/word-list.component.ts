import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, WordDto } from '../../core/services/api.service';
import { WordItemComponent } from '../../shared/components/word-item.component';

@Component({
  selector: 'app-word-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WordItemComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Woordenlijst</h1>
        <div class="header-actions">
          <a routerLink="/import" class="header-icon" title="Importeren">
            <i class="fa-solid fa-file-import"></i>
          </a>
          <a routerLink="/words/new" class="header-icon" title="Woord toevoegen">
            <i class="fa-solid fa-plus"></i>
          </a>
        </div>
      </header>

      <div class="filters">
        <select [(ngModel)]="languageFilter" (change)="loadWords()">
          <option value="">Alle talen</option>
          <option value="Latin">Latijn</option>
          <option value="Greek">Grieks</option>
        </select>
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Zoeken..."
          (input)="filterWords()"
        />
      </div>

      <div class="sort-bar">
        <span class="sort-label">Sorteer:</span>
        <button class="sort-btn" [class.active]="sortBy === 'number'" (click)="toggleSort('number')">
          Nr <i class="fa-solid" [class.fa-sort-up]="sortBy === 'number' && sortDir === 'asc'" [class.fa-sort-down]="sortBy === 'number' && sortDir === 'desc'" [class.fa-sort]="sortBy !== 'number'"></i>
        </button>
        <button class="sort-btn" [class.active]="sortBy === 'stars'" (click)="toggleSort('stars')">
          <i class="fa-solid fa-star"></i> <i class="fa-solid" [class.fa-sort-up]="sortBy === 'stars' && sortDir === 'asc'" [class.fa-sort-down]="sortBy === 'stars' && sortDir === 'desc'" [class.fa-sort]="sortBy !== 'stars'"></i>
        </button>
      </div>

      <div class="word-list">
        @for (word of filteredWords; track word.id) {
          <app-word-item [word]="word"></app-word-item>
        } @empty {
          <div class="empty-state">
            <p>Nog geen woorden.</p>
            <a routerLink="/words/new">Voeg je eerste woord toe</a>
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

    .back-btn {
      color: white;
      text-decoration: none;
      font-size: 1.5rem;
      width: 2rem;
      text-align: center;
    }

    h1 { flex: 1; font-size: 1.25rem; margin: 0; }

    .header-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }

    .header-icon {
      color: white;
      text-decoration: none;
      font-size: 1.25rem;
      width: 2rem;
      text-align: center;
      opacity: 0.9;
      &:hover { opacity: 1; }
    }

    .filters {
      padding: 1rem;
      display: flex;
      gap: 0.5rem;
    }

    select, .filters input {
      padding: 0.6rem 0.75rem;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.9rem;
      background: white;
    }

    select { width: 140px; }
    .filters input { flex: 1; }

    .word-list { padding: 0 1rem 1rem; }

    .sort-bar {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0 1rem 0.5rem;
    }

    .sort-label { font-size: 0.8rem; color: #888; }

    .sort-btn {
      background: white; border: 1.5px solid #e0e0e0; border-radius: 6px;
      padding: 0.35rem 0.6rem; font-size: 0.8rem; color: #666;
      cursor: pointer; display: flex; align-items: center; gap: 0.3rem;
      &:hover { border-color: #0f3460; color: #0f3460; }
      &.active { border-color: #0f3460; color: #0f3460; background: #f0f4ff; font-weight: 600; }
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #888;

      a {
        display: inline-block;
        margin-top: 0.75rem;
        color: #0f3460;
        font-weight: 600;
        text-decoration: none;
      }
    }
  `]
})
export class WordListComponent implements OnInit {
  words: WordDto[] = [];
  filteredWords: WordDto[] = [];
  languageFilter = '';
  searchQuery = '';
  sortBy: 'number' | 'stars' = 'number';
  sortDir: 'asc' | 'desc' = 'asc';

  constructor(private api: ApiService) {}

  ngOnInit() {
    const saved = sessionStorage.getItem('wordlist_sort');
    if (saved) {
      const { sortBy, sortDir } = JSON.parse(saved);
      this.sortBy = sortBy;
      this.sortDir = sortDir;
    }
    this.loadWords();
  }

  loadWords() {
    this.api.getWords(this.languageFilter || undefined).subscribe(words => {
      this.words = words;
      this.filterWords();
    });
  }

  filterWords() {
    const q = this.searchQuery.toLowerCase();
    let result = this.words.filter(w =>
      !q || w.term.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q) || w.number.toString().includes(q)
    );

    const dir = this.sortDir === 'asc' ? 1 : -1;
    if (this.sortBy === 'stars') {
      result.sort((a, b) => (this.getStars(a) - this.getStars(b)) * dir);
    } else {
      result.sort((a, b) => (a.number - b.number) * dir);
    }

    this.filteredWords = result;
  }

  toggleSort(by: 'number' | 'stars') {
    if (this.sortBy === by) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = by;
      this.sortDir = by === 'stars' ? 'desc' : 'asc';
    }
    sessionStorage.setItem('wordlist_sort', JSON.stringify({ sortBy: this.sortBy, sortDir: this.sortDir }));
    this.filterWords();
  }

  getStars(word: WordDto): number {
    if (word.repetitions === 0) return 0;
    if (word.repetitions <= 1) return 1;
    if (word.repetitions <= 3) return 2;
    if (word.repetitions <= 5) return 3;
    if (word.repetitions > 5 && word.interval > 21 && word.easiness > 2.3) return 5;
    return 4;
  }
}
