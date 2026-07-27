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
  {
    slug: 'leaving-hospital',
    emoji: '📋',
    title: 'Before you leave the hospital',
    summary: 'The questions worth asking at discharge',
    minutes: 3,
    sections: [
      {
        paragraphs: [
          'Discharge is rushed, usually crowded, and the person being discharged is tired. Most readmissions in the following fortnight trace back to something that was explained once, quickly, at exactly that moment.',
          'Ask these before you leave the ward, and write the answers down.',
        ],
      },
      {
        heading: 'The six questions',
        bullets: [
          'Which of the old medicines do we stop, and which continue?',
          'What is each new medicine for, and for how many days?',
          'What should the wound or the recovery look like on day three, and on day seven?',
          'What would mean we should come back immediately?',
          'When is the follow-up, and who do we call before then?',
          'What can they do — stairs, bathing, lifting, driving — and what must wait?',
        ],
      },
      {
        heading: 'Take the paperwork seriously',
        paragraphs: [
          'Photograph the discharge summary and prescription before you leave the building. Paper gets lost between the hospital and home more often than anyone expects, and the summary is what any other doctor will want to see.',
        ],
      },
    ],
  },
  {
    slug: 'fever-at-home',
    emoji: '🌡️',
    title: 'Fever at home',
    summary: 'What to do, and when it stops being a wait-and-see',
    minutes: 3,
    sections: [
      {
        paragraphs: [
          'Most fevers settle on their own. The judgement worth having is not what the number is, but what else is happening alongside it — and that is usually visible without any medical training.',
        ],
      },
      {
        heading: 'While waiting it out',
        bullets: [
          'Fluids, steadily. Fever loses water faster than usual.',
          'Light clothing and a normally ventilated room. Do not bundle someone up.',
          'Paracetamol at the dose already prescribed, for comfort rather than to chase the number down.',
          'Rest, and a record: temperature, the time, and anything else noticed.',
        ],
      },
      {
        heading: 'Seek care the same day if',
        bullets: [
          'Fever lasting beyond three days, or returning after settling.',
          'Confusion, unusual drowsiness, or difficulty waking the person.',
          'Breathlessness, chest pain, or fast shallow breathing.',
          'A rash that does not fade when pressed.',
          'Persistent vomiting, or no urine for eight hours.',
          'Fever in someone on chemotherapy, on steroids, or recently operated on — this is urgent, not wait-and-see.',
        ],
      },
      {
        paragraphs: [
          'In an elderly person, fever can present as confusion or a fall rather than as heat. A sudden change in how someone is behaving deserves the same attention as a high reading.',
        ],
      },
    ],
  },
  {
    slug: 'eating-to-recover',
    emoji: '🍲',
    title: 'Eating to recover',
    summary: 'Appetite goes first, and it matters more than people think',
    minutes: 3,
    sections: [
      {
        paragraphs: [
          'Illness and surgery both suppress appetite exactly when the body needs building material. Weight lost during a hospital stay is mostly muscle, and muscle is what someone stands up with.',
        ],
      },
      {
        heading: 'Small and often beats three meals',
        paragraphs: [
          'A full plate is discouraging to someone who is not hungry. Six small offerings across the day get more in than three proper meals, and there is less waste.',
        ],
      },
      {
        heading: 'Protein at every one of them',
        bullets: [
          'Dal, rajma, chana — cheap, familiar, and the easiest to increase.',
          'Curd, paneer, milk, eggs.',
          'Fish or chicken if the household eats them.',
          'Peanuts and seeds, if chewing is comfortable.',
        ],
      },
      {
        heading: 'When swallowing is hard',
        paragraphs: [
          'Softer textures and thicker liquids are usually easier than thin water, which is the thing most likely to go down the wrong way. Sitting fully upright to eat, and staying upright for half an hour afterwards, prevents a great deal of trouble.',
          'Coughing or a wet-sounding voice during meals is worth reporting to a doctor rather than working around.',
        ],
      },
    ],
  },
  {
    slug: 'blood-pressure-at-home',
    emoji: '🩺',
    title: 'Measuring blood pressure at home',
    summary: 'Most home readings are wrong for avoidable reasons',
    minutes: 2,
    sections: [
      {
        paragraphs: [
          'Home monitors are genuinely useful, and most of the readings people bring to appointments are unusable — taken straight after climbing stairs, with the arm hanging down, over a sleeve.',
        ],
      },
      {
        heading: 'How to get a reading worth having',
        bullets: [
          'Sit for five quiet minutes first. No tea, no smoking, no exercise in the half hour before.',
          'Back supported, feet flat on the floor, legs uncrossed.',
          'Bare arm resting on a table, cuff at the level of the heart.',
          'Do not talk during the measurement.',
          'Take two readings a minute apart and record both.',
        ],
      },
      {
        heading: 'What to do with the numbers',
        paragraphs: [
          'Keep a simple log with date and time — morning and evening is the usual pattern — and take it to appointments. A trend across two weeks tells a doctor far more than any single reading.',
          'Do not change a dose based on a home reading. That is a conversation, not a decision to make at the table.',
        ],
      },
    ],
  },
  {
    slug: 'bed-rest-skin',
    emoji: '🛏️',
    title: 'Caring for someone in bed',
    summary: 'Pressure sores form in hours and take months to heal',
    minutes: 3,
    sections: [
      {
        paragraphs: [
          'Someone who cannot shift their own weight can develop a pressure sore over a single long night. Prevention is almost entirely mechanical, and it works.',
        ],
      },
      {
        heading: 'Change position every two hours',
        paragraphs: [
          'Alternate between the back and each side. A pillow behind the back holds a side-lying position, and a pillow between the knees keeps bony points apart.',
          'Heels are the most commonly missed spot. A pillow under the calves to float the heels clear of the mattress prevents most heel sores outright.',
        ],
      },
      {
        heading: 'Look at the skin daily',
        paragraphs: [
          'Check the tailbone, hips, heels, elbows and the back of the head. Redness that does not fade a few minutes after the pressure is relieved is the first stage of a sore — act on it immediately by keeping all weight off that area, and tell a doctor.',
          'Keep skin clean and dry, particularly after any incontinence. Moisture plus pressure is what breaks skin down.',
        ],
      },
      {
        heading: 'Keep the body moving anyway',
        paragraphs: [
          'Gentle ankle circles, bending and straightening the knees, lifting the arms — a few minutes several times a day preserves joint movement and circulation, even when someone cannot get out of bed.',
        ],
      },
    ],
  },
  {
    slug: 'dementia-day',
    emoji: '🧠',
    title: 'Making the day easier with dementia',
    summary: 'Routine does more than any argument',
    minutes: 3,
    sections: [
      {
        paragraphs: [
          'Memory loss is the part everyone knows about. The part families find hardest is the agitation, the repetition and the resistance at bath time — and those respond to how the day is arranged far more than to explanation.',
        ],
      },
      {
        heading: 'Keep the shape of the day the same',
        paragraphs: [
          'Same waking time, same meal times, same order of things. Predictability does the work that memory no longer can, and a familiar sequence removes dozens of small decisions.',
          'Put the demanding tasks — bathing, appointments, outings — in the part of the day when they are usually at their best, most often the morning.',
        ],
      },
      {
        heading: 'Do not correct, redirect',
        paragraphs: [
          'Being told they are wrong about a fact does not restore the fact; it produces distress that outlasts the conversation. Acknowledge the feeling, then move to something else — a task, a photograph, going to another room.',
          'Repeated questions are usually anxiety wearing a factual costume. Answering the worry calms it; answering the question does not.',
        ],
      },
      {
        heading: 'Reduce what the room demands',
        bullets: [
          'One thing at a time — television off during meals and conversation.',
          'Good lighting, especially late afternoon, when confusion often worsens.',
          'Clear labels on doors and drawers.',
          'Something identifying on the person, in case they walk out.',
        ],
      },
      {
        paragraphs: [
          'A sudden worsening over days — not months — is often infection, pain or a new medicine rather than the dementia itself. That is worth a doctor, promptly.',
        ],
      },
    ],
  },
];

export function guideBySlug(slug: string | null): CareGuide | undefined {
  return slug ? CARE_GUIDES.find((g) => g.slug === slug) : undefined;
}

/**
 * Order for the home strip, rotated by day so it is not the same cards every
 * time the app opens.
 *
 * `dayIndex` is supplied by the caller rather than read from Date here: the home
 * page is statically prerendered, so a Date read during render would bake in the
 * build date on the server and disagree with the client on every later day.
 * The component resolves it hydration-safely and passes it in.
 */
export function rotatedGuides(dayIndex: number, exclude?: string): CareGuide[] {
  const pool = exclude ? CARE_GUIDES.filter((g) => g.slug !== exclude) : CARE_GUIDES;
  if (pool.length === 0) return pool;
  const offset = ((dayIndex % pool.length) + pool.length) % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

export function daysSinceEpoch(now: number): number {
  return Math.floor(now / 86_400_000);
}
