import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
   🧠 SYSTEM PROMPT — Pure AI, no hardcoded Q&A, ultra-fast
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function buildSystemPrompt(callData) {
    const d = callData.extractedData;
    const customer = callData.customerData
        ? `Identified: ${callData.customerData.name}, Machine: ${callData.customerData.machineNo}, Phone: ${callData.customerData.phone}`
        : `Not identified yet`;

    const have = [];
    const need = [];
    const fields = {
        machine_no: d.machine_no,
        complaint_title: d.complaint_title,
        machine_status: d.machine_status,
        city: d.city,
        customer_phone: d.customer_phone && /^[6-9]\d{9}$/.test(d.customer_phone) ? d.customer_phone : null,
    };
    for (const [k, v] of Object.entries(fields)) {
        if (v) have.push(k); else need.push(k);
    }

    const cityList = SERVICE_CENTERS.map(c => c.city_name).join(", ");

    return `You are Priya — a warm, sweet, fast-speaking female service agent at Rajesh Motors JCB service center.

CUSTOMER: ${customer}
COLLECTED SO FAR: ${have.length ? have.map(k => `${k}=${fields[k]}`).join(" | ") : "nothing yet"}
STILL NEED: ${need.join(", ")}

YOUR JOB: Collect a JCB machine complaint or service booking.
Required fields: machine_no (4-7 digit chassis), complaint_title, machine_status (Breakdown/Running With Problem), city (from Rajasthan), customer_phone (10 digit Indian mobile).

LANGUAGE: Understand and reply in Hindi, English, Rajasthani, Marathi — mix naturally like a real human agent. Use "ji", "haan ji", "achha ji", "bilkul ji", "theek hai ji" naturally.

PERSONALITY:
- Sweet, warm, human — NOT robotic
- Very short replies — max 10 words per response
- Answer any side question briefly then IMMEDIATELY steer back to collecting data
- Never repeat a question already answered
- Extract data greedily from everything customer says
- Sound like a real person — natural flow, warm tone

SMART EXTRACTION RULES:
- "band hai / khadi hai / start nahi / chal nahi" → machine_status: Breakdown
- "chal rahi hai / dikkat aa rahi" → machine_status: Running With Problem  
- "filter / service / oil change / tel badalna" → complaint_title: Service/Filter Change, status: Running With Problem
- "dhuan / smoke" → complaint_title: Engine Smoke
- "garam / overheat / dhak gayi" → complaint_title: Engine Overheating
- "tel nikal raha / rissa / oil leak" → complaint_title: Oil Leakage
- "hydraulic / cylinder / bucket" → complaint_title: Hydraulic System Failure
- "race nahi / ras nahi / accelerator" → complaint_title: Accelerator Problem
- "ac nahi / thanda nahi" → complaint_title: AC Not Working
- "brake nahi" → complaint_title: Brake Failure
- "awaaz / khatak / vibration" → complaint_title: Abnormal Noise
- MULTIPLE PROBLEMS (critical): Customer may mention 2, 5, even 10 issues in one breath
  → complaint_title = FIRST/PRIMARY issue
  → complaint_details = ALL issues listed, semicolon-separated (including the first)
  → Example: 'engine start nahi, tel nikal raha, ac nahi, khatak aa rahi, brake weak hai'
    → complaint_title: 'Engine Not Starting'
    → complaint_details: 'Engine Not Starting; Oil Leakage; AC Not Working; Abnormal Noise; Brake Failure'
  → ALWAYS accumulate — never discard any complaint the customer mentions
  → If customer adds more problems later, APPEND to complaint_details, do NOT replace
- Rajasthani: "tel nikal ryo"=Oil Leakage, "dhak gyi"=Overheating, "band padi"=Breakdown, "rissa"=leak, "filttar"=filter, "race/ras nahi"=Accelerator, "khatak"=Noise

VALID CITIES: ${cityList}

SCENARIOS:
- Customer says "ek minute / ruko / dhundh raha hun" → reply "Ji zarur." and wait
- Customer says chassis not known → try to help ("machine ke dashboard pe plate pe number hota hai ji")
- Customer mentions old complaint / engineer not coming → acknowledge warmly, ask if they want new complaint or escalation, handle it
- Already have all data AND machine_no is confirmed valid → say "Complaint register kar raha hun ji" and set ready_to_submit:true
- NEVER set ready_to_submit:true if machine_no field is empty or unverified — always require it
- If customer gives phone but no valid machine yet → keep asking for chassis number

OUTPUT FORMAT (always end with this JSON after ###):
[your short warm reply] ### {"extracted":{"machine_no":"","complaint_title":"","machine_status":"","city":"","customer_phone":"","complaint_details":"","job_location":"","machine_location_address":""},"ready_to_submit":false}

CRITICAL: Reply text must be max 10 words. Warm. Human. Fast. Never robotic.`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🤖 MAIN AI CALL — single Groq call, fast
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function getSmartAIResponse(callData) {
    try {
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // Fast regex pass first — greedily extract before Groq
        const lastUserMsg = callData.messages.filter(m => m.role === "user").pop()?.text || "";
        if (lastUserMsg) {
            const rxData = extractAllData(lastUserMsg, callData.extractedData);
            for (const [k, v] of Object.entries(rxData)) {
                if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
            }
        }

        // City match
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

        // Auto machine_status
        if (callData.extractedData.complaint_title && !callData.extractedData.machine_status) {
            const t = callData.extractedData.complaint_title.toLowerCase();
            callData.extractedData.machine_status = /not starting|engine not starting/.test(t) ? "Breakdown" : "Running With Problem";
        }

        const messages = [
            { role: "system", content: buildSystemPrompt(callData) },
            ...callData.messages.slice(-6).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.text,
            })),
        ];
        if (!messages.find(m => m.role === "user")) {
            messages.push({ role: "user", content: "[call connected]" });
        }

        const resp = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.15,
            max_tokens: 120,
            top_p: 0.9,
        });

        const raw = resp.choices?.[0]?.message?.content?.trim();
        if (!raw) throw new Error("Empty Groq response");

        // Parse
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
            } catch { /* ignore parse errors */ }
        }

        // Merge extracted data from Groq
        const merged = { ...callData.extractedData };
        for (const [k, v] of Object.entries(extractedJSON)) {
            if (!v || v === "NA" || v === "") continue;
            if (k === "customer_phone") {
                const ph = String(v).replace(/[\s\-]/g, "");
                if (/^[6-9]\d{9}$/.test(ph)) merged.customer_phone = ph;
            } else if (k === "complaint_details") {
                // Always accumulate — split into parts, dedup, rejoin
                const existing = (merged.complaint_details || '').split('; ').map(s => s.trim()).filter(Boolean);
                const incoming = String(v).split('; ').map(s => s.trim()).filter(Boolean);
                const combined = [...existing];
                for (const item of incoming) {
                    if (!combined.includes(item)) combined.push(item);
                }
                merged.complaint_details = combined.join('; ');
            } else {
                merged[k] = v;
            }
        }

        // City match again after Groq extraction
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

        // Auto status after merge
        if (merged.complaint_title && !merged.machine_status) {
            const t = merged.complaint_title.toLowerCase();
            merged.machine_status = /not starting|engine not starting/.test(t) ? "Breakdown" : "Running With Problem";
        }

        // Clean reply — remove any leaked JSON
        replyText = replyText.replace(/```[\s\S]*?```/g, "").replace(/###[\s\S]*/g, "").trim();

        // Validate before marking ready
        if (readyToSubmit) {
            const v = validateExtracted(merged);
            if (!v.valid) { readyToSubmit = false; console.warn(`⚠️ Not ready: ${v.reason}`); }
        }

        console.log(`   🤖 AI: "${replyText}" | ready:${readyToSubmit}`);
        return { text: replyText, extractedData: merged, readyToSubmit };

    } catch (err) {
        console.error("❌ [Groq]", err.message);
        return {
            text: "Ji, bataiye.",
            extractedData: callData.extractedData || {},
            readyToSubmit: false,
        };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚡ REGEX EXTRACTION — fast pre-processing before Groq
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function extractAllData(text, cur = {}) {
    const ex = {};
    const lo = text.toLowerCase().replace(/[।\.\!\?]/g, " ").replace(/\s+/g, " ").trim();

    // Skip hold phrases
    if (/^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|leke aata|bas|ok|haan|ha)\s*$/i.test(lo)) return {};

    // ── Machine number (4-7 digits, not a phone, handles split speech like "3305 447") ─────
    if (!cur.machine_no) {
        // Remove valid phone numbers first to avoid confusion
        let noPhone = text.replace(/[6-9]d{9}/g, '');
        // Collapse all digits (handles speech split like "3305 447" → "3305447")
        const digitsOnly = noPhone.replace(/[^0-9]/g, '');
        // Try lengths 7 down to 4, skip if looks like phone start
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

    // ── Phone (10 digit Indian) ───────────────────────────────────
    if (!cur.customer_phone || !/^[6-9]\d{9}$/.test(cur.customer_phone)) {
        const compact = text.replace(/[\s\-,।\.]/g, "");
        const nums = compact.match(/\d+/g) || [];
        for (const seq of nums) {
            if (/^[6-9]\d{9}$/.test(seq)) { ex.customer_phone = seq; break; }
            for (let i = 0; i <= seq.length - 10; i++) {
                const ch = seq.slice(i, i + 10);
                if (/^[6-9]\d{9}$/.test(ch)) { ex.customer_phone = ch; break; }
            }
            if (ex.customer_phone) break;
        }
    }

    // ── City (Devanagari + English) ───────────────────────────────
    if (!cur.city) {
        const DEVA_MAP = {
            "भीलवाड़ा": "BHILWARA", "जयपुर": "JAIPUR", "अजमेर": "AJMER",
            "अलवर": "ALWAR", "जोधपुर": "JODHPUR", "उदयपुर": "UDAIPUR",
            "कोटा": "KOTA", "सीकर": "SIKAR", "बीकानेर": "BIKANER",
            "टोंक": "TONK", "झुंझुनू": "JHUNJHUNU", "दौसा": "DAUSA",
            "नागौर": "NAGAUR", "पाली": "PALI", "बाड़मेर": "BARMER",
            "जैसलमेर": "JAISALMER", "चित्तौड़गढ़": "CHITTORGARH", "बूंदी": "BUNDI",
            "बारां": "BARAN", "झालावाड़": "JHALAWAR", "राजसमंद": "RAJSAMAND",
            "भरतपुर": "BHARATPUR", "धौलपुर": "DHOLPUR", "करौली": "KARAULI",
            "सवाई माधोपुर": "SAWAI MADHOPUR", "डूंगरपुर": "DUNGARPUR",
            "बांसवाड़ा": "BANSWARA", "प्रतापगढ़": "PRATAPGARH", "सिरोही": "SIROHI",
            "जालोर": "JALOR", "नीम का थाना": "NEEM KA THANA", "चुरू": "CHURU",
            "हनुमानगढ़": "HANUMANGARH", "गंगानगर": "GANGANAGAR",
            "श्रीगंगानगर": "GANGANAGAR", "निम्बाहेड़ा": "NIMBAHERA",
            "सुजानगढ़": "SUJANGARH", "कोटपूतली": "KOTPUTLI", "भिवाड़ी": "BHIWADI",
            "रामगंज मंडी": "RAMGANJMANDI", "रामगंज": "RAMGANJMANDI",
        };
        for (const [d, l] of Object.entries(DEVA_MAP)) {
            if (text.includes(d)) { ex.city = l; break; }
        }
        if (!ex.city) {
            const sorted = [...SERVICE_CENTERS].sort((a, b) => b.city_name.length - a.city_name.length);
            for (const c of sorted) {
                if (lo.includes(c.city_name.toLowerCase())) { ex.city = c.city_name; break; }
            }
        }
    }

    // ── Machine status ────────────────────────────────────────────
    if (!cur.machine_status) {
        const bkRx = /(band|khadi|khari|stop|ruk gayi|breakdown|बंद|खड़ी|chalu nahi|chalti nahi|start nahi|start nhi|nahi chal|padi hai|band padi|chal nhi rahi|chal nhi|nhi chal|nahi chalti)/;
        const rwRx = /(chal rahi|chal rhi|running|chalu hai|dikkat|problem|चल रही|चालू है)/;
        const svRx = /(filter|filttar|service|oil change|tel badlo|सर्विस|फिल्टर)/;
        if (bkRx.test(lo) || bkRx.test(text)) ex.machine_status = "Breakdown";
        else if (svRx.test(lo)) ex.machine_status = "Running With Problem";
        else if (rwRx.test(lo) || rwRx.test(text)) ex.machine_status = "Running With Problem";
    }

    // ── Job location ──────────────────────────────────────────────
    if (!cur.job_location) {
        if (/(workshop|garage|वर्कशॉप|गैराज)/.test(lo)) ex.job_location = "Workshop";
        else if (/(site|field|bahar|khet|sadak|onsite|साइट|खेत)/.test(lo)) ex.job_location = "Onsite";
    }

    // ── Complaint title ───────────────────────────────────────────
    if (!cur.complaint_title) {
        const mCtx = /(machine|jcb|start|chalu|engine|मशीन|इंजन)/.test(lo);
        const ns = /(start nahi|start nhi|chalu nahi|chalu nhi|chalti nahi|chal nahi rahi|nahi chal rahi|चालू नहीं|स्टार्ट नहीं|नहीं चल)/.test(lo);
        const bnd = /(band hai|band ho gayi|band pad|khari hai|बंद है|बंद हो)/.test(lo) && mCtx;

        if (ns || bnd) ex.complaint_title = "Engine Not Starting";
        else if (/(filter|filttar|service|oil change)/.test(lo)) ex.complaint_title = "Service/Filter Change";
        else if (/(dhuan|dhua|smoke|धुआं)/.test(lo)) ex.complaint_title = "Engine Smoke";
        else if (/(garam|dhak|overheat|ubhal|tapta)/.test(lo)) ex.complaint_title = "Engine Overheating";
        else if (/(tel nikal|oil leak|rissa|tel nikal ryo)/.test(lo)) ex.complaint_title = "Oil Leakage";
        else if (/(hydraulic|hydro|cylinder|bucket|boom|jack)/.test(lo)) ex.complaint_title = "Hydraulic System Failure";
        else if (/(race nahi|ras nahi|accelerator|gas nahi)/.test(lo)) ex.complaint_title = "Accelerator Problem";
        else if (/(ac nahi|hawa nahi|thanda nahi|ac band)/.test(lo)) ex.complaint_title = "AC Not Working";
        else if (/(brake nahi|brake nhi|rokti nahi)/.test(lo)) ex.complaint_title = "Brake Failure";
        else if (/(bijli nahi|headlight|bulb|electrical)/.test(lo)) ex.complaint_title = "Electrical Problem";
        else if (/(tire|tyre|pankchar|puncture|टायर)/.test(lo)) ex.complaint_title = "Tire Problem";
        else if (/(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration)/.test(lo)) ex.complaint_title = "Abnormal Noise";
        else if (/(steering|स्टीयरिंग)/.test(lo)) ex.complaint_title = "Steering Problem";
        else if (/(gear|transmission|गियर)/.test(lo)) ex.complaint_title = "Transmission Problem";
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
        "JHUNJ": "JHUNJHUNU", "RAMGANJ": "RAMGANJMANDI", "SAWAI": "SAWAI MADHOPUR",
        "GANGANA": "GANGANAGAR", "HANUMAN": "HANUMANGARH", "CHITT": "CHITTORGARH",
        "PRATAP": "PRATAPGARH", "BANSWA": "BANSWARA", "RAJSAM": "RAJSAMAND",
        "NIMBA": "NIMBAHERA", "KARAUL": "KARAULI", "KOTPUT": "KOTPUTLI",
        "SUJAN": "SUJANGARH", "DHOLP": "DHOLPUR", "DUNGAR": "DUNGARPUR",
        "JHALA": "JHALAWAR", "BARME": "BARMER", "JAISAL": "JAISALMER",
        "UDAI": "UDAIPUR", "ODAI": "UDAIPUR", "BYKAN": "BIKANER",
        "SONG": "TONK", "MAVAL": "MAWAL",
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
    const required = ["machine_no", "complaint_title", "machine_status", "city", "customer_phone"];
    for (const f of required) {
        if (!data[f] || data[f] === "NA" || data[f] === "Unknown")
            return { valid: false, reason: `Missing ${f}` };
    }
    if (!/^[6-9]\d{9}$/.test(data.customer_phone)) return { valid: false, reason: "Bad phone" };
    if (!/^\d{4,7}$/.test(data.machine_no)) return { valid: false, reason: "Bad machine_no" };
    return { valid: true };
}

export function sanitizeExtractedData(data) {
    const c = { ...data };
    if (c.customer_phone && !/^[6-9]\d{9}$/.test(c.customer_phone)) c.customer_phone = null;
    if (c.machine_no && !/^\d{4,7}$/.test(c.machine_no)) c.machine_no = null;
    return c;
}

export default { getSmartAIResponse, extractAllData, matchServiceCenter, sanitizeExtractedData };