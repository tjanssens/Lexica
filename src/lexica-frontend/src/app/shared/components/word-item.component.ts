import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WordDto } from '../../core/services/api.service';

@Component({
  selector: 'app-word-item',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="word-item" [class.selected]="selected">
      @if (selectable) {
        <label class="word-checkbox-label" (click)="$event.stopPropagation()">
          <input type="checkbox"
                 class="word-checkbox"
                 [checked]="selected"
                 (change)="onCheckboxChange($event)" />
        </label>
      }
      <a [routerLink]="['/words', word.id]" class="word-link">
        <div class="word-number">{{ word.number }}</div>
        <div class="word-content">
          <span class="word-term">
            {{ word.term }}
            @if (word.originalAuthorDisplayName) {
              <span class="origin-badge" [title]="'Origineel van ' + word.originalAuthorDisplayName">
                <i class="fa-solid fa-link"></i>
              </span>
            }
          </span>
          <span class="word-translation">{{ word.translation }}</span>
        </div>
        <span class="word-stars">
          @for (s of [1,2,3,4,5]; track s) {
            <i class="fa-solid fa-star" [class.filled]="s <= stars"></i>
          }
        </span>
      </a>
    </div>
  `,
  styles: [`
    .word-item {
      display: flex;
      align-items: stretch;
      background: white;
      border-radius: 10px;
      margin-bottom: 0.5rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      transition: box-shadow 0.15s, transform 0.15s, background 0.15s;
      overflow: hidden;
    }
    .word-item.selected {
      background: #eff6ff;
      box-shadow: 0 0 0 2px #2563eb;
    }

    .word-checkbox-label {
      display: flex; align-items: center; justify-content: center;
      padding: 0 0.6rem 0 0.85rem;
      cursor: pointer;
      flex-shrink: 0;
    }
    .word-checkbox {
      width: 18px; height: 18px;
      cursor: pointer;
      accent-color: #2563eb;
      margin: 0;
    }

    .word-link {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      padding: 0.85rem 1rem;
      text-decoration: none;
      color: inherit;
      transition: transform 0.15s;
    }
    .word-link:hover { transform: translateX(4px); }

    .word-number {
      width: 3rem;
      font-weight: 700;
      color: #0f3460;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .word-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }

    .word-term { font-weight: 600; color: #1a1a2e; }
    .word-translation { font-size: 0.85rem; color: #666; }
    .origin-badge { color: #888; font-size: 0.8em; margin-left: 6px; }

    .word-stars {
      display: flex; gap: 0.1rem; font-size: 0.7rem;
      flex-shrink: 0;
      i { color: #e0e0e0; }
      i.filled { color: #f59e0b; }
    }
  `]
})
export class WordItemComponent {
  @Input({ required: true }) word!: WordDto;
  @Input() selectable = false;
  @Input() selected = false;
  @Output() selectionChange = new EventEmitter<boolean>();

  onCheckboxChange(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectionChange.emit(checked);
  }

  get stars(): number {
    const w = this.word;
    if (w.repetitions === 0) return 0;
    if (w.repetitions <= 1) return 1;
    if (w.repetitions <= 3) return 2;
    if (w.repetitions <= 5) return 3;
    if (w.repetitions > 5 && w.interval > 21 && w.easiness > 2.3) return 5;
    return 4;
  }
}
