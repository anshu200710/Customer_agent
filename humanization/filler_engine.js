// filler_engine.js
// Controls backchannels, fillers, timing variance, and natural speech patterns

const FILLERS = {
  // Acknowledgment tokens — used when we understood
  acknowledgment: [
    'Haan.', 'Achha.', 'Theek hai.', 'Samajh gaya.', 'Ji.',
    'Hmm.', 'Achha ji.', 'Theek.', 'Bilkul.', 'Haan ji.'
  ],
  
  // Processing fillers — used while we think
  processing: [
    'Ek second.', 'Dekhta hun.', 'Note kar raha hun.',
    'Theek hai, ek moment.', 'Check karta hun.'
  ],
  
  // Empathy fillers — used when caller has a problem
  empathy: [
    'Samajh gaya, hota hai yeh sab.',
    'Tension mat lijiye.', 'Theek ho jaayega.',
    'Hum handle kar lenge.'
  ],
  
  // Urgency acknowledgment
  urgent: [
    'Bilkul jaldi karte hain.', 'Samajh gaya urgent hai.',
    'Theek hai, abhi karte hain.'
  ],
  
  // Confusion acknowledgment
  confusion: [
    'Koi baat nahi.', 'Theek hai, dobara bataiye.',
    'Samjha nahi, ek baar aur?'
  ],
  
  // Rural/informal variants
  rural: [
    'Arre han.', 'Thao.', 'Acha bhai.',
    'Chal theek hai.', 'Haan yaar.'
  ]
};

// Never use the same filler twice in a row
const fillerHistory = new Map(); // callSid → last used filler

export function getAcknowledgmentFiller(callSid, emotion = 'neutral', isRural = false) {
  const pool = isRural 
    ? [...FILLERS.acknowledgment, ...FILLERS.rural]
    : FILLERS.acknowledgment;
  
  const emotionPool = emotion === 'frustrated' ? [...pool, ...FILLERS.empathy]
    : emotion === 'urgent' ? [...pool, ...FILLERS.urgent]
    : emotion === 'confused' ? [...pool, ...FILLERS.confusion]
    : pool;
  
  const last = fillerHistory.get(callSid);
  const available = emotionPool.filter(f => f !== last);
  const chosen = available[Math.floor(Math.random() * available.length)];
  
  fillerHistory.set(callSid, chosen);
  return chosen;
}

export function getProcessingFiller(callSid) {
  const pool = FILLERS.processing;
  const last = fillerHistory.get(`${callSid}_proc`);
  const available = pool.filter(f => f !== last);
  const chosen = available[Math.floor(Math.random() * available.length)];
  fillerHistory.set(`${callSid}_proc`, chosen);
  return chosen;
}

// Determine if we should add a filler before the main response
// Fillers are SHORT — 1-3 words, spoken first, while LLM generates the real response
export function shouldAddFiller(engine, intent) {
  // Always add filler if LLM will take > 500ms
  // Don't add filler for very short responses (would feel choppy)
  // Don't add same filler twice in a row
  
  if (intent === 'SILENCE' || intent === 'DTMF') return false;
  if (engine.turnCount === 0) return false; // First turn — no filler
  
  // High chance of filler for natural conversation
  return Math.random() > 0.25; // 75% of turns get a filler
}

// Build natural response: [optional filler] + [main response]
// The filler is spoken FIRST (TTS immediately) while LLM generates
export function buildNaturalResponse(filler, mainResponse, options = {}) {
  if (!filler) return mainResponse;
  
  // Don't add filler if main response starts with an acknowledgment
  const mainStarts = mainResponse.toLowerCase().trim();
  const fillerWords = ['haan', 'achha', 'theek', 'ji', 'bilkul'];
  if (fillerWords.some(w => mainStarts.startsWith(w))) {
    return mainResponse; // Main response already has acknowledgment
  }
  
  return `${filler} ${mainResponse}`;
}

// Calculate natural pause duration based on content
export function getNaturalPauseDuration(text, speechStyle = 'standard') {
  const wordCount = text.split(/\s+/).length;
  
  // Base pause after AI speaks (before listening)
  const basePause = speechStyle === 'slow' ? 500 : 200; // ms
  
  // Longer pause for questions (caller needs time to answer)
  const isQuestion = text.includes('?');
  const questionBonus = isQuestion ? 300 : 0;
  
  // Longer pause for urgent situations
  return basePause + questionBonus;
}

// Detect if caller seems elderly or rural based on speech patterns
export function detectSpeechStyle(text, turnHistory = []) {
  const lo = text.toLowerCase();
  
  // Rural indicators
  const ruralWords = ['ryo', 'hai ji', 'tho', 'bhai sahib', 'hukum', 'saa', 'prabhu', 'arre'];
  if (ruralWords.some(w => lo.includes(w))) return 'rural';
  
  // Very slow/halting speech (short inputs over many turns)
  const avgInputLength = turnHistory.length > 3
    ? turnHistory.slice(-3).reduce((s, t) => s + t.text.length, 0) / 3
    : text.length;
  if (avgInputLength < 15) return 'terse'; // Short inputs — ask less, confirm more
  
  return 'standard';
}

// Dynamic response length based on urgency
export function getMaxResponseWords(engine) {
  const urgency = engine.urgencyLevel;
  if (urgency >= 8) return 6;   // Ultra-urgent: max 6 words
  if (urgency >= 5) return 10;  // Urgent: max 10 words
  if (engine.speechStyle === 'slow') return 20; // Elderly: can hear more
  return 14; // Standard
}
