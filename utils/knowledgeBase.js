/**
 * knowledgeBase.js
 * ================
 * Knowledge Base for JCB Voice Agent "Priya" — Rajesh Motors
 *
 * REWRITE NOTES (based on audio analysis of 8 real calls + 50 TC examples):
 *
 * AUDIO FACTS:
 *   - 74% of all speech bursts are <0.5s  → short acks dominate
 *   - 92% of bursts are <1.0s             → customers are terse
 *   - Max real burst: 7.74s               → multi-complaint explanations
 *   - Median gap between turns: 0.34s     → customers respond FAST
 *   - Avg turns per call: 95, max: 186    → old limit of 25-60 killed calls
 *   - Long gaps (>5s) = only 2% of gaps  → those are the BOT talking, not silence
 *
 * KEY DESIGN RULES FROM 50 TC EXAMPLES:
 *   - NEVER re-ask a field already given
 *   - Short acks ("haan", "ok") = fast-path, no LLM needed
 *   - "nahi" at final confirm = "no more problems" = SUBMIT
 *   - City confirmation step = REMOVED (adds turn, not in any TC example)
 *   - Phone pre-confirmation = ask directly, then confirm last 2 digits
 *   - Side questions → answer in 1 sentence + redirect to next field
 *   - Angry/frustrated → empathy 1 sentence + redirect, never argue
 */

