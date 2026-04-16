/**
 * knowledgeBase.js
 * ================
 * Knowledge base for JCB Customer Service Agent
 * Contains Q&A pairs for common side questions, behavior rules, and responses.
 */

export const KNOWLEDGE_BASE = {
  // Identity and Introduction
  identity: {
    questions: [
      "tum kaun ho", "aap kaun ho", "tumhara naam kya hai", "aapka naam kya hai",
      "kaun bol raha hai", "kaun bol rahi hai", "main kisse baat kar raha hu",
      "company ka naam kya hai", "aap kahan se ho", "tum kahan se ho",
      "service center ka naam kya hai", "rajesh motors kya hai"
    ],
    answer: "Main Priya hun, Rajesh Motors se baat kar rahi hun. JCB machine ki service ke liye hum yahan hain."
  },

  // Company and Service Info
  company: {
    questions: [
      "rajesh motors kahan hai", "service center kahan hai", "aapke yahan kahan hai",
      "branches kahan hain", "service points kahan hain", "workshop kahan hai",
      "nearby service center", "closest service center"
    ],
    answer: "Rajesh Motors Rajasthan mein multiple locations par hai. Aapke city ke nearest center se engineer aayega."
  },

  // Complaint Registration Process
  complaint_process: {
    questions: [
      "complaint kaise register karte hain", "complaint kaise karte hain",
      "kya karna hai complaint ke liye", "process kya hai", "procedure kya hai",
      "kitna time lagega", "kab tak hoga", "kab engineer aayega"
    ],
    answer: "Bas thoda sa information dijiye - chassis number, problem bataiye, aur location confirm kijiye. Fir complaint register ho jayega aur engineer jaldi contact karega."
  },

  // Chassis Number Help
  chassis_help: {
    questions: [
      "chassis number kahan milega", "chassis number kaise pata kare",
      "machine pe kahan likha hai", "number kahan se dekhe", "plate kahan hai",
      "chassis number nahi pata", "number bhool gaya", "number nahi malum"
    ],
    answer: "Machine ki dashboard pe ek plate hoti hai, uspe chassis number likha hota hai. Thoda dekh lijiye, ya operator se puch lijiye."
  },

  // Phone Number Questions
  phone_help: {
    questions: [
      "phone number kyu chahiye", "mobile number kyu", "phone kyu pooch rahe ho",
      "phone number ka use kya hai", "number kyu save karna hai"
    ],
    answer: "Engineer ko contact karne ke liye aur complaint update dene ke liye aapka number save karte hain."
  },

  // Wait Time and Urgency
  wait_time: {
    questions: [
      "kitna time lagega", "kab tak aayega", "kab engineer aayega",
      "kitni der mein aayega", "kab tak hoga", "kab tak solve hoga",
      "urgent hai", "jaldi karo", "turant karo", "abhi karo"
    ],
    answer: "Complaint register karte hi engineer ko message chala jayega. Normal mein 2-4 ghante mein contact karega, urgent case mein jaldi."
  },

  // Location/City Questions
  location_help: {
    questions: [
      "city kaise pata kare", "location kaise confirm kare", "shahar ka naam kya hai",
      "nearby city", "kis city mein ho", "location change kaise kare"
    ],
    answer: "Aapke current location bataiye ya nearest city ka naam. Humare service centers Rajasthan ke saare main cities mein hain."
  },

  // Problem/Machine Status
  problem_help: {
    questions: [
      "machine status kya hai", "machine ka haal kya hai", "machine ki condition kya hai",
      "problem ka type kya hai", "kya problem hai machine mein"
    ],
    answer: "Bataiye machine abhi bilkul band hai ya problem ke saath chal rahi hai? Aur kya kya problem ho rahi hai?"
  },

  // Angry Customer Responses
  angry_acknowledgment: {
    triggers: [
      "gusse mein", "angry", "upset", "frustrated", "irritated",
      "bahut der", "kab se wait", "4-5 din", "engineer nahi aaya",
      "koi response nahi", "ignore kar rahe", "dhyaan nahi de rahe"
    ],
    responses: [
      "Samajh raha hun, aapko pareshani ho rahi hai. Main abhi check karke solve karwata hun.",
      "Maaf kijiye, aapko inconvenience hua. Main personally ensure karungi ki engineer jaldi pahunche.",
      "Sorry, delay ke liye. Ab complaint escalate karte hain, priority mein le lenge.",
      "Understand kar raha hun, frustration kaafi hoti hai. Abhi dekhta hun pehle complaint ka status."
    ]
  },

  // Hold/Wait Responses
  hold_responses: [
    "Ruko.",
    "Ek minute.",
    "Thodi der ruko.",
    "Wait karo."
  ],

  // Confusion Responses
  confusion_responses: [
    "Samajh nahi aaya, thoda clear kijiye.",
    "Thoda explain kijiye.",
    "Kya matlab tha, dobara bataiye."
  ],

  // Repeat Responses
  repeat_responses: [
    "Dobara bolti hun - ",
    "Phir se kehti hun - ",
    "Clear karte hue kehti hun - "
  ]
};

/**
 * Get answer for a side question
 * @param {string} text - Customer's input text
 * @returns {string|null} - Answer if found, null otherwise
 */
export function getSideAnswer(text) {
  const lo = text.toLowerCase();

  for (const [category, data] of Object.entries(KNOWLEDGE_BASE)) {
    if (category === 'angry_acknowledgment') continue; // Handle separately

    if (data.questions && data.questions.some(q => lo.includes(q))) {
      return data.answer;
    }
  }

  return null;
}

/**
 * Check if customer is angry/frustrated
 * @param {string} text - Customer's input text
 * @returns {string|null} - Angry acknowledgment response if triggered
 */
export function getAngryResponse(text) {
  const lo = text.toLowerCase();

  if (KNOWLEDGE_BASE.angry_acknowledgment.triggers.some(trigger => lo.includes(trigger))) {
    const responses = KNOWLEDGE_BASE.angry_acknowledgment.responses;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  return null;
}

/**
 * Get appropriate response for special intents
 * @param {string} intent - Intent type
 * @param {string} lastSpoken - Last thing agent said
 * @returns {string} - Response text
 */
export function getIntentResponse(intent, lastSpoken = "") {
  switch (intent) {
    case 'WAIT':
      return KNOWLEDGE_BASE.hold_responses[Math.floor(Math.random() * KNOWLEDGE_BASE.hold_responses.length)];

    case 'CONFUSED':
      return KNOWLEDGE_BASE.confusion_responses[Math.floor(Math.random() * KNOWLEDGE_BASE.confusion_responses.length)];

    case 'REPEAT':
      const repeatResp = KNOWLEDGE_BASE.repeat_responses[Math.floor(Math.random() * KNOWLEDGE_BASE.repeat_responses.length)];
      return lastSpoken ? repeatResp + lastSpoken : "Dobara bataiye.";

    default:
      return null;
  }
}

export default { KNOWLEDGE_BASE, getSideAnswer, getAngryResponse, getIntentResponse };