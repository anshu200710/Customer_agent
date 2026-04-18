/**
 * ai.js
 * =====
 * Core AI + Regex extraction engine for Priya voice bot.
 *
 * CORRECTIONS FROM AUDIO ANALYSIS:
 *   - Real calls: 100+ turns, avg speech 1-4s, max 7.4s
 *   - Short ack turns very common — don't treat as silence
 *   - speechTimeout "auto" + timeout=8 (was 3 — was cutting customers off)
 *   - maxSpeechTime=25 (was 10 — customer explanations go up to 7.4s)
 *   - AI must NEVER ask a question already answered
 *   - Side questions answered + immediately redirect to next field
 *   - "nahi" at final confirm = submit, not cancel
 *   - City not found: clear, re-ask with examples, don't crash flow
 *   - Chassis number spoken in chunks of 1-7 digits — accumulate properly
 *   - Filler words ("ji", "achha", "bahut", "bhadiya") stripped from TTS
 */

import Groq from "groq-sdk";
import {
  getSideAnswer,
  getAngryResponse,
  getIntentResponse,
} from "./knowledgeBase.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ═══════════════════════════════════════════════════════════════
   SERVICE CENTERS (Rajasthan only — any city outside = invalid)
═══════════════════════════════════════════════════════════════ */
export const SERVICE_CENTERS = [
  { id: 1,  city_name: "AJMER",         branch_name: "AJMER",    branch_code: "1", lat: 26.43488884,  lng: 74.698112488  },
  { id: 2,  city_name: "ALWAR",         branch_name: "ALWAR",    branch_code: "2", lat: 27.582258224, lng: 76.647377014  },
  { id: 3,  city_name: "BANSWARA",      branch_name: "UDAIPUR",  branch_code: "7", lat: 23.563598633, lng: 74.417541504  },
  { id: 4,  city_name: "BHARATPUR",     branch_name: "ALWAR",    branch_code: "2", lat: 27.201648712, lng: 77.46295166   },
  { id: 5,  city_name: "BHILWARA",      branch_name: "BHILWARA", branch_code: "3", lat: 25.374652863, lng: 74.623023987  },
  { id: 6,  city_name: "BHIWADI",       branch_name: "ALWAR",    branch_code: "2", lat: 28.202623367, lng: 76.808448792  },
  { id: 7,  city_name: "DAUSA",         branch_name: "JAIPUR",   branch_code: "4", lat: 26.905101776, lng: 76.370185852  },
  { id: 8,  city_name: "DHOLPUR",       branch_name: "ALWAR",    branch_code: "2", lat: 26.693515778, lng: 77.876922607  },
  { id: 9,  city_name: "DUNGARPUR",     branch_name: "UDAIPUR",  branch_code: "7", lat: 23.844612122, lng: 73.737922668  },
  { id: 10, city_name: "GONER ROAD",    branch_name: "JAIPUR",   branch_code: "4", lat: 26.889762878, lng: 75.873939514  },
  { id: 11, city_name: "JAIPUR",        branch_name: "JAIPUR",   branch_code: "4", lat: 26.865495682, lng: 75.681541443  },
  { id: 12, city_name: "JHALAWAR",      branch_name: "KOTA",     branch_code: "5", lat: 24.547901154, lng: 76.194129944  },
  { id: 13, city_name: "JHUNJHUNU",     branch_name: "SIKAR",    branch_code: "6", lat: 28.09862709,  lng: 75.374809265  },
  { id: 14, city_name: "KARAULI",       branch_name: "JAIPUR",   branch_code: "4", lat: 26.512748718, lng: 77.021934509  },
  { id: 15, city_name: "KEKRI",         branch_name: "AJMER",    branch_code: "1", lat: 25.961145401, lng: 75.157318115  },
  { id: 16, city_name: "KOTA",          branch_name: "KOTA",     branch_code: "5", lat: 25.12909317,  lng: 75.868736267  },
  { id: 17, city_name: "KOTPUTLI",      branch_name: "JAIPUR",   branch_code: "4", lat: 27.680557251, lng: 76.160636902  },
  { id: 18, city_name: "NEEM KA THANA", branch_name: "JAIPUR",   branch_code: "4", lat: 27.741991043, lng: 75.788673401  },
  { id: 19, city_name: "NIMBAHERA",     branch_name: "BHILWARA", branch_code: "3", lat: 24.617570877, lng: 74.672302246  },
  { id: 20, city_name: "PRATAPGARH",    branch_name: "BHILWARA", branch_code: "3", lat: 24.038845062, lng: 74.776138306  },
  { id: 21, city_name: "RAJSAMAND",     branch_name: "UDAIPUR",  branch_code: "7", lat: 25.078897476, lng: 73.866836548  },
  { id: 22, city_name: "RAMGANJMANDI",  branch_name: "KOTA",     branch_code: "5", lat: 24.655239105, lng: 75.971496582  },
  { id: 23, city_name: "SIKAR",         branch_name: "SIKAR",    branch_code: "6", lat: 27.591619492, lng: 75.171058655  },
  { id: 25, city_name: "SUJANGARH",     branch_name: "SIKAR",    branch_code: "6", lat: 27.706758499, lng: 74.481445312  },
  { id: 26, city_name: "TONK",          branch_name: "JAIPUR",   branch_code: "4", lat: 26.177381516, lng: 75.81086731   },
  { id: 27, city_name: "UDAIPUR",       branch_name: "UDAIPUR",  branch_code: "7", lat: 24.570493698, lng: 73.745994568  },
  { id: 28, city_name: "VKIA",          branch_name: "JAIPUR",   branch_code: "4", lat: 27.0103827,   lng: 75.7703344    },
  { id: 29, city_name: "SIROHI",        branch_name: "UDAIPUR",  branch_code: "7", lat: 24.8868,      lng: 72.8589       },
  { id: 30, city_name: "ABU ROAD",      branch_name: "UDAIPUR",  branch_code: "7", lat: 24.4821,      lng: 72.7056       },
  { id: 31, city_name: "SWARUPGANJ",    branch_name: "JAIPUR",   branch_code: "4", lat: 26.8754,      lng: 75.8103       },
  { id: 32, city_name: "NOON",          branch_name: "UDAIPUR",  branch_code: "7", lat: 24.5,         lng: 72.6          },
  { id: 33, city_name: "MAWAL",         branch_name: "UDAIPUR",  branch_code: "7", lat: 24.48,        lng: 72.71         },
  { id: 34, city_name: "NAGAUR",        branch_name: "AJMER",    branch_code: "1", lat: 27.2028,      lng: 73.7331       },
  { id: 35, city_name: "PALI",          branch_name: "AJMER",    branch_code: "1", lat: 25.7711,      lng: 73.3234       },
  { id: 36, city_name: "BARMER",        branch_name: "UDAIPUR",  branch_code: "7", lat: 25.7465,      lng: 71.3918       },
  { id: 37, city_name: "JODHPUR",       branch_name: "AJMER",    branch_code: "1", lat: 26.2389,      lng: 73.0243       },
  { id: 38, city_name: "BIKANER",       branch_name: "SIKAR",    branch_code: "6", lat: 28.0229,      lng: 73.3119       },
  { id: 39, city_name: "CHITTORGARH",   branch_name: "BHILWARA", branch_code: "3", lat: 24.8888,      lng: 74.6269       },
  { id: 40, city_name: "BUNDI",         branch_name: "KOTA",     branch_code: "5", lat: 25.4385,      lng: 75.6478       },
  { id: 41, city_name: "SAWAI MADHOPUR",branch_name: "JAIPUR",   branch_code: "4", lat: 26.0178,      lng: 76.3561       },
  { id: 42, city_name: "CHURU",         branch_name: "SIKAR",    branch_code: "6", lat: 28.2961,      lng: 74.9670       },
  { id: 43, city_name: "HANUMANGARH",   branch_name: "SIKAR",    branch_code: "6", lat: 29.5833,      lng: 74.3333       },
  { id: 44, city_name: "GANGANAGAR",    branch_name: "SIKAR",    branch_code: "6", lat: 29.9167,      lng: 73.8833       },
  { id: 45, city_name: "JAISALMER",     branch_name: "UDAIPUR",  branch_code: "7", lat: 26.9157,      lng: 70.9083       },
  { id: 46, city_name: "JALOR",         branch_name: "UDAIPUR",  branch_code: "7", lat: 25.3474,      lng: 72.6170       },
  { id: 47, city_name: "BARAN",         branch_name: "KOTA",     branch_code: "5", lat: 25.1017,      lng: 76.5136       },
  { id: 48, city_name: "KHUSHKHERA",    branch_name: "AJMER",    branch_code: "1", lat: 27.8000,      lng: 76.4500       },
  { id: 49, city_name: "KAROLI",        branch_name: "AJMER",    branch_code: "1", lat: 27.7167,      lng: 76.3167       },
  { id: 50, city_name: "MASUDA",        branch_name: "AJMER",    branch_code: "1", lat: 26.9500,      lng: 74.7500       },
  { id: 51, city_name: "BEAWAR",        branch_name: "AJMER",    branch_code: "1", lat: 26.1000,      lng: 74.3167       },
];

