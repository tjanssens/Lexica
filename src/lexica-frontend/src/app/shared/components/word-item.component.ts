import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WordDto } from '../../core/services/api.service';

@Component({
  selector: 'app-word-item',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a [routerLink]="['/words', word.id]" class="word-item">
      <div class="word-number">{{ word.number }}</div>
      <div class="word-content">
        <span class="word-term">{{ word.term }}</span>
        <span class="word-translation">{{ word.translation }}</span>
      </div>
      <span class="word-stars">
        @for (s of [1,2,3,4,5]; track s) {
          <i class="fa-solid fa-star" [class.filled]="s <= stars"></i>
        }
      </span>
    </a>
  `,
  styles: [`
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

    .word-stars {
      display: flex; gap: 0.1rem; font-size: 0.7rem;
      i { color: #e0e0e0; }
      i.filled { color: #f59e0b; }
    }
  `]
})
export class WordItemComponent {
  @Input({ required: true }) word!: WordDto;

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
