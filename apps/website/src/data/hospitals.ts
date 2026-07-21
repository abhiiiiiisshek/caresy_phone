// Curated hospitals & reputable clinics inside Caresy's current service area
// (Noida, Greater Noida, Greater Noida West / Noida Extension). Powers the
// booking hospital autocomplete. Free-text is still allowed — this is a
// convenience list, not a whitelist. Keep it alphabetical-ish by area and add
// entries as coverage expands. `area` is shown as the suggestion subtitle.
// ponytail: hand-maintained static list. If coverage goes multi-city, swap for
// Google Places Autocomplete (needs an API key + billing).

export interface Hospital {
  name: string;
  area: string;
}

export const HOSPITALS: Hospital[] = [
  // --- Noida ---
  { name: 'Fortis Hospital', area: 'Sector 62, Noida' },
  { name: 'Max Super Speciality Hospital', area: 'Sector 19, Noida' },
  { name: 'Jaypee Hospital', area: 'Sector 128, Noida' },
  { name: 'Kailash Hospital & Heart Institute', area: 'Sector 27, Noida' },
  { name: 'Metro Hospital & Heart Institute', area: 'Sector 11-12, Noida' },
  { name: 'Prakash Hospital', area: 'Sector 33, Noida' },
  { name: 'Yatharth Super Speciality Hospital', area: 'Sector 110, Noida' },
  { name: 'Felix Hospital', area: 'Sector 137, Noida' },
  { name: 'Cloudnine Hospital', area: 'Sector 51, Noida' },
  { name: 'Motherhood Hospital', area: 'Sector 48, Noida' },
  { name: 'Neo Hospital', area: 'Sector 50, Noida' },
  { name: 'Surbhi Hospital', area: 'Sector 41, Noida' },
  { name: 'Vinayak Hospital', area: 'Sector 27, Noida' },
  { name: 'Getwell Soon Hospital', area: 'Sector 12, Noida' },
  { name: 'Indo Gulf Hospital & Diagnostics', area: 'Sector 51, Noida' },
  { name: 'JS Tomar Multispeciality Hospital', area: 'Sector 22, Noida' },
  { name: 'Shivalik Medical Centre', area: 'Sector 26, Noida' },
  { name: 'Apollo Clinic', area: 'Sector 40, Noida' },
  { name: 'Centre for Sight', area: 'Sector 18, Noida' },
  { name: 'Aveya IVF & Fertility Centre', area: 'Sector 44, Noida' },
  { name: 'Sunrise Hospital', area: 'Sector 132, Noida' },
  { name: 'Cygnus / Diya Max Hospital', area: 'Sector 61, Noida' },
  { name: 'Dr. Lal PathLabs', area: 'Sector 18, Noida' },
  { name: 'SRL Diagnostics', area: 'Sector 18, Noida' },
  { name: 'Redcliffe Labs', area: 'Sector 63, Noida' },

  // --- Greater Noida ---
  { name: 'Sharda Hospital', area: 'Knowledge Park III, Greater Noida' },
  { name: 'GIMS (Govt. Institute of Medical Sciences)', area: 'Kasna, Greater Noida' },
  { name: 'Kailash Hospital', area: 'Knowledge Park I, Greater Noida' },
  { name: 'Yatharth Super Speciality Hospital', area: 'Omicron I, Greater Noida' },
  { name: 'Bhardwaj Hospital', area: 'Alpha I, Greater Noida' },
  { name: 'Apex Hospital', area: 'Alpha Commercial Belt, Greater Noida' },
  { name: 'Navin Medical Centre', area: 'Beta II, Greater Noida' },
  { name: 'Om Sai Clinic', area: 'Alpha II, Greater Noida' },
  { name: 'Saraswati Medical Centre', area: 'Gamma I, Greater Noida' },

  // --- Greater Noida West / Noida Extension ---
  { name: 'Yatharth Super Speciality Hospital', area: 'Greater Noida West' },
  { name: 'Synergy Plus Hospital', area: 'Gaur City, Greater Noida West' },
  { name: 'Prayag Hospital & Research Centre', area: 'Noida Extension' },
  { name: 'Numed Children Hospital', area: 'Gaur City, Greater Noida West' },
  { name: 'Rudra Hospital', area: 'Bisrakh, Greater Noida West' },
  { name: 'Body Balance Hospital', area: 'Gaur City, Greater Noida West' },
  { name: 'Cloudnine Hospital', area: 'Gaur City, Greater Noida West' },
];
