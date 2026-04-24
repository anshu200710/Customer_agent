import { AzureOpenAI } from "openai";
import axios from "axios";
import serviceLogger from "./service_logger.js";

const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
});

// Response cache for common phrases
const responseCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedResponse(key) {
    const cached = responseCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.response;
    }
    responseCache.delete(key);
    return null;
}

function setCachedResponse(key, response) {
    if (responseCache.size >= CACHE_MAX_SIZE) {
        const firstKey = responseCache.keys().next().value;
        responseCache.delete(firstKey);
    }
    responseCache.set(key, { response, timestamp: Date.now() });
}

export const SERVICE_CENTERS = [
    { id: 1, city_name: "AJMER", branch_name: "AJMER", branch_code: "1", lat: 26.43488884, lng: 74.698112488 },
    { id: 2, city_name: "ALWAR", branch_name: "ALWAR", branch_code: "2", lat: 27.582258224, lng: 76.647377014 },
    { id: 3, city_name: "BANSWARA", branch_name: "UDAIPUR", branch_code: "7", lat: 23.563598633, lng: 74.417541504 },
    { id: 4, city_name: "BHARATPUR", branch_name: "ALWAR", branch_code: "2", lat: 27.201648712, lng: 77.46295166 },
    { id: 5, city_name: "BHILWARA", branch_name: "BHILWARA", branch_code: "3", lat: 25.374652863, lng: 74.623023987 },
    { id: 6, city_name: "BHIWADI", branch_name: "ALWAR", branch_code: "2", lat: 28.202623367, lng: 76.808448792 },
    { id: 7, city_name: "DAUSA", branch_name: "JAIPUR", branch_code: "4", lat: 26.905101776, lng: 76.370185852 },
    { id: 8, city_name: "DHOLPUR", branch_name: "ALWAR", branch_code: "2", lat: 26.693515778, lng: 77.876922607 },
    { id: 9, city_name: "DUNGARPUR", branch_name: "UDAIPUR", branch_code: "7", lat: 23.844612122, lng: 73.737922668 },
    { id: 10, city_name: "GONER ROAD", branch_name: "JAIPUR", branch_code: "4", lat: 26.889762878, lng: 75.873939514 },
    { id: 11, city_name: "JAIPUR", branch_name: "JAIPUR", branch_code: "4", lat: 26.865495682, lng: 75.681541443 },
    { id: 12, city_name: "JHALAWAR", branch_name: "KOTA", branch_code: "5", lat: 24.547901154, lng: 76.194129944 },
    { id: 13, city_name: "JHUNJHUNU", branch_name: "SIKAR", branch_code: "6", lat: 28.09862709, lng: 75.374809265 },
    { id: 14, city_name: "KARAULI", branch_name: "JAIPUR", branch_code: "4", lat: 26.512748718, lng: 77.021934509 },
    { id: 15, city_name: "KEKRI", branch_name: "AJMER", branch_code: "1", lat: 25.961145401, lng: 75.157318115 },
    { id: 16, city_name: "KOTA", branch_name: "KOTA", branch_code: "5", lat: 25.12909317, lng: 75.868736267 },
    { id: 17, city_name: "KOTPUTLI", branch_name: "JAIPUR", branch_code: "4", lat: 27.680557251, lng: 76.160636902 },
    { id: 18, city_name: "NEEM KA THANA", branch_name: "JAIPUR", branch_code: "4", lat: 27.741991043, lng: 75.788673401 },
    { id: 19, city_name: "NIMBAHERA", branch_name: "BHILWARA", branch_code: "3", lat: 24.617570877, lng: 74.672302246 },
    { id: 20, city_name: "PRATAPGARH", branch_name: "BHILWARA", branch_code: "3", lat: 24.038845062, lng: 74.776138306 },
    { id: 21, city_name: "RAJSAMAND", branch_name: "UDAIPUR", branch_code: "7", lat: 25.078897476, lng: 73.866836548 },
    { id: 22, city_name: "RAMGANJMANDI", branch_name: "KOTA", branch_code: "5", lat: 24.655239105, lng: 75.971496582 },
    { id: 23, city_name: "SIKAR", branch_name: "SIKAR", branch_code: "6", lat: 27.591619492, lng: 75.171058655 },
    { id: 25, city_name: "SUJANGARH", branch_name: "SIKAR", branch_code: "6", lat: 27.706758499, lng: 74.481445312 },
    { id: 26, city_name: "TONK", branch_name: "JAIPUR", branch_code: "4", lat: 26.177381516, lng: 75.81086731 },
    { id: 27, city_name: "UDAIPUR", branch_name: "UDAIPUR", branch_code: "7", lat: 24.570493698, lng: 73.745994568 },
    { id: 28, city_name: "VKIA", branch_name: "JAIPUR", branch_code: "4", lat: 27.0103827, lng: 75.7703344 },
    { id: 29, city_name: "SIROHI", branch_name: "UDAIPUR", branch_code: "7", lat: 24.8868, lng: 72.8589 },
    { id: 30, city_name: "ABU ROAD", branch_name: "UDAIPUR", branch_code: "7", lat: 24.4821, lng: 72.7056 },
    { id: 31, city_name: "SWARUPGANJ", branch_name: "JAIPUR", branch_code: "4", lat: 26.8754, lng: 75.8103 },
    { id: 32, city_name: "NOON", branch_name: "UDAIPUR", branch_code: "7", lat: 24.5, lng: 72.6 },
    { id: 33, city_name: "MAWAL", branch_name: "UDAIPUR", branch_code: "7", lat: 24.48, lng: 72.71 },
    { id: 34, city_name: "NAGAUR", branch_name: "AJMER", branch_code: "1", lat: 27.2028, lng: 73.7331 },
    { id: 35, city_name: "PALI", branch_name: "AJMER", branch_code: "1", lat: 25.7711, lng: 73.3234 },
    { id: 36, city_name: "BARMER", branch_name: "UDAIPUR", branch_code: "7", lat: 25.7465, lng: 71.3918 },
    { id: 37, city_name: "JODHPUR", branch_name: "AJMER", branch_code: "1", lat: 26.2389, lng: 73.0243 },
    { id: 38, city_name: "BIKANER", branch_name: "SIKAR", branch_code: "6", lat: 28.0229, lng: 73.3119 },
    { id: 39, city_name: "CHITTORGARH", branch_name: "BHILWARA", branch_code: "3", lat: 24.8888, lng: 74.6269 },
    { id: 40, city_name: "BUNDI", branch_name: "KOTA", branch_code: "5", lat: 25.4385, lng: 75.6478 },
    { id: 41, city_name: "SAWAI MADHOPUR", branch_name: "JAIPUR", branch_code: "4", lat: 26.0178, lng: 76.3561 },
    { id: 42, city_name: "CHURU", branch_name: "SIKAR", branch_code: "6", lat: 28.2961, lng: 74.9670 },
    { id: 43, city_name: "HANUMANGARH", branch_name: "SIKAR", branch_code: "6", lat: 29.5833, lng: 74.3333 },
    { id: 44, city_name: "GANGANAGAR", branch_name: "SIKAR", branch_code: "6", lat: 29.9167, lng: 73.8833 },
    { id: 45, city_name: "JAISALMER", branch_name: "UDAIPUR", branch_code: "7", lat: 26.9157, lng: 70.9083 },
    { id: 46, city_name: "JALOR", branch_name: "UDAIPUR", branch_code: "7", lat: 25.3474, lng: 72.6170 },
    { id: 47, city_name: "BARAN", branch_name: "KOTA", branch_code: "5", lat: 25.1017, lng: 76.5136 },
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🧠 SYSTEM PROMPT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function buildSystemPrompt(callData) {
    const d = callData.extractedData;
    const intent = callData.intent || 'unknown';
    const cityList = SERVICE_CENTERS.map(c => c.city_name).join(', ');
    
    return `You are Priya — a warm, intelligent, fast-speaking female service agent at Rajesh Motors JCB service center.

Collected Data: ${Object.entries(d).filter(([k, v]) => v && !k.startsWith('_')).map(([k, v]) => `${k}=${v}`).join(' | ') || 'nothing yet'}
User Intent: ${intent}

RULES:
1. Reply in Hindi, naturally and warm
2. Keep replies SHORT — max 12 words
3. Ask only for the next missing required field
4. Do not answer general questions or side topics here
5. Extract: machine_no (4-7 digits), complaint_title, machine_status (Breakdown or Running With Problem), city, customer_phone (10 digits)
6. After ALL data: ask "Theek hai, aur koi problem? Save kar dun?"

Current Status: ${!d.machine_no ? "Need machine number" : !d.complaint_title ? "Need complaint description" : !d.machine_status ? "Ask: Machine band hai ya problem ke saath chal rahi hai?" : !d.city ? `Need city from: ${cityList}` : !d.customer_phone ? "Need 10-digit phone" : "Ready to save — ask final confirmation"}

OUTPUT FORMAT (end every response with this):
[your reply] ### {"extracted":{"machine_no":"${d.machine_no || ''}","complaint_title":"${d.complaint_title || ''}","machine_status":"${d.machine_status || ''}","city":"${d.city || ''}","customer_phone":"${d.customer_phone || ''}","complaint_details":"${d.complaint_details || ''}"},"ready_to_submit":false}`;
}

export async function getAIResponse(promptText) {
    try {
        const resp = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful JCB service agent. Answer clearly in Hinglish." },
                { role: "user", content: promptText }
            ],
            temperature: 0.6,
            max_tokens: 120,
            top_p: 0.9,
        });

        return resp.choices?.[0]?.message?.content?.trim() || "Ji, thoda aur bataiye.";
    } catch (err) {
        console.error("❌ [AI RESPONSE]", err.message);
        return "Ji, machine number bataiye.";
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💰 COST CALCULATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function calculateCost(tokens, service) {
    const pricing = {
        'azure-openai': 0.0001,
        'groq': 0.00005,
        'ollama': 0,
        'openai': 0.0001
    };
    
    const pricePerToken = pricing[service] || 0;
    const costUSD = (tokens / 1000) * pricePerToken;
    const costINR = costUSD * 83;
    
    return costINR;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 NORMALIZE EXTRACTED VALUE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function normalizeExtractedValue(v) {
    if (!v || v === null || v === undefined) return null;
    let s = String(v).trim();
    if (!s || /^(null|undefined|na|n\/a|unknown|none|empty|not collected)$/i.test(s)) return null;

    // Collapse spelled-out letters like "P R A J A P A T I" to "PRAJAPATI"
    if (/^([A-Za-z]\s+){2,}[A-Za-z]$/.test(s)) {
        s = s.replace(/\s+/g, "");
    }

    // Normalize full uppercase names and city values to title case
    if (/^[A-Z\s]+$/.test(s) && s.length > 1 && !/\b(JCB|AI|TTS|URL|HTTP|API)\b/.test(s)) {
        s = s.toLowerCase().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
    }

    return s;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📝 ENTITY EXTRACTION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function extractEntities(userInput, callData) {
    const startTime = Date.now();
    
    try {
        const extractionPrompt = `Extract entities from this user input for a JCB complaint system.

User Input: "${userInput}"

Current Context:
- Machine Number: ${callData.extractedData.machine_no || 'not collected'}
- Complaint: ${callData.extractedData.complaint_title || 'not collected'}
- City: ${callData.extractedData.city || 'not collected'}
- Phone: ${callData.extractedData.customer_phone || 'not collected'}
- Customer Name: ${callData.extractedData.customer_name || 'not collected'}

Classify the user's INTENT and extract ENTITIES. Return ONLY valid JSON:

{
  "intent": "provide_info" | "side_question" | "confirm" | "deny" | "ask_clarification",
  "confirm_type": "yes" | "no" | null,
  "entities": {
    "machine_no": "1234567" | null,
    "customer_name": "Rajesh Prajapati" | null,
    "complaint_title": "Engine Not Starting" | null,
    "machine_status": "Breakdown" | "Running With Problem" | null,
    "city": "JAIPUR" | null,
    "customer_phone": "9876543210" | null,
    "complaint_details": "Oil Leakage; Brake Failure" | null
  }
}

Rules:
- Intent "provide_info": User is giving complaint/machine/city/phone info
- Intent "side_question": User is asking about process/cost/time/agent name
- Intent "confirm": User is saying yes/haan/theek hai
- Intent "deny": User is saying no/nahi
- Extract machine numbers as 4-7 digit strings
- Extract phone as 10-digit Indian numbers
- Use exact city names from: ${SERVICE_CENTERS.map(c => c.city_name).join(', ')}
- complaint_title should be primary problem in English
- machine_status: "Breakdown" if completely stopped, "Running With Problem" if still working`;

        const messages = [
            { role: "system", content: "You are an entity extraction AI. Return ONLY valid JSON. No explanations." },
            { role: "user", content: extractionPrompt }
        ];

        const resp = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
            messages,
            temperature: 0.1,
            max_tokens: 200,
        });

        const raw = resp.choices?.[0]?.message?.content?.trim();
        if (!raw) {
            console.error('❌ Empty extraction response');
            return { intent: 'provide_info', entities: {} };
        }

        let parsed;
        try {
            const cleanJson = raw.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            console.error('❌ Failed to parse extraction JSON:', raw);
            return { intent: 'provide_info', entities: {} };
        }

        const cleanedEntities = {};
        for (const [k, v] of Object.entries(parsed.entities || {})) {
            cleanedEntities[k] = normalizeExtractedValue(v);
        }

        const latency = Date.now() - startTime;
        console.log(`   🧠 Entity extraction: ${normalizeExtractedValue(parsed.intent) || 'provide_info'} | ${JSON.stringify(cleanedEntities)} (${latency}ms)`);

        return {
            intent: normalizeExtractedValue(parsed.intent) || 'provide_info',
            confirm_type: normalizeExtractedValue(parsed.confirm_type) || null,
            entities: cleanedEntities,
            ...cleanedEntities
        };

    } catch (err) {
        console.error('❌ Entity extraction failed:', err.message);
        return { intent: 'provide_info', entities: {} };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🤖 MAIN AI CALL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function getSmartAIResponse(callData) {
    const startTime = Date.now();
    let service = 'Azure OpenAI';
    let model = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
    let prompt = '';
    let response = '';
    let error = null;
    
    try {
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        const lastUserMsg = callData.messages.filter(m => m.role === "user").pop()?.text || "";
        if (lastUserMsg) {
            const rxData = extractAllData(lastUserMsg, callData.extractedData);
            for (const [k, v] of Object.entries(rxData)) {
                if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
            }
        }

        if (callData.extractedData.city && !callData.extractedData.city_id) {
            const mc = matchServiceCenter(callData.extractedData.city);
            if (mc) {
                callData.extractedData.city = mc.city_name;
                callData.extractedData.city_id = mc.branch_code;
                callData.extractedData.branch = mc.branch_name;
                callData.extractedData.outlet = mc.city_name;
                callData.extractedData.lat = mc.lat;
                callData.extractedData.lng = mc.lng;
            }
        }

        const systemPrompt = buildSystemPrompt(callData);
        prompt = systemPrompt;

        const messages = [
            { role: "system", content: systemPrompt },
            ...callData.messages.slice(-8).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.text,
            })),
        ];
        if (!messages.find(m => m.role === "user")) {
            messages.push({ role: "user", content: "[call connected]" });
        }

        const resp = await client.chat.completions.create({
            model: model,
            messages,
            temperature: 0.15,
            max_tokens: 160,
            top_p: 0.9,
        });

        const raw = resp.choices?.[0]?.message?.content?.trim();
        if (!raw) throw new Error("Empty Azure OpenAI response");

        response = raw;

        const sepIdx = raw.indexOf("###");
        let replyText = sepIdx !== -1 ? raw.slice(0, sepIdx).trim() : raw.trim();
        let extractedJSON = {};
        let readyToSubmit = false;

        if (sepIdx !== -1) {
            try {
                const jsonStr = raw.slice(sepIdx + 3).trim().replace(/```json|```/g, "");
                const match = jsonStr.match(/\{[\s\S]*\}/);
                if (match) {
                    const parsed = JSON.parse(match[0]);
                    readyToSubmit = !!parsed.ready_to_submit;
                    extractedJSON = parsed.extracted || {};
                }
            } catch { /* ignore */ }
        }

        const merged = { ...callData.extractedData };
        for (const [k, v] of Object.entries(extractedJSON)) {
            const cleanValue = normalizeExtractedValue(v);
            if (!cleanValue || cleanValue === "NA" || cleanValue === "") continue;
            if (k === "customer_phone") {
                const ph = String(cleanValue).replace(/[\s\-]/g, "");
                if (/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(ph)) merged.customer_phone = ph;
            } else if (k === "complaint_details") {
                const existing = (merged.complaint_details || '').split('; ').map(s => s.trim()).filter(Boolean);
                const incoming = String(cleanValue).split('; ').map(s => s.trim()).filter(Boolean);
                const combined = [...existing];
                for (const item of incoming) {
                    if (!combined.includes(item)) combined.push(item);
                }
                merged.complaint_details = combined.join('; ');
            } else {
                merged[k] = cleanValue;
            }
        }

        if (merged.city && !merged.city_id) {
            const mc = matchServiceCenter(merged.city);
            if (mc) {
                merged.city = mc.city_name;
                merged.city_id = mc.branch_code;
                merged.branch = mc.branch_name;
                merged.outlet = mc.city_name;
                merged.lat = mc.lat;
                merged.lng = mc.lng;
            }
        }

        replyText = replyText.replace(/```[\s\S]*?```/g, "").replace(/###[\s\S]*/g, "").trim();

        if (readyToSubmit) {
            const v = validateExtracted(merged);
            if (!v.valid) { 
                readyToSubmit = false; 
                console.warn(`⚠️ Not ready: ${v.reason}`); 
            }
        }

        const latency = Date.now() - startTime;
        const tokens = resp.usage?.total_tokens || 0;
        const cost = calculateCost(tokens, 'azure-openai');

        const callSid = callData?.CallSid || callData?.callSid || null;
        serviceLogger.logLLM(
            callSid,
            service,
            model,
            prompt,
            response,
            {
                latency,
                tokens,
                cost,
                success: true
            }
        );

        console.log(`   🤖 AI: "${replyText}" | ready:${readyToSubmit}`);
        return { text: replyText, extractedData: merged, readyToSubmit };

    } catch (err) {
        error = err.message;
        const latency = Date.now() - startTime;
        
        serviceLogger.logLLM(
            callData.callSid,
            service,
            model,
            prompt,
            null,
            {
                latency,
                tokens: 0,
                cost: 0,
                success: false,
                error: error
            }
        );

        console.error("❌ [Azure OpenAI]", error);
        return {
            text: "Ji, bataiye.",
            extractedData: callData.extractedData || {},
            readyToSubmit: false,
        };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚡ REGEX EXTRACTION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function extractAllData(text, cur = {}) {
    const ex = {};
    const numberMap = {
        "एक": "1", "दो": "2", "तीन": "3", "चार": "4", "पांच": "5", "पाँच": "5", "छह": "6", "सात": "7", "आठ": "8", "नौ": "9", "शून्य": "0",
        "zero": "0", "one": "1", "two": "2", "three": "3", "four": "4", "five": "5", "six": "6", "seven": "7", "eight": "8", "nine": "9",
        "teen": "3", "char": "4", "paanch": "5", "chhe": "6", "saat": "7", "aath": "8", "nau": "9",
        "ek": "1", "do": "2", "teen": "3", "chaar": "4", "paanch": "5", "chhe": "6", "saat": "7", "aath": "8", "nau": "9",
    };
    let normalizedText = text;
    for (const [word, digit] of Object.entries(numberMap)) {
        normalizedText = normalizedText.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
    }
    const lo = normalizedText.toLowerCase().replace(/[।\.\!\?]/g, " ").replace(/\s+/g, " ").trim();

    if (/^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|leke aata|bas|ok|haan|ha|acha|achha)\s*$/i.test(lo)) return {};

    // Machine number (4-7 digits)
    if (!cur.machine_no) {
        const phoneLike = text.replace(/(?:[6-9][\s\-\.,]*){10,}/g, '');
        const noPhone = phoneLike.replace(/[6-9]\d{9}/g, '');

        const labelRx = /(chassis|machine|serial|s\.no|s no|machine no|chassis no|serial no|सीरियल|चेसिस|मशीन)\s*(?:number|no|n\.?|नं(?:\.?)|नंबर)?[\s:\-]*([0-9][0-9\-\s]{3,20})/i;
        const explicitMatch = text.match(labelRx);
        if (explicitMatch) {
            const digits = explicitMatch[2].replace(/[^0-9]/g, '');
            if (/^\d{4,7}$/.test(digits)) {
                ex.machine_no = digits;
            }
        }

        if (!ex.machine_no) {
            const digitsOnly = noPhone.replace(/[^0-9]/g, '');
            for (let len = 7; len >= 4; len--) {
                for (let i = 0; i <= digitsOnly.length - len; i++) {
                    const chunk = digitsOnly.slice(i, i + len);
                    if (/^[6-9]/.test(chunk) && digitsOnly.length >= 10) continue;
                    ex.machine_no = chunk;
                    break;
                }
                if (ex.machine_no) break;
            }
        }
    }

    // Phone (10 digit Indian)
    if (!cur.customer_phone || !/^[6-9]\d{9}$/.test(cur.customer_phone)) {
        const compact = text.replace(/[\s\-\.,।]/g, "");
        const nums = compact.match(/\d+/g) || [];

        for (const seq of nums) {
            if (/^[6-9]\d{9}$/.test(seq)) { ex.customer_phone = seq; break; }
            for (let i = 0; i <= seq.length - 10; i++) {
                const ch = seq.slice(i, i + 10);
                if (/^[6-9]\d{9}$/.test(ch)) { ex.customer_phone = ch; break; }
            }
            if (ex.customer_phone) break;
        }

        if (!ex.customer_phone) {
            const phoneLabelRx = /(?:mobile|phone|number|nambar|नंबर|फोन)\s*(?:is|hai|no|n\.?|nambar)?\s*([0-9\s\-]{10,25})/i;
            const phoneMatch = text.match(phoneLabelRx);
            if (phoneMatch) {
                const digits = phoneMatch[1].replace(/[^0-9]/g, '');
                if (/^[6-9]\d{9}$/.test(digits)) ex.customer_phone = digits;
            }
        }
    }

    // Customer name
    if (!cur.customer_name) {
        const nameRx = /(?:\b(?:mera naam hai|mera naam|name is|naam hai|main hu|main hoon|main hun|mai hu|mai hoon)\b[:\- ]*)\s*([A-Za-z\u0900-\u097F][A-Za-z\u0900-\u097F\s]{2,50})/i;
        const nameMatch = text.match(nameRx);
        if (nameMatch) {
            ex.customer_name = normalizeExtractedValue(nameMatch[1]);
        }
    }

    // City
    if (!cur.city) {
        const DEVA_MAP = {
            "भीलवाड़ा": "BHILWARA", "बड़ी": "BHILWARA", "जयपुर": "JAIPUR", "अजमेर": "AJMER",
            "अलवर": "ALWAR", "जोधपुर": "JODHPUR", "उदयपुर": "UDAIPUR",
            "कोटा": "KOTA", "सीकर": "SIKAR", "बीकानेर": "BIKANER",
            "टोंक": "TONK", "झुंझुनू": "JHUNJHUNU", "दौसा": "DAUSA",
            "नागौर": "NAGAUR", "पाली": "PALI", "बाड़मेर": "BARMER",
            "जैसलमेर": "JAISALMER", "चित्तौड़गढ़": "CHITTORGARH", "बूंदी": "BUNDI",
        };
        for (const [d, l] of Object.entries(DEVA_MAP)) {
            if (text.includes(d) || lo.includes(d.toLowerCase())) { ex.city = l; break; }
        }
        if (!ex.city) {
            const sorted = [...SERVICE_CENTERS].sort((a, b) => b.city_name.length - a.city_name.length);
            for (const c of sorted) {
                const cityName = c.city_name.toLowerCase();
                const branchName = c.branch_name.toLowerCase();
                if (lo.includes(cityName) || lo.includes(branchName)) { ex.city = c.city_name; break; }
            }
        }
    }

    // Machine status
    if (!cur.machine_status) {
        const bkRx = /(band|khadi|khari|stop|ruk gayi|breakdown|बंद|खड़ी|chalu nahi|chalti nahi|start nahi|start nhi|nahi chal|padi hai|band padi|chal nhi rahi|chal nhi|nhi chal|nahi chalti|band padi hai|khadi padi|chal nai ryi|chaalti nai|chal nai)/;
        const rwRx = /(chal rahi|chal rhi|running|chalu hai|dikkat|problem|चल रही|चालू है|chal ryi|chaalti hai)/;
        const svRx = /(filter|filttar|filtar|service|oil change|tel badlo|seva|सर्विस|फिल्टर)/;
        if (bkRx.test(lo) || bkRx.test(text)) ex.machine_status = "Breakdown";
        else if (svRx.test(lo)) ex.machine_status = "Running With Problem";
        else if (rwRx.test(lo) || rwRx.test(text)) ex.machine_status = "Running With Problem";
    }

    // Complaint title
    if (!cur.complaint_title) {
        const mCtx = /(machine|jcb|start|chalu|engine|मशीन|इंजन)/.test(lo);
        const ns = /(start nahi|start nhi|chalu nahi|chalu nhi|chalti nahi|chal nahi rahi|nahi chal rahi|चालू नहीं|स्टार्ट नहीं|नहीं चल|chal nai|start nai ho|chaalti nai)/.test(lo);
        const bnd = /(band hai|band ho gayi|band pad|khari hai|बंद है|बंद हो|band padi|khadi padi)/.test(lo) && mCtx;

        if (ns || bnd) ex.complaint_title = "Engine Not Starting";
        else if (/(filter|filttar|filtar|service|servicing|seva|oil change|tel badlo|tel badalwana)/.test(lo)) ex.complaint_title = "Service/Filter Change";
        else if (/(dhuan|dhua|smoke|dhuen|dhuwaan)/.test(lo)) ex.complaint_title = "Engine Smoke";
        else if (/(garam|dhak|overheat|ubhal|tapta|tapt gyi|bahut garam|dhak gyi)/.test(lo)) ex.complaint_title = "Engine Overheating";
        else if (/(tel nikal|oil leak|rissa|risso|tel nikal ryo|oil aa raha|tel aa raha|riss ryo)/.test(lo)) ex.complaint_title = "Oil Leakage";
        else if (/(hydraulic|hydraulik|hydro|ailak|cylinder|bucket|boom|jack|dipper|bucket nai uthta)/.test(lo)) ex.complaint_title = "Hydraulic System Failure";
        else if (/(race nahi|race nai|ras nahi|ras nai|accelerator|gas nahi|gas nai|pickup nahi|gas nai leti)/.test(lo)) ex.complaint_title = "Accelerator Problem";
        else if (/(ac nahi|ac nai|hawa nahi|thanda nahi|ac band|ac kharab|cooling nahi|thando nai)/.test(lo)) ex.complaint_title = "AC Not Working";
        else if (/(brake nahi|brake nhi|brake nai|rokti nahi|brake fail|brake kharab|rokti nai)/.test(lo)) ex.complaint_title = "Brake Failure";
        else if (/(bijli nahi|headlight|bulb|electrical|light nahi|battery|bijli nai)/.test(lo)) ex.complaint_title = "Electrical Problem";
        else if (/(tire|tyre|pankchar|puncture|टायर|flat)/.test(lo)) ex.complaint_title = "Tire Problem";
        else if (/(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration|noise|khad khad|aavaaz aa ri|khatak aa ri)/.test(lo)) ex.complaint_title = "Abnormal Noise";
        else if (/(steering|स्टीयरिंग|steering kharab)/.test(lo)) ex.complaint_title = "Steering Problem";
        else if (/(gear|transmission|गियर|gear nahi|gear slip)/.test(lo)) ex.complaint_title = "Transmission Problem";
        else if (/(coolant|paani nikal|water leak|radiator|paani)/.test(lo)) ex.complaint_title = "Coolant Leakage";
        else if (/(boom|arm nahi|dipper nahi|arm nai uthta)/.test(lo)) ex.complaint_title = "Boom/Arm Failure";
        else if (/(turbo|turbocharger|black smoke)/.test(lo)) ex.complaint_title = "Turbocharger Issue";
    }

    return ex;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗺️ MATCH SERVICE CENTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function matchServiceCenter(cityText) {
    if (!cityText || cityText.length < 2) return null;
    const inp = cityText.trim().toUpperCase();

    const exact = SERVICE_CENTERS.find(c => c.city_name === inp || c.branch_name === inp);
    if (exact) return exact;

    const PARTIAL_MAP = {
        "JAYPUR": "JAIPUR", "JYPUR": "JAIPUR", "VKI": "VKIA",
        "ABU": "ABU ROAD", "SWARUP": "SWARUPGANJ", "NEEM": "NEEM KA THANA",
        "BADHI": "BHILWARA", "BADI": "BHILWARA", "BHIL": "BHILWARA",
    };
    for (const [w, c] of Object.entries(PARTIAL_MAP)) {
        if (inp.includes(w)) return SERVICE_CENTERS.find(sc => sc.city_name === c) || null;
    }

    if (inp.length >= 3) {
        const p3 = inp.slice(0, 3);
        const f = SERVICE_CENTERS.find(c => c.city_name.startsWith(p3));
        if (f) return f;
    }
    return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ VALIDATE + SANITIZE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function validateExtracted(data) {
    if (!data.job_location) data.job_location = "Onsite";
    const required = ["machine_no", "complaint_title", "machine_status", "city", "city_id", "customer_phone"];
    for (const f of required) {
        if (!data[f] || data[f] === "NA" || data[f] === "Unknown")
            return { valid: false, reason: `Missing ${f}` };
    }
    if (!/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(data.customer_phone))) return { valid: false, reason: "Bad phone" };
    if (!/^\d{4,7}$/.test(data.machine_no)) return { valid: false, reason: "Bad machine_no" };
    return { valid: true };
}

export function sanitizeExtractedData(data) {
    const c = { ...data };
    if (c.customer_name) c.customer_name = normalizeExtractedValue(c.customer_name);
    if (c.customer_phone) c.customer_phone = normalizeExtractedValue(c.customer_phone);
    if (c.machine_no) c.machine_no = normalizeExtractedValue(c.machine_no);
    if (c.complaint_title) c.complaint_title = normalizeExtractedValue(c.complaint_title);
    if (!c.complaint_title && c.complaint_details) c.complaint_title = normalizeExtractedValue(c.complaint_details);
    if (c.customer_phone && !/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(c.customer_phone))) c.customer_phone = null;
    if (c.machine_no && !/^\d{4,7}$/.test(c.machine_no)) c.machine_no = null;
    if (c.complaint_title && /^(not collected|unknown|na|n\/a|none|empty)$/i.test(String(c.complaint_title).trim())) c.complaint_title = null;
    return c;
}

export default { getSmartAIResponse, extractEntities, extractAllData, sanitizeExtractedData, matchServiceCenter };
