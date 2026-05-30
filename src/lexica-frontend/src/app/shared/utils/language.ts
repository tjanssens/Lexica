// Centrale lijst van ondersteunde talen.
// `value` komt overeen met de C#-enum `Language` (als string geserialiseerd).
// `label` is de Nederlandse weergavenaam, `icon` een FontAwesome-icoon.
export interface LanguageOption {
  value: string;
  label: string;
  icon: string;
}

export const LANGUAGES: LanguageOption[] = [
  { value: 'Latin', label: 'Latijn', icon: 'fa-landmark' },
  { value: 'Greek', label: 'Grieks', icon: 'fa-scroll' },
  { value: 'English', label: 'Engels', icon: 'fa-mug-hot' },
  { value: 'French', label: 'Frans', icon: 'fa-tower-observation' },
];

/** Geeft de Nederlandse weergavenaam voor een taalcode (valt terug op de code zelf). */
export function languageLabel(value: string | null | undefined): string {
  return LANGUAGES.find(l => l.value === value)?.label ?? value ?? '';
}

/** Geeft de FontAwesome-iconklasse voor een taalcode (valt terug op fa-scroll). */
export function languageIcon(value: string | null | undefined): string {
  return LANGUAGES.find(l => l.value === value)?.icon ?? 'fa-scroll';
}
