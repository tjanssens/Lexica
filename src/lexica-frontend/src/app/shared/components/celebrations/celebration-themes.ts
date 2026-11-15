// Taalafhankelijke animaties tijdens het oefenen.
// Een nieuwe taal krijgt haar eigen animatie door hier een thema toe te voegen
// (en, als ze een eigen tekening wil, een `finaleArt` in session-finale.component.ts).
// Talen zonder eigen thema krijgen NEUTRAL_THEME.

export type FinaleArt = 'eiffel' | 'star';

export interface CelebrationTheme {
  /** Woordjes die onder het vinkje verschijnen bij een juist antwoord (willekeurig gekozen). */
  correctWords: string[];
  /** Kleuren van de confetti bij een juist antwoord. */
  confettiColors: string[];
  /** Titel op het eindscherm van de sessie. */
  finaleTitle: string;
  /** Tekening die zichzelf tekent op het eindscherm. */
  finaleArt: FinaleArt;
  /** Kleuren van de drie vuurwerkpijlen, in volgorde. */
  fireworkColors: [string, string, string];
  /** Optionele vlagbalk onder de titel (kleuren van links naar rechts). */
  flagColors?: string[];
}

// Niet-brekende spatie voor het uitroepteken, zoals in het Frans gebruikelijk.
const NBSP = ' ';

const FR_BLUE = '#2563eb';
const FR_WHITE = '#ffffff';
const FR_RED = '#ef4444';

export const CELEBRATION_THEMES: Record<string, CelebrationTheme> = {
  French: {
    correctWords: [`Bravo${NBSP}!`, `Super${NBSP}!`, `Très bien${NBSP}!`, `Parfait${NBSP}!`],
    confettiColors: [FR_BLUE, FR_WHITE, FR_RED],
    finaleTitle: `Félicitations${NBSP}!`,
    finaleArt: 'eiffel',
    fireworkColors: [FR_BLUE, FR_WHITE, FR_RED],
    flagColors: [FR_BLUE, FR_WHITE, FR_RED],
  },
};

export const NEUTRAL_THEME: CelebrationTheme = {
  correctWords: ['Goed zo!', 'Top!', 'Knap!', 'Prima!'],
  confettiColors: ['#f59e0b', '#22c55e', '#38bdf8', '#f472b6'],
  finaleTitle: 'Proficiat!',
  finaleArt: 'star',
  fireworkColors: ['#f59e0b', '#22c55e', '#38bdf8'],
};

export function celebrationTheme(language: string | null | undefined): CelebrationTheme {
  return (language && CELEBRATION_THEMES[language]) || NEUTRAL_THEME;
}
