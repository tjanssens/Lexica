// Geometrie van de Parijse eindscène: een Eiffeltoren met echte verhoudingen
// (330 m hoog, 125 m breed aan de voet, platforms op 57 / 115 / 276 m),
// een skyline, sterren en vuurwerk. Alles wordt één keer berekend bij het laden
// van de module; de component tekent het alleen.

export const VIEW_W = 320;
export const VIEW_H = 240;

/** Horizon / voet van de toren. */
export const GROUND_Y = 196;
const CX = 160;
/** px per meter in de hoogte (330 m → 182 px). */
const S = 182 / 330;
/** Breedte iets aangedikt, zodat het vakwerk op een telefoon leesbaar blijft. */
const WX = 1.2;

// Halve breedte van de buitenrand (m) per hoogte (m): de bekende gebogen lijn.
const OUTER: [number, number][] = [
  [0, 62.5], [12, 56], [24, 50], [36, 44.5], [47, 40], [57, 36], [67, 32.5], [77, 29.5],
  [87, 27], [97, 24.8], [106, 22.8], [115, 21], [128, 19], [142, 17.2], [157, 15.6],
  [173, 14.1], [190, 12.8], [208, 11.6], [227, 10.5], [247, 9.6], [266, 8.9], [276, 8.6],
];
// Halve breedte van de binnenrand van de poten: ze komen samen net boven het 2de platform.
const INNER: [number, number][] = [
  [0, 40], [12, 34], [24, 28.5], [36, 23.5], [47, 19.5], [57, 16], [67, 12.5],
  [77, 9.4], [87, 6.6], [97, 4], [106, 1.8], [115, 0],
];

const LEG_LEVELS = [0, 12, 24, 36, 47, 57, 67, 77, 87, 97, 106, 115];
const SHAFT_LEVELS = [115, 128, 142, 157, 173, 190, 208, 227, 247, 266, 276];

function interp(table: [number, number][], h: number): number {
  if (h <= table[0][0]) return table[0][1];
  for (let i = 1; i < table.length; i++) {
    const [h1, w1] = table[i];
    if (h <= h1) {
      const [h0, w0] = table[i - 1];
      return w0 + ((w1 - w0) * (h - h0)) / (h1 - h0);
    }
  }
  return table[table.length - 1][1];
}

const y = (h: number) => GROUND_Y - h * S;
const outerX = (h: number) => interp(OUTER, h) * S * WX;
const innerX = (h: number) => interp(INNER, h) * S * WX;
const r1 = (n: number) => Math.round(n * 10) / 10;
const pt = (x: number, yy: number) => `${r1(x)} ${r1(yy)}`;

/** Bouwtijd: van 0,25 s (grond) tot 2,45 s (top van de antenne). */
const buildDelay = (h: number) => Math.round(250 + (h / 330) * 2200);

export type StrokeKind = 'edge' | 'brace' | 'deck' | 'arch';

export interface TowerStroke {
  d: string;
  kind: StrokeKind;
  delay: number;
  dur: number;
  /** Gevuld vlak (platforms) dat het vakwerk erachter afdekt. */
  filled?: boolean;
}

export interface Dot {
  x: number;
  y: number;
  r: number;
  delay: number;
  dur?: number;
}

/** Gebogen rand tussen twee hoogtes, als dichte polyline (oogt vloeiend). */
function edgePath(side: -1 | 1, fn: (h: number) => number, h0: number, h1: number): string {
  const steps = Math.max(2, Math.ceil((h1 - h0) / 2));
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const h = h0 + ((h1 - h0) * i) / steps;
    d += (i === 0 ? 'M' : 'L') + pt(CX + side * fn(h), y(h));
  }
  return d;
}

function line(x0: number, y0: number, x1: number, y1: number): string {
  return `M${pt(x0, y0)}L${pt(x1, y1)}`;
}

function rectPath(x0: number, y0: number, x1: number, y1: number): string {
  return `M${pt(x0, y1)}L${pt(x0, y0)}L${pt(x1, y0)}L${pt(x1, y1)}Z`;
}

