import express from "express";
import twilio from "twilio";
import axios from "axios";
import {
    getSmartAIResponse,
    getAIResponse,
    extractEntities,
    extractAllData,
    extractAllComplaintTitles,
    sanitizeExtractedData,
    matchServiceCenter,
    validateExtracted,
} from "../utils/ai.js";
import { searchFAQ } from "../utils/faq.js";
import { generateSpeech, detectEmotionAndContext, formatNumbersForTTS } from "../utils/cartesia_tts.js";
import serviceLogger from "../utils/service_logger.js";
import performanceLogger from "../utils/performance_logger.js";

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CONFIG
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const activeCalls = new Map();
const BASE_URL    = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7";
const COMPLAINT_URL = `${BASE_URL}/ai_call_complaint.php`;
const API_TIMEOUT   = 12000;
const API_HEADERS   = { JCBSERVICEAPI: "MakeInJcb" };
const TTS_VOICE     = "Google.hi-IN-Standard-A";
const TTS_LANG      = "hi-IN";

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MISSING FIELD CHECK
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function missingField(d) {
    if (!d.machine_no || !/^\d{4,7}$/.test(d.machine_no))           return "machine_no";
    if (!d.complaint_title)                                           return "complaint_title";
    if (!d.machine_status)                                            return "machine_status";
    if (!d.city || !d.city_id)                                        return "city";
    if (!d.customer_phone || !/^[6-9]\d{9}/.test(d.customer_phone)) return "customer_phone";
    return null;
}

