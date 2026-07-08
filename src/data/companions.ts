// Shared companion roster used across booking, admin-ops, and trust pages.
//
// There is no live `companions` table yet (see docs/08_Database/BOOKING_ENGINE_SCHEMA.md
// TODOs) — real dispatch still happens manually via admin-ops. These three profiles are
// illustrative examples of the kind of companion a customer will be matched with, not a
// live/real-time match. Keep any UI copy referencing this data honest about that (see
// `trust` page's existing "simulated example" disclaimer, which this module preserves).

export interface Companion {
  id: string;
  name: string;
  avatarInitials: string;
  photo: string;
  rating: number;
  visits: number;
  verification: string;
  languages: string;
  specialty: string;
  specialtyDescription: string;
  quote: string;
  color: string;
  /** keywords matched against a department/service string on the booking form */
  matchKeywords: string[];
}

export const COMPANIONS: Companion[] = [
  {
    id: 'priya',
    name: 'Priya Sharma',
    avatarInitials: 'PS',
    photo: '/assets/caresy-companion-priya.png',
    rating: 4.9,
    visits: 82,
    verification: 'Police Verified',
    languages: 'Hindi, English, Punjabi',
    specialty: 'Cardiology',
    specialtyDescription: 'Cardiology coordination, patient navigation, post-consultation discharge procedures.',
    quote: '"I ensure that the patient feels like they have family alongside them at every stage of the hospital day."',
    color: '#08796f',
    matchKeywords: ['cardio', 'heart'],
  },
  {
    id: 'anil',
    name: 'Anil Kumar',
    avatarInitials: 'AK',
    photo: '/assets/caresy-companion-anil.png',
    rating: 4.8,
    visits: 120,
    verification: 'Police Verified',
    languages: 'Kannada, Tamil, English',
    specialty: 'Orthopedics',
    specialtyDescription: 'Orthopedics support, elderly wheelchair mobility navigation, physiotherapy coordination.',
    quote: '"Hospital queues can be extremely tiring for elders. I take care of the wait so they can sit comfortably."',
    color: '#e77f62',
    matchKeywords: ['ortho', 'physio', 'bone', 'joint'],
  },
  {
    id: 'sarah',
    name: 'Sarah Mathews',
    avatarInitials: 'SM',
    photo: '/assets/caresy-companion-sarah.png',
    rating: 4.9,
    visits: 65,
    verification: 'Police Verified',
    languages: 'Malayalam, Telugu, English',
    specialty: 'General Care',
    specialtyDescription: 'General health scans, billing paperwork coordination, pharmacy medicine collection.',
    quote: '"My goal is to make sure family members receive detailed, stress-free updates at every major milestone."',
    color: '#a45b9a',
    matchKeywords: [],
  },
];

export function ratingLabel(companion: Companion): string {
  return `${companion.rating.toFixed(1)} (${companion.visits} visits)`;
}

/** Illustrative specialty match based on department text typed into the booking form. */
export function matchCompanionByDepartment(department: string): Companion {
  const fallback = COMPANIONS[COMPANIONS.length - 1];
  if (!department) return fallback;
  const deptLower = department.toLowerCase();
  return COMPANIONS.find((c) => c.matchKeywords.some((k) => deptLower.includes(k))) || fallback;
}

export function findCompanionByName(name: string): Companion | null {
  return COMPANIONS.find((c) => c.name === name) || null;
}
