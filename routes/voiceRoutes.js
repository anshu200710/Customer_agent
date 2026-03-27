import express from "express";
import twilio from "twilio";
import axios from "axios";
import { getSmartAIResponse, extractAllData, sanitizeExtractedData, matchServiceCenter } from "../utils/ai.js";

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
    if (!d.city) return "city";
    if (!d.customer_phone || !/^[6-9]\d{9}$/.test(d.customer_phone)) return "customer_phone";
    return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔊 TTS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TTS_VOICE = "Google.hi-IN-Wavenet-A";
const TTS_LANG = "hi-IN";

function speak(twiml, text) {
    const gather = twiml.gather({
        input: "speech dtmf",
        language: TTS_LANG,
        speechTimeout: "auto",
        timeout: 5,
        maxSpeechTime: 15,
        actionOnEmptyResult: true,
        action: "/voice/process",
        method: "POST",
        enhanced: true,
        speechModel: "phone_call",
    });
    gather.say({ voice: TTS_VOICE, language: TTS_LANG }, text);
}

function sayFinal(twiml, text) {
    twiml.say({ voice: TTS_VOICE, language: TTS_LANG }, text);
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
            // Incremental chassis collection
            chassisPartials: [],        // e.g. ["33", "05", "447"]
            chassisAccumulated: "",     // e.g. "3305447"
            awaitingChassisMore: false, // waiting for next chunk
        };

        // Phone-based pre-lookup (silent)
        if (callerPhone) {
            const pr = await findMachineByPhone(callerPhone);
            if (pr.valid) {
                callData._phoneData = pr.data;
                console.log(`   📱 Phone lookup: ${pr.data.name}`);
            }
        }

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

        const greeting = callData.customerData
            ? `Namaste ${callData.customerData.name.split(" ")[0]} ji, kya problem hai?`
            : "Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun?";

        speak(twiml, greeting);
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [START]", err.message);
        sayFinal(twiml, "Thodi problem aa gayi ji. Thodi der baad call karein.");
        twiml.hangup();
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗣️ PROCESS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/process", async (req, res) => {
    const { CallSid, SpeechResult } = req.body;
    const twiml = new VoiceResponse();

    try {
        const callData = activeCalls.get(CallSid);
        if (!callData) {
            sayFinal(twiml, "Dobara call karein ji.");
            twiml.hangup();
            return res.type("text/xml").send(twiml.toString());
        }

        const userInput = SpeechResult?.trim() || "";
        callData.turnCount++;
        const lo = userInput.toLowerCase();

        console.log(`\n${"─".repeat(50)}`);
        console.log(`🔄 [T${callData.turnCount}] "${userInput || "[SILENCE]"}"`);

        // ── Hard turn limit ─────────────────────────────────────────
        if (callData.turnCount > 25) {
            sayFinal(twiml, "Engineer ko message kar diya ji. Dhanyavaad!");
            twiml.hangup();
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        // ── Silence handling ────────────────────────────────────────
        if (!userInput || userInput.length < 2) {
            callData.silenceCount++;
            const hasData = !!(callData.customerData || callData.extractedData.machine_no);
            if (callData.silenceCount >= (hasData ? 5 : 3)) {
                sayFinal(twiml, "Koi awaaz nahi aayi ji. Dobara call karein.");
                twiml.hangup();
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }
            const silenceReplies = ["Ji bataiye.", "Ji hun.", "Haan ji?", "Ji, sun rahi hun.", "Bataiye ji."];
            speak(twiml, silenceReplies[Math.min(callData.silenceCount - 1, silenceReplies.length - 1)]);
            activeCalls.set(CallSid, callData);
            return res.type("text/xml").send(twiml.toString());
        }
        callData.silenceCount = 0;

        callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });

        // ── STEP 1: Fast regex extraction ───────────────────────────
        callData.extractedData = sanitizeExtractedData(callData.extractedData);

        // ── STEP 1.5: Incremental chassis number accumulation ────────
        // If we are waiting for more chassis digits, handle that first
        if (callData.awaitingChassisMore && !callData.customerData) {
            const digitsInInput = userInput.replace(/[^0-9]/g, '');
            if (digitsInInput.length > 0 && digitsInInput.length <= 7) {
                callData.chassisPartials.push(digitsInInput);
                callData.chassisAccumulated = callData.chassisPartials.join('');
                const accumulated = callData.chassisAccumulated;
                console.log(`   🔢 Chassis chunk: "${digitsInInput}" → accumulated: "${accumulated}"`);

                // Repeat back what we heard
                const spokenDigits = digitsInInput.split('').join(' ');

                if (accumulated.length >= 4 && accumulated.length <= 7) {
                    // We have enough digits — try API lookup
                    const fullSpoken = accumulated.split('').join(' ');
                    const v = await validateMachineNumber(accumulated);
                    if (v.valid) {
                        callData.customerData = v.data;
                        callData.extractedData.machine_no = v.data.machineNo;
                        callData.extractedData.customer_name = v.data.name;
                        callData.pendingPhoneConfirm = true;
                        callData.machineNotFoundCount = 0;
                        callData.awaitingChassisMore = false;
                        callData.chassisPartials = [];
                        callData.chassisAccumulated = '';
                        console.log(`   ✅ Machine found via accumulated: ${v.data.name}`);
                        // Fall through to phone confirm step
                    } else {
                        callData.machineNotFoundCount++;
                        console.warn(`   ❌ Machine not found for "${accumulated}" (attempt ${callData.machineNotFoundCount})`);

                        if (callData.machineNotFoundCount >= 5) {
                            // 5 retries done — try phone fallback, then give up
                            if (callData.callingNumber) {
                                const pr = callData._phoneData || await findMachineByPhone(callData.callingNumber);
                                if (pr.valid) {
                                    callData.customerData = pr.data;
                                    callData.extractedData.machine_no = pr.data.machineNo;
                                    callData.extractedData.customer_name = pr.data.name;
                                    callData.pendingPhoneConfirm = true;
                                    callData.machineNotFoundCount = 0;
                                    callData.awaitingChassisMore = false;
                                    console.log(`   ✅ Phone fallback: ${pr.data.name}`);
                                    // Fall through
                                } else {
                                    sayFinal(twiml, "Chassis number nahi mil raha ji. Engineer ko message bhej deta hun. Dhanyavaad!");
                                    twiml.hangup();
                                    activeCalls.delete(CallSid);
                                    return res.type("text/xml").send(twiml.toString());
                                }
                            } else {
                                sayFinal(twiml, "Chassis number nahi mil raha ji. Engineer ko message bhej deta hun. Dhanyavaad!");
                                twiml.hangup();
                                activeCalls.delete(CallSid);
                                return res.type("text/xml").send(twiml.toString());
                            }
                        } else {
                            // Reset accumulated and try fresh
                            callData.chassisPartials = [];
                            callData.chassisAccumulated = '';
                            callData.awaitingChassisMore = true;
                            activeCalls.set(CallSid, callData);
                            speak(twiml, `Ji, ${fullSpoken} se koi machine nahi mili. Thoda aaram se dobara bataiye chassis number.`);
                            return res.type("text/xml").send(twiml.toString());
                        }
                    }
                } else if (accumulated.length < 4) {
                    // Need more digits
                    callData.awaitingChassisMore = true;
                    activeCalls.set(CallSid, callData);
                    speak(twiml, `Ji, ${spokenDigits}. Aage ke number bataiye.`);
                    return res.type("text/xml").send(twiml.toString());
                } else {
                    // More than 7 digits — too many, reset
                    callData.chassisPartials = [];
                    callData.chassisAccumulated = '';
                    callData.awaitingChassisMore = true;
                    activeCalls.set(CallSid, callData);
                    speak(twiml, "Ji, number zyada ho gaye. Thoda aaram se dobara bataiye chassis number.");
                    return res.type("text/xml").send(twiml.toString());
                }
            }
            // If no digits found in input, stop waiting for chassis and continue normal flow
            callData.awaitingChassisMore = false;
        }

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
                console.log(`   🗺️  ${mc.city_name} → ${mc.branch_name}`);
            }
        }

        // ── STEP 3: machine_status is now collected by AI question ───
        // No auto-guessing — AI asks "Machine bilkul band hai ya problem ke saath chal rahi hai?"

        // ── STEP 4: Machine number lookup ───────────────────────────
        if (!callData.customerData && callData.extractedData.machine_no) {
            const v = await validateMachineNumber(callData.extractedData.machine_no);
            if (v.valid) {
                callData.customerData = v.data;
                callData.extractedData.customer_name = v.data.name;
                callData.pendingPhoneConfirm = true;
                callData.machineNotFoundCount = 0;
                callData.awaitingChassisMore = false;
                callData.chassisPartials = [];
                callData.chassisAccumulated = '';
                console.log(`   ✅ Machine found: ${v.data.name}`);
            } else {
                callData.machineNotFoundCount++;
                callData.extractedData.machine_no = null;
                console.warn(`   ❌ Machine not found (attempt ${callData.machineNotFoundCount})`);

                // On 3rd failed attempt, try phone fallback
                if (callData.machineNotFoundCount === 3 && callData.callingNumber) {
                    const pr = callData._phoneData || await findMachineByPhone(callData.callingNumber);
                    if (pr.valid) {
                        callData.customerData = pr.data;
                        callData.extractedData.machine_no = pr.data.machineNo;
                        callData.extractedData.customer_name = pr.data.name;
                        callData.pendingPhoneConfirm = true;
                        callData.machineNotFoundCount = 0;
                        callData.awaitingChassisMore = false;
                        console.log(`   ✅ Phone fallback: ${pr.data.name}`);
                    }
                }

                // If still not found, start incremental chassis mode
                if (!callData.customerData && callData.machineNotFoundCount < 5) {
                    callData.awaitingChassisMore = true;
                    callData.chassisPartials = [];
                    callData.chassisAccumulated = '';
                    activeCalls.set(CallSid, callData);
                    speak(twiml, `Ji, yeh chassis number nahi mila. Thoda aaram se bataiye, pehle 2-3 number bataiye, main repeat karungi.`);
                    return res.type("text/xml").send(twiml.toString());
                }

                if (callData.machineNotFoundCount >= 5) {
                    sayFinal(twiml, "Chassis number nahi mil raha ji. Engineer ko message bhej deta hun. Dhanyavaad!");
                    twiml.hangup();
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
            activeCalls.set(CallSid, callData);
            speak(twiml, `${callData.customerData.name.split(" ")[0]} ji, tumhare phone mein last mein ${lastTwo} aata hai na?`);
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 6: Handle phone confirm answer ─────────────────────
        if (callData.awaitingPhoneConfirm) {
            callData.awaitingPhoneConfirm = false;
            const isNo = /(nahi|nhi|no|change|galat|alag|dusra|naya|different|nai)/i.test(lo);
            if (!isNo && callData.customerData?.phone) {
                callData.extractedData.customer_phone = callData.customerData.phone;
                console.log(`   ✅ Phone confirmed: ${callData.customerData.phone}`);
            } else {
                callData.extractedData.customer_phone = null;
                console.log(`   🔄 Phone rejected — will ask again`);
            }
            // Fall through to continue collecting
        }

        // ── STEP 7: Existing complaint scenario ─────────────────────
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
                    activeCalls.set(CallSid, callData);
                    speak(twiml, `Ji, complaint ${existingInfo.complaintId} mili. Nayi complaint karein ya engineer ko urgent message bhejein?`);
                } else {
                    callData.awaitingComplaintAction = false;
                    activeCalls.set(CallSid, callData);
                    speak(twiml, "Ji. Pehli complaint nahi mili. Nayi register karta hun. Chassis number bataiye.");
                }
                return res.type("text/xml").send(twiml.toString());
            }
        }

        // ── STEP 8: Handle complaint-action choice ───────────────────
        if (callData.awaitingComplaintAction) {
            callData.awaitingComplaintAction = false;
            const wantsUrgent = /(urgent|jaldi|message|engineer ko|escalate|priority)/i.test(lo);
            if (wantsUrgent) {
                await escalateToEngineer(callData.existingComplaintId, callData.callingNumber);
                sayFinal(twiml, "Ji bilkul. Engineer ko urgent message bhej diya. Jaldi aayega. Dhanyavaad ji!");
                twiml.hangup();
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }
            // else fall through to register new complaint
        }

        // ── STEP 9: "Aur kuch bhi?" final confirmation ──────────────
        // Triggered once all fields are collected — ask before submit
        const missing = missingField(callData.extractedData);
        const machineValidated = !!callData.customerData;

        if (!missing && machineValidated && !callData.awaitingFinalConfirm) {
            // First time we have everything — ask "aur kuch bhi?"
            callData.awaitingFinalConfirm = true;
            activeCalls.set(CallSid, callData);
            speak(twiml, "Ji. Aur koi problem toh nahi machine mein? Save kar dun complaint?");
            return res.type("text/xml").send(twiml.toString());
        }

        // ── STEP 10: Handle final confirm answer ─────────────────────
        if (callData.awaitingFinalConfirm) {
            // Check if customer is adding more problems
            const addingMore = extractAllComplaintTitles(userInput);
            const isConfirming = /(haan|ha|han|theek|save|kar do|bilkul|register|done|bas|nahi|nai|koi nahi|aur nahi|bas itna|itna hi)/i.test(lo);

            if (addingMore.length > 0 && !isConfirming) {
                // They mentioned more problems — accumulate and stay in confirm loop
                const existingDetails = callData.extractedData.complaint_details
                    ? callData.extractedData.complaint_details.split('; ').map(s => s.trim()).filter(Boolean)
                    : [];
                const alreadyHave = new Set([callData.extractedData.complaint_title, ...existingDetails]);
                const newOnes = addingMore.filter(c => !alreadyHave.has(c));
                if (newOnes.length > 0) {
                    callData.extractedData.complaint_details = [...existingDetails, ...newOnes].join('; ');
                    console.log(`   📝 Added more: [${newOnes.join(', ')}]`);
                }
                // Ask again
                activeCalls.set(CallSid, callData);
                speak(twiml, "Ji, note kar liya. Aur koi problem? Ya save kar dun?");
                return res.type("text/xml").send(twiml.toString());
            }

            // Customer said yes/no — proceed to submit
            callData.awaitingFinalConfirm = false;
            activeCalls.set(CallSid, callData);
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        // ── STEP 11: AI response ──────────────────────────────────────
        console.log(`   📊 ${JSON.stringify({
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
            activeCalls.set(CallSid, callData);
            speak(twiml, "Ji. Aur koi problem toh nahi? Save kar dun?");
            return res.type("text/xml").send(twiml.toString());
        }

        const aiResp = await getSmartAIResponse(callData);

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
            callData.awaitingFinalConfirm = true;
            callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
            activeCalls.set(CallSid, callData);
            speak(twiml, "Ji. Aur koi problem toh nahi machine mein? Save kar dun complaint?");
            return res.type("text/xml").send(twiml.toString());
        }

        // HARD GUARD: never submit unless machine validated
        if (aiResp.readyToSubmit && !machineValidated) {
            console.warn(`   ⛔ AI said ready but machine NOT validated — blocking submit`);
            aiResp.text = "Machine number nahi mila ji. Sahi chassis number bataiye.";
        }

        callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
        activeCalls.set(CallSid, callData);
        speak(twiml, aiResp.text);
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [PROCESS]", err.message);
        sayFinal(twiml, "Thodi dikkat aa gayi ji. Engineer ko bhej raha hun.");
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
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

    if (result.success && id) {
        sayFinal(twiml, `Complaint register ho gayi ji. Number hai ${String(id).split("").join(" ")}. Engineer jaldi aayega. Dhanyavaad!`);
    } else if (result.success) {
        sayFinal(twiml, "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!");
    } else {
        sayFinal(twiml, "Complaint note ho gayi ji. Engineer contact karega. Dhanyavaad!");
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
            job_open_lat: data.lat || 0,
            job_open_lng: data.lng || 0,
            job_close_lat: data.lat || 0,
            job_close_lng: data.lng || 0,
        };

        console.log("📤 Submitting:", JSON.stringify(payload, null, 2));

        const r = await axios.post(COMPLAINT_URL, payload, {
            timeout: API_TIMEOUT,
            headers: { "Content-Type": "application/json", ...API_HEADERS },
            validateStatus: s => s < 500,
        });

        if (r.status === 200 && r.data?.status === 1) {
            const sapId = r.data.data?.complaint_sap_id || r.data.data?.sap_id;
            console.log(`✅ Complaint submitted — SAP: ${sapId}`);
            return { success: true, sapId, jobId: r.data.data?.job_id };
        }

        console.error("❌ API error:", r.data?.message);
        return { success: false };

    } catch (err) {
        console.error("❌ Submit failed:", err.message);
        return { success: false };
    }
}

export default router;