function normalizeSpeechText(text) {
    if (!text) return text;
    return String(text).trim()
        .replace(/\b([A-Za-z])(?:[\s,]+([A-Za-z])){2,}\b/g, match => match.replace(/[\s,]+/g, ""))
        .replace(/\b([A-Z]{2,})\b/g, match => {
            const preserve = new Set(["JCB", "AI", "TTS", "URL", "HTTP", "API"]);
            return preserve.has(match) ? match : match.charAt(0) + match.slice(1).toLowerCase();
        });
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TTS — speak() with gather (awaits response)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function speak(twiml, text, options = {}) {
    const formattedText = normalizeSpeechText(formatNumbersForTTS(text));
    const { emotion, context } = detectEmotionAndContext(formattedText);

    console.log(`🎤 [TTS] "${formattedText}"`);

    try {
        const cartesiaResult = await generateSpeech(formattedText, {
            emotion: options.emotion || emotion,
            context: options.context || context,
            speed: options.speed || 1.0,
            callSid: options.callSid,
        });

        if (cartesiaResult?.success) {
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
                hints: "haan,nahi,theek hai,sahi hai,machine,number,chassis,Jaipur,Kota,Ajmer,Udaipur,Bhilwara,ek,do,teen,char,paanch,saat,aath,nau",
            });
            gather.play(`${process.env.PUBLIC_URL}/stream-audio/${cartesiaResult.audioId}`);
            twiml.redirect(options.redirect || "/voice/process");
            return;
        }
    } catch (e) {
        console.warn(`⚠️  Cartesia failed: ${e.message}`);
    }

    // Fallback to Google TTS
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
        hints: "haan,nahi,theek,machine,number,chassis,Jaipur,Kota,Ajmer,Udaipur,Bhilwara,0,1,2,3,4,5,6,7,8,9",
        profanityFilter: false,
    });
    gather.say({ voice: TTS_VOICE, language: TTS_LANG }, formattedText);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TTS — sayFinal() no gather (end of call)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function sayFinal(twiml, text, options = {}) {
    const formattedText = normalizeSpeechText(formatNumbersForTTS(text));
    try {
        const cartesiaResult = await generateSpeech(formattedText, {
            emotion: options.emotion || 'professional',
            context: options.context || 'farewell',
            callSid: options.callSid,
        });
        if (cartesiaResult?.success) {
            twiml.play(`${process.env.PUBLIC_URL}/stream-audio/${cartesiaResult.audioId}`);
            return;
        }
    } catch (e) { /* ignore */ }
    twiml.say({ voice: TTS_VOICE, language: TTS_LANG }, formattedText);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   INITIAL CALL
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/", async (req, res) => {
    const { CallSid, From } = req.body;
    const { machine_no: preloadedMachineNo } = req.query;
    const callerPhone = From?.replace(/^\+91/, "").replace(/^\+/, "").slice(-10) || "";

    console.log(`\n${"═".repeat(60)}`);
    console.log(`📞 [NEW CALL] ${CallSid} | ${callerPhone}`);

    serviceLogger.initSession(CallSid, callerPhone);
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
            machineNumberAttempts: 0,
            existingComplaintId: null,
            awaitingFinalConfirm: false,
            // Phone confirm flags — LLM handles the question, these track DB state
            pendingPhoneConfirm: false,
            phoneConfirmDone: false,
        };

        // Preloaded machine number
        if (preloadedMachineNo) {
            const v = await validateMachineNumber(preloadedMachineNo);
            if (v.valid) {
                callData.customerData = v.data;
                callData.extractedData.machine_no     = v.data.machineNo;
                callData.extractedData.customer_name  = v.data.name;
                callData.pendingPhoneConfirm = true;
            }
        }

        activeCalls.set(CallSid, callData);

        // Greeting — natural, short
        const name = callData.customerData?.name;
        const firstName = name ? normalizeSpeechText(name.split(" ")[0]) : null;
        const greeting = firstName
            ? `Namaste ${firstName} ji, Rajesh Motors se Priya bol rahi hun. Machine mein kya problem hai?`
            : "Namaste ji, Rajesh Motors mein aapka swagat hai. Machine ka chassis number bataiye.";

        callData.messages.push({ role: "assistant", text: greeting, timestamp: new Date() });
        await speak(twiml, greeting, { context: 'greeting', emotion: 'friendly', callSid: CallSid });
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [START]", err.message);
        await sayFinal(twiml, "Thodi problem aa gayi ji. Thodi der baad call karein.");
        twiml.hangup();
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PROCESS USER INPUT
   
   ARCHITECTURE: PURE LLM-FIRST
   
   Flow per turn:
   1. Get input (DTMF or speech)
   2. Run fast regex extraction (data only, no responses)
   3. Run machine number validation if we have a candidate
   4. Feed everything to LLM — it generates the reply AND extracts data
   5. Handle special actions from LLM (escalate, submit)
   6. Speak LLM reply
   
   The LLM handles ALL of:
   - Side questions (engineer kab aayega?)
   - Frustration (3 din ho gaye)
   - Wait (ek minute)
   - Multi-complaint (engine + brake + hydraulic)
   - Phone confirmation
   - City confirmation
   - Old complaint detection
   - Final confirmation
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/process", async (req, res) => {
    const { CallSid, SpeechResult, Digits } = req.body;
    const twiml = new VoiceResponse();

    try {
        const callData = activeCalls.get(CallSid);
        if (!callData) {
            await sayFinal(twiml, "Dobara call karein ji.");
            twiml.hangup();
            return res.type("text/xml").send(twiml.toString());
        }

        callData.callSid  = CallSid;
        callData.CallSid  = CallSid;
        callData.turnCount++;

        const userInput   = (Digits || SpeechResult?.trim() || "").trim();
        const inputMethod = Digits ? "DTMF" : (SpeechResult ? "SPEECH" : "SILENCE");

        const turnStartTime = performanceLogger.getHighResTime();
        performanceLogger.startTurn(CallSid, callData.turnCount, { inputMethod });

        console.log(`\n${"─".repeat(60)}`);
        console.log(`🔄 [TURN ${callData.turnCount}] [${inputMethod}] "${userInput}"`);

        /* ── Hard turn limit ── */
        if (callData.turnCount > 25) {
            serviceLogger.endSession(CallSid, 'turn_limit');
            await sayFinal(twiml, "Engineer ko message kar diya ji. Dhanyavaad!", { context: 'farewell', callSid: CallSid });
            twiml.hangup();
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        /* ── Silence handling ── */
        if (!userInput || userInput.length < 2) {
            callData.silenceCount++;
            const maxSilence = callData.customerData ? 5 : 3;
            console.log(`   🔇 Silence ${callData.silenceCount}/${maxSilence}`);

            if (callData.silenceCount >= maxSilence) {
                serviceLogger.endSession(CallSid, 'silence_timeout');
                await sayFinal(twiml, "Awaaz nahi aa rahi ji. Dobara call kijiye.");
                twiml.hangup();
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }

            // Ask LLM what to say on silence too
            const silencePrompt = getSilenceFallbackText(callData);
            await speak(twiml, silencePrompt, { callSid: CallSid });
            activeCalls.set(CallSid, callData);
            return res.type("text/xml").send(twiml.toString());
        }

        callData.silenceCount = 0;
        callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });

        /* ── STEP 1: Fast regex extraction (no responses, data only) ── */
        callData.extractedData = sanitizeExtractedData(callData.extractedData);
        const rxData = extractAllData(userInput, callData.extractedData);
        for (const [k, v] of Object.entries(rxData)) {
            if (v && !callData.extractedData[k]) {
                callData.extractedData[k] = v;
                console.log(`   📋 Regex extracted ${k}: "${v}"`);
            }
        }

        // Multi-complaint accumulation
        const allComplaints = extractAllComplaintTitles(userInput);
        if (allComplaints.length > 0) {
            if (!callData.extractedData.complaint_title) callData.extractedData.complaint_title = allComplaints[0];
            const existing = (callData.extractedData.complaint_details || '').split('; ').map(s => s.trim()).filter(Boolean);
            const haveSet = new Set([callData.extractedData.complaint_title, ...existing]);
            const newOnes = allComplaints.filter(c => !haveSet.has(c));
            if (newOnes.length > 0) {
                callData.extractedData.complaint_details = [...existing, ...newOnes].join('; ');
            }
        }

        /* ── STEP 2: City matching ── */
        if (callData.extractedData.city && !callData.extractedData.city_id) {
            const mc = matchServiceCenter(callData.extractedData.city);
            if (mc) {
                callData.extractedData.city    = mc.city_name;
                callData.extractedData.city_id = mc.branch_code;
                callData.extractedData.branch  = mc.branch_name;
                callData.extractedData.outlet  = mc.city_name;
                callData.extractedData.lat     = mc.lat;
                callData.extractedData.lng     = mc.lng;
                console.log(`   🗺️  City: ${mc.city_name} → ${mc.branch_name}`);
            }
        }

        /* ── STEP 3: Machine number validation ── */
        if (!callData.customerData && callData.extractedData.machine_no) {
            const mn = callData.extractedData.machine_no;

            // If it looks like a phone number, try phone lookup first
            if (/^[6-9]\d{9}$/.test(mn)) {
                console.log(`   📱 Looks like phone, trying phone lookup: ${mn}`);
                const phoneLookup = await findMachineByPhone(mn);
                if (phoneLookup.valid) {
                    callData.customerData = phoneLookup.data;
                    callData.extractedData.machine_no      = phoneLookup.data.machineNo;
                    callData.extractedData.customer_name   = phoneLookup.data.name;
                    callData.extractedData.customer_phone  = phoneLookup.data.phone;
                    callData.pendingPhoneConfirm = true;
                    console.log(`   ✅ Found by phone: ${phoneLookup.data.machineNo}`);
                } else {
                    // It's actually a phone number the user gave, not a chassis
                    callData.extractedData.customer_phone = mn;
                    callData.extractedData.machine_no = null;
                }
            } else if (/^\d{4,7}$/.test(mn)) {
                // Valid chassis number length - validate if possible, but keep it even if lookup fails
                console.log(`   🔍 Validating chassis: ${mn}`);
                const v = await validateMachineNumber(mn);
                if (v.valid) {
                    callData.customerData = v.data;
                    callData.extractedData.customer_name = v.data.name;
                    callData.machineNumberAttempts = 0;
                    callData.pendingPhoneConfirm = true;
                    console.log(`   ✅ Machine validated: ${v.data.name} | ${v.data.city}`);
                } else {
                    console.warn(`   ⚠️ Chassis ${mn} not found in DB; accepting entered number and continuing`);
                    // Keep machine_no so the flow can continue with customer-provided chassis
                }
            }
        }

        /* ── STEP 4: Check "don't know machine number" ── */
        if (!callData.customerData && !callData.extractedData.machine_no) {
            if (/(pata nahi|nahi pata|don't know|malum nahi|yaad nahi|bhool gaya)/i.test(userInput)) {
                // Try phone lookup by caller number
                if (callData.callingNumber) {
                    const phoneLookup = await findMachineByPhone(callData.callingNumber);
                    if (phoneLookup.valid) {
                        callData.customerData = phoneLookup.data;
                        callData.extractedData.machine_no      = phoneLookup.data.machineNo;
                        callData.extractedData.customer_name   = phoneLookup.data.name;
                        callData.pendingPhoneConfirm = true;
                        console.log(`   ✅ Found by caller phone: ${phoneLookup.data.machineNo}`);
                    }
                }
            }
        }

        /* ── STEP 5: Check for existing complaint flow ── */
        const repeatRx = /(pehle complaint|already complaint|complaint kar di|engineer nahi aaya|aaya nahi|kab aayega|bahut der|dobara complaint|re-register)/i;
        if (repeatRx.test(userInput) && !callData.existingComplaintChecked) {
            callData.existingComplaintChecked = true;
            const machNo = callData.extractedData.machine_no || callData.customerData?.machineNo;
            if (machNo) {
                const existingInfo = await getExistingComplaint(machNo);
                if (existingInfo?.found) {
                    callData.existingComplaintId = existingInfo.complaintId;
                    console.log(`   📋 Existing complaint found: ${existingInfo.complaintId}`);
                    // Tell LLM via message so it can respond naturally
                    callData.messages.push({
                        role: "system",
                        text: `[SYSTEM: Found existing complaint ID ${existingInfo.complaintId}. Customer should choose: new complaint or urgent escalation]`,
                        timestamp: new Date()
                    });
                }
            }
        }

        /* ── STEP 6: All data collected — direct submit ── */
        const missing = missingField(callData.extractedData);
        const machineValidated = !!callData.customerData;
        const machineReady = machineValidated || !!callData.extractedData.machine_no;

        if (!missing && machineReady && callData.awaitingFinalConfirm) {
            // User already got the confirmation question, now they replied — submit
            const isPositive = /(\b(haan|ha|han|theek|yes|bilkul|sahi|ok|haan ji|ha ji|kar do|save|register)\b|हां|हा|ठीक)/i.test(userInput);
            const isNegative = /(\b(nahi|nai|nahin|no|mat|galat|wrong|change)\b|नहीं|न|गलत)/i.test(userInput);

            if (isPositive) {
                callData.awaitingFinalConfirm = false;
                activeCalls.set(CallSid, callData);
                return await handleSubmit(callData, twiml, res, CallSid);
            } else if (isNegative) {
                // User wants to change something — let LLM handle
                callData.awaitingFinalConfirm = false;
                callData.messages.push({
                    role: "system",
                    text: "[SYSTEM: Customer wants to make a change before submitting. Ask what they want to change.]",
                    timestamp: new Date()
                });
            }
        }

        /* ── STEP 7: LLM generates the reply ── */
        const llmStartTime = performanceLogger.getHighResTime();
        const aiResp = await getSmartAIResponse(callData);
        const llmEndTime = performanceLogger.getHighResTime();

        performanceLogger.logLLM(CallSid, llmStartTime, llmEndTime, aiResp.tokens || 0, aiResp.cost || 0, null);

        // Merge LLM-extracted data
        if (aiResp.extractedData) {
            for (const [k, v] of Object.entries(aiResp.extractedData)) {
                if (v && !callData.extractedData[k]) {
                    callData.extractedData[k] = v;
                    console.log(`   🧠 LLM extracted ${k}: "${v}"`);
                }
            }
            // Resolve city from LLM extraction
            if (callData.extractedData.city && !callData.extractedData.city_id) {
                const mc = matchServiceCenter(callData.extractedData.city);
                if (mc) {
                    callData.extractedData.city    = mc.city_name;
                    callData.extractedData.city_id = mc.branch_code;
                    callData.extractedData.branch  = mc.branch_name;
                    callData.extractedData.outlet  = mc.city_name;
                    callData.extractedData.lat     = mc.lat;
                    callData.extractedData.lng     = mc.lng;
                }
            }
        }

        /* ── STEP 8: Handle LLM actions ── */
        if (aiResp.action === "escalate_existing" && callData.existingComplaintId) {
            await escalateToEngineer(callData.existingComplaintId, callData.callingNumber);
            await sayFinal(twiml, "Bilkul ji. Engineer ko urgent message bhej diya. Jaldi aayega. Dhanyavaad!", { callSid: CallSid });
            twiml.hangup();
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        /* ── STEP 9: LLM says ready to submit ── */
        if (aiResp.readyToSubmit && machineReady) {
            callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
            activeCalls.set(CallSid, callData);
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        /* ── STEP 10: All data collected but no confirmation yet ── */
        const stillMissing = missingField(callData.extractedData);
        if (!stillMissing && machineReady && !callData.awaitingFinalConfirm) {
            // LLM will ask for confirmation naturally — mark we're in that state
            callData.awaitingFinalConfirm = true;
            console.log(`   ✅ All data ready — LLM will ask for confirmation`);
        }

        /* ── STEP 11: Phone confirmation ── */
        if (callData.pendingPhoneConfirm && callData.customerData?.phone && !callData.phoneConfirmDone) {
            callData.pendingPhoneConfirm = false;
            // Let LLM know there's a registered phone to confirm
            callData.messages.push({
                role: "system",
                text: `[SYSTEM: Machine validated. Customer's registered phone is ${callData.customerData.phone} (last 2 digits: ${String(callData.customerData.phone).slice(-2)}). Ask if they want to keep this number or use a different one.]`,
                timestamp: new Date()
            });
        }

        /* ── STEP 12: Speak LLM reply ── */
        callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
        activeCalls.set(CallSid, callData);
        serviceLogger.logTurn(CallSid);
        performanceLogger.completeTurn(CallSid);

        await speak(twiml, aiResp.text, { emotion: 'professional', callSid: CallSid });
        return res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [PROCESS]", err.message);
        performanceLogger.completeTurn(CallSid);
        await sayFinal(twiml, "Thodi dikkat aa gayi ji. Engineer ko bhej raha hun.");
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
        activeCalls.delete(CallSid);
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SILENCE FALLBACK TEXT (minimal — LLM handles main flow)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getSilenceFallbackText(callData) {
    const d = callData.extractedData;
    if (!d.machine_no)      return "Machine ka chassis number bataiye ji.";
    if (!d.complaint_title) return "Machine mein kya problem hai?";
    if (!d.machine_status)  return "Machine bilkul band hai ya chal rahi hai?";
    if (!d.city)            return "Aap kaunse shahar mein hain?";
    if (!d.customer_phone)  return "Aapka mobile number bataiye ji.";
    return "Sab details sahi hain? Haan boliye.";
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SUBMIT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function handleSubmit(callData, twiml, res, CallSid) {
    console.log("\n🚀 [SUBMITTING COMPLAINT]");
    const result = await submitComplaint(callData);
    const id = result.sapId || result.jobId || "";

    if (result.success) {
        const msg = id
            ? `Humne aapki complaint register kar di hai ji. Number hai ${id}. Engineer jaldi contact karega. Dhanyavaad!`
            : "Humne aapki complaint register kar di hai ji. Engineer jaldi contact karega. Dhanyavaad!";
        await sayFinal(twiml, msg, { context: 'confirmation', emotion: 'professional', callSid: CallSid });
    } else {
        await sayFinal(twiml, "Dikkat hui complaint submit karte waqt ji. Thodi der baad dubara kijiye.", { callSid: CallSid });
    }

    twiml.hangup();
    serviceLogger.endSession(CallSid, 'completed');
    performanceLogger.endSession(CallSid, 'completed');
    activeCalls.delete(CallSid);
    return res.type("text/xml").send(twiml.toString());
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   API HELPERS
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
    } catch { return { found: false }; }
}

async function escalateToEngineer(complaintId, callerPhone) {
    if (!complaintId) return;
    try {
        await axios.post(
            `${BASE_URL}/escalate_complaint.php`,
            { complaint_id: complaintId, caller_phone: callerPhone, reason: "Customer called again — engineer not arrived" },
            { timeout: API_TIMEOUT, headers: { "Content-Type": "application/json", ...API_HEADERS }, validateStatus: s => s < 500 }
        );
        console.log(`   🚨 Escalated: ${complaintId}`);
    } catch (err) {
        console.error("❌ Escalate:", err.message);
    }
}

async function submitComplaint(callData) {
    const callSid = callData.callSid || "unknown";
    const apiStartTime = performanceLogger.getHighResTime();
    try {
        const data = callData.extractedData;
        const c    = callData.customerData || {};
        if (!data.job_location) data.job_location = "Onsite";

        const payload = {
            machine_no:              data.machine_no || "Unknown",
            customer_name:           data.customer_name || c.name || "Unknown",
            caller_name:             data.customer_name || c.name || "Customer",
            caller_no:               data.customer_phone || c.phone || callData.callingNumber || "Unknown",
            contact_person:          data.customer_name || c.name || "Customer",
            contact_person_number:   data.customer_phone || c.phone || callData.callingNumber || "Unknown",
            machine_model:           c.model || "Unknown",
            sub_model:               c.subModel || "NA",
            installation_date:       c.installationDate || "2025-01-01",
            machine_type:            c.machineType || "Warranty",
            city_id:                 data.city_id || "4",
            complain_by:             "Customer",
            machine_status:          data.machine_status || "Running With Problem",
            job_location:            data.job_location,
            branch:                  data.branch || "JAIPUR",
            outlet:                  data.outlet || "JAIPUR",
            complaint_details:       data.complaint_details || "Not provided",
            complaint_title:         data.complaint_title || "General Problem",
            sub_title:               data.complaint_subtitle || "Other",
            business_partner_code:   c.businessPartnerCode || "NA",
            complaint_sap_id:        "NA",
            machine_location_address: data.machine_location_address || "Not provided",
            pincode:                 "0",
            service_date: "", from_time: "", to_time: "",
            job_open_lat:  data.lat  ?? 0,
            job_open_lng:  data.lng  ?? 0,
            job_close_lat: data.lat  ?? 0,
            job_close_lng: data.lng  ?? 0,
        };

        console.log("📤 Submitting:", JSON.stringify(payload, null, 2));

        const r = await axios.post(COMPLAINT_URL, payload, {
            timeout: API_TIMEOUT,
            headers: { "Content-Type": "application/json", ...API_HEADERS },
            validateStatus: s => s < 500,
        });

        const apiEndTime = performanceLogger.getHighResTime();
        performanceLogger.logAPI(callSid, apiStartTime, apiEndTime, 'complaint_submission', r.status !== 200 ? `HTTP ${r.status}` : null);

        if (r.status === 200 && r.data?.status === 1) {
            const sapId = r.data.data?.complaint_sap_id || r.data.data?.sap_id;
            console.log(`✅ Complaint submitted — SAP: ${sapId}`);
            return { success: true, sapId, jobId: r.data.data?.job_id };
        }

        console.error("❌ API error:", r.data?.message);
        return { success: false };
    } catch (err) {
        const apiEndTime = performanceLogger.getHighResTime();
        performanceLogger.logAPI(callSid, apiStartTime, apiEndTime, 'complaint_submission', err.message);
        console.error("❌ Submit failed:", err.message);
        return { success: false };
    }
}

export default router;