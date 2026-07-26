// Quick-info tips for the home screen.
//
// Static on purpose: this is editorial copy that changes when someone rewrites
// it, not data. A table, a CMS or an admin screen would all be machinery around
// six sentences. Move it to the database the day a non-developer needs to edit
// it without a deploy.
//
// Nothing here is diagnostic or dose-specific — general wellness only, the kind
// of thing printed on a clinic poster. Keep it that way; the moment a tip could
// be mistaken for medical instruction it needs a clinician's sign-off.

export interface HealthTip {
  emoji: string;
  title: string;
  body: string;
}

export const HEALTH_TIPS: HealthTip[] = [
  {
    emoji: '💧',
    title: 'Water before tea',
    body: 'A glass of water first thing helps more than the morning chai. Older adults feel thirst less, so dehydration creeps up quietly.',
  },
  {
    emoji: '🚶',
    title: 'Ten minutes, thrice',
    body: 'Three short walks beat one long one for blood sugar and joints — after each meal is the easiest time to remember.',
  },
  {
    emoji: '🪑',
    title: 'Sit-to-stand',
    body: 'Stand up from a chair without using your hands, five times. It is the simplest test and exercise for the leg strength that prevents falls.',
  },
  {
    emoji: '💊',
    title: 'One box, one time',
    body: 'Keep every medicine in one box and take it at the same hour daily. Missed doses are far more common than wrong doses.',
  },
  {
    emoji: '🦶',
    title: 'Check the feet',
    body: 'For anyone with diabetes, look at the soles once a day. Small cuts go unnoticed when sensation is reduced.',
  },
  {
    emoji: '😴',
    title: 'Same bedtime',
    body: 'A fixed sleep and wake time steadies blood pressure and mood more reliably than sleeping longer at odd hours.',
  },
  {
    emoji: '🫁',
    title: 'Breathe deep, six times',
    body: 'Six slow breaths, twice a day, keeps the lower lungs open. It matters most for anyone spending long spells in bed.',
  },
  {
    emoji: '📋',
    title: 'Carry the list',
    body: 'Take a written list of current medicines to every appointment. Doctors change what they can see.',
  },
];
