import { Component, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { celebrationTheme } from './celebration-themes';

interface ConfettiPiece {
  dx: number;
  dy: number;
  rot: number;
  color: string;
  shape: 'rect' | 'dot';
  delay: number;
}

interface Burst {
  id: number;
  word: string;
  pieces: ConfettiPiece[];
}

/** Duur van één burst in ms; daarna wordt hij uit de DOM gehaald. */
const BURST_MS = 1100;

/**
 * Korte feedback bij een juist antwoord: een groen vinkje dat inpopt, confetti
 * in 8 richtingen en een woordje eronder. Speelt één keer per `play()` en
 * vangt geen klikken op (pointer-events: none), zodat het oefenen niet vertraagt.
 */
@Component({
  selector: 'app-correct-burst',
  standalone: true,
  imports: [CommonModule],
  template: `
    @for (b of bursts; track b.id) {
      <div class="burst" aria-hidden="true">
        <div class="confetti-origin">
          @for (p of b.pieces; track $index) {
            <span class="piece" [class.dot]="p.shape === 'dot'"
              [style.background]="p.color"
              [style.--dx]="p.dx + 'px'" [style.--dy]="p.dy + 'px'"
              [style.--rot]="p.rot + 'deg'" [style.animation-delay.ms]="p.delay"></span>
          }
        </div>
        <svg class="check" viewBox="0 0 80 80" width="64" height="64">
          <circle cx="40" cy="40" r="36" fill="#22c55e" />
          <path class="tick" d="M24 41 L35 52 L57 29" pathLength="1"
            fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <div class="word">{{ b.word }}</div>
      </div>
    }
    <span class="sr-only" aria-live="polite">{{ liveText }}</span>
  `,
  styles: [`
    /* De ouder plaatst de host (een lijn van 0 hoog); de burst staat er net boven. */
    :host {
      position: absolute;
      left: 0;
      right: 0;
      height: 0;
      pointer-events: none;
      z-index: 5;
    }

    .burst {
      position: absolute;
      bottom: 26px;
      left: 50%;
      width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      animation: burst-out 1.1s ease-out both;
    }

    .confetti-origin {
      position: absolute;
      top: 32px;
      left: 50%;
      width: 0;
      height: 0;
    }

    .piece {
      position: absolute;
      left: -5px;
      top: -3px;
      width: 10px;
      height: 6px;
      border-radius: 1px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
      opacity: 0;
      animation: confetti 0.9s cubic-bezier(0.15, 0.7, 0.4, 1) both;
    }
    .piece.dot { width: 7px; height: 7px; left: -3.5px; top: -3.5px; border-radius: 50%; }

    .check {
      position: relative;
      filter: drop-shadow(0 6px 14px rgba(34, 197, 94, 0.45));
      animation: pop 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
    }

    .tick {
      stroke-dasharray: 1;
      stroke-dashoffset: 0;
      animation: draw 0.3s 0.15s ease-out both;
    }

    .word {
      position: relative;
      color: white;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: 0.01em;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
      white-space: nowrap;
      animation: word-up 0.4s 0.12s ease-out both;
    }

    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }

    @keyframes pop {
      0% { transform: scale(0); }
      60% { transform: scale(1.25); }
      100% { transform: scale(1); }
    }

    @keyframes draw {
      from { stroke-dashoffset: 1; }
      to { stroke-dashoffset: 0; }
    }

    @keyframes word-up {
      from { transform: translateY(14px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @keyframes confetti {
      0% { transform: translate(0, 0) rotate(0deg) scale(0.6); opacity: 1; }
      70% { opacity: 1; }
      100% { transform: translate(var(--dx), calc(var(--dy) + 22px)) rotate(var(--rot)) scale(1); opacity: 0; }
    }

    @keyframes burst-out {
      0%, 75% { opacity: 1; }
      100% { opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
      .piece { display: none; }
      .check, .tick, .word { animation: none; }
      .burst { animation: fade-only 1.1s linear both; }
      @keyframes fade-only {
        0% { opacity: 0; }
        15%, 75% { opacity: 1; }
        100% { opacity: 0; }
      }
    }
  `]
})
export class CorrectBurstComponent implements OnDestroy {
  @Input() language: string | null = null;

  bursts: Burst[] = [];
  liveText = '';
  private nextId = 0;
  private timers: ReturnType<typeof setTimeout>[] = [];

  play() {
    const theme = celebrationTheme(this.language);
    const word = theme.correctWords[Math.floor(Math.random() * theme.correctWords.length)];
    const id = this.nextId++;

    // Eén burst tegelijk: een nieuwe vervangt een lopende (snel antwoorden blijft rustig)
    this.bursts = [{ id, word, pieces: this.makePieces(theme.confettiColors) }];
    this.liveText = word;

    const t = setTimeout(() => {
      this.bursts = this.bursts.filter(b => b.id !== id);
      this.timers = this.timers.filter(x => x !== t);
    }, BURST_MS);
    this.timers.push(t);
  }

  ngOnDestroy() {
    this.timers.forEach(t => clearTimeout(t));
  }

  private makePieces(colors: string[]): ConfettiPiece[] {
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      // Per richting een verre rechthoek en een dichtere stip
      for (const [dist, shape] of [[70, 'rect'], [46, 'dot']] as const) {
        const d = dist + Math.random() * 14;
        pieces.push({
          dx: Math.round(Math.cos(angle) * d),
          dy: Math.round(Math.sin(angle) * d),
          rot: Math.round((Math.random() - 0.5) * 540),
          color: colors[(i + (shape === 'dot' ? 1 : 0)) % colors.length],
          shape,
          delay: shape === 'dot' ? 40 : 0,
        });
      }
    }
    return pieces;
  }
}
