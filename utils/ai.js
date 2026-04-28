import { AzureOpenAI } from "openai";
import serviceLogger from "./service_logger.js";

const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SERVICE CENTERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
];

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   COST HELPER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function calculateCost(tokens, service = 'azure-openai') {
    const pricing = { 'azure-openai': 0.0001, 'groq': 0.00005, 'ollama': 0, 'openai': 0.0001 };
    return ((tokens / 1000) * (pricing[service] || 0)) * 83;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   NORMALIZE VALUE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function normalizeValue(v) {
    if (!v) return null;
    let s = String(v).trim();
    if (!s || /^(null|undefined|na|n\/a|unknown|none|empty|not collected)$/i.test(s)) return null;
    if (/^([A-Za-z]\s+){2,}[A-Za-z]$/.test(s)) s = s.replace(/\s+/g, "");
    return s;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MATCH SERVICE CENTER
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
   SANITIZE EXTRACTED DATA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function sanitizeExtractedData(data) {
    const c = { ...data };
    if (c.customer_name)   c.customer_name   = normalizeValue(c.customer_name);
    if (c.customer_phone)  c.customer_phone  = normalizeValue(c.customer_phone);
    if (c.machine_no)      c.machine_no      = normalizeValue(c.machine_no);
    if (c.complaint_title) c.complaint_title = normalizeValue(c.complaint_title);
    if (!c.complaint_title && c.complaint_details) c.complaint_title = normalizeValue(c.complaint_details);
    if (c.customer_phone && !/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(c.customer_phone))) c.customer_phone = null;
    if (c.machine_no && !/^\d{4,7}$/.test(c.machine_no)) c.machine_no = null;
    if (c.complaint_title && /^(not collected|unknown|na|n\/a|none|empty)$/i.test(String(c.complaint_title).trim())) c.complaint_title = null;
    return c;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   REGEX EXTRACTION (fast pre-pass, no responses)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function extractAllData(text, cur = {}) {
    const ex = {};
    const numberMap = {
        "एक":"1","दो":"2","तीन":"3","चार":"4","पांच":"5","पाँच":"5","छह":"6","सात":"7","आठ":"8","नौ":"9","शून्य":"0",
        "zero":"0","one":"1","two":"2","three":"3","four":"4","five":"5","six":"6","seven":"7","eight":"8","nine":"9",
        "ek":"1","do":"2","teen":"3","char":"4","chaar":"4","paanch":"5","chhe":"6","saat":"7","aath":"8","nau":"9",
    };
    let normalizedText = text;
    for (const [word, digit] of Object.entries(numberMap)) {
        normalizedText = normalizedText.replace(new RegExp(`\\b${word}\\b`, "gi"), digit);
    }
    const lo = normalizedText.toLowerCase().replace(/[।.!?]/g, " ").replace(/\s+/g, " ").trim();

    // Skip filler words
    if (/^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|leke aata|bas|ok|haan|ha|acha|achha)\s*$/i.test(lo)) return {};

    // Machine number (4-7 digits, not phone)
    if (!cur.machine_no) {
        const noPhone = text.replace(/[6-9]\d{9}/g, '');
        const labelRx = /(chassis|machine|serial|s\.no|machine no|chassis no)\s*(?:number|no|n\.?)?\s*[\s:\-]*([0-9][0-9\-\s]{3,20})/i;
        const explicitMatch = text.match(labelRx);
        if (explicitMatch) {
            const digits = explicitMatch[2].replace(/[^0-9]/g, '');
            if (/^\d{4,7}$/.test(digits)) ex.machine_no = digits;
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

    // Phone
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
    }

    // City
    if (!cur.city) {
        const DEVA_MAP = {
            "भीलवाड़ा":"BHILWARA","जयपुर":"JAIPUR","अजमेर":"AJMER","अलवर":"ALWAR",
            "जोधपुर":"JODHPUR","उदयपुर":"UDAIPUR","कोटा":"KOTA","सीकर":"SIKAR",
            "बीकानेर":"BIKANER","टोंक":"TONK","दौसा":"DAUSA","नागौर":"NAGAUR",
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

    // Machine status
    if (!cur.machine_status) {
        if (/(band|khadi|khari|stop|ruk gayi|breakdown|बंद|chalu nahi|start nahi|nahi chal|band padi|chal nhi rahi)/i.test(lo)) ex.machine_status = "Breakdown";
        else if (/(service|filter|oil change|seva)/i.test(lo)) ex.machine_status = "Running With Problem";
        else if (/(chal rahi|running|chalu hai|dikkat ke saath)/i.test(lo)) ex.machine_status = "Running With Problem";
    }

    // Complaint title
    if (!cur.complaint_title) {
        const mCtx = /(machine|jcb|start|chalu|engine|मशीन)/i.test(lo);
        if ((/(start nahi|chalu nahi|chal nahi rahi|nahi chal|start nhi)/i.test(lo)) || (/(band hai|band ho gayi|khari hai|band padi)/i.test(lo) && mCtx)) ex.complaint_title = "Engine Not Starting";
        else if (/(filter|service|oil change|seva)/i.test(lo)) ex.complaint_title = "Service/Filter Change";
        else if (/(dhuan|smoke|dhuen)/i.test(lo)) ex.complaint_title = "Engine Smoke";
        else if (/(garam|dhak|overheat|tapta)/i.test(lo)) ex.complaint_title = "Engine Overheating";
        else if (/(tel nikal|oil leak|rissa|risso)/i.test(lo)) ex.complaint_title = "Oil Leakage";
        else if (/(hydraulic|hydraulik|cylinder|bucket|boom|dipper)/i.test(lo)) ex.complaint_title = "Hydraulic System Failure";
        else if (/(race nahi|accelerator|gas nahi|pickup nahi)/i.test(lo)) ex.complaint_title = "Accelerator Problem";
        else if (/(ac nahi|hawa nahi|thanda nahi|ac kharab)/i.test(lo)) ex.complaint_title = "AC Not Working";
        else if (/(brake nahi|brake fail|rokti nahi)/i.test(lo)) ex.complaint_title = "Brake Failure";
        else if (/(bijli nahi|headlight|electrical|battery)/i.test(lo)) ex.complaint_title = "Electrical Problem";
        else if (/(tire|pankchar|puncture)/i.test(lo)) ex.complaint_title = "Tire Problem";
        else if (/(khatakhat|awaaz aa rhi|vibration|noise|khatak)/i.test(lo)) ex.complaint_title = "Abnormal Noise";
        else if (/(steering|स्टीयरिंग)/i.test(lo)) ex.complaint_title = "Steering Problem";
        else if (/(gear|transmission|gear slip)/i.test(lo)) ex.complaint_title = "Transmission Problem";
        else if (/(coolant|paani nikal|water leak|radiator)/i.test(lo)) ex.complaint_title = "Coolant Leakage";
        else if (/(turbo|turbocharger)/i.test(lo)) ex.complaint_title = "Turbocharger Issue";
    }

    return ex;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MULTI-COMPLAINT EXTRACTION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function extractAllComplaintTitles(text) {
    const lo = text.toLowerCase().replace(/[।.!?]/g, ' ');
    const found = [];
    const checks = [
        [/(start nahi|start nhi|chalu nahi|chalti nahi|chal nahi rahi|band hai|band ho gayi|khari hai|chal nhi rahi|start nai)/, 'Engine Not Starting'],
        [/(filter|filttar|service|servicing|oil change|tel badlo)/, 'Service/Filter Change'],
        [/(dhuan|dhua|smoke|dhuen)/, 'Engine Smoke'],
        [/(garam|dhak|overheat|ubhal|tapta|bahut garam)/, 'Engine Overheating'],
        [/(tel nikal|oil leak|rissa|risso|tel aa raha|riss ryo)/, 'Oil Leakage'],
        [/(hydraulic|hydraulik|cylinder|bucket|boom|dipper)/, 'Hydraulic System Failure'],
        [/(race nahi|race nai|accelerator|throttle|gas nahi|pickup nahi)/, 'Accelerator Problem'],
        [/(ac nahi|hawa nahi|thanda nahi|ac band|ac kharab)/, 'AC Not Working'],
        [/(brake nahi|brake nhi|rokti nahi|brake fail|brake kharab)/, 'Brake Failure'],
        [/(bijli nahi|headlight|bulb|electrical|light nahi|battery)/, 'Electrical Problem'],
        [/(tire|tyre|pankchar|puncture|flat tyre)/, 'Tire Problem'],
        [/(khatakhat|khatak|awaaz aa rhi|vibration|noise|khad khad)/, 'Abnormal Noise'],
        [/(steering|steering kharab)/, 'Steering Problem'],
        [/(gear|transmission|gear slip)/, 'Transmission Problem'],
        [/(coolant|paani nikal|water leak|radiator)/, 'Coolant Leakage'],
        [/(boom|arm nahi|dipper nahi|arm nai uthta)/, 'Boom/Arm Failure'],
        [/(turbo|turbocharger|black smoke)/, 'Turbocharger Issue'],
    ];
    for (const [rx, title] of checks) {
        if (rx.test(lo) || rx.test(text)) {
            if (!found.includes(title)) found.push(title);
        }
    }
    return found;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   VALIDATE EXTRACTED
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function validateExtracted(data) {
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SIMPLE AI RESPONSE (for side questions, one-shot answers)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function getAIResponse(promptText) {
    try {
        const model = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
        const resp = await client.chat.completions.create({
            model,
            messages: [
                { role: "system", content: "You are Priya, a helpful JCB service agent for Rajesh Motors. Answer clearly in Hinglish. Keep it short (1-2 lines)." },
                { role: "user", content: promptText }
            ],
            temperature: 0.2,
            max_tokens: 100,
        });
        return resp.choices?.[0]?.message?.content?.trim() || null;
    } catch (err) {
        console.error("❌ [getAIResponse]", err.message);
        return null;
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CORE: FULL LLM-FIRST SMART RESPONSE
   
   This is the MAIN brain. It:
   1. Understands everything the user said (side question, data, frustration, wait)
   2. Generates a natural Hinglish reply that addresses what they said
   3. Extracts any data from what they said
   4. Gets back on track by asking only the next missing field
   5. Returns ready_to_submit when all data is complete and user confirms
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function getSmartAIResponse(callData) {
    const startTime = Date.now();
    const service = 'Azure OpenAI';
    const model = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
    let prompt = '';
    let response = '';

    try {
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // Run regex pre-pass on last user message
        const lastUserMsg = callData.messages.filter(m => m.role === "user").pop()?.text || "";
        if (lastUserMsg) {
            const rxData = extractAllData(lastUserMsg, callData.extractedData);
            for (const [k, v] of Object.entries(rxData)) {
                if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
            }
        }

        // Resolve city to branch
        if (callData.extractedData.city && !callData.extractedData.city_id) {
            const mc = matchServiceCenter(callData.extractedData.city);
            if (mc) {
                callData.extractedData.city     = mc.city_name;
                callData.extractedData.city_id  = mc.branch_code;
                callData.extractedData.branch   = mc.branch_name;
                callData.extractedData.outlet   = mc.city_name;
                callData.extractedData.lat      = mc.lat;
                callData.extractedData.lng      = mc.lng;
            }
        }

        const d = callData.extractedData;
        const cityList = SERVICE_CENTERS.map(c => c.city_name).join(', ');

        // What is already known
        const knownParts = [];
        if (d.machine_no)      knownParts.push(`machine_no=${d.machine_no}`);
        if (d.customer_name)   knownParts.push(`customer_name=${d.customer_name}`);
        if (d.complaint_title) knownParts.push(`complaint_title=${d.complaint_title}`);
        if (d.complaint_details) knownParts.push(`complaint_details=${d.complaint_details}`);
        if (d.machine_status)  knownParts.push(`machine_status=${d.machine_status}`);
        if (d.city)            knownParts.push(`city=${d.city}`);
        if (d.customer_phone)  knownParts.push(`customer_phone=${d.customer_phone}`);
        const knownData = knownParts.join(' | ') || 'nothing yet';

        // What is still missing
        const missing = [];
        if (!d.machine_no)                         missing.push('machine_no (4-7 digit chassis number)');
        if (!d.complaint_title)                    missing.push('complaint_title (what problem with machine)');
        if (!d.machine_status)                     missing.push('machine_status (Breakdown = fully stopped, Running With Problem = still working but has issue)');
        if (!d.city || !d.city_id)                 missing.push('city (which city from the service center list)');
        if (!d.customer_phone)                     missing.push('customer_phone (10-digit Indian mobile)');
        const missingData = missing.join(', ') || 'NONE - all collected';

        // Machine validation status
        const machineValidated = !!callData.customerData;
        const customerName = callData.customerData?.name || d.customer_name || null;
        const registeredPhone = callData.customerData?.phone || null;
        const machineCity = callData.customerData?.city || null;

        // Conversation history (last 10 turns)
        const history = callData.messages.slice(-10).map(m =>
            `${m.role === "user" ? "Customer" : "Agent"}: ${m.text}`
        ).join('\n');

        // Pending state hints for LLM context
        const pendingHints = [];
        if (callData.pendingPhoneConfirm || callData.awaitingPhoneConfirm) {
            pendingHints.push(`PENDING: Ask customer if they want to keep registered phone (${registeredPhone}) ending in ${String(registeredPhone || '').slice(-2)} or change it`);
        }
        if (callData.pendingCityConfirm || callData.awaitingCityConfirm) {
            pendingHints.push(`PENDING: Confirm city ${d.city} mapped to branch ${d.branch}`);
        }
        if (callData.awaitingFinalConfirm) {
            pendingHints.push(`PENDING: All data collected. Ask for final confirmation to submit`);
        }
        if (callData.awaitingComplaintAction) {
            pendingHints.push(`PENDING: Existing complaint found (${callData.existingComplaintId}). Ask: new complaint or urgent escalation?`);
        }
        const hints = pendingHints.length > 0 ? pendingHints.join('\n') : 'None';

        /* ── SYSTEM PROMPT ── */
        const systemPrompt = `You are Priya, a voice agent for Rajesh Motors JCB service center.
You speak natural, conversational Hinglish (Hindi + English mix).
You are on a phone call. Keep replies SHORT (1-3 sentences max).

YOUR ONLY JOB: Collect a JCB service complaint by gathering these fields:
1. machine_no - chassis number (4-7 digits)
2. complaint_title - main problem description  
3. machine_status - "Breakdown" (fully stopped) or "Running With Problem" (still running)
4. city - which service center city
5. customer_phone - 10-digit mobile number

CURRENT STATE:
- Already collected: ${knownData}
- Still missing: ${missingData}
- Machine validated in DB: ${machineValidated ? `YES (Customer: ${customerName}, City: ${machineCity})` : 'NO'}
- Registered phone: ${registeredPhone || 'none'}
- Pending actions: ${hints}

BEHAVIOR RULES:
1. ALWAYS listen to what the customer said first - understand it completely
2. If they asked a question → answer it briefly, then get back on track
3. If they gave data → acknowledge it, extract it, then ask next missing field
4. If they expressed frustration → empathize, assure action, continue
5. If they said "ek minute" or "wait" → say "Ji zarur" and wait
6. If they gave multiple complaints → note all, continue collecting other missing fields
7. NEVER ask for something already collected
8. NEVER repeat yourself unnecessarily
9. After machine is validated, ask for phone confirmation naturally
10. When ALL fields collected → ask for final confirmation naturally

VALID CITIES: ${cityList}

OUTPUT FORMAT - Return ONLY this JSON (no other text):
{
  "reply": "Your natural Hinglish response here",
  "extracted": {
    "machine_no": "digits or null",
    "complaint_title": "English problem name or null",
    "complaint_details": "all problems semicolon separated or null",
    "machine_status": "Breakdown or Running With Problem or null",
    "city": "EXACT city name from valid list or null",
    "customer_phone": "10 digits or null",
    "customer_name": "name or null"
  },
  "ready_to_submit": false,
  "action": "none or escalate_existing or wait"
}`;

        /* ── USER PROMPT ── */
        const userPrompt = `CONVERSATION HISTORY:
${history || '(call just started)'}

CUSTOMER JUST SAID: "${lastUserMsg}"

Based on the conversation and what the customer said:
1. Understand their message (question, data, frustration, wait, complaint info)  
2. Respond naturally in Hinglish (address what they said)
3. Extract any data they provided
4. Guide them toward the next missing field
5. If all data collected and they confirmed → set ready_to_submit: true

Generate your JSON response now:`;

        prompt = systemPrompt + '\n\n' + userPrompt;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ];

        const resp = await client.chat.completions.create({
            model,
            messages,
            temperature: 0.2,
            max_tokens: 250,
            response_format: { type: "json_object" },
        });

        const raw = resp.choices?.[0]?.message?.content?.trim();
        response = raw;

        if (!raw) throw new Error("Empty LLM response");

        // Parse JSON response
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            // Try to extract JSON from text
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) parsed = JSON.parse(match[0]);
            else throw new Error("Cannot parse LLM JSON");
        }

        const replyText = parsed.reply || "Ji, bataiye.";
        let readyToSubmit = !!parsed.ready_to_submit;
        const action = parsed.action || "none";
        const extractedJSON = parsed.extracted || {};

        // Merge extracted data
        const merged = { ...callData.extractedData };
        for (const [k, v] of Object.entries(extractedJSON)) {
            const cleanValue = normalizeValue(v);
            if (!cleanValue) continue;

            if (k === "customer_phone") {
                const ph = String(cleanValue).replace(/[\s\-]/g, "");
                if (/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(ph)) merged.customer_phone = ph;
            } else if (k === "complaint_details") {
                const existing = (merged.complaint_details || '').split('; ').map(s => s.trim()).filter(Boolean);
                const incoming = String(cleanValue).split('; ').map(s => s.trim()).filter(Boolean);
                const combined = [...existing];
                for (const item of incoming) { if (!combined.includes(item)) combined.push(item); }
                merged.complaint_details = combined.join('; ');
            } else if (!merged[k]) {
                merged[k] = cleanValue;
            }
        }

        // Also run multi-complaint extraction
        const allComplaints = extractAllComplaintTitles(lastUserMsg);
        if (allComplaints.length > 0) {
            if (!merged.complaint_title) merged.complaint_title = allComplaints[0];
            const existing = (merged.complaint_details || '').split('; ').map(s => s.trim()).filter(Boolean);
            const haveSet = new Set([merged.complaint_title, ...existing]);
            const newOnes = allComplaints.filter(c => !haveSet.has(c));
            if (newOnes.length > 0) {
                merged.complaint_details = [...existing, ...newOnes].join('; ');
            }
        }

        // Resolve city if just extracted
        if (merged.city && !merged.city_id) {
            const mc = matchServiceCenter(merged.city);
            if (mc) {
                merged.city    = mc.city_name;
                merged.city_id = mc.branch_code;
                merged.branch  = mc.branch_name;
                merged.outlet  = mc.city_name;
                merged.lat     = mc.lat;
                merged.lng     = mc.lng;
            }
        }

        // Validate before allowing submit
        if (readyToSubmit) {
            const v = validateExtracted(merged);
            if (!v.valid) {
                readyToSubmit = false;
                console.warn(`⚠️ LLM said ready_to_submit but validation failed: ${v.reason}`);
            }
        }

        const latency = Date.now() - startTime;
        const tokens = resp.usage?.total_tokens || 0;
        const cost = calculateCost(tokens, 'azure-openai');

        // Log
        serviceLogger.logLLM(
            callData.callSid || callData.CallSid,
            service, model, prompt, response,
            { latency, tokens, cost, success: true }
        );

        console.log(`   🤖 AI: "${replyText}" | ready:${readyToSubmit} | action:${action} | latency:${latency}ms`);

        return {
            text: replyText,
            extractedData: merged,
            readyToSubmit,
            action,
        };

    } catch (err) {
        const latency = Date.now() - startTime;
        serviceLogger.logLLM(
            callData.callSid || callData.CallSid,
            service, model, prompt, null,
            { latency, tokens: 0, cost: 0, success: false, error: err.message }
        );
        console.error("❌ [getSmartAIResponse]", err.message);
        return {
            text: "Ji, bataiye.",
            extractedData: callData.extractedData || {},
            readyToSubmit: false,
            action: "none",
        };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ENTITY EXTRACTION (lightweight, for intent only)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function extractEntities(userInput, callData) {
    try {
        const cityList = SERVICE_CENTERS.map(c => c.city_name).join(', ');

        const resp = await client.chat.completions.create({
            model: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an entity extraction AI for a JCB complaint system. Return ONLY valid JSON. No explanations."
                },
                {
                    role: "user",
                    content: `Extract from this user input: "${userInput}"

Current context:
- Machine: ${callData.extractedData.machine_no || 'not collected'}
- Complaint: ${callData.extractedData.complaint_title || 'not collected'}
- City: ${callData.extractedData.city || 'not collected'}
- Phone: ${callData.extractedData.customer_phone || 'not collected'}

Return JSON:
{
  "intent": "provide_info|side_question|confirm|deny|wait|frustration|old_complaint",
  "confirm_type": "yes|no|null",
  "entities": {
    "machine_no": "4-7 digits or null",
    "customer_name": "name or null",
    "complaint_title": "English problem or null",
    "machine_status": "Breakdown|Running With Problem|null",
    "city": "exact name from [${cityList.slice(0,200)}...] or null",
    "customer_phone": "10 digits or null",
    "complaint_details": "semicolon separated or null"
  }
}`
                }
            ],
            temperature: 0.1,
            max_tokens: 200,
            response_format: { type: "json_object" },
        });

        const raw = resp.choices?.[0]?.message?.content?.trim();
        if (!raw) return { intent: 'provide_info', entities: {} };

        const parsed = JSON.parse(raw);
        const cleanedEntities = {};
        for (const [k, v] of Object.entries(parsed.entities || {})) {
            cleanedEntities[k] = normalizeValue(v);
        }

        return {
            intent: normalizeValue(parsed.intent) || 'provide_info',
            confirm_type: normalizeValue(parsed.confirm_type) || null,
            entities: cleanedEntities,
            ...cleanedEntities,
            tokens: resp.usage?.total_tokens || 0,
            cost: calculateCost(resp.usage?.total_tokens || 0, 'azure-openai'),
        };
    } catch (err) {
        console.error('❌ [extractEntities]', err.message);
        return { intent: 'provide_info', entities: {} };
    }
}

export default { getSmartAIResponse, getAIResponse, extractEntities, extractAllData, extractAllComplaintTitles, sanitizeExtractedData, matchServiceCenter, validateExtracted };