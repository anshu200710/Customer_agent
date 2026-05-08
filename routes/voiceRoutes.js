import express from "express";
import twilio from "twilio";
import axios from "axios";
import { getSmartAIResponse, extractAllData, sanitizeExtractedData, matchServiceCenter } from "../utils/ai.js";
import { searchFAQ, getAgentInfo, getUnavailableMessage } from "../utils/faq.js";
import { generateSpeech, detectEmotionAndContext, formatNumbersForTTS } from "../utils/cartesia_tts.js";
import serviceLogger from "../utils/service_logger.js";
import performanceLogger from "../utils/performance_logger.js";
import { executeFunctionCall } from "../utils/function_handlers.js";
import { logCallStart, logTurn, logCallEnd, logSubmission, logError } from "../utils/clean_debugger.js";
import { updateState, STATES } from "../utils/state_manager.js";

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
    if (!d.machine_no || !/^\d{3,7}$/.test(d.machine_no)) return "machine_no";
    if (!d.complaint_title) return "complaint_title";
    if (!d.machine_status) return "machine_status";
    if (!d.city || !d.city_id) return "city";
    if (!d.customer_phone || !/^[6-9]\d{9}$/.test(d.customer_phone)) return "customer_phone";
    return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 SMART SILENCE HANDLER: Context-aware prompts based on what's missing
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getSmartSilencePrompt(callData) {
    const d = callData.extractedData;
    
    // Check what's missing and ask for it specifically
    const missing = missingField(d);
    
    // DON'T reuse lastQuestion if we just completed a confirmation
    // (phone confirm, city confirm, etc.) - generate fresh question instead
    const justCompletedConfirmation = 
        (callData.lastQuestion && /save karna hai|change karna hai|theek hai|sahi hai/i.test(callData.lastQuestion)) &&
        !callData.awaitingPhoneConfirm && 
        !callData.awaitingCityConfirm &&
        !callData.pendingPhoneConfirm &&
        !callData.pendingCityConfirm;
    
    // If we have a stored last question, validate it's actually a question AND matches current missing field
    if (callData.lastQuestion && !justCompletedConfirmation) {
        const lastQ = callData.lastQuestion.trim();
        
        // Don't reuse clarification questions (they cause loops)
        if (/ya nahi boliye|cancel kar dun|haan boliye to/i.test(lastQ)) {
            // console.log(`   ⚠️ [SILENCE] Last question was clarification - not reusing`);
            // If in final confirmation state and user is silent after clarification, just submit
            if (callData.awaitingFinalConfirm && !missing) {
                // console.log(`   ✅ [SILENCE] All data collected, user silent after clarification - will submit on next input`);
                return "Complaint save kar raha hun. Ek second.";
            }
            // Otherwise fall through to generate proper question
        } else if (lastQ.includes("?") || /bataiye|boliye|chahiye|batao|bolo|dijiye|kya hai/i.test(lastQ)) {
            // It's a proper question - but check if it matches the CURRENT missing field
            let questionMatchesCurrentField = false;
            
            if (missing === "machine_no" && /machine.*number|chassis|number.*bataiye/i.test(lastQ)) {
                questionMatchesCurrentField = true;
            } else if (missing === "complaint_title" && /problem|complaint|kya.*hai|issue|kharab|dikkat/i.test(lastQ)) {
                questionMatchesCurrentField = true;
            } else if (missing === "machine_status" && /band|chal.*rahi|status|problem.*saath|breakdown|running/i.test(lastQ)) {
                questionMatchesCurrentField = true;
            } else if (missing === "city" && /shahar|city|kahan|kaunse|location/i.test(lastQ)) {
                questionMatchesCurrentField = true;
            } else if (missing === "customer_phone" && /phone|mobile|number.*10|contact/i.test(lastQ)) {
                questionMatchesCurrentField = true;
            } else if (!missing && /sahi.*hain|save.*kar|confirm|theek.*hai|register/i.test(lastQ)) {
                // Final confirmation question
                questionMatchesCurrentField = true;
            }
            
            if (questionMatchesCurrentField) {
                // Question matches current field - reuse it
                // console.log(`   ✅ [SILENCE] Reusing last question (matches current field): "${lastQ}"`);
                return lastQ;
            } else {
                // Question doesn't match current field - generate new one
                // console.log(`   ⚠️ [SILENCE] Last question doesn't match current field (${missing}) - generating new question`);
                // Fall through to generate proper question
            }
        }
        // If it's a statement (like "complaint register kar rahi hun"), ignore it and generate proper question
        // console.log(`   ⚠️ [SILENCE] Last question was a statement, generating proper question`);
    }
    
    if (justCompletedConfirmation) {
        // console.log(`   ✅ [SILENCE] Just completed confirmation - generating fresh question for next field`);
    }
    
    // Determine what to ask based on missing fields
    if (missing === "machine_no") {
        return "Machine number bataiye.";
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
    // Check English/transliterated patterns
    const englishMatch = /(\b(haan|ha|han|theek hai|thik hai|save|kar do|register|done|yes|bilkul|sahi hai|ok|okay|theek|chalo|hmm)\b)/i.test(text);
    
    // Check Devanagari/Hindi patterns
    const hindiMatch = /(हां|हाँ|हा|ठीक है|ठीक|कर दो|करो|करदो|सेव|रजिस्टर|बिल्कुल|सही है|चलो|हम्म|हूं|हु)/i.test(text);
    
    return englishMatch || hindiMatch;
}

function isNegativeConfirmation(text) {
    // Check English/transliterated patterns
    const englishMatch = /(\b(nahi|nai|nahin|no|mat|band kar|ruk ja|ruk jai|ruk|nahin chahiye|don't|dont)\b)/i.test(text);
    
    // Check Devanagari/Hindi patterns
    const hindiMatch = /(नहीं|नही|नै|ना|मत|बंद कर|रुक जा|रुक|नहीं चाहिए|रोको)/i.test(text);
    
    return englishMatch || hindiMatch;
}

function isAddMoreProblem(text) {
    return /(\b(aur (problem|complaint|issue|koi aur|bhi)|additional|extra|dusri|phir se complaint|another complaint|aur kuch)\b)/i.test(text) && !isNegativeConfirmation(text);
}

function formatNumberForTTS(number) {
    return String(number).split("").join(" ");
}

/**
 * Convert ALL CAPS text to Title Case for natural TTS pronunciation
 * Prevents TTS from spelling out words letter-by-letter
 * @param {string} text - Text to convert
 * @returns {string} Title cased text
 */
function toTitleCase(text) {
    if (!text) return text;
    
    // Convert to string and handle null/undefined
    const str = String(text).trim();
    if (!str) return str;
    
    // Convert to title case: "MOHAN KUMAR" → "Mohan Kumar"
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Prepare text for TTS by fixing ALL CAPS and formatting numbers
 * @param {string} text - Text to prepare
 * @returns {string} TTS-ready text
 */
function prepareTextForTTS(text) {
    if (!text) return text;
    
    let prepared = String(text);
    
    // Fix ALL CAPS words (but preserve intentional formatting)
    // Match words that are 3+ characters and ALL CAPS
    prepared = prepared.replace(/\b([A-Z]{3,})\b/g, (match) => {
        return toTitleCase(match);
    });
    
    return prepared;
}

function isClarificationQuestion(text) {
    return /(\b(kya|kaun|kab|kaise|kitna|kitne|kahan|kaunse|kis|naam|phone|number|engineer|wait|der|time)\b)/i.test(text)
        && !isPositiveConfirmation(text)
        && !isNegativeConfirmation(text)
        && !isAddMoreProblem(text);
}

function answerSideQuestion(text, callData) {
    const lo = text.toLowerCase();
    
    // AGENT NAME: Only match direct questions about agent name, not "city name" or "machine name"
    if (/(aapka naam|tumhara naam|main kaun|kaun bol raha|tum kaun|aap kaun|aap kaunsi|agent kaun|priya kaun)/.test(lo)) {
        return "Main Priya, Rajesh Motors se.";
    }
    
    // COMPLAINT REGISTRATION: Only if NOT already collecting data
    if (/(complaint register|complaint kaise|register kaise|complaint process|complaint karna hai)/.test(lo) && !/(kab|kahan|kaise|kitna|details)/.test(lo)) {
        // Check if we already have machine number
        if (callData.extractedData.machine_no) {
            return "Haan, complaint register kar rahe hain. Aur details collect kar rahe hain.";
        } else {
            return "Haan, complaint register karte hain. Pehle machine number bataiye.";
        }
    }
    
    // ENGINEER TIMING: Only if asking about engineer arrival
    if (/engineer/.test(lo) && /(kab|kabhi|aayega|aaega|kab aayega|aayegi|kitna time|der)/.test(lo)) {
        return "Engineer jaldi call karega.";
    }
    
    // PHONE NUMBER CHANGE: Only if explicitly asking to change
    if (/(phone.*change|number.*change|naya number|dusra number|badalna hai)/.test(lo)) {
        return "Haan, naya number bataiye.";
    }
    
    // PHONE/NUMBER QUESTIONS: Only if asking what phone is for
    if (/(phone.*kya|number.*kya|phone.*kyun|number.*kyun)/.test(lo)) {
        return "Service call hai, complaint register kar rahi hun.";
    }
    
    // WAIT TIME: Only if asking about wait time
    if (/(kitna der|der|wait|time|kab tak|kitna time)/.test(lo) && /(engineer|call|aayega)/.test(lo)) {
        return "Jaldi engineer call karega.";
    }
    
    // WHAT ARE YOU DOING: Only if asking what agent is doing
    if (/(kya.*kar.*rahi|kya.*ho.*raha|kaise.*hoga|kaisa.*hai|kaise.*honge)/.test(lo) && /(aap|tum|main)/.test(lo)) {
        return "Complaint note kar rahi hun.";
    }
    
    return null;
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
        // Prepare text for TTS: fix ALL CAPS and format numbers
        let formattedText = prepareTextForTTS(text);
        formattedText = formatNumbersForTTS(formattedText);
        
        // Detect emotion and context automatically
        const { emotion, context } = detectEmotionAndContext(formattedText);
        
        // console.log(`🎤 [TTS] Text: "${formattedText}" | Emotion: ${emotion} | Context: ${context}`);
        
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
            // console.log(`✅ [TTS] Using Cartesia Sonic 3 (${cartesiaResult.wavAudio.length} bytes)`);
            // console.log(`🎵 [TTS] Audio ID: ${cartesiaResult.audioId}`);
            // console.log(`⏱️  [TTS] Duration: ${cartesiaResult.duration.toFixed(2)}s`);
            
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
            // console.log(`🔗 [TTS] Stream URL: ${audioStreamUrl}`);
            
            // Create Twilio gather with speech recognition
            const gather = twiml.gather({
                input: "speech dtmf",
                language: TTS_LANG,
                speechTimeout: 1,
                timeout: 5,
                maxSpeechTime: 15,
                action: options.action || "/voice/process",
                method: "POST",
                bargeIn: false
            });
            
            // Play Cartesia audio instead of using Google TTS
            gather.play(audioStreamUrl);
            
            // Fallback message if user doesn't respond
            twiml.redirect(options.redirect || "/voice/process");
            
            return twiml.toString();
        }
        
        // Fallback to Google TTS if Cartesia fails
        // console.log(`⚠️  [TTS] Cartesia failed, falling back to Google TTS`);
        // console.log(`   Error: ${cartesiaResult?.error || 'Unknown error'}`);
        
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
            speechTimeout: 2.25,
            timeout: 5,
            maxSpeechTime: 15,
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
            
            // console.log(`🔄 [TTS] Using Google TTS fallback`);
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
            speechTimeout: 2.25,
            timeout: 5,
            maxSpeechTime: 15,
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
        // Prepare text for TTS: fix ALL CAPS and format numbers
        let formattedText = prepareTextForTTS(text);
        formattedText = formatNumbersForTTS(formattedText);
        
        // Detect emotion and context automatically
        const { emotion, context } = detectEmotionAndContext(formattedText);
        
        // console.log(`🎤 [TTS Final] Text: "${formattedText}" | Emotion: ${emotion} | Context: ${context}`);
        
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
            // console.log(`✅ [TTS Final] Using Cartesia Sonic 3 (${cartesiaResult.wavAudio.length} bytes)`);
            // console.log(`🎵 [TTS Final] Audio ID: ${cartesiaResult.audioId}`);
            // console.log(`⏱️  [TTS Final] Duration: ${cartesiaResult.duration.toFixed(2)}s`);
            
            // Play Cartesia audio directly
            const audioStreamUrl = `${process.env.PUBLIC_URL}/stream-audio/${cartesiaResult.audioId}`;
            // console.log(`🔗 [TTS Final] Stream URL: ${audioStreamUrl}`);
            twiml.play(audioStreamUrl);
        } else {
            // Fallback to Google TTS
            // console.log(`⚠️  [TTS Final] Cartesia failed, using Google TTS fallback`);
            // console.log(`   Error: ${cartesiaResult?.error || 'Unknown error'}`);
            
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
            
            // console.log(`🔄 [TTS Final] Cartesia failed, using Google TTS fallback`);
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
        // console.log(`🚨 [TTS Final] Emergency fallback to Google TTS`);
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

    // console.log(`\n${"═".repeat(60)}`);
    // console.log(`📞 [NEW CALL] ${CallSid} | ${callerPhone} | machine:${preloadedMachineNo || "—"}`);
    
    // ✅ CLEAN DEBUGGER (with error handling)
    try {
        logCallStart(CallSid, callerPhone, preloadedMachineNo);
    } catch (err) {
        console.log(`\n${"═".repeat(80)}`);
        console.log(`📞 NEW CALL | SID: ${CallSid.slice(-8)} | Phone: ${callerPhone || 'Unknown'} | Machine: ${preloadedMachineNo || 'None'}`);
        console.log(`⚠️  Clean debugger error: ${err.message}`);
        console.log('═'.repeat(80));
    }

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
            // Function execution tracking
            functionExecutionLog: [],     // Track all function calls with turn, name, args, result
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

        // Use pre-generated greeting for new customers (FAST!)
        // For returning customers with machine number, use personalized greeting
        if (!callData.customerData) {
            // ⚡ NEW CUSTOMER: Use pre-generated audio (instant - 50-100ms)
            // Audio says: "Namaste, main Priya, Rajesh Motors se. Machine number bataiye."
            const greetingUrl = `${process.env.PUBLIC_URL}/greetings/greeting_priya.wav`;
            const greetingText = "Namaste, main Priya, Rajesh Motors se. Machine number bataiye.";
            
            // console.log(`\n${"═".repeat(60)}`);
            // console.log(`⚡ [FAST GREETING] New Customer - Using Pre-Generated Audio`);
            // console.log(`📁 File: greeting_priya.wav`);
            // console.log(`🔗 URL: ${greetingUrl}`);
            // console.log(`📝 Text: "${greetingText}"`);
            // console.log(`⏱️  Expected Speed: 250-400ms (vs 1.5s dynamic TTS)`);
            // console.log(`${"═".repeat(60)}\n`);
            
            callData.lastQuestion = greetingText;  // Track the question
            
            try {
                // FALLBACK: Use dynamic TTS instead of pre-generated audio
                // Pre-generated audio fails with ngrok free tier (requires browser verification)
                // Dynamic TTS is more reliable and still fast with Cartesia
                // console.log(`🔄 [GREETING] Using dynamic TTS (ngrok compatibility)`);
                
                await speak(twiml, greetingText, { 
                    context: 'greeting', 
                    emotion: 'friendly', 
                    callSid: CallSid 
                });
                
                // console.log(`✅ [GREETING] TwiML generated successfully`);
                // console.log(`📤 [GREETING] Sending response to Twilio`);
                
                res.type("text/xml").send(twiml.toString());
                
            } catch (gatherErr) {
                console.error(`❌ [GREETING ERROR] Failed to create gather:`, gatherErr.message);
                console.error(`   Stack:`, gatherErr.stack);
                throw gatherErr;
            }
            
        } else {
            // 🎯 RETURNING CUSTOMER: Use personalized greeting with their name
            const greeting = `Namaste ${toTitleCase(callData.customerData.name.split(" ")[0])}, kya problem hai?`;
            
            // console.log(`\n${"═".repeat(60)}`);
            // console.log(`🎯 [PERSONALIZED GREETING] Returning Customer`);
            // console.log(`👤 Customer: ${callData.customerData.name}`);
            // console.log(`🔢 Machine: ${callData.customerData.machineNo}`);
            // console.log(`📝 Greeting: "${greeting}"`);
            // console.log(`⏱️  Using Dynamic TTS (Cartesia)`);
            // console.log(`${"═".repeat(60)}\n`);
            
            callData.lastQuestion = greeting;  // Track the question
            await speak(twiml, greeting, { context: 'greeting', emotion: 'friendly', callSid: CallSid });
            res.type("text/xml").send(twiml.toString());
        }

    } catch (err) {
        console.error(`\n${"═".repeat(60)}`);
        console.error(`❌ [START ERROR] Call initialization failed`);
        console.error(`📞 CallSid: ${CallSid}`);
        console.error(`📱 Phone: ${callerPhone}`);
        console.error(`🔢 Machine No: ${preloadedMachineNo || 'None'}`);
        console.error(`⚠️  Error: ${err.message}`);
        console.error(`📚 Stack: ${err.stack}`);
        console.error(`${"═".repeat(60)}\n`);
        
        try {
            await sayFinal(twiml, "Thodi problem aa gayi ji. Thodi der baad call karein.", { emotion: 'empathetic', callSid: CallSid });
            twiml.hangup();
            res.type("text/xml").send(twiml.toString());
        } catch (finalErr) {
            console.error(`❌ [CRITICAL] Even error handler failed:`, finalErr.message);
            // Last resort - send basic TwiML
            const emergencyTwiml = new VoiceResponse();
            emergencyTwiml.say({ voice: TTS_VOICE, language: TTS_LANG }, "Technical problem. Please call again.");
            emergencyTwiml.hangup();
            res.type("text/xml").send(emergencyTwiml.toString());
        }
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

        // console.log(`\n${"─".repeat(60)}`);
        // console.log(`🔄 [TURN ${callData.turnCount}] [${inputMethod}]`);
        // if (Digits) {
        //     console.log(`   ⌨️  DTMF Input: "${Digits}"`);
        // } else if (SpeechResult) {
        //     console.log(`   🎤 Speech Input: "${SpeechResult}"`);
        // } else {
        //     console.log(`   🔇 Silence detected`);
        // }
        // console.log(`   📊 State: machine=${callData.extractedData.machine_no || "❌"} | attempts=${callData.machineNumberAttempts || 0}`);

        // Hard turn limit
        if (callData.turnCount > 25) {
            // console.log(`   ⚠️  Turn limit reached (25) - ending call`);
            try {
                logCallEnd(CallSid, 'turn_limit', callData.extractedData);
            } catch (err) {
                console.log(`📞 CALL END | Reason: turn_limit`);
            }
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
            
            // console.log(`   🔇 Silence count: ${callData.silenceCount}/${maxSilence}`);
            
            if (callData.silenceCount >= maxSilence) {
                // console.log(`   ⚠️  Max silence reached - ending call`);
                try {
                    logCallEnd(CallSid, 'silence_timeout', callData.extractedData);
                } catch (err) {
                    console.log(`📞 CALL END | Reason: silence_timeout`);
                }
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

        // ── STEP 1: Fast regex extraction ───────────────────────────
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // Extract data from user input
        const rxData = extractAllData(userInput, callData.extractedData);
        for (const [k, v] of Object.entries(rxData)) {
            if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
        }

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
                
                // Only ask for confirmation if city and branch are different
                // OR if user didn't explicitly mention the city (was inferred)
                const cityExplicitlyMentioned = new RegExp(mc.city_name, 'i').test(userInput);
                const cityAndBranchSame = mc.city_name === mc.branch_name;
                
                if (!callData.cityConfirmed && !cityExplicitlyMentioned && !cityAndBranchSame) {
                    // City was inferred or branch is different - ask for confirmation
                    callData.pendingCityConfirm = true;
                } else if (!callData.cityConfirmed && !cityAndBranchSame) {
                    // City explicitly mentioned but branch is different - ask for confirmation
                    callData.pendingCityConfirm = true;
                } else {
                    // City explicitly mentioned and matches branch - auto-confirm
                    callData.cityConfirmed = true;
                    console.log(`   ✅ City auto-confirmed (explicitly mentioned): ${mc.city_name}`);
                }
                
                console.log(`   🗺️  ${mc.city_name} → ${mc.branch_name}`);
            }
        }

        // ── STEP 3: machine_status is now collected by AI question ───
        // No auto-guessing — AI asks "Machine bilkul band hai ya problem ke saath chal rahi hai?"

        // ── STEP 4: Machine number lookup with simple 2-try + DTMF fallback ───────────────────────────
        if (!callData.customerData && callData.extractedData.machine_no) {
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

        // ── STEP 5: Phone confirm prompt (one-time) ─────────────────
        // Shows last 2 digits of registered phone + "tumhare phone mein"
        if (callData.pendingPhoneConfirm && callData.customerData?.phone) {
            const ph = String(callData.customerData.phone);
            const lastTwo = ph.slice(-2);
            callData.pendingPhoneConfirm = false;
            callData.awaitingPhoneConfirm = true;
            const prompt = `${toTitleCase(callData.customerData.name.split(" ")[0])}, kya aapka yehi number save karna hai jisme last mein ${lastTwo} aata hai, ya change karna hai?`;
            callData.lastQuestion = prompt;
            console.log(`   📞 Phone confirmation prompt - asking about number ending in ${lastTwo}`);
            activeCalls.set(CallSid, callData);
            await speak(twiml, prompt, { emotion: 'professional', callSid: CallSid });
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 6: Handle phone confirm answer ─────────────────────
        if (callData.awaitingPhoneConfirm) {
            callData.awaitingPhoneConfirm = false;
            const foundPhone = parsePhoneFromText(userInput);
            if (foundPhone) {
                callData.extractedData.customer_phone = foundPhone;
                console.log(`   ✅ Phone changed by direct input: ${foundPhone}`);
            } else {
                const isChange = /(change|चेंज|badal|badalna|dusra|naya|new|different|alag|no|nahi|nhi|nai)/i.test(lo);
                if (!isChange && callData.customerData?.phone) {
                    callData.extractedData.customer_phone = callData.customerData.phone;
                    console.log(`   ✅ Phone confirmed: ${callData.customerData.phone}`);
                } else {
                    callData.awaitingAlternatePhone = true;
                    const prompt = "Theek hai, apna dusra number bataiye.";
                    callData.lastQuestion = prompt;
                    console.log(`   🔄 User wants to change phone - asking for alternate`);
                    activeCalls.set(CallSid, callData);
                    await speak(twiml, prompt, { emotion: 'professional' });
                    return res.type("text/xml").send(twiml.toString());
                }
            }
            // Continue to next step - don't call AI, let flow continue
            console.log(`   ➡️  Phone handling complete - continuing to next step`);
        }

        // ── STEP 7: Handle alternate phone number ──────────────────
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

        // ── STEP 7.5: Handle machine number update confirmation ────────────────────
        if (callData.awaitingMachineUpdateConfirm) {
            callData.awaitingMachineUpdateConfirm = false;
            const isNo = /(nahi|nhi|no|galat|wrong|nai)/i.test(lo);
            
            if (!isNo) {
                // User confirmed - machine number is correct
                console.log(`   ✅ Machine number update confirmed: ${callData.extractedData.machine_no}`);
                callData.machineValidated = true;
                
                // Check if we're in update flow
                if (callData.inUpdateFlow) {
                    console.log(`   🔄 [UPDATE FLOW] Exiting update flow with acknowledgment`);
                    
                    // Exit update flow
                    callData.inUpdateFlow = false;
                    callData.pendingMachineUpdateValidation = false;
                    
                    // Return to previous state
                    const returnState = callData.stateBeforeUpdate || STATES.COLLECT_COMPLAINT;
                    console.log(`   🔄 [UPDATE FLOW] Returning to state: ${returnState}`);
                    updateState(callData, returnState, callData.turnCount);
                    callData.stateBeforeUpdate = null;
                    
                    // CRITICAL: Acknowledge the update BEFORE continuing
                    const acknowledgment = "Theek hai, machine number update ho gaya.";
                    
                    // Continue with current state - ask next question
                    const stillMissing = missingField(callData.extractedData);
                    if (stillMissing) {
                        const nextPrompt = getSmartSilencePrompt(callData);
                        const fullPrompt = `${acknowledgment} ${nextPrompt}`;
                        callData.lastQuestion = fullPrompt;
                        callData.messages.push({ role: "assistant", text: fullPrompt, timestamp: new Date() });
                        
                        // ✅ CLEAN DEBUGGER (with error handling)
                        try {
                            logTurn(callData.turnCount, userInput, fullPrompt, callData, 'machine_update_confirmed');
                        } catch (err) {
                            console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${fullPrompt}"`);
                        }
                        
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, fullPrompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    } else {
                        // All data collected - go to final confirmation
                        callData.awaitingFinalConfirm = true;
                        const finalPrompt = `${acknowledgment} Aur koi problem toh nahi machine mein? Save kar dun complaint?`;
                        callData.lastQuestion = finalPrompt;
                        callData.messages.push({ role: "assistant", text: finalPrompt, timestamp: new Date() });
                        
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, finalPrompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    }
                } else {
                    // Regular confirmation flow (not update)
                    // Continue with current state - ask next question
                    const stillMissing = missingField(callData.extractedData);
                    if (stillMissing) {
                        const nextPrompt = getSmartSilencePrompt(callData);
                        callData.lastQuestion = nextPrompt;
                        callData.messages.push({ role: "assistant", text: nextPrompt, timestamp: new Date() });
                        
                        // ✅ CLEAN DEBUGGER (with error handling)
                        try {
                            logTurn(callData.turnCount, userInput, nextPrompt, callData, 'machine_update_confirmed');
                        } catch (err) {
                            console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${nextPrompt}"`);
                        }
                        
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, nextPrompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    } else {
                        // All data collected - go to final confirmation
                        callData.awaitingFinalConfirm = true;
                        const finalPrompt = "Aur koi problem toh nahi machine mein? Save kar dun complaint?";
                        callData.lastQuestion = finalPrompt;
                        callData.messages.push({ role: "assistant", text: finalPrompt, timestamp: new Date() });
                        
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, finalPrompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    }
                }
            } else {
                // User said no - machine number is wrong, ask again
                console.log(`   🔄 Machine number rejected - asking again`);
                callData.extractedData.machine_no = null;
                callData.customerData = null;
                callData.machineValidated = false;
                
                // If in update flow, stay in UPDATE_MACHINE state
                if (callData.inUpdateFlow) {
                    console.log(`   🔄 [UPDATE FLOW] Staying in UPDATE_MACHINE state`);
                    updateState(callData, STATES.UPDATE_MACHINE, callData.turnCount);
                    callData.awaitingMachineUpdateInput = true;
                    callData.pendingMachineUpdateValidation = false;
                }
                
                const prompt = "Theek hai. Sahi machine number bataiye.";
                callData.lastQuestion = prompt;
                callData.messages.push({ role: "assistant", text: prompt, timestamp: new Date() });
                
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional', callSid: CallSid });
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
                prompt = `${callData.extractedData.city} branch sahi hai? Haan ya nahi boliye.`;
            } else {
                // Different city and branch - explain which branch will serve
                prompt = `Aapki machine ${callData.extractedData.city} mein hai? ${callData.extractedData.branch} branch se engineer aayega. Theek hai?`;
            }
            
            callData.lastQuestion = prompt;
            console.log(`   🗺️  City confirmation prompt - ${callData.extractedData.city} → ${callData.extractedData.branch}`);
            activeCalls.set(CallSid, callData);
            await speak(twiml, prompt, { emotion: 'professional' });
            return res.type("text/xml").send(twiml.toString());
        }

        if (callData.awaitingCityConfirm) {
            callData.awaitingCityConfirm = false;
            const isNo = /(nahi|nhi|no|galat|wrong|nai)/i.test(lo);
            if (!isNo) {
                callData.cityConfirmed = true;
                console.log(`   ✅ City confirmed: ${callData.extractedData.city}`);
                // Continue to next step - don't call AI
                console.log(`   ➡️  City confirmation complete - continuing to next step`);
            } else {
                callData.extractedData.city = null;
                callData.extractedData.city_id = null;
                callData.extractedData.branch = null;
                const prompt = "Achha, apni nearest city ka naam dobara bataiye.";
                callData.lastQuestion = prompt;
                console.log(`   🔄 City rejected - asking again`);
                activeCalls.set(CallSid, callData);
                await speak(twiml, prompt, { emotion: 'professional' });
                return res.type("text/xml").send(twiml.toString());
            }
        }

        // ── STEP 9: Check for side questions (AFTER confirmations) ────────
        let sideQuestionAnswer = null;
        const earlyAnswer = answerSideQuestion(userInput, callData);
        if (earlyAnswer) {
            console.log(`   💡 Side question detected - answering: "${earlyAnswer}"`);
            callData.messages.push({ role: "assistant", text: earlyAnswer, timestamp: new Date() });
            sideQuestionAnswer = earlyAnswer;
            
            // Store side question answer but DON'T return/exit
            // Continue to LLM to ask the next required question
            console.log(`   ➡️  Side question answered - continuing to LLM for next question`);
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

        // ── STEP 12: "Aur kuch bhi?" final confirmation ──────────────
        // Triggered once all fields are collected — ask before submit
        const missing = missingField(callData.extractedData);
        const machineValidated = !!callData.customerData;

        if (!missing && machineValidated && !callData.awaitingFinalConfirm) {
            const sideAnswer = answerSideQuestion(userInput);
            if (sideAnswer && !isPositiveConfirmation(lo) && !isAddMoreProblem(lo) && !isNegativeConfirmation(lo)) {
                callData.awaitingFinalConfirm = true;
                console.log(`   💬 Side question answered - proceeding to final confirmation`);
                activeCalls.set(CallSid, callData);
                await sayFinal(twiml, sideAnswer, { emotion: 'professional' });
                return await handleSubmit(callData, twiml, res, CallSid);
            }

            callData.awaitingFinalConfirm = true;
            const prompt = "Aur koi problem toh nahi machine mein? Save kar dun complaint?";
            callData.lastQuestion = prompt;
            console.log(`   ✅ All data collected - asking final confirmation`);
            activeCalls.set(CallSid, callData);
            await speak(twiml, prompt, { emotion: 'professional' });
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 13: Handle final confirm answer ─────────────────────
        if (callData.awaitingFinalConfirm) {
            const addingMore = extractAllComplaintTitles(userInput);
            const isConfirming = isPositiveConfirmation(lo);
            const isNegative = isNegativeConfirmation(lo);
            const wantsMore = isAddMoreProblem(lo);

            /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               🗂️  LEGACY CODE: Hardcoded Correction Detection (DISABLED)
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
               
               This hardcoded pattern-based correction detection has been disabled
               in favor of LLM-based intelligent handling through function calls.
               
               The LLM now handles all user intents (corrections, side questions,
               confirmations) by calling appropriate functions (update_machine_number,
               update_complaint, etc.) which provides more flexibility and handles
               any phrasing (English, Hindi, Devanagari, dialect).
               
               Keeping this code here as reference/legacy but not executing it.
               
               ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
            
            // LEGACY CODE START (COMMENTED OUT)
            /*
            // ── STEP 13.1: Check for correction requests FIRST (before treating as decline) ──────────
            // User might say "machine number galat hai" which contains "galat/nahi" but is NOT a decline
            const correctionPatterns = {
                machine_no: {
                    pattern: /(machine|मशीन|chassis)\s*(number|नंबर|नम्बर)?\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                    fieldName: 'machine_no',
                    promptText: 'Theek hai, sahi machine number bataiye.'
                },
                complaint_title: {
                    pattern: /(complaint|problem|dikkat|समस्या|परेशानी)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                    fieldName: 'complaint_title',
                    promptText: 'Theek hai, sahi problem bataiye.'
                },
                city: {
                    pattern: /(city|shahar|शहर|location)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                    fieldName: 'city',
                    promptText: 'Theek hai, sahi shahar bataiye.'
                },
                customer_phone: {
                    pattern: /(phone|mobile|number|नंबर|फोन)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                    fieldName: 'customer_phone',
                    promptText: 'Theek hai, sahi phone number bataiye.'
                },
                machine_status: {
                    pattern: /(status|band|chal\s*rahi|बंद|चल\s*रही)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                    fieldName: 'machine_status',
                    promptText: 'Theek hai, machine band hai ya chal rahi hai?'
                }
            };
            
            let correctionDetected = false;
            let correctedField = null;
            let askAgainPrompt = null;
            
            for (const [fieldKey, config] of Object.entries(correctionPatterns)) {
                if (callData.extractedData[config.fieldName] && config.pattern.test(userInput)) {
                    console.log(`   🔄 [CORRECTION DURING FINAL CONFIRM] User wants to change ${config.fieldName}`);
                    console.log(`   📝 Current value: ${callData.extractedData[config.fieldName]}`);
                    console.log(`   🗣️  User said: "${userInput}"`);
                    
                    correctionDetected = true;
                    correctedField = config.fieldName;
                    askAgainPrompt = config.promptText;
                    
                    // Try to extract new value from user input
                    const extractedData = extractAllData(userInput, {});
                    
                    if (extractedData[config.fieldName]) {
                        // User provided new value in same sentence
                        console.log(`   ✅ [CORRECTION] New value detected: ${extractedData[config.fieldName]}`);
                        
                        // Update the field
                        const oldValue = callData.extractedData[config.fieldName];
                        callData.extractedData[config.fieldName] = extractedData[config.fieldName];
                        
                        // Special handling for city (update related fields)
                        if (config.fieldName === 'city') {
                            const matched = matchServiceCenter(extractedData[config.fieldName]);
                            if (matched) {
                                callData.extractedData.city = matched.city_name;
                                callData.extractedData.city_id = matched.branch_code;
                                callData.extractedData.branch = matched.branch_name;
                                callData.extractedData.outlet = matched.city_name;
                                callData.extractedData.lat = matched.lat;
                                callData.extractedData.lng = matched.lng;
                                console.log(`   🗺️  ${oldValue} → ${matched.city_name}`);
                            }
                        }
                        
                        // Special handling for machine_no (need to re-validate)
                        if (config.fieldName === 'machine_no') {
                            callData.customerData = null;
                            callData.machineValidated = false;
                            console.log(`   🔄 [CORRECTION] Machine number changed, will re-validate`);
                        }
                        
                        console.log(`   ✅ [CORRECTION] Updated: ${oldValue} → ${extractedData[config.fieldName]}`);
                        
                        // Clear final confirmation flag and continue flow
                        callData.awaitingFinalConfirm = false;
                        callData.messages.push({ role: "assistant", text: `Theek hai, ${config.fieldName} update kar diya.`, timestamp: new Date() });
                        
                        // ✅ CLEAN DEBUGGER (with error handling)
                        try {
                            logTurn(callData.turnCount, userInput, `Theek hai, ${config.fieldName} update kar diya.`, callData, null);
                        } catch (err) {
                            console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "Theek hai, ${config.fieldName} update kar diya."`);
                        }
                        
                        activeCalls.set(CallSid, callData);
                        
                        // Continue with normal flow (will ask next missing field or final confirm again)
                        const stillMissing = missingField(callData.extractedData);
                        const machineValidated = !!callData.customerData;
                        
                        if (!stillMissing && machineValidated) {
                            // All data still complete - ask final confirmation again
                            const finalPrompt = "Aur koi problem toh nahi machine mein? Save kar dun complaint?";
                            callData.lastQuestion = finalPrompt;
                            callData.awaitingFinalConfirm = true;
                            callData.messages.push({ role: "assistant", text: finalPrompt, timestamp: new Date() });
                            
                            // ✅ CLEAN DEBUGGER (with error handling)
                            try {
                                logTurn(callData.turnCount + 1, "", finalPrompt, callData, null);
                            } catch (err) {
                                console.log(`🔄 TURN ${callData.turnCount + 1} | AGENT: "${finalPrompt}"`);
                            }
                            
                            activeCalls.set(CallSid, callData);
                            await speak(twiml, finalPrompt, { emotion: 'professional', callSid: CallSid });
                            return res.type("text/xml").send(twiml.toString());
                        } else {
                            // Need to collect more data - continue normal flow
                            // Will be handled by the main LLM flow below
                            break;
                        }
                    } else {
                        // User didn't provide new value - ask for it
                        console.log(`   ❓ [CORRECTION] No new value provided, asking for it`);
                        
                        // Clear the field so it will be asked again
                        callData.extractedData[config.fieldName] = null;
                        
                        // Clear final confirmation flag
                        callData.awaitingFinalConfirm = false;
                        
                        // Ask for the field again
                        callData.lastQuestion = askAgainPrompt;
                        callData.messages.push({ role: "assistant", text: askAgainPrompt, timestamp: new Date() });
                        
                        // ✅ CLEAN DEBUGGER (with error handling)
                        try {
                            logTurn(callData.turnCount, userInput, askAgainPrompt, callData, null);
                        } catch (err) {
                            console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${askAgainPrompt}"`);
                        }
                        
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, askAgainPrompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    }
                    
                    break;
                }
            }
            
            // If correction was detected and handled, we already returned above
            // Continue with normal final confirmation flow if no correction detected
            */
            // LEGACY CODE END

            // ── NEW APPROACH: Let LLM handle everything through function calls ──────────────
            // Instead of hardcoded patterns, we let the LLM understand user intent and call
            // appropriate functions (update_machine_number, update_complaint, etc.)
            // This handles ANY phrasing in ANY language and maintains conversational flow.
            
            // Only handle explicit negative confirmation (user clearly declining)
            // Everything else (corrections, side questions, etc.) goes to LLM
            if (isNegative && !wantsMore && !isConfirming) {
                // User explicitly declined (said "nahi" without any other context)
                console.log(`   ❌ User declined final confirmation - ending call`);
                const declineMessage = "Theek hai. Agar kuch aur ho toh dobara call karein. Dhanyavaad!";
                
                // ✅ CLEAN DEBUGGER - Log the decline turn
                try {
                    logTurn(callData.turnCount, userInput, declineMessage, callData, null);
                } catch (err) {
                    console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${declineMessage}"`);
                }
                
                await sayFinal(twiml, declineMessage, { context: 'farewell', emotion: 'professional', callSid: CallSid });
                twiml.hangup();
                
                // ✅ CLEAN DEBUGGER - Log call end
                try {
                    logCallEnd(CallSid, 'user_declined', callData);
                } catch (err) {
                    console.log(`📞 CALL END | Reason: user_declined`);
                }
                
                performanceLogger.endSession(CallSid, 'user_declined');
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }
            
            // For everything else (corrections, side questions, confirmations), clear the flag
            // and let LLM handle it through function calls
            console.log(`   🤖 [FINAL CONFIRM] Passing to LLM for intelligent handling`);
            callData.awaitingFinalConfirm = false;
            // Fall through to LLM section below
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
            // Safety net — shouldn't reach here normally (caught in step 9)
            callData.awaitingFinalConfirm = true;
            const fallbackPrompt = "Aur koi problem toh nahi? Save kar dun?";
            callData.lastQuestion = fallbackPrompt;
            console.log(`   ⚠️  Reached AI section with complete data - using hardcoded fallback`);
            activeCalls.set(CallSid, callData);
            await speak(twiml, fallbackPrompt, { emotion: 'professional' });
            return res.type("text/xml").send(twiml.toString());
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           🗂️  LEGACY CODE: STEP 15 Correction Detection (DISABLED)
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           
           This hardcoded pattern-based correction detection has been disabled
           in favor of LLM-based intelligent handling through function calls.
           
           The LLM now handles all corrections by calling update_* functions
           (update_machine_number, update_complaint, etc.) which provides more
           flexibility and handles any phrasing.
           
           Keeping this code here as reference/legacy but not executing it.
           
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        // LEGACY CODE START (COMMENTED OUT)
        /*
        // ── STEP 15: CORRECTION DETECTION (Allow users to fix wrong data) ──────────────────────────
        // Detect if user wants to correct/change already captured data
        const userInputLower = userInput.toLowerCase();
        
        // Correction patterns for each field
        const correctionPatterns = {
            machine_no: {
                pattern: /(machine|मशीन|chassis)\s*(number|नंबर|नम्बर)?\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                fieldName: 'machine_no',
                promptText: 'Theek hai, sahi machine number bataiye.'
            },
            complaint_title: {
                pattern: /(complaint|problem|dikkat|समस्या|परेशानी)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                fieldName: 'complaint_title',
                promptText: 'Theek hai, sahi problem bataiye.'
            },
            city: {
                pattern: /(city|shahar|शहर)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                fieldName: 'city',
                promptText: 'Theek hai, sahi shahar bataiye.'
            },
            customer_phone: {
                pattern: /(phone|mobile|number|नंबर|फोन)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                fieldName: 'customer_phone',
                promptText: 'Theek hai, sahi phone number bataiye.'
            },
            machine_status: {
                pattern: /(status|band|chal\s*rahi|बंद|चल\s*रही)\s*(galat|wrong|गलत|sahi nahi|ठीक नहीं|change|बदल|nahi|नहीं)/i,
                fieldName: 'machine_status',
                promptText: 'Theek hai, machine band hai ya chal rahi hai?'
            }
        };
        
        // Check if user is trying to correct any field
        let correctionDetected = false;
        let correctedField = null;
        
        for (const [fieldKey, config] of Object.entries(correctionPatterns)) {
            // Only check if field is already captured
            if (callData.extractedData[config.fieldName] && config.pattern.test(userInput)) {
                console.log(`   🔄 [CORRECTION DETECTED] User wants to change ${config.fieldName}`);
                console.log(`   📝 Current value: ${callData.extractedData[config.fieldName]}`);
                console.log(`   🗣️  User said: "${userInput}"`);
                
                correctionDetected = true;
                correctedField = config.fieldName;
                
                // Try to extract new value from user input
                const extractedData = extractAllData(userInput, {});
                
                if (extractedData[config.fieldName]) {
                    // User provided new value in same sentence
                    console.log(`   ✅ [CORRECTION] New value detected: ${extractedData[config.fieldName]}`);
                    
                    // Update the field with new value
                    callData.extractedData[config.fieldName] = extractedData[config.fieldName];
                    
                    // Special handling for city (update related fields)
                    if (config.fieldName === 'city') {
                        const mc = matchServiceCenter(extractedData.city);
                        if (mc) {
                            callData.extractedData.city = mc.city_name;
                            callData.extractedData.city_id = mc.branch_code;
                            callData.extractedData.branch = mc.branch_name;
                            callData.extractedData.outlet = mc.city_name;
                            callData.extractedData.lat = mc.lat;
                            callData.extractedData.lng = mc.lng;
                            console.log(`   ✅ [CORRECTION] City updated to: ${mc.city_name}`);
                        }
                    }
                    
                    // Special handling for phone (validate format)
                    if (config.fieldName === 'customer_phone') {
                        const phone = extractedData.customer_phone;
                        if (!/^[6-9]\d{9}$/.test(phone)) {
                            console.warn(`   ⚠️  [CORRECTION] Invalid phone format: ${phone}`);
                            callData.extractedData.customer_phone = null;
                            const invalidPrompt = "Phone number sahi nahi hai. 10 digit ka number bataiye jo 6, 7, 8, ya 9 se shuru hota hai.";
                            callData.lastQuestion = invalidPrompt;
                            callData.messages.push({ role: "assistant", text: invalidPrompt, timestamp: new Date() });
                            activeCalls.set(CallSid, callData);
                            await speak(twiml, invalidPrompt, { emotion: 'professional', callSid: CallSid });
                            return res.type("text/xml").send(twiml.toString());
                        }
                    }
                    
                    // Confirm the correction
                    const confirmPrompt = `Theek hai, ${config.fieldName === 'machine_no' ? 'machine number' : 
                                                        config.fieldName === 'complaint_title' ? 'complaint' :
                                                        config.fieldName === 'city' ? 'city' :
                                                        config.fieldName === 'customer_phone' ? 'phone number' :
                                                        'status'} update kar diya. ${missing ? 'Ab ' + (missing === 'machine_no' ? 'machine number' :
                                                                                                        missing === 'complaint_title' ? 'complaint' :
                                                                                                        missing === 'machine_status' ? 'machine status' :
                                                                                                        missing === 'city' ? 'city' :
                                                                                                        'phone number') + ' bataiye.' : 'Aur koi problem? Save kar dun?'}`;
                    
                    callData.lastQuestion = confirmPrompt;
                    callData.messages.push({ role: "assistant", text: confirmPrompt, timestamp: new Date() });
                    activeCalls.set(CallSid, callData);
                    
                    console.log(`   ✅ [CORRECTION COMPLETE] ${config.fieldName} updated successfully`);
                    console.log(`   📝 New value: ${callData.extractedData[config.fieldName]}`);
                    
                    await speak(twiml, confirmPrompt, { emotion: 'professional', callSid: CallSid });
                    return res.type("text/xml").send(twiml.toString());
                    
                } else {
                    // User said it's wrong but didn't provide new value
                    console.log(`   ⚠️  [CORRECTION] No new value provided, asking again`);
                    
                    // Clear the field so it can be re-captured
                    callData.extractedData[config.fieldName] = null;
                    
                    // Clear related fields for city
                    if (config.fieldName === 'city') {
                        callData.extractedData.city_id = null;
                        callData.extractedData.branch = null;
                        callData.extractedData.outlet = null;
                        callData.extractedData.lat = null;
                        callData.extractedData.lng = null;
                    }
                    
                    // Ask for the field again
                    const askAgainPrompt = config.promptText;
                    callData.lastQuestion = askAgainPrompt;
                    callData.messages.push({ role: "assistant", text: askAgainPrompt, timestamp: new Date() });
                    activeCalls.set(CallSid, callData);
                    
                    console.log(`   ✅ [CORRECTION] Field cleared, asking again: "${askAgainPrompt}"`);
                    
                    await speak(twiml, askAgainPrompt, { emotion: 'professional', callSid: CallSid });
                    return res.type("text/xml").send(twiml.toString());
                }
            }
        }
        
        // If correction was detected and handled, we already returned above
        // Continue with normal flow if no correction detected
        */
        // LEGACY CODE END
        
        // LLM-FIRST: Let AI handle the conversation with full context
        // console.log(`   🤖 Calling AI with enhanced context (turn ${callData.turnCount}, attempts ${callData.machineNumberAttempts || 0})...`);
        
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
        // console.log(`   💬 AI Response: "${aiResp.text}"`);
        
        // ✅ CLEAN DEBUGGER - Log the turn
        let functionCalledName = null;
        
        // ── STEP 14.5: Handle Function Calls (Phase 1) ────────────────────────────────────
        if (aiResp.functionCalls && aiResp.functionCalls.length > 0) {
            // console.log(`   🔧 [FUNCTION CALLS] Processing ${aiResp.functionCalls.length} function call(s)`);
            
            // Initialize function execution log if not exists
            if (!callData.functionExecutionLog) {
                callData.functionExecutionLog = [];
            }
            
            for (const functionCall of aiResp.functionCalls) {
                const result = await executeFunctionCall(functionCall.function, callData);
                
                // ── HANDLE alreadyValidated: Machine already validated, ignore redundant update ────
                if (result.alreadyValidated) {
                    console.log(`   ✅ [ALREADY VALIDATED] ${functionCall.function.name} - machine already validated, ignoring redundant update`);
                    console.log(`   📋 Continuing with current validated data`);
                    // Don't return, just skip this function and continue with flow
                    continue;
                }
                
                // ── HANDLE needsInput: Function needs more input from user ──────────────────
                if (result.needsInput) {
                    console.log(`   📥 [NEEDS INPUT] Function ${functionCall.function.name} needs: ${result.waitingFor}`);
                    console.log(`   💬 [HARDCODED PROMPT] "${result.prompt}"`);
                    
                    // Check if we need to enter UPDATE_MACHINE state
                    if (result.enterUpdateState) {
                        console.log(`   🔄 [ENTER UPDATE STATE] Transitioning to UPDATE_MACHINE state`);
                        updateState(callData, STATES.UPDATE_MACHINE, callData.turnCount);
                    }
                    
                    // Mark that we're waiting for function input
                    callData.waitingForFunctionInput = result.waitingFor;
                    callData.pendingFunctionName = functionCall.function.name;
                    callData.lastQuestion = result.prompt;
                    callData.messages.push({ role: "assistant", text: result.prompt, timestamp: new Date() });
                    
                    // ✅ CLEAN DEBUGGER (with error handling)
                    try {
                        logTurn(callData.turnCount, userInput, result.prompt, callData, `${functionCall.function.name}[needsInput]`);
                    } catch (err) {
                        console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${result.prompt}"`);
                    }
                    
                    activeCalls.set(CallSid, callData);
                    await speak(twiml, result.prompt, { emotion: 'professional', callSid: CallSid });
                    return res.type("text/xml").send(twiml.toString());
                }
                
                // ── HANDLE needsValidation: Trigger validation flow (for machine number updates) ────
                if (result.needsValidation && functionCall.function.name === 'update_machine_number') {
                    console.log(`   🔍 [NEEDS VALIDATION] Machine number updated - triggering validation flow`);
                    
                    // Check if we're in update flow
                    if (result.inUpdateFlow) {
                        console.log(`   🔄 [UPDATE FLOW] In update flow - will use UPDATE_MACHINE_VALIDATE state`);
                        updateState(callData, STATES.UPDATE_MACHINE_VALIDATE, callData.turnCount);
                    }
                    
                    // Clear customer data to force re-validation
                    callData.customerData = null;
                    callData.machineValidated = false;
                    callData.machineNumberAttempts = 0;
                    
                    // Validate the new machine number
                    const v = await validateMachineNumber(callData.extractedData.machine_no);
                    
                    if (v.valid) {
                        callData.customerData = v.data;
                        callData.extractedData.customer_name = v.data.name;
                        callData.machineValidated = true; // Mark as validated
                        console.log(`   ✅ Machine validated: ${v.data.name} | ${v.data.city} | ${v.data.model}`);
                        
                        // Check if we're in update flow
                        if (result.inUpdateFlow) {
                            console.log(`   🔄 [UPDATE FLOW] Transitioning to UPDATE_MACHINE_CONFIRM state`);
                            updateState(callData, STATES.UPDATE_MACHINE_CONFIRM, callData.turnCount);
                            callData.pendingMachineUpdateValidation = false;
                            callData.awaitingMachineUpdateConfirm = true;
                        } else {
                            // Regular validation flow (not update)
                            callData.awaitingMachineUpdateConfirm = true;
                        }
                        
                        // Ask for confirmation with customer name
                        const confirmPrompt = `Theek hai. ${callData.extractedData.machine_no}, ${toTitleCase(v.data.name)}. Yeh sahi hai?`;
                        callData.lastQuestion = confirmPrompt;
                        callData.messages.push({ role: "assistant", text: confirmPrompt, timestamp: new Date() });
                        
                        // ✅ CLEAN DEBUGGER (with error handling)
                        try {
                            logTurn(callData.turnCount, userInput, confirmPrompt, callData, `${functionCall.function.name}[validation]`);
                        } catch (err) {
                            console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${confirmPrompt}"`);
                        }
                        
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, confirmPrompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    } else {
                        // Validation failed - ask for correct number
                        console.warn(`   ❌ Machine validation failed for: ${callData.extractedData.machine_no}`);
                        callData.extractedData.machine_no = null; // Clear invalid number
                        
                        // If in update flow, stay in UPDATE_MACHINE state
                        if (result.inUpdateFlow) {
                            console.log(`   🔄 [UPDATE FLOW] Validation failed - staying in UPDATE_MACHINE state`);
                            updateState(callData, STATES.UPDATE_MACHINE, callData.turnCount);
                            callData.pendingMachineUpdateValidation = false;
                            callData.awaitingMachineUpdateInput = true;
                        }
                        
                        const errorPrompt = "Yeh machine number sahi nahi hai. Dobara bataiye.";
                        callData.lastQuestion = errorPrompt;
                        callData.messages.push({ role: "assistant", text: errorPrompt, timestamp: new Date() });
                        
                        activeCalls.set(CallSid, callData);
                        await speak(twiml, errorPrompt, { emotion: 'professional', callSid: CallSid });
                        return res.type("text/xml").send(twiml.toString());
                    }
                }
                
                // ── HANDLE continueWithState: Function completed, continue with flow ────────
                if (result.continueWithState) {
                    console.log(`   ✅ [FUNCTION COMPLETE] ${functionCall.function.name} - continuing with current state`);
                    // Don't return here - let the flow continue to ask next question
                }
                
                // Track function name for clean debugger
                if (!functionCalledName) {
                    const args = JSON.parse(functionCall.function.arguments || '{}');
                    const argKeys = Object.keys(args);
                    const firstArg = argKeys.length > 0 ? `${argKeys[0]}="${args[argKeys[0]]}"` : '';
                    functionCalledName = `${functionCall.function.name}(${firstArg})`;
                }
                
                // Track function execution
                const executionRecord = {
                    turn: callData.turnCount,
                    name: functionCall.function.name,
                    arguments: functionCall.function.arguments,
                    result: result.success ? 'success' : 'failed',
                    message: result.message,
                    timestamp: new Date().toISOString()
                };
                
                callData.functionExecutionLog.push(executionRecord);
                
                // Keep only last 20 function calls to avoid memory bloat
                if (callData.functionExecutionLog.length > 20) {
                    callData.functionExecutionLog = callData.functionExecutionLog.slice(-20);
                }
                
                // if (result.success) {
                //     console.log(`   ✅ [FUNCTION SUCCESS] ${functionCall.function.name}: ${result.message}`);
                // } else {
                //     console.warn(`   ⚠️  [FUNCTION FAILED] ${functionCall.function.name}: ${result.message}`);
                // }
            }
            
            // After executing functions, check if we need to ask next question
            const stillMissing = missingField(callData.extractedData);
            
            if (!stillMissing && machineValidated) {
                // All data collected - go to final confirmation
                // console.log(`   ✅ [FUNCTION CALLS] All data collected after function execution`);
                callData.awaitingFinalConfirm = true;
                const finalPrompt = "Aur koi problem toh nahi machine mein? Save kar dun complaint?";
                callData.lastQuestion = finalPrompt;
                callData.messages.push({ role: "assistant", text: finalPrompt, timestamp: new Date() });
                
                // ✅ CLEAN DEBUGGER (with error handling)
                try {
                    logTurn(callData.turnCount, userInput, finalPrompt, callData, functionCalledName);
                } catch (err) {
                    console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${finalPrompt}"`);
                }
                
                activeCalls.set(CallSid, callData);
                await speak(twiml, finalPrompt, { emotion: 'professional', callSid: CallSid });
                return res.type("text/xml").send(twiml.toString());
            } else if (stillMissing) {
                // Still missing data - ask for next field
                // console.log(`   ➡️  [FUNCTION CALLS] Still missing: ${stillMissing}`);
                const nextPrompt = getSmartSilencePrompt(callData);
                callData.lastQuestion = nextPrompt;
                callData.messages.push({ role: "assistant", text: nextPrompt, timestamp: new Date() });
                
                // ✅ CLEAN DEBUGGER (with error handling)
                try {
                    logTurn(callData.turnCount, userInput, nextPrompt, callData, functionCalledName);
                } catch (err) {
                    console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${nextPrompt}"`);
                }
                
                activeCalls.set(CallSid, callData);
                await speak(twiml, nextPrompt, { emotion: 'professional', callSid: CallSid });
                return res.type("text/xml").send(twiml.toString());
            }
            
            // If we reach here, continue with AI response
            // console.log(`   ➡️  [FUNCTION CALLS] Continuing with AI response`);
        }
        
        // ⚡ PARALLEL OPTIMIZATION: Start validation and data merging
        const validationStartTime = Date.now();
        
        // Validate AI response quality - must have a question or clear instruction
        const isGoodResponse = aiResp.text && (
            aiResp.text.includes("?") || 
            aiResp.text.includes("bataiye") || 
            aiResp.text.includes("boliye") ||
            aiResp.text.includes("chahiye") ||
            aiResp.text.includes("batao") ||
            aiResp.text.includes("bolo") ||
            aiResp.text.includes("dijiye") ||
            aiResp.text.length > 15
        );
        
        // Additional check: Don't allow "registering complaint" statements when fields are missing
        const hasRegisteringStatement = /complaint\s+(register|save|kar\s+di|ho\s+gayi|kar\s+rahi)/i.test(aiResp.text);
        const allFieldsCollected = !missingField(callData.extractedData) && machineValidated;
        
        if (hasRegisteringStatement && !allFieldsCollected) {
            console.warn(`   ⚠️  AI said "registering complaint" but fields missing - blocking response`);
            // FALLBACK: Use hardcoded smart prompt based on what's missing
            const fallbackPrompt = getSmartSilencePrompt(callData);
            aiResp.text = fallbackPrompt;
            console.log(`   🔄 Using hardcoded fallback prompt: "${fallbackPrompt}"`);
        } else if (!isGoodResponse) {
            console.warn(`   ⚠️  AI response validation failed - too short or unclear`);
            // FALLBACK: Use hardcoded smart prompt based on what's missing
            const fallbackPrompt = getSmartSilencePrompt(callData);
            aiResp.text = fallbackPrompt;
            console.log(`   🔄 Using hardcoded fallback prompt: "${fallbackPrompt}"`);
        } else {
            console.log(`   ✅ AI response validated and approved`);
        }
        
        // Track the question being asked
        callData.lastQuestion = aiResp.text;

        // Merge AI-extracted data (fast operation - don't wait)
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

        const validationEndTime = Date.now();
        console.log(`   ⚡ [PARALLEL] Validation completed in ${validationEndTime - validationStartTime}ms`);

        // ── AGGRESSIVE MANUAL EXTRACTION: If still missing required field, extract again ──
        // This catches cases where LLM didn't call function AND regex didn't match
        const stillMissingBeforeCheck = missingField(callData.extractedData);
        if (stillMissingBeforeCheck) {
            console.log(`   🔍 [MANUAL EXTRACTION] Still missing "${stillMissingBeforeCheck}" - attempting aggressive extraction`);
            
            // Try extracting from user input again with current data
            const manualExtract = extractAllData(userInput, callData.extractedData);
            
            let extracted = false;
            for (const [k, v] of Object.entries(manualExtract)) {
                if (v && !callData.extractedData[k]) {
                    callData.extractedData[k] = v;
                    console.log(`   ✅ [MANUAL EXTRACTION] Captured ${k}: ${v}`);
                    extracted = true;
                }
            }
            
            // Special handling for city
            if (callData.extractedData.city && !callData.extractedData.city_id) {
                const mc = matchServiceCenter(callData.extractedData.city);
                if (mc) {
                    callData.extractedData.city = mc.city_name;
                    callData.extractedData.city_id = mc.branch_code;
                    callData.extractedData.branch = mc.branch_name;
                    callData.extractedData.outlet = mc.city_name;
                    callData.extractedData.lat = mc.lat;
                    callData.extractedData.lng = mc.lng;
                    console.log(`   ✅ [MANUAL EXTRACTION] City matched: ${mc.city_name}`);
                }
            }
            
            if (!extracted) {
                console.log(`   ⚠️  [MANUAL EXTRACTION] Could not extract "${stillMissingBeforeCheck}" from user input`);
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
            
            // ⚡ PARALLEL: TTS will be called by speak() function
            console.log(`   ⚡ [PARALLEL] Starting TTS generation for final question...`);
            await speak(twiml, finalQuestion, { emotion: 'professional', callSid: CallSid });
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
            
            // ✅ CLEAN DEBUGGER - Log submission (with error handling)
            try {
                logSubmission(callData, result);
            } catch (err) {
                console.log(`✅ COMPLAINT SUBMITTED | Machine: ${callData.extractedData.machine_no}`);
            }
            
            const id = result.sapId || result.jobId || "";
            
            if (id) {
                const idFormatted = formatNumberForTTS(id);
                await sayFinal(twiml, `Humne aapki complaint register kar di hai. Number hai ${idFormatted}. Engineer jaldi contact karega. Dhanyavaad!`, { context: 'confirmation', emotion: 'professional' });
            } else {
                await sayFinal(twiml, "Humne aapki complaint register kar di hai. Engineer jaldi contact karega. Dhanyavaad!", { context: 'confirmation', emotion: 'professional' });
            }
            twiml.hangup();
            
            // ✅ CLEAN DEBUGGER - Log call end (with error handling)
            try {
                logCallEnd(CallSid, 'complaint_submitted', callData.extractedData);
            } catch (err) {
                console.log(`📞 CALL END | Reason: complaint_submitted`);
            }
            
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
        activeCalls.set(CallSid, callData);
        
        // Log turn completion
        serviceLogger.logTurn(CallSid);
        
        // ✅ CLEAN DEBUGGER - Log the complete turn (with error handling)
        try {
            logTurn(callData.turnCount, userInput, aiResp.text, callData, functionCalledName);
        } catch (err) {
            console.log(`🔄 TURN ${callData.turnCount} | USER: "${userInput}" | AGENT: "${aiResp.text}"`);
        }
        
        // ⚡ PARALLEL: Start TTS generation immediately
        // console.log(`   ⚡ [PARALLEL] Starting TTS generation...`);
        const ttsStartTime = Date.now();
        
        // If we answered a side question, combine both responses
        if (sideQuestionAnswer) {
            // console.log(`   📢 Combining side question answer + LLM response`);
            const combinedText = `${sideQuestionAnswer} ${aiResp.text}`;
            await speak(twiml, combinedText, { emotion: 'professional', callSid: CallSid });
        } else {
            await speak(twiml, aiResp.text, { emotion: 'professional', callSid: CallSid });
        }
        
        const ttsEndTime = Date.now();
        // console.log(`   ⚡ [PARALLEL] TTS completed in ${ttsEndTime - ttsStartTime}ms`);
        // console.log(`   ⚡ [PARALLEL] Total turn time: ${ttsEndTime - turnStartTime}ms`);
        
        // Complete turn timing
        performanceLogger.completeTurn(CallSid);
        
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        // console.error("❌ [PROCESS]", err.message);
        
        // ✅ CLEAN DEBUGGER - Log error (with error handling)
        try {
            logError('PROCESS', err);
        } catch (logErr) {
            console.error(`❌ ERROR in PROCESS: ${err.message}`);
        }
        
        // Complete turn timing even on error
        performanceLogger.completeTurn(CallSid);
        
        await sayFinal(twiml, "Thodi dikkat aa gayi ji. Engineer ko bhej raha hun.", { emotion: 'empathetic' });
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
        performanceLogger.endSession(CallSid, 'error');
        
        // ✅ CLEAN DEBUGGER - Log call end (with error handling)
        try {
            logCallEnd(CallSid, 'error', callData?.extractedData);
        } catch (logErr) {
            console.log(`📞 CALL END | Reason: error`);
        }
        
        activeCalls.delete(CallSid);
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 SUBMIT COMPLAINT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function handleSubmit(callData, twiml, res, CallSid) {
    // console.log("\n🚀 [SUBMITTING COMPLAINT]");
    const result = await submitComplaint(callData);
    
    // ✅ CLEAN DEBUGGER - Log submission (with error handling)
    try {
        logSubmission(callData, result);
    } catch (err) {
        console.log(`✅ COMPLAINT SUBMITTED | Machine: ${callData.extractedData.machine_no}`);
    }
    
    const id = result.sapId || result.jobId || "";

    if (id) {
        await sayFinal(twiml, `Humne aapki complaint register kar di hai. Number hai ${String(id).split("").join(" ")}. Engineer jaldi contact karega. Dhanyavaad!`, { context: 'confirmation', emotion: 'professional' });
    } else {
        await sayFinal(twiml, "Humne aapki complaint register kar di hai. Engineer jaldi contact karega. Dhanyavaad!", { context: 'confirmation', emotion: 'professional' });
    }

    twiml.hangup();
    
    // ✅ CLEAN DEBUGGER - Log call end (with error handling)
    try {
        logCallEnd(CallSid, 'complaint_submitted', callData.extractedData);
    } catch (err) {
        console.log(`📞 CALL END | Reason: complaint_submitted`);
    }
    
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
        // const apiStartTime = performanceLogger.getHighResTime();
        const r = await axios.post(COMPLAINT_URL, payload, {
            timeout: API_TIMEOUT,
            headers: { "Content-Type": "application/json", ...API_HEADERS },
            validateStatus: s => s < 500,
        });
        // const apiEndTime = performanceLogger.getHighResTime();
        
        // Log API performance timing
        // performanceLogger.logAPI(
        //     callSid,
        //     apiStartTime,
        //     apiEndTime,
        //     'complaint_submission',
        //     r.status !== 200 ? `HTTP ${r.status}` : null
        // );

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
        // const apiEndTime = performanceLogger.getHighResTime();
        // performanceLogger.logAPI(
        //     callSid,
        //     apiStartTime || performanceLogger.getHighResTime(),
        //     apiEndTime,
        //     'complaint_submission',
        //     err.message
        // );
        
        return { success: false };
    }
}

export default router;