function buildTower() {
  const strokes: TowerStroke[] = [];
  const lights: Dot[] = [];
  const push = (d: string, kind: StrokeKind, h: number, dur = 380, filled = false) =>
    strokes.push({ d, kind, delay: buildDelay(h), dur, filled });

  // --- Poten: buiten- en binnenrand, kruisverbanden en dwarsbalken ---
  for (const side of [-1, 1] as const) {
    for (let i = 0; i < LEG_LEVELS.length - 1; i++) {
      const h0 = LEG_LEVELS[i];
      const h1 = LEG_LEVELS[i + 1];
      push(edgePath(side, outerX, h0, h1), 'edge', h0);
      push(edgePath(side, innerX, h0, h1), 'edge', h0);
      const o0 = CX + side * outerX(h0), o1 = CX + side * outerX(h1);
      const n0 = CX + side * innerX(h0), n1 = CX + side * innerX(h1);
      push(line(o0, y(h0), n1, y(h1)), 'brace', h0 + 4, 260);
      push(line(n0, y(h0), o1, y(h1)), 'brace', h0 + 4, 260);
      if (i > 0) push(line(o0, y(h0), n0, y(h0)), 'brace', h0, 200);
      // Lampjes op de buitenrand en op de knooppunten van de binnenrand
      lights.push({ x: o0, y: y(h0), r: 1.1, delay: 0 });
      lights.push({ x: (o0 + o1) / 2, y: (y(h0) + y(h1)) / 2, r: 0.9, delay: 0 });
      if (i > 0 && innerX(h0) > 1) lights.push({ x: n0, y: y(h0), r: 0.9, delay: 0 });
    }
  }

  // --- Schacht tussen 2de en 3de platform: twee panelen met kruisverband ---
  for (let i = 0; i < SHAFT_LEVELS.length - 1; i++) {
    const h0 = SHAFT_LEVELS[i];
    const h1 = SHAFT_LEVELS[i + 1];
    const w0 = outerX(h0), w1 = outerX(h1);
    push(edgePath(-1, outerX, h0, h1), 'edge', h0);
    push(edgePath(1, outerX, h0, h1), 'edge', h0);
    push(line(CX - w0, y(h0), CX, y(h1)), 'brace', h0 + 3, 240);
    push(line(CX, y(h0), CX - w1, y(h1)), 'brace', h0 + 3, 240);
    push(line(CX + w0, y(h0), CX, y(h1)), 'brace', h0 + 3, 240);
    push(line(CX, y(h0), CX + w1, y(h1)), 'brace', h0 + 3, 240);
    if (i > 0) push(line(CX - w0, y(h0), CX + w0, y(h0)), 'brace', h0, 200);
    for (const side of [-1, 1]) {
      lights.push({ x: CX + side * w0, y: y(h0), r: 1, delay: 0 });
      lights.push({ x: CX + side * (w0 + w1) / 2, y: (y(h0) + y(h1)) / 2, r: 0.8, delay: 0 });
    }
    lights.push({ x: CX, y: (y(h0) + y(h1)) / 2, r: 0.8, delay: 0 });
  }

  // --- De grote boog onder het 1ste platform (met vakwerk tot aan het platform) ---
  const springH = 4;
  const a = innerX(springH);
  const ys = y(springH);
  const ry = (40 - springH) * S;
  push(`M${pt(CX - a, ys)}A${r1(a)} ${r1(ry)} 0 0 1 ${pt(CX + a, ys)}`, 'arch', 8, 700);
  const a2 = a - 2.2, ry2 = ry - 2.6;
  push(`M${pt(CX - a2, ys)}A${r1(a2)} ${r1(ry2)} 0 0 1 ${pt(CX + a2, ys)}`, 'arch', 10, 700);
  const archY = (x: number) => ys - ry * Math.sqrt(Math.max(0, 1 - (x / a) ** 2));
  for (const f of [-0.82, -0.62, -0.42, -0.21, 0, 0.21, 0.42, 0.62, 0.82]) {
    const x = f * a;
    push(line(CX + x, archY(x), CX + x, y(57)), 'brace', 40, 200);
  }
  for (const f of [-0.9, -0.6, -0.3, 0, 0.3, 0.6, 0.9]) {
    lights.push({ x: CX + f * a, y: archY(f * a), r: 0.9, delay: 0 });
  }

  // --- Platforms (gevuld, zodat ze het vakwerk erachter afdekken) ---
  const deck = (h: number, height: number, overhang: number, arches: boolean) => {
    const w = outerX(h) + overhang;
    const top = y(h) - height;
    push(rectPath(CX - w, top, CX + w, y(h)), 'deck', h, 450, true);
    if (arches) {
      // Rij kleine boogjes in de fries van het 1ste platform
      const n = Math.round((2 * w) / 3.6);
      const step = (2 * w) / n;
      let d = '';
      for (let i = 0; i < n; i++) {
        const x0 = CX - w + i * step;
        d += `M${pt(x0 + 0.5, y(h) - 0.6)}A${r1(step / 2 - 0.5)} ${r1(height * 0.55)} 0 0 1 ${pt(x0 + step - 0.5, y(h) - 0.6)}`;
      }
      push(d, 'brace', h + 2, 450);
    } else {
      let d = '';
      for (let x = -w + 2; x < w - 1; x += 2.4) d += line(CX + x, top + 0.6, CX + x, y(h) - 0.6);
      push(d, 'brace', h + 2, 300);
    }
    for (let x = -w; x <= w + 0.01; x += (2 * w) / 6) lights.push({ x: CX + x, y: top, r: 1.1, delay: 0 });
  };
  deck(57, 6.5, 3.5, true);
  deck(115, 3.6, 2.6, false);

  // --- Top: 3de platform, campanile, antenne ---
  const w3 = outerX(276) + 1.6;
  push(rectPath(CX - w3, y(284), CX + w3, y(276)), 'deck', 276, 300, true);
  push(`M${pt(CX - w3 + 1.2, y(284))}L${pt(CX - 2, y(300))}L${pt(CX + 2, y(300))}L${pt(CX + w3 - 1.2, y(284))}`, 'edge', 284, 260);
  push(line(CX, y(300), CX, y(326)), 'edge', 300, 300);
  lights.push({ x: CX - w3, y: y(284), r: 1, delay: 0 }, { x: CX + w3, y: y(284), r: 1, delay: 0 });
  lights.push({ x: CX, y: y(300), r: 1, delay: 0 }, { x: CX, y: y(313), r: 0.9, delay: 0 });

  // Twinkel-moment per lampje: willekeurig, maar stabiel tussen sessies
  const rnd = mulberry32(7);
  for (const l of lights) {
    l.delay = Math.round(rnd() * 900);
    l.dur = 600 + Math.round(rnd() * 500);
  }

  return { strokes, lights, beacon: { x: CX, y: y(326) } };
}

