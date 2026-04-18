/**
 * knowledgeBase.js
 * ================
 * Comprehensive Knowledge Base for JCB Customer Service Agent (Priya)
 * Corrected based on real call audio analysis:
 *   - Real calls run 100+ turns — no hard cutoff at 25
 *   - Customer speech bursts avg 1-4s, max ~7.4s
 *   - Short ack turns (< 1.5s) are very common: "haan", "theek hai", "ok"
 *   - Between-turn pauses typically 0.3–1.5s
 *   - All responses must sound natural, NOT scripted
 */

export const KNOWLEDGE_BASE = {

  /* ═══════════════════════════════════════════════════════════════
     IDENTITY & INTRODUCTION
  ═══════════════════════════════════════════════════════════════ */
  identity: {
    questions: [
      "tum kaun ho", "aap kaun ho", "tumhara naam", "aapka naam",
      "kaun bol raha hai", "kaun bol rahi hai", "main kisse baat",
      "company ka naam", "aap kahan se ho", "tum kahan se ho",
      "service center ka naam", "rajesh motors kya hai", "aapka company",
      "hello who is this", "kon hai", "kaun hai", "aap kon hain",
      "kaisi baat", "kaisi service", "aapka contact", "kisse baat kar raha"
    ],
    answer: "Main Priya hun, Rajesh Motors se. JCB service ke liye aapki madad kar rahi hun."
  },

  /* ═══════════════════════════════════════════════════════════════
     COMPANY INFO
  ═══════════════════════════════════════════════════════════════ */
  company: {
    questions: [
      "rajesh motors kahan hai", "service center kahan hai", "branches kahan",
      "workshop kahan hai", "nearest service center", "office kahan"
    ],
    answer: "Rajesh Motors Rajasthan ke main cities mein hai. Aapki machine ke paas ka engineer contact karega."
  },

  /* ═══════════════════════════════════════════════════════════════
     PURPOSE / WHAT DO YOU WANT
  ═══════════════════════════════════════════════════════════════ */
  purpose: {
    questions: [
      "kya chahiye", "kya kaam hai", "kya karna hai", "kya reason hai",
      "kya matlab", "kya purpose", "kyu call kiya", "kyu phone kiya",
      "kya hai ye call", "kaisi call", "kya service", "kya help",
      "kya kar rahe ho", "kya baat hai", "kya reason", "kya request",
      "kuch chahiye", "kuch kaam hai", "kuch help chahiye"
    ],
    answer: "JCB machine ki service ke liye baat kar rahi hun. Chassis number bataiye."
  },

  /* ═══════════════════════════════════════════════════════════════
     ENGINEER TIMING
  ═══════════════════════════════════════════════════════════════ */
  engineer_timing: {
    questions: [
      "engineer kab aayega", "kab aayega", "kitna time lagega", "kab tak aayega",
      "kitni der mein", "jaldi bhejo", "urgent hai", "abhi bhejo",
      "engineer aaya nahi", "bahut der ho gayi", "2 din ho gaye", "kal se wait"
    ],
    answer: "Complaint register hote hi engineer ko message jayega. 2-4 ghante mein contact karega."
  },

  /* ═══════════════════════════════════════════════════════════════
     CHARGES & WARRANTY
  ═══════════════════════════════════════════════════════════════ */
  charges: {
    questions: [
      "kitna charge", "kitna paisa", "cost", "fee", "price lagega",
      "warranty", "waranti", "free hai", "paid hai", "paise lagenge"
    ],
    answer: "Engineer visit ke baad charge batayega. Warranty mein repair free hoti hai."
  },

  /* ═══════════════════════════════════════════════════════════════
     CHASSIS NUMBER HELP
  ═══════════════════════════════════════════════════════════════ */
  chassis_help: {
    questions: [
      "chassis number kahan milega", "chassis number kaise pata", "machine pe kahan",
      "number kahan likha hai", "plate kahan hai", "chassis nahi pata",
      "number bhool gaya", "machine number kya hai", "serial number kahan"
    ],
    answer: "Machine ki dashboard ya body pe ek plate hoti hai — wahan chassis number likha hota hai."
  },

  /* ═══════════════════════════════════════════════════════════════
     PHONE NUMBER HELP
  ═══════════════════════════════════════════════════════════════ */
  phone_help: {
    questions: [
      "phone number kyu chahiye", "mobile kyu pooch rahe", "number ka use",
      "number kyu save", "call kyu aayega", "kya karenge is number se",
      "number kya karna hai", "matlab kya hai", "kya kaam hai iska",
      "kya karoge isse", "kisko call kroge", "kya reason hai"
    ],
    answer: "Engineer ko contact karne ke liye number chahiye."
  },

  /* ═══════════════════════════════════════════════════════════════
     COMPLAINT STATUS
  ═══════════════════════════════════════════════════════════════ */
  complaint_status: {
    questions: [
      "pehle complaint", "pehli complaint", "already complaint", "complaint kar diya",
      "complaint ki thi", "pichla complaint", "status kya hai", "complaint number"
    ],
    answer: "Chassis number bataiye, main pehle wali complaint check karti hun."
  },

  /* ═══════════════════════════════════════════════════════════════
     LOCATION HELP
  ═══════════════════════════════════════════════════════════════ */
  location_help: {
    questions: [
      "city kaise bataye", "location kaise confirm", "nearest city",
      "kahan hun main", "kaun sa shehar"
    ],
    answer: "Rajasthan ki woh city bataiye jahan aapki machine abhi khadi hai."
  },

  /* ═══════════════════════════════════════════════════════════════
     ANGRY / FRUSTRATED CUSTOMER
     (Audio analysis: loud spikes, rapid short bursts = frustration pattern)
  ═══════════════════════════════════════════════════════════════ */
  angry_acknowledgment: {
    triggers: [
      "bahut der", "kab se wait", "kal se", "2 din", "3 din", "engineer nahi aaya",
      "aaya nahi", "koi nahi aaya", "response nahi", "ignore", "dhyaan nahi",
      "kab aayega", "turant", "abhi chahiye", "bahut bura", "bekar", "kharab service",
      "angry", "gussa", "pareshaan", "problem ho rahi", "bahut problem"
    ],
    responses: [
      "Samajh rahi hun, pareshani ho rahi hai. Abhi solve karwati hun.",
      "Maafi chahti hun delay ke liye. Engineer ko abhi message bhejti hun.",
      "Samajh rahi hun. Complaint escalate karti hun — priority mein aayega.",
      "Sorry aapko wait karna pada. Abhi dekhti hun aur jaldi karte hain."
    ]
  },

  /* ═══════════════════════════════════════════════════════════════
     HOLD / WAIT
     (Audio: customers say "ek minute", "ruko" frequently between turns)
  ═══════════════════════════════════════════════════════════════ */
  hold_responses: ["Zarur.", "Ruko.", "Haan.", "Theek hai.", "Ek second."],

  /* ═══════════════════════════════════════════════════════════════
     SILENCE RESPONSES
     (Audio analysis: silence between turns is 0.3-1.5s — these are brief)
  ═══════════════════════════════════════════════════════════════ */
  silence_responses: [
    "Bataiye.",
    "Sun rahi hun.",
    "Haan?",
    "Kya problem hai?",
    "Bataiye, main yahan hun."
  ],

  /* ═══════════════════════════════════════════════════════════════
     CONFUSION / UNCLEAR
  ═══════════════════════════════════════════════════════════════ */
  confusion_responses: [
    "Thoda clear bataiye.",
    "Dobara bataiye.",
    "Samajh nahi aaya — kya problem hai machine mein?",
    "Kya matlab? Thoda explain karein.",
    "Sahi se nahi suna. Kya problem hai?"
  ],

  /* ═══════════════════════════════════════════════════════════════
     MACHINE NOT FOUND
  ═══════════════════════════════════════════════════════════════ */
  machine_not_found_responses: [
    "Yeh number system mein nahi mila. Ek ek number dhere dhere boliye.",
    "Chassis number nahi mila. Machine ki plate dekh ke bataiye.",
    "Number galat ho sakta hai. Dobara dhere se boliye."
  ],

  /* ═══════════════════════════════════════════════════════════════
     FINAL CONFIRMATION PROMPTS
  ═══════════════════════════════════════════════════════════════ */
  final_confirm_prompts: [
    "Aur koi problem hai? Ya save kar dun?",
    "Kuch aur bataana hai? Warna complaint register karte hain.",
    "Aur kuch baaki hai? Ya kar dun register?"
  ],

  /* ═══════════════════════════════════════════════════════════════
     SUCCESS MESSAGES
  ═══════════════════════════════════════════════════════════════ */
  success_base: "Complaint register ho gayi. Engineer contact karega. Shukriya!",
  success_with_id: "Complaint register ho gayi. Number hai {id}. Engineer contact karega. Shukriya!",

  /* ═══════════════════════════════════════════════════════════════
     POSITIVE / NEGATIVE CONFIRM TRIGGERS
  ═══════════════════════════════════════════════════════════════ */
  positive_triggers: [
    "haan", "ha", "han", "theek hai", "thik hai", "save", "kar do",
    "register", "done", "yes", "bilkul", "sahi hai", "ok", "okay",
    "theek", "chalo", "hmm", "bas itna", "bas itni", "ho gaya", "sahi",
    "kar dena", "bhar do", "likh do", "note kar"
  ],
  negative_cancel_triggers: [
    "band karo", "mat karo", "cancel", "ruk ja", "nahin chahiye",
    "don't", "dont", "chhod do", "nahi karna"
  ],
  no_more_problems_triggers: [
    "nahi", "nai", "nahin", "no", "bas", "bas itna", "bas itni",
    "kuch nahi", "aur nahi", "nahi hai", "itna hi", "yahi hai",
    "theek hai bas", "ho gaya", "nahi kuch aur"
  ],

  /* ═══════════════════════════════════════════════════════════════
     COMPLAINT TYPES (for display / matching)
  ═══════════════════════════════════════════════════════════════ */
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
   EXPORTED HELPER FUNCTIONS
═══════════════════════════════════════════════════════════════ */

/**
 * Answer a side question if detected.
 * Returns a SHORT natural response or null.
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
 * Detect if customer is angry/frustrated.
 * Based on audio analysis: short rapid bursts with high amplitude = frustration.
 * Returns a natural empathetic response or null.
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
 * Get intent-based response for WAIT / CONFUSED / REPEAT.
 */
export function getIntentResponse(intent, lastSpoken = "") {
  switch (intent) {
    case "WAIT":
      return pickRandom(KNOWLEDGE_BASE.hold_responses);
    case "CONFUSED":
      return pickRandom(KNOWLEDGE_BASE.confusion_responses);
    case "REPEAT":
      return lastSpoken
        ? `${pickRandom(KNOWLEDGE_BASE.silence_responses)} ${lastSpoken}`
        : "Dobara bataiye.";
    default:
      return null;
  }
}

/**
 * Get silence response based on consecutive silence count.
 * Audio analysis: silence between turns is 0.3-1.5s — responses must be brief.
 */
export function getSilenceResponse(silenceCount = 1) {
  const r = KNOWLEDGE_BASE.silence_responses;
  return r[Math.min(silenceCount - 1, r.length - 1)] || r[0];
}

/**
 * Get a machine-not-found message.
 */
export function getMachineNotFoundResponse() {
  return pickRandom(KNOWLEDGE_BASE.machine_not_found_responses);
}

/**
 * Get final confirm prompt — varies to avoid robotic repetition.
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
 * Check if text is a positive confirmation.
 * Based on audio: many very short turns (< 1.5s) = quick acks like "haan", "ok".
 */
export function isPositiveConfirmation(text) {
  const lo = text.toLowerCase();
  return KNOWLEDGE_BASE.positive_triggers.some(t => lo.includes(t));
}

/**
 * Check if text is a hard cancel (not just "nahi" = no more problems).
 */
export function isHardCancel(text) {
  const lo = text.toLowerCase();
  return KNOWLEDGE_BASE.negative_cancel_triggers.some(t => lo.includes(t));
}

/**
 * Check if "nahi" means "no more problems" (submit) vs. true cancel.
 * Audio insight: customers say "nahi" to mean "that's all" at final confirm.
 */
export function isNoMoreProblems(text) {
  const lo = text.toLowerCase();
  return KNOWLEDGE_BASE.no_more_problems_triggers.some(t => lo.includes(t));
}

/**
 * Check if customer wants to add more problems.
 */
export function isAddMoreProblem(text) {
  const lo = text.toLowerCase();
  const hasAddWord = /(aur (problem|complaint|issue|bhi|koi aur)|additional|extra|dusri|phir se|another|aur kuch)/.test(lo);
  return hasAddWord && !isHardCancel(text);
}

/**
 * Analyze full customer input and return type + message.
 */
export function analyzeCustomerResponse(text, options = {}) {
  const { silenceCount = 0 } = options;
  const lo = (text || "").toLowerCase().trim();

  if (!text || text.length < 2) {
    return { type: "SILENCE", message: getSilenceResponse(silenceCount + 1) };
  }

  if (getAngryResponse(text)) {
    return { type: "ANGRY", message: getAngryResponse(text) };
  }

  if (/(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda ruko|leke aata)/i.test(lo)) {
    return { type: "HOLD", message: pickRandom(KNOWLEDGE_BASE.hold_responses) };
  }

  const side = getSideAnswer(text);
  if (side) {
    return { type: "SIDE_QUESTION", message: side };
  }

  return { type: "NORMAL", message: null };
}

/* ═══════════════════════════════════════════════════════════════
   INTERNAL UTILS
═══════════════════════════════════════════════════════════════ */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default {
  KNOWLEDGE_BASE,
  getSideAnswer,
  getAngryResponse,
  getIntentResponse,
  getSilenceResponse,
  getMachineNotFoundResponse,
  getFinalConfirmPrompt,
  getSuccessMessage,
  isPositiveConfirmation,
  isHardCancel,
  isNoMoreProblems,
  isAddMoreProblem,
  analyzeCustomerResponse,
};