import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container">
      <div class="walking-animation"></div>
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
      width: 120px;
      height: 180px;
      background-image: url('/assets/images/walking-sprite.png');
      background-size: 240px 720px; /* 2 columns x 4 rows = 8 frames */
      animation: walk 0.8s steps(8) infinite;
    }

    @keyframes walk {
      0% { background-position: 0 0; }
      12.5% { background-position: -120px 0; }
      25% { background-position: 0 -180px; }
      37.5% { background-position: -120px -180px; }
      50% { background-position: 0 -360px; }
      62.5% { background-position: -120px -360px; }
      75% { background-position: 0 -540px; }
      87.5% { background-position: -120px -540px; }
      100% { background-position: 0 0; }
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
