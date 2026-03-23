import express from "express";
import twilio from "twilio";
import axios from "axios";
import { getSmartAIResponse, toSSML, toSSMLId } from "../utils/ai.js";

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

const activeCalls = new Map();

const COMPLAINT_API_URL = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7/ai_call_complaint.php";
const API_TIMEOUT = 20000;
const API_HEADERS = { JCBSERVICEAPI: "MakeInJcb" };

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📞 INITIAL CALL HANDLER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/", async (req, res) => {
    const { CallSid, From } = req.body;
    const { machine_no: preloadedMachineNo } = req.query;

    console.log("\n" + "═".repeat(80));
    console.log(`📞 [CALL START] ${CallSid}  From: ${From}  Machine: ${preloadedMachineNo || "—"}`);
    console.log("═".repeat(80));

    const twiml = new VoiceResponse();

    try {
        const callData = {
            callSid: CallSid,
            callingNumber: From?.replace(/^\+91/, "").slice(-10) || "",
            messages: [],
            extractedData: {
                machine_no: preloadedMachineNo || null,
                customer_name: null,
                customer_phone: null,
                city: null,
                city_id: null,
                branch: null,
                outlet: null,
                lat: null,
                lng: null,
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
        };

        // Pre-validate machine if provided in URL
        if (preloadedMachineNo) {
            const validation = await validateMachineNumber(preloadedMachineNo);
            if (validation.valid) {
                callData.customerData = validation.data;
                callData.extractedData.machine_no = validation.data.machineNo;
                callData.extractedData.customer_name = validation.data.name;
                callData.extractedData.customer_phone = validation.data.phone;
                callData.extractedData.city = validation.data.city;
                console.log(`   ✅ Pre-validated: ${validation.data.name} | ${validation.data.city}`);
            }
        }

        activeCalls.set(CallSid, callData);

        const aiResponse = await getSmartAIResponse(callData);

        callData.messages.push({ role: "assistant", text: aiResponse.text, timestamp: new Date() });
        if (aiResponse.extractedData) {
            callData.extractedData = { ...callData.extractedData, ...aiResponse.extractedData };
        }
        activeCalls.set(CallSid, callData);

        speak(twiml, aiResponse.text);
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [CALL START]", err.message);
        twiml.say(
            { voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" },
            "Maaf kijiye, abhi problem aa gayi. Thodi der mein call karein."
        );
        twiml.hangup();
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🗣️ MAIN CONVERSATION PROCESSOR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
router.post("/process", async (req, res) => {
    const { CallSid, SpeechResult } = req.body;
    const twiml = new VoiceResponse();

    try {
        let callData = activeCalls.get(CallSid);
        if (!callData) {
            console.error(`❌ [PROCESS] Unknown call: ${CallSid}`);
            sayRaw(twiml, "Ji, call ho gayi thi. Dobara try karein. Dhanyavaad.");
            twiml.hangup();
            return res.type("text/xml").send(twiml.toString());
        }

        const userInput = SpeechResult?.trim() || "";
        callData.turnCount++;

        console.log(`\n${"━".repeat(70)}`);
        console.log(`🔄 [TURN ${callData.turnCount}] User: "${userInput || "[SILENCE]"}"`);

        // ── Silence handling ────────────────────────────────────────
        if (!userInput || userInput.length < 2) {
            callData.silenceCount++;
            console.log(`   🔇 Silence #${callData.silenceCount}`);

            if (callData.silenceCount >= 3) {
                sayRaw(twiml, "Lagta hai network mein dikkat hai. Main thodi der mein dobara call karti hun. Dhanyavaad ji.");
                twiml.hangup();
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
            }

            const silencePrompts = [
                "Ji? Bol rahe hain aap?",
                "Hello? Sun pa rahe hain?",
                "Aawaz nahi aa rahi. Ek baar phir boliye.",
            ];
            speak(twiml, silencePrompts[callData.silenceCount - 1], { bare: true });
            activeCalls.set(CallSid, callData);
            return res.type("text/xml").send(twiml.toString());
        }

        callData.silenceCount = 0;

        // ── Safety turn limit ───────────────────────────────────────
        if (callData.turnCount > 22) {
            sayRaw(twiml, "Ji, engineer ko message kar diya hai. Jaldi call karega. Dhanyavaad!");
            twiml.hangup();
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        // ── Store user turn ─────────────────────────────────────────
        callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });

        // ── Machine lookup mid-call ─────────────────────────────────
        // If we just got a machine number and don't have customer data yet, look it up
        if (!callData.customerData) {
            const machineMatch = userInput.replace(/[^0-9]/g, "").match(/\d{4,8}/);
            if (machineMatch && !callData.extractedData.machine_no) {
                const candidate = machineMatch[0];
                const validation = await validateMachineNumber(candidate);
                if (validation.valid) {
                    callData.customerData = validation.data;
                    callData.extractedData.machine_no = validation.data.machineNo;
                    callData.extractedData.customer_name = validation.data.name;
                    callData.extractedData.customer_phone = validation.data.phone;
                    callData.extractedData.city = validation.data.city;
                    console.log(`   ✅ Mid-call lookup: ${validation.data.name}`);
                }
            }
        }

        const aiResponse = await getSmartAIResponse(callData);

        console.log(`   🤖 Intent:${aiResponse.intent} | Submit:${aiResponse.readyToSubmit}`);
        console.log(`   📊 Machine:${aiResponse.extractedData?.machine_no || "❌"} Problem:${aiResponse.extractedData?.complaint_title || "❌"} City:${aiResponse.extractedData?.city || "❌"} Phone:${aiResponse.extractedData?.customer_phone || "❌"}`);

        callData.messages.push({ role: "assistant", text: aiResponse.text, timestamp: new Date() });
        if (aiResponse.extractedData) {
            callData.extractedData = { ...callData.extractedData, ...aiResponse.extractedData };
        }

        // ── Submit complaint ────────────────────────────────────────
        if (aiResponse.readyToSubmit) {
            console.log("\n🚀 [SUBMISSION] Submitting...");
            const result = await submitComplaint(callData);

            if (result.success) {
                const id = result.sapId || result.jobId || "";
                if (id) {
                    // Speak the ID digit-by-digit via SSML
                    const digits = String(id).split("").join(" ");
                    sayRaw(
                        twiml,
                        `Theek hai ji. Complaint number hai ${digits}. Engineer jaldi call karega. Dhanyavaad!`
                    );
                } else {
                    sayRaw(twiml, "Theek hai ji. Complaint register ho gayi. Engineer jaldi call karega. Dhanyavaad!");
                }
            } else {
                sayRaw(twiml, "Complaint register ho gayi. Engineer jaldi aayega. Dhanyavaad ji!");
            }

            twiml.hangup();
            activeCalls.delete(CallSid);
            return res.type("text/xml").send(twiml.toString());
        }

        activeCalls.set(CallSid, callData);
        speak(twiml, aiResponse.text);
        res.type("text/xml").send(twiml.toString());

    } catch (err) {
        console.error("❌ [PROCESS]", err.message);
        sayRaw(twiml, "System mein thodi dikkat aa gayi. Agent se milata hun.");
        twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
        activeCalls.delete(CallSid);
        res.type("text/xml").send(twiml.toString());
    }
});

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔊 TTS HELPERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * speak() — wraps text in a <Gather> so we keep listening after speaking.
 * options.bare = true → skip SSML (for short prompts that don't need pauses).
 */
function speak(twiml, text, options = {}) {
    const gather = twiml.gather({
        input: "speech dtmf",
        language: "hi-IN",
        speechTimeout: "auto",       // Twilio stops recording when caller pauses
        timeout: 6,            // Wait 6s for first sound (was 8 — faster)
        maxSpeechTime: 45,           // Max 45s per turn (was 60)
        actionOnEmptyResult: true,
        action: "/voice/process",
        method: "POST",
        enhanced: true,
        speechModel: "phone_call",
    });

    gather.say(
        { voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" },
        text
    );
}

/**
 * sayRaw() — plain <Say> with no gather (terminal messages).
 */
function sayRaw(twiml, text) {
    twiml.say(
        { voice: "Google.hi-IN-Wavenet-D", language: "hi-IN" },
        text
    );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🔎 MACHINE VALIDATION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

async function validateMachineNumber(machineNo) {
    try {
        const url = `http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7/get_machine_by_machine_no.php?machine_no=${machineNo}`;
        const r = await axios.get(url, {
            timeout: API_TIMEOUT,
            headers: API_HEADERS,
            validateStatus: s => s < 500,
        });

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
        return { valid: false, reason: "Not found" };
    } catch (err) {
        console.error("❌ Machine validation:", err.message);
        return { valid: false, reason: "API error" };
    }
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📤 COMPLAINT SUBMISSION
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

async function submitComplaint(callData) {
    try {
        const data = callData.extractedData;
        const customer = callData.customerData || {};

        const payload = {
            machine_no: data.machine_no || "Unknown",
            customer_name: data.customer_name || customer.name || "Unknown",
            caller_name: data.customer_name || customer.name || "Customer",
            caller_no: data.customer_phone || customer.phone || callData.callingNumber || "Unknown",
            contact_person: data.customer_name || customer.name || "Customer",
            contact_person_number: data.customer_phone || customer.phone || callData.callingNumber || "Unknown",
            machine_model: customer.model || "Unknown",
            sub_model: customer.subModel || "NA",
            installation_date: customer.installationDate || "2025-01-01",
            machine_type: customer.machineType || "Warranty",
            city_id: data.city_id || "4",
            complain_by: "Customer",
            machine_status: data.machine_status || "Running With Problem",
            job_location: data.job_location || "Onsite",
            branch: data.branch || "JAIPUR",
            outlet: data.outlet || "JAIPUR",
            complaint_details: data.complaint_details || "Not provided",
            complaint_title: data.complaint_title || "General Problem",
            sub_title: data.complaint_subtitle || "Other",
            business_partner_code: customer.businessPartnerCode || "NA",
            complaint_sap_id: "NA",
            machine_location_address: data.machine_location_address || "Not provided",
            pincode: "0",
            service_date: "",
            from_time: "",
            to_time: "",
            job_open_lat: data.lat || 0,
            job_open_lng: data.lng || 0,
            job_close_lat: 0,
            job_close_lng: 0,
        };

        console.log("\n📤 [API] Payload:", JSON.stringify(payload, null, 2));

        const r = await axios.post(COMPLAINT_API_URL, payload, {
            timeout: API_TIMEOUT,
            headers: { "Content-Type": "application/json", ...API_HEADERS },
            validateStatus: s => s < 500,
        });

        if (r.status === 200 && r.data?.status === 1) {
            const sapId = r.data.data?.complaint_sap_id || r.data.data?.sap_id;
            const jobId = r.data.data?.job_id;
            console.log(`✅ [API] SAP:${sapId} Job:${jobId}`);
            return { success: true, sapId, jobId };
        }

        console.error("❌ [API] Failed:", r.data?.message);
        return { success: false, error: r.data?.message };

    } catch (err) {
        console.error("❌ [API] Error:", err.message);
        return { success: false, error: err.message };
    }
}

export default router;