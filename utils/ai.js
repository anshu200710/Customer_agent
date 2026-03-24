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
   🔊 SSML
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function toSSML(text) {
    if (!text) return "<speak>Ji.</speak>";
    let s = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    s = s.replace(/([।\.!?])\s+/g, '$1<break time="250ms"/> ');
    return `<speak><prosody rate="medium" pitch="+1st">${s}</prosody></speak>`;
}
export function toSSMLId(idStr) {
    return `<speak><prosody rate="slow">${String(idStr).split("").join('<break time="200ms"/>')}</prosody></speak>`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🧠 SYSTEM PROMPT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function buildSystemPrompt(callData) {
    const d = callData.extractedData;
    const customerLine = callData.customerData
        ? `CUSTOMER: ${callData.customerData.name} | Machine:${callData.customerData.machineNo} | Phone:${callData.customerData.phone}`
        : `CUSTOMER: NOT IDENTIFIED`;
    const status = `M:${d.machine_no || "❌"} P:${d.complaint_title || "❌"} S:${d.machine_status || "❌"} C:${d.city || "❌"} Ph:${d.customer_phone || "❌"}`;

    let ask = "";
    if (!d.machine_no) ask = "ASK chassis number";
    else if (!d.complaint_title) ask = "ASK kya problem hai";
    else if (!d.machine_status) ask = "ASK band hai ya chal rahi";
    else if (!d.city) ask = "ASK kaunsa shahar";
    else if (!d.customer_phone || !/^[6-9]\d{9}$/.test(d.customer_phone)) ask = "ASK 10 digit number";
    else ask = "SUBMIT → ready_to_submit:true";

    return `Tu JCB service agent Priya hai — Rajesh Motors. Warm, fast, Hindi/Rajasthani samjhe.
${customerLine}
DATA: ${status}
NOW: ${ask}

RULES (strict):
1. Max 10 words. Warm tone — "Ji", "Achha ji", "Theek hai ji", "Bilkul ji".
2. GREEDY: ek turn mein sab extract karo. Jo mila wo extracted mein do.
3. City SIRF customer ki baat se — API se nahi.
4. band/start nahi/chalu nahi → machine_status:"Breakdown" auto.
5. filter/service → complaint_title:"Service/Filter Change", status:"Running With Problem".
6. Multiple problems → pehla complaint_title, baaki complaint_details mein.
7. ek minute/ruko → extracted:{} "Ji zarur, main hun."
8. Already-filed fields KABHI mat poocho dobara.
9. "pehle wala number" / "last mein 59" → use previously mentioned number.
10. "pata nahi chassis" → "Machine ke dashboard pe plate pe number hota hai ji."

RAJASTHANI: tel nikal ryo=Oil Leakage | dhak gyi=Overheating | band padi=Breakdown
rissa=leaking | filttar=filter | race nahi/ras nahi=Accelerator | khatak=Noise

OUTPUT: [response] ### {"extracted":{"complaint_title":"","machine_status":"","city":"","customer_phone":"","complaint_details":""},"ready_to_submit":false}`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🤖 GET AI RESPONSE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export async function getSmartAIResponse(callData) {
    try {
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // Regex over all turns
        let acc = { ...callData.extractedData };
        for (const msg of callData.messages) {
            if (msg.role === "user") {
                const rx = extractWithRegex(msg.text, acc);
                acc = { ...acc, ...rx };
            }
        }
        for (const [k, v] of Object.entries(acc)) {
            if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
        }
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // Auto status
        if (callData.extractedData.complaint_title && !callData.extractedData.machine_status) {
            const t = callData.extractedData.complaint_title.toLowerCase();
            callData.extractedData.machine_status = /engine not starting|not starting/.test(t)
                ? "Breakdown" : "Running With Problem";
        }

        const messages = [
            { role: "system", content: buildSystemPrompt(callData) },
            ...callData.messages.slice(-4).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.text,
            })),
        ];
        if (callData.messages.length === 0) {
            messages.push({ role: "user", content: "[Call connected]" });
        }

        console.log("🤖 [Groq]...");
        const resp = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages,
            temperature: 0.1,
            max_tokens: 80,
            top_p: 0.9,
        });

        const aiText = resp.choices?.[0]?.message?.content?.trim();
        if (!aiText) throw new Error("Empty");
        console.log(`✅ [Groq] "${aiText.substring(0, 80)}"`);

        const parsed = parseAIResponse(aiText, callData);

        // Regex on latest turn
        const lastUser = callData.messages.filter(m => m.role === "user").pop()?.text || "";
        const rxNow = extractWithRegex(lastUser, { ...callData.extractedData, ...parsed.extractedData });
        for (const [k, v] of Object.entries(rxNow)) {
            if (v && !parsed.extractedData[k]) parsed.extractedData[k] = v;
        }

        // City matching
        if (parsed.extractedData.city && !parsed.extractedData.city_id) {
            const m = matchServiceCenter(parsed.extractedData.city);
            if (m) {
                parsed.extractedData.city = m.city_name;
                parsed.extractedData.city_id = m.branch_code;
                parsed.extractedData.branch = m.branch_name;
                parsed.extractedData.outlet = m.city_name;
                parsed.extractedData.lat = m.lat;
                parsed.extractedData.lng = m.lng;
                console.log(`   🗺️  ${m.city_name} → ${m.branch_name}`);
            }
        }

        // Auto status again
        if (parsed.extractedData.complaint_title && !parsed.extractedData.machine_status) {
            const t = parsed.extractedData.complaint_title.toLowerCase();
            parsed.extractedData.machine_status = /engine not starting|not starting/.test(t)
                ? "Breakdown" : "Running With Problem";
        }

        if (parsed.readyToSubmit) {
            const v = validateData(parsed.extractedData);
            if (!v.valid) { console.warn(`⚠️  ${v.reason}`); parsed.readyToSubmit = false; }
        }

        return parsed;
    } catch (err) {
        console.error("❌ [Groq]", err.message);
        return { text: "Ji.", intent: "error", extractedData: callData.extractedData || {}, readyToSubmit: false };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔍 PARSE AI RESPONSE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function parseAIResponse(aiText, callData) {
    let text = aiText, extractedData = { ...callData.extractedData };
    let readyToSubmit = false, intent = "continue";
    try {
        const idx = aiText.indexOf("###");
        if (idx !== -1) {
            text = aiText.substring(0, idx).trim();
            const jm = aiText.substring(idx + 3).trim().replace(/```json|```/g, "").match(/\{[\s\S]*\}/);
            if (jm) {
                const j = JSON.parse(jm[0]);
                intent = j.intent || "continue";
                readyToSubmit = !!j.ready_to_submit;
                if (j.extracted) {
                    const KM = {
                        machine: "machine_no", machine_number: "machine_no", machineNo: "machine_no",
                        chassis: "machine_no", chassis_no: "machine_no",
                        problem: "complaint_title", complaint: "complaint_title", issue: "complaint_title",
                        status: "machine_status", location: "job_location",
                        phone: "customer_phone", mobile: "customer_phone", number: "customer_phone",
                        city_name: "city", town: "city",
                        details: "complaint_details",
                    };
                    for (let [k, v] of Object.entries(j.extracted)) {
                        if (!v || v === "NA" || v === "") continue;
                        k = KM[k] || k;
                        if (k === "customer_phone") {
                            const ph = String(v).replace(/[\s\-]/g, "");
                            if (/^[6-9]\d{9}$/.test(ph)) extractedData[k] = ph;
                        } else if (k === "complaint_details" && extractedData.complaint_details) {
                            if (!extractedData.complaint_details.includes(v))
                                extractedData.complaint_details += `; ${v}`;
                        } else {
                            extractedData[k] = v;
                        }
                    }
                }
            }
        }
    } catch { }
    text = text.replace(/```[\s\S]*?```/g, "").replace(/###[\s\S]*/g, "").trim();
    return { text, intent, extractedData, readyToSubmit };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔍 REGEX EXTRACTION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function extractWithRegex(text, cur) {
    const ex = {}, orig = text;
    const lo = text.toLowerCase().replace(/[।\.\!\?]/g, " ").replace(/\s+/g, " ").trim();

    if (/^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|leke aata|ek dam|bas)\s*$/i.test(lo)) return {};

    // Machine (4-7 digits)
    if (!cur.machine_no) {
        const cl = lo.replace(/\b[6-9]\d{9}\b/g, "").replace(/\b[6-9]\d{8}\b/g, "");
        const m = cl.match(/\b(\d{4,7})\b/);
        if (m) ex.machine_no = m[1];
    }

    // Phone
    if (!cur.customer_phone || !/^[6-9]\d{9}$/.test(cur.customer_phone)) {
        const cmp = text.replace(/[\s\-,।\.]/g, "");
        for (const seq of cmp.match(/\d+/g) || []) {
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
        const DC = {
            "भीलवाड़ा": "BHILWARA", "जयपुर": "JAIPUR", "अजमेर": "AJMER", "अलवर": "ALWAR",
            "जोधपुर": "JODHPUR", "उदयपुर": "UDAIPUR", "कोटा": "KOTA", "सीकर": "SIKAR",
            "बीकानेर": "BIKANER", "टोंक": "TONK", "झुंझुनू": "JHUNJHUNU", "दौसा": "DAUSA",
            "नागौर": "NAGAUR", "पाली": "PALI", "बाड़मेर": "BARMER", "जैसलमेर": "JAISALMER",
            "चित्तौड़गढ़": "CHITTORGARH", "बूंदी": "BUNDI", "बारां": "BARAN",
            "झालावाड़": "JHALAWAR", "झालावार": "JHALAWAR", "राजसमंद": "RAJSAMAND",
            "भरतपुर": "BHARATPUR", "धौलपुर": "DHOLPUR", "करौली": "KARAULI",
            "सवाई माधोपुर": "SAWAI MADHOPUR", "सवाईमाधोपुर": "SAWAI MADHOPUR",
            "डूंगरपुर": "DUNGARPUR", "बांसवाड़ा": "BANSWARA", "प्रतापगढ़": "PRATAPGARH",
            "सिरोही": "SIROHI", "जालोर": "JALOR", "नीम का थाना": "NEEM KA THANA",
            "चुरू": "CHURU", "हनुमानगढ़": "HANUMANGARH", "गंगानगर": "GANGANAGAR",
            "श्रीगंगानगर": "GANGANAGAR", "निम्बाहेड़ा": "NIMBAHERA", "सुजानगढ़": "SUJANGARH",
            "कोटपूतली": "KOTPUTLI", "कोटपुतली": "KOTPUTLI", "भिवाड़ी": "BHIWADI",
            "रामगंज मंडी": "RAMGANJMANDI", "रामगंज": "RAMGANJMANDI",
        };
        for (const [d, l] of Object.entries(DC)) { if (orig.includes(d)) { ex.city = l; break; } }
        if (!ex.city) {
            for (const c of [...SERVICE_CENTERS].sort((a, b) => b.city_name.length - a.city_name.length)) {
                if (lo.includes(c.city_name.toLowerCase())) { ex.city = c.city_name; break; }
            }
        }
    }

    // Machine status
    if (!cur.machine_status) {
        const bk = /(band|khadi|khari|stop|ruk|breakdown|बंद|खड़ी|chalu nahi|chalti nahi|start nahi|start nhi|nahi chal|ho nahi rahi|chalu nhi|chal nahi|padi hai|khari hai|band padi|chal nhi rahi)/;
        const rw = /(chal rahi|chal rhi|running|chalu hai|dikkat|problem hai|चल रही|चालू है)/;
        const sv = /(filter|filttar|service|oil change|tel badlo|सर्विस|फिल्टर)/;
        if (bk.test(lo) || bk.test(orig)) ex.machine_status = "Breakdown";
        else if (sv.test(lo)) ex.machine_status = "Running With Problem";
        else if (rw.test(lo) || rw.test(orig)) ex.machine_status = "Running With Problem";
    }

    // Job location
    if (!cur.job_location) {
        if (/(workshop|garage|वर्कशॉप|गैराज)/.test(lo)) ex.job_location = "Workshop";
        else if (/(site|field|bahar|khet|sadak|onsite|साइट|खेत)/.test(lo)) ex.job_location = "Onsite";
    }

    // Complaint title
    if (!cur.complaint_title) {
        const mCtx = /(machine|jcb|start|chalu|engine|मशीन|इंजन)/.test(lo);
        const ns = /(start nahi|start nhi|chalu nahi|chalu nhi|chalti nahi|chal nahi rahi|nahi chal rahi|चालू नहीं|स्टार्ट नहीं|नहीं चल)/.test(lo);
        const nsv = /(ho nahi rahi|nahi ho rahi|नहीं हो रही)/.test(lo) && mCtx;
        const bnd = /(band hai|band ho gayi|band pad|khari hai|बंद है|बंद हो)/.test(lo);

        if (ns || nsv || bnd) ex.complaint_title = "Engine Not Starting";
        else if (/(filter|filttar|service|oil change|tel badlo|सर्विस|फिल्टर)/.test(lo)) ex.complaint_title = "Service/Filter Change";
        else if (/(dhuan|dhua|smoke|धुआं)/.test(lo)) ex.complaint_title = "Engine Smoke";
        else if (/(garam|dhak|overheat|ubhal|tapta|ज्यादा गरम|ढक गई)/.test(lo)) ex.complaint_title = "Engine Overheating";
        else if (/(tel nikal|oil leak|rissa|tel nikal ryo|तेल निकल|रिस)/.test(lo)) ex.complaint_title = "Oil Leakage";
        else if (/(hydraulic|hydro|cylinder|bucket|boom|jack|हाइड्रोलिक)/.test(lo)) ex.complaint_title = "Hydraulic System Failure";
        else if (/(race nahi|ras nahi|accelerator|रेस नहीं|gas nahi)/.test(lo)) ex.complaint_title = "Accelerator Problem";
        else if (/(ac nahi|hawa nahi|thanda nahi|ac band|ठंडा नहीं)/.test(lo)) ex.complaint_title = "AC Not Working";
        else if (/(brake nahi|brake nhi|rokti nahi|ब्रेक)/.test(lo)) ex.complaint_title = "Brake Failure";
        else if (/(bijli nahi|headlight|bulb|electrical|लाइट)/.test(lo)) ex.complaint_title = "Electrical Problem";
        else if (/(tire|tyre|pankchar|puncture|टायर)/.test(lo)) ex.complaint_title = "Tire Problem";
        else if (/(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration|खटखट)/.test(lo)) ex.complaint_title = "Abnormal Noise";
        else if (/(steering|स्टीयरिंग)/.test(lo)) ex.complaint_title = "Steering Problem";
        else if (/(gear|transmission|गियर)/.test(lo)) ex.complaint_title = "Transmission Problem";
    }

    return ex;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ VALIDATE + SANITIZE
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function validateData(data) {
    if (!data.job_location) data.job_location = "Onsite";
    for (const f of ["machine_no", "complaint_title", "machine_status", "job_location", "city", "customer_phone"]) {
        if (!data[f] || data[f] === "NA" || data[f] === "Unknown")
            return { valid: false, reason: `Missing ${f}` };
    }
    if (!/^[6-9]\d{9}$/.test(data.customer_phone)) return { valid: false, reason: "Bad phone" };
    if (!/^\d{4,7}$/.test(data.machine_no)) return { valid: false, reason: "Bad machine" };
    return { valid: true };
}

export function sanitizeExtractedData(data) {
    const c = { ...data };
    if (c.customer_phone && !/^[6-9]\d{9}$/.test(c.customer_phone)) c.customer_phone = null;
    if (c.machine_no && !/^\d{4,7}$/.test(c.machine_no)) c.machine_no = null;
    return c;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗺️ MATCH SERVICE CENTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export function matchServiceCenter(cityText) {
    if (!cityText || cityText.length < 2) return null;
    const inp = cityText.trim().toUpperCase();
    const exact = SERVICE_CENTERS.find(c => c.city_name === inp || c.branch_name === inp);
    if (exact) return exact;
    const PM = {
        "JAYPUR": "JAIPUR", "JYPUR": "JAIPUR", "JODHPURR": "JODHPUR", "BYKANIR": "BIKANER",
        "UDAI": "UDAIPUR", "ODAIPUR": "UDAIPUR", "VKI": "VKIA", "ABU": "ABU ROAD",
        "SWARUP": "SWARUPGANJ", "NEEM": "NEEM KA THANA", "SONG": "TONK", "MAVAL": "MAWAL",
        "JHUNJ": "JHUNJHUNU", "RAMGANJ": "RAMGANJMANDI", "SAWAI": "SAWAI MADHOPUR",
        "GANGANA": "GANGANAGAR", "HANUMAN": "HANUMANGARH", "CHITT": "CHITTORGARH",
        "PRATAP": "PRATAPGARH", "BANSWA": "BANSWARA", "RAJSAM": "RAJSAMAND",
        "NIMBA": "NIMBAHERA", "KARAUL": "KARAULI", "KOTPUT": "KOTPUTLI",
        "SUJAN": "SUJANGARH", "DHOLP": "DHOLPUR", "DUNGAR": "DUNGARPUR",
        "JHALA": "JHALAWAR", "BARME": "BARMER", "JAISAL": "JAISALMER",
    };
    for (const [w, c] of Object.entries(PM)) {
        if (inp.includes(w)) return SERVICE_CENTERS.find(sc => sc.city_name === c);
    }
    if (inp.length >= 3) {
        const p3 = inp.slice(0, 3);
        const f = SERVICE_CENTERS.find(c => c.city_name.startsWith(p3) || p3.startsWith(c.city_name.slice(0, 3)));
        if (f) return f;
    }
    return null;
}

export function extractAllData(text, currentData = {}) { return extractWithRegex(text, currentData); }
export default { getSmartAIResponse, extractAllData, matchServiceCenter, toSSML, toSSMLId };