/** Silhouet (voor gloed en weerspiegeling), met de opening tussen de poten uitgespaard. */
function buildSilhouette(): string {
  let d = '';
  const hs: number[] = [];
  for (let h = 0; h <= 276; h += 3) hs.push(h);
  hs.push(276);
  d += 'M' + hs.map(h => pt(CX - outerX(h), y(h))).join('L');
  d += `L${pt(CX - 2, y(300))}L${pt(CX + 2, y(300))}`;
  d += 'L' + [...hs].reverse().map(h => pt(CX + outerX(h), y(h))).join('L') + 'Z';
  const inner: number[] = [];
  for (let h = 0; h <= 115; h += 3) inner.push(h);
  d += 'M' + inner.map(h => pt(CX - innerX(h), y(h))).join('L');
  d += 'L' + [...inner].reverse().map(h => pt(CX + innerX(h), y(h))).join('L') + 'Z';
  return d;
}

// --- Skyline: Haussmann-daken met mansardes en schoorstenen, verlichte ramen ---
function buildSkyline() {
  const rnd = mulberry32(42);
  let d = `M0 ${GROUND_Y}`;
  const windows: Dot[] = [];
  const chimneys: string[] = [];
  let x = 0;
  while (x < VIEW_W) {
    const w = 9 + Math.round(rnd() * 13);
    const dist = Math.abs(x + w / 2 - CX);
    // Rond de toren ligt het Champ de Mars: daar laag of niets
    const maxH = dist < 50 ? 0 : dist < 70 ? 7 : 17;
    const hgt = maxH === 0 ? 0 : 5 + Math.round(rnd() * (maxH - 5));
    const top = GROUND_Y - hgt;
    if (hgt === 0) {
      d += `L${x + w} ${GROUND_Y}`;
    } else {
      const roof = Math.min(4, hgt * 0.3);
      d += `L${x} ${top + roof}L${x + 1.5} ${top}L${x + w - 1.5} ${top}L${x + w} ${top + roof}`;
      // schoorsteen
      if (rnd() > 0.45) {
        const cx = x + 3 + rnd() * (w - 6);
        chimneys.push(`M${r1(cx)} ${top}L${r1(cx)} ${r1(top - 2.5)}L${r1(cx + 1.8)} ${r1(top - 2.5)}L${r1(cx + 1.8)} ${top}Z`);
      }
      for (let wy = top + roof + 2; wy < GROUND_Y - 2; wy += 3.4) {
        for (let wx = x + 2; wx < x + w - 2; wx += 3) {
          if (rnd() > 0.72) windows.push({ x: r1(wx), y: r1(wy), r: 0, delay: Math.round(rnd() * 900) });
        }
      }
    }
    x += w;
  }
  d += `L${VIEW_W} ${GROUND_Y}L${VIEW_W} ${GROUND_Y + 1}L0 ${GROUND_Y + 1}Z`;
  return { path: d + chimneys.join(''), windows };
}
// --- Sterren ---
function buildStars(): Dot[] {
  const rnd = mulberry32(3);
  const stars: Dot[] = [];
  while (stars.length < 34) {
    const x = rnd() * VIEW_W;
    const yy = rnd() * 150;
    // niet in de toren of de maan
    if (Math.abs(x - CX) < 22 && yy > 10) continue;
    if (Math.hypot(x - 42, yy - 36) < 16) continue;
    stars.push({ x: r1(x), y: r1(yy), r: r1(0.35 + rnd() * 0.7), delay: Math.round(rnd() * 3000), dur: 1600 + Math.round(rnd() * 1800) });
  }
  return stars;
}

// --- Vuurwerk: een pijl met staart, een flits en vonken die met zwaartekracht uitwaaieren ---
export interface FireworkSpark { d: string; delay: number; dur: number; }
export interface Firework {
  x: number;
  y: number;
  color: string;
  glow: string;
  launch: number;
  rocket: string;
  sparks: FireworkSpark[];
  glitter: Dot[];
  radius: number;
}

export function buildFirework(x: number, yy: number, color: string, glow: string, launch: number, radius: number, seed: number): Firework {
  const rnd = mulberry32(seed);
  const sparks: FireworkSpark[] = [];
  const glitter: Dot[] = [];
  const n = 26;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rnd() * 0.15;
    const r = radius * (0.75 + rnd() * 0.3);
    const dx = Math.cos(ang) * r;
    const dy = Math.sin(ang) * r;
    const g = radius * 0.35; // zwaartekracht: vonken buigen naar beneden
    sparks.push({
      d: `M0 0Q${r1(dx * 0.75)} ${r1(dy * 0.75)} ${r1(dx)} ${r1(dy + g)}`,
      delay: Math.round(rnd() * 60),
      dur: 1000 + Math.round(rnd() * 300),
    });
    if (i % 2 === 0) glitter.push({ x: r1(dx), y: r1(dy + g + 2), r: 0.9, delay: 900 + Math.round(rnd() * 300) });
  }
  const startY = GROUND_Y - yy + 4;
  const sway = (rnd() - 0.5) * 10;
  return {
    x, y: yy, color, glow, launch, radius, sparks, glitter,
    rocket: `M${r1(sway)} ${r1(startY)}Q${r1(sway * 0.3)} ${r1(startY * 0.4)} 0 0`,
  };
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const TOWER = buildTower();
export const SILHOUETTE = buildSilhouette();
export const SKYLINE = buildSkyline();
export const STARS = buildStars();
/** Tijdstip (ms) waarop de toren af is en de verlichting aangaat. */
export const LIGHTS_ON_MS = 2500; // ook hard gecodeerd in de CSS van paris-scene.component.ts
