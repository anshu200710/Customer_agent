import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SERVICE_CENTERS = [
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
   🔊 SSML HELPER — makes TTS sound human
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * Wraps plain text in SSML so Google Wavenet sounds natural.
 * - Adds brief pauses at sentence ends
 * - Slows down number-by-number reading
 * - Uses <prosody> to vary rate/pitch slightly (warmth)
 */
export function toSSML(text) {
    if (!text) return "<speak>Ek minute.</speak>";

    // Escape XML special chars first
    let s = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Sentence-level breathing pause
    s = s.replace(/([।\.!?])\s+/g, '$1<break time="350ms"/> ');

    // Short comma/list pause
    s = s.replace(/,\s*/g, ',<break time="150ms"/> ');

    // Numbers spoken digit by digit (for complaint IDs)
    // We'll handle that separately in voice.js when we know the ID

    return `<speak><prosody rate="medium" pitch="+1st">${s}</prosody></speak>`;
}

/**
 * Reads a complaint/SAP ID naturally, digit by digit with pauses.
 */
export function toSSMLId(idStr) {
    const digits = String(idStr).split("").join('<break time="200ms"/>');
    return `<speak><prosody rate="slow">${digits}</prosody></speak>`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🧠 SYSTEM PROMPT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function buildSystemPrompt(callData) {
    const d = callData.extractedData;

    const customerBlock = callData.customerData
        ? `CUSTOMER IDENTIFIED: ${callData.customerData.name} | Machine: ${callData.customerData.machineNo} | City: ${callData.customerData.city} | Phone: ${callData.customerData.phone}`
        : `CUSTOMER NOT YET IDENTIFIED — need machine number first`;

    // Determine the ONE next field to ask about (strict ordering)
    let nextAsk = null;
    let nextQuestion = "";
    if (!d.machine_no) {
        nextAsk = "machine_no";
        nextQuestion = `ASK: "Machine number bataiye?" (4-8 digit number)`;
    } else if (!d.complaint_title) {
        nextAsk = "complaint_title";
        nextQuestion = `ASK: "Kya problem aa rahi machine mein?"`;
    } else if (!d.machine_status) {
        nextAsk = "machine_status";
        nextQuestion = `ASK: "Machine chal rahi hai ya bilkul band ho gayi?"`;
    } else if (!d.city) {
        nextAsk = "city";
        nextQuestion = `ASK: "Kaunse shahar mein hai machine?"`;
    } else if (!d.customer_phone || !/^[6-9]\d{9}$/.test(d.customer_phone)) {
        nextAsk = "customer_phone";
        nextQuestion = `ASK: "Aapka 10 digit mobile number?"`;
    }
    // job_location is optional ask — defaults to "Onsite" at submit time

    const statusLine = [
        `machine=${d.machine_no || "❌"}`,
        `problem=${d.complaint_title || "❌"}`,
        `status=${d.machine_status || "❌"}`,
        `where=${d.job_location || "❌"}`,
        `city=${d.city || "❌"}`,
        `phone=${d.customer_phone || "❌"}`,
    ].join(" | ");

    return `Tu ek JCB service coordinator hai — Rajesh Motors, Rajasthan. Tera naam Priya hai.
Tu bilkul ek REAL HUMAN AGENT ki tarah baat karti hai — natural, warm, conversational.

${customerBlock}
DATA: ${statusLine}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ ABHI SIRF YEH KAR:
${nextAsk ? nextQuestion : "✅ SAB DATA HAI → ready_to_submit: true karo"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL RULES:

1. GREEDY COLLECTION: Agar user ek hi turn mein multiple cheezein bata de
   (e.g., "machine band hai site pe bhilwara mein 9876543210 number hai")
   toh SAB extract karo ek saath. Sirf wo poocho jo abhi bhi missing hai.

2. STRICT QUESTION ORDER (jo missing hai pehle wo poocho):
   machine_no → complaint_title → machine_status → city → customer_phone
   job_location mat poocho — system auto-detect karta hai.

3. RESPONSE: Max 5-8 words. "Achha." ya "Haan." se acknowledge, phir seedha next question.

4. NOISE DETECT: Agar user ki baat mein koi data NAHI (e.g., "papa", "baat karna", "punjabi"):
   → Same question dobara poocho. extracted: {} do.

5. PHONE: Sirf 10 digit, 6/7/8/9 se shuru. "3505467" ya "456785" phone NAHI hai.
   Agar invalid → "10 digit number chahiye ji."

6. MACHINE NUMBER: 4-8 digits. "Machine operator 3505447" → machine_no: "3505447"

7. USER HINDI/DEVANAGARI MEIN BOLE TO SAMJHO:
   "चालू नहीं हो रहा" = Engine Not Starting (machine context pe)
   "भीलवाड़ा" = BHILWARA city
   "बंद है" = Breakdown | "चल रही है" = Running With Problem

8. KABHI MAT BOLO: "Rajesh Motors se", "note kar liya", long sentences

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RAJASTHANI: Mharo=Mera | Tel nikal ryo=Oil leak | Dhak gyi=Overheat
Band padi=Breakdown | Race nahi=Accelerator | Khatakhat=Noise
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📤 OUTPUT (STRICTLY):
[Response] ### {"intent":"continue","extracted":{"machine_no":"...","complaint_title":"...","machine_status":"...","city":"...","customer_phone":"..."},"ready_to_submit":false}

FIELD NAMES (exact, no variations):
machine_no | complaint_title | machine_status | job_location | city | customer_phone | complaint_details

ready_to_submit: true ONLY when: machine_no ✅ complaint_title ✅ machine_status ✅ city ✅ customer_phone(10 digit) ✅`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🤖 GET AI RESPONSE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export async function getSmartAIResponse(callData) {
    try {
        // ── STEP 1: Sanitize invalid values ──────────────────────
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // ── STEP 2: Greedy regex over ALL user messages ───────────
        // Catches data the AI JSON missed (wrong field names, etc.)
        let regexAccum = { ...callData.extractedData };
        for (const msg of callData.messages) {
            if (msg.role === "user") {
                const rx = extractWithRegex(msg.text, regexAccum);
                regexAccum = { ...regexAccum, ...rx };
            }
        }
        // Merge — only fill missing fields, never overwrite valid data
        for (const [k, v] of Object.entries(regexAccum)) {
            if (v && !callData.extractedData[k]) {
                callData.extractedData[k] = v;
            }
        }
        // Always re-sanitize after regex merge (belt + suspenders)
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        const systemPrompt = buildSystemPrompt(callData);

        const messages = [
            { role: "system", content: systemPrompt },
            ...callData.messages.map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.text,
            })),
        ];

        // First turn — inject a silent trigger
        if (callData.messages.length === 0) {
            messages.push({
                role: "user",
                content: callData.customerData
                    ? `[Call connected. Customer ${callData.customerData.name} is identified. Greet briefly and ask about their problem.]`
                    : `[Call connected. Ask for machine number naturally.]`,
            });
        }

        console.log(`\n🤖 [AI] Calling Groq (llama-3.3-70b)...`);

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",   // Better model for nuanced Hindi
            messages,
            temperature: 0.35,                  // Slightly warmer = more human
            max_tokens: 180,
            top_p: 0.9,
            stop: null,
        });

        const aiText = response.choices?.[0]?.message?.content?.trim();
        if (!aiText) throw new Error("Empty AI response");

        console.log(`✅ [AI] Raw: "${aiText.substring(0, 100)}..."`);

        // Parse the response (AI JSON + field name normalization)
        const parsed = parseAIResponse(aiText, callData);

        // Regex on current turn (catches what AI JSON missed or named wrong)
        if (callData.messages.length > 0) {
            const lastUser = callData.messages.filter(m => m.role === "user").pop()?.text || "";
            const regexNow = extractWithRegex(lastUser, {
                ...callData.extractedData,
                ...parsed.extractedData,
            });
            // Merge: regex wins for fields not yet captured
            for (const [k, v] of Object.entries(regexNow)) {
                if (v && !parsed.extractedData[k]) {
                    parsed.extractedData[k] = v;
                }
            }
        }

        // City matching & branch assignment
        if (parsed.extractedData.city && !parsed.extractedData.city_id) {
            const matched = matchServiceCenter(parsed.extractedData.city);
            if (matched) {
                parsed.extractedData.city = matched.city_name;
                parsed.extractedData.city_id = matched.branch_code;
                parsed.extractedData.branch = matched.branch_name;
                parsed.extractedData.outlet = matched.city_name;
                parsed.extractedData.lat = matched.lat;
                parsed.extractedData.lng = matched.lng;
                console.log(`   🗺️  City matched: ${matched.city_name} → Branch: ${matched.branch_name}`);
            }
        }

        // Final validation gate
        if (parsed.readyToSubmit) {
            const v = validateData(parsed.extractedData);
            if (!v.valid) {
                console.warn(`⚠️  Validation blocked submit: ${v.reason}`);
                parsed.readyToSubmit = false;
            }
        }

        console.log(`   📊 Machine:${parsed.extractedData.machine_no || "❌"} Problem:${parsed.extractedData.complaint_title || "❌"} City:${parsed.extractedData.city || "❌"} Phone:${parsed.extractedData.customer_phone || "❌"} Submit:${parsed.readyToSubmit}`);

        return parsed;

    } catch (error) {
        console.error("❌ [AI] Error:", error.message);
        return {
            text: "Ji, ek second.",
            intent: "error",
            extractedData: callData.extractedData || {},
            readyToSubmit: false,
        };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔍 PARSE AI RESPONSE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function parseAIResponse(aiText, callData) {
    let text = aiText;
    let extractedData = { ...callData.extractedData };
    let readyToSubmit = false;
    let intent = "continue";

    try {
        const sepIdx = aiText.indexOf("###");
        if (sepIdx !== -1) {
            text = aiText.substring(0, sepIdx).trim();
            let jsonStr = aiText.substring(sepIdx + 3).trim().replace(/```json|```/g, "");
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const j = JSON.parse(jsonMatch[0]);
                intent = j.intent || "continue";
                readyToSubmit = !!j.ready_to_submit;

                if (j.extracted && typeof j.extracted === "object") {
                    // Normalize common AI field name mistakes
                    const KEY_MAP = {
                        "machine": "machine_no",
                        "machine_number": "machine_no",
                        "machineNo": "machine_no",
                        "problem": "complaint_title",
                        "complaint": "complaint_title",
                        "issue": "complaint_title",
                        "status": "machine_status",
                        "location": "job_location",
                        "phone": "customer_phone",
                        "mobile": "customer_phone",
                        "number": "customer_phone",
                        "city_name": "city",
                        "town": "city",
                        "subtitle": "complaint_subtitle",
                        "sub_title": "complaint_subtitle",
                        "details": "complaint_details",
                    };

                    for (let [k, v] of Object.entries(j.extracted)) {
                        if (!v || v === "NA" || v === "Unknown" || v === "") continue;
                        // Normalize key
                        k = KEY_MAP[k] || k;
                        // Phone validation
                        if (k === "customer_phone") {
                            const ph = String(v).replace(/[\s\-]/g, "");
                            if (/^[6-9]\d{9}$/.test(ph)) {
                                extractedData[k] = ph;
                            } else {
                                console.warn("⚠️  AI gave bad phone, ignoring: " + v);
                            }
                        } else {
                            extractedData[k] = v;
                        }
                    }
                    // Accumulate complaint_details
                    if (j.extracted.complaint_details) {
                        const prev = callData.extractedData.complaint_details || "";
                        const next = j.extracted.complaint_details;
                        if (!prev) {
                            extractedData.complaint_details = next;
                        } else if (!prev.includes(next)) {
                            extractedData.complaint_details = `${prev}. ${next}`;
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error("❌ JSON parse error:", err.message);
    }

    // Strip any stray JSON/markdown from spoken text
    text = text
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/###[\s\S]*/g, "")
        .trim();

    return { text, intent, extractedData, readyToSubmit };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔍 REGEX EXTRACTION — runs on ALL user turns, primary source of truth
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function extractWithRegex(text, currentData) {
    const extracted = {};
    // Work with both original (for Devanagari) and lowercased latin
    const orig = text;
    const lower = text.toLowerCase().replace(/[।\.\!\?]/g, " ").replace(/\s+/g, " ").trim();

    // ── Machine number (4-8 digits) ───────────────────────────────
    if (!currentData.machine_no) {
        const cleaned = lower.replace(/\b[6-9]\d{9}\b/g, "").replace(/\b[6-9]\d{8}\b/g, "");
        const m = cleaned.match(/\b(\d{4,8})\b/);
        if (m) extracted.machine_no = m[1];
    }

    // ── Phone — strictly 10 digits starting 6-9 ──────────────────
    if (!currentData.customer_phone || !/^[6-9]\d{9}$/.test(currentData.customer_phone)) {
        const compact = text.replace(/[\s\-,।\.]/g, "");
        const allSeqs = compact.match(/\d+/g) || [];
        let found = null;
        for (const seq of allSeqs) {
            if (/^[6-9]\d{9}$/.test(seq)) { found = seq; break; }
            for (let i = 0; i <= seq.length - 10; i++) {
                const chunk = seq.slice(i, i + 10);
                if (/^[6-9]\d{9}$/.test(chunk)) { found = chunk; break; }
            }
            if (found) break;
        }
        if (found) extracted.customer_phone = found;
    }

    // ── City — match both Devanagari and Latin city names ─────────
    if (!currentData.city) {
        // Devanagari city map (how STT outputs Hindi speech)
        const DEVA_CITIES = {
            "भीलवाड़ा": "BHILWARA", "जयपुर": "JAIPUR", "अजमेर": "AJMER", "अलवर": "ALWAR",
            "जोधपुर": "JODHPUR", "उदयपुर": "UDAIPUR", "कोटा": "KOTA", "सीकर": "SIKAR",
            "बीकानेर": "BIKANER", "टोंक": "TONK", "झुंझुनू": "JHUNJHUNU", "दौसा": "DAUSA",
            "नागौर": "NAGAUR", "पाली": "PALI", "बाड़मेर": "BARMER", "जैसलमेर": "JAISALMER",
            "चित्तौड़गढ़": "CHITTORGARH", "बूंदी": "BUNDI", "बारां": "BARAN",
            "झालावाड़": "JHALAWAR", "राजसमंद": "RAJSAMAND", "भरतपुर": "BHARATPUR",
            "धौलपुर": "DHOLPUR", "करौली": "KARAULI", "सवाई माधोपुर": "SAWAI MADHOPUR",
            "डूंगरपुर": "DUNGARPUR", "बांसवाड़ा": "BANSWARA", "प्रतापगढ़": "PRATAPGARH",
            "सिरोही": "SIROHI", "जालोर": "JALOR", "नीम का थाना": "NEEM KA THANA",
            "चुरू": "CHURU", "हनुमानगढ़": "HANUMANGARH", "गंगानगर": "GANGANAGAR",
            "श्रीगंगानगर": "GANGANAGAR", "निम्बाहेड़ा": "NIMBAHERA", "सुजानगढ़": "SUJANGARH",
            "कोटपूतली": "KOTPUTLI", "भिवाड़ी": "BHIWADI", "रामगंज मंडी": "RAMGANJMANDI",
            "भरतपुर": "BHARATPUR", "बांसवाड़ा": "BANSWARA", "कोटपुतली": "KOTPUTLI",
        };
        for (const [deva, latin] of Object.entries(DEVA_CITIES)) {
            if (orig.includes(deva)) { extracted.city = latin; break; }
        }
        // Fallback: latin city names
        if (!extracted.city) {
            for (const c of SERVICE_CENTERS) {
                if (lower.includes(c.city_name.toLowerCase())) { extracted.city = c.city_name; break; }
            }
        }
    }

    // ── Machine status ────────────────────────────────────────────
    if (!currentData.machine_status) {
        // Devanagari + Latin patterns for breakdown
        const breakdownRx = /(band|khadi|stop|ruk|breakdown|बंद|खड़ी|रुक|नहीं चल|नही चल|चालू नहीं|स्टार्ट नहीं|chalu nahi|chalti nahi|chalti nhi|start nahi|start nhi|shuru nahi|nahi chal|nhi chal|ho nahi rahi|ho nhi rahi|chalu nhi|chal nahi|chal nhi)/;
        // Devanagari + Latin patterns for running with problem
        const runningRx = /(chal rahi|chal rha|chal rhi|running|chalu hai|dikkat|problem|thodi|चल रही|चालू है)/;
        if (breakdownRx.test(lower) || breakdownRx.test(orig)) extracted.machine_status = "Breakdown";
        else if (runningRx.test(lower) || runningRx.test(orig)) extracted.machine_status = "Running With Problem";
    }

    // ── Job location ──────────────────────────────────────────────
    if (!currentData.job_location) {
        if (/(workshop|garage|shed|yard|वर्कशॉप)/.test(lower) || /(वर्कशॉप|गैराज)/.test(orig))
            extracted.job_location = "Workshop";
        else if (/(site|field|bahar|khet|sadak|road|construction|project|onsite|kaam pe|बाहर|साइट|खेत|सड़क)/.test(lower))
            extracted.job_location = "Onsite";
    }

    // ── Complaint title — Latin + Devanagari patterns ─────────────
    if (!currentData.complaint_title) {
        // Engine Not Starting — require machine context word to avoid false positives
        // "कॉल नहीं हो रही है" should NOT match; "machine chalu nahi" SHOULD
        const machineCtx = /(machine|jcb|start|chalu|engine|मशीन|जेसीबी|इंजन)/.test(lower);
        const notStartStrong = /(start nahi|start nhi|shuru nahi|chalu nahi|chalu nhi|chalti nahi|chalti nhi|chal nahi rahi|nahi chal rahi|nhi chal|चालू नहीं|स्टार्ट नहीं|नहीं चल)/.test(lower);
        const notStartVague = /(ho nahi rahi|ho nhi rahi|nahi ho rahi|nhi ho raha|नहीं हो रही|नहीं हो रहा)/.test(lower) && machineCtx;
        if (notStartStrong || notStartVague)
            extracted.complaint_title = "Engine Not Starting";
        else if (/(dhuan|dhwa|dhua|smoke|dhumra|धुआं|धुआ)/.test(lower) || /धुआं/.test(orig))
            extracted.complaint_title = "Engine Smoke";
        else if (/(garam|dhak|overheat|temperature|गर्म|ढक|paani ubhal|ubhal raha|गरम)/.test(lower))
            extracted.complaint_title = "Engine Overheating";
        else if (/(tel nikal|oil leak|paani nikal|coolant|fluid nikal|leakage|rissa)/.test(lower) || /तेल निकल/.test(orig))
            extracted.complaint_title = "Oil Leakage";
        else if (/(jack|boom|hydraulic|hydro|cylinder|dabba|bucket|dabbe|हाइड्रोलिक|बूम|जैक)/.test(lower))
            extracted.complaint_title = "Hydraulic System Failure";
        else if (/(race nahi|race nhi|accelerator|throttle|rpm|रेस नहीं)/.test(lower))
            extracted.complaint_title = "Accelerator Problem";
        else if (/(ac nahi|ac nhi|hawa nahi|hawa nhi|air conditioning|thanda nahi|ac band|ठंडा नहीं|हवा नहीं)/.test(lower))
            extracted.complaint_title = "AC Not Working";
        else if (/(brake nahi|brake nhi|brakes|rokti nahi|nahi ruk|ब्रेक)/.test(lower))
            extracted.complaint_title = "Brake Failure";
        else if (/(headlight|bulb|electrical|bijli nahi|बिजली नहीं|लाइट नहीं)/.test(lower))
            extracted.complaint_title = "Electrical Problem";
        else if (/(tire|tyre|pankchar|puncture|टायर|पंक्चर)/.test(lower))
            extracted.complaint_title = "Tire Problem";
        else if (/(khatakhat|khat khat|awaaz|aawaz|vibration|hil rahi|आवाज|खटखट|आवाज़)/.test(lower))
            extracted.complaint_title = "Abnormal Noise";
        else if (/(steering|स्टीयरिंग)/.test(lower))
            extracted.complaint_title = "Steering Problem";
        else if (/(gear|transmission|गियर)/.test(lower))
            extracted.complaint_title = "Transmission Problem";
    }

    return extracted;
}



/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ VALIDATE DATA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function validateData(data) {
    // job_location defaults to "Onsite" if still missing at submit time
    // (most JCB machines are on-site; don't block submission for this)
    if (!data.job_location) data.job_location = "Onsite";

    const required = ["machine_no", "complaint_title", "machine_status", "job_location", "city", "customer_phone"];
    for (const f of required) {
        if (!data[f] || data[f] === "NA" || data[f] === "Unknown") {
            return { valid: false, reason: `Missing ${f}` };
        }
    }
    if (!/^[6-9]\d{9}$/.test(data.customer_phone))
        return { valid: false, reason: `Bad phone: ${data.customer_phone}` };
    if (!/^\d{4,8}$/.test(data.machine_no))
        return { valid: false, reason: `Bad machine: ${data.machine_no}` };
    return { valid: true };
}

/**
 * Called before building system prompt — clears any invalid values
 * that snuck in from earlier turns so the AI knows to re-ask.
 */
export function sanitizeExtractedData(data) {
    const clean = { ...data };
    // Wipe invalid phone so it shows ❌ in status and AI re-asks
    if (clean.customer_phone && !/^[6-9]\d{9}$/.test(clean.customer_phone)) {
        console.warn(`⚠️  Wiping invalid phone: ${clean.customer_phone}`);
        clean.customer_phone = null;
    }
    // Wipe invalid machine number
    if (clean.machine_no && !/^\d{4,8}$/.test(clean.machine_no)) {
        console.warn(`⚠️  Wiping invalid machine_no: ${clean.machine_no}`);
        clean.machine_no = null;
    }
    return clean;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗺️ MATCH SERVICE CENTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function matchServiceCenter(cityText) {
    if (!cityText || cityText.trim().length < 2) return null;
    const input = cityText.trim().toUpperCase();

    // Exact match (city or branch)
    const exact = SERVICE_CENTERS.find(c => c.city_name === input || c.branch_name === input);
    if (exact) return exact;

    // Rajasthani / common phonetic variants
    const phoneticMap = {
        "JAYPUR": "JAIPUR", "JYPUR": "JAIPUR", "JAIPURR": "JAIPUR",
        "JODHPURR": "JODHPUR",
        "BIKANER": "BIKANER", "BYKANIR": "BIKANER",
        "UDAI": "UDAIPUR", "ODAIPUR": "UDAIPUR",
        "VKI": "VKIA", "VKIA ROAD": "VKIA",
        "ABU": "ABU ROAD",
        "SWARUP": "SWARUPGANJ",
        "NEEM": "NEEM KA THANA",
        "SONG": "TONK", "SONGASH": "TONK",
        "MAVAL": "MAWAL",
        "JHUNJ": "JHUNJHUNU",
        "RAMGANJ": "RAMGANJMANDI",
        "SAWAI": "SAWAI MADHOPUR",
        "GANGANA": "GANGANAGAR",
        "HANUMAN": "HANUMANGARH",
        "CHITT": "CHITTORGARH",
        "PRATAP": "PRATAPGARH",
        "BANSWA": "BANSWARA",
        "RAJSAM": "RAJSAMAND",
        "NIMBA": "NIMBAHERA",
        "KEKRI": "KEKRI",
        "KARAUL": "KARAULI",
        "KOTPUT": "KOTPUTLI",
        "SUJAN": "SUJANGARH",
        "DHOLP": "DHOLPUR",
        "DUNGAR": "DUNGARPUR",
        "JHALA": "JHALAWAR",
        "BARME": "BARMER",
        "JAISAL": "JAISALMER",
    };

    for (const [wrong, correct] of Object.entries(phoneticMap)) {
        if (input.includes(wrong)) {
            return SERVICE_CENTERS.find(c => c.city_name === correct);
        }
    }

    // Prefix/fuzzy match (3 chars min)
    if (input.length >= 3) {
        const prefix3 = input.substring(0, 3);
        const found = SERVICE_CENTERS.find(c =>
            c.city_name.startsWith(prefix3) || prefix3.startsWith(c.city_name.substring(0, 3))
        );
        if (found) return found;
    }

    return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📊 LEGACY EXPORT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export function extractAllData(text, currentData = {}) {
    return extractWithRegex(text, currentData);
}

export default { getSmartAIResponse, extractAllData, matchServiceCenter, toSSML, toSSMLId };