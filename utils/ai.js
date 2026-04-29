import { AzureOpenAI } from "openai";
import serviceLogger from "./service_logger.js";

const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview",
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
});

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
        city_id: d.city_id,
        customer_phone: d.customer_phone && /^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(d.customer_phone)) ? d.customer_phone : null,
    };
    for (const [k, v] of Object.entries(fields)) {
        if (v) have.push(`${k}=${v}`); else need.push(k);
    }

    const cityList = SERVICE_CENTERS.map(c => c.city_name).join(", ");

    // Track validated vs collected fields
    const validated = [];
    const pending = [];
    
    for (const [k, v] of Object.entries(fields)) {
        if (v) {
            if (k === 'machine_no' && callData.customerData) {
                validated.push(`${k} ✅ VALIDATED`);
            } else {
                validated.push(`${k} ✅ COLLECTED`);
            }
        }
    }
    
    // Detect pending confirmations
    if (callData.pendingPhoneConfirm || callData.awaitingPhoneConfirm) {
        pending.push("phone_confirmation");
    }
    if (callData.pendingCityConfirm || callData.awaitingCityConfirm) {
        pending.push("city_confirmation");
    }
    if (callData.awaitingFinalConfirm) {
        pending.push("final_confirmation");
    }
    
    // Build "DO NOT ASK" list
    const doNotAsk = [];
    if (d.machine_no) doNotAsk.push("machine_no (already " + (callData.customerData ? "validated" : "collected") + ")");
    if (d.complaint_title) doNotAsk.push("complaint_title (already collected)");
    if (d.machine_status) doNotAsk.push("machine_status (already collected)");
    if (d.city) doNotAsk.push("city (already collected)");
    if (d.customer_phone) doNotAsk.push("customer_phone (already collected)");
    
    // Build transaction log
    const transactionLog = [];
    if (callData.customerData) {
        transactionLog.push(`✅ Turn ${callData.messages.findIndex(m => m.role === 'user' && /\d{4,7}/.test(m.text)) + 1 || 1}: Machine ${callData.customerData.machineNo} validated → ${callData.customerData.name}`);
    }
    if (d.complaint_title) {
        transactionLog.push(`✅ Complaint collected: ${d.complaint_title}`);
    }
    if (d.machine_status) {
        transactionLog.push(`✅ Machine status: ${d.machine_status}`);
    }
    if (d.city) {
        transactionLog.push(`✅ City collected: ${d.city}`);
    }
    if (d.customer_phone) {
        transactionLog.push(`✅ Phone collected: ${d.customer_phone}`);
    }

    // Determine the single most important next question
    let nextQuestion = "";
    if (!d.machine_no) nextQuestion = "Ask for chassis/machine number (4-7 digit number).";
    else if (!d.complaint_title) nextQuestion = "Ask what problem the machine has.";
    else if (!d.machine_status) nextQuestion = "Ask: 'Machine bilkul band hai ya problem ke saath chal rahi hai?' — If customer says bilkul band/nahi chal rahi/khadi hai → set machine_status to 'Breakdown'. If customer says chal rahi hai/problem ke saath → set machine_status to 'Running With Problem'.";
    else if (!d.city || !d.city_id) nextQuestion = "Ask which city/shahar they are in; confirm nearest Rajesh Motors service center if needed.";
    else if (!fields.customer_phone) nextQuestion = "Ask for their 10-digit mobile number.";
    else nextQuestion = "All data collected. Ask final confirmation once, then submit.";

    // Build conversation context for better reasoning
    const conversationHistory = callData.messages.slice(-6).map(m => 
        `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.text}`
    ).join('\n');

    const lastUserMessage = callData.messages.filter(m => m.role === 'user').slice(-1)[0]?.text || '';
    const turnNumber = callData.turnCount || 0;
    const machineAttempts = callData.machineNumberAttempts || 0;

    return `You are Priya — a warm, intelligent, fast-speaking female service agent at Rajesh Motors JCB service center.

=== CALL CONTEXT ===
Turn: ${turnNumber}
Customer Status: ${customer}
Machine Number Attempts: ${machineAttempts}/3
Collected Data: ${have.length ? have.join(" | ") : "nothing yet"}
Still Need: ${need.join(", ") || "NOTHING — ready to confirm"}
Next Action: ${nextQuestion}

=== TRANSACTION LOG (NEVER REPEAT THESE) ===
${transactionLog.length ? transactionLog.join('\n') : 'No data collected yet'}

=== ⛔ CRITICAL: DO NOT ASK FOR THESE FIELDS (LOOP PREVENTION) ===
${doNotAsk.length ? doNotAsk.map(f => `❌ NEVER ask for ${f}`).join('\n') : 'No restrictions yet - all fields can be asked'}

${doNotAsk.length ? `
🚫 ABSOLUTE RULES TO PREVENT LOOPS:
1. If customer mentions a field from DO NOT ASK list, acknowledge and move on
2. NEVER ask "machine number bataiye" if machine_no is already collected
3. NEVER ask "kya problem hai" if complaint_title is already collected
4. NEVER ask "band hai ya chal rahi" if machine_status is already collected
5. NEVER ask "kaunse shahar" if city is already collected
6. NEVER ask "phone number" if customer_phone is already collected
7. If customer repeats collected info, say: "Yeh mil gaya. [Ask next missing field]"
8. If customer is confused, gently redirect: "Theek hai, ab [next field] bataiye"
` : ''}

=== RECENT CONVERSATION ===
${conversationHistory || 'Call just started'}

Last Customer Input: "${lastUserMessage}"

=== YOUR ROLE & INTELLIGENCE ===
You are an AI agent with LOGICAL REASONING and CONTEXTUAL UNDERSTANDING.

1. **Context Awareness**: Remember what was just discussed. If customer is mid-sentence or continuing a thought, don't interrupt with unrelated questions.

2. **Logical Flow**: 
   - If customer is explaining a problem, let them finish before asking next question
   - If customer asks a question, answer it FIRST, then continue with data collection
   - If customer says "ek minute" or "ruko", acknowledge and wait patiently
   - If customer is confused, explain clearly what you need and WHY

3. **Smart Inference**:
   - If customer says "machine band hai" → infer machine_status = "Breakdown" AND complaint_title likely relates to "not starting"
   - If customer mentions location/city in passing, capture it even if not directly asked
   - If customer gives multiple problems in one breath, capture ALL of them
   - If customer says "same problem as before", acknowledge and ask them to describe it briefly

4. **Natural Conversation**:
   - Don't sound robotic or repetitive
   - Use varied language - not the same phrases every time
   - Show empathy: "Samajh gaya ji" / "Theek hai, main note kar raha hun"
   - Be patient with rural customers who may take time to find documents

5. **Question Handling - ALWAYS COMBINE ANSWER + NEXT QUESTION**:
   - If customer asks "kitna time lagega?" → Answer: "Engineer jaldi call karega. [Next missing field]?"
   - If customer asks "kya karna padega?" → Explain: "Complaint register karenge. [Next missing field]?"
   - If customer asks "aap kaun?" → "Main Priya, Rajesh Motors se. [Next missing field]?"
   - If customer asks about cost/price → "Engineer dekhega. [Next missing field]?"
   - **RULE: NEVER answer a side question and stop. ALWAYS add the next required question immediately.**

6. **Error Recovery**:
   - If you asked for machine number and customer gave complaint instead, acknowledge the complaint FIRST: "Theek hai ji, [complaint] note kar liya. Machine number bhi bata dijiye."
   - If customer is confused about what to say, give examples: "Jaise: engine start nahi, ya gear problem, ya hydraulic slow"
   - If customer gives wrong format, guide gently: "Machine number 4 se 7 digit ka hota hai ji"

7. **Loop Prevention Intelligence**:
   - If customer repeats already collected info: "Yeh mil gaya. Ab [next field] bataiye."
   - If customer says "maine abhi diya": "Haan, mil gaya. Ab [next field] chahiye."
   - If customer is confused: "Theek hai, [collected field] note hai. Ab [next field] bataiye."
   - NEVER ask for the same field twice - check DO NOT ASK list above

=== LANGUAGE RULES ===
Understand Hindi, English, Rajasthani, Marwari naturally.
Reply in Hindi. NEVER use "ji" - speak naturally without honorifics.
Keep replies SHORT — max 12-15 words unless explaining something complex.
Warm, human, not robotic.

CUSTOMER STATUS: ${customer}
COLLECTED: ${have.length ? have.join(" | ") : "nothing yet"}
STILL NEED: ${need.join(", ") || "NOTHING — ready to confirm"}
NEXT ACTION: ${nextQuestion}

YOUR ONLY JOB: Collect a JCB complaint. Ask ONE question at a time. Stay focused.
If all required fields are collected and the customer asks a direct question, answer it briefly and then submit the complaint or confirm only once.
Do not repeat the same final confirmation prompt twice.
Do not use canned reply templates or hardcoded phrases. Always generate natural Hindi responses that fit the customer’s exact question.

=== LANGUAGE RULES ===
Understand Hindi, English, Rajasthani, Marwari naturally.
Reply in Hindi. NEVER use "ji" - speak naturally without honorifics.
Keep replies SHORT — max 12-15 words. Warm, human, not robotic.

=== RAJASTHANI / MARWARI UNDERSTANDING ===
- "band padi / khadi padi / chal nahi ryi / chaalti nai" → machine is in Breakdown
- "tel nikal ryo / rissa / risso" → Oil Leakage
- "dhak gyi / zyada garam / tapt gyi" → Engine Overheating
- "filttar / filtar badlana / seva karwani" → Service/Filter Change
- "race nai / ras nai / gas nai leti" → Accelerator Problem
- "khatak / khatakhat / aavaaz aa ri / thokata" → Abnormal Noise
- "hydraulik / ailak / bucket nai uthta" → Hydraulic System Failure
- "thanda nai / AC kharab" → AC Not Working
- "brake nai lagta / rokti nai" → Brake Failure
- "bijli nai / light nai / battery down" → Electrical Problem

=== MULTI-COMPLAINT RULE ===
Customer may say many problems in one breath. Capture ALL of them:
- complaint_title = FIRST/PRIMARY problem
- complaint_details = ALL problems semicolon-separated (include the first too)
- NEVER discard any problem mentioned. Keep accumulating.
- Example: "engine start nahi, tel nikal raha, AC nahi, brake kharab"
  → title: "Engine Not Starting"
  → details: "Engine Not Starting; Oil Leakage; AC Not Working; Brake Failure"

=== CONVERSATION FLOW ===
1. **SIDE QUESTIONS (CRITICAL)**: If customer asks a side question (like "Who are you?", "How long will engineer take?", "Is my complaint registered?", "What's your name?", "How much will it cost?"), you MUST:
   - Answer the side question VERY BRIEFLY (1-3 words max)
   - IMMEDIATELY follow with the NEXT REQUIRED QUESTION in the SAME response
   - Do NOT wait for another turn
   - Example: Customer: "Who are you?" → Agent: "Main Priya. Machine number bataiye?"
   - Example: Customer: "How long will engineer take?" → Agent: "Jaldi aayega. Aapka phone number kya hai?"
   - Example: Customer: "Is my complaint registered?" → Agent: "Haan, register kar rahe hain. Aur koi problem toh nahi?"
   - This keeps conversation flowing naturally without breaks or repetition

2. If customer says "ek minute / ruko / dhundh raha" → say "Theek hai." and wait
3. If machine number not provided → simply ask: "Machine number bataiye"
4. After complaint collected, ask machine status: "Machine bilkul band hai ya problem ke saath chal rahi hai?"
4.1 If all required fields are already collected and customer asks a direct question, answer it briefly and then proceed to register the complaint.
   - If bilkul band / nahi chal rahi / khadi hai → machine_status = "Breakdown"
   - If chal rahi hai / problem ke saath → machine_status = "Running With Problem"
5. After ALL fields collected → ask: "Theek hai, aur koi problem toh nahi? Save kar dun?"
6. If customer says haan/yes/theek → set ready_to_submit: true

=== VALIDATION ===
- NEVER set ready_to_submit:true if machine_no is empty
- NEVER set ready_to_submit:true if any required field is missing
- Only set ready_to_submit:true after customer confirms "save kar do" or "haan theek hai"

VALID CITIES: ${cityList}

OUTPUT FORMAT — always end response with ### and JSON:
[your warm short reply] ### {"extracted":{"machine_no":"","complaint_title":"","machine_status":"","city":"","customer_phone":"","complaint_details":"","job_location":"","machine_location_address":""},"ready_to_submit":false}

CRITICAL: Stay on track. Answer side questions briefly then ALWAYS return to the NEXT ACTION above.

=== SIDE QUESTION HANDLING (CRITICAL - READ THIS) ===
When customer asks a side question, you MUST combine your answer with the next required question:
- WRONG: "Main Priya, Rajesh Motors se." [stops]
- RIGHT: "Main Priya, Rajesh Motors se. Machine number bataiye?"

- WRONG: "Engineer jaldi aayega." [stops]
- RIGHT: "Engineer jaldi aayega. Aapka phone number kya hai?"

- WRONG: "Haan, complaint register kar rahe hain." [stops]
- RIGHT: "Haan, complaint register kar rahe hain. Aur koi problem toh nahi?"

ALWAYS include the next required question in the SAME response. This prevents conversation breaks and keeps the flow natural.

=== IMPORTANT ===
If you don't have information about something (pricing, warranty details, engineer timing, etc.), say:
"Yeh detail mujhe available nahi hai. Aur information ke liye Rajesh Motors office se contact karein ya engineer ko call karein."
NEVER make up information. If unsure, admit you don't know.`;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   💰 COST CALCULATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function calculateCost(tokens, service) {
    const pricing = {
        'azure-openai': 0.0001, // $0.0001 per 1K tokens (rough estimate)
        'groq': 0.00005,        // $0.00005 per 1K tokens
        'ollama': 0,            // Free local
        'openai': 0.0001        // $0.0001 per 1K tokens
    };
    
    const pricePerToken = pricing[service] || 0;
    const costUSD = (tokens / 1000) * pricePerToken;
    const costINR = costUSD * 83; // Rough USD to INR conversion
    
    return costINR;
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

        // Fast regex pass first
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

        // Build system prompt
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

        // Parse response
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

        // Merge extracted data
        const merged = { ...callData.extractedData };
        for (const [k, v] of Object.entries(extractedJSON)) {
            if (!v || v === "NA" || v === "") continue;
            if (k === "customer_phone") {
                const ph = String(v).replace(/[\s\-]/g, "");
                if (/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(ph)) merged.customer_phone = ph;
            } else if (k === "complaint_details") {
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

        // City match again after AI
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

        // Clean reply
        replyText = replyText.replace(/```[\s\S]*?```/g, "").replace(/###[\s\S]*/g, "").trim();

        // ⛔ LOOP PREVENTION: Validate response doesn't ask for already collected fields
        const d = callData.extractedData;
        const replyLower = replyText.toLowerCase();
        
        // Check if asking for machine number when already collected
        if (d.machine_no && /machine\s*(number|no|नंबर|नम्बर)|chassis|बताइए|बताइये/.test(replyLower) && /number|नंबर/.test(replyLower)) {
            console.warn(`⚠️ [LOOP DETECTED] AI asking for machine_no but already have: ${d.machine_no}`);
            // Override with smart redirect
            if (!d.complaint_title) {
                replyText = "Machine number mil gaya. Kya problem hai?";
            } else if (!d.machine_status) {
                replyText = "Machine bilkul band hai ya chal rahi hai?";
            } else if (!d.city) {
                replyText = "Aap kaunse shahar mein hain?";
            } else if (!d.customer_phone) {
                replyText = "Aapka phone number?";
            } else {
                replyText = "Sab details mil gayi. Confirm kar dun?";
            }
            console.log(`   ✅ [LOOP FIXED] Redirected to: "${replyText}"`);
        }
        
        // Check if asking for complaint when already collected
        if (d.complaint_title && /(kya|kaun|kaunsi)\s*(problem|complaint|dikkat|परेशानी|समस्या)|problem\s*bata|complaint\s*bata/.test(replyLower)) {
            console.warn(`⚠️ [LOOP DETECTED] AI asking for complaint but already have: ${d.complaint_title}`);
            // Override with smart redirect
            if (!d.machine_status) {
                replyText = "Complaint mil gayi. Machine band hai ya chal rahi hai?";
            } else if (!d.city) {
                replyText = "Theek hai. Aap kaunse shahar mein hain?";
            } else if (!d.customer_phone) {
                replyText = "Samajh gaya. Aapka phone number?";
            } else {
                replyText = "Sab details mil gayi. Save kar dun?";
            }
            console.log(`   ✅ [LOOP FIXED] Redirected to: "${replyText}"`);
        }
        
        // Check if asking for city when already collected
        if (d.city && /(kaunse|kaun|kis)\s*(shahar|city|शहर)|city\s*bata|shahar\s*bata/.test(replyLower)) {
            console.warn(`⚠️ [LOOP DETECTED] AI asking for city but already have: ${d.city}`);
            // Override with smart redirect
            if (!d.customer_phone) {
                replyText = "City mil gayi. Aapka phone number?";
            } else {
                replyText = "Sab details mil gayi. Confirm kar dun?";
            }
            console.log(`   ✅ [LOOP FIXED] Redirected to: "${replyText}"`);
        }
        
        // Check if asking for phone when already collected
        if (d.customer_phone && /(phone|mobile|number|नंबर|फोन)\s*(number|bata|kya|क्या)/.test(replyLower) && !/machine/.test(replyLower)) {
            console.warn(`⚠️ [LOOP DETECTED] AI asking for phone but already have: ${d.customer_phone}`);
            // Override with smart redirect
            replyText = "Phone number mil gaya. Aur koi problem? Save kar dun?";
            console.log(`   ✅ [LOOP FIXED] Redirected to: "${replyText}"`);
        }
        
        // Check if asking for machine status when already collected
        if (d.machine_status && /(band|chal\s*rahi|khadi|बंद|चल\s*रही)\s*(hai|है)/.test(replyLower) && /\?/.test(replyText)) {
            console.warn(`⚠️ [LOOP DETECTED] AI asking for machine_status but already have: ${d.machine_status}`);
            // Override with smart redirect
            if (!d.city) {
                replyText = "Status mil gaya. Aap kaunse shahar mein hain?";
            } else if (!d.customer_phone) {
                replyText = "Theek hai. Aapka phone number?";
            } else {
                replyText = "Sab details mil gayi. Save kar dun?";
            }
            console.log(`   ✅ [LOOP FIXED] Redirected to: "${replyText}"`);
        }

        // Validate before marking ready
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

        // Log successful LLM usage
        serviceLogger.logLLM(
            callData.callSid,
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
        
        // Log failed LLM usage
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

    // Skip hold phrases
    if (/^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|leke aata|bas|ok|haan|ha|acha|achha)\s*$/i.test(lo)) return {};

    // ── Machine number (4-7 digits) ──────────────────────────────
    if (!cur.machine_no) {
        let noPhone = text.replace(/[6-9]\d{9}/g, '');
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

    // ── City (Devanagari + English + Rajasthani variants) ─────────
    if (!cur.city) {
        const DEVA_MAP = {
            "भीलवाड़ा": "BHILWARA", "बड़ी": "BHILWARA", "जयपुर": "JAIPUR", "अजमेर": "AJMER",
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

    // ── Machine status (with Rajasthani) ─────────────────────────
    if (!cur.machine_status) {
        const bkRx = /(band|khadi|khari|stop|ruk gayi|breakdown|बंद|खड़ी|chalu nahi|chalti nahi|start nahi|start nhi|nahi chal|padi hai|band padi|chal nhi rahi|chal nhi|nhi chal|nahi chalti|band padi hai|khadi padi|chal nai ryi|chaalti nai|chal nai)/;
        const rwRx = /(chal rahi|chal rhi|running|chalu hai|dikkat|problem|चल रही|चालू है|chal ryi|chaalti hai)/;
        const svRx = /(filter|filttar|filtar|service|oil change|tel badlo|seva|सर्विस|फिल्टर)/;
        if (bkRx.test(lo) || bkRx.test(text)) ex.machine_status = "Breakdown";
        else if (svRx.test(lo)) ex.machine_status = "Running With Problem";
        else if (rwRx.test(lo) || rwRx.test(text)) ex.machine_status = "Running With Problem";
    }

    // ── Job location ──────────────────────────────────────────────
    if (!cur.job_location) {
        if (/(workshop|garage|वर्कशॉप|गैराज)/.test(lo)) ex.job_location = "Workshop";
        else if (/(site|field|bahar|khet|sadak|onsite|साइट|खेत)/.test(lo)) ex.job_location = "Onsite";
    }

    // ── Complaint title (with Rajasthani variants) ────────────────
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
    if (c.customer_phone && !/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(c.customer_phone))) c.customer_phone = null;
    if (c.machine_no && !/^\d{4,7}$/.test(c.machine_no)) c.machine_no = null;
    return c;
}

export default { getSmartAIResponse, extractAllData, matchServiceCenter, sanitizeExtractedData };