import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GroupDto } from '../../core/services/api.service';

@Component({
  selector: 'app-group-item',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a [routerLink]="['/groups', group.id]" class="group-item">
      <span class="group-lang"><i class="fa-solid" [class.fa-landmark]="group.language === 'Latin'" [class.fa-scroll]="group.language !== 'Latin'"></i></span>
      <div class="group-info">
        <strong>{{ group.name }}</strong>
        <div class="progress-row">
          <div class="progress-bar">
            <div class="bar-mastered" [style.width.%]="masteredPct"></div>
            <div class="bar-inprogress" [style.width.%]="inProgressPct"></div>
            <div class="bar-new" [style.width.%]="newPct"></div>
          </div>
          <span class="word-total">{{ group.wordCount }}</span>
        </div>
      </div>
      <span class="arrow"><i class="fa-solid fa-chevron-right"></i></span>
    </a>
  `,
  styles: [`
    .group-item {
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

    .group-lang { font-size: 1.5rem; }

    .group-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      strong { color: #1a1a2e; }
    }

    .progress-row { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }

    .progress-bar {
      flex: 1; height: 6px; border-radius: 3px; background: #eee;
      display: flex; overflow: hidden;
    }

    .bar-mastered { background: #4caf50; }
    .bar-inprogress { background: #f59e0b; }
    .bar-new { background: #f44336; }

    .word-total { font-size: 0.75rem; color: #888; white-space: nowrap; }
    .arrow { font-size: 1.5rem; color: #ccc; }
  `]
})
export class GroupItemComponent {
  @Input({ required: true }) group!: GroupDto;

  get masteredPct(): number {
    return this.group.wordCount ? (this.group.masteredWordCount / this.group.wordCount) * 100 : 0;
  }

  get inProgressPct(): number {
    return this.group.wordCount ? (this.group.inProgressWordCount / this.group.wordCount) * 100 : 0;
  }

  get newPct(): number {
    const newCount = this.group.wordCount - this.group.masteredWordCount - this.group.inProgressWordCount;
    return this.group.wordCount ? (newCount / this.group.wordCount) * 100 : 0;
  }
}
