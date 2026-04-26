export type ArchetypeName =
  | 'Peacemaker'
  | 'Courageous Leader'
  | 'Deep Feeler'
  | 'Faithful Steward'
  | 'Light Bearer'
  | 'Truth Seeker'
  | 'Justice Carrier';

export interface ArchetypePreviewContent {
  narrative: string;
  strengths: string[];
  shadowPatterns: string[];
  growthPath: string;
}

export const ARCHETYPE_CONTENT: Record<ArchetypeName, {
  narrative: string;
  strengths: string[];
  stuckPatterns: string[];
  stuckToStrength: { stuck: string; pathForward: string; appHelp: string }[];
  growthPath: string;
}> = {
  'Peacemaker': {
    narrative: "You carry a rare gift—the ability to hold space without losing yourself. You sense tension before it surfaces and instinctively move toward harmony. This isn't weakness. It's a form of strength the world desperately needs. People feel safe around you. You create room for others to breathe.",
    strengths: ['Deep presence', 'Empathy and attunement', 'De-escalation', 'Creating safety'],
    stuckPatterns: ['Avoiding necessary conflict', 'Losing your voice to keep the peace', "Carrying others' emotions as your own"],
    stuckToStrength: [
      { stuck: "Avoiding necessary conflict", pathForward: "Speak truth with love", appHelp: "Your daily alignments will gently build your voice through small, safe acts of honest expression." },
      { stuck: "Losing your voice to keep the peace", pathForward: "Reclaim your needs as sacred", appHelp: "Each practice is designed to help you honour your own design, not just others'." },
      { stuck: "Carrying others' emotions as your own", pathForward: "Hold space without absorbing", appHelp: "Somatic cues in your alignments teach you to feel deeply while staying rooted in yourself." },
    ],
    growthPath: "Learn to speak your truth as an act of love—not just for others, but for yourself.",
  },
  'Courageous Leader': {
    narrative: "You were made to move. When others hesitate, you step forward. You carry vision and the courage to act on it—even when the path isn't clear. Your leadership isn't about control. It's about calling others into what's possible. You see the horizon when others see only the obstacle.",
    strengths: ['Vision and initiative', 'Decisiveness under pressure', 'Inspiring others forward', 'Resilience'],
    stuckPatterns: ['Moving too fast', 'Carrying the weight alone', 'Confusing busyness with purpose'],
    stuckToStrength: [
      { stuck: "Moving too fast", pathForward: "Lead from stillness", appHelp: "Your alignments include pause practices that train you to act from clarity, not urgency." },
      { stuck: "Carrying the weight alone", pathForward: "Invite others into the vision", appHelp: "Reflection prompts will surface where you're over-functioning and invite you to release." },
      { stuck: "Confusing busyness with purpose", pathForward: "Rest as a leadership act", appHelp: "Sacred Design tracks your consistency so you can see that small, steady steps outpace frantic effort." },
    ],
    growthPath: "True leadership begins in stillness. Let your vision be shaped by listening before leading.",
  },
  'Deep Feeler': {
    narrative: "You experience the world at a depth most people never reach. Your sensitivity is not a flaw—it's a form of perception. You feel what others miss, and that capacity for depth is one of your greatest gifts. You bring meaning to moments others pass by without noticing.",
    strengths: ['Emotional intelligence', 'Depth of connection', 'Creativity and intuition', 'Empathy'],
    stuckPatterns: ['Emotional overwhelm', "Absorbing others' pain", 'Withdrawing when hurt'],
    stuckToStrength: [
      { stuck: "Emotional overwhelm", pathForward: "Feel fully, stay grounded", appHelp: "Somatic cues in every alignment anchor your emotions in your body so they move through rather than consume you." },
      { stuck: "Absorbing others' pain", pathForward: "Compassion with boundaries", appHelp: "Your practices will build the inner container that lets you love others without losing yourself." },
      { stuck: "Withdrawing when hurt", pathForward: "Stay present through discomfort", appHelp: "Daily micro-practices build the courage to remain open even when your instinct is to retreat." },
    ],
    growthPath: "Your depth is a gift, not a burden. Learn to feel fully without losing your footing.",
  },
  'Faithful Steward': {
    narrative: "You are the one who shows up—quietly, consistently, without needing recognition. You build things that last. You care for what others overlook. Your faithfulness is a form of love that shapes the world in ways that rarely make headlines. Reliability is your signature.",
    strengths: ['Reliability and follow-through', 'Attention to detail', 'Creating order', 'Long-term thinking'],
    stuckPatterns: ['Perfectionism', 'Difficulty delegating', 'Finding worth in productivity'],
    stuckToStrength: [
      { stuck: "Perfectionism", pathForward: "Done is sacred", appHelp: "Alignments are intentionally small — they train you to find worth in completion, not perfection." },
      { stuck: "Difficulty delegating", pathForward: "Trust others as part of the design", appHelp: "Reflection prompts will reveal where control is costing you and invite you to release with faith." },
      { stuck: "Finding worth in productivity", pathForward: "You are enough before the work", appHelp: "Your streak and progress are tracked to show you that showing up matters more than output." },
    ],
    growthPath: "Rest is not a reward for finishing—it's part of the design. You are enough before the work is done.",
  },
  'Light Bearer': {
    narrative: "You carry something that draws people in—a warmth, an encouragement, a sense that things can be better. You see potential where others see problems. Your presence lifts rooms and your words plant seeds that grow long after you've moved on. Hope is your native language.",
    strengths: ['Encouragement and hope', 'Seeing potential', 'Creating belonging', 'Inspiring growth'],
    stuckPatterns: ['Suppressing your own struggles to stay positive', 'People-pleasing', 'Neglecting your own needs'],
    stuckToStrength: [
      { stuck: "Suppressing your own struggles to stay positive", pathForward: "Your darkness is part of your light", appHelp: "Reflection prompts create a private, honest space where you don't have to perform wholeness." },
      { stuck: "People-pleasing", pathForward: "Encourage yourself first", appHelp: "Your alignments are personalised to your design — a daily reminder that your needs are worth tending." },
      { stuck: "Neglecting your own needs", pathForward: "Fill before you pour", appHelp: "Sacred Design builds a rhythm of self-care so consistent it becomes your new normal." },
    ],
    growthPath: "You can only give light from a place of being filled. Tend to your own soul first.",
  },
  'Truth Seeker': {
    narrative: "You are wired for depth and clarity. You ask the questions others avoid and sit with complexity without rushing to easy answers. Your mind is a gift—and so is your willingness to pursue what's real, even when it's uncomfortable. You help others see what they couldn't see alone.",
    strengths: ['Discernment and wisdom', 'Intellectual depth', 'Honesty', 'Pattern recognition'],
    stuckPatterns: ['Overthinking', 'Isolation', 'Using analysis to avoid vulnerability'],
    stuckToStrength: [
      { stuck: "Overthinking", pathForward: "Trust the body's knowing", appHelp: "Somatic cues in your alignments bring you out of your head and into embodied wisdom." },
      { stuck: "Isolation", pathForward: "Seek truth in community", appHelp: "Reflection prompts gently surface where solitude has become hiding, and invite you back." },
      { stuck: "Using analysis to avoid vulnerability", pathForward: "Let truth land in the heart", appHelp: "Your practices are designed to move insight from intellectual understanding into lived experience." },
    ],
    growthPath: "Truth is not only found in the mind. Let your heart and body be part of the search.",
  },
  'Justice Carrier': {
    narrative: "You feel the weight of what's wrong in the world—and you can't look away. That fire in you is not anger without purpose. It's love with direction. You were made to stand in the gap, to speak up, to move toward what others walk past. Your courage is a form of compassion.",
    strengths: ['Moral clarity and courage', 'Advocacy', 'Persistence', 'Compassion for the marginalized'],
    stuckPatterns: ['Burnout', 'Righteous anger becoming bitterness', "Carrying the world's pain alone"],
    stuckToStrength: [
      { stuck: "Burnout", pathForward: "Sustain the mission by sustaining yourself", appHelp: "Daily alignments are short by design — they teach you that consistency beats intensity." },
      { stuck: "Righteous anger becoming bitterness", pathForward: "Grieve before you fight", appHelp: "Reflection prompts create space to process pain so it fuels rather than consumes your purpose." },
      { stuck: "Carrying the world's pain alone", pathForward: "You are part of a larger design", appHelp: "Sacred Design reminds you daily that your role is faithfulness, not fixing everything." },
    ],
    growthPath: "Sustainable justice flows from a grounded soul. You cannot pour from empty.",
  },
};

export function getPreviewContent(archetype: string): ArchetypePreviewContent {
  const content = ARCHETYPE_CONTENT[archetype as ArchetypeName];
  if (!content) {
    console.log('[ArchetypeContent] Preview fallback used — unknown archetype:', archetype);
    return {
      narrative: "You carry a unique design that shapes how you move through the world. Your gifts are real, your patterns are learnable, and your growth path is already within you.",
      strengths: ['Deep awareness', 'Authentic presence', 'Purposeful living'],
      shadowPatterns: ['Patterns that keep you stuck', 'Habits that drain your energy'],
      growthPath: "Your growth path is waiting to be revealed.",
    };
  }
  return {
    narrative: content.narrative,
    strengths: content.strengths,
    shadowPatterns: content.stuckPatterns,
    growthPath: content.growthPath,
  };
}