/* ═══════════════════════════════════════════════════════════════
   SYSTEM PROMPT BUILDER
   Key fix: single focused NEXT ACTION, never re-ask collected fields
═══════════════════════════════════════════════════════════════ */
function buildSystemPrompt(callData) {
  const d = callData.extractedData;
  const customerLine = callData.customerData
    ? `Identified: ${callData.customerData.name}, Machine: ${callData.customerData.machineNo}, Phone: ${callData.customerData.phone}`
    : "Not identified yet";

  const have = [];
  const need = [];
  const fieldMap = {
    machine_no: d.machine_no,
    complaint_title: d.complaint_title,
    machine_status: d.machine_status,
    city: d.city,
    city_id: d.city_id,
    customer_phone:
      d.customer_phone &&
      /^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(d.customer_phone))
        ? d.customer_phone
        : null,
  };
  for (const [k, v] of Object.entries(fieldMap)) {
    if (v) have.push(`${k}=${v}`);
    else need.push(k);
  }

  // ── Single next action — never ask what's already collected ──────
  // BUT: if customer asks a question, ANSWER IT FIRST, then ask for next field
  let nextAction = "";
  
  // Check if customer asked a question that needs answering
  const lastUserMsg = callData.messages.filter((m) => m.role === "user").pop()?.text || "";
  const customerAskingQuestion = /^(kya|kais|kaun|kahan|kyu|kitna|kab|kisko|mujhe|kya karna|kya hai|bol raha|bol rahi|kya chahiye)/i.test(lastUserMsg.trim());
  
  if (!d.machine_no) {
    if (customerAskingQuestion) {
      // Customer is asking something before giving chassis - answer then ask
      nextAction = "Answer their question first, THEN say: 'Chassis number bataiye — ek ek number dhere boliye.'";
    } else {
      nextAction =
        "Ask for chassis number. Say: 'Chassis number bataiye — ek ek number dhere boliye.' " +
        "Wait SILENTLY until they finish all digits before responding.";
    }
  } else if (!d.complaint_title) {
    if (customerAskingQuestion) {
      nextAction = "Answer their question first, THEN ask: 'Machine mein kya problem hai?' — wait for full answer.";
    } else {
      const name = callData.customerData?.name?.split(" ")[0] || "";
      nextAction = name
        ? `Ask ${name}: 'Machine mein kya problem hai?' — wait for full answer.`
        : "Ask: 'Machine mein kya problem hai?' — wait for full answer.";
    }
  } else if (!d.machine_status) {
    if (customerAskingQuestion) {
      nextAction = "Answer their question first, THEN ask: 'Machine bilkul band hai ya problem ke saath chal rahi hai?'";
    } else {
      nextAction =
        "Ask: 'Machine bilkul band hai ya problem ke saath chal rahi hai?' " +
        "If band/nahi chal → machine_status='Breakdown'. " +
        "If chal rahi hai/problem ke saath → machine_status='Running With Problem'.";
    }
  } else if (!d.city || !d.city_id) {
    if (customerAskingQuestion) {
      nextAction = "Answer their question first, THEN ask: 'Machine abhi Rajasthan ke kis shehar mein hai?'";
    } else {
      nextAction =
        "Ask: 'Machine abhi Rajasthan ke kis shehar mein hai?' " +
        "If city not in our list → say: 'Yeh city nahi mili. Jaipur, Ajmer, Kota, Udaipur, Alwar, Sikar — ya aur koi Rajasthan ki city bataiye.' Keep asking until valid.";
    }
  } else if (!fieldMap.customer_phone) {
    if (customerAskingQuestion) {
      nextAction = "Answer their question first, THEN ask: 'Aapka 10 digit mobile number bataiye.'";
    } else {
      nextAction =
        "Ask: 'Aapka 10 digit mobile number bataiye.' " +
        "Wait for complete number — don't respond mid-number.";
    }
  } else {
    if (customerAskingQuestion) {
      nextAction = "Answer their question first, THEN ask: 'Aur koi problem hai? Ya save kar dun?' Then wait.";
    } else {
      nextAction =
        "All data collected. Ask ONCE: 'Aur koi problem hai? Ya save kar dun?' Then wait.";
    }
  }

  const cityList = SERVICE_CENTERS.map((c) => c.city_name).join(", ");

  return `You are Priya — professional female service agent at Rajesh Motors JCB service center.
Speak natural Hindi. Sound human. Be concise.

CUSTOMER: ${customerLine}
COLLECTED: ${have.length ? have.join(" | ") : "nothing yet"}
STILL NEED: ${need.join(", ") || "NOTHING — ready to confirm"}
YOUR NEXT ACTION: ${nextAction}

════════ CORE RULES ════════
1. IF CUSTOMER ASKS A QUESTION → Answer it FIRST in 1 sentence, THEN ask for next field.
2. Ask ONLY the NEXT ACTION question. Nothing else.
3. NEVER re-ask a field that is in COLLECTED. Period.
4. If STILL NEED is empty → go straight to final confirm.
5. Max 10-12 words per reply. Short. Natural.
6. No filler words: no "ji", "acha", "bahut", "bhadiya", "bilkul".

════════ LISTENING RULES (from real call analysis) ════════
• Audio data: customers speak in 1-7 second bursts with 0.3-1.5s pauses
• NEVER interrupt mid-sentence — wait for full silence before responding
• When giving chassis/phone digits: customer pauses between chunks (normal!)
• After "ek minute" / "ruko" / "dhundh raha" → say ONLY "Zarur." and wait
• Short inputs like "haan", "ok", "theek" are VALID confirmations — process them

════════ LANGUAGE ════════
• Natural Hindi, understand Rajasthani/Marwari too
• Rajasthani dictionary:
  band padi/khadi padi/chal nai ryi/chaalti nai → Breakdown
  tel nikal ryo/rissa/risso/riss ryo → Oil Leakage
  dhak gyi/tapt gyi/bahut garam → Engine Overheating
  filttar/filtar badlana/seva karwani → Service/Filter Change
  race nai/ras nai/gas nai leti → Accelerator Problem
  khatak/khatakhat/aavaaz aa ri/thokata → Abnormal Noise
  hydraulik/ailak/bucket nai uthta → Hydraulic System Failure
  thanda nai/AC kharab → AC Not Working
  brake nai lagta/rokti nai → Brake Failure
  bijli nai/light nai/battery down → Electrical Problem

════════ SIDE QUESTIONS ════════
If customer asks about timing, charges, warranty, engineer, etc.:
→ Answer in 1 sentence max
→ Immediately follow with YOUR NEXT ACTION question
→ Example: "2-4 ghante mein contact karega. Chassis number bataiye."

════════ ANGRY CUSTOMER ════════
If frustrated/angry: "Samajh rahi hun. Abhi solve karwati hun." then redirect.

════════ MULTI-COMPLAINT RULE ════════
• complaint_title = FIRST/PRIMARY problem
• complaint_details = ALL problems semicolon-separated
• NEVER discard any problem. Accumulate across turns.
• Example input: "engine nahi chal rahi, tel nikal rha, AC bhi kharab"
  → title: "Engine Not Starting"
  → details: "Engine Not Starting; Oil Leakage; AC Not Working"

════════ FINAL CONFIRM RULES ════════
• "nahi" at final confirm = no more problems = SUBMIT (ready_to_submit: true)
• "save kar do" / "haan" / "theek hai" → ready_to_submit: true
• "band karo" / "cancel" → do NOT submit
• Do NOT ask "save kar dun?" twice in same conversation

VALID CITIES: ${cityList}

OUTPUT FORMAT — always end with ### and JSON:
[short natural Hindi reply] ### {"extracted":{"machine_no":"","complaint_title":"","machine_status":"","city":"","customer_phone":"","complaint_details":"","job_location":"","machine_location_address":""},"ready_to_submit":false}

HARD RULE: ready_to_submit=true ONLY when ALL fields in STILL NEED are empty AND customer confirmed.`;
}

