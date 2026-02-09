import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, WordDto } from '../../core/services/api.service';

@Component({
  selector: 'app-word-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <a routerLink="/" class="back-btn"><i class="fa-solid fa-arrow-left"></i></a>
        <h1>Woordenlijst</h1>
        <a routerLink="/words/new" class="add-btn"><i class="fa-solid fa-plus"></i></a>
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

      <div class="word-list">
        @for (word of filteredWords; track word.id) {
          <a [routerLink]="['/words', word.id]" class="word-item">
            <div class="word-number">{{ word.number }}</div>
            <div class="word-content">
              <span class="word-term">{{ word.term }}</span>
              <span class="word-translation">{{ word.translation }}</span>
            </div>
            <span class="word-lang"><i class="fa-solid" [class.fa-landmark]="word.language === 'Latin'" [class.fa-scroll]="word.language !== 'Latin'"></i></span>
          </a>
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

    .back-btn, .add-btn {
      color: white;
      text-decoration: none;
      font-size: 1.5rem;
      width: 2rem;
      text-align: center;
    }

    h1 { flex: 1; font-size: 1.25rem; margin: 0; }

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

    .word-item {
      display: flex;
      align-items: center;
      background: white;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      margin-bottom: 0.5rem;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      transition: transform 0.15s;

      &:hover { transform: translateX(4px); }
    }

    .word-number {
      width: 3rem;
      font-weight: 700;
      color: #0f3460;
      font-size: 0.85rem;
    }

    .word-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .word-term { font-weight: 600; color: #1a1a2e; }
    .word-translation { font-size: 0.85rem; color: #666; }
    .word-lang { font-size: 1.2rem; }

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

  constructor(private api: ApiService) {}

  ngOnInit() {
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
    this.filteredWords = this.words.filter(w =>
      !q || w.term.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q) || w.number.toString().includes(q)
    );
  }
}
