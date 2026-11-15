import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CelebrationTheme, celebrationTheme } from './celebration-themes';

interface Firework {
  x: number;
  y: number;
  color: string;
  delay: number;
}

const RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2;
  return {
    x1: +(Math.cos(a) * 7).toFixed(1), y1: +(Math.sin(a) * 7).toFixed(1),
    x2: +(Math.cos(a) * 19).toFixed(1), y2: +(Math.sin(a) * 19).toFixed(1),
    dx: +(Math.cos(a + Math.PI / 12) * 25).toFixed(1), dy: +(Math.sin(a + Math.PI / 12) * 25).toFixed(1),
  };
});

/**
 * Eindanimatie van een sessie: een lijntekening die zichzelf tekent (per taal,
 * bv. de Eiffeltoren voor Frans), daarna drie vuurwerkpijlen en de titel.
 * Speelt één keer bij het tonen van het eindscherm.
 */
@Component({
  selector: 'app-session-finale',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="finale">
      <svg class="sky" viewBox="0 0 240 170" role="img" [attr.aria-label]="theme.finaleTitle">
        @switch (theme.finaleArt) {
          @case ('eiffel') {
            <g class="art" fill="none" stroke="#e2e8f0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path class="d d1" pathLength="1" d="M80 160 Q105 110 115 30" />
              <path class="d d1" pathLength="1" d="M160 160 Q135 110 125 30" />
              <path class="d d2" pathLength="1" d="M115 30 L125 30 M120 30 L120 10" />
              <path class="d d3" pathLength="1" d="M88 127 L152 127" />
              <path class="d d3" pathLength="1" d="M101 89 L139 89" />
              <path class="d d4" pathLength="1" d="M87 144 Q120 112 153 144" />
            </g>
          }
          @default {
            <g class="art" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <path class="d d-star" pathLength="1"
                d="M120 25 L134.7 64.8 L177.1 66.5 L143.8 92.7 L155.3 133.5 L120 110 L84.7 133.5 L96.2 92.7 L62.9 66.5 L105.3 64.8 Z" />
            </g>
          }
        }

        @for (f of fireworks; track $index) {
          <g [attr.transform]="'translate(' + f.x + ' ' + f.y + ')'">
            <g class="firework" [style.animation-delay.ms]="f.delay"
              [attr.stroke]="f.color" [attr.fill]="f.color" stroke-width="2.5" stroke-linecap="round">
              @for (r of rays; track $index) {
                <line [attr.x1]="r.x1" [attr.y1]="r.y1" [attr.x2]="r.x2" [attr.y2]="r.y2" />
                <circle [attr.cx]="r.dx" [attr.cy]="r.dy" r="1.6" stroke="none" />
              }
            </g>
          </g>
        }
      </svg>

      <div class="title">{{ theme.finaleTitle }}</div>
      @if (theme.flagColors) {
        <div class="flag" aria-hidden="true">
          @for (c of theme.flagColors; track $index) {
            <span [style.background]="c"></span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .finale {
      background: radial-gradient(ellipse at 50% 30%, #24345e 0%, #1a1a2e 70%);
      border-radius: 16px;
      padding: 0.75rem 1rem 1.1rem;
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: hidden;
    }

    .sky { width: 100%; max-width: 280px; height: auto; display: block; }

    .d {
      stroke-dasharray: 1;
      stroke-dashoffset: 0;
      animation: draw 0.9s ease-in-out both;
    }
    .d1 { animation-duration: 0.9s; animation-delay: 0s; }
    .d2 { animation-duration: 0.3s; animation-delay: 0.8s; }
    .d3 { animation-duration: 0.4s; animation-delay: 1.05s; }
    .d4 { animation-duration: 0.4s; animation-delay: 1.35s; }
    .d-star { animation-duration: 1.6s; animation-delay: 0.1s; }

    .firework {
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
      animation: firework 1s ease-out both;
    }

    .title {
      color: white;
      font-size: 1.6rem;
      font-weight: 800;
      margin-top: 0.25rem;
      animation: title-up 0.5s 2.6s ease-out both;
    }

    .flag {
      display: flex;
      width: 66px;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 0.45rem;
      animation: title-up 0.5s 2.75s ease-out both;
      span { flex: 1; }
    }

    @keyframes draw {
      from { stroke-dashoffset: 1; }
      to { stroke-dashoffset: 0; }
    }

    @keyframes firework {
      0% { transform: scale(0.15); opacity: 0; }
      15% { opacity: 1; }
      70% { opacity: 1; }
      100% { transform: scale(1.25); opacity: 0; }
    }

    @keyframes title-up {
      from { transform: translateY(16px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .d, .title, .flag { animation: none; }
      .firework { display: none; }
    }
  `]
})
export class SessionFinaleComponent implements OnInit, OnChanges {
  @Input() language: string | null = null;

  theme: CelebrationTheme = celebrationTheme(null);
  fireworks: Firework[] = [];
  readonly rays = RAYS;

  ngOnInit() {
    this.setup();
  }

  ngOnChanges() {
    this.setup();
  }

  private setup() {
    this.theme = celebrationTheme(this.language);
    const [c1, c2, c3] = this.theme.fireworkColors;
    // Drie pijlen na elkaar, rond de tekening (niet erdoorheen)
    this.fireworks = [
      { x: 46, y: 48, color: c1, delay: 1600 },
      { x: 194, y: 44, color: c2, delay: 2000 },
      { x: 200, y: 118, color: c3, delay: 2400 },
    ];
  }
}