/* ═══════════════════════════════════════════════════════════════
   MAIN AI CALL — getSmartAIResponse
═══════════════════════════════════════════════════════════════ */
export async function getSmartAIResponse(callData) {
  try {
    callData.extractedData = sanitizeExtractedData(callData.extractedData);

    // Fast regex pass on last user message
    const lastUserMsg =
      callData.messages.filter((m) => m.role === "user").pop()?.text || "";
    if (lastUserMsg) {
      const rxData = extractAllData(lastUserMsg, callData.extractedData);
      for (const [k, v] of Object.entries(rxData)) {
        if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
      }
    }

    // Angry customer short-circuit
    const angryResp = getAngryResponse(lastUserMsg);
    if (angryResp) {
      // Clean filler words
      return {
        text: cleanFillers(angryResp),
        extractedData: callData.extractedData,
        readyToSubmit: false,
      };
    }

    // Side question — answer + combine with next question
    const sideAns = getSideAnswer(lastUserMsg);
    if (sideAns && callData.customerData && callData.extractedData.complaint_title) {
      const nextQ = getNextFieldQuestion(callData.extractedData);
      const combined = nextQ ? `${sideAns} ${nextQ}` : sideAns;
      return {
        text: cleanFillers(combined),
        extractedData: callData.extractedData,
        readyToSubmit: false,
      };
    }

    // City match before AI call
    if (callData.extractedData.city && !callData.extractedData.city_id) {
      const mc = matchServiceCenter(callData.extractedData.city);
      if (mc) {
        applyCity(callData.extractedData, mc);
      } else {
        callData.extractedData.city = null; // clear hallucinated city
      }
    }

    // Build messages for Groq
    const messages = [
      { role: "system", content: buildSystemPrompt(callData) },
      ...callData.messages.slice(-10).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      })),
    ];
    if (!messages.find((m) => m.role === "user")) {
      messages.push({ role: "user", content: "[call connected]" });
    }

    const resp = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.1,
      max_tokens: 180,
      top_p: 0.9,
    });

    const raw = resp.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error("Empty Groq response");

    // Parse reply + JSON
    const sepIdx = raw.indexOf("###");
    let replyText = sepIdx !== -1 ? raw.slice(0, sepIdx).trim() : raw.trim();
    let extractedJSON = {};
    let readyToSubmit = false;

    if (sepIdx !== -1) {
      try {
        const jsonStr = raw
          .slice(sepIdx + 3)
          .trim()
          .replace(/```json|```/g, "");
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          readyToSubmit = !!parsed.ready_to_submit;
          extractedJSON = parsed.extracted || {};
        }
      } catch {
        /* ignore parse error */
      }
    }

    // Merge Groq extracted data
    const merged = { ...callData.extractedData };
    for (const [k, v] of Object.entries(extractedJSON)) {
      if (!v || v === "NA" || v === "") continue;
      if (k === "customer_phone") {
        const ph = String(v).replace(/[\s\-]/g, "");
        if (/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(ph)) merged.customer_phone = ph;
      } else if (k === "complaint_details") {
        const existing = (merged.complaint_details || "")
          .split("; ")
          .map((s) => s.trim())
          .filter(Boolean);
        const incoming = String(v)
          .split("; ")
          .map((s) => s.trim())
          .filter(Boolean);
        const combined = [...existing];
        for (const item of incoming) {
          if (!combined.includes(item)) combined.push(item);
        }
        merged.complaint_details = combined.join("; ");
      } else {
        merged[k] = v;
      }
    }

    // City match again after Groq
    if (merged.city && !merged.city_id) {
      const mc = matchServiceCenter(merged.city);
      if (mc) applyCity(merged, mc);
      else merged.city = null; // reject hallucinated city
    }

    // Clean reply text
    replyText = cleanFillers(
      replyText
        .replace(/```[\s\S]*?```/g, "")
        .replace(/###[\s\S]*/g, "")
        .trim()
    );

    // Validate before allowing submit
    if (readyToSubmit) {
      const v = validateExtracted(merged);
      if (!v.valid) {
        readyToSubmit = false;
        console.warn(`⚠️ Not ready: ${v.reason}`);
      }
    }

    console.log(`   🤖 AI: "${replyText}" | ready:${readyToSubmit}`);
    return { text: replyText, extractedData: merged, readyToSubmit };
  } catch (err) {
    console.error("❌ [Groq]", err.message);
    return {
      text: "Bataiye.",
      extractedData: callData.extractedData || {},
      readyToSubmit: false,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: next question label for combining with side answers
═══════════════════════════════════════════════════════════════ */
function getNextFieldQuestion(d) {
  if (!d.machine_no) return "Chassis number bataiye.";
  if (!d.complaint_title) return "Machine mein kya problem hai?";
  if (!d.machine_status) return "Machine band hai ya chal rahi hai?";
  if (!d.city || !d.city_id) return "Kis shehar mein hai machine?";
  if (!d.customer_phone || !/^[6-9]\d{9}/.test(String(d.customer_phone)))
    return "Mobile number bataiye.";
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: apply matched service center to extractedData
═══════════════════════════════════════════════════════════════ */
function applyCity(data, mc) {
  data.city = mc.city_name;
  data.city_id = mc.branch_code;
  data.branch = mc.branch_name;
  data.outlet = mc.city_name;
  data.lat = mc.lat;
  data.lng = mc.lng;
}

/* ═══════════════════════════════════════════════════════════════
   HELPER: strip robotic filler words from TTS text
   (from audio analysis: "ji", "achha" etc make bot sound robotic)
═══════════════════════════════════════════════════════════════ */
function cleanFillers(text) {
  return text
    .replace(/\bji\b/gi, "")
    .replace(/\bachcha\b/gi, "")
    .replace(/\bachha\b/gi, "")
    .replace(/\bokay\b/gi, "")
    .replace(/\bok\b/gi, "")
    .replace(/\bbahut\b/gi, "")
    .replace(/\bbhadiya\b/gi, "")
    .replace(/\bbadia\b/gi, "")
    .replace(/\bbilkul\b/gi, "")
    .replace(/\bswagat hai\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ═══════════════════════════════════════════════════════════════
   REGEX EXTRACTION — extractAllData
   Handles: Devanagari, Romanized Hindi, Rajasthani/Marwari
═══════════════════════════════════════════════════════════════ */
export function extractAllData(text, cur = {}) {
  const ex = {};

  // Number word → digit map
  const numberMap = {
    शून्य: "0", एक: "1", दो: "2", तीन: "3", चार: "4", पांच: "5", पाँच: "5",
    छह: "6", सात: "7", आठ: "8", नौ: "9",
    zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
    six: "6", seven: "7", eight: "8", nine: "9",
    ek: "1", do: "2", teen: "3", char: "4", chaar: "4", paanch: "5",
    chhe: "6", cheh: "6", saat: "7", aath: "8", nau: "9", shunya: "0",
  };

  let normalizedText = text;
  for (const [word, digit] of Object.entries(numberMap)) {
    normalizedText = normalizedText.replace(
      new RegExp(`\\b${word}\\b`, "gi"),
      digit
    );
  }
  const lo = normalizedText
    .toLowerCase()
    .replace(/[।.!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Skip pure hold/filler phrases
  if (
    /^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|leke aata|bas|ok|haan|ha|acha|achha)\s*$/i.test(
      lo
    )
  )
    return {};

  // ── Machine number (4-7 digits, skip if looks like phone) ────────
  if (!cur.machine_no) {
    const noPhone = normalizedText.replace(/[6-9]\d{9}/g, "");
    const digitsOnly = noPhone.replace(/[^0-9]/g, "");
    for (let len = 7; len >= 4; len--) {
      for (let i = 0; i <= digitsOnly.length - len; i++) {
        const chunk = digitsOnly.slice(i, i + len);
        // Avoid treating first 10 digits of phone as chassis
        if (/^[6-9]/.test(chunk) && digitsOnly.replace(chunk, "").length >= 6)
          continue;
        ex.machine_no = chunk;
        break;
      }
      if (ex.machine_no) break;
    }
  }

  // ── Phone (10 digit Indian) ───────────────────────────────────────
  if (
    !cur.customer_phone ||
    !/^[6-9]\d{9}$/.test(cur.customer_phone)
  ) {
    const compact = text.replace(/[\s\-,।.]/g, "");
    const nums = compact.match(/\d+/g) || [];
    for (const seq of nums) {
      if (/^[6-9]\d{9}$/.test(seq)) {
        ex.customer_phone = seq;
        break;
      }
      for (let i = 0; i <= seq.length - 10; i++) {
        const ch = seq.slice(i, i + 10);
        if (/^[6-9]\d{9}$/.test(ch)) {
          ex.customer_phone = ch;
          break;
        }
      }
      if (ex.customer_phone) break;
    }
  }

  // ── City — Devanagari + Roman + Rajasthani variants ──────────────
  if (!cur.city) {
    const DEVA_MAP = {
      भीलवाड़ा: "BHILWARA", बड़ी: "BHILWARA", जयपुर: "JAIPUR", अजमेर: "AJMER",
      अलवर: "ALWAR", जोधपुर: "JODHPUR", उदयपुर: "UDAIPUR", कोटा: "KOTA",
      सीकर: "SIKAR", बीकानेर: "BIKANER", टोंक: "TONK", झुंझुनू: "JHUNJHUNU",
      दौसा: "DAUSA", नागौर: "NAGAUR", पाली: "PALI", बाड़मेर: "BARMER",
      जैसलमेर: "JAISALMER", चित्तौड़गढ़: "CHITTORGARH", बूंदी: "BUNDI",
      बारां: "BARAN", झालावाड़: "JHALAWAR", राजसमंद: "RAJSAMAND",
      भरतपुर: "BHARATPUR", धौलपुर: "DHOLPUR", करौली: "KARAULI",
      "सवाई माधोपुर": "SAWAI MADHOPUR", डूंगरपुर: "DUNGARPUR",
      खुशखेड़ा: "KHUSHKHERA", खुशखेरा: "KHUSHKHERA",
      क्रोली: "KAROLI", मसूदा: "MASUDA", ब्यावर: "BEAWAR",
      बांसवाड़ा: "BANSWARA", प्रतापगढ़: "PRATAPGARH", सिरोही: "SIROHI",
      जालोर: "JALOR", "नीम का थाना": "NEEM KA THANA", चुरू: "CHURU",
      हनुमानगढ़: "HANUMANGARH", गंगानगर: "GANGANAGAR",
      श्रीगंगानगर: "GANGANAGAR", निम्बाहेड़ा: "NIMBAHERA",
      सुजानगढ़: "SUJANGARH", कोटपूतली: "KOTPUTLI", भिवाड़ी: "BHIWADI",
      "रामगंज मंडी": "RAMGANJMANDI", रामगंज: "RAMGANJMANDI",
    };
    for (const [deva, latin] of Object.entries(DEVA_MAP)) {
      if (text.includes(deva)) {
        ex.city = latin;
        break;
      }
    }
    if (!ex.city) {
      const sorted = [...SERVICE_CENTERS].sort(
        (a, b) => b.city_name.length - a.city_name.length
      );
      for (const sc of sorted) {
        if (lo.includes(sc.city_name.toLowerCase())) {
          ex.city = sc.city_name;
          break;
        }
      }
    }
  }

  // ── Machine status (Rajasthani-aware) ────────────────────────────
  if (!cur.machine_status) {
    const bkRx =
      /(band|khadi|khari|stop|ruk gayi|breakdown|बंद|खड़ी|chalu nahi|chalti nahi|start nahi|start nhi|nahi chal|padi hai|band padi|chal nhi rahi|chal nhi|nhi chal|nahi chalti|khadi padi|chal nai ryi|chaalti nai|chal nai)/;
    const rwRx =
      /(chal rahi|chal rhi|running|chalu hai|dikkat|problem|चल रही|चालू है|chal ryi|chaalti hai)/;
    const svRx =
      /(filter|filttar|filtar|service|oil change|tel badlo|seva|सर्विस|फिल्टर)/;
    if (bkRx.test(lo) || bkRx.test(text)) ex.machine_status = "Breakdown";
    else if (svRx.test(lo)) ex.machine_status = "Running With Problem";
    else if (rwRx.test(lo) || rwRx.test(text))
      ex.machine_status = "Running With Problem";
  }

  // ── Job location ──────────────────────────────────────────────────
  if (!cur.job_location) {
    if (/(workshop|garage|वर्कशॉप|गैराज)/.test(lo))
      ex.job_location = "Workshop";
    else if (/(site|field|bahar|khet|sadak|onsite|साइट|खेत)/.test(lo))
      ex.job_location = "Onsite";
  }

  // ── Complaint title ───────────────────────────────────────────────
  if (!cur.complaint_title) {
    const mCtx =
      /(machine|jcb|start|chalu|engine|मशीन|इंजन)/.test(lo);
    const ns =
      /(start nahi|start nhi|chalu nahi|chalu nhi|chalti nahi|chal nahi rahi|nahi chal rahi|चालू नहीं|स्टार्ट नहीं|नहीं चल|chal nai|start nai ho|chaalti nai)/.test(
        lo
      );
    const bnd =
      /(band hai|band ho gayi|band pad|khari hai|बंद है|बंद हो|band padi|khadi padi)/.test(
        lo
      ) && mCtx;

    if (ns || bnd) ex.complaint_title = "Engine Not Starting";
    else if (
      /(filter|filttar|filtar|service|servicing|seva|oil change|tel badlo|tel badalwana)/.test(
        lo
      )
    )
      ex.complaint_title = "Service/Filter Change";
    else if (/(dhuan|dhua|smoke|dhuen|dhuwaan|kaala dhuan|black smoke)/.test(lo))
      ex.complaint_title = "Engine Smoke";
    else if (
      /(garam|dhak|overheat|ubhal|tapta|tapt gyi|bahut garam|dhak gyi)/.test(lo)
    )
      ex.complaint_title = "Engine Overheating";
    else if (
      /(tel nikal|oil leak|rissa|risso|tel nikal ryo|oil aa raha|tel aa raha|riss ryo|tel riss)/.test(
        lo
      )
    )
      ex.complaint_title = "Oil Leakage";
    else if (
      /(hydraulic|hydraulik|hydro|ailak|cylinder|bucket|boom|jack|dipper|bucket nai uthta)/.test(
        lo
      )
    )
      ex.complaint_title = "Hydraulic System Failure";
    else if (
      /(race nahi|race nai|ras nahi|ras nai|accelerator|gas nahi|gas nai|pickup nahi|gas nai leti)/.test(
        lo
      )
    )
      ex.complaint_title = "Accelerator Problem";
    else if (
      /(ac nahi|ac nai|hawa nahi|thanda nahi|ac band|ac kharab|cooling nahi|thando nai)/.test(
        lo
      )
    )
      ex.complaint_title = "AC Not Working";
    else if (
      /(brake nahi|brake nhi|brake nai|rokti nahi|brake fail|brake kharab|rokti nai)/.test(
        lo
      )
    )
      ex.complaint_title = "Brake Failure";
    else if (
      /(bijli nahi|bijli nai|headlight|bulb|electrical|light nahi|battery down|wiring|voltage)/.test(
        lo
      )
    )
      ex.complaint_title = "Electrical Problem";
    else if (/(stabilizer|steering tight|hard steering|steering problem)/.test(lo))
      ex.complaint_title = "Steering Problem";
    else if (/(dipper|seal leak|nut leak|check nut)/.test(lo))
      ex.complaint_title = "Oil Leakage";
    else if (/(tire|tyre|pankchar|puncture|flat)/.test(lo))
      ex.complaint_title = "Tire Problem";
    else if (
      /(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration|noise|khad khad|aavaaz aa ri|khatak aa ri)/.test(
        lo
      )
    )
      ex.complaint_title = "Abnormal Noise";
    else if (/(steering|स्टीयरिंग|steering kharab|steering nahi ghoom)/.test(lo))
      ex.complaint_title = "Steering Problem";
    else if (/(gear|transmission|गियर|gear nahi lagta|gear slip)/.test(lo))
      ex.complaint_title = "Transmission Problem";
    else if (/(coolant|paani nikal|water leak|radiator)/.test(lo))
      ex.complaint_title = "Coolant Leakage";
    else if (/(battery down|battery kharab|battery nahi)/.test(lo))
      ex.complaint_title = "Battery Problem";
    else if (/(boom|arm nahi uthta|dipper nahi|arm nai uthta)/.test(lo))
      ex.complaint_title = "Boom/Arm Failure";
    else if (/(turbo|turbocharger)/.test(lo))
      ex.complaint_title = "Turbocharger Issue";
  }

  return ex;
}

/* ═══════════════════════════════════════════════════════════════
   extractAllComplaintTitles — find ALL complaints in one utterance
═══════════════════════════════════════════════════════════════ */
export function extractAllComplaintTitles(text) {
  const lo = text.toLowerCase().replace(/[।.!?]/g, " ");
  const found = [];
  const checks = [
    [/(start nahi|start nhi|start nai|chalu nahi|chalu nhi|chalti nahi|chal nahi rahi|nahi chal rahi|engine not starting|band hai|band ho gayi|band pad|khari hai|chal nhi rahi|chal nhi|nhi chal|band padi|khadi padi|chal nai|chaalti nai)/, "Engine Not Starting"],
    [/(filter|filttar|filtar|service|servicing|seva|oil change|tel badlo|tel badalwana)/, "Service/Filter Change"],
    [/(dhuan|dhua|smoke|dhuen|dhuwaan|kaala dhuan|black smoke)/, "Engine Smoke"],
    [/(garam|dhak|overheat|ubhal|tapta|zyada garam|bahut garam|dhak gyi|tapt gyi)/, "Engine Overheating"],
    [/(tel nikal|oil leak|rissa|risso|tel nikal ryo|oil aa raha|tel aa raha|riss ryo|tel riss)/, "Oil Leakage"],
    [/(hydraulic|hydraulik|hydro|ailak|cylinder|bucket|boom|jack|dipper|bucket nai uthta)/, "Hydraulic System Failure"],
    [/(race nahi|race nai|ras nahi|ras nai|accelerator|throttle|gas nahi|gas nai|pickup nahi|gas nai leti)/, "Accelerator Problem"],
    [/(ac nahi|ac nai|hawa nahi|thanda nahi|ac band|ac kharab|cooling nahi|thando nai)/, "AC Not Working"],
    [/(brake nahi|brake nhi|brake nai|rokti nahi|brake fail|brake kharab|rokti nai)/, "Brake Failure"],
    [/(bijli nahi|bijli nai|headlight|bulb|electrical|light nahi|battery down|bijli|wiring)/, "Electrical Problem"],
    [/(tire|tyre|pankchar|puncture|flat tyre)/, "Tire Problem"],
    [/(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration|noise|khad khad|aavaaz aa ri|khatak aa ri)/, "Abnormal Noise"],
    [/(steering|steering kharab|steering nahi ghoom|steering tight)/, "Steering Problem"],
    [/(gear|transmission|gear nahi lagta|gear slip|gear nai)/, "Transmission Problem"],
    [/(coolant|paani nikal|water leak|radiator|coolant leak)/, "Coolant Leakage"],
    [/(battery down|battery kharab|battery nahi)/, "Battery Problem"],
    [/(boom|arm|dipper nahi|arm nahi uthta|arm nai uthta)/, "Boom/Arm Failure"],
    [/(turbo|turbocharger)/, "Turbocharger Issue"],
  ];
  for (const [rx, title] of checks) {
    if ((rx.test(lo) || rx.test(text)) && !found.includes(title))
      found.push(title);
  }
  return found;
}

/* ═══════════════════════════════════════════════════════════════
   matchServiceCenter — fuzzy city matching
═══════════════════════════════════════════════════════════════ */
export function matchServiceCenter(cityText) {
  if (!cityText || cityText.length < 2) return null;
  const inp = cityText.trim().toUpperCase();

  // Exact match
  const exact = SERVICE_CENTERS.find(
    (c) => c.city_name === inp || c.branch_name === inp
  );
  if (exact) return exact;

  // Common variant → canonical name map
  const PARTIAL_MAP = {
    JAYPUR: "JAIPUR", JYPUR: "JAIPUR", VKI: "VKIA",
    ABU: "ABU ROAD", SWARUP: "SWARUPGANJ", NEEM: "NEEM KA THANA",
    BADHI: "BHILWARA", BADI: "BHILWARA", BHIL: "BHILWARA",
    JHUNJ: "JHUNJHUNU", RAMGANJ: "RAMGANJMANDI",
    SAWAI: "SAWAI MADHOPUR", GANGANA: "GANGANAGAR",
    HANUMAN: "HANUMANGARH", CHITT: "CHITTORGARH",
    PRATAP: "PRATAPGARH", BANSWA: "BANSWARA", RAJSAM: "RAJSAMAND",
    NIMBA: "NIMBAHERA", KARAUL: "KARAULI", KOTPUT: "KOTPUTLI",
    SUJAN: "SUJANGARH", DHOLP: "DHOLPUR", DUNGAR: "DUNGARPUR",
    JHALA: "JHALAWAR", BARME: "BARMER", JAISAL: "JAISALMER",
    UDAI: "UDAIPUR", ODAI: "UDAIPUR", BYKAN: "BIKANER",
    SONG: "TONK", MAVAL: "MAWAL", SUMER: "PALI", JALO: "JALOR",
    KHUSH: "KHUSHKHERA", MASUD: "MASUDA", BEAW: "BEAWAR",
  };
  for (const [w, c] of Object.entries(PARTIAL_MAP)) {
    if (inp.includes(w)) {
      return SERVICE_CENTERS.find((sc) => sc.city_name === c) || null;
    }
  }

  // 3-char prefix match
  if (inp.length >= 3) {
    const p3 = inp.slice(0, 3);
    const f = SERVICE_CENTERS.find((c) => c.city_name.startsWith(p3));
    if (f) return f;
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   parsePhoneFromText
═══════════════════════════════════════════════════════════════ */
export function parsePhoneFromText(text) {
  if (!text) return null;
  const compact = text.replace(/[\s\-,।.]/g, "");
  const nums = compact.match(/\d+/g) || [];
  for (const seq of nums) {
    if (/^[6-9]\d{9}$/.test(seq)) return seq;
    for (let i = 0; i <= seq.length - 10; i++) {
      const ch = seq.slice(i, i + 10);
      if (/^[6-9]\d{9}$/.test(ch)) return ch;
    }
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   generateChassisVariations — multi-pass lookup for chunked input
   Audio insight: customers give chassis in 2-3 chunks of 2-5 digits each
═══════════════════════════════════════════════════════════════ */
export function generateChassisVariations(chassisPartials) {
  if (!chassisPartials || chassisPartials.length === 0) return [];
  const variations = new Set();
  const n = chassisPartials.length;

  // 1. All joined
  variations.add(chassisPartials.join(""));

  // 2. All contiguous sub-concatenations
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j <= n; j++) {
      variations.add(chassisPartials.slice(i, j).join(""));
    }
  }

  // 3. Reverse order
  variations.add([...chassisPartials].reverse().join(""));

  // 4. Each individual partial
  for (const p of chassisPartials) variations.add(p);

  // 5. Two-way combos
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      variations.add(chassisPartials[i] + chassisPartials[j]);
    }
  }

  return [...variations].filter((v) => /^\d{4,7}$/.test(v));
}

/* ═══════════════════════════════════════════════════════════════
   normalizeSpokenDigits — convert spoken words to digits
═══════════════════════════════════════════════════════════════ */
export function normalizeSpokenDigits(text) {
  const map = {
    zero: "0", shunya: "0",
    ek: "1", one: "1",
    do: "2", two: "2",
    teen: "3", three: "3",
    char: "4", chaar: "4", four: "4",
    paanch: "5", five: "5",
    cheh: "6", chhe: "6", six: "6",
    saat: "7", seven: "7",
    aath: "8", eight: "8",
    nau: "9", nine: "9",
  };
  let t = text.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    t = t.replace(new RegExp(`\\b${k}\\b`, "gi"), v);
  }
  return t.replace(/\D/g, "");
}

/* ═══════════════════════════════════════════════════════════════
   sanitizeExtractedData — strip invalid values
═══════════════════════════════════════════════════════════════ */
export function sanitizeExtractedData(data) {
  const c = { ...data };
  if (c.customer_phone && !/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(c.customer_phone)))
    c.customer_phone = null;
  if (c.machine_no && !/^\d{4,7}$/.test(c.machine_no)) c.machine_no = null;
  return c;
}

/* ═══════════════════════════════════════════════════════════════
   validateExtracted — final pre-submit check
═══════════════════════════════════════════════════════════════ */
function validateExtracted(data) {
  if (!data.job_location) data.job_location = "Onsite";
  const required = ["machine_no", "complaint_title", "machine_status", "city", "city_id", "customer_phone"];
  for (const f of required) {
    if (!data[f] || data[f] === "NA" || data[f] === "Unknown")
      return { valid: false, reason: `Missing ${f}` };
  }
  if (!/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(data.customer_phone)))
    return { valid: false, reason: "Bad phone" };
  if (!/^\d{4,7}$/.test(data.machine_no))
    return { valid: false, reason: "Bad machine_no" };
  return { valid: true };
}

export default {
  getSmartAIResponse,
  extractAllData,
  extractAllComplaintTitles,
  matchServiceCenter,
  sanitizeExtractedData,
  parsePhoneFromText,
  generateChassisVariations,
  normalizeSpokenDigits,
};