export const KNOWLEDGE_BASE = {

  /* ─────────────────────────────────────────────────────────────
     IDENTITY
  ───────────────────────────────────────────────────────────── */
  identity: {
    questions: [
      "tum kaun ho", "aap kaun ho", "tumhara naam", "aapka naam",
      "kaun bol raha hai", "kaun bol rahi hai", "main kisse baat",
      "company ka naam", "aap kahan se ho", "tum kahan se ho",
      "service center ka naam", "rajesh motors kya hai", "aapka company",
      "hello who is this", "kon hai", "kaun hai", "aap kon hain",
      "kisse baat kar raha", "kaun hai baat kar rahi"
    ],
    answer: "Priya hun, Rajesh Motors se."
  },

  /* ─────────────────────────────────────────────────────────────
     COMPANY INFO
  ───────────────────────────────────────────────────────────── */
  company: {
    questions: [
      "rajesh motors kahan hai", "service center kahan hai", "branches kahan",
      "workshop kahan hai", "nearest service center", "office kahan"
    ],
    answer: "Rajesh Motors Rajasthan mein hai."
  },

  /* ─────────────────────────────────────────────────────────────
     PURPOSE
  ───────────────────────────────────────────────────────────── */
  purpose: {
    questions: [
      "kya chahiye", "kya kaam hai", "kya karna hai", "kya reason hai",
      "kya matlab", "kyu call kiya", "kyu phone kiya",
      "kya hai ye call", "kaisi call", "kya service", "kya help",
      "kya kar rahe ho", "kya baat hai", "kuch chahiye"
    ],
    answer: "JCB complaint ke liye."
  },

  /* ─────────────────────────────────────────────────────────────
     ENGINEER TIMING
  ───────────────────────────────────────────────────────────── */
  engineer_timing: {
    questions: [
      "engineer kab aayega", "kab aayega", "kitna time lagega", "kab tak aayega",
      "kitni der mein", "jaldi bhejo", "urgent hai", "abhi bhejo",
      "engineer aaya nahi", "bahut der ho gayi", "2 din ho gaye", "kal se wait",
      "engineer kitni der mein", "kab contact karega", "kitne ghante"
    ],
    answer: "2-4 ghante mein call karega."
  },

  /* ─────────────────────────────────────────────────────────────
     CHARGES & WARRANTY
  ───────────────────────────────────────────────────────────── */
  charges: {
    questions: [
      "kitna charge", "kitna paisa", "cost", "fee", "price lagega",
      "paise lagenge", "kitna rupaya", "charge kya hai", "payment"
    ],
    answer: "Warranty mein free hai."
  },

  warranty: {
    questions: [
      "warranty", "waranti", "warranty mein hai", "warranty ka kya",
      "warranty cover", "warranty kab tak", "free repair"
    ],
    answer: "Engineer batayega."
  },

  /* ─────────────────────────────────────────────────────────────
     CHASSIS NUMBER HELP
  ───────────────────────────────────────────────────────────── */
  chassis_help: {
    questions: [
      "chassis number kahan milega", "chassis number kaise pata", "machine pe kahan",
      "number kahan likha hai", "plate kahan hai", "chassis nahi pata",
      "number bhool gaya", "machine number kya hai", "serial number kahan",
      "chassis kahan dekhu", "machine ka number kahan"
    ],
    answer: "Machine pe plate hai, 7 digit number."
  },

  /* ─────────────────────────────────────────────────────────────
     PHONE NUMBER HELP
  ───────────────────────────────────────────────────────────── */
  phone_help: {
    questions: [
      "phone number kyu chahiye", "mobile kyu pooch rahe", "number ka use",
      "number kyu save", "call kyu aayega", "kya karenge is number se",
      "number kya karna hai", "kya kaam hai iska", "kya karoge isse"
    ],
    answer: "Engineer call ke liye."
  },

  /* ─────────────────────────────────────────────────────────────
     SMS CONFIRMATION
  ───────────────────────────────────────────────────────────── */
  sms: {
    questions: [
      "sms aayega", "message aayega", "confirmation aayega", "proof milega",
      "complaint number kahan", "kaise pata chalega", "sms bhejo"
    ],
    answer: "SMS aayega."
  },

  /* ─────────────────────────────────────────────────────────────
     ENGINEER CALL BEFORE COMING (TC-38)
  ───────────────────────────────────────────────────────────── */
  engineer_call: {
    questions: [
      "engineer pehle call karega", "call karega ya seedha", "pehle batayega",
      "bina bataye aayega", "inform karega", "call aayega pehle"
    ],
    answer: "Pehle call karega."
  },

  /* ─────────────────────────────────────────────────────────────
     SUNDAY / HOLIDAY (TC-45)
  ───────────────────────────────────────────────────────────── */
  sunday: {
    questions: [
      "aaj sunday hai", "sunday ko aayega", "holiday", "band din",
      "chutti ka din", "sunday service", "holiday service"
    ],
    answer: "Sunday bhi aayega."
  },

  /* ─────────────────────────────────────────────────────────────
     COMPLAINT STATUS / EXISTING COMPLAINT
  ───────────────────────────────────────────────────────────── */
  complaint_status: {
    questions: [
      "pehle complaint", "pehli complaint", "already complaint", "complaint kar diya",
      "complaint ki thi", "pichla complaint", "status kya hai", "complaint number"
    ],
    answer: "Chassis number bataiye, pehle wali complaint check karti hun."
  },

  /* ─────────────────────────────────────────────────────────────
     REFUND (TC-16)
  ───────────────────────────────────────────────────────────── */
  refund: {
    questions: [
      "refund chahiye", "paisa wapas", "refund karo", "paise do wapas",
      "money back", "return karo"
    ],
    answer: "Refund ke liye engineer visit ke baad process hoga."
  },

  /* ─────────────────────────────────────────────────────────────
     ANGRY / FRUSTRATED TRIGGERS & RESPONSES
     Audio analysis: short rapid bursts with higher amplitude = frustration
  ───────────────────────────────────────────────────────────── */
  angry_acknowledgment: {
    triggers: [
      "bahut der", "kab se wait", "kal se", "2 din", "3 din", "engineer nahi aaya",
      "aaya nahi", "koi nahi aaya", "response nahi", "ignore", "dhyaan nahi",
      "bahut bura", "bekar", "kharab service", "bakwaas", "kuch nahi hota",
      "baar baar call", "koi nahi uthata", "nahi uthata", "5 baar call",
      "gussa", "pareshaan", "bahut problem", "frustrated", "kharaab",
      "baat nahi karta", "koi sun nahi raha", "koi dhyan nahi"
    ],
    responses: [
      "Samajh rahi hun, pareshani hui. Abhi solve karti hun.",
      "Maafi chahti hun delay ke liye. Priority pe leti hun abhi.",
      "Samajh rahi hun. Complaint escalate karti hun.",
      "Sorry aapko wait karna pada. Abhi jaldi karte hain."
    ]
  },

  /* ─────────────────────────────────────────────────────────────
     HOLD / WAIT RESPONSES
     Audio: customers frequently say "ek minute", "ruko" mid-turn
  ───────────────────────────────────────────────────────────── */
  hold_responses: ["Zarur.", "Haan.", "Ruko.", "Theek hai."],

  /* ─────────────────────────────────────────────────────────────
     SILENCE RESPONSES (brief — median real gap is 0.34s)
  ───────────────────────────────────────────────────────────── */
  silence_responses: [
    "Bataiye.",
    "Sun rahi hun.",
    "Haan?",
    "Kya problem hai?",
    "Bataiye, main yahan hun."
  ],

  /* ─────────────────────────────────────────────────────────────
     CONFUSION
  ───────────────────────────────────────────────────────────── */
  confusion_responses: [
    "Thoda clear bataiye.",
    "Dobara bataiye.",
    "Samajh nahi aaya — kya problem hai machine mein?",
    "Sahi se nahi suna. Kya problem hai?"
  ],

  /* ─────────────────────────────────────────────────────────────
     MACHINE NOT FOUND (Matches WantsFlow TC-06, TC-07 patterns)
  ───────────────────────────────────────────────────────────── */
  machine_not_found_responses: [
    "Ye number nahi mila ji. Ek baar phir bataiye.",
    "Ye bhi nahi mila ji. Ek baar aur check karein.",
    "Chassis nahi mila ji. Engineer ko bhej raha hun, wo directly aayega. Dhanyavaad!"
  ],

  /* ─────────────────────────────────────────────────────────────
     FINAL CONFIRMATION PROMPTS (varied — TC examples show natural phrasing)
     Matches WantsFlow patterns: "Aur koi problem hai? Ya save kar dun?"
  ───────────────────────────────────────────────────────────── */
  final_confirm_prompts: [
    "Aur koi problem hai? Ya save kar dun?",
    "Kuch aur bataana hai? Warna complaint register karte hain.",
    "Aur kuch baaki hai? Ya kar dun register?",
    "Aur koi problem to nahi hai? Save kar dun?"
  ],

  /* ─────────────────────────────────────────────────────────────
     SUCCESS (Matches WantsFlow patterns)
  ───────────────────────────────────────────────────────────── */
  success_base: "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!",
  success_with_id: "Complaint register ho gayi ji. Number hai {id}. Engineer jaldi aayega. Dhanyavaad!",

  /* ─────────────────────────────────────────────────────────────
     CONFIRMATION TRIGGER LISTS
  ───────────────────────────────────────────────────────────── */
  positive_triggers: [
    "haan", "ha", "han", "theek hai", "thik hai", "save", "kar do",
    "register", "done", "yes", "bilkul", "sahi hai", "ok", "okay",
    "theek", "chalo", "hmm", "bas itna", "bas itni", "ho gaya", "sahi",
    "kar dena", "bhar do", "likh do", "note kar", "haa", "acha", "achha",
    "correct", "sach mein", "bilkul sahi"
  ],

  // ONLY these = hard cancel (not "nahi" alone — that means "no more problems")
  negative_cancel_triggers: [
    "band karo", "mat karo", "cancel", "ruk ja", "nahin chahiye",
    "chhod do", "nahi karna", "band kar", "rokk do", "rehne do"
  ],

  // "nahi" alone at final confirm = no more problems = SUBMIT (per TC analysis)
  no_more_problems_triggers: [
    "nahi", "nai", "nahin", "no", "bas", "bas itna", "bas itni",
    "kuch nahi", "aur nahi", "nahi hai", "itna hi", "yahi hai",
    "theek hai bas", "ho gaya", "nahi kuch aur", "koi nahi", "aur nahi hai"
  ],

  /* ─────────────────────────────────────────────────────────────
     COMPLAINT TYPES
  ───────────────────────────────────────────────────────────── */
  complaint_types: [
    "Engine Not Starting", "Service/Filter Change", "Engine Smoke",
    "Engine Overheating", "Oil Leakage", "Hydraulic System Failure",
    "Accelerator Problem", "AC Not Working", "Brake Failure",
    "Electrical Problem", "Tire Problem", "Abnormal Noise",
    "Steering Problem", "Transmission Problem", "Coolant Leakage",
    "Battery Problem", "Boom/Arm Failure", "Turbocharger Issue",
    "General Problem"
  ]
};

/* ═══════════════════════════════════════════════════════════════
   EXPORTED HELPERS
═══════════════════════════════════════════════════════════════ */

/**
 * Answer a side question in 1 sentence. Returns null if not matched.
 * Used to answer + then redirect to next field.
 */
export function getSideAnswer(text) {
  if (!text) return null;
  const lo = text.toLowerCase();

  for (const [category, data] of Object.entries(KNOWLEDGE_BASE)) {
    if (category === "angry_acknowledgment") continue;
    if (!data.questions || !data.answer) continue;
    if (data.questions.some(q => lo.includes(q))) {
      return data.answer;
    }
  }
  return null;
}

/**
 * Detect angry/frustrated customer.
 * Returns empathy response or null.
 * Based on audio: short rapid bursts with higher amplitude.
 */
export function getAngryResponse(text) {
  if (!text) return null;
  const lo = text.toLowerCase();
  const triggers = KNOWLEDGE_BASE.angry_acknowledgment.triggers;
  if (triggers.some(t => lo.includes(t))) {
    const responses = KNOWLEDGE_BASE.angry_acknowledgment.responses;
    return responses[Math.floor(Math.random() * responses.length)];
  }
  return null;
}

/**
 * Detect hold/wait intent ("ek minute", "ruko", etc.)
 */
