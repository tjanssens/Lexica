import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, SetDto, WordDto } from '../../core/services/api.service';
import { WordItemComponent } from '../../shared/components/word-item.component';
import { LoadingComponent } from '../../shared/components/loading.component';

@Component({
  selector: 'app-set-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, WordItemComponent, LoadingComponent],
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
        @if (!isNew && !set) {
          <app-loading message="Set laden..."></app-loading>
        }
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
          @if (!set.isOwner) {
            <div class="owner-banner">
              @if (set.ownerPictureUrl) {
                <img [src]="api.resolveUrl(set.ownerPictureUrl)" class="owner-avatar" />
              }
              <span>Set van <strong>{{ set.ownerName || 'andere gebruiker' }}</strong></span>
              <button class="copy-btn" (click)="copySet()" [disabled]="copying">
                {{ copying ? 'Kopiëren…' : 'Maak eigen kopie' }}
              </button>
              <button class="unsubscribe-btn" (click)="unsubscribe()">Uitschrijven</button>
            </div>
            <p class="copy-hint">Met een eigen kopie kun je woorden bewerken, de set splitsen of samenvoegen.</p>
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

          @if (set.isOwner && filteredSetWords.length > 0) {
            <div class="selection-bar">
              <label class="select-all-label">
                <input type="checkbox"
                       [checked]="allSelected"
                       [indeterminate]="someSelected && !allSelected"
                       (change)="toggleSelectAll()" />
                <span>{{ allSelected ? 'Alles gedeselecteerd' : 'Selecteer alles' }} ({{ filteredSetWords.length }})</span>
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
            @for (word of filteredSetWords; track word.id) {
              <app-word-item
                [word]="word"
                [selectable]="set.isOwner"
                [selected]="selectedWordIds.has(word.id)"
                (selectionChange)="onWordSelectionChange(word.id, $event)">
              </app-word-item>
            } @empty {
              <p class="empty">Geen woorden in deze set.</p>
            }
          </div>

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
                    <button class="bulk-action-btn" (click)="pickBulkAction('split-move')">
                      <span class="bulk-icon move"><i class="fa-solid fa-scissors"></i></span>
                      <span class="bulk-text">
                        <strong>Verplaats naar nieuwe set</strong>
                        <small>Maak een nieuwe set met deze woorden, verwijder ze uit deze set</small>
                      </span>
                      <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                    </button>
                    <button class="bulk-action-btn" (click)="pickBulkAction('split-copy')">
                      <span class="bulk-icon copy"><i class="fa-solid fa-clone"></i></span>
                      <span class="bulk-text">
                        <strong>Kopieer naar nieuwe set</strong>
                        <small>Maak een nieuwe set met deze woorden, laat ze ook hier staan</small>
                      </span>
                      <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                    </button>
                    <button class="bulk-action-btn" (click)="pickBulkAction('move-existing')">
                      <span class="bulk-icon move"><i class="fa-solid fa-right-long"></i></span>
                      <span class="bulk-text">
                        <strong>Verplaats naar bestaande set</strong>
                        <small>Kies een andere eigen set en verplaats de woorden ernaartoe</small>
                      </span>
                      <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                    </button>
                    <button class="bulk-action-btn" (click)="pickBulkAction('copy-existing')">
                      <span class="bulk-icon copy"><i class="fa-solid fa-copy"></i></span>
                      <span class="bulk-text">
                        <strong>Kopieer naar bestaande set</strong>
                        <small>Kopieer de woorden naar een andere eigen set, behoud hier ook</small>
                      </span>
                      <i class="fa-solid fa-chevron-right bulk-chevron"></i>
                    </button>
                  </div>
                }

                @if (bulkStep === 'name') {
                  <div class="modal-body wizard-body">
                    <label class="wizard-label">Naam voor de nieuwe set</label>
                    <input type="text"
                           class="wizard-input"
                           [(ngModel)]="newSetName"
                           (keyup.enter)="submitNewSet()"
                           placeholder="bijv. Les 1 — werkwoorden"
                           autofocus />
                    <p class="wizard-hint">{{ selectedWordIds.size }} {{ selectedWordIds.size === 1 ? 'woord' : 'woorden' }} in dezelfde taal als deze set.</p>
                    @if (bulkError) { <div class="error">{{ bulkError }}</div> }
                    <div class="wizard-actions">
                      <button type="button" class="btn-secondary" (click)="backToChoose()" [disabled]="bulkBusy">Terug</button>
                      <button type="button" class="btn-primary" (click)="submitNewSet()" [disabled]="bulkBusy || !newSetName.trim()">
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
                      <p class="wizard-hint">Geen andere eigen sets in deze taal. Maak eerst een set aan.</p>
                      <div class="wizard-actions">
                        <button type="button" class="btn-secondary" (click)="closeBulkModal()">Sluiten</button>
                      </div>
                    } @else {
                      <p class="wizard-hint">Kies de doel-set ({{ candidateSets.length }} beschikbaar):</p>
                      <div class="set-picker">
                        @for (s of candidateSets; track s.id) {
                          <button type="button" class="set-picker-item" (click)="submitMoveToExisting(s)" [disabled]="bulkBusy">
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
              </div>
            </div>
          }
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

    .copy-btn { background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.8rem; }
    .copy-btn:disabled { opacity: 0.6; cursor: wait; }
    .copy-hint { font-size: 0.85em; color: #666; margin-top: 4px; }

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

    .selection-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: white; border-radius: 10px;
      padding: 0.6rem 0.9rem; margin-bottom: 0.6rem;
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

    .bulk-modal { max-width: 460px; }
    .bulk-modal-body { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .bulk-action-btn {
      display: flex; align-items: center; gap: 0.85rem;
      padding: 0.85rem 1rem;
      background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 10px;
      cursor: pointer; text-align: left; width: 100%;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
      &:hover { background: #eff6ff; border-color: #2563eb; transform: translateX(2px); }
    }
    .bulk-icon {
      display: inline-flex; align-items: center; justify-content: center;
      width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
      font-size: 1rem; color: white;
    }
    .bulk-icon.move { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    .bulk-icon.copy { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .bulk-text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .bulk-text strong { font-size: 0.9rem; color: #111827; font-weight: 600; }
    .bulk-text small { font-size: 0.75rem; color: #6b7280; line-height: 1.3; }
    .bulk-chevron { color: #9ca3af; font-size: 0.75rem; flex-shrink: 0; }

    .modal-back {
      background: none; border: none; font-size: 1rem; color: #6b7280;
      cursor: pointer; padding: 0.25rem 0.5rem; margin-right: 0.25rem;
      &:hover:not(:disabled) { color: #0f3460; }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
    .modal-header { gap: 0.25rem; }

    .wizard-body { padding: 1.25rem; }
    .wizard-label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 0.4rem; }
    .wizard-input {
      width: 100%; padding: 0.7rem 0.85rem;
      border: 1.5px solid #d1d5db; border-radius: 8px;
      font-size: 0.95rem; box-sizing: border-box;
      &:focus { outline: none; border-color: #2563eb; }
    }
    .wizard-hint { font-size: 0.8rem; color: #6b7280; margin: 0.5rem 0 0; }
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
  copying = false;
  selectedWordIds = new Set<string>();
  showBulkModal = false;
  bulkStep: 'choose' | 'name' | 'pickSet' = 'choose';
  bulkAction: 'split-move' | 'split-copy' | 'move-existing' | 'copy-existing' | null = null;
  newSetName = '';
  candidateSets: SetDto[] = [];
  bulkBusy = false;
  bulkError = '';

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

  copySet() {
    if (!this.set || this.copying) return;
    this.copying = true;
    this.api.copySet(this.set.id).subscribe({
      next: (newSet) => {
        this.copying = false;
        this.router.navigate(['/sets', newSet.id]);
      },
      error: (err) => {
        this.copying = false;
        alert(err.error?.message ?? err.message ?? 'Kopiëren mislukt');
      }
    });
  }

  unsubscribe() {
    if (!this.set) return;
    this.api.unsubscribeFromSet(this.set.id).subscribe({
      next: () => this.router.navigate(['/sets']),
      error: () => this.error = 'Fout bij uitschrijven.'
    });
  }

  onWordSelectionChange(id: string, selected: boolean) {
    if (selected) this.selectedWordIds.add(id);
    else this.selectedWordIds.delete(id);
  }

  get allSelected(): boolean {
    return this.filteredSetWords.length > 0 &&
           this.filteredSetWords.every(w => this.selectedWordIds.has(w.id));
  }

  get someSelected(): boolean {
    return this.filteredSetWords.some(w => this.selectedWordIds.has(w.id));
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.filteredSetWords.forEach(w => this.selectedWordIds.delete(w.id));
    } else {
      this.filteredSetWords.forEach(w => this.selectedWordIds.add(w.id));
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
  }

  pickBulkAction(action: 'split-move' | 'split-copy' | 'move-existing' | 'copy-existing') {
    this.bulkAction = action;
    this.bulkError = '';
    if (action === 'split-move' || action === 'split-copy') {
      this.newSetName = '';
      this.bulkStep = 'name';
    } else {
      if (!this.set) return;
      this.bulkBusy = true;
      this.api.getSets(this.set.language).subscribe({
        next: (allSets) => {
          this.candidateSets = allSets.filter(s => s.isOwner && s.id !== this.set!.id);
          this.bulkBusy = false;
          this.bulkStep = 'pickSet';
        },
        error: () => {
          this.bulkBusy = false;
          this.bulkError = 'Sets laden mislukt.';
        }
      });
    }
  }

  backToChoose() {
    this.bulkStep = 'choose';
    this.bulkAction = null;
    this.bulkError = '';
  }

  get bulkActionTitle(): string {
    switch (this.bulkAction) {
      case 'split-move': return 'Verplaats naar nieuwe set';
      case 'split-copy': return 'Kopieer naar nieuwe set';
      case 'move-existing': return 'Verplaats naar bestaande set';
      case 'copy-existing': return 'Kopieer naar bestaande set';
      default: return '';
    }
  }

  submitNewSet() {
    if (!this.set || !this.bulkAction) return;
    const name = this.newSetName.trim();
    if (!name) { this.bulkError = 'Geef een naam op.'; return; }
    const mode: 'move' | 'copy' = this.bulkAction === 'split-move' ? 'move' : 'copy';
    const ids = Array.from(this.selectedWordIds);
    this.bulkBusy = true;
    this.bulkError = '';
    this.api.splitSet(this.set.id, { name, wordIds: ids, mode }).subscribe({
      next: (newSet) => {
        this.selectedWordIds.clear();
        this.closeBulkModal();
        this.router.navigate(['/sets', newSet.id]);
      },
      error: (err) => {
        this.bulkBusy = false;
        this.bulkError = err.error?.message ?? err.error ?? 'Mislukt';
      }
    });
  }

  submitMoveToExisting(target: SetDto) {
    if (!this.set || !this.bulkAction) return;
    const mode: 'move' | 'copy' = this.bulkAction === 'move-existing' ? 'move' : 'copy';
    const ids = Array.from(this.selectedWordIds);
    this.bulkBusy = true;
    this.bulkError = '';
    this.api.moveWords({ fromSetId: this.set.id, toSetId: target.id, wordIds: ids, mode }).subscribe({
      next: () => {
        this.selectedWordIds.clear();
        this.closeBulkModal();
        this.loadSet(this.set!.id);
      },
      error: (err) => {
        this.bulkBusy = false;
        this.bulkError = err.error?.message ?? err.error ?? 'Mislukt';
      }
    });
  }
}
