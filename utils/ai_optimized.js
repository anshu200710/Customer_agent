import { AzureOpenAI } from "openai";
import serviceLogger from "./service_logger.js";
import performanceLogger from "./performance_logger.js";
import logger from "./logger.js";

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
   🧠 SYSTEM PROMPT (OPTIMIZED FOR TOKEN EFFICIENCY)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function buildSystemPrompt(callData) {
    const d = callData.extractedData;
    
    // Helper function to convert to Title Case
    const toTitleCase = (str) => {
        if (!str) return str;
        return String(str).toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    };
    
    const customer = callData.customerData
        ? `${toTitleCase(callData.customerData.name)} | ${callData.customerData.machineNo}`
        : `Not identified`;

    const have = [];
    const need = [];
    const fields = {
        machine_no: d.machine_no,
        complaint_title: d.complaint_title,
        machine_status: d.machine_status,
        city: d.city,
        customer_phone: d.customer_phone && /^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(d.customer_phone)) ? d.customer_phone : null,
    };
    for (const [k, v] of Object.entries(fields)) {
        if (v) have.push(`${k}=${v}`); else need.push(k);
    }

    // Determine next action
    let nextAction = "";
    if (!d.machine_no) nextAction = "Ask machine number (4-7 digits)";
    else if (!d.complaint_title) nextAction = "Ask problem";
    else if (!d.machine_status) nextAction = "Ask: Band hai ya chal rahi? → Breakdown/Running";
    else if (!d.city) nextAction = "Ask city";
    else if (!fields.customer_phone) nextAction = "Ask phone (10 digits)";
    else nextAction = "Final confirm then submit";

    // Recent conversation (last 3 exchanges only)
    const recentMsgs = callData.messages.slice(-6).map(m => 
        `${m.role === 'user' ? 'C' : 'A'}: ${m.text}`
    ).join('\n');

    const lastUserMsg = callData.messages.filter(m => m.role === 'user').slice(-1)[0]?.text || '';

    return `You are Priya, Rajesh Motors JCB service agent. Collect complaint data efficiently.

CONTEXT:
Turn: ${callData.turnCount || 0} | Customer: ${customer} | Attempts: ${callData.machineNumberAttempts || 0}/3
Have: ${have.join(" | ") || "none"}
Need: ${need.join(", ") || "READY"}
Next: ${nextAction}

RECENT:
${recentMsgs || 'Call start'}
Last: "${lastUserMsg}"

RULES:
1. Reply in Hindi, max 10 words, no "ji"
2. Ask ONE question at a time
3. If side question → answer briefly + ask next required field immediately
4. Capture ALL problems customer mentions
5. Understand: Hindi/English/Rajasthani/Marwari

DIALECT MAPPING:
- band/khadi/chal nai → Breakdown
- tel nikal/rissa → Oil Leak
- dhak/garam → Overheat
- filttar/seva → Service
- hydraulik/ailak → Hydraulic
- brake nai/rokti nai → Brake
- bijli nai/battery → Electrical

SIDE QUESTION EXAMPLES:
Q: "Aap kaun?" → A: "Main Priya. Machine number?"
Q: "Kitna time?" → A: "Jaldi aayega. Phone number?"
Q: "Cost?" → A: "Engineer batayega. City?"

FLOW:
1. Machine number → 2. Problem → 3. Status (band/chal rahi) → 4. City → 5. Phone → 6. Confirm → Submit

VALIDATION:
- ready_to_submit ONLY if all fields collected AND customer confirms
- If customer confused, give example: "Jaise engine start nahi"

OUTPUT:
[short Hindi reply] ### {"extracted":{"m_no":"","title":"","status":"","city":"","phone":"","details":"","loc":"","addr":""},"ready_to_submit":false}`;
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
    const overallStartTime = performanceLogger.getHighResTime();
    let service = 'Azure OpenAI';
    let model = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o-mini";
    let prompt = '';
    let response = '';
    let error = null;
    let timings = {
        promptBuild: 0,
        apiCall: 0,
        parsing: 0,
        total: 0
    };
    
    try {
        // Phase 1: Data preparation
        const prepStartTime = performanceLogger.getHighResTime();
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

        // Phase 2: Build system prompt
        const promptStartTime = performanceLogger.getHighResTime();
        const systemPrompt = buildSystemPrompt(callData);
        prompt = systemPrompt;
        const promptEndTime = performanceLogger.getHighResTime();
        timings.promptBuild = promptEndTime - promptStartTime;
        logger.verbose(`      ⚡ [AI TIMING] Prompt build: ${timings.promptBuild.toFixed(2)}ms`);

        const messages = [
            { role: "system", content: systemPrompt },
            ...callData.messages.slice(-4).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                content: m.text,
            })),
        ];
        if (!messages.find(m => m.role === "user")) {
            messages.push({ role: "user", content: "[call connected]" });
        }

        // Phase 3: API call
        const apiCallStartTime = performanceLogger.getHighResTime();
        const resp = await client.chat.completions.create({
            model: model,
            messages,
            temperature: 0.15,
            max_tokens: 160,
            top_p: 0.9,
        });
        const apiCallEndTime = performanceLogger.getHighResTime();
        timings.apiCall = apiCallEndTime - apiCallStartTime;
        logger.verbose(`      ⚡ [AI TIMING] Azure API call: ${timings.apiCall.toFixed(2)}ms`);

        const raw = resp.choices?.[0]?.message?.content?.trim();
        if (!raw) throw new Error("Empty Azure OpenAI response");

        response = raw;

        // Phase 4: Parse response
        const parseStartTime = performanceLogger.getHighResTime();
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

        // Merge extracted data with field name mapping
        const merged = { ...callData.extractedData };
        
        // Map shorter field names to full names for backward compatibility
        const fieldMapping = {
            'm_no': 'machine_no',
            'title': 'complaint_title',
            'status': 'machine_status',
            'city': 'city',
            'phone': 'customer_phone',
            'details': 'complaint_details',
            'loc': 'job_location',
            'addr': 'machine_location_address',
            // Also support full names if AI uses them
            'machine_no': 'machine_no',
            'complaint_title': 'complaint_title',
            'machine_status': 'machine_status',
            'customer_phone': 'customer_phone',
            'complaint_details': 'complaint_details',
            'job_location': 'job_location',
            'machine_location_address': 'machine_location_address'
        };
        
        for (const [k, v] of Object.entries(extractedJSON)) {
            if (!v || v === "NA" || v === "") continue;
            
            // Map short field name to full field name
            const fullFieldName = fieldMapping[k] || k;
            
            if (fullFieldName === "customer_phone") {
                const ph = String(v).replace(/[\s\-]/g, "");
                if (/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(ph)) merged.customer_phone = ph;
            } else if (fullFieldName === "complaint_details") {
                const existing = (merged.complaint_details || '').split('; ').map(s => s.trim()).filter(Boolean);
                const incoming = String(v).split('; ').map(s => s.trim()).filter(Boolean);
                const combined = [...existing];
                for (const item of incoming) {
                    if (!combined.includes(item)) combined.push(item);
                }
                merged.complaint_details = combined.join('; ');
            } else {
                merged[fullFieldName] = v;
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

        // Validate before marking ready
        if (readyToSubmit) {
            const v = validateExtracted(merged);
            if (!v.valid) { 
                readyToSubmit = false; 
                logger.verbose(`⚠️ Not ready: ${v.reason}`); 
            }
        }
        
        const parseEndTime = performanceLogger.getHighResTime();
        timings.parsing = parseEndTime - parseStartTime;
        logger.verbose(`      ⚡ [AI TIMING] Response parsing: ${timings.parsing.toFixed(2)}ms`);

        const latency = Date.now() - startTime;
        const tokens = resp.usage?.total_tokens || 0;
        const cost = calculateCost(tokens, 'azure-openai');
        
        timings.total = performanceLogger.getHighResTime() - overallStartTime;
        logger.verbose(`      ⚡ [AI TIMING] Total (incl overhead): ${timings.total.toFixed(2)}ms`);
        logger.verbose(`      📊 [AI STATS] Tokens: ${tokens} | Prompt: ${timings.promptBuild.toFixed(0)}ms | API: ${timings.apiCall.toFixed(0)}ms | Parse: ${timings.parsing.toFixed(0)}ms`);

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
                success: true,
                timings
            }
        );

        logger.verbose(`   🤖 AI: "${replyText}" | ready:${readyToSubmit}`);
        return { 
            text: replyText, 
            extractedData: merged, 
            readyToSubmit,
            tokens,
            cost,
            timings
        };

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

        logger.error("❌ [Azure OpenAI]", error);
        return {
            text: "Ji, bataiye.",
            extractedData: callData.extractedData || {},
            readyToSubmit: false,
        };
    }
}

// ... (rest of the file remains the same - extractAllData, matchServiceCenter, etc.)
// Import the rest from the original ai.js file
