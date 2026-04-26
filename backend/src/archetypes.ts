export interface Archetype {
  name: string;
  coreStruggle: string;
  growthEdge: string;
  behavioralShift: string;
  actionCategories: string[];
}

export const ARCHETYPES: Record<string, Archetype> = {
  peacemaker: {
    name: 'Peacemaker',
    coreStruggle: 'avoiding conflict at the cost of self-expression',
    growthEdge: 'honest expression without losing connection',
    behavioralShift: 'from silence → to voice',
    actionCategories: ['honest communication', 'boundary setting', 'emotional awareness', 'asking for needs', 'staying present'],
  },
  truthseeker: {
    name: 'Truth Seeker',
    coreStruggle: 'over-analyzing to avoid vulnerability',
    growthEdge: 'trusting felt experience alongside rational thought',
    behavioralShift: 'from analysis → to presence',
    actionCategories: ['emotional awareness', 'staying present', 'slowing down', 'expression', 'decision making'],
  },
  caregiver: {
    name: 'Caregiver',
    coreStruggle: 'giving to others while neglecting personal needs',
    growthEdge: 'receiving care and setting limits without guilt',
    behavioralShift: 'from self-sacrifice → to self-inclusion',
    actionCategories: ['asking for needs', 'boundary setting', 'emotional awareness', 'restraint', 'honest communication'],
  },
  leader: {
    name: 'Leader',
    coreStruggle: 'controlling outcomes to manage fear of failure',
    growthEdge: 'trusting others and releasing the need to direct everything',
    behavioralShift: 'from control → to trust',
    actionCategories: ['releasing control', 'decision making', 'boundary setting', 'staying present', 'emotional awareness'],
  },
  creator: {
    name: 'Creator',
    coreStruggle: 'fear of judgment blocking authentic expression',
    growthEdge: 'creating and sharing without needing approval',
    behavioralShift: 'from hiding → to expressing',
    actionCategories: ['expression', 'emotional awareness', 'honest communication', 'staying present', 'releasing control'],
  },
  achiever: {
    name: 'Achiever',
    coreStruggle: 'tying self-worth to productivity and external results',
    growthEdge: 'resting in identity beyond performance',
    behavioralShift: 'from doing → to being',
    actionCategories: ['slowing down', 'restraint', 'staying present', 'emotional awareness', 'asking for needs'],
  },
  visionary: {
    name: 'Visionary',
    coreStruggle: 'living in future possibility while avoiding present discomfort',
    growthEdge: 'grounding vision in daily, embodied action',
    behavioralShift: 'from dreaming → to doing',
    actionCategories: ['staying present', 'decision making', 'slowing down', 'emotional awareness', 'honest communication'],
  },
  guardian: {
    name: 'Guardian',
    coreStruggle: 'protecting others through vigilance at the cost of openness',
    growthEdge: 'allowing vulnerability and softening defensive patterns',
    behavioralShift: 'from guarding → to opening',
    actionCategories: ['emotional awareness', 'honest communication', 'staying present', 'expression', 'asking for needs'],
  },
  connector: {
    name: 'Connector',
    coreStruggle: 'seeking belonging by adapting self to fit others',
    growthEdge: 'maintaining identity while staying in relationship',
    behavioralShift: 'from merging → to individuation',
    actionCategories: ['boundary setting', 'honest communication', 'emotional awareness', 'asking for needs', 'decision making'],
  },
  sage: {
    name: 'Sage',
    coreStruggle: 'withdrawing into wisdom to avoid emotional engagement',
    growthEdge: 'bringing insight into relational, embodied presence',
    behavioralShift: 'from observing → to participating',
    actionCategories: ['staying present', 'expression', 'emotional awareness', 'honest communication', 'asking for needs'],
  },
};

export function getArchetype(name: string): Archetype | null {
  const normalized = name.toLowerCase().replace(/\s+/g, '');
  return ARCHETYPES[normalized] || null;
}
