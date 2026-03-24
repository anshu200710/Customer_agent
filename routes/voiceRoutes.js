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
   ⚡ HELPERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function missingField(d) {
    if (!d.machine_no) return "machine_no";
    if (!d.complaint_title) return "complaint_title";
    if (!d.machine_status) return "machine_status";
    if (!d.city) return "city";
    if (!d.customer_phone || !/^[6-9]\d{9}$/.test(d.customer_phone)) return "customer_phone";
    return null;
}

// Warm, natural prompts — NOT robotic
const ASK = {
    machine_no: "Ji, chassis number ya machine number bata dijiye.",
    complaint_title: "Theek hai. Kya problem aa rahi hai machine mein?",
    machine_status: "Machine abhi chal rahi hai ya bilkul band ho gayi?",
    city: "Kaunse shahar mein hai aapki machine?",
    customer_phone: "Aapka mobile number bata dijiye.",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📞 INITIAL CALL HANDLER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/", async (req, res) => {
    const { CallSid, From } = req.body;
    const { machine_no: preloadedMachineNo } = req.query;
    const callerPhone = From?.replace(/^\+91/, "").replace(/^\+/, "").slice(-10) || "";

    console.log("\n" + "═".repeat(70));
    console.log(`📞 [START] ${CallSid} | From:${callerPhone} | Machine:${preloadedMachineNo || "—"}`);
    console.log("═".repeat(70));

    const twiml = new VoiceResponse();
    try {
        const callData = {
            callSid: CallSid,
            callingNumber: callerPhone,
            messages: [],
            extractedData: {
                machine_no: preloadedMachineNo || null,
                customer_name: null, customer_phone: null,
                city: null, city_id: null, branch: null, outlet: null,
                lat: null, lng: null,
                complaint_title: null, complaint_subtitle: null,
                machine_status: null, job_location: null,
                complaint_details: "", machine_location_address: null,
            },
            customerData: null,
            turnCount: 0, silenceCount: 0,
            pendingPhoneConfirm: false, awaitingPhoneConfirm: false,
            machineNotFoundCount: 0,
            // New scenario flags
            isRepeatCaller: false,          // same number called before today
            existingComplaintId: null,       // if "already complaint" scenario
            awaitingComplaintAction: false,  // waiting for customer to confirm re-register vs escalate
        };

        // Check if repeat caller (called before in same session or recently)
        // We'll check via phone lookup — if machine found by phone, flag it
        if (callerPhone) {
            const pr = await findMachineByPhone(callerPhone);
            if (pr.valid) {
                callData.isRepeatCaller = true;
                callData._phoneData = pr.data; // store for later use
                console.log(`   📱 Known caller: ${pr.data.name}`);
            }
        }

        if (preloadedMachineNo) {
            const v = await validateMachineNumber(preloadedMachineNo);
            if (v.valid) {
                callData.customerData = v.data;
                callData.extractedData.machine_no = v.data.machineNo;
                callData.extractedData.customer_name = v.data.name;
                callData.pendingPhoneConfirm = true;
                console.log(`   ✅ Pre-validated: ${v.data.name}`);
            } else {
                callData.extractedData.machine_no = null;
            }
        }

        activeCalls.set(CallSid, callData);

        // ⚡ Fast greeting — zero Groq
        let greeting;
        if (callData.customerData) {
            const first = callData.customerData.name.split(" ")[0];
            greeting = `Namaste ${first} ji. Kya problem hai machine mein?`;
        } else {
            greeting = "Namaste ji. Chassis number ya machine number bata dijiye.";
        }

        speak(twiml, greeting);
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [START]", err.message);
        sayRaw(twiml, "Thodi problem aa gayi. Dobara call karein ji.");
        twiml.hangup();
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗣️ MAIN PROCESSOR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/process", async (req, res) => {
    const { CallSid, SpeechResult } = req.body;
    const twiml = new VoiceResponse();

    try {
        const callData = activeCalls.get(CallSid);
        if (!callData) {
            sayRaw(twiml, "Dobara call karein ji.");
            twiml.hangup();
            return res.type("text/xml").send(twiml.toString());
        }

        const userInput = SpeechResult?.trim() || "";
        callData.turnCount++;
        const lo = userInput.toLowerCase();
        console.log(`\n${"─".repeat(60)}`);
        console.log(`🔄 [T${callData.turnCount}] "${userInput || "[SILENCE]"}"`);

        // ── Silence ─────────────────────────────────────────────────
        if (!userInput || userInput.length < 2) {
            callData.silenceCount++;
            const hasData = !!(callData.customerData || callData.extractedData.machine_no);
            if (callData.silenceCount >= (hasData ? 5 : 3)) {
                sayRaw(twiml, "Koi awaaz nahi aa rahi. Dobara call karein ji.");
                twiml.hangup(); activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }
            const p = hasData
                ? ["Ji sun rahi hun.", "Bataiye ji.", "Ji zarur.", "Main hun ji.", "Bataiye."]
                : ["Ji? Bataiye.", "Ek baar phir boliye.", "Hello ji?"];
            speak(twiml, p[Math.min(callData.silenceCount - 1, p.length - 1)]);
            activeCalls.set(CallSid, callData);
            return res.type("text/xml").send(twiml.toString());
        }
        callData.silenceCount = 0;

        if (callData.turnCount > 22) {
            sayRaw(twiml, "Engineer ko message kar diya hai. Jaldi call karega. Dhanyavaad!");
            twiml.hangup(); activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });

        // ═══════════════════════════════════════════════════════════
        // SCENARIO A: ALREADY COMPLAINT — ENGINEER NOT COMING
        // Detect: "pehle complaint", "engineer nahi aaya", "dobara complaint"
        // ═══════════════════════════════════════════════════════════
        const alreadyComplaintRx = /(pehle complaint|already complaint|complaint kar di thi|complaint ki thi|complaint ho gayi|pehle se complaint|engineer nahi aaya|engineer nahi aata|engineer aa nahi|engineer nhi aaya|aaya nahi engineer|kab aayega|kab tak aayega|kitni der|bahut der ho gayi|kal se wait|2 din se|3 din se|kaafi der se|dobara complaint|phir se complaint|re-register|nayi complaint|naya complaint|complaint update|complaint open hai)/i;

        if (alreadyComplaintRx.test(lo) && !callData.awaitingComplaintAction) {
            // Customer is saying complaint already filed
            console.log(`   🔄 SCENARIO: Already complaint / engineer not coming`);

            // Try to find their existing complaint
            let existingInfo = null;

            // If we have machine number, look up their complaint
            if (callData.extractedData.machine_no || callData.customerData) {
                const machNo = callData.extractedData.machine_no || callData.customerData?.machineNo;
                existingInfo = await getExistingComplaint(machNo);
            } else if (callData.callingNumber) {
                // Try by phone
                const pr = await findMachineByPhone(callData.callingNumber);
                if (pr.valid) {
                    callData.customerData = pr.data;
                    callData.extractedData.machine_no = pr.data.machineNo;
                    callData.extractedData.customer_name = pr.data.name;
                    existingInfo = await getExistingComplaint(pr.data.machineNo);
                }
            }

            if (existingInfo?.found) {
                callData.existingComplaintId = existingInfo.complaintId;
                callData.awaitingComplaintAction = true;
                activeCalls.set(CallSid, callData);
                const status = existingInfo.status || "open";
                console.log(`   📋 Found existing complaint: ${existingInfo.complaintId} status:${status}`);
                speak(twiml, `Ji, complaint number ${existingInfo.complaintId} mili. Engineer assign hai. Kya nayi complaint register karein ya engineer ko urgent message bhejein?`);
            } else {
                // No existing complaint found — register as fresh
                callData.awaitingComplaintAction = false;
                activeCalls.set(CallSid, callData);
                speak(twiml, "Ji samajh gaya. Koi pehli complaint nahi mili. Ek nayi complaint register kar deta hun. Chassis number bata dijiye.");
            }
            return res.type("text/xml").send(twiml.toString());
        }

        // ── Handle already-complaint action choice ──────────────────
        if (callData.awaitingComplaintAction) {
            callData.awaitingComplaintAction = false;
            const wantsUrgent = /(urgent|jaldi|jldi|message|priority|escalate|engineer ko bolo|call karo|contact|nahin|nahi|new|nayi|dobara|phir se)/i.test(lo);
            const wantsNew = /(nayi|naya|new complaint|register|fresh|dobara|phir se complaint)/i.test(lo);

            if (wantsNew || !wantsUrgent) {
                // Register fresh complaint
                console.log(`   📝 Customer wants new complaint registration`);
                activeCalls.set(CallSid, callData);
                speak(twiml, `Theek hai ji. Nayi complaint register karta hun. ${ASK.complaint_title}`);
                return res.type("text/xml").send(twiml.toString());
            } else {
                // Send urgent message to engineer
                console.log(`   🚨 Customer wants urgent escalation`);
                await escalateToEngineer(callData.existingComplaintId, callData.callingNumber);
                sayRaw(twiml, `Ji bilkul. Engineer ko abhi urgent message bhej diya. Jaldi aayega. Dhanyavaad ji!`);
                twiml.hangup();
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }
        }

        // ═══════════════════════════════════════════════════════════
        // SCENARIO B: NO CHASSIS NUMBER
        // ═══════════════════════════════════════════════════════════
        if (!callData.customerData && !callData.extractedData.machine_no) {

            // Hold phrase — customer searching
            const holdRx = /\b(ek minute|ek second|ruko|ruk|dhundh|dekh|check kar|hold|thoda|leke aata)\b/i;
            if (holdRx.test(userInput) && userInput.replace(/[^0-9]/g, "").length < 4) {
                speak(twiml, "Ji zarur, main hun.");
                activeCalls.set(CallSid, callData);
                return res.type("text/xml").send(twiml.toString());
            }

            // Customer says they don't know chassis
            const noChassisRx = /(pata nahi|pataa nahi|nahi pata|nhi pata|nahi hai mere|mere paas nahi|maloom nahi|yaad nahi|number nahi|chassis nahi|pata nhi|nahi maloom|nahi pata mujhe)/i;
            if (noChassisRx.test(lo) && userInput.replace(/[^0-9]/g, "").length < 4) {
                console.log(`   🔍 No chassis — trying phone lookup: ${callData.callingNumber}`);
                // Try phone lookup
                const pr = callData._phoneData || (callData.callingNumber ? await findMachineByPhone(callData.callingNumber) : { valid: false });
                if (pr.valid) {
                    callData.customerData = pr.data;
                    callData.extractedData.machine_no = pr.data.machineNo;
                    callData.extractedData.customer_name = pr.data.name;
                    callData.pendingPhoneConfirm = true;
                    callData.machineNotFoundCount = 0;
                    console.log(`   ✅ Phone lookup → ${pr.data.name} (${pr.data.machineNo})`);
                    // Fall through to phone confirm prompt
                } else {
                    // Can't find by phone either — guide them to dashboard
                    activeCalls.set(CallSid, callData);
                    speak(twiml, "Koi baat nahi ji. Machine ke dashboard pe ek metal plate hoti hai, uspe chassis number likha hota hai. Ek baar dekh ke bata dijiye.");
                    return res.type("text/xml").send(twiml.toString());
                }
            }
        }

        // ── Phone confirm response ──────────────────────────────────
        if (callData.awaitingPhoneConfirm) {
            callData.awaitingPhoneConfirm = false;
            const isNo = /(nahi|nhi|no|change|badlo|alag|dusra|naya|galat|different)/.test(lo);
            if (isNo) {
                callData.extractedData.customer_phone = null;
                activeCalls.set(CallSid, callData);
                speak(twiml, "Ji, naya number bata dijiye.");
                return res.type("text/xml").send(twiml.toString());
            } else {
                callData.extractedData.customer_phone = callData.customerData.phone;
                console.log(`   ✅ Phone confirmed: ${callData.customerData.phone}`);
                // fall through — may have given more data in same breath
            }
        }

        // ── Machine lookup (2-turn accumulation, no garbage) ────────
        if (!callData.customerData && !callData.extractedData.machine_no) {
            const thisTurnDigits = userInput.replace(/[^0-9]/g, "");
            const userTurns = callData.messages.filter(m => m.role === "user");
            const prevDigits = userTurns.length >= 2
                ? userTurns[userTurns.length - 2].text.replace(/[^0-9]/g, "") : "";

            const cands = buildCandidates(thisTurnDigits, prevDigits);
            if (cands.length > 0) {
                console.log(`   🔍 [${cands.length}]: ${cands.join(", ")}`);
                let found = null, foundCand = null;
                for (const c of cands) {
                    const r = await validateMachineNumber(c);
                    if (r.valid) { found = r; foundCand = c; break; }
                }

                if (found) {
                    callData.customerData = found.data;
                    callData.extractedData.machine_no = found.data.machineNo;
                    callData.extractedData.customer_name = found.data.name;
                    callData.pendingPhoneConfirm = true;
                    callData.machineNotFoundCount = 0;
                    console.log(`   ✅ [${foundCand}] → ${found.data.name}`);
                } else if (thisTurnDigits.length >= 4) {
                    callData.machineNotFoundCount++;
                    console.warn(`   ❌ No match (attempt ${callData.machineNotFoundCount})`);

                    // After 2 tries → silent phone fallback
                    if (callData.machineNotFoundCount === 2 && callData.callingNumber) {
                        const pr = callData._phoneData || await findMachineByPhone(callData.callingNumber);
                        if (pr.valid) {
                            callData.customerData = pr.data;
                            callData.extractedData.machine_no = pr.data.machineNo;
                            callData.extractedData.customer_name = pr.data.name;
                            callData.pendingPhoneConfirm = true;
                            callData.machineNotFoundCount = 0;
                            console.log(`   ✅ Phone fallback → ${pr.data.name}`);
                        } else {
                            sayRaw(twiml, "Chassis system mein nahi mila. Engineer ko forward kar raha hun. Dhanyavaad ji.");
                            twiml.hangup(); activeCalls.delete(CallSid);
                            return res.type("text/xml").send(twiml.toString());
                        }
                    } else if (callData.machineNotFoundCount >= 3) {
                        sayRaw(twiml, "Chassis nahi mila. Engineer ko bhej raha hun. Dhanyavaad ji.");
                        twiml.hangup(); activeCalls.delete(CallSid);
                        return res.type("text/xml").send(twiml.toString());
                    } else {
                        speak(twiml, "Ye number nahi mila. Sahi chassis number bata dijiye.");
                        activeCalls.set(CallSid, callData);
                        return res.type("text/xml").send(twiml.toString());
                    }
                }
            }
        }

        // ── Phone confirm prompt ────────────────────────────────────
        if (callData.pendingPhoneConfirm && callData.customerData?.phone) {
            const ph = callData.customerData.phone;
            callData.pendingPhoneConfirm = false;
            callData.awaitingPhoneConfirm = true;
            activeCalls.set(CallSid, callData);
            console.log(`   📞 Phone confirm, last2: ${ph.slice(-2)}`);
            speak(twiml, `Complaint ke liye ye number rakhna hai jisme last mein ${ph.slice(-2)} hai?`);
            return res.type("text/xml").send(twiml.toString());
        }

        // ── ⚡ GREEDY REGEX + city matching ─────────────────────────
        callData.extractedData = sanitizeExtractedData(callData.extractedData);
        const rx = extractAllData(userInput, callData.extractedData);
        for (const [k, v] of Object.entries(rx)) {
            if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
        }

        // City matching — MUST run in fast path
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

        // Multi-complaint extraction
        const allTitles = extractAllComplaintTitles(userInput);
        if (allTitles.length > 0) {
            if (!callData.extractedData.complaint_title) {
                callData.extractedData.complaint_title = allTitles[0];
            }
            const extras = allTitles.slice(1).filter(t => t !== callData.extractedData.complaint_title);
            if (extras.length > 0) {
                const prev = callData.extractedData.complaint_details || "";
                const add = extras.join("; ");
                callData.extractedData.complaint_details = prev
                    ? (prev.includes(add) ? prev : `${prev}; ${add}`)
                    : add;
                console.log(`   📝 Extra complaints: ${add}`);
            }
        }

        // Auto machine_status from complaint_title
        if (callData.extractedData.complaint_title && !callData.extractedData.machine_status) {
            const t = callData.extractedData.complaint_title.toLowerCase();
            callData.extractedData.machine_status = /engine not starting|not starting/.test(t)
                ? "Breakdown" : "Running With Problem";
        }

        // ── ⚡ FAST PATH ────────────────────────────────────────────
        const missing = missingField(callData.extractedData);
        console.log(`   📊 M:${callData.extractedData.machine_no || "❌"} P:${callData.extractedData.complaint_title || "❌"} S:${callData.extractedData.machine_status || "❌"} C:${callData.extractedData.city || "❌"} Ph:${callData.extractedData.customer_phone || "❌"} → ${missing || "✅ SUBMIT"}`);

        if (!missing) {
            activeCalls.set(CallSid, callData);
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        const fast = getFastResponse(missing, userInput, callData.extractedData);
        if (fast) {
            callData.messages.push({ role: "assistant", text: fast, timestamp: new Date() });
            activeCalls.set(CallSid, callData);
            speak(twiml, fast);
            return res.type("text/xml").send(twiml.toString());
        }

        // ── Groq — only for genuinely ambiguous turns ───────────────
        const aiResp = await getSmartAIResponse(callData);
        console.log(`   🤖 Groq → "${aiResp.text.substring(0, 60)}" submit:${aiResp.readyToSubmit}`);

        callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
        if (aiResp.extractedData) {
            for (const [k, v] of Object.entries(aiResp.extractedData)) {
                if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
            }
        }

        if (aiResp.readyToSubmit || !missingField(callData.extractedData)) {
            return await handleSubmit(callData, twiml, res, CallSid);
        }

        activeCalls.set(CallSid, callData);
        speak(twiml, aiResp.text);
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [PROCESS]", err.message);
        sayRaw(twiml, "Thodi dikkat aa gayi. Engineer ko bhej raha hun. Dhanyavaad.");
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
        activeCalls.delete(CallSid);
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ⚡ FAST RESPONSE — Groq only for phone-ref ambiguity
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function getFastResponse(missingFieldName, userInput, data) {
    const lower = userInput.toLowerCase();

    // Only these specific patterns truly need Groq
    const needsGroq =
        /(last mein|end mein|pehle wala|wohi wala|same wala|jo bola|jo bataya|usi ko|wahi number)/i.test(lower) ||
        /\d{2}\s*(hai|wala|se|ka|pe)\b/.test(lower);
    if (needsGroq) return null;

    switch (missingFieldName) {
        case "machine_no":
            return ASK.machine_no;

        case "complaint_title":
            if (data.complaint_title) {
                if (data.machine_status && data.city) return `Theek hai ji. ${ASK.customer_phone}`;
                if (data.machine_status) return `Achha ji. ${ASK.city}`;
                return `Samajh gaya ji. ${ASK.machine_status}`;
            }
            return ASK.complaint_title;

        case "machine_status":
            if (data.machine_status)
                return data.city ? `Theek hai ji. ${ASK.customer_phone}` : `Achha ji. ${ASK.city}`;
            return ASK.machine_status;

        case "city":
            if (data.city)
                return data.customer_phone ? null : `Achha ji. ${ASK.customer_phone}`;
            return ASK.city;

        case "customer_phone":
            if (data.customer_phone) return null;
            if (/\d{5,}/.test(userInput.replace(/\s/g, "")))
                return "Ji, 10 digit ka number chahiye — 6, 7, 8 ya 9 se shuru hona chahiye.";
            return ASK.customer_phone;
    }
    return null;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚀 HANDLE SUBMIT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function handleSubmit(callData, twiml, res, CallSid) {
    console.log("\n🚀 [SUBMIT]");
    const result = await submitComplaint(callData);
    if (result.success) {
        const id = result.sapId || result.jobId || "";
        sayRaw(twiml, id
            ? `Complaint register ho gayi ji. Number hai ${String(id).split("").join(" ")}. Engineer jaldi aayega. Dhanyavaad!`
            : "Complaint register ho gayi ji. Engineer jaldi aayega. Dhanyavaad!");
    } else {
        sayRaw(twiml, "Complaint note ho gayi ji. Engineer jaldi aayega. Dhanyavaad!");
    }
    twiml.hangup();
    activeCalls.delete(CallSid);
    return res.type("text/xml").send(twiml.toString());
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📝 EXTRACT ALL COMPLAINT TITLES (multi-complaint support)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function extractAllComplaintTitles(text) {
    const lo = text.toLowerCase().replace(/[।\.\!\?]/g, " ");
    const found = [];
    const checks = [
        [/(start nahi|start nhi|chalu nahi|chalu nhi|chalti nahi|nahi chal rahi|चालू नहीं|स्टार्ट नहीं|नहीं चल|band hai|band ho|band pad|khari hai|बंद है|बंद हो)/, "Engine Not Starting"],
        [/(filter|filttar|service|servicing|oil change|tel badlo|सर्विस|फिल्टर)/, "Service/Filter Change"],
        [/(dhuan|dhua|smoke|धुआं)/, "Engine Smoke"],
        [/(garam|dhak|overheat|ubhal|tapta|ज्यादा गरम|ढक गई)/, "Engine Overheating"],
        [/(tel nikal|oil leak|rissa|रिस|तेल निकल)/, "Oil Leakage"],
        [/(hydraulic|hydro|cylinder|bucket|boom|jack|हाइड्रोलिक)/, "Hydraulic System Failure"],
        [/(race nahi|ras nahi|accelerator|throttle|रेस नहीं|gas nahi)/, "Accelerator Problem"],
        [/(ac nahi|ac kharab|hawa nahi|thanda nahi|ac band|ठंडा नहीं|एसी)/, "AC Not Working"],
        [/(brake nahi|brake kharab|rokti nahi|ब्रेक)/, "Brake Failure"],
        [/(bijli nahi|headlight|bulb|electrical|लाइट|बिजली)/, "Electrical Problem"],
        [/(tire|tyre|pankchar|puncture|टायर)/, "Tire Problem"],
        [/(khatakhat|khatak|thokta|awaaz aa rhi|aawaz|vibration|खटखट)/, "Abnormal Noise"],
        [/(steering|स्टीयरिंग)/, "Steering Problem"],
        [/(gear|transmission|गियर)/, "Transmission Problem"],
    ];
    for (const [rx, title] of checks) {
        if (rx.test(lo) || rx.test(text)) found.push(title);
    }
    return found;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔢 CANDIDATE BUILDER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function buildCandidates(thisTurnDigits, prevTurnDigits) {
    const set = new Set();
    for (const src of [thisTurnDigits, prevTurnDigits + thisTurnDigits]) {
        if (!src) continue;
        for (let len = 7; len >= 4; len--) {
            for (let i = 0; i <= src.length - len; i++) {
                const chunk = src.slice(i, i + len);
                if (/^[6-9]/.test(chunk) && src.length >= 10) continue;
                set.add(chunk);
            }
        }
    }
    return [...set].filter(c => !c.startsWith("0")).sort((a, b) => b.length - a.length).slice(0, 8);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔊 TTS — fast settings
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function speak(twiml, text) {
    const gather = twiml.gather({
        input: "speech dtmf",
        language: "hi-IN",
        speechTimeout: "auto",
        timeout: 5,
        maxSpeechTime: 12,
        actionOnEmptyResult: true,
        action: "/voice/process",
        method: "POST",
        enhanced: true,
        speechModel: "phone_call",
    });
    gather.say({ voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" }, text);
}
function sayRaw(twiml, text) {
    twiml.say({ voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" }, text);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔎 MACHINE VALIDATION
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
                valid: true, data: {
                    name: d.customer_name || "Unknown", city: d.city || "Unknown",
                    model: d.machine_model || "Unknown", machineNo: d.machine_no || machineNo,
                    phone: d.customer_phone_no || "Unknown", subModel: d.sub_model || "NA",
                    machineType: d.machine_type || "Warranty",
                    businessPartnerCode: d.business_partner_code || "NA",
                    purchaseDate: d.purchase_date || "NA", installationDate: d.installation_date || "NA",
                }
            };
        }
        return { valid: false };
    } catch { return { valid: false }; }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📱 PHONE-BASED LOOKUP
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
                valid: true, data: {
                    name: d.customer_name || "Unknown", city: d.city || "Unknown",
                    model: d.machine_model || "Unknown", machineNo: d.machine_no || phone,
                    phone: d.customer_phone_no || phone, subModel: d.sub_model || "NA",
                    machineType: d.machine_type || "Warranty",
                    businessPartnerCode: d.business_partner_code || "NA",
                    purchaseDate: d.purchase_date || "NA", installationDate: d.installation_date || "NA",
                }
            };
        }
        return { valid: false };
    } catch { return { valid: false }; }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📋 GET EXISTING COMPLAINT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
                assignedDate: d.assigned_date || null,
            };
        }
        return { found: false };
    } catch (err) {
        console.error("❌ Complaint lookup:", err.message);
        return { found: false };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🚨 ESCALATE TO ENGINEER (urgent message)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
async function escalateToEngineer(complaintId, callerPhone) {
    if (!complaintId) return;
    try {
        await axios.post(
            `${BASE_URL}/escalate_complaint.php`,
            { complaint_id: complaintId, caller_phone: callerPhone, reason: "Customer called again — engineer not arrived" },
            { timeout: API_TIMEOUT, headers: { "Content-Type": "application/json", ...API_HEADERS }, validateStatus: s => s < 500 }
        );
        console.log(`   🚨 Escalated complaint: ${complaintId}`);
    } catch (err) {
        console.error("❌ Escalate:", err.message);
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📤 COMPLAINT SUBMISSION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
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
            job_open_lat: data.lat || 0, job_open_lng: data.lng || 0,
            job_close_lat: 0, job_close_lng: 0,
        };

        console.log("📤 Payload:", JSON.stringify(payload, null, 2));

        const r = await axios.post(COMPLAINT_URL, payload, {
            timeout: API_TIMEOUT,
            headers: { "Content-Type": "application/json", ...API_HEADERS },
            validateStatus: s => s < 500,
        });

        if (r.status === 200 && r.data?.status === 1) {
            const sapId = r.data.data?.complaint_sap_id || r.data.data?.sap_id;
            console.log(`✅ SAP:${sapId}`);
            return { success: true, sapId, jobId: r.data.data?.job_id };
        }
        console.error("❌ API:", r.data?.message);
        return { success: false };
    } catch (err) {
        console.error("❌ Submit:", err.message);
        return { success: false };
    }
}

export default router;