export function isHoldIntent(text) {
  if (!text) return false;
  return /^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda ruko|leke aata|bas|thoda wait)\s*$/i.test(text.trim());
}

/**
 * Get silence response based on consecutive silence count.
 */
export function getSilenceResponse(silenceCount = 1) {
  const r = KNOWLEDGE_BASE.silence_responses;
  return r[Math.min(silenceCount - 1, r.length - 1)] || r[0];
}

/**
 * Get machine-not-found message.
 */
export function getMachineNotFoundResponse() {
  return pickRandom(KNOWLEDGE_BASE.machine_not_found_responses);
}

/**
 * Get final confirm prompt — varied to avoid repetition.
 */
export function getFinalConfirmPrompt() {
  return pickRandom(KNOWLEDGE_BASE.final_confirm_prompts);
}

/**
 * Get success message after complaint registered.
 */
export function getSuccessMessage(id = null) {
  if (id) {
    return KNOWLEDGE_BASE.success_with_id.replace("{id}", String(id).split("").join(" "));
  }
  return KNOWLEDGE_BASE.success_base;
}

/**
 * Is this a positive confirmation?
 * Audio data: 74% of bursts <0.5s = short acks like "haan", "ok"
 */
export function isPositiveConfirmation(text) {
  if (!text) return false;
  const lo = text.toLowerCase().trim();
  return KNOWLEDGE_BASE.positive_triggers.some(t => lo.includes(t));
}

/**
 * Is this a HARD cancel (not just "nahi" = no more problems)?
 * Only matches explicit cancel phrases.
 */
export function isHardCancel(text) {
  if (!text) return false;
  const lo = text.toLowerCase();
  return KNOWLEDGE_BASE.negative_cancel_triggers.some(t => lo.includes(t));
}

/**
 * "nahi" at final confirm = no more problems = SUBMIT.
 * This is the correct interpretation per TC-01 through TC-50.
 */
export function isNoMoreProblems(text) {
  if (!text) return false;
  const lo = text.toLowerCase().trim();
  return KNOWLEDGE_BASE.no_more_problems_triggers.some(t => lo === t || lo.startsWith(t + " ") || lo.endsWith(" " + t));
}

/**
 * Check if customer wants to add more problems.
 */
export function isAddMoreProblem(text) {
  if (!text) return false;
  const lo = text.toLowerCase();
  const hasAddWord = /(aur (problem|complaint|issue|bhi|koi aur)|additional|extra|dusri|phir se|another|aur kuch)/.test(lo);
  return hasAddWord && !isHardCancel(text);
}

/**
 * Is this a short acknowledgment that should bypass LLM?
 * Audio data: 74% of turns are <0.5s = "haan", "ok", "theek", etc.
 * These should be fast-pathed — no Groq call needed.
 */
export function isShortAck(text) {
  if (!text) return false;
  const lo = text.toLowerCase().trim();
  return /^(haan|ha|han|ok|okay|theek|hmm|acha|achha|hm|ji|yes|nahi|nai|no|haa|sahi|correct|bilkul|acha|thik)$/i.test(lo);
}

/**
 * Get hold response.
 */
export function getHoldResponse() {
  return pickRandom(KNOWLEDGE_BASE.hold_responses);
}

/* Internal */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default {
  KNOWLEDGE_BASE,
  getSideAnswer,
  getAngryResponse,
  isHoldIntent,
  getSilenceResponse,
  getMachineNotFoundResponse,
  getFinalConfirmPrompt,
  getSuccessMessage,
  isPositiveConfirmation,
  isHardCancel,
  isNoMoreProblems,
  isAddMoreProblem,
  isShortAck,
  getHoldResponse,
};