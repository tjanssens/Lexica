export type LatinNameGender = 'male' | 'female' | 'any';

const MALE_PRAENOMINA = [
  'Marcus', 'Gaius', 'Lucius', 'Publius', 'Quintus', 'Tiberius', 'Titus',
  'Aulus', 'Decimus', 'Gnaeus', 'Servius', 'Sextus', 'Appius', 'Spurius',
  'Manius', 'Numerius', 'Kaeso'
];

const FEMALE_NOMINA = [
  'Cornelia', 'Julia', 'Livia', 'Octavia', 'Claudia', 'Aemilia', 'Valeria',
  'Fabia', 'Antonia', 'Tullia', 'Calpurnia', 'Sempronia', 'Cassia', 'Domitia',
  'Junia', 'Licinia', 'Flavia', 'Marcia', 'Pompeia', 'Servilia', 'Drusilla',
  'Agrippina'
];

const MALE_COGNOMINA = [
  'Rufus', 'Niger', 'Albus', 'Flavus', 'Calvus', 'Crispus', 'Macer', 'Crassus',
  'Longus', 'Brevis', 'Paulus', 'Magnus', 'Varus', 'Severus', 'Pius', 'Felix',
  'Faustus', 'Justus', 'Probus', 'Pulcher', 'Superbus', 'Modestus', 'Prudens',
  'Sapiens', 'Audax', 'Fortis', 'Celer', 'Lenis', 'Placidus', 'Verus',
  'Constans', 'Maximus', 'Optimus', 'Hilarus', 'Mitis', 'Doctus', 'Studiosus',
  'Comatus', 'Flammeus', 'Cato', 'Nero'
];

const FEMALE_COGNOMINA = [
  'Rufa', 'Nigra', 'Alba', 'Flava', 'Calva', 'Crispa', 'Macra', 'Crassa',
  'Longa', 'Brevis', 'Paulla', 'Magna', 'Vara', 'Severa', 'Pia', 'Felix',
  'Fausta', 'Justa', 'Proba', 'Pulchra', 'Superba', 'Modesta', 'Prudens',
  'Sapiens', 'Audax', 'Fortis', 'Celer', 'Lenis', 'Placida', 'Vera',
  'Constans', 'Maxima', 'Optima', 'Hilara', 'Mitis', 'Docta', 'Studiosa',
  'Comata', 'Flammea', 'Augusta', 'Minor', 'Maior'
];

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export function generateLatinName(
  gender: LatinNameGender = 'any',
  previous?: string
): string {
  const resolved: 'male' | 'female' =
    gender === 'any' ? (Math.random() < 0.5 ? 'male' : 'female') : gender;

  for (let attempt = 0; attempt < 5; attempt++) {
    const first = resolved === 'male' ? pick(MALE_PRAENOMINA) : pick(FEMALE_NOMINA);
    const last = resolved === 'male' ? pick(MALE_COGNOMINA) : pick(FEMALE_COGNOMINA);
    const name = `${first} ${last}`;
    if (name !== previous) return name;
  }
  return `${resolved === 'male' ? pick(MALE_PRAENOMINA) : pick(FEMALE_NOMINA)} ${
    resolved === 'male' ? pick(MALE_COGNOMINA) : pick(FEMALE_COGNOMINA)
  }`;
}
