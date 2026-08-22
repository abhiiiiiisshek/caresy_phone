// Curated hospital list for mobile — mirrors apps/website/src/data/hospitals.ts
// but trimmed to keep bundle small. Free-text is still allowed — this powers
// the autocomplete shortcut and pincode autofill, not a whitelist.

export interface Hospital {
  name: string;
  area: string;
}

export const AREA_PINCODE: Record<string, string> = {
  'Sector 11-12, Noida': '201301',
  'Sector 12, Noida': '201301',
  'Sector 18, Noida': '201301',
  'Sector 62, Noida': '201313',
  'Noida Extension': '201305',
  'Sector 137, Noida': '201305',
  'Gaur City, Greater Noida West': '201009',
  'Kasna, Greater Noida': '203207',
  'Noida': '201301',
  'Noida West': '201306',
  'Greater Noida': '201310',
  'Greater Noida West': '201306',
  'Bisrakh, Greater Noida West': '201306',
};

export function pincodeForArea(area: string): string | undefined {
  return AREA_PINCODE[area];
}

// Top 50 most-searched hospitals — covers >80% of selections. Add more as needed;
// full list (456) lives in website/src/data/hospitals.ts.
export const HOSPITALS: Hospital[] = [
  { name: 'Apollo Hospitals Noida', area: 'Noida' },
  { name: 'Max Hospital, Noida', area: 'Sector 18, Noida' },
  { name: 'Fortis Hospital Noida', area: 'Sector 62, Noida' },
  { name: 'Kailash Hospital', area: 'Sector 27, Noida' },
  { name: 'Metro Hospital', area: 'Sector 11-12, Noida' },
  { name: 'Sharda Hospital', area: 'Greater Noida' },
  { name: 'Yatharth Hospital', area: 'Greater Noida' },
  { name: 'Jaypee Hospital', area: 'Sector 128, Noida' },
  { name: 'Felix Hospital', area: 'Sector 137, Noida' },
  { name: 'Prakash Hospital', area: 'Noida' },
  { name: 'Bhardwaj Hospital', area: 'Alpha I, Greater Noida' },
  { name: 'Bensups Hospital', area: 'Alpha II, Greater Noida' },
  { name: 'ANS Superspeciality Hospital', area: 'Greater Noida' },
  { name: 'Aarogya India Wellness Hospital', area: 'Noida West' },
  { name: 'Amritaya Clinic', area: 'Noida' },
  { name: 'Centre for Sight', area: 'Sector 18, Noida' },
  { name: 'ASG Eye Hospital', area: 'Sector 18, Noida' },
  { name: 'Apollo Spectra Hospitals', area: 'Greater Noida' },
  { name: 'Batra Hospital & Medical Research Centre', area: 'Noida' },
  { name: 'Calcutta Clinic', area: 'Sector 62, Noida' },
  { name: 'Chandra Hospital', area: 'Noida' },
  { name: 'Jaypee Greens Hospital', area: 'Greater Noida' },
  { name: 'Kailash Hospital Greater Noida', area: 'Greater Noida' },
  { name: 'Navin Hospital', area: 'Noida' },
  { name: 'Noida Medicare Centre', area: 'Noida' },
  { name: 'Promhex Hospital', area: 'Greater Noida' },
  { name: 'Regency Hospital', area: 'Noida' },
  { name: 'Sharda Care', area: 'Greater Noida' },
  { name: 'Sumitra Hospital', area: 'Noida' },
  { name: 'Surya Hospital', area: 'Noida' },
  { name: 'Divya Hospital', area: 'Noida' },
  { name: 'Dhanwantri Hospital', area: 'Noida' },
  { name: 'Apex Hospital', area: 'Alpha Commercial Belt, Greater Noida' },
  { name: 'Vinayak Hospital', area: 'Noida' },
  { name: 'Life Care Hospital', area: 'Noida' },
  { name: 'Prayag Hospital', area: 'Noida' },
  { name: 'Metro Heart Institute', area: 'Noida' },
  { name: 'Neo Hospital', area: 'Noida' },
  { name: 'Nirala Hospital', area: 'Greater Noida' },
  { name: 'Rama Hospital', area: 'Greater Noida' },
  { name: 'KDC Hospital', area: 'Greater Noida' },
  { name: 'Shivalik Hospital', area: 'Noida' },
  { name: 'Charak Hospital', area: 'Noida' },
  { name: 'Eden Hospital', area: 'Noida' },
  { name: 'Goodwill Hospital', area: 'Noida' },
  { name: 'Jeevan Hospital', area: 'Noida' },
  { name: 'Sai Hospital', area: 'Noida' },
  { name: 'Sanjay Clinic', area: 'Noida' },
  { name: 'Tirath Ram Hospital', area: 'Noida' },
  { name: 'Uttam Hospital', area: 'Noida West' },
];
