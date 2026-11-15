import { Component } from '@angular/core';
import {
  GROUND_Y, LIGHTS_ON_MS, SILHOUETTE, SKYLINE, STARS, TOWER, VIEW_H, VIEW_W,
  Firework, buildFirework,
} from './paris-scene.geometry';

const BLUE = '#3b82f6';
const WHITE = '#f8fafc';
const RED = '#ef4444';

/**
 * Franse eindscène: Parijs bij nacht. De Eiffeltoren bouwt zichzelf op van de
 * grond tot de antenne, gaat goudkleurig branden, schittert, het zoeklicht
 * zwaait rond en er gaat blauw-wit-rood vuurwerk af boven de Seine.
 * Pure SVG + CSS; alles speelt één keer en eindigt in een stilstaand beeld.
 */
@Component({
  selector: 'app-paris-scene',
  standalone: true,
  template: `
    <svg [attr.viewBox]="'0 0 ' + w + ' ' + h" class="scene" aria-hidden="true">
      <defs>
        <linearGradient id="lx-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#050816" />
          <stop offset="0.55" stop-color="#111843" />
          <stop offset="0.9" stop-color="#2b2352" />
          <stop offset="1" stop-color="#43305f" />
        </linearGradient>
        <linearGradient id="lx-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a2150" />
          <stop offset="1" stop-color="#070b1f" />
        </linearGradient>
        <radialGradient id="lx-moon-glow">
          <stop offset="0" stop-color="#fef3c7" stop-opacity="0.35" />
          <stop offset="1" stop-color="#fef3c7" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="lx-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#fff7d6" stop-opacity="0.85" />
          <stop offset="1" stop-color="#fff7d6" stop-opacity="0" />
        </linearGradient>
        <linearGradient id="lx-refl-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="white" stop-opacity="1" />
          <stop offset="1" stop-color="white" stop-opacity="0.15" />
        </linearGradient>
        <mask id="lx-refl-mask" maskUnits="userSpaceOnUse">
          <rect x="0" [attr.y]="ground + 5" [attr.width]="w" [attr.height]="h - ground - 5" fill="url(#lx-refl-fade)" />
        </mask>
        <clipPath id="lx-water-clip">
          <rect x="0" [attr.y]="ground + 5" [attr.width]="w" [attr.height]="h - ground - 5" />
        </clipPath>
        <filter id="lx-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        @for (f of fireworks; track $index) {
          <radialGradient [attr.id]="'lx-flash-' + $index">
            <stop offset="0" stop-color="#ffffff" stop-opacity="0.95" />
            <stop offset="0.35" [attr.stop-color]="f.glow" stop-opacity="0.55" />
            <stop offset="1" [attr.stop-color]="f.glow" stop-opacity="0" />
          </radialGradient>
        }
      </defs>

      <!-- Lucht, maan en sterren -->
      <rect [attr.width]="w" [attr.height]="h" fill="url(#lx-sky)" />
      <circle cx="42" cy="36" r="22" fill="url(#lx-moon-glow)" />
      <path d="M42 26 A10 10 0 1 0 42 46 A7.5 10 0 1 1 42 26 Z" fill="#fef3c7" transform="rotate(-25 42 36)" />
      @for (s of stars; track $index) {
        <circle class="star" [attr.cx]="s.x" [attr.cy]="s.y" [attr.r]="s.r"
          [style.animation-delay.ms]="s.delay" [style.animation-duration.ms]="s.dur" />
      }

      <!-- Zoeklicht op de top -->
      <polygon class="beam"
        [attr.points]="beacon.x + ',' + beacon.y + ' ' + (beacon.x + 175) + ',' + (beacon.y - 7) + ' ' + (beacon.x + 175) + ',' + (beacon.y + 7)"
        fill="url(#lx-beam)" />

      <!-- Gouden gloed achter de verlichte toren -->
      <path class="glow" [attr.d]="silhouette" fill="#f59e0b" fill-rule="evenodd" filter="url(#lx-blur)" />

      <!-- Skyline met verlichte ramen -->
      <path [attr.d]="skyline.path" fill="#0a0e24" />
      @for (win of skyline.windows; track $index) {
        <rect class="window" [attr.x]="win.x" [attr.y]="win.y" width="1.3" height="1.7"
          [style.animation-delay.ms]="win.delay" />
      }

      <!-- De toren -->
      <g class="tower" fill="none" stroke-linecap="round" stroke-linejoin="round">
        @for (s of tower.strokes; track $index) {
          <path [class]="'part ' + s.kind" [attr.d]="s.d" pathLength="1"
            [attr.fill]="s.filled ? '#0d1432' : 'none'"
            [style.animation-delay.ms]="s.delay" [style.animation-duration.ms]="s.dur" />
        }
      </g>
      <circle class="tip" [attr.cx]="beacon.x" [attr.cy]="beacon.y" r="1.6" />

      <!-- Schitterlichtjes -->
      @for (l of tower.lights; track $index) {
        <circle class="sparkle" [attr.cx]="l.x" [attr.cy]="l.y" [attr.r]="l.r"
          [style.animation-delay.ms]="lightsOn + 350 + l.delay" [style.animation-duration.ms]="l.dur" />
      }

      <!-- Kade met lantaarns en de Seine met weerspiegeling -->
      <rect x="0" [attr.y]="ground" [attr.width]="w" height="5" fill="#060a1c" />
      <rect x="0" [attr.y]="ground + 5" [attr.width]="w" [attr.height]="h - ground - 5" fill="url(#lx-water)" />
      <g clip-path="url(#lx-water-clip)">
        <g class="reflection" mask="url(#lx-refl-mask)">
          <g [attr.transform]="'translate(0 ' + (2 * ground + 10) + ') scale(1 -1)'">
            <path [attr.d]="silhouette" fill="#fbbf24" fill-rule="evenodd" opacity="0.55" />
            <path [attr.d]="silhouette" fill="#f59e0b" fill-rule="evenodd" filter="url(#lx-blur)" opacity="0.5" />
          </g>
        </g>
        @for (lamp of lamps; track $index) {
          <rect [attr.x]="lamp - 0.6" [attr.y]="ground + 6" width="1.2" height="9" fill="#fde68a" opacity="0.25" />
        }
        <g class="ripples" stroke="#0b1233" stroke-width="0.9">
          @for (r of ripples; track $index) {
            <line x1="-10" [attr.y1]="r" [attr.x2]="w + 10" [attr.y2]="r" />
          }
        </g>
      </g>
      @for (lamp of lamps; track $index) {
        <circle [attr.cx]="lamp" [attr.cy]="ground + 2" r="2.6" fill="#fde68a" opacity="0.18" />
        <circle [attr.cx]="lamp" [attr.cy]="ground + 2" r="0.8" fill="#fde68a" />
      }

      <!-- Vuurwerk -->
      @for (f of fireworks; track f; let i = $index) {
        <g [attr.transform]="'translate(' + f.x + ' ' + f.y + ')'">
          <path class="rocket" [attr.d]="f.rocket" pathLength="1" [attr.stroke]="f.glow"
            [style.animation-delay.ms]="f.launch" />
          <circle class="flash" [attr.r]="f.radius * 0.7" [attr.fill]="'url(#lx-flash-' + i + ')'"
            [style.animation-delay.ms]="f.launch + 600" />
          <g fill="none" [attr.stroke]="f.color" stroke-width="1.6" stroke-linecap="round">
            @for (s of f.sparks; track $index) {
              <path class="spark" [attr.d]="s.d" pathLength="1"
                [style.animation-delay.ms]="f.launch + 600 + s.delay" [style.animation-duration.ms]="s.dur" />
            }
          </g>
          @for (g of f.glitter; track $index) {
            <circle class="glitter" [attr.cx]="g.x" [attr.cy]="g.y" [attr.r]="g.r" [attr.fill]="f.color"
              [style.animation-delay.ms]="f.launch + 600 + g.delay" />
          }
        </g>
      }
    </svg>
  `,
  styles: [`
    :host { display: block; }
    .scene { display: block; width: 100%; height: auto; }

    /* ---------- Toren: tekent zichzelf, daarna gaat het licht aan ---------- */
    .tower {
      stroke: #fbbf24;
      animation: lights-on 0.8s 2500ms ease-out both;
    }
    .part {
      stroke-dasharray: 1;
      stroke-dashoffset: 0;
      animation-name: draw;
      animation-timing-function: ease-out;
      animation-fill-mode: both;
    }
    .edge { stroke-width: 1.15; }
    .arch { stroke-width: 1.05; }
    .deck { stroke-width: 0.85; }
    .brace { stroke-width: 0.5; }

    .tip {
      fill: #fff7d6;
      animation: pop-in 0.4s 2400ms ease-out both;
    }

    .glow {
      opacity: 0.5;
      animation: fade-in 1s 2500ms ease-out both;
    }
    .reflection {
      opacity: 0.6;
      animation: fade-in 1.2s 2700ms ease-out both;
    }

    .sparkle {
      fill: #ffffff;
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
      animation-name: sparkle;
      animation-iteration-count: 4;
      animation-timing-function: ease-in-out;
      animation-fill-mode: both;
    }

    .beam {
      opacity: 0;
      transform-box: fill-box;
      transform-origin: left center;
      animation:
        beam-life 9.8s 2700ms linear both,
        beam-sweep 2.4s 2700ms ease-in-out 4 alternate both;
    }

    /* ---------- Decor ---------- */
    .star {
      fill: #e2e8f0;
      opacity: 0.8;
      animation-name: twinkle;
      animation-iteration-count: 3;
      animation-timing-function: ease-in-out;
    }
    .window {
      fill: #fcd34d;
      opacity: 0.75;
      animation: fade-in 0.5s ease-out both;
    }
    .ripples { animation: ripple 3s 2500ms ease-in-out 3 alternate both; }

    /* ---------- Vuurwerk ---------- */
    .rocket {
      fill: none;
      stroke-width: 1.2;
      stroke-linecap: round;
      stroke-dasharray: 0.3 2;
      stroke-dashoffset: -1;
      opacity: 0;
      animation: rocket 0.6s ease-out both;
    }
    .flash {
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
      animation: flash 0.7s ease-out both;
    }
    .spark {
      stroke-dasharray: 0.35 1.4;
      stroke-dashoffset: -1;
      opacity: 0;
      animation-name: spark;
      animation-timing-function: cubic-bezier(0.1, 0.65, 0.3, 1);
      animation-fill-mode: both;
    }
    .glitter {
      opacity: 0;
      animation: glitter 0.5s ease-in-out 2 both;
    }

    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    @keyframes lights-on { from { stroke: #cbd5e1; } to { stroke: #fbbf24; } }
    @keyframes fade-in { from { opacity: 0; } }
    @keyframes pop-in { from { opacity: 0; transform: scale(0); } }
    @keyframes sparkle {
      0% { opacity: 0; transform: scale(0.4); }
      35% { opacity: 1; transform: scale(1.7); }
      70% { opacity: 0.3; transform: scale(0.8); }
      100% { opacity: 0; transform: scale(0.4); }
    }
    @keyframes beam-life {
      0% { opacity: 0; }
      4% { opacity: 0.55; }
      92% { opacity: 0.55; }
      100% { opacity: 0; }
    }
    @keyframes beam-sweep { from { transform: scaleX(1); } to { transform: scaleX(-1); } }
    @keyframes twinkle { 0%, 100% { opacity: 0.8; } 50% { opacity: 0.15; } }
    @keyframes ripple { from { transform: translateX(-1.5px); } to { transform: translateX(1.5px); } }
    @keyframes rocket {
      0% { stroke-dashoffset: 0.3; opacity: 1; }
      85% { opacity: 1; }
      100% { stroke-dashoffset: -1; opacity: 0; }
    }
    @keyframes flash {
      0% { opacity: 0; transform: scale(0.2); }
      20% { opacity: 1; }
      100% { opacity: 0; transform: scale(1.5); }
    }
    @keyframes spark {
      0% { stroke-dashoffset: 0.35; opacity: 1; }
      65% { opacity: 1; }
      100% { stroke-dashoffset: -1; opacity: 0; }
    }
    @keyframes glitter { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }

    /* Minder beweging: meteen het eindbeeld (verlichte toren, geen vuurwerk) */
    @media (prefers-reduced-motion: reduce) {
      .tower, .part, .tip, .glow, .reflection, .star, .window, .ripples { animation: none; }
      .sparkle, .beam, .rocket, .flash, .spark, .glitter { display: none; }
    }
  `]
})
export class ParisSceneComponent {
  readonly w = VIEW_W;
  readonly h = VIEW_H;
  readonly ground = GROUND_Y;
  readonly lightsOn = LIGHTS_ON_MS;
  readonly tower = TOWER;
  readonly silhouette = SILHOUETTE;
  readonly skyline = SKYLINE;
  readonly stars = STARS;
  readonly beacon = TOWER.beacon;
  readonly lamps = Array.from({ length: 12 }, (_, i) => 10 + i * 27);
  readonly ripples = Array.from({ length: 16 }, (_, i) => GROUND_Y + 7 + i * 2.4);

  // Blauw, wit, rood na elkaar, en tot slot een tweede blauwe en rode
  readonly fireworks: Firework[] = [
    buildFirework(62, 70, BLUE, '#60a5fa', LIGHTS_ON_MS + 300, 30, 11),
    buildFirework(258, 58, WHITE, '#fef9c3', LIGHTS_ON_MS + 900, 32, 12),
    buildFirework(236, 128, RED, '#f87171', LIGHTS_ON_MS + 1500, 26, 13),
    buildFirework(86, 132, WHITE, '#fef9c3', LIGHTS_ON_MS + 2100, 22, 14),
    buildFirework(112, 40, RED, '#f87171', LIGHTS_ON_MS + 2600, 24, 15),
    buildFirework(214, 30, BLUE, '#60a5fa', LIGHTS_ON_MS + 2900, 22, 16),
  ];
}
