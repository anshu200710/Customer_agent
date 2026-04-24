import express from "express";
import twilio from "twilio";
import axios from "axios";
import { getSmartAIResponse, getAIResponse, extractEntities, extractAllData, sanitizeExtractedData, matchServiceCenter } from "../utils/ai.js";
import { searchFAQ, getAgentInfo, getUnavailableMessage } from "../utils/faq.js";
import { generateSpeech, detectEmotionAndContext, formatNumbersForTTS } from "../utils/cartesia_tts.js";
import serviceLogger from "../utils/service_logger.js";
import performanceLogger from "../utils/performance_logger.js";

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;
const activeCalls = new Map();

const BASE_URL = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7";
const COMPLAINT_URL = `${BASE_URL}/ai_call_complaint.php`;
const API_TIMEOUT = 12000;
const API_HEADERS = { JCBSERVICEAPI: "MakeInJcb" };

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔍 CHECK: Are all required fields collected?
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function missingField(d) {
    if (!d.machine_no || !/^\d{4,7}$/.test(d.machine_no)) return "machine_no";
    if (!d.complaint_title) return "complaint_title";
    if (!d.machine_status) return "machine_status";
    if (!d.city || !d.city_id) return "city";
    if (!d.customer_phone || !/^[6-9]\d{9}$/.test(d.customer_phone)) return "customer_phone";
    return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 SMART SILENCE HANDLER: Context-aware prompts based on what's missing
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getSmartSilencePrompt(callData, options = {}) {
    const d = callData.extractedData;
    const { ignoreLastQuestion = false } = options;
    
    // Check what's missing and ask for it specifically
    const missing = missingField(d);
    
    // If we have a stored last question, use it only when we explicitly want to repeat the previous prompt
    if (callData.lastQuestion && !ignoreLastQuestion) {
        return callData.lastQuestion;
    }
    
    // Use current state if present, because the state machine already decided the next question
    if (callData.currentState) {
        switch (callData.currentState) {
            case "COLLECT_MACHINE_NO":
                return getMachineNumberPrompt(callData.machineNumberAttempts);
            case "COLLECT_COMPLAINT":
                return "Machine mein kya problem hai? Bataiye.";
            case "COLLECT_STATUS":
                return "Machine bilkul band hai ya problem ke saath chal rahi hai?";
            case "COLLECT_CITY":
                return "Aap kaunse shahar mein hain? Jaipur, Kota, Ajmer, Udaipur?";
            case "COLLECT_PHONE":
                return "Aapka mobile number? 10 digit ka number bataiye.";
            case "ASK_CONFIRM":
                return "Sab details sahi hain? Haan boliye to complaint register ho jayegi.";
            default:
                break;
        }
    }

    // Otherwise, determine what to ask based on missing fields
    if (missing === "machine_no") {
        return getMachineNumberPrompt(callData.machineNumberAttempts);
    }
    if (missing === "complaint_title") {
        return "Machine mein kya problem hai? Bataiye.";
    }
    if (missing === "machine_status") {
        return "Machine bilkul band hai ya problem ke saath chal rahi hai?";
    }
    if (missing === "city") {
        return "Aap kaunse shahar mein hain? Jaipur, Kota, Ajmer, Udaipur?";
    }
    if (missing === "customer_phone") {
        return "Aapka mobile number? 10 digit ka number bataiye.";
    }
    
    // All fields collected, waiting for final confirmation
    return "Sab details sahi hain? Haan boliye to complaint register ho jayegi.";
}

function getMachineNumberPrompt(attempt = 0) {
    const prompts = [
        "Machine number bataiye.",
        "Kripya chassis number bolo, kam se kam 3 ank ka number.",
        "Machine ka number phir se batayein, sahi digits ke saath.",
        "Dobara batayein, machine number chahiye."
    ];
    return prompts[attempt % prompts.length];
}

function getUnknownInputPrompt(slot) {
    switch (slot) {
        case "machine_no":
            return "Mujhe machine number samajh nahi aaya, dobara batayein.";
        case "customer_phone":
            return "Mujhe aapka mobile number samajh nahi aaya, dobara bataiye.";
        case "city":
            return "Mujhe aapka shahar samajh nahi aaya, dobara boliye.";
        case "complaint_title":
            return "Mujhe problem samajh nahi aayi, thoda clearly bataiye.";
        case "machine_status":
            return "Kya machine band hai ya chal rahi hai? Dobara bataiye.";
        default:
            return "Mujhe samajh nahi aaya, dobara bataiye.";
    }
}

function isMachineNumberCandidate(text) {
    const digits = String(text || "").replace(/\D/g, "");
    return digits.length >= 3;
}

async function handleSideQuestion(input, callData) {
    const faqResult = searchFAQ(input);
    if (faqResult) {
        return { answer: faqResult.answer, source: "faq" };
    }

    const answer = await answerSideQuestion(input, callData);
    if (answer) {
        return { answer, source: "ai" };
    }

    return { answer: null, source: null };
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 STATE MACHINE: Determine next state based on current data
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getNextState(callData) {
    const d = callData.extractedData;
    
    // If we have all required data, ask for confirmation
    if (d.machine_no && d.complaint_title && d.machine_status && d.city && d.city_id && d.customer_phone) {
        return { state: "ASK_CONFIRM", slot: "confirmation" };
    }
    
    // Determine next missing field in priority order
    if (!d.machine_no) {
        return { state: "COLLECT_MACHINE_NO", slot: "machine_no" };
    }
    if (!d.complaint_title) {
        return { state: "COLLECT_COMPLAINT", slot: "complaint_title" };
    }
    if (!d.machine_status) {
        return { state: "COLLECT_STATUS", slot: "machine_status" };
    }
    if (!d.city || !d.city_id) {
        return { state: "COLLECT_CITY", slot: "city" };
    }
    if (!d.customer_phone) {
        return { state: "COLLECT_PHONE", slot: "customer_phone" };
    }
    
    // Fallback
    return { state: "COLLECT_MACHINE_NO", slot: "machine_no" };
}

function parsePhoneFromText(text) {
    const extracted = extractAllData(text, { customer_phone: null });
    if (extracted.customer_phone) return extracted.customer_phone;
    const compact = text.replace(/[\s\-,।\.]/g, "");
    const digits = compact.replace(/[^0-9]/g, "");
    if (/^[6-9]\d{9}$/.test(digits)) return digits;
    if (digits.length >= 10) {
        const candidate = digits.slice(-10);
        if (/^[6-9]\d{9}$/.test(candidate)) return candidate;
    }
    return null;
}

function isPositiveConfirmation(text) {
    // English + Transliterated + Devanagari script variants
    return /(\b(haan|ha|han|theek hai|thik hai|save|kar do|register|done|yes|bilkul|sahi hai|ok|okay|theek|chalo|hmm|yahi|yehi|yehi hai|ha|rakhna|yehi rakhna|yehi rakh|rakh|karna)\b|हां|हा|ठीक|ठीक है|यही|येही|येही है|रख|कर|बिलकुल)/i.test(text);
}

function isNegativeConfirmation(text) {
    // English + Transliterated + Devanagari script variants
    return /(\b(nahi|nai|nahin|no|mat|band kar|ruk ja|ruk jai|ruk|nahin chahiye|don't|dont|nhi|galat|wrong)\b|नहीं|न|मत|गलत|बंद)/i.test(text);
}

function isAddMoreProblem(text) {
    return /(\b(aur (problem|complaint|issue|koi aur|bhi)|additional|extra|dusri|phir se complaint|another complaint|aur kuch)\b)/i.test(text) && !isNegativeConfirmation(text);
}

function formatNumberForTTS(number) {
    return String(number).split("").join(" ");
}

function isClarificationQuestion(text) {
    return /(\b(kya|kaun|kab|kaise|kitna|kitne|kahan|kaunse|kis|naam|phone|number|engineer|wait|der|time)\b)/i.test(text)
        && !isPositiveConfirmation(text)
        && !isNegativeConfirmation(text)
        && !isAddMoreProblem(text);
}

async function answerSideQuestion(text, callData) {
    const lo = text.toLowerCase();
    const isSide = callData.intent === 'side_question' || isClarificationQuestion(text);
    if (!isSide) return null;

    const prompt = `Customer asked: "${text}"

You are a helpful JCB service agent.

Rules:
- Answer clearly in Hinglish
- Keep it short (1-2 lines)
- If needed, guide user back to the complaint process

Context:
- Machine number: ${callData.extractedData.machine_no || "not provided"}

Example:
Q: "कितना में देखने वाली?"
A: "Inspection free hota hai 🙂 Machine number bata dijiye."

Now answer:`;

    const aiAnswer = await getAIResponse(prompt);
    if (aiAnswer) return aiAnswer;

    if (/नाम|तुम्हारा नाम|आप कौन|आप कौन सी/i.test(lo)) {
        return 'Main Priya hoon, Rajesh Motors se. Machine number bataiye.';
    }
    if (/क्यों|क्यों चाहिए|इसी नंबर|same number|वही नंबर/i.test(lo)) {
        return 'Ji, wahi number use karein. Machine number bataiye.';
    }
    if (/कितना|किराया|price|charge|cost|दर|रु[p₹]/i.test(lo)) {
        return 'Service cost machine par nirbhar karegi. Machine number bataiye.';
    }
    if (/wait|इंतजार|रुको|hold on|thoda ruk/i.test(lo)) {
        return 'Thoda ruk jaiye. Machine number bataiye.';
    }
    if (/कब|kab|jab|when|time|समय/i.test(lo)) {
        return 'Engineer jaldi aayega. Ab machine number bataiye.';
    }

    return null;
}

function titleCaseWord(word) {
    if (!word) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function normalizeSpeechText(text) {
    if (!text) return text;
    let normalized = String(text).trim();

    // Collapse spelled-out letter sequences like "P R A J A P A T I" -> "PRAJAPATI"
    normalized = normalized.replace(/\b([A-Za-z])(?:[\s,]+([A-Za-z])){2,}\b/g, match => match.replace(/[\s,]+/g, ""));

    // Convert full uppercase words to title case, preserving known acronyms
    normalized = normalized.replace(/\b([A-Z]{2,})\b/g, match => {
        const preserve = new Set(["JCB", "AI", "TTS", "URL", "HTTP", "API"]);
        if (preserve.has(match)) return match;
        return match.split(" ").map(titleCaseWord).join(" ");
    });

    return normalized;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔊 ENHANCED TTS WITH CARTESIA + GOOGLE FALLBACK
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TTS_VOICE = "Google.hi-IN-Standard-A";  // Fallback voice
const TTS_LANG = "hi-IN";

/**
 * Enhanced speak function with Cartesia TTS + Google fallback
 * @param {Object} twiml - Twilio TwiML object
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 */
async function speak(twiml, text, options = {}) {
    const ttsStartTime = performanceLogger.getHighResTime();
    let ttsService = 'Google TTS';
    let voice = TTS_VOICE;
    let success = false;
    let error = null;
    
    try {
        // Format numbers for better pronunciation
        const numbersFormattedText = formatNumbersForTTS(text);
        const formattedText = normalizeSpeechText(numbersFormattedText);
        
        // Detect emotion and context automatically
        const { emotion, context } = detectEmotionAndContext(formattedText);
        
        console.log(`🎤 [TTS] Text: "${formattedText}" | Emotion: ${emotion} | Context: ${context}`);
        
        // Try Cartesia TTS first
        const cartesiaResult = await generateSpeech(formattedText, {
            emotion: options.emotion || emotion,
            context: options.context || context,
            speed: options.speed || 1.0,
            callSid: options.callSid
        });
        
        const ttsEndTime = performanceLogger.getHighResTime();
        
        if (cartesiaResult && cartesiaResult.success) {
            // Success with Cartesia - use high-quality neural voice
            ttsService = 'Cartesia';
            voice = 'Arushi-Hindi';
            success = true;
            console.log(`✅ [TTS] Using Cartesia Sonic 3 (${cartesiaResult.wavAudio.length} bytes)`);
            console.log(`🎵 [TTS] Audio ID: ${cartesiaResult.audioId}`);
            console.log(`⏱️  [TTS] Duration: ${cartesiaResult.duration.toFixed(2)}s`);
            
            // Log TTS performance timing
            performanceLogger.logTTS(
                options.callSid,
                ttsStartTime,
                ttsEndTime,
                cartesiaResult.wavAudio.length,
                cartesiaResult.metadata.cost,
                'Cartesia'
            );
            
            // Use Cartesia audio streaming instead of Google TTS
            const audioStreamUrl = `${process.env.PUBLIC_URL}/stream-audio/${cartesiaResult.audioId}`;
            console.log(`🔗 [TTS] Stream URL: ${audioStreamUrl}`);
            
            // Create Twilio gather with speech recognition
            const gather = twiml.gather({
                input: "speech dtmf",
                language: TTS_LANG,
                speechTimeout: "auto",
                timeout: 8,
                maxSpeechTime: 20,
                actionOnEmptyResult: true,
                action: options.action || "/voice/process",
                method: "POST",
                enhanced: true,
                speechModel: "phone_call",
                hints: "haan,nahi,theek hai,sahi hai,dhanyavaad,machine,number,phone,chassis,city,Jaipur,Kota,Ajmer,Udaipur,Bhilwara"
            });
            
            // Play Cartesia audio instead of using Google TTS
            gather.play(audioStreamUrl);
            
            // Fallback message if user doesn't respond
            twiml.redirect(options.redirect || "/voice/process");
            
            return twiml.toString();
        }
        
        // Fallback to Google TTS if Cartesia fails
        console.log(`⚠️  [TTS] Cartesia failed, falling back to Google TTS`);
        console.log(`   Error: ${cartesiaResult?.error || 'Unknown error'}`);
        
        // Log failed Cartesia TTS timing
        performanceLogger.logTTS(
            options.callSid,
            ttsStartTime,
            ttsEndTime,
            0,
            0,
            'Cartesia',
            cartesiaResult?.error || 'Unknown error'
        );
        // Create Twilio gather with speech recognition
        const gather = twiml.gather({
            input: "speech dtmf",
            language: TTS_LANG,
            speechTimeout: "auto",
            timeout: 8,
            maxSpeechTime: 20,
            actionOnEmptyResult: true,
            action: "/voice/process",
            method: "POST",
            enhanced: true,
            speechModel: "phone_call",
            hints: "0,1,2,3,4,5,6,7,8,9,ek,do,teen,char,paanch,chhe,saat,aath,nau,shunya,machine,number,chassis,complaint,problem,band,khadi,chal,rahi,tel,nikal,garam,dhak,filter,service,Bhilwara,Jaipur,Kota,Ajmer,Udaipur,Alwar,Sikar,Bikaner,Jodhpur,Tonk,Dausa,Bharatpur,Dholpur,Karauli,Nagaur,Pali,Barmer,Chittorgarh,Bundi,Jhalawar,Rajsamand,Dungarpur,Banswara,Pratapgarh,Sirohi,Jalor,Churu,Hanumangarh,Ganganagar,haan,nahi,theek,bilkul,save,register,engineer,jaldi,aayega",
            profanityFilter: false,
            bargeIn: false,
        });
        
        // Use Google TTS as the actual voice (Cartesia would need custom audio streaming)
        gather.say({ voice: TTS_VOICE, language: TTS_LANG }, formattedText);
        
        if (!cartesiaAudio) {
            // Log Google TTS fallback usage
            const latency = Date.now() - startTime;
            const cost = calculateTTSCost(formattedText.length, 'google');
            
            if (options.callSid) {
                serviceLogger.logTTS(
                    options.callSid,
                    'Google TTS',
                    TTS_VOICE,
                    formattedText,
                    Buffer.from('mock-audio'), // Mock audio data
                    {
                        latency,
                        cost,
                        emotion: options.emotion || emotion,
                        context: options.context || context,
                        success: true
                    }
                );
            }
            
            console.log(`🔄 [TTS] Using Google TTS fallback`);
        }
        
    } catch (err) {
        error = err.message;
        console.error(`❌ [TTS] Error in speak function:`, error);
        
        // Log TTS error
        if (options.callSid) {
            const latency = Date.now() - startTime;
            serviceLogger.logTTS(
                options.callSid,
                ttsService,
                voice,
                text,
                null,
                {
                    latency,
                    cost: 0,
                    emotion: options.emotion || 'professional',
                    context: options.context || 'general',
                    success: false,
                    error: error
                }
            );
        }
        
        // Emergency fallback - basic Google TTS
        const gather = twiml.gather({
            input: "speech dtmf",
            language: TTS_LANG,
            speechTimeout: "auto",
            timeout: 8,
            maxSpeechTime: 20,
            actionOnEmptyResult: true,
            action: "/voice/process",
            method: "POST",
            enhanced: true,
            speechModel: "phone_call",
            hints: "0,1,2,3,4,5,6,7,8,9,ek,do,teen,char,paanch,chhe,saat,aath,nau,shunya,machine,number,chassis,complaint,problem,band,khadi,chal,rahi,tel,nikal,garam,dhak,filter,service,Bhilwara,Jaipur,Kota,Ajmer,Udaipur,Alwar,Sikar,Bikaner,Jodhpur,Tonk,Dausa,Bharatpur,Dholpur,Karauli,Nagaur,Pali,Barmer,Chittorgarh,Bundi,Jhalawar,Rajsamand,Dungarpur,Banswara,Pratapgarh,Sirohi,Jalor,Churu,Hanumangarh,Ganganagar,haan,nahi,theek,bilkul,save,register,engineer,jaldi,aayega",
            profanityFilter: false,
            bargeIn: false,
        });
        gather.say({ voice: TTS_VOICE, language: TTS_LANG }, text);
    }
}

/**
 * Calculate TTS cost (shared function)
 */
function calculateTTSCost(characterCount, service) {
    const pricing = {
        'cartesia': 0.00003,    // $0.03 per 1000 characters
        'google': 0.000016,     // $0.016 per 1000 characters
        'azure': 0.000016,      // $0.016 per 1000 characters
        'elevenlabs': 0.00018   // $0.18 per 1000 characters
    };
    
    const pricePerChar = pricing[service] || 0;
    const costUSD = characterCount * pricePerChar;
    const costINR = costUSD * 83; // Rough USD to INR conversion
    
    return costINR;
}

/**
 * Enhanced sayFinal function with Cartesia TTS + Google fallback
 * @param {Object} twiml - Twilio TwiML object
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 */
async function sayFinal(twiml, text, options = {}) {
    const startTime = Date.now();
    let ttsService = 'Google TTS';
    let voice = TTS_VOICE;
    let error = null;
    
    try {
        // Format numbers for better pronunciation
        const formattedText = formatNumbersForTTS(text);
        
        // Detect emotion and context automatically
        const { emotion, context } = detectEmotionAndContext(formattedText);
        
        console.log(`🎤 [TTS Final] Text: "${formattedText}" | Emotion: ${emotion} | Context: ${context}`);
        
        // Try Cartesia TTS first
        const cartesiaResult = await generateSpeech(formattedText, {
            emotion: options.emotion || emotion,
            context: options.context || context,
            speed: options.speed || 1.0,
            callSid: options.callSid
        });
        
        if (cartesiaResult && cartesiaResult.success) {
            ttsService = 'Cartesia';
            voice = 'Arushi-Hindi';
            console.log(`✅ [TTS Final] Using Cartesia Sonic 3 (${cartesiaResult.wavAudio.length} bytes)`);
            console.log(`🎵 [TTS Final] Audio ID: ${cartesiaResult.audioId}`);
            console.log(`⏱️  [TTS Final] Duration: ${cartesiaResult.duration.toFixed(2)}s`);
            
            // Play Cartesia audio directly
            const audioStreamUrl = `${process.env.PUBLIC_URL}/stream-audio/${cartesiaResult.audioId}`;
            console.log(`🔗 [TTS Final] Stream URL: ${audioStreamUrl}`);
            twiml.play(audioStreamUrl);
        } else {
            // Fallback to Google TTS
            console.log(`⚠️  [TTS Final] Cartesia failed, using Google TTS fallback`);
            console.log(`   Error: ${cartesiaResult?.error || 'Unknown error'}`);
            
            // Log Google TTS fallback usage
            const latency = Date.now() - startTime;
            const cost = calculateTTSCost(formattedText.length, 'google');
            
            if (options.callSid) {
                serviceLogger.logTTS(
                    options.callSid,
                    'Google TTS',
                    TTS_VOICE,
                    formattedText,
                    Buffer.from('mock-audio'), // Mock audio data
                    {
                        latency,
                        cost,
                        emotion: options.emotion || emotion,
                        context: options.context || context,
                        success: true
                    }
                );
            }
            
            console.log(`🔄 [TTS Final] Cartesia failed, using Google TTS fallback`);
            twiml.say({ voice: TTS_VOICE, language: TTS_LANG }, formattedText);
        }
        
    } catch (err) {
        error = err.message;
        console.error(`❌ [TTS Final] Error:`, error);
        
        // Log TTS error
        if (options.callSid) {
            const latency = Date.now() - startTime;
            serviceLogger.logTTS(
                options.callSid,
                ttsService,
                voice,
                text,
                null,
                {
                    latency,
                    cost: 0,
                    emotion: options.emotion || 'professional',
                    context: options.context || 'general',
                    success: false,
                    error: error
                }
            );
        }
        
        // Emergency fallback - use Google TTS
        console.log(`🚨 [TTS Final] Emergency fallback to Google TTS`);
        twiml.say({ voice: TTS_VOICE, language: TTS_LANG }, text);
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📞 INITIAL CALL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/", async (req, res) => {
    const { CallSid, From } = req.body;
    const { machine_no: preloadedMachineNo } = req.query;
    const callerPhone = From?.replace(/^\+91/, "").replace(/^\+/, "").slice(-10) || "";

    console.log(`\n${"═".repeat(60)}`);
    console.log(`📞 [NEW CALL] ${CallSid} | ${callerPhone} | machine:${preloadedMachineNo || "—"}`);

    // Initialize service logging session
    serviceLogger.initSession(CallSid, callerPhone);
    
    // Initialize performance logging session
    performanceLogger.initSession(CallSid, callerPhone);

    const twiml = new VoiceResponse();
    try {
        const callData = {
            callSid: CallSid,
            callingNumber: callerPhone,
            messages: [],
            extractedData: {
                machine_no: preloadedMachineNo || null,
                customer_name: null,
                customer_phone: null,
                city: null, city_id: null, branch: null, outlet: null,
                lat: null, lng: null,
                complaint_title: null,
                complaint_subtitle: null,
                machine_status: null,
                job_location: null,
                complaint_details: "",
                machine_location_address: null,
            },
            customerData: null,
            turnCount: 0,
            silenceCount: 0,
            pendingPhoneConfirm: false,
            awaitingPhoneConfirm: false,
            machineNotFoundCount: 0,
            awaitingComplaintAction: false,
            existingComplaintId: null,
            awaitingFinalConfirm: false,
            awaitingAlternatePhone: false,
            cityConfirmed: false,
            pendingCityConfirm: false,
            // Simple retry logic for machine number
            machineNumberAttempts: 0,     // 0, 1, 2 (max 3 attempts)
            // Track conversation state
            lastQuestion: null,           // Last question asked to user
            lastAIResponse: null,         // Last AI response for debugging
        };

        // Phone-based pre-lookup (silent)
        // COMMENTED OUT: This was causing 1-2 second delay on call pickup
        // if (callerPhone) {
        //     const pr = await findMachineByPhone(callerPhone);
        //     if (pr.valid) {
        //         callData._phoneData = pr.data;
        //         console.log(`   📱 Phone lookup: ${pr.data.name}`);
        //     }
        // }

        // Preloaded machine number validation
        if (preloadedMachineNo) {
            const v = await validateMachineNumber(preloadedMachineNo);
            if (v.valid) {
                callData.customerData = v.data;
                callData.extractedData.machine_no = v.data.machineNo;
                callData.extractedData.customer_name = v.data.name;
                callData.pendingPhoneConfirm = true;
            } else {
                callData.extractedData.machine_no = null;
            }
        }

        activeCalls.set(CallSid, callData);

        const knownName = callData.customerData?.name || callData.extractedData.customer_name || null;
        const greetingName = knownName
            ? normalizeSpeechText(knownName.split(" ")[0])
            : null;
        const greeting = greetingName
            ? `Namaste ${greetingName}, kya problem hai?`
            : "Namaste, Rajesh Motors. Machine number bataiye.";

        callData.lastQuestion = greeting;  // Track the question
        await speak(twiml, greeting, { context: 'greeting', emotion: 'friendly', callSid: CallSid });
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [START]", err.message);
        await sayFinal(twiml, "Thodi problem aa gayi ji. Thodi der baad call karein.", { emotion: 'empathetic', callSid: CallSid });
        twiml.hangup();
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗣️ PROCESS USER INPUT
   
   ARCHITECTURE: LLM-FIRST with Hardcoded Fallback
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   Flow:
   1. Extract user input (prioritize DTMF over speech)
   2. Run regex extraction for quick data capture
   3. Handle specific state flags (phone confirm, city confirm, etc.)
      - These use hardcoded prompts for reliability
      - Early return to prevent AI from overriding
   4. If no state flag active → LLM-FIRST approach:
      - Pass full context to AI (conversation history, state, validation results)
      - Let AI decide what to say
      - Validate AI response quality
      - If AI fails → Use hardcoded fallback prompt
   5. Merge AI-extracted data with existing data
   6. Send response to user
   
   Benefits:
   - Natural conversation (AI handles most cases)
   - Reliable fallback (hardcoded prompts when AI fails)
   - No repetition (early returns prevent duplicate questions)
   - Context-aware (AI sees full conversation history)
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/process", async (req, res) => {
    const { CallSid, SpeechResult, Digits } = req.body;
    const twiml = new VoiceResponse();

    try {
        const callData = activeCalls.get(CallSid);
        if (!callData) {
            sayFinal(twiml, "Dobara call karein ji.");
            twiml.hangup();
            return res.type("text/xml").send(twiml.toString());
        }

        // Ensure callSid is available on session data
        callData.callSid = CallSid;
        callData.CallSid = CallSid;

        // Start turn timing
        const turnStartTime = performanceLogger.getHighResTime();
        const turnNumber = callData.turnCount + 1;
        performanceLogger.startTurn(CallSid, turnNumber, { 
            inputMethod: Digits ? "DTMF" : (SpeechResult ? "SPEECH" : "SILENCE"),
            hasDigits: !!Digits,
            hasSpeech: !!SpeechResult
        });

        // Prioritize DTMF (keypad) over speech - DTMF is 100% accurate
        const userInput = Digits || SpeechResult?.trim() || "";
        const inputMethod = Digits ? "DTMF" : (SpeechResult ? "SPEECH" : "SILENCE");
        callData.turnCount++;
        const lo = userInput.toLowerCase();

        // Log STT timing and usage
        const sttStartTime = turnStartTime; // STT processing happened before this handler
        const sttEndTime = performanceLogger.getHighResTime();
        
        if (SpeechResult) {
            // Log STT usage (Twilio's speech recognition)
            serviceLogger.logSTT(
                CallSid,
                'Twilio',
                null, // No audio input data available
                SpeechResult,
                {
                    duration: 0, // Not available from Twilio
                    confidence: 0.8, // Estimated confidence
                    latency: 0, // Not available
                    cost: 0 // Included in Twilio call cost
                }
            );
            
            // Log STT performance timing
            performanceLogger.logSTT(
                CallSid,
                sttStartTime,
                sttEndTime,
                SpeechResult,
                0.8 // Estimated confidence
            );
        }

        console.log(`\n${"─".repeat(60)}`);
        console.log(`🔄 [TURN ${callData.turnCount}] [${inputMethod}]`);
        if (Digits) {
            console.log(`   ⌨️  DTMF Input: "${Digits}"`);
        } else if (SpeechResult) {
            console.log(`   🎤 Speech Input: "${SpeechResult}"`);
        } else {
            console.log(`   🔇 Silence detected`);
        }
        console.log(`   📊 State: machine=${callData.extractedData.machine_no || "❌"} | attempts=${callData.machineNumberAttempts || 0}`);

        // Hard turn limit
        if (callData.turnCount > 25) {
            console.log(`   ⚠️  Turn limit reached (25) - ending call`);
            serviceLogger.endSession(CallSid, 'turn_limit');
            await sayFinal(twiml, "Engineer ko message kar diya ji. Dhanyavaad!", { context: 'farewell', emotion: 'professional', callSid: CallSid });
            twiml.hangup();
            performanceLogger.endSession(CallSid, 'completed');
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        // ── Silence handling (SMART: asks for what's missing) ────────────────────────────────────────
        if (!userInput || userInput.length < 2) {
            callData.silenceCount++;
            const hasData = !!(callData.customerData || callData.extractedData.machine_no);
            const maxSilence = hasData ? 5 : 3;
            
            // Log silence timing (estimate 5 seconds per silence timeout)
            const silenceDuration = 5000; // 5 seconds timeout
            performanceLogger.logSilence(CallSid, silenceDuration, 'timeout');
            
            console.log(`   🔇 Silence count: ${callData.silenceCount}/${maxSilence}`);
            
            if (callData.silenceCount >= maxSilence) {
                console.log(`   ⚠️  Max silence reached - ending call`);
                serviceLogger.endSession(CallSid, 'silence_timeout');
                performanceLogger.endSession(CallSid, 'silence_timeout');
                await sayFinal(twiml, "Awaaz nahi aa rahi. Dobara call kijiye.", { emotion: 'professional', callSid: CallSid });
                twiml.hangup();
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }
            
            // Use smart prompt based on what's missing
            const smartPrompt = getSmartSilencePrompt(callData);
            console.log(`   💬 Smart prompt: "${smartPrompt}"`);
            
            callData.lastQuestion = smartPrompt;
            await speak(twiml, smartPrompt, { emotion: 'professional', callSid: CallSid });
            activeCalls.set(CallSid, callData);
            return res.type("text/xml").send(twiml.toString());
        }
        callData.silenceCount = 0;
        console.log(`   ✅ Valid input received - processing`);

        callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });
        console.log(`   📝 User message logged to conversation history`);

        // ── STEP 0: Check FAQ first (before any processing) ─────────────────
        const faqResult = searchFAQ(userInput);
        if (faqResult) {
            console.log(`   📚 FAQ matched: ${faqResult.faqId} - returning instantly`);
            callData.messages.push({ role: "assistant", text: faqResult.answer, timestamp: new Date() });
            activeCalls.set(CallSid, callData);
            await speak(twiml, faqResult.answer, { emotion: 'professional', callSid: CallSid });
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 1: Fast regex extraction + AI entity extraction ───────────────────────────
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // Extract data from user input using regex first
        const rxData = extractAllData(userInput, callData.extractedData);
        for (const [k, v] of Object.entries(rxData)) {
            if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
        }

        // Extract additional entities and intent using AI
        const entityExtractionStart = performanceLogger.getHighResTime();
        const aiExtraction = await extractEntities(userInput, callData);
        const entityExtractionEnd = performanceLogger.getHighResTime();
        performanceLogger.logLLM(
            CallSid,
            entityExtractionStart,
            entityExtractionEnd,
            aiExtraction.tokens || 0,
            aiExtraction.cost || 0,
            aiExtraction.error || null
        );

        if (aiExtraction.intent) {
            callData.intent = aiExtraction.intent;
            callData.confirm_type = aiExtraction.confirm_type;
        }
        if (aiExtraction.entities) {
            for (const [k, v] of Object.entries(aiExtraction.entities)) {
                if (v && !callData.extractedData[k]) {
                    callData.extractedData[k] = v;
                    console.log(`   🧠 AI extracted ${k}: "${v}"`);
                }
            }
        }

        const isSideIntent = callData.intent === 'side_question' || callData.intent === 'ask_clarification' || isClarificationQuestion(userInput);
        if (isSideIntent) {
            const sideResult = await handleSideQuestion(userInput, callData);
            if (sideResult.answer) {
                console.log(`   💡 Intent-first side question handled (${sideResult.source})`);
                const nextPrompt = getSmartSilencePrompt(callData, { ignoreLastQuestion: true });
                const responseText = `${sideResult.answer} ${nextPrompt}`.trim();
                callData.lastQuestion = responseText;
                callData.messages.push({ role: 'assistant', text: responseText, timestamp: new Date() });
                activeCalls.set(CallSid, callData);
                await speak(twiml, responseText, { emotion: 'professional', callSid: CallSid });
                return res.type('text/xml').send(twiml.toString());
            }
        }

        const nextState = getNextState(callData);
        callData.currentState = nextState.state;
        callData.expectedSlot = nextState.slot;
        console.log(`   🎯 Next state: ${nextState.state} (slot=${nextState.slot})`);

        // ── Multi-complaint accumulation ────────────────────────────
        const allFoundComplaints = extractAllComplaintTitles(userInput);
        if (allFoundComplaints.length > 0) {
            if (!callData.extractedData.complaint_title) {
                callData.extractedData.complaint_title = allFoundComplaints[0];
            }
            const existingDetails = callData.extractedData.complaint_details
                ? callData.extractedData.complaint_details.split('; ').map(s => s.trim()).filter(Boolean)
                : [];
            const alreadyHave = new Set([callData.extractedData.complaint_title, ...existingDetails]);
            const newOnes = allFoundComplaints.filter(c => !alreadyHave.has(c));
            if (newOnes.length > 0) {
                callData.extractedData.complaint_details = [...existingDetails, ...newOnes].join('; ');
                console.log(`   📝 Multi-complaints: ${callData.extractedData.complaint_title} + [${newOnes.join(', ')}]`);
            }
        }

        // ── STEP 2: City match ──────────────────────────────────────
        if (callData.extractedData.city && !callData.extractedData.city_id) {
            const mc = matchServiceCenter(callData.extractedData.city);
            if (mc) {
                callData.extractedData.city = mc.city_name;
                callData.extractedData.city_id = mc.branch_code;
                callData.extractedData.branch = mc.branch_name;
                callData.extractedData.outlet = mc.city_name;
                callData.extractedData.lat = mc.lat;
                callData.extractedData.lng = mc.lng;
                if (!callData.cityConfirmed) {
                    callData.pendingCityConfirm = true;
                }
                console.log(`   🗺️  ${mc.city_name} → ${mc.branch_name}`);
            }
        }

        // ── STEP 3: machine_status is now collected by AI question ───
        // No auto-guessing — AI asks "Machine bilkul band hai ya problem ke saath chal rahi hai?"

        // ── STEP 4: Machine number lookup with simple 2-try + DTMF fallback ───────────────────────────
        // First check if user said they don't know the machine number
        const dontKnowPatterns = /(pata nahi|nahi pata|don't know|unknown|nahi malum|nahi pata hai|malum nahi|yaad nahi|bhool gaya|forgot|forget)/i;
        if (!callData.customerData && !callData.extractedData.machine_no && dontKnowPatterns.test(userInput)) {
            console.log(`   ❓ User doesn't know machine number - offering phone lookup alternative`);
            // Try to find machine by phone number
            if (callData.callingNumber) {
                const phoneLookup = await findMachineByPhone(callData.callingNumber);
                if (phoneLookup.valid) {
                    callData.customerData = phoneLookup.data;
                    callData.extractedData.machine_no = phoneLookup.data.machineNo;
                    callData.extractedData.customer_name = phoneLookup.data.name;
                    callData.pendingPhoneConfirm = true;
                    console.log(`   ✅ Found machine by phone: ${phoneLookup.data.machineNo} for ${phoneLookup.data.name}`);
                } else {
                    // Ask for phone number as alternative
                    callData.askForPhoneInstead = true;
                    const prompt = "Koi baat nahi ji. Aapka mobile number bataiye, usse machine ka pata chal jayega.";
                    callData.lastQuestion = prompt;
                    activeCalls.set(CallSid, callData);
                    await speak(twiml, prompt, { emotion: 'empathetic' });
                    return res.type("text/xml").send(twiml.toString());
                }
            } else {
                // Ask for phone number
                callData.askForPhoneInstead = true;
                const prompt = "Koi baat nahi ji. Aapka mobile number bataiye, usse machine ka pata chal jayega.";
                callData.lastQuestion = prompt;
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'empathetic' });
                return res.type("text/xml").send(twiml.toString());
            }
        }

        if (!callData.customerData && callData.extractedData.machine_no) {
            // Check if extracted "machine number" looks like a phone number (10 digits)
            if (/^[6-9]\d{9}$/.test(callData.extractedData.machine_no)) {
                console.log(`   📱 Detected phone number instead of chassis: ${callData.extractedData.machine_no}`);
                // Try to find machine by this phone number
                const phoneLookup = await findMachineByPhone(callData.extractedData.machine_no);
                if (phoneLookup.valid) {
                    callData.customerData = phoneLookup.data;
                    callData.extractedData.machine_no = phoneLookup.data.machineNo;
                    callData.extractedData.customer_name = phoneLookup.data.name;
                    callData.extractedData.customer_phone = phoneLookup.data.phone;
                    callData.pendingPhoneConfirm = true;
                    console.log(`   ✅ Found machine by provided phone: ${phoneLookup.data.machineNo}`);
                } else {
                    const prompt = "Ye phone number se machine nahi mili ji. Chassis number bataiye.";
                    callData.lastQuestion = prompt;
                    callData.extractedData.machine_no = null; // Clear the phone number
                    activeCalls.set(CallSid, callData);
                    await speak(twiml, prompt, { emotion: 'professional' });
                    return res.type("text/xml").send(twiml.toString());
                }
            } else if (!isMachineNumberCandidate(callData.extractedData.machine_no)) {
                callData.machineNumberAttempts++;
                const prompt = getUnknownInputPrompt("machine_no");
                callData.lastQuestion = prompt;
                callData.extractedData.machine_no = null;
                console.warn(`   ❌ Machine number input invalid - ${prompt}`);
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional', callSid: CallSid });
                return res.type("text/xml").send(twiml.toString());
            } else {
                console.log(`   🔍 Validating machine number: ${callData.extractedData.machine_no}`);
                const v = await validateMachineNumber(callData.extractedData.machine_no);
                if (v.valid) {
                    callData.customerData = v.data;
                    callData.extractedData.customer_name = v.data.name;
                    callData.pendingPhoneConfirm = true;
                    callData.machineNumberAttempts = 0; // Reset on success
                    console.log(`   ✅ Machine validated: ${v.data.name} | ${v.data.city} | ${v.data.model}`);
                } else {
                    callData.machineNumberAttempts++;
                    callData.extractedData.machine_no = null;
                    console.warn(`   ❌ Machine validation failed (attempt ${callData.machineNumberAttempts}/3)`);

                    // Attempt 1: Try again with speech (simple prompt)
                    if (callData.machineNumberAttempts === 1) {
                        const prompt = "Number sahi nahi mila. Dobara bataiye.";
                        console.log(`   🔄 Retry attempt 1 - asking for speech input again`);
                        callData.lastQuestion = prompt;
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, prompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    }

                    // Attempt 2: DTMF ONLY - No more speech input
                    if (callData.machineNumberAttempts === 2) {
                        const prompt = "Kripya apne phone ke button dabaye - machine number type karein.";
                        console.log(`   ⌨️  Retry attempt 2 - DTMF ONLY (no more speech)`);
                        callData.lastQuestion = prompt;
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, prompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    }

                    // Attempt 3+: Give up and escalate
                    if (callData.machineNumberAttempts >= 3) {
                        console.log(`   ⛔ Max attempts reached (3) - escalating to engineer`);
                        await sayFinal(twiml, "Machine number nahi mil raha ji. Engineer ko message bhej deta hun. Dhanyavaad!", { context: 'farewell', emotion: 'empathetic' });
                        twiml.hangup();
                        performanceLogger.endSession(CallSid, 'machine_not_found');
                        activeCalls.delete(CallSid);
                        return res.type("text/xml").send(twiml.toString());
                    }
                }
            }
        }

        // ── STEP 5: Handle phone number input when asked for phone instead of chassis ──────────────────
        if (callData.askForPhoneInstead && !callData.customerData) {
            console.log(`   📞 Processing phone number input: ${userInput}`);
            // Extract phone number from user input
            const phoneMatch = userInput.match(/(\d{10})/);
            if (phoneMatch) {
                const phoneNumber = phoneMatch[1];
                console.log(`   🔍 Looking up machine by phone: ${phoneNumber}`);
                const phoneLookup = await findMachineByPhone(phoneNumber);
                if (phoneLookup.valid) {
                    callData.customerData = phoneLookup.data;
                    callData.extractedData.machine_no = phoneLookup.data.machineNo;
                    callData.extractedData.customer_name = phoneLookup.data.name;
                    callData.extractedData.customer_phone = phoneLookup.data.phone;
                    callData.pendingPhoneConfirm = true;
                    callData.askForPhoneInstead = false; // Reset flag
                    console.log(`   ✅ Found machine by phone: ${phoneLookup.data.machineNo} for ${phoneLookup.data.name}`);
                } else {
                    const prompt = "Ye phone number se machine nahi mili ji. Chassis number bataiye.";
                    callData.lastQuestion = prompt;
                    callData.askForPhoneInstead = false; // Reset flag
                    activeCalls.set(CallSid, callData);
                    await speak(twiml, prompt, { emotion: 'professional' });
                    return res.type("text/xml").send(twiml.toString());
                }
            } else {
                const prompt = "Phone number sahi se bataiye ji, 10 digit ka.";
                callData.lastQuestion = prompt;
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional' });
                return res.type("text/xml").send(twiml.toString());
            }
        }

        // ── STEP 6: Phone confirm prompt (one-time) ─────────────────
        // Shows last 2 digits of registered phone + "tumhare phone mein"
        if (callData.pendingPhoneConfirm && callData.customerData?.phone) {
            const ph = String(callData.customerData.phone);
            const lastTwo = ph.slice(-2);
            callData.pendingPhoneConfirm = false;
            callData.awaitingPhoneConfirm = true;
            const nameCandidate = callData.customerData?.name || callData.extractedData.customer_name || "";
            const promptName = nameCandidate ? normalizeSpeechText(nameCandidate.split(" ")[0]) : "Ji";
            const prompt = `${promptName}, kya aapka yehi number save karna hai jisme last mein ${lastTwo} aata hai, ya change karna hai?`;
            callData.lastQuestion = prompt;
            console.log(`   📞 Phone confirmation prompt - asking about number ending in ${lastTwo}`);
            activeCalls.set(CallSid, callData);
            await speak(twiml, prompt, { emotion: 'professional', callSid: CallSid });
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 7: Handle phone confirm answer ─────────────────────
        if (callData.awaitingPhoneConfirm) {
            callData.awaitingPhoneConfirm = false;
            const foundPhone = parsePhoneFromText(userInput);
            const isPositive = isPositiveConfirmation(userInput);  // Checks for haan, yes, save, bilkul, etc.
            const isNegative = isNegativeConfirmation(userInput);  // Checks for nahi, no, change, etc.
            
            if (foundPhone) {
                callData.extractedData.customer_phone = foundPhone;
                console.log(`   ✅ Phone changed by direct input: ${foundPhone}`);
            } else if (isPositive) {
                // User said YES/HAAN/SAVE - confirm the registered phone
                if (callData.customerData?.phone) {
                    callData.extractedData.customer_phone = callData.customerData.phone;
                    callData.lastQuestion = null; // Clear stale prompt so next missing field is asked
                    console.log(`   ✅ Phone confirmed (positive affirmation): ${callData.customerData.phone}`);
                } else {
                    console.log(`   ⚠️  Phone confirm but no registered phone available`);
                }
            } else if (isNegative) {
                // User said NO/NAHI/CHANGE - ask for alternate number
                callData.awaitingAlternatePhone = true;
                const prompt = "Theek hai, apna dusra number bataiye.";
                callData.lastQuestion = prompt;
                console.log(`   🔄 User wants to change phone - asking for alternate`);
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional' });
                return res.type("text/xml").send(twiml.toString());
            } else {
                // Ambiguous response - ask for clarification
                const clarifyPrompt = "Kripya haan boliye agar number sahi hai, ya nahi boliye agar change karna hai.";
                callData.lastQuestion = clarifyPrompt;
                callData.awaitingPhoneConfirm = true;  // Stay in phone confirm state
                console.log(`   ❓ Ambiguous phone response - asking for clarification`);
                activeCalls.set(CallSid, callData);
                await speak(twiml, clarifyPrompt, { emotion: 'professional' });
                return res.type("text/xml").send(twiml.toString());
            }
            // Continue to next step - don't call AI, let flow continue
            console.log(`   ➡️  Phone handling complete - continuing to next step`);
        }

        // ── STEP 8: Handle alternate phone number ──────────────────
        if (callData.awaitingAlternatePhone) {
            callData.awaitingAlternatePhone = false;
            const foundPhone = parsePhoneFromText(userInput);
            if (foundPhone) {
                const originalPhone = callData.customerData?.phone || "";
                if (originalPhone && originalPhone !== foundPhone) {
                    callData.extractedData.customer_phone = `${originalPhone}, ${foundPhone}`;
                } else {
                    callData.extractedData.customer_phone = foundPhone;
                }
                console.log(`   ✅ Alternate phone saved: ${callData.extractedData.customer_phone}`);
                // Continue to next step - don't call AI
                console.log(`   ➡️  Alternate phone handling complete - continuing to next step`);
            } else {
                console.log(`   🔄 No phone found in alternate input - asking again`);
                callData.awaitingAlternatePhone = true;
                const prompt = "Thoda clearly 10 digit ka mobile number bataiye.";
                callData.lastQuestion = prompt;
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional' });
                return res.type("text/xml").send(twiml.toString());
            }
        }

        // ── STEP 8: City & Branch confirmation ────────────────────
        if (callData.pendingCityConfirm) {
            callData.pendingCityConfirm = false;
            callData.awaitingCityConfirm = true;
            
            // Build clear, natural confirmation prompt
            let prompt;
            if (callData.extractedData.city === callData.extractedData.branch) {
                // Same city and branch - simple confirmation
                prompt = `${normalizeSpeechText(callData.extractedData.city)} branch sahi hai? Haan ya nahi boliye.`;
            } else {
                // Different city and branch - explain which branch will serve
                prompt = `Aapki machine ${normalizeSpeechText(callData.extractedData.city)} mein hai? ${normalizeSpeechText(callData.extractedData.branch)} branch se engineer aayega. Theek hai?`;
            }
            
            callData.lastQuestion = prompt;
            console.log(`   🗺️  City confirmation prompt - ${callData.extractedData.city} → ${callData.extractedData.branch}`);
            activeCalls.set(CallSid, callData);
            await speak(twiml, prompt, { emotion: 'professional' });
            return res.type("text/xml").send(twiml.toString());
        }

        if (callData.awaitingCityConfirm) {
            callData.awaitingCityConfirm = false;
            const isPositive = isPositiveConfirmation(userInput);  // Checks for haan, yes, theek, bilkul, etc.
            const isNegative = isNegativeConfirmation(userInput);  // Checks for nahi, no, galat, wrong, etc.
            
            if (isPositive) {
                // User confirmed city with YES/HAAN/THEEK
                callData.cityConfirmed = true;
                callData.lastQuestion = null; // Clear stale prompt after successful confirmation
                console.log(`   ✅ City confirmed (positive affirmation): ${callData.extractedData.city}`);
            } else if (isNegative) {
                // User rejected city with NO/NAHI/GALAT
                callData.extractedData.city = null;
                callData.extractedData.city_id = null;
                callData.extractedData.branch = null;
                const prompt = "Achha, apni nearest city ka naam dobara bataiye.";
                callData.lastQuestion = prompt;
                console.log(`   🔄 City rejected (negative response) - asking again`);
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional' });
                return res.type("text/xml").send(twiml.toString());
            } else {
                // Ambiguous response - ask for clarification
                const clarifyPrompt = "Kripya haan boliye agar city sahi hai, ya nahi boliye agar change karna hai.";
                callData.lastQuestion = clarifyPrompt;
                callData.awaitingCityConfirm = true;  // Stay in city confirm state
                console.log(`   ❓ Ambiguous city response - asking for clarification`);
                activeCalls.set(CallSid, callData);
                await speak(twiml, clarifyPrompt, { emotion: 'professional' });
                return res.type("text/xml").send(twiml.toString());
            }
            // Continue to next step - don't call AI
            console.log(`   ➡️  City confirmation complete - continuing to next step`);
        }

        // ── STEP 9: Check for side questions (AFTER confirmations) ────────
        const earlyAnswer = await answerSideQuestion(userInput, callData);
        if (earlyAnswer) {
            console.log(`   💡 Side question detected - answering: "${earlyAnswer}"`);
            const nextPrompt = getSmartSilencePrompt(callData, { ignoreLastQuestion: true });
            const combinedText = `${earlyAnswer} ${nextPrompt}`;
            callData.lastQuestion = combinedText;
            callData.messages.push({ role: "assistant", text: combinedText, timestamp: new Date() });
            activeCalls.set(CallSid, callData);
            await speak(twiml, combinedText, { emotion: 'professional', callSid: CallSid });
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 10: Existing complaint scenario ─────────────────────
        if (!callData.awaitingComplaintAction) {
            const repeatRx = /(pehle complaint|already complaint|complaint kar di|complaint ki thi|engineer nahi aaya|engineer nhi aaya|aaya nahi|kab aayega|bahut der|kal se wait|2 din|3 din|dobara complaint|phir se complaint|re-register)/i;
            if (repeatRx.test(lo)) {
                callData.awaitingComplaintAction = true;
                let existingInfo = null;
                const machNo = callData.extractedData.machine_no || callData.customerData?.machineNo;
                if (machNo) existingInfo = await getExistingComplaint(machNo);
                else if (callData.callingNumber) {
                    const pr = callData._phoneData || await findMachineByPhone(callData.callingNumber);
                    if (pr.valid) {
                        callData.customerData = pr.data;
                        callData.extractedData.machine_no = pr.data.machineNo;
                        existingInfo = await getExistingComplaint(pr.data.machineNo);
                    }
                }

                if (existingInfo?.found) {
                    callData.existingComplaintId = existingInfo.complaintId;
                    const prompt = `Complaint ${existingInfo.complaintId} mili. Nayi complaint karein ya engineer ko urgent message bhejein?`;
                    callData.lastQuestion = prompt;
                    console.log(`   📋 Existing complaint found: ${existingInfo.complaintId} - asking for action`);
                    activeCalls.set(CallSid, callData);
                    await speak(twiml, prompt, { emotion: 'professional' });
                } else {
                    callData.awaitingComplaintAction = false;
                    const prompt = "Pehli complaint nahi mili. Nayi register karta hun. Chassis number bataiye.";
                    callData.lastQuestion = prompt;
                    console.log(`   ℹ️  No existing complaint found - proceeding with new registration`);
                    activeCalls.set(CallSid, callData);
                    await speak(twiml, prompt, { emotion: 'professional' });
                }
                return res.type("text/xml").send(twiml.toString());
            }
        }

        // ── STEP 11: Handle complaint-action choice ───────────────────
        if (callData.awaitingComplaintAction) {
            callData.awaitingComplaintAction = false;
            const wantsUrgent = /(urgent|jaldi|message|engineer ko|escalate|priority)/i.test(lo);
            if (wantsUrgent) {
                await escalateToEngineer(callData.existingComplaintId, callData.callingNumber);
                console.log(`   🚨 Escalated existing complaint: ${callData.existingComplaintId}`);
                await sayFinal(twiml, "Bilkul. Engineer ko urgent message bhej diya. Jaldi aayega. Dhanyavaad!", { context: 'farewell', emotion: 'professional' });
                twiml.hangup();
                performanceLogger.endSession(CallSid, 'completed');
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }
            // else fall through to register new complaint - let AI handle
            console.log(`   ➡️  User wants new complaint - continuing to AI`);
        }

        // ── STEP 12: Direct submit after all details are collected ──────────────
        // Triggered once all required fields are ready — no final confirmation prompt
        const missing = missingField(callData.extractedData);
        const machineValidated = !!callData.customerData;

        if (!missing && machineValidated) {
            const sideAnswer = await answerSideQuestion(userInput, callData);
            if (sideAnswer && !isPositiveConfirmation(lo) && !isAddMoreProblem(lo) && !isNegativeConfirmation(lo)) {
                const prompt = `${sideAnswer} Ab main aapki complaint submit kar raha hoon.`;
                callData.lastQuestion = prompt;
                console.log(`   💬 Side question answered - proceeding to submit without confirmation`);
                callData.messages.push({ role: "assistant", text: prompt, timestamp: new Date() });
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional' });
            } else {
                console.log(`   ✅ All data collected - submitting complaint without final confirmation`);
            }

            callData.awaitingFinalConfirm = false;
            activeCalls.set(CallSid, callData);
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        if (callData.awaitingFinalConfirm) {
            console.log(`   ➡️  Final confirmation state detected - submitting complaint directly`);
            callData.awaitingFinalConfirm = false;
            activeCalls.set(CallSid, callData);
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        const isSideQuestion = callData.intent === 'side_question' || isClarificationQuestion(userInput);
        if (missing && !callData.awaitingFinalConfirm && !callData.awaitingPhoneConfirm && !callData.awaitingAlternatePhone && !callData.awaitingComplaintAction && !callData.awaitingCityConfirm && !isSideQuestion) {
            const prompt = getSmartSilencePrompt(callData, { ignoreLastQuestion: true });
            callData.lastQuestion = prompt;
            callData.messages.push({ role: "assistant", text: prompt, timestamp: new Date() });
            activeCalls.set(CallSid, callData);
            await speak(twiml, prompt, { emotion: 'professional' });
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 14: LLM-FIRST APPROACH with Hardcoded Fallback ──────────────────────────────────────
        console.log(`   📊 Current State: ${JSON.stringify({
            machine: callData.extractedData.machine_no || "❌",
            complaint: callData.extractedData.complaint_title || "❌",
            status: callData.extractedData.machine_status || "❌",
            city: callData.extractedData.city || "❌",
            phone: callData.extractedData.customer_phone || "❌",
            missing: missing || "✅ READY",
        })}`);

        if (!missing && machineValidated) {
            console.log(`   ⚠️  Reached AI section with complete data - submitting complaint without confirmation`);
            activeCalls.set(CallSid, callData);
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        // LLM-FIRST: Let AI handle the conversation with full context
        console.log(`   🤖 Calling AI with enhanced context (turn ${callData.turnCount}, attempts ${callData.machineNumberAttempts || 0})...`);
        
        // Start LLM timing
        const llmStartTime = performanceLogger.getHighResTime();
        const aiResp = await getSmartAIResponse(callData);
        const llmEndTime = performanceLogger.getHighResTime();
        
        // Log LLM performance timing
        performanceLogger.logLLM(
            CallSid,
            llmStartTime,
            llmEndTime,
            aiResp.tokens || 0,
            aiResp.cost || 0,
            aiResp.error || null
        );
        
        // Store AI response for debugging and fallback
        callData.lastAIResponse = aiResp.text;
        console.log(`   💬 AI Response: "${aiResp.text}"`);
        
        // Validate AI response quality - must have a question or clear instruction
        const isGoodResponse = aiResp.text && (
            aiResp.text.includes("?") || 
            aiResp.text.includes("bataiye") || 
            aiResp.text.includes("boliye") ||
            aiResp.text.includes("chahiye") ||
            aiResp.text.length > 15
        );
        
        if (!isGoodResponse) {
            console.warn(`   ⚠️  AI response validation failed - too short or unclear`);
            // FALLBACK: Use hardcoded smart prompt based on what's missing and avoid stale prompts
            const fallbackPrompt = getSmartSilencePrompt(callData, { ignoreLastQuestion: true });
            aiResp.text = fallbackPrompt;
            console.log(`   🔄 Using hardcoded fallback prompt: "${fallbackPrompt}"`);
        } else {
            console.log(`   ✅ AI response validated and approved`);
        }
        
        // Track the question being asked
        callData.lastQuestion = aiResp.text;

        // Merge AI-extracted data
        if (aiResp.extractedData) {
            for (const [k, v] of Object.entries(aiResp.extractedData)) {
                if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
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
        }

        // Check again after AI — but route through final confirm if now complete
        const stillMissing = missingField(callData.extractedData);
        if (!stillMissing && machineValidated) {
            const finalQuestion = "Aur koi problem toh nahi machine mein? Save kar dun complaint?";
            callData.awaitingFinalConfirm = true;
            callData.lastQuestion = finalQuestion;
            callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
            activeCalls.set(CallSid, callData);
            await speak(twiml, finalQuestion, { emotion: 'professional' });
            return res.type("text/xml").send(twiml.toString());
        }

        // HARD GUARD: never submit unless machine validated
        if (aiResp.readyToSubmit && !machineValidated) {
            console.warn(`   ⛔ AI said ready but machine NOT validated — blocking submit`);
            aiResp.text = "Machine number nahi mila. Sahi chassis number bataiye.";
            callData.lastQuestion = aiResp.text;
            aiResp.readyToSubmit = false;
        }

        // If AI marked as ready to submit, do it immediately
        if (aiResp.readyToSubmit && machineValidated) {
            callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
            const result = await submitComplaint(callData);
            const id = result.sapId || result.jobId || "";

            if (result.success) {
                if (id) {
                    const idFormatted = formatNumberForTTS(id);
                    await sayFinal(twiml, `Humne aapki complaint register kar di hai. Number hai ${id}. Engineer jaldi contact karega. Dhanyavaad!`, { context: 'confirmation', emotion: 'professional', callSid: CallSid });
                } else {
                    await sayFinal(twiml, "Humne aapki complaint register kar di hai. Engineer jaldi contact karega. Dhanyavaad!", { context: 'confirmation', emotion: 'professional', callSid: CallSid });
                }
            } else {
                await sayFinal(twiml, "Dikhat hui complaint submit karte waqt. Thodi der baad dubara kijiye ya call karein.", { context: 'error', emotion: 'empathetic', callSid: CallSid });
            }
            twiml.hangup();
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
        activeCalls.set(CallSid, callData);
        
        // Log turn completion
        serviceLogger.logTurn(CallSid);
        
        // If we answered a side question, combine both responses
        if (sideQuestionAnswer) {
            console.log(`   📢 Combining side question answer + LLM response`);
            const combinedText = `${sideQuestionAnswer} ${aiResp.text}`;
            await speak(twiml, combinedText, { emotion: 'professional', callSid: CallSid });
        } else {
            await speak(twiml, aiResp.text, { emotion: 'professional', callSid: CallSid });
        }
        
        // Complete turn timing
        performanceLogger.completeTurn(CallSid);
        
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [PROCESS]", err.message);
        
        // Complete turn timing even on error
        performanceLogger.completeTurn(CallSid);
        
        await sayFinal(twiml, "Thodi dikkat aa gayi ji. Engineer ko bhej raha hun.", { emotion: 'empathetic' });
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
        performanceLogger.endSession(CallSid, 'error');
        activeCalls.delete(CallSid);
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 SUBMIT COMPLAINT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function handleSubmit(callData, twiml, res, CallSid) {
    console.log("\n🚀 [SUBMITTING COMPLAINT]");
    const result = await submitComplaint(callData);
    const id = result.sapId || result.jobId || "";

    if (result.success) {
        if (id) {
            await sayFinal(twiml, `Humne aapki complaint register kar di hai. Number hai ${id}. Engineer jaldi contact karega. Dhanyavaad!`, { context: 'confirmation', emotion: 'professional', callSid: CallSid });
        } else {
            await sayFinal(twiml, "Humne aapki complaint register kar di hai. Engineer jaldi contact karega. Dhanyavaad!", { context: 'confirmation', emotion: 'professional', callSid: CallSid });
        }
    } else {
        await sayFinal(twiml, "Dikhat hui complaint submit karte waqt. Thodi der baad dubara kijiye ya call karein.", { context: 'error', emotion: 'empathetic', callSid: CallSid });
    }

    twiml.hangup();
    activeCalls.delete(CallSid);
    return res.type("text/xml").send(twiml.toString());
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔎 API HELPERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function validateMachineNumber(machineNo) {
    try {
        const r = await axios.get(
            `${BASE_URL}/get_machine_by_machine_no.php?machine_no=${machineNo}`,
            { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: s => s < 500 }
        );
        if (r.status === 200 && r.data?.status === 1 && r.data?.data) {
            const d = r.data.data;
            return {
                valid: true,
                data: {
                    name: d.customer_name || "Unknown",
                    city: d.city || "Unknown",
                    model: d.machine_model || "Unknown",
                    machineNo: d.machine_no || machineNo,
                    phone: d.customer_phone_no || "Unknown",
                    subModel: d.sub_model || "NA",
                    machineType: d.machine_type || "Warranty",
                    businessPartnerCode: d.business_partner_code || "NA",
                    purchaseDate: d.purchase_date || "NA",
                    installationDate: d.installation_date || "NA",
                },
            };
        }
        return { valid: false };
    } catch { return { valid: false }; }
}

async function findMachineByPhone(phone) {
    if (!phone || phone.length < 8) return { valid: false };
    try {
        const r = await axios.get(
            `${BASE_URL}/get_machine_by_phone.php?phone=${phone}`,
            { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: s => s < 500 }
        );
        if (r.status === 200 && r.data?.status === 1 && r.data?.data) {
            const d = r.data.data;
            return {
                valid: true,
                data: {
                    name: d.customer_name || "Unknown",
                    city: d.city || "Unknown",
                    model: d.machine_model || "Unknown",
                    machineNo: d.machine_no || phone,
                    phone: d.customer_phone_no || phone,
                    subModel: d.sub_model || "NA",
                    machineType: d.machine_type || "Warranty",
                    businessPartnerCode: d.business_partner_code || "NA",
                    purchaseDate: d.purchase_date || "NA",
                    installationDate: d.installation_date || "NA",
                },
            };
        }
        return { valid: false };
    } catch { return { valid: false }; }
}

async function getExistingComplaint(machineNo) {
    if (!machineNo) return { found: false };
    try {
        const r = await axios.get(
            `${BASE_URL}/get_complaint_by_machine.php?machine_no=${machineNo}`,
            { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: s => s < 500 }
        );
        if (r.status === 200 && r.data?.status === 1 && r.data?.data) {
            const d = r.data.data;
            return {
                found: true,
                complaintId: d.complaint_sap_id || d.sap_id || d.complaint_id || "N/A",
                status: d.status || "open",
                engineerName: d.engineer_name || null,
            };
        }
        return { found: false };
    } catch (err) {
        console.error("❌ Complaint lookup:", err.message);
        return { found: false };
    }
}

async function escalateToEngineer(complaintId, callerPhone) {
    if (!complaintId) return;
    try {
        await axios.post(
            `${BASE_URL}/escalate_complaint.php`,
            {
                complaint_id: complaintId,
                caller_phone: callerPhone,
                reason: "Customer called again — engineer not arrived",
            },
            {
                timeout: API_TIMEOUT,
                headers: { "Content-Type": "application/json", ...API_HEADERS },
                validateStatus: s => s < 500,
            }
        );
        console.log(`   🚨 Escalated: ${complaintId}`);
    } catch (err) {
        console.error("❌ Escalate:", err.message);
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📝 EXTRACT ALL COMPLAINT TYPES from a single utterance
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function extractAllComplaintTitles(text) {
    const lo = text.toLowerCase().replace(/[।.!?]/g, ' ');
    const found = [];
    const checks = [
        [/(start nahi|start nhi|start nai|chalu nahi|chalu nhi|chalti nahi|chal nahi rahi|nahi chal rahi|engine not starting|band hai|band ho gayi|band pad|khari hai|chal nhi rahi|chal nhi|nhi chal|band padi|khadi padi|chal nai|chaalti nai)/, 'Engine Not Starting'],
        [/(filter|filttar|filtar|service|servicing|seva|oil change|tel badlo|tel badalwana)/, 'Service/Filter Change'],
        [/(dhuan|dhua|smoke|dhuen|dhuwaan)/, 'Engine Smoke'],
        [/(garam|dhak|overheat|ubhal|tapta|zyada garam|bahut garam|dhak gyi|tapt gyi)/, 'Engine Overheating'],
        [/(tel nikal|oil leak|rissa|risso|tel nikal ryo|oil aa raha|tel aa raha|riss ryo)/, 'Oil Leakage'],
        [/(hydraulic|hydraulik|hydro|ailak|cylinder|bucket|boom|jack|dipper)/, 'Hydraulic System Failure'],
        [/(race nahi|race nai|ras nahi|ras nai|accelerator|throttle|gas nahi|gas nai|pickup nahi|gas nai leti)/, 'Accelerator Problem'],
        [/(ac nahi|ac nai|hawa nahi|thanda nahi|ac band|ac kharab|cooling nahi|thando nai)/, 'AC Not Working'],
        [/(brake nahi|brake nhi|brake nai|rokti nahi|brake fail|brake kharab|rokti nai)/, 'Brake Failure'],
        [/(bijli nahi|bijli nai|headlight|bulb|electrical|light nahi|battery)/, 'Electrical Problem'],
        [/(tire|tyre|pankchar|puncture|flat tyre)/, 'Tire Problem'],
        [/(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration|noise|khad khad|aavaaz aa ri|khatak aa ri)/, 'Abnormal Noise'],
        [/(steering|steering kharab|steering nahi ghoom)/, 'Steering Problem'],
        [/(gear|transmission|gear nahi lagta|gear slip)/, 'Transmission Problem'],
        [/(coolant|paani nikal|water leak|radiator)/, 'Coolant Leakage'],
        [/(battery down|battery kharab|battery nahi)/, 'Battery Problem'],
        [/(boom|arm|dipper nahi|arm nahi uthta|arm nai uthta)/, 'Boom/Arm Failure'],
        [/(turbo|turbocharger|black smoke)/, 'Turbocharger Issue'],
    ];
    for (const [rx, title] of checks) {
        if (rx.test(lo) || rx.test(text)) {
            if (!found.includes(title)) found.push(title);
        }
    }
    return found;
}

async function submitComplaint(callData) {
    const callSid = callData.callSid || callData.CallSid || "unknown";
    try {
        const data = callData.extractedData;
        const c = callData.customerData || {};
        if (!data.job_location) data.job_location = "Onsite";

        const payload = {
            machine_no: data.machine_no || "Unknown",
            customer_name: data.customer_name || c.name || "Unknown",
            caller_name: data.customer_name || c.name || "Customer",
            caller_no: data.customer_phone || c.phone || callData.callingNumber || "Unknown",
            contact_person: data.customer_name || c.name || "Customer",
            contact_person_number: data.customer_phone || c.phone || callData.callingNumber || "Unknown",
            machine_model: c.model || "Unknown",
            sub_model: c.subModel || "NA",
            installation_date: c.installationDate || "2025-01-01",
            machine_type: c.machineType || "Warranty",
            city_id: data.city_id || "4",
            complain_by: "Customer",
            machine_status: data.machine_status || "Running With Problem",
            job_location: data.job_location,
            branch: data.branch || "JAIPUR",
            outlet: data.outlet || "JAIPUR",
            complaint_details: data.complaint_details || "Not provided",
            complaint_title: data.complaint_title || "General Problem",
            sub_title: data.complaint_subtitle || "Other",
            business_partner_code: c.businessPartnerCode || "NA",
            complaint_sap_id: "NA",
            machine_location_address: data.machine_location_address || "Not provided",
            pincode: "0",
            service_date: "", from_time: "", to_time: "",
        };
        payload.job_open_lat = data.lat != null ? data.lat : 0;
        payload.job_open_lng = data.lng != null ? data.lng : 0;
        payload.job_close_lat = data.lat != null ? data.lat : 0;
        payload.job_close_lng = data.lng != null ? data.lng : 0;

        console.log("📤 Submitting:", JSON.stringify(payload, null, 2));

        // Start API timing
        const apiStartTime = performanceLogger.getHighResTime();
        const r = await axios.post(COMPLAINT_URL, payload, {
            timeout: API_TIMEOUT,
            headers: { "Content-Type": "application/json", ...API_HEADERS },
            validateStatus: s => s < 500,
        });
        const apiEndTime = performanceLogger.getHighResTime();
        
        // Log API performance timing
        performanceLogger.logAPI(
            callSid,
            apiStartTime,
            apiEndTime,
            'complaint_submission',
            r.status !== 200 ? `HTTP ${r.status}` : null
        );

        if (r.status === 200 && r.data?.status === 1) {
            const sapId = r.data.data?.complaint_sap_id || r.data.data?.sap_id;
            console.log(`✅ Complaint submitted — SAP: ${sapId}`);
            return { success: true, sapId, jobId: r.data.data?.job_id };
        }

        console.error("❌ API error:", r.data?.message);
        return { success: false };

    } catch (err) {
        console.error("❌ Submit failed:", err.message);
        
        // Log API error timing
        const apiEndTime = performanceLogger.getHighResTime();
        performanceLogger.logAPI(
            callSid,
            apiStartTime || performanceLogger.getHighResTime(),
            apiEndTime,
            'complaint_submission',
            err.message
        );
        
        return { success: false };
    }
}

export default router;