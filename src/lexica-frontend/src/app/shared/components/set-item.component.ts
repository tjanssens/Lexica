import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService, SetDto } from '../../core/services/api.service';

@Component({
  selector: 'app-set-item',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a [routerLink]="['/sets', set.id]" class="set-item">
      <span class="set-lang"><i class="fa-solid" [class.fa-landmark]="set.language === 'Latin'" [class.fa-scroll]="set.language !== 'Latin'"></i></span>
      <div class="set-info">
        <strong>{{ set.name }}</strong>
        @if (!set.isOwner && set.ownerName) {
          <span class="owner-name">
            @if (set.ownerPictureUrl) {
              <img [src]="api.resolveUrl(set.ownerPictureUrl)" class="owner-avatar" />
            }
            {{ set.ownerName }}
          </span>
        }
        <div class="progress-row">
          <div class="progress-bar">
            <div class="bar-mastered" [style.width.%]="masteredPct"></div>
            <div class="bar-inprogress" [style.width.%]="inProgressPct"></div>
            <div class="bar-new" [style.width.%]="newPct"></div>
          </div>
          <span class="word-total">{{ set.wordCount }}</span>
        </div>
      </div>
      @if (set.isPublic && set.subscriberCount > 0) {
        <span class="subscriber-badge">{{ set.subscriberCount }} <i class="fa-solid fa-users"></i></span>
      }
      <span class="arrow"><i class="fa-solid fa-chevron-right"></i></span>
    </a>
  `,
  styles: [`
    .set-item {
      display: flex;
      align-items: center;
      background: white;
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.5rem;
      text-decoration: none;
      color: inherit;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      gap: 0.75rem;
      transition: transform 0.15s;
      &:hover { transform: translateX(4px); }
    }

    .set-lang { font-size: 1.5rem; }

    .set-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      strong { color: #1a1a2e; }
    }

    .owner-name {
      display: flex; align-items: center; gap: 0.25rem;
      font-size: 0.75rem; color: #888;
    }

    .owner-avatar { width: 14px; height: 14px; border-radius: 50%; }

    .progress-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }

    .progress-bar {
      flex: 1; height: 6px; border-radius: 3px; background: #eee;
      display: flex; overflow: hidden;
    }

    .bar-mastered { background: #4caf50; }
    .bar-inprogress { background: #f59e0b; }
    .bar-new { background: #f44336; }

    .word-total { font-size: 0.75rem; color: #888; white-space: nowrap; }

    .subscriber-badge {
      font-size: 0.7rem; color: #888;
      display: flex; align-items: center; gap: 0.2rem;
      white-space: nowrap;
    }

    .arrow { font-size: 1.5rem; color: #ccc; }
  `]
})
export class SetItemComponent {
  @Input({ required: true }) set!: SetDto;

  constructor(public api: ApiService) {}

  get masteredPct(): number {
    return this.set.wordCount ? (this.set.masteredWordCount / this.set.wordCount) * 100 : 0;
  }

  get inProgressPct(): number {
    return this.set.wordCount ? (this.set.inProgressWordCount / this.set.wordCount) * 100 : 0;
  }

  get newPct(): number {
    const newCount = this.set.wordCount - this.set.masteredWordCount - this.set.inProgressWordCount;
    return this.set.wordCount ? (newCount / this.set.wordCount) * 100 : 0;
  }
}
