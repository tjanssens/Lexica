import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, SetDto, WordDto } from '../../core/services/api.service';
import { WordItemComponent } from '../../shared/components/word-item.component';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-word-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WordItemComponent, LoadingComponent],
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

      @if (loading) {
        <app-loading message="Woorden laden..."></app-loading>
      } @else {
        @if (filteredWords.length > 0) {
          <div class="selection-bar">
            <label class="select-all-label">
              <input type="checkbox"
                     [checked]="allSelected"
                     [indeterminate]="someSelected && !allSelected"
                     (change)="toggleSelectAll()" />
              <span>{{ allSelected ? 'Alles gedeselecteerd' : 'Selecteer alles' }} ({{ filteredWords.length }})</span>
            </label>
            <button class="bulk-btn" (click)="openBulkModal()" [disabled]="selectedWordIds.size === 0">
              <i class="fa-solid fa-bolt"></i>
              Bulk acties
              @if (selectedWordIds.size > 0) {
                <span class="bulk-count">{{ selectedWordIds.size }}</span>
              }
            </button>
          </div>
        }

        <div class="word-list">
          @for (word of filteredWords; track word.id) {
            <app-word-item
              [word]="word"
              [selectable]="true"
              [selected]="selectedWordIds.has(word.id)"
              (selectionChange)="onWordSelectionChange(word.id, $event)">
            </app-word-item>
          } @empty {
            <div class="empty-state">
              <p>Nog geen woorden.</p>
              <a routerLink="/words/new">Voeg je eerste woord toe</a>
            </div>
          }
        </div>
      }

      @if (showBulkModal) {
        <div class="modal-backdrop" (click)="closeBulkModal()">
          <div class="modal bulk-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              @if (bulkStep === 'choose') {
                <h3>Bulk acties — {{ selectedWordIds.size }} {{ selectedWordIds.size === 1 ? 'woord' : 'woorden' }}</h3>
              } @else {
                <button type="button" class="modal-back" (click)="backToChoose()" [disabled]="bulkBusy"><i class="fa-solid fa-arrow-left"></i></button>
                <h3>{{ bulkActionTitle }}</h3>
              }
              <button type="button" class="modal-close" (click)="closeBulkModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>

            @if (bulkStep === 'choose') {
              <div class="modal-body bulk-modal-body">
                <button class="bulk-action-btn" (click)="pickBulkAction('create-set')">
                  <span class="bulk-icon create"><i class="fa-solid fa-folder-plus"></i></span>
                  <span class="bulk-text">
                    <strong>Set maken</strong>
                    <small>Maak een nieuwe set met de geselecteerde woorden</small>
                  </span>
                  <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                </button>
                <button class="bulk-action-btn" (click)="pickBulkAction('add-to-set')">
                  <span class="bulk-icon add"><i class="fa-solid fa-right-long"></i></span>
                  <span class="bulk-text">
                    <strong>Toevoegen aan set</strong>
                    <small>Voeg de woorden toe aan een bestaande eigen set</small>
                  </span>
                  <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                </button>
                <button class="bulk-action-btn danger" (click)="pickBulkAction('delete')">
                  <span class="bulk-icon delete"><i class="fa-solid fa-trash"></i></span>
                  <span class="bulk-text">
                    <strong>Verwijderen</strong>
                    <small>Verwijder de geselecteerde woorden permanent</small>
                  </span>
                  <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                </button>
              </div>
            }

            @if (bulkStep === 'confirmDelete') {
              <div class="modal-body wizard-body">
                <p class="wizard-hint">
                  Weet je zeker dat je {{ selectedWordIds.size }} {{ selectedWordIds.size === 1 ? 'woord' : 'woorden' }} permanent wilt verwijderen?
                </p>
                @if (bulkError) { <div class="error">{{ bulkError }}</div> }
                <div class="wizard-actions">
                  <button type="button" class="btn-secondary" (click)="backToChoose()" [disabled]="bulkBusy">Terug</button>
                  <button type="button" class="btn-danger" (click)="submitDelete()" [disabled]="bulkBusy">
                    {{ bulkBusy ? 'Bezig…' : 'Verwijderen' }}
                  </button>
                </div>
              </div>
            }

            @if (bulkStep === 'name') {
              <div class="modal-body wizard-body">
                <label class="wizard-label">Naam voor de nieuwe set</label>
                <input type="text"
                       class="wizard-input"
                       [(ngModel)]="newSetName"
                       (keyup.enter)="submitCreateSet()"
                       placeholder="bijv. Les 1 — werkwoorden"
                       autofocus />
                <p class="wizard-hint">
                  {{ selectedWordIds.size }} {{ selectedWordIds.size === 1 ? 'woord' : 'woorden' }}
                  in <strong>{{ selectionLanguage === 'Latin' ? 'Latijn' : 'Grieks' }}</strong>.
                </p>
                @if (bulkError) { <div class="error">{{ bulkError }}</div> }
                <div class="wizard-actions">
                  <button type="button" class="btn-secondary" (click)="backToChoose()" [disabled]="bulkBusy">Terug</button>
                  <button type="button" class="btn-primary" (click)="submitCreateSet()" [disabled]="bulkBusy || !newSetName.trim()">
                    {{ bulkBusy ? 'Bezig…' : 'Aanmaken' }}
                  </button>
                </div>
              </div>
            }

            @if (bulkStep === 'pickSet') {
              <div class="modal-body wizard-body">
                @if (bulkBusy && candidateSets.length === 0) {
                  <p class="wizard-hint">Sets laden…</p>
                } @else if (candidateSets.length === 0) {
                  <p class="wizard-hint">Geen eigen sets in deze taal. Maak eerst een set aan.</p>
                  <div class="wizard-actions">
                    <button type="button" class="btn-secondary" (click)="closeBulkModal()">Sluiten</button>
                  </div>
                } @else {
                  <p class="wizard-hint">Kies de doel-set ({{ candidateSets.length }} beschikbaar):</p>
                  <div class="set-picker">
                    @for (s of candidateSets; track s.id) {
                      <button type="button" class="set-picker-item" (click)="submitAddToSet(s)" [disabled]="bulkBusy">
                        <span class="picker-lang"><i class="fa-solid" [class.fa-landmark]="s.language === 'Latin'" [class.fa-scroll]="s.language !== 'Latin'"></i></span>
                        <span class="picker-info">
                          <strong>{{ s.name }}</strong>
                          <small>{{ s.wordCount }} {{ s.wordCount === 1 ? 'woord' : 'woorden' }}</small>
                        </span>
                        <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                      </button>
                    }
                  </div>
                  @if (bulkError) { <div class="error">{{ bulkError }}</div> }
                }
              </div>
            }

            @if (bulkStep === 'langError') {
              <div class="modal-body wizard-body">
                <p class="wizard-hint">
                  De geselecteerde woorden zitten in verschillende talen. Selecteer alleen woorden van één taal voor deze actie (gebruik het taalfilter bovenaan).
                </p>
                <div class="wizard-actions">
                  <button type="button" class="btn-secondary" (click)="backToChoose()">Terug</button>
                </div>
              </div>
            }
          </div>
        </div>
      }
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

    .selection-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: white; border-radius: 10px;
      padding: 0.6rem 0.9rem; margin: 0 1rem 0.6rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      gap: 0.75rem;
    }
    .select-all-label {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.85rem; font-weight: 600; color: #374151;
      cursor: pointer; margin: 0;
      input { width: 18px; height: 18px; accent-color: #2563eb; cursor: pointer; margin: 0; }
    }
    .bulk-btn {
      display: inline-flex; align-items: center; gap: 0.4rem;
      padding: 0.5rem 0.9rem; background: #2563eb; color: white;
      border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: background 0.15s;
      &:hover:not(:disabled) { background: #1d4ed8; }
      &:disabled { background: #cbd5e1; cursor: not-allowed; }
    }
    .bulk-count {
      background: white; color: #2563eb; font-size: 0.75rem; font-weight: 700;
      padding: 1px 7px; border-radius: 999px; min-width: 18px; text-align: center;
    }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 1rem;
    }
    .modal {
      background: white; border-radius: 14px; max-width: 460px; width: 100%;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem; border-bottom: 1px solid #eee; gap: 0.25rem;
      h3 { margin: 0; font-size: 1rem; color: #1a1a2e; flex: 1; }
    }
    .modal-close, .modal-back {
      background: none; border: none; font-size: 1rem; color: #6b7280;
      cursor: pointer; padding: 0.25rem 0.5rem;
      &:hover:not(:disabled) { color: #0f3460; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
    .modal-close { font-size: 1.25rem; }

    .bulk-modal-body { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .bulk-action-btn {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.85rem 1rem;
      background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 10px;
      cursor: pointer; text-align: left; width: 100%;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
      &:hover { background: #eff6ff; border-color: #2563eb; transform: translateX(2px); }
      &.danger:hover { background: #fef2f2; border-color: #dc2626; }
    }
    .bulk-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
      font-size: 1rem; color: white;
    }
    .bulk-icon.create { background: linear-gradient(135deg, #10b981, #059669); }
    .bulk-icon.add { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .bulk-icon.delete { background: linear-gradient(135deg, #ef4444, #dc2626); }
    .bulk-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .bulk-text strong { font-size: 0.9rem; color: #111827; font-weight: 600; }
    .bulk-text small { font-size: 0.75rem; color: #6b7280; line-height: 1.3; }
    .bulk-chevron { color: #9ca3af; font-size: 0.75rem; flex-shrink: 0; }

    .wizard-body { padding: 1.25rem; }
    .wizard-label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; }
    .wizard-input {
      width: 100%; padding: 0.7rem 0.85rem;
      border: 1.5px solid #d1d5db; border-radius: 8px;
      font-size: 0.95rem; box-sizing: border-box;
      &:focus { outline: none; border-color: #2563eb; }
    }
    .wizard-hint { font-size: 0.85rem; color: #4b5563; margin: 0.5rem 0 0; line-height: 1.4; }
    .wizard-actions {
      display: flex; gap: 0.5rem; justify-content: flex-end;
      margin-top: 1rem;
    }
    .btn-primary {
      padding: 0.6rem 1.1rem; background: #2563eb; color: white;
      border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
      &:hover:not(:disabled) { background: #1d4ed8; }
      &:disabled { background: #cbd5e1; cursor: not-allowed; }
    }
    .btn-secondary {
      padding: 0.6rem 1.1rem; background: white; color: #374151;
      border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
      &:hover:not(:disabled) { border-color: #0f3460; color: #0f3460; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn-danger {
      padding: 0.6rem 1.1rem; background: #dc2626; color: white;
      border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
      &:hover:not(:disabled) { background: #b91c1c; }
      &:disabled { background: #fca5a5; cursor: not-allowed; }
    }

    .set-picker { display: flex; flex-direction: column; gap: 0.4rem; max-height: 360px; overflow-y: auto; margin-top: 0.5rem; }
    .set-picker-item {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.7rem 0.85rem;
      background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 10px;
      cursor: pointer; text-align: left; width: 100%;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
      &:hover:not(:disabled) { background: #eff6ff; border-color: #2563eb; transform: translateX(2px); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .picker-lang { font-size: 1.2rem; color: #0f3460; flex-shrink: 0; }
    .picker-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .picker-info strong { font-size: 0.9rem; color: #111827; font-weight: 600; }
    .picker-info small { font-size: 0.75rem; color: #6b7280; }

    .error { background: #fee2e2; color: #dc2626; padding: 0.75rem; border-radius: 8px; margin: 0.75rem 0 0; font-size: 0.85rem; }
  `]
})
export class WordListComponent implements OnInit {
  words: WordDto[] = [];
  filteredWords: WordDto[] = [];
  languageFilter = '';
  searchQuery = '';
  sortBy: 'number' | 'stars' = 'number';
  sortDir: 'asc' | 'desc' = 'asc';
  loading = true;

  selectedWordIds = new Set<string>();
  showBulkModal = false;
  bulkStep: 'choose' | 'confirmDelete' | 'name' | 'pickSet' | 'langError' = 'choose';
  bulkAction: 'delete' | 'create-set' | 'add-to-set' | null = null;
  newSetName = '';
  candidateSets: SetDto[] = [];
  bulkBusy = false;
  bulkError = '';
  selectionLanguage: string | null = null;

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
    this.loading = true;
    this.api.getWords(this.languageFilter || undefined).subscribe(words => {
      this.words = words;
      this.selectedWordIds.clear();
      this.filterWords();
      this.loading = false;
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

  onWordSelectionChange(id: string, selected: boolean) {
    if (selected) this.selectedWordIds.add(id);
    else this.selectedWordIds.delete(id);
  }

  get allSelected(): boolean {
    return this.filteredWords.length > 0 &&
           this.filteredWords.every(w => this.selectedWordIds.has(w.id));
  }

  get someSelected(): boolean {
    return this.filteredWords.some(w => this.selectedWordIds.has(w.id));
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.filteredWords.forEach(w => this.selectedWordIds.delete(w.id));
    } else {
      this.filteredWords.forEach(w => this.selectedWordIds.add(w.id));
    }
  }

  openBulkModal() {
    this.showBulkModal = true;
    this.resetBulkWizard();
  }

  closeBulkModal() {
    this.showBulkModal = false;
    this.resetBulkWizard();
  }

  private resetBulkWizard() {
    this.bulkStep = 'choose';
    this.bulkAction = null;
    this.newSetName = '';
    this.candidateSets = [];
    this.bulkBusy = false;
    this.bulkError = '';
    this.selectionLanguage = null;
  }

  backToChoose() {
    this.bulkStep = 'choose';
    this.bulkAction = null;
    this.bulkError = '';
  }

  get bulkActionTitle(): string {
    switch (this.bulkAction) {
      case 'delete': return 'Verwijderen';
      case 'create-set': return 'Nieuwe set maken';
      case 'add-to-set': return 'Toevoegen aan set';
      default: return '';
    }
  }

  private selectedWords(): WordDto[] {
    return this.words.filter(w => this.selectedWordIds.has(w.id));
  }

  private singleLanguageOrNull(): string | null {
    const langs = new Set(this.selectedWords().map(w => w.language));
    if (langs.size !== 1) return null;
    return langs.values().next().value ?? null;
  }

  pickBulkAction(action: 'delete' | 'create-set' | 'add-to-set') {
    this.bulkAction = action;
    this.bulkError = '';

    if (action === 'delete') {
      this.bulkStep = 'confirmDelete';
      return;
    }

    const lang = this.singleLanguageOrNull();
    if (!lang) {
      this.bulkStep = 'langError';
      return;
    }
    this.selectionLanguage = lang;

    if (action === 'create-set') {
      this.newSetName = '';
      this.bulkStep = 'name';
      return;
    }

    this.bulkBusy = true;
    this.api.getSets(lang).subscribe({
      next: (allSets) => {
        this.candidateSets = allSets.filter(s => s.isOwner);
        this.bulkBusy = false;
        this.bulkStep = 'pickSet';
      },
      error: () => {
        this.bulkBusy = false;
        this.bulkError = 'Sets laden mislukt.';
      }
    });
  }

  submitDelete() {
    const ids = Array.from(this.selectedWordIds);
    if (ids.length === 0) return;
    this.bulkBusy = true;
    this.bulkError = '';
    forkJoin(ids.map(id => this.api.deleteWord(id))).subscribe({
      next: () => {
        this.selectedWordIds.clear();
        this.closeBulkModal();
        this.loadWords();
      },
      error: () => {
        this.bulkBusy = false;
        this.bulkError = 'Verwijderen mislukt voor één of meer woorden.';
      }
    });
  }

  submitCreateSet() {
    const name = this.newSetName.trim();
    if (!name || !this.selectionLanguage) { this.bulkError = 'Geef een naam op.'; return; }
    const ids = Array.from(this.selectedWordIds);
    this.bulkBusy = true;
    this.bulkError = '';
    this.api.createSet({
      name,
      language: this.selectionLanguage,
      defaultDirection: 'NlToTarget'
    }).subscribe({
      next: (newSet) => {
        this.api.addWordsToSet(newSet.id, { wordIds: ids }).subscribe({
          next: () => {
            this.selectedWordIds.clear();
            this.closeBulkModal();
          },
          error: () => {
            this.bulkBusy = false;
            this.bulkError = 'Set gemaakt, maar woorden toevoegen mislukt.';
          }
        });
      },
      error: (err) => {
        this.bulkBusy = false;
        this.bulkError = err.error?.message ?? err.error ?? 'Set aanmaken mislukt.';
      }
    });
  }

  submitAddToSet(target: SetDto) {
    const ids = Array.from(this.selectedWordIds);
    if (ids.length === 0) return;
    this.bulkBusy = true;
    this.bulkError = '';
    this.api.addWordsToSet(target.id, { wordIds: ids }).subscribe({
      next: () => {
        this.selectedWordIds.clear();
        this.closeBulkModal();
      },
      error: (err) => {
        this.bulkBusy = false;
        this.bulkError = err.error?.message ?? err.error ?? 'Toevoegen mislukt.';
      }
    });
  }
}
