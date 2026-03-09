import axios from 'axios';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const REQUEST_TIMEOUT = 5000;  // 5 seconds — fast fail, no hanging
const MAX_RETRIES = 1;         // Only 1 retry max for speed
const RETRY_DELAY = 300;       // ms

/**
 * Make API call with exponential backoff retry logic
 */
async function makeGroqAPICall(messages, options, attempt = 1) {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.1-8b-instant',  // Fastest Groq model
        messages: messages,
        temperature: 0.1, // Lower for speed and accuracy
        max_tokens: options.max_tokens || 100, // Faster responses
        top_p: 0.9,
        stop: ["END_TURN", "---", "\n"] // More stop tokens
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        timeout: REQUEST_TIMEOUT
      }
    );

    if (response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content.trim();
    } else {
      throw new Error('Invalid response format from Groq API');
    }

  } catch (err) {
    console.error(`[Groq API] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

    // Retry logic
    if (attempt < MAX_RETRIES) {
      const waitTime = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`[Groq API] Retrying in ${waitTime}ms...`);

      await new Promise(resolve => setTimeout(resolve, waitTime));
      return makeGroqAPICall(messages, options, attempt + 1);
    }

    // Final fallback
    if (err.response?.status === 429) {
      console.error('[Groq API] Rate limit exceeded');
      return "NONE"; // Default safe response
    }

    throw err;
  }
}

/**
 * Send messages to Groq AI with improved error handling
 * Supports Hindi/English mixed text
 */
export async function askGroqAI(messages, options = {}) {
  try {
    // Validate input
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages must be a non-empty array');
    }

    console.log(`[Groq AI] Sending request with ${messages.length} message(s)`);

    // Ensure all messages have required fields
    const validatedMessages = messages.map(msg => ({
      role: msg.role || 'user',
      content: String(msg.content || '')
    }));

    const response = await makeGroqAPICall(validatedMessages, options);

    console.log(`[Groq AI] ✅ Response received (${response.length} chars)`);
    return response;

  } catch (error) {
    console.error('[Groq AI] ❌ Final error:', error.message);

    // Return safe defaults based on context
    if (options.max_tokens === 15) {
      // Likely machine number extraction
      return "NONE";
    } else if (options.max_tokens === 10) {
      // Likely intent detection
      return "OTHER";
    }

    throw error;
  }
}

/**
 * Specific function for machine number extraction
 * Optimized for this use case
 */
export async function extractMachineNumber(text) {
  const systemPrompt = {
    role: "system",
    content: `You are an expert at extracting machine/chassis numbers from noisy speech transcripts.
    
INPUT: May be Hindi, English, mixed, with punctuation, symbols, and transcription errors.
TASK: Extract the numeric machine number (typically 6-12 digits).

RULES:
1. Return ONLY the digits of the machine number (no spaces, letters, or special characters)
2. If NO valid number found, return exactly: NONE
3. Machine numbers are typically 4-12 consecutive digits
4. Ignore dates, phone numbers (10+ digits), or single random digits
5. If multiple numbers, pick the longest one (likely the machine number)

EXAMPLES:
- "33 05447" → 3305447
- "machine 330544" → 330544
- "mera number 123" → NONE (too short)
- "date 01-01-2025" → NONE (not machine)
- "call 9876543210" → NONE (too long, likely phone)`
  };

  try {
    const response = await askGroqAI(
      [systemPrompt, { role: "user", content: `Extract machine number from: "${text}"` }],
      { max_tokens: 20, temperature: 0.1 }
    );

    return response.toUpperCase().trim();
  } catch (err) {
    console.error('[Machine Extraction] Error:', err.message);
    return "NONE";
  }
}

/**
 * Specific function for intent detection
 * Optimized for yes/no/change detection
 */
export async function detectIntent(userText, context) {
  const normalizedText = (userText || "").trim().toLowerCase();

  // CHANGE / NO keywords — checked FIRST
  const changeWords = [
    // Hindi negations
    "नहीं", "नही", "ना", "बदलना", "बदलो", "बदल दो", "गलत", "नहीं चाहिए",
    // Hinglish / English
    "nahi", "nahin", "nhi", "na", "no", "badalna", "badlo", "badal do",
    "galat", "change", "nahi chahiye", "galat hai",
    // Phone change signals
    "purana", "puraana", "purana wala", "badal", "naya wala",
  ];

  // CONFIRM keywords
  const confirmWords = [
    // Hindi
    "हां", "हाँ", "हान", "हन", "जी", "जी हां", "जी हाँ", "सही", "ठीक है",
    "बिल्कुल", "अच्छा", "सबमिट", "दर्ज", "रजिस्टर", "कन्फर्म",
    // Hinglish / English
    "haan", "han", "yes", "sahi", "theek hai", "thik hai", "ok", "okay",
    "bilkul", "zaroor", "submit", "register", "confirm", "done",
    "darz kar", "file kar", "kar do", "bilkul sahi",
  ];

  // REPEAT keywords
  const repeatWords = [
    "repeat", "dobara", "again", "bolye", "bol sakte", "kya bola",
    "समझा नहीं", "फिर बोलो", "दोबारा", "सुनाओ", "phir se", "suna nahi",
  ];

  // Check CHANGE first — negations override everything
  if (changeWords.some(w => normalizedText.includes(w.toLowerCase()))) {
    console.log(`[Intent Detection] Fast-path Match: CHANGE`);
    return "CHANGE";
  }
  if (confirmWords.some(w => normalizedText.includes(w.toLowerCase()))) {
    console.log(`[Intent Detection] Fast-path Match: CONFIRM`);
    return "CONFIRM";
  }
  if (repeatWords.some(w => normalizedText.includes(w.toLowerCase()))) {
    console.log(`[Intent Detection] Fast-path Match: REPEAT`);
    return "REPEAT";
  }

  // AI FALLBACK — only for truly ambiguous cases
  const systemPrompt = {
    role: "system",
    content: `You are an intent classifier for a Hindi/English JCB voice call system.
Context: ${context}

Respond with EXACTLY ONE WORD only — no explanation, no punctuation:
- CONFIRM  (user says yes, haan, sahi hai, theek hai, bilkul, ok, ji)
- CHANGE   (user says no, nahi, galat, badalna, change, purana, wrong)
- REPEAT   (user asks to repeat, didn't hear, dobara, phir se)
- OTHER    (anything else)`,
  };


  try {
    const response = await askGroqAI(
      [systemPrompt, { role: "user", content: userText }],
      { max_tokens: 5, temperature: 0.1 }  // Fastest response
    );

    const intent = response.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '');
    const validIntents = ["CONFIRM", "CHANGE", "REPEAT", "OTHER"];

    if (validIntents.includes(intent)) {
      return intent;
    }

    // Secondary check if the word is contained
    for (const v of validIntents) {
        if (intent.includes(v)) return v;
    }

    // Fallback if response is unclear
    console.warn(`[Intent Detection] Unclear response: "${response}", defaulting to OTHER`);
    return "OTHER";
  } catch (err) {
    console.error('[Intent Detection] Error:', err.message);
    return "OTHER";
  }
}

/**
 * Get a natural language response for conversations
 * Used for follow-up questions and confirmations
 */
export async function getConversationResponse(userMessage, context) {
  const systemPrompt = {
    role: "system",
    content: `You are a helpful JCB customer service AI assistant in Hindi.
    
CONTEXT: ${context}

Generate a brief, natural response in Hindi (or English if user used English).
Keep it under 50 words.
Be professional but friendly.`
  };

  try {
    const response = await askGroqAI(
      [systemPrompt, { role: "user", content: userMessage }],
      { max_tokens: 100, temperature: 0.7 }
    );

    return response;
  } catch (err) {
    console.error('[Conversation Response] Error:', err.message);
    return "Ek moment, mujhe samajhne de."; // Fallback Hindi response
  }
}

/**
 * Validate complaint description for quality
 */
export async function validateComplaintText(complaintText) {
  if (!complaintText || complaintText.trim().length < 2) return false;

  // Fast-path: if >= 5 words, almost certainly a real complaint — skip AI
  const wordCount = complaintText.trim().split(/\s+/).length;
  if (wordCount >= 5) {
    console.log(`[Problem Validation] Fast-path Match: "${complaintText}"`);
    return true;
  }

  // Fast-path: reject pure filler words with no info
  const fillers = ["haan", "ok", "okay", "ha", "acha", "theek", "yes", "no", "nahi", "hmm", "han"];
  const lower = complaintText.trim().toLowerCase();
  if (fillers.includes(lower)) return false;

  const systemPrompt = {
    role: "system",
    content: `You validate complaints for a JCB machinery call center. Users are rural operators and farmers who speak simply.

A complaint is VALID if it describes ANY machine problem — even vaguely or simply. Be VERY lenient.
VALID examples: "Machine kharab hai", "engine start nahi", "kuch problem aaya", "machine sahi nahi chal rahi", "hydraulic slow hai", "gear nahi lag raha"
INVALID ONLY: pure filler with zero info: "haan", "ok", "yes", "no", "hmm"

Respond ONLY: VALID or INVALID`,
  };

  try {
    const response = await askGroqAI(
      [systemPrompt, { role: "user", content: complaintText }],
      { max_tokens: 5, temperature: 0.1 }
    );
    return response.toUpperCase().includes("VALID");
  } catch (err) {
    console.error('[Complaint Validation] Error:', err.message);
    return true; // Default to valid if error — never block user
  }
}



/* ======================= DIGIT WORD MAP (Hindi + English + Hinglish) ======================= */
const DIGIT_WORD_MAP = {
  // Hindi
  शून्य: "0", सुन्य: "0", सून्य: "0", जीरो: "0", जीरों: "0",
  एक: "1", इक: "1", एक्क: "1",
  दो: "2", "दो ": "2",
  तीन: "3", तिन: "3", टीन: "3",
  चार: "4", चार्स: "4",
  पाँच: "5", पांच: "5", पाच: "5", पंच: "5",
  छह: "6", छः: "6", छ: "6", छे: "6", छ्ह: "6",
  सात: "7", साथ: "7",
  आठ: "8", अठ: "8",
  नौ: "9", नो: "9", नव: "9",
  // English
  zero: "0", oh: "0", o: "0",
  one: "1", two: "2", to: "2", three: "3", four: "4", for: "4",
  five: "5", six: "6", seven: "7", eight: "8", ate: "8", nine: "9",
  // Hinglish
  ek: "1", do: "2", teen: "3", tin: "3", char: "4", chaar: "4",
  panch: "5", paanch: "5", chhah: "6", chhe: "6", chheh: "6",
  saat: "7", sat: "7", aath: "8", ath: "8", nau: "9", nao: "9",
};

const IGNORE_WORDS = new Set([
  "mera", "meri", "mere", "hamara", "hamaara", "mhara", "mhari", "mhare", "tharo", "thari", "thare",
  "number", "no", "num", "nmbr", "machine", "chassis", "engine", "hai", "hain", "he", "ha", "h",
  "ka", "ki", "ke", "ko", "se", "par", "pe", "aapka", "apna", "phone", "mobile", "contact", 
  "call", "batata", "bata", "bolunga", "yeh", "ye", "yahi", "vo", "wo", "aur", "bhi", "sirf", "bas",
  "फ़ोन", "मोबाइल", "है", "हैं", "का", "की", "के", "को", "से",
]);

/* ======================= PHONETIC CITY MATCHING (Common Mishearings) ======================= */
const PHONETIC_CITY_MAP = {
  "SONG": "TONK",
  "SONGASH": "TONK",
  "SONGARH": "TONK",
  "SONKGARH": "TONK",
  "सोंग": "TONK",
  "सॉन्ग": "TONK",
  "सोनगढ़": "TONK",
  "सोनगढ": "TONK",
  "UDAI": "UDAIPUR",
  "VK": "VKIA",
  "VKI": "VKIA",
};

/**
 * Extract only digits from text based on mapping and patterns
 */
export function extractOnlyDigits(text) {
  if (!text) return "";
  const processed = text.toLowerCase().replace(/[।,!?;|]/g, " ");

  const verbNoise = processed
    // Verb + object noise (e.g., "kar do", "bata do")
    .replace(
      /\b(kar|karo|karke|karein|bata|bolo|dedo|de|save|sev|chalao|chalana|chalte|ruk|ruko|sun|suno|lelo|le)\s+(do|दो|lo|लो|dena|लेना|देना)\b/gi,
      " ",
    )
    // Word-based time expressions: "do baar", "do minute"
    .replace(/\b(do|दो)\s+(baar|bar|minute|min|second|sec)\b/gi, " ")
    // IMPORTANT: Digit-based time expressions — "1 minute", "2 min", "5 मिनट", "10 second"
    // These appear when user says "1 मिनट रुको" — "1" should NOT become part of machine number
    .replace(/\b(\d+)\s*(minute|minutes|min|second|seconds|sec|मिनट|सेकंड|घंटा|ghanta|hour|hours)\b/gi, " ")
    // Also strip ordinal/count references likely not machine digits: e.g. "1st", "2nd"
    .replace(/\b\d+(st|nd|rd|th)\b/gi, " ");

  const tokens = verbNoise.split(/[\s\-\/]+/).filter((t) => t.length > 0);
  let result = "";

  for (const token of tokens) {
    if (IGNORE_WORDS.has(token)) continue;
    if (/^\d+$/.test(token)) {
      result += token;
    } else if (DIGIT_WORD_MAP[token] !== undefined) {
      result += DIGIT_WORD_MAP[token];
    }
  }
  return result;
}


/**
 * Basic validation for chassis format
 */
export function isValidChassisFormat(num) {
  if (!num) return false;
  const clean = num.replace(/\D/g, "");
  return /^\d{4,8}$/.test(clean);
}

import { SERVICE_CENTERS } from './service_centers.js';

/**
 * Find the best service center match from user input
 * Uses simple string matching first, then AI for fuzzy cases
 */
export async function findBestServiceCenterMatch(userInput) {
  if (!userInput) return null;
  const cleanInput = userInput.trim().toUpperCase();

  // 1. Exact Match
  const exactMatch = SERVICE_CENTERS.find(sc => 
    sc.city_name === cleanInput || sc.branch_name === cleanInput
  );
  if (exactMatch) return exactMatch;

  // 2. PHONETIC/Common Mishearing Match
  for (const [key, val] of Object.entries(PHONETIC_CITY_MAP)) {
    if (cleanInput.includes(key)) {
      const match = SERVICE_CENTERS.find(sc => sc.city_name === val);
      if (match) {
        console.log(`[City Match] Phonetic Map Hit: "${key}" -> "${val}"`);
        return match;
      }
    }
  }

  // 3. Partial Match (Improved)
  const partialMatch = SERVICE_CENTERS.find(sc => 
    cleanInput.includes(sc.city_name) || 
    sc.city_name.includes(cleanInput) ||
    (sc.branch_name && (cleanInput.includes(sc.branch_name) || sc.branch_name.includes(cleanInput)))
  );
  if (partialMatch) return partialMatch;

  // 3. AI Match for noisy/Hinglish input (Last Resort)
  console.log(`[City Match] Using AI for: "${userInput}"`);
  const citiesList = SERVICE_CENTERS.map(sc => sc.city_name).join(", ");
  
  const prompt = [
    {
      role: "system",
      content: `You are a location matching expert for a JCB service center in Rajasthan. 
      Given a user's spoken city name, match it to the CLOSEST city from this list: [${citiesList}]
      
      RULES:
      1. Return ONLY the city name from the list.
      2. If NO match is found, return: NONE.
      3. VERY IMPORTANT: Phonetic "Song" or "Sone" usually means "TONK".
      4. Handle Rajasthani dialect and pronunciation variations.`
    },
    {
      role: "user",
      content: `Match this spoken location: "${userInput}"`
    }
  ];

  try {
    const startTime = Date.now();
    const response = await askGroqAI(prompt, { max_tokens: 50, temperature: 0.1 }); // Increased tokens for rambling tolerance
    const duration = Date.now() - startTime;
    console.log(`[City Match] AI took ${duration}ms. Response: "${response}"`);

    const upperResponse = response.toUpperCase();
    // Robust extraction: find the city name from our list WITHIN the AI response
    for (const sc of SERVICE_CENTERS) {
      if (upperResponse.includes(sc.city_name.toUpperCase())) {
        console.log(`[City Match] Extracted "${sc.city_name}" from AI response`);
        return sc;
      }
    }

    if (upperResponse.includes("NONE") || upperResponse.includes("UNKNOWN")) return null;

  } catch (err) {
    console.error(`[City Match] AI Error:`, err.message);
  }

  return null;
}

/**
 * Translate Hindi text to English for payload submission
 */
export async function translateToEnglish(text) {
  if (!text || text.length < 2) return text;
  
  // Skip translation if already English (ASCII only, no Devanagari)
  if (/^[\x00-\x7F]+$/.test(text)) {
    console.log(`[Translation] Already English, skipping: "${text}"`);
    return text;
  }
  
  console.log(`[Translation] Translating: "${text}"`);
  try {
    const response = await askGroqAI([
      { 
        role: "system", 
        content: "You are a professional translator. Translate the following Hindi/Hinglish text to clear, concise English for a technical complaint report. Return ONLY the translated text, no explanations." 
      },
      { role: "user", content: text }
    ], { max_tokens: 150, temperature: 0.1 });
    
    console.log(`[Translation] Result: "${response}"`);
    return response.trim();
  } catch (err) {
    console.error("[Translation] Error:", err.message);
    return text; // Fallback to original
  }
}

export default {
  askGroqAI,
  extractMachineNumber,
  detectIntent,
  getConversationResponse,
  validateComplaintText,
  extractOnlyDigits,
  isValidChassisFormat,
  findBestServiceCenterMatch,
  translateToEnglish
};
