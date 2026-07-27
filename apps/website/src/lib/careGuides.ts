// Short care guides for the home screen and /guides.
//
// Static on purpose: this is editorial copy that changes when someone rewrites
// it, not data. A table, a CMS or an admin screen would all be machinery around
// a few hundred words. Move it to the database the day a non-developer needs to
// edit it without a deploy.
//
// Nothing here is diagnostic or dose-specific — general wellbeing guidance, the
// kind of thing printed on a clinic poster. Keep it that way. The moment a guide
// could be mistaken for medical instruction it needs a clinician's sign-off.

export interface GuideSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface CareGuide {
  slug: string;
  emoji: string;
  title: string;
  summary: string;
  minutes: number;
  sections: GuideSection[];
}

export const CARE_GUIDES: CareGuide[] = [
  {
    slug: 'post-surgery',
    emoji: '🩹',
    title: 'The first week after surgery',
    summary: 'What actually needs watching once you get home',
    minutes: 4,
    sections: [
      {
        paragraphs: [
          'Most complications after a routine operation show up in the first seven days, and almost all of them announce themselves before they become serious. Knowing what to look for turns a frightening week into a manageable one.',
        ],
      },
      {
        heading: 'Call the hospital the same day if',
        bullets: [
          'Fever above 38°C, or shivering that will not settle.',
          'The wound becomes more painful rather than less, after day three.',
          'Redness spreading outward from the wound, or any discharge with a smell.',
          'A calf that is swollen, warm or tender on one side only.',
          'Breathlessness, or chest pain on breathing in.',
          'No urine for eight hours, or vomiting that stops fluids going down.',
        ],
      },
      {
        heading: 'Pain is not something to endure',
        paragraphs: [
          'Take the pain relief you were prescribed on schedule for the first few days, not only when the pain becomes bad. Someone in pain does not breathe deeply, does not walk, and does not sleep — and those three things are what recovery is made of.',
          'Ask before stopping anything early, particularly antibiotics.',
        ],
      },
      {
        heading: 'Move sooner than feels natural',
        paragraphs: [
          'Short, frequent walks around the house prevent the two commonest post-operative problems: clots in the legs and chest infections. A few minutes every hour while awake does more than one long effort in the afternoon.',
          'While sitting, circle the ankles and press the feet down as if on a pedal. It keeps blood moving in the calves even when walking is not yet comfortable.',
        ],
      },
      {
        heading: 'Write the questions down',
        paragraphs: [
          'The follow-up appointment is short and easy to waste. Keep a running note on the phone of anything odd — what it was, when it happened, how long it lasted — and take the list of current medicines with you.',
        ],
      },
    ],
  },
  {
    slug: 'medicines',
    emoji: '💊',
    title: 'Getting medicines right',
    summary: 'Missed doses are far more common than wrong ones',
    minutes: 3,
    sections: [
      {
        paragraphs: [
          'When someone is on more than three or four medicines, the problem is almost never the prescription. It is that a dose was skipped, doubled after a forgotten one, or quietly stopped because a strip ran out.',
        ],
      },
      {
        heading: 'One box, one time',
        paragraphs: [
          'Keep every medicine in a single container and take it at the same hour each day, anchored to something that already happens — after breakfast, before the evening news. A weekly pill organiser costs very little and makes a missed dose visible instead of invisible.',
        ],
      },
      {
        heading: 'Keep a written list',
        paragraphs: [
          'Name, strength, how many times a day, and what it is for. Take it to every appointment. Doctors change what they can see, and a patient who has been to three specialists usually has medicines none of them knows about.',
          'Include anything bought without a prescription — painkillers, antacids, ayurvedic preparations, supplements. These interact more often than people expect.',
        ],
      },
      {
        heading: 'When a dose is missed',
        paragraphs: [
          'Take it if you remember reasonably soon; skip it if the next dose is nearly due. Do not take two together to catch up. If it happens often, that is worth telling the doctor — the schedule may simply be unrealistic.',
        ],
      },
    ],
  },
  {
    slug: 'preventing-falls',
    emoji: '🚶',
    title: 'Staying steady on your feet',
    summary: 'The strength that prevents falls can be rebuilt at home',
    minutes: 3,
    sections: [
      {
        paragraphs: [
          'A fall is rarely just bad luck. It is usually weak legs, poor balance, an unlit corridor or a loose slipper — and every one of those can be improved.',
        ],
      },
      {
        heading: 'The sit-to-stand test',
        paragraphs: [
          'Stand up from a firm chair without using your hands, then sit back down. Five times. Someone who cannot manage it, or who needs the armrests, has lost the leg strength that catches a stumble.',
          'It is also the exercise. Five repetitions, twice a day, holding the chair back for support if needed. Progress is genuinely noticeable within a few weeks.',
        ],
      },
      {
        heading: 'Walk little and often',
        paragraphs: [
          'Three ten-minute walks are better than one thirty-minute walk for blood sugar, joints and stamina. After each meal is the easiest time to remember, and the most useful time for it.',
        ],
      },
      {
        heading: 'Fix the house, not just the person',
        bullets: [
          'Loose rugs and trailing wires out of walkways.',
          'A light that can be reached from the bed for night-time trips to the bathroom.',
          'Slippers with a back and a grip sole — not loose chappals.',
          'A grab rail beside the toilet and in the bathing area.',
        ],
      },
    ],
  },
  {
    slug: 'hydration',
    emoji: '💧',
    title: 'Water before tea',
    summary: 'Why older adults get dehydrated without feeling thirsty',
    minutes: 2,
    sections: [
      {
        paragraphs: [
          'The sense of thirst weakens with age. An older adult can be meaningfully dehydrated and feel nothing at all — which is why confusion, dizziness on standing, constipation and sudden tiredness so often turn out to be nothing more than not enough water.',
        ],
      },
      {
        heading: 'What helps',
        bullets: [
          'A glass of water first thing, before the morning chai.',
          'A filled bottle or jug kept in sight — out of sight really does mean out of mind.',
          'Curd, buttermilk, dal, soups and fruit all count toward the day.',
          'In summer or during a fever, more than usual.',
        ],
      },
      {
        heading: 'An easy daily check',
        paragraphs: [
          'Urine should be pale. Dark yellow, or going many hours without passing any, means it is time to drink more.',
          'One caution: anyone told by a doctor to limit fluids — usually for heart or kidney reasons — should follow that instruction instead. Ask what the daily limit actually is, and keep to it.',
        ],
      },
    ],
  },
  {
    slug: 'diabetes-feet',
    emoji: '🦶',
    title: 'Check the feet daily',
    summary: 'Two minutes that prevent most diabetic foot wounds',
    minutes: 2,
    sections: [
      {
        paragraphs: [
          'Diabetes reduces sensation in the feet, so a blister, cut or embedded stone can go unnoticed for days. By the time it hurts it is often already infected. Nearly all of this is preventable by looking.',
        ],
      },
      {
        heading: 'The daily two minutes',
        bullets: [
          'Look at the soles and between the toes — use a mirror on the floor, or ask someone.',
          'Wash and dry properly, especially between the toes.',
          'Moisturise dry skin, but not between the toes.',
          'Shake out footwear before putting it on.',
          'Never walk barefoot, indoors or out.',
        ],
      },
      {
        heading: 'Show a doctor promptly',
        paragraphs: [
          'Any break in the skin, colour change, swelling, or new numbness or burning. On a diabetic foot, a small wound is not a small problem, and waiting to see whether it settles is the mistake that costs toes.',
        ],
      },
    ],
  },
  {
    slug: 'sleep-and-breathing',
    emoji: '😴',
    title: 'Sleep, and breathing well',
    summary: 'Two habits that matter most during a long illness',
    minutes: 2,
    sections: [
      {
        heading: 'A fixed time beats a long night',
        paragraphs: [
          'Going to bed and waking at the same hours steadies blood pressure, appetite and mood more reliably than sleeping longer at irregular times. Daytime naps are fine if they are short and early.',
          'If sleep is broken by needing the toilet repeatedly, by breathlessness when lying flat, or by pain, that is worth mentioning to a doctor rather than tolerating.',
        ],
      },
      {
        heading: 'Keep the lower lungs open',
        paragraphs: [
          'Anyone spending long spells in bed loses air movement at the base of the lungs, which is how chest infections begin. Six slow, deep breaths, twice a day, prevents most of it.',
          'Breathe in slowly through the nose until the lower ribs move outward, hold for a moment, then let it go gently. Sitting upright works far better than lying down.',
        ],
      },
    ],
  },
];

export function guideBySlug(slug: string | null): CareGuide | undefined {
  return slug ? CARE_GUIDES.find((g) => g.slug === slug) : undefined;
}
