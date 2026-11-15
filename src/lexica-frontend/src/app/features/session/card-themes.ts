/**
 * Taalspecifieke stijlen voor de studiekaartjes.
 *
 * Een taal zonder eigen thema krijgt de standaardkaart. Een nieuwe taal een
 * eigen look geven: voeg hier een thema toe en schrijf de CSS onder
 * `.flashcard.theme-<id>` in session-play.component.ts.
 */
export interface CardTheme {
  /** Wordt de CSS-klasse `theme-<id>` op de kaart. */
  id: string;
  /** Korte code voor de doeltaal-kant (bv. "FR"). */
  targetCode: string;
  /** Korte code voor de Nederlandse kant. */
  nativeCode: string;
}

const THEMES: Record<string, CardTheme> = {
  // Parijs straatnaambord ("plaque de rue")
  French: { id: 'plaque', targetCode: 'FR', nativeCode: 'NL' },
};

export function getCardTheme(language: string | null | undefined): CardTheme | null {
  return (language && THEMES[language]) || null;
}

/**
 * CSS-lettergrootte zodat een woord in hoofdletters met brede spatiëring op
 * het bord past. Het langste woord bepaalt de grootte, want daarbinnen wordt
 * niet afgebroken; lange zinnen worden bovendien kleiner gezet zodat ze maar
 * een paar regels innemen. Het resultaat schaalt mee met de kaartbreedte
 * (container query op .flashcard-container), zodat het ook op smalle
 * telefoons past.
 */
export function plaqueFontSize(text: string): string {
  const max = 34;
  const min = 13;
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return `${max}px`;

  const longest = Math.max(...words.map(w => w.length));
  const total = text.trim().length;
  let cap = max;
  if (total > 60) cap = 16;
  else if (total > 36) cap = 20;
  else if (total > 20) cap = 26;

  // Geschatte breedte van één hoofdletter incl. letter-spacing, in em.
  const charEm = 0.82;
  // Kaart is max 350px breed, met 1.5rem marge aan elke kant van het scherm;
  // ~80px gaat op aan rand en binnenmarge van het bord.
  const fit = `calc((min(350px, 100cqi - 3rem) - 80px) / ${(longest * charEm).toFixed(2)})`;
  return `max(${min}px, min(${cap}px, ${fit}))`;
}
