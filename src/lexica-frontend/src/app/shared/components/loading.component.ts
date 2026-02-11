import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container">
      <img class="walking-animation" src="/assets/images/walking-god.gif" alt="Loading animation" />
      <p class="loading-text">{{ message }}</p>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      text-align: center;
    }

    .walking-animation {
      width: 50px;
      height: auto;
    }

    .loading-text {
      margin-top: 1.5rem;
      font-size: 0.95rem;
      color: #888;
      font-style: italic;
    }
  `]
})
export class LoadingComponent {
  @Input() message: string = 'Laden...';
}
