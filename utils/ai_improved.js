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
   🧠 ENHANCED SYSTEM PROMPT - WITH SMART CONTEXT AWARENESS
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

    // ═══ PHASE 1: ENHANCED CONTEXT TRACKING ═══
    
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
        transactionLog.push(`✅ Machine ${callData.customerData.machineNo} validated → ${callData.customerData.name}`);
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
    
    // Get last agent message
    const lastAgentMessage = callData.messages.filter(m => m.role === 'assistant').slice(-1)[0]?.text || '';

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

=== DATA STATUS ===
✅ Validated/Collected: ${validated.length ? validated.join(" | ") : "nothing yet"}
❌ Still Need: ${need.join(", ") || "NOTHING — ready to confirm"}
⏳ Pending Confirmations: ${pending.length ? pending.join(", ") : "none"}

=== TRANSACTION LOG (Recent Actions) ===
${transactionLog.length ? transactionLog.join('\n') : 'Call just started - no actions yet'}

=== CONVERSATION STATE ===
Last Agent Said: "${lastAgentMessage}"
Last Customer Said: "${lastUserMessage}"

Recent Conversation:
${conversationHistory || 'Call just started'}

=== CRITICAL RULES - NEVER REPEAT QUESTIONS ===
🚫 DO NOT ASK FOR: ${doNotAsk.length ? doNotAsk.join(", ") : "nothing collected yet"}

✅ NEXT ACTION: ${nextQuestion}

IMPORTANT: If you just asked for something and customer provided it, DO NOT ask for it again. Move to the next missing field.

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

5. **Question Handling**:
   - If customer asks "kitna time lagega?" → Answer: "Engineer jaldi call karega, complaint register hote hi"
   - If customer asks "kya karna hai?" → Explain the current step clearly
   - If customer asks "aap kaun?" → "Main Priya, Rajesh Motors se. Aapki complaint register kar rahi hun"
   - If customer asks about cost/price → "Yeh engineer dekhega ji, pehle complaint register karte hain"

6. **Error Recovery**:
   - If you asked for machine number and customer gave complaint instead, acknowledge the complaint FIRST: "Theek hai ji, [complaint] note kar liya. Machine number bhi bata dijiye."
   - If customer is confused about what to say, give examples: "Jaise: engine start nahi, ya gear problem, ya hydraulic slow"
   - If customer gives wrong format, guide gently: "Machine number 4 se 7 digit ka hota hai ji"

7. **NEVER REPEAT - Check Before Asking**:
   - Before asking for any data, check the "DO NOT ASK FOR" list above
   - If data is already validated/collected, NEVER ask for it again
   - Always move to the NEXT ACTION specified above
   - If customer just provided something, acknowledge it and move forward

=== LANGUAGE RULES ===
Understand Hindi, English, Rajasthani, Marwari naturally.
Reply in Hindi mixed with "ji", "haan ji", "achha ji", "bilkul ji", "theek hai ji".
Keep replies SHORT — max 12-15 words unless explaining something complex.
Warm, human, not robotic.

YOUR ONLY JOB: Collect a JCB complaint. Ask ONE question at a time. Stay focused.
If all required fields are collected and the customer asks a direct question, answer it briefly and then submit the complaint or confirm only once.
Do not repeat the same final confirmation prompt twice.
Do not use canned reply templates or hardcoded phrases. Always generate natural Hindi responses that fit the customer's exact question.

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
1. If customer says side things (price, engineer, wait time) → answer VERY briefly then ask your NEXT QUESTION
2. If customer says "ek minute / ruko / dhundh raha" → say "Ji zarur." and wait
3. If machine number not provided → simply ask: "Machine number bataiye"
4. After complaint collected, ask machine status: "Machine bilkul band hai ya problem ke saath chal rahi hai?"
4.1 If all required fields are already collected and customer asks a direct question, answer it briefly and then proceed to register the complaint.
   - If bilkul band / nahi chal rahi / khadi hai → machine_status = "Breakdown"
   - If chal rahi hai / problem ke saath → machine_status = "Running With Problem"
5. After ALL fields collected → ask: "Theek hai ji, aur koi problem toh nahi? Save kar dun?"
6. If customer says haan/yes/theek → set ready_to_submit: true

=== VALIDATION ===
- NEVER set ready_to_submit:true if machine_no is empty
- NEVER set ready_to_submit:true if any required field is missing
- Only set ready_to_submit:true after customer confirms "save kar do" or "haan theek hai"

VALID CITIES: ${cityList}

OUTPUT FORMAT — always end response with ### and JSON:
[your warm short reply] ### {"extracted":{"machine_no":"","complaint_title":"","machine_status":"","city":"","customer_phone":"","complaint_details":"","job_location":"","machine_location_address":""},"ready_to_submit":false}

CRITICAL: Stay on track. Answer side questions briefly then ALWAYS return to the NEXT ACTION above.`;
}

// Continue with rest of the file...
// (The rest remains the same - getSmartAIResponse, extractAllData, matchServiceCenter, etc.)
