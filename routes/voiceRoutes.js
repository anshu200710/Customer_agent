/**
 * voice.js — Twilio Voice Router for Priya (JCB Complaint Bot)
 *
 * CORRECTIONS FROM AUDIO ANALYSIS OF REAL CALLS:
 *
 * 1. TIMEOUTS (most critical fix):
 *    - Real calls: 114 turns in 6 minutes, avg speech 1-4s, max 7.4s
 *    - speechTimeout="auto" ✓ (keep — waits for natural pause)
 *    - timeout: 8 (was 3 — too short, cut customers off)
 *    - maxSpeechTime: 25 (was 10 — customers explain up to 7.4s)
 *    - pause after speak: 2s (gives customer breathing room)
 *
 * 2. TURN LIMIT:
 *    - Raised to 60 (was 25-28 — real 6-min calls = 114 turns)
 *
 * 3. SILENCE HANDLING:
 *    - Short acks ("haan", "ok", "theek") NOT treated as silence
 *    - Silence threshold raised: 8 turns with data (was 5/3)
 *
 * 4. CONVERSATION FLOW:
 *    - Machine found → ask complaint directly (skip intermediate questions)
 *    - "nahi" at final confirm = submit, not cancel
 *    - City not found → re-ask with examples, don't crash flow
 *    - Side questions → answer + redirect without losing state
 *    - No double "save kar dun?" prompts
 *    - Chassis chunk feedback: show accumulated digits clearly
 *
 * 5. PHONE FLOW:
 *    - "nahi" at phone confirm = keep existing number (not skip)
 *    - Chunked phone collected in awaitingAlternatePhone too
 *    - Non-digit input while collecting phone → re-ask clearly
 *
 * 6. AI CALL:
 *    - Filler words stripped ("ji", "achha", "bahut", "bhadiya")
 *    - Hard guards: never submit without machine + city + phone validated
 */

import express from "express";
import twilio from "twilio";
import axios from "axios";
import {
  getSmartAIResponse,
  extractAllData,
  extractAllComplaintTitles,
  sanitizeExtractedData,
  matchServiceCenter,
  parsePhoneFromText,
  generateChassisVariations,
  normalizeSpokenDigits,
} from "../utils/ai.js";
import {
  getSideAnswer,
  isPositiveConfirmation,
  isHardCancel,
  isNoMoreProblems,
  isAddMoreProblem,
  getAngryResponse,
  getFinalConfirmPrompt,
  getSilenceResponse,
} from "../utils/knowledgeBase.js";

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;
const activeCalls = new Map();

const BASE_URL = "http://gprs.rajeshmotors.com/jcbServiceEnginerAPIv7";
const COMPLAINT_URL = `${BASE_URL}/ai_call_complaint.php`;
const API_TIMEOUT = 12000;
const API_HEADERS = { JCBSERVICEAPI: "MakeInJcb" };

/* ═══════════════════════════════════════════════════════════════
   REQUIRED FIELDS CHECK
═══════════════════════════════════════════════════════════════ */
function missingField(d) {
  if (!d.machine_no || !/^\d{4,7}$/.test(d.machine_no)) return "machine_no";
  if (!d.complaint_title) return "complaint_title";
  if (!d.machine_status) return "machine_status";
  if (!d.city || !d.city_id) return "city";
  if (!d.customer_phone || !/^[6-9]\d{9}(?:,\s*[6-9]\d{9})*$/.test(String(d.customer_phone)))
    return "customer_phone";
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   SIDE QUESTION HANDLER (natural answers, not scripted)
═══════════════════════════════════════════════════════════════ */
function answerSideQuestion(text) {
  const lo = text.toLowerCase();
  if (/aapka naam|tumhara naam|main kaun|kaun bol raha|tum kaun|aap kaun/.test(lo))
    return "Main Priya hun, Rajesh Motors se.";
  if (/engineer.*(kab|kab tak|aayega|kitni der)/.test(lo))
    return "Complaint register hote hi engineer contact karega.";
  if (/(kitna lagega|charge|price|kitna paisa|cost|fee)/.test(lo))
    return "Engineer visit ke baad charge batayega. Warranty mein free hoga.";
  if (/(warranty|waranti)/.test(lo))
    return "Machine ki warranty ke baare mein engineer batayega.";
  if (/(phone|number|mobile).*(kyu|kyo|kaise|kya use)/.test(lo))
    return "Engineer contact ke liye number chahiye.";
  if (/(kitni der|wait|kab tak|time lagega)/.test(lo))
    return "2 se 4 ghante mein engineer contact karega.";
  if (/(rajesh motors|company|center|branch)/.test(lo))
    return "Rajesh Motors Rajasthan ka JCB authorized service center hai.";
  return null;
}

/* ═══════════════════════════════════════════════════════════════
   TTS HELPERS
   Key fix from audio analysis:
   - timeout=8 (was 3) — customers need time after bot finishes speaking
   - maxSpeechTime=25 (was 10) — long explanations up to 7.4s in real calls
   - pause after speak = 2s breathing room
═══════════════════════════════════════════════════════════════ */
const TTS_VOICE = "Google.hi-IN-Wavenet-A";
const TTS_LANG = "hi-IN";

function speak(twiml, text) {
  const gather = twiml.gather({
    input: "speech dtmf",
    language: TTS_LANG,
    speechTimeout: "auto",     // waits for natural pause
    timeout: 8,                // FIX: was 3 — now 8s before treating as silence
    maxSpeechTime: 25,         // FIX: was 10 — customers explain up to 7.4s
    actionOnEmptyResult: true,
    action: "/voice/process",
    method: "POST",
    enhanced: true,
    speechModel: "phone_call",
  });
  gather.say({ voice: TTS_VOICE, language: TTS_LANG }, text);
  gather.pause({ length: 2 }); // breathing room after bot speaks
}

function gatherSilently(twiml) {
  const gather = twiml.gather({
    input: "speech dtmf",
    language: TTS_LANG,
    speechTimeout: "auto",
    timeout: 10,               // longer window for chunked number input
    maxSpeechTime: 25,
    actionOnEmptyResult: true,
    action: "/voice/process",
    method: "POST",
    enhanced: true,
    speechModel: "phone_call",
  });
  gather.pause({ length: 2 });
}

function sayFinal(twiml, text) {
  twiml.say({ voice: TTS_VOICE, language: TTS_LANG }, text);
}

/* ═══════════════════════════════════════════════════════════════
   STRIP ROBOTIC FILLER WORDS from any TTS text
═══════════════════════════════════════════════════════════════ */
function cleanTTS(text) {
  return (text || "")
    .replace(/\bji\b/gi, "")
    .replace(/\bachcha\b/gi, "")
    .replace(/\bachha\b/gi, "")
    .replace(/\bokay\b/gi, "")
    .replace(/\bok\b/gi, "")
    .replace(/\bbahut\b/gi, "")
    .replace(/\bbhadiya\b/gi, "")
    .replace(/\bbilkul\b/gi, "")
    .replace(/\bswagat\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ═══════════════════════════════════════════════════════════════
   INITIAL CALL HANDLER
═══════════════════════════════════════════════════════════════ */
router.post("/", async (req, res) => {
  const { CallSid, From } = req.body;
  const { machine_no: preloadedMachineNo } = req.query;
  const callerPhone =
    From?.replace(/^\+91/, "").replace(/^\+/, "").slice(-10) || "";

  console.log(`\n${"═".repeat(60)}`);
  console.log(
    `📞 [NEW CALL] ${CallSid} | ${callerPhone} | machine:${preloadedMachineNo || "—"}`
  );

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
      // Phone flow
      pendingPhoneConfirm: false,
      awaitingPhoneConfirm: false,
      awaitingAlternatePhone: false,
      phonePartials: [],
      phoneAccumulated: "",
      awaitingPhoneMore: false,
      // Chassis flow
      machineNotFoundCount: 0,
      chassisPartials: [],
      chassisAccumulated: "",
      awaitingChassisMore: false,
      // City flow
      cityConfirmed: false,
      pendingCityConfirm: false,
      awaitingCityConfirm: false,
      cityNotFoundCount: 0,
      // Final confirm
      awaitingFinalConfirm: false,
      // Existing complaint
      awaitingComplaintAction: false,
      existingComplaintId: null,
      // Pre-fetched phone data
      _phoneData: null,
    };

    // Silent phone-based pre-lookup
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

    // Natural greeting — no "swagat" filler
    const greeting = callData.customerData
      ? `Namaste ${callData.customerData.name.split(" ")[0]}, kya problem hai machine mein?`
      : "Namaste, Rajesh Motors se baat kar rahi hun. Kya problem hai?";

    speak(twiml, greeting);
    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("❌ [START]", err.message);
    sayFinal(twiml, "Thodi problem aa gayi. Thodi der baad call karein.");
    res.type("text/xml").send(twiml.toString());
  }
});

/* ═══════════════════════════════════════════════════════════════
   PROCESS HANDLER — main conversation logic
═══════════════════════════════════════════════════════════════ */
router.post("/process", async (req, res) => {
  const { CallSid, SpeechResult } = req.body;
  const twiml = new VoiceResponse();

  try {
    const callData = activeCalls.get(CallSid);
    if (!callData) {
      sayFinal(twiml, "Dobara call karein.");
      twiml.hangup();
      return res.type("text/xml").send(twiml.toString());
    }

    const userInput = SpeechResult?.trim() || "";
    callData.turnCount++;
    const lo = userInput.toLowerCase();

    console.log(`\n${"─".repeat(50)}`);
    console.log(`🔄 [T${callData.turnCount}] "${userInput || "[SILENCE]"}"`);

    // ── Hard turn limit (raised from 25 to 60 — real calls = 114 turns) ──
    if (callData.turnCount > 60) {
      sayFinal(twiml, "Engineer ko message kar diya. Dhanyavaad!");
      twiml.hangup();
      activeCalls.delete(CallSid);
      return res.type("text/xml").send(twiml.toString());
    }

    // ── Silence handling ─────────────────────────────────────────────
    // FIX: Short acks like "haan", "ok", "theek" are NOT silence
    const isShortAck = /^(haan|ha|han|ok|okay|theek|hmm|acha|hm|ji|yes|nahi|nai|no)$/i.test(
      userInput.trim()
    );

    if ((!userInput || userInput.length < 2) && !isShortAck) {
      callData.silenceCount++;
      const hasData = !!(callData.customerData || callData.extractedData.machine_no);
      // FIX: Raised silence threshold — real calls have natural pauses
      if (callData.silenceCount >= (hasData ? 8 : 5)) {
        sayFinal(twiml, "Koi awaaz nahi aayi. Dobara call karein.");
        twiml.hangup();
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }
      speak(
        twiml,
        getSilenceResponse(callData.silenceCount)
      );
      activeCalls.set(CallSid, callData);
      return res.type("text/xml").send(twiml.toString());
    }
    callData.silenceCount = 0;

    // ── Side question handling — answer + redirect to next field ────
    // Only if not in a critical awaiting state
    const notInCriticalState =
      !callData.awaitingPhoneConfirm &&
      !callData.awaitingAlternatePhone &&
      !callData.awaitingCityConfirm &&
      !callData.awaitingComplaintAction &&
      !callData.awaitingFinalConfirm &&
      !callData.awaitingChassisMore &&
      !callData.awaitingPhoneMore;

    if (notInCriticalState) {
      const sideAns = answerSideQuestion(userInput);
      if (sideAns) {
        const missing = missingField(callData.extractedData);
        let redirect = "";
        if (missing === "machine_no") redirect = " Chassis number bataiye.";
        else if (missing === "complaint_title") redirect = " Machine mein kya problem hai?";
        else if (missing === "machine_status") redirect = " Machine band hai ya chal rahi hai?";
        else if (missing === "city") redirect = " Machine kis shehar mein hai?";
        else if (missing === "customer_phone") redirect = " Mobile number bataiye.";

        const combined = cleanTTS(sideAns + redirect);
        callData.messages.push({ role: "assistant", text: combined, timestamp: new Date() });
        activeCalls.set(CallSid, callData);
        speak(twiml, combined);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });

    // ── Early complaint capture — extract even before machine found ──
    const earlyComplaints = extractAllComplaintTitles(userInput);
    if (earlyComplaints.length) {
      if (!callData.extractedData.complaint_title)
        callData.extractedData.complaint_title = earlyComplaints[0];
      const existing = callData.extractedData.complaint_details
        ? callData.extractedData.complaint_details.split("; ")
        : [];
      callData.extractedData.complaint_details = [
        ...new Set([...existing, ...earlyComplaints]),
      ].join("; ");
    }

    // ── Sanitize ─────────────────────────────────────────────────────
    callData.extractedData = sanitizeExtractedData(callData.extractedData);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1.5: Chassis chunk accumulation
    // Audio: customers give chassis in 2-4 chunks of 2-5 digits each
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingChassisMore && !callData.customerData) {
      const digitsInInput = normalizeSpokenDigits(userInput);
      if (digitsInInput.length > 0 && digitsInInput.length <= 7) {
        if (digitsInInput.length >= 6) {
          callData.chassisPartials = [digitsInInput]; // full number given
        } else {
          callData.chassisPartials.push(digitsInInput);
        }
        console.log(
          `   🔢 Chassis chunk: "${digitsInInput}" → partials: [${callData.chassisPartials.join(", ")}]`
        );

        const variations = generateChassisVariations(callData.chassisPartials);
        let foundMachine = null;
        for (const variation of variations) {
          if (/^\d{4,7}$/.test(variation)) {
            const v = await validateMachineNumber(variation);
            if (v.valid) {
              foundMachine = { variation, data: v.data };
              break;
            }
          }
        }

        if (foundMachine) {
          callData.customerData = foundMachine.data;
          callData.extractedData.machine_no = foundMachine.data.machineNo;
          callData.extractedData.customer_name = foundMachine.data.name;
          callData.pendingPhoneConfirm = true;
          callData.machineNotFoundCount = 0;
          callData.awaitingChassisMore = false;
          callData.chassisPartials = [];
          callData.chassisAccumulated = "";
          console.log(`   ✅ Machine found via chunks: ${foundMachine.data.name}`);
        } else {
          callData.machineNotFoundCount++;
          callData.chassisAccumulated = callData.chassisPartials.join("");
          console.warn(
            `   ❌ Not found in variations: [${variations.join(", ")}] (attempt ${callData.machineNotFoundCount})`
          );

          if (callData.machineNotFoundCount >= 5) {
            // Try phone fallback
            if (callData.callingNumber) {
              const pr =
                callData._phoneData ||
                (await findMachineByPhone(callData.callingNumber));
              if (pr.valid) {
                callData.customerData = pr.data;
                callData.extractedData.machine_no = pr.data.machineNo;
                callData.extractedData.customer_name = pr.data.name;
                callData.pendingPhoneConfirm = true;
                callData.machineNotFoundCount = 0;
                callData.awaitingChassisMore = false;
                console.log(`   ✅ Phone fallback: ${pr.data.name}`);
              } else {
                sayFinal(twiml, "Chassis number nahi mil raha. Engineer bhej raha hun. Dhanyavaad!");
                twiml.hangup();
                activeCalls.delete(CallSid);
                return res.type("text/xml").send(twiml.toString());
              }
            } else {
              sayFinal(twiml, "Chassis number nahi mil raha. Engineer bhej raha hun. Dhanyavaad!");
              twiml.hangup();
              activeCalls.delete(CallSid);
              return res.type("text/xml").send(twiml.toString());
            }
          } else {
            callData.awaitingChassisMore = true;
            activeCalls.set(CallSid, callData);
            // Show what's collected so far — natural feedback
            const soFar = callData.chassisAccumulated.split("").join(" ");
            speak(
              twiml,
              `Abhi tak ${soFar} mila hai. Baaki number bataiye dhere se.`
            );
            return res.type("text/xml").send(twiml.toString());
          }
        }
      }
      callData.awaitingChassisMore = false;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 1.5.1: Phone chunk accumulation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingPhoneMore) {
      const fullPhone = parsePhoneFromText(userInput);
      if (fullPhone) {
        callData.extractedData.customer_phone = fullPhone;
        callData.phonePartials = [];
        callData.phoneAccumulated = "";
        callData.awaitingPhoneMore = false;
        console.log(`   ✅ Phone from full input: ${fullPhone}`);
      } else {
        const digitsInInput = normalizeSpokenDigits(userInput);
        if (digitsInInput.length > 0 && digitsInInput.length <= 10) {
          if (digitsInInput.length >= 9) {
            callData.phonePartials = [digitsInInput];
          } else {
            callData.phonePartials.push(digitsInInput);
          }
          callData.phoneAccumulated = callData.phonePartials.join("");
          const accumulated = callData.phoneAccumulated;
          console.log(`   📱 Phone chunk: "${digitsInInput}" → accumulated: "${accumulated}"`);

          if (accumulated.length === 10 && /^[6-9]/.test(accumulated)) {
            callData.extractedData.customer_phone = accumulated;
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            callData.awaitingPhoneMore = false;
            console.log(`   ✅ Phone via chunks: ${accumulated}`);
          } else if (accumulated.length < 5) {
            // Wait silently for more
            callData.awaitingPhoneMore = true;
            activeCalls.set(CallSid, callData);
            gatherSilently(twiml);
            return res.type("text/xml").send(twiml.toString());
          } else if (accumulated.length < 10) {
            callData.awaitingPhoneMore = true;
            activeCalls.set(CallSid, callData);
            speak(
              twiml,
              `Abhi ${accumulated.split("").join(" ")} mila hai. Baaki number bataiye.`
            );
            return res.type("text/xml").send(twiml.toString());
          } else {
            // Invalid — reset and re-ask
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            callData.awaitingPhoneMore = false;
            speak(twiml, "Phone number sahi nahi laga. Pura 10 digit number dobara bataiye.");
            return res.type("text/xml").send(twiml.toString());
          }
        } else {
          // Non-digit input — stay in phone collection
          callData.awaitingPhoneMore = true;
          activeCalls.set(CallSid, callData);
          speak(twiml, "Pura 10 digit mobile number bataiye.");
          return res.type("text/xml").send(twiml.toString());
        }
      }
      callData.awaitingPhoneMore = false;
    }

    // ── Regex extraction ──────────────────────────────────────────────
    const rxData = extractAllData(userInput, callData.extractedData);
    for (const [k, v] of Object.entries(rxData)) {
      if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
    }

    // ── Multi-complaint accumulation ──────────────────────────────────
    const allComplaints = extractAllComplaintTitles(userInput);
    if (allComplaints.length > 0) {
      if (!callData.extractedData.complaint_title)
        callData.extractedData.complaint_title = allComplaints[0];
      const existingDetails = callData.extractedData.complaint_details
        ? callData.extractedData.complaint_details
            .split("; ")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const alreadyHave = new Set([
        callData.extractedData.complaint_title,
        ...existingDetails,
      ]);
      const newOnes = allComplaints.filter((c) => !alreadyHave.has(c));
      if (newOnes.length > 0) {
        callData.extractedData.complaint_details = [
          ...existingDetails,
          ...newOnes,
        ].join("; ");
        console.log(`   📝 Multi-complaints: [${newOnes.join(", ")}]`);
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 2: City matching
    // FIX: if city not found → clear + re-ask with examples
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.extractedData.city && !callData.extractedData.city_id) {
      const mc = matchServiceCenter(callData.extractedData.city);
      if (mc) {
        callData.extractedData.city = mc.city_name;
        callData.extractedData.city_id = mc.branch_code;
        callData.extractedData.branch = mc.branch_name;
        callData.extractedData.outlet = mc.city_name;
        callData.extractedData.lat = mc.lat;
        callData.extractedData.lng = mc.lng;
        callData.cityNotFoundCount = 0;
        if (!callData.cityConfirmed) callData.pendingCityConfirm = true;
        console.log(`   🗺️  ${mc.city_name} → ${mc.branch_name}`);
      } else {
        const attempted = callData.extractedData.city;
        callData.extractedData.city = null; // clear invalid city
        callData.cityNotFoundCount = (callData.cityNotFoundCount || 0) + 1;
        console.log(
          `   ❌ City not matched: ${attempted} (attempt ${callData.cityNotFoundCount})`
        );
        activeCalls.set(CallSid, callData);
        // Give examples on 2nd+ failure
        const hint =
          callData.cityNotFoundCount >= 2
            ? "Jaise Jaipur, Ajmer, Kota, Udaipur, Alwar, Sikar, Jodhpur — in mein se koi batao."
            : "Yeh city hamare system mein nahi mili. Rajasthan ki woh city bataiye jahan machine khadi hai.";
        speak(twiml, hint);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 4: Machine number lookup
    // FIX: after finding machine, ask complaint directly
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!callData.customerData && callData.extractedData.machine_no) {
      const v = await validateMachineNumber(callData.extractedData.machine_no);
      if (v.valid) {
        callData.customerData = v.data;
        callData.extractedData.customer_name = v.data.name;
        callData.machineNotFoundCount = 0;
        callData.awaitingChassisMore = false;
        callData.chassisPartials = [];
        callData.chassisAccumulated = "";
        console.log(`   ✅ Machine found: ${v.data.name}`);

        // FIX: If complaint already captured from initial speech, skip asking
        if (!callData.extractedData.complaint_title) {
          const customerName = v.data.name.split(" ")[0] || "ji";
          activeCalls.set(CallSid, callData);
          speak(twiml, `${customerName} ji, machine mein kya problem hai?`);
          return res.type("text/xml").send(twiml.toString());
        }
        // else fall through — complaint already known
      } else {
        callData.machineNotFoundCount++;
        callData.extractedData.machine_no = null;
        console.warn(
          `   ❌ Machine not found (attempt ${callData.machineNotFoundCount})`
        );

        // Phone fallback on 3rd failure
        if (callData.machineNotFoundCount === 3 && callData.callingNumber) {
          const pr =
            callData._phoneData ||
            (await findMachineByPhone(callData.callingNumber));
          if (pr.valid) {
            callData.customerData = pr.data;
            callData.extractedData.machine_no = pr.data.machineNo;
            callData.extractedData.customer_name = pr.data.name;
            callData.machineNotFoundCount = 0;
            callData.awaitingChassisMore = false;
            console.log(`   ✅ Phone fallback: ${pr.data.name}`);

            if (!callData.extractedData.complaint_title) {
              const customerName = pr.data.name.split(" ")[0] || "ji";
              activeCalls.set(CallSid, callData);
              speak(twiml, `${customerName} ji, machine mein kya problem hai?`);
              return res.type("text/xml").send(twiml.toString());
            }
          }
        }

        if (!callData.customerData && callData.machineNotFoundCount < 5) {
          callData.awaitingChassisMore = true;
          callData.chassisPartials = [];
          callData.chassisAccumulated = "";
          activeCalls.set(CallSid, callData);
          speak(
            twiml,
            "Yeh chassis number nahi mila. Dhere dhere ek ek number boliye."
          );
          return res.type("text/xml").send(twiml.toString());
        }

        if (callData.machineNotFoundCount >= 5) {
          sayFinal(twiml, "Chassis number nahi mil raha. Engineer ko message bhej raha hun. Dhanyavaad!");
          twiml.hangup();
          activeCalls.delete(CallSid);
          return res.type("text/xml").send(twiml.toString());
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: Phone confirmation prompt (one-time)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.pendingPhoneConfirm && callData.customerData?.phone) {
      const ph = String(callData.customerData.phone);
      const lastTwo = ph.slice(-2);
      callData.pendingPhoneConfirm = false;
      callData.awaitingPhoneConfirm = true;
      activeCalls.set(CallSid, callData);
      speak(
        twiml,
        `${callData.customerData.name.split(" ")[0]}, last mein ${lastTwo} wala number callback ke liye sahi hai? Ya naya number denge?`
      );
      return res.type("text/xml").send(twiml.toString());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6: Handle phone confirm answer
    // FIX: "nahi" at phone confirm = keep existing number, move on
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingPhoneConfirm) {
      callData.awaitingPhoneConfirm = false;
      const foundPhone = parsePhoneFromText(userInput);

      // "nahi" = customer doesn't want to change = keep existing
      const isNoResponse =
        /\b(nahi|nhi|nai|nahin|no)\b/i.test(userInput) &&
        !/(change|naya|new|alag|badal)/i.test(userInput);

      if (isNoResponse && callData.customerData?.phone) {
        callData.extractedData.customer_phone = callData.customerData.phone;
        console.log(`   ✅ Phone kept (nahi = keep existing): ${callData.customerData.phone}`);
      } else if (foundPhone) {
        callData.extractedData.customer_phone = foundPhone;
        console.log(`   ✅ Phone changed directly: ${foundPhone}`);
      } else if (isPositiveConfirmation(userInput) && callData.customerData?.phone) {
        callData.extractedData.customer_phone = callData.customerData.phone;
        console.log(`   ✅ Phone confirmed: ${callData.customerData.phone}`);
      } else if (/(change|naya|new|alag|badal|dusra)/i.test(lo)) {
        callData.awaitingAlternatePhone = true;
        activeCalls.set(CallSid, callData);
        speak(twiml, "Pura 10 digit naya number bataiye.");
        return res.type("text/xml").send(twiml.toString());
      } else {
        // Unclear — ask again clearly
        callData.awaitingPhoneConfirm = true;
        activeCalls.set(CallSid, callData);
        const ph = String(callData.customerData?.phone || "").slice(-2);
        speak(
          twiml,
          `Last mein ${ph} wala number sahi hai ya naya number dena hai?`
        );
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6.1: Alternate phone collection
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingAlternatePhone) {
      const foundPhone = parsePhoneFromText(userInput);
      if (foundPhone) {
        const orig = callData.customerData?.phone || "";
        callData.extractedData.customer_phone =
          orig && orig !== foundPhone ? `${orig}, ${foundPhone}` : foundPhone;
        callData.awaitingAlternatePhone = false;
        callData.phonePartials = [];
        callData.phoneAccumulated = "";
        console.log(`   ✅ Alternate phone: ${callData.extractedData.customer_phone}`);
      } else {
        const digitsInInput = normalizeSpokenDigits(userInput);
        if (digitsInInput.length > 0) {
          if (digitsInInput.length >= 9) {
            callData.phonePartials = [digitsInInput];
          } else {
            callData.phonePartials.push(digitsInInput);
          }
          callData.phoneAccumulated = callData.phonePartials.join("");
          const accumulated = callData.phoneAccumulated;

          if (accumulated.length === 10 && /^[6-9]/.test(accumulated)) {
            const orig = callData.customerData?.phone || "";
            callData.extractedData.customer_phone =
              orig && orig !== accumulated
                ? `${orig}, ${accumulated}`
                : accumulated;
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            callData.awaitingAlternatePhone = false;
            console.log(`   ✅ Alternate phone via chunks: ${accumulated}`);
          } else if (accumulated.length < 10) {
            activeCalls.set(CallSid, callData);
            speak(
              twiml,
              `Abhi ${accumulated.split("").join(" ")} mila hai. Baaki number bataiye.`
            );
            return res.type("text/xml").send(twiml.toString());
          } else {
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            speak(twiml, "Number sahi nahi laga. Pura 10 digit number bataiye.");
            return res.type("text/xml").send(twiml.toString());
          }
        } else {
          // No digits — re-ask
          activeCalls.set(CallSid, callData);
          speak(twiml, "Pura 10 digit mobile number bataiye.");
          return res.type("text/xml").send(twiml.toString());
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 6.7: City confirmation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.pendingCityConfirm) {
      callData.pendingCityConfirm = false;
      callData.awaitingCityConfirm = true;
      activeCalls.set(CallSid, callData);
      speak(
        twiml,
        `${callData.extractedData.city} mein ${callData.extractedData.branch} branch — kya yahi sahi hai?`
      );
      return res.type("text/xml").send(twiml.toString());
    }

    if (callData.awaitingCityConfirm) {
      callData.awaitingCityConfirm = false;
      const isNo = /(nahi|nhi|no|galat|wrong|nai)/i.test(lo);
      if (!isNo) {
        callData.cityConfirmed = true;
        console.log(`   ✅ City confirmed: ${callData.extractedData.city}`);
      } else {
        callData.extractedData.city = null;
        callData.extractedData.city_id = null;
        callData.extractedData.branch = null;
        console.log("   🔄 City rejected — asking again");
        speak(twiml, "Rajasthan ki woh city bataiye jahan machine abhi khadi hai.");
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 7: Existing complaint detection
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!callData.awaitingComplaintAction) {
      const repeatRx =
        /(pehle complaint|already complaint|complaint kar di|complaint ki thi|engineer nahi aaya|engineer nhi aaya|aaya nahi|kab aayega|bahut der|kal se wait|2 din|3 din|dobara complaint|phir se complaint|re-register)/i;
      if (repeatRx.test(lo)) {
        callData.awaitingComplaintAction = true;
        let existingInfo = null;
        const machNo =
          callData.extractedData.machine_no ||
          callData.customerData?.machineNo;
        if (machNo) {
          existingInfo = await getExistingComplaint(machNo);
        } else if (callData.callingNumber) {
          const pr =
            callData._phoneData ||
            (await findMachineByPhone(callData.callingNumber));
          if (pr.valid) {
            callData.customerData = pr.data;
            callData.extractedData.machine_no = pr.data.machineNo;
            existingInfo = await getExistingComplaint(pr.data.machineNo);
          }
        }

        if (existingInfo?.found) {
          callData.existingComplaintId = existingInfo.complaintId;
          activeCalls.set(CallSid, callData);
          speak(
            twiml,
            `Complaint ${existingInfo.complaintId} mili. Nayi complaint karein ya engineer ko urgent message bhejein?`
          );
        } else {
          callData.awaitingComplaintAction = false;
          activeCalls.set(CallSid, callData);
          speak(twiml, "Pehli complaint nahi mili. Nayi register karte hain. Chassis number bataiye.");
        }
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // STEP 8: Handle complaint-action choice
    if (callData.awaitingComplaintAction) {
      callData.awaitingComplaintAction = false;
      if (/(urgent|jaldi|message|engineer ko|escalate|priority)/i.test(lo)) {
        await escalateToEngineer(callData.existingComplaintId, callData.callingNumber);
        sayFinal(twiml, "Engineer ko urgent message bhej diya. Jaldi aayega. Dhanyavaad!");
        twiml.hangup();
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 9: Final confirmation trigger
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const missing = missingField(callData.extractedData);
    const machineValidated = !!callData.customerData;

    if (!missing && machineValidated && callData.cityConfirmed && !callData.awaitingFinalConfirm) {
      callData.awaitingFinalConfirm = true;
      activeCalls.set(CallSid, callData);
      // Vary the final confirm prompt to avoid sounding robotic
      speak(twiml, getFinalConfirmPrompt());
      return res.type("text/xml").send(twiml.toString());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 10: Handle final confirm answer
    // FIX: "nahi" = "no more problems" = SUBMIT (not cancel)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingFinalConfirm) {
      const addingMore = extractAllComplaintTitles(userInput);
      const isConfirming = isPositiveConfirmation(userInput);
      const noMore = isNoMoreProblems(userInput);
      const isCancel = isHardCancel(userInput); // only "band karo", "cancel" etc.

      // True cancel (rare)
      if (isCancel && !noMore) {
        sayFinal(twiml, "Agar kuch aur ho toh dobara call karein. Dhanyavaad!");
        twiml.hangup();
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }

      // Customer adds more problems
      if (addingMore.length > 0 && !isConfirming && !noMore) {
        const existingDetails = callData.extractedData.complaint_details
          ? callData.extractedData.complaint_details
              .split("; ")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const alreadyHave = new Set([
          callData.extractedData.complaint_title,
          ...existingDetails,
        ]);
        const newOnes = addingMore.filter((c) => !alreadyHave.has(c));
        if (newOnes.length > 0) {
          callData.extractedData.complaint_details = [
            ...existingDetails,
            ...newOnes,
          ].join("; ");
          console.log(`   📝 Added at confirm: [${newOnes.join(", ")}]`);
        }
        callData.awaitingFinalConfirm = false;
        activeCalls.set(CallSid, callData);
        return await handleSubmit(callData, twiml, res, CallSid);
      }

      // Side question at this stage → answer briefly then submit
      const sideAns = answerSideQuestion(userInput);
      if (sideAns && !isConfirming && !noMore) {
        twiml.say({ voice: TTS_VOICE, language: TTS_LANG }, sideAns);
        callData.awaitingFinalConfirm = false;
        activeCalls.set(CallSid, callData);
        return await handleSubmit(callData, twiml, res, CallSid);
      }

      // "nahi" or "haan" or "save kar do" or anything unclear → all submit
      callData.awaitingFinalConfirm = false;
      activeCalls.set(CallSid, callData);
      return await handleSubmit(callData, twiml, res, CallSid);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 11: AI response for anything not caught above
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log(
      `   📊 ${JSON.stringify({
        machine: callData.extractedData.machine_no || "❌",
        complaint: callData.extractedData.complaint_title || "❌",
        status: callData.extractedData.machine_status || "❌",
        city: callData.extractedData.city || "❌",
        phone: callData.extractedData.customer_phone || "❌",
        missing: missing || "✅ READY",
      })}`
    );

    // Safety net — all data ready
    if (!missing && machineValidated) {
      callData.awaitingFinalConfirm = true;
      activeCalls.set(CallSid, callData);
      speak(twiml, getFinalConfirmPrompt());
      return res.type("text/xml").send(twiml.toString());
    }

    const aiResp = await getSmartAIResponse(callData);

    // Merge AI-extracted data
    if (aiResp.extractedData) {
      for (const [k, v] of Object.entries(aiResp.extractedData)) {
        if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
      }
      // Re-run city match if AI found one
      if (callData.extractedData.city && !callData.extractedData.city_id) {
        const mc = matchServiceCenter(callData.extractedData.city);
        if (mc) {
          callData.extractedData.city = mc.city_name;
          callData.extractedData.city_id = mc.branch_code;
          callData.extractedData.branch = mc.branch_name;
          callData.extractedData.outlet = mc.city_name;
          callData.extractedData.lat = mc.lat;
          callData.extractedData.lng = mc.lng;
        } else {
          callData.extractedData.city = null; // reject hallucinated city
        }
      }
    }

    // Check again after AI
    const stillMissing = missingField(callData.extractedData);
    if (!stillMissing && machineValidated && callData.cityConfirmed) {
      callData.awaitingFinalConfirm = true;
      callData.messages.push({
        role: "assistant",
        text: aiResp.text,
        timestamp: new Date(),
      });
      activeCalls.set(CallSid, callData);
      speak(twiml, getFinalConfirmPrompt());
      return res.type("text/xml").send(twiml.toString());
    }

    // HARD GUARDS — never submit without validation
    if (aiResp.readyToSubmit && !machineValidated) {
      console.warn("   ⛔ AI ready but machine NOT validated — blocking");
      aiResp.readyToSubmit = false;
    }
    if (aiResp.readyToSubmit && !callData.cityConfirmed) {
      console.warn("   ⛔ AI ready but city NOT confirmed — blocking");
      aiResp.readyToSubmit = false;
    }
    if (aiResp.readyToSubmit && !callData.extractedData.customer_phone) {
      console.warn("   ⛔ AI ready but phone NOT confirmed — blocking");
      aiResp.readyToSubmit = false;
    }

    if (
      aiResp.readyToSubmit &&
      machineValidated &&
      callData.cityConfirmed &&
      callData.extractedData.customer_phone
    ) {
      callData.messages.push({
        role: "assistant",
        text: aiResp.text,
        timestamp: new Date(),
      });
      return await handleSubmit(callData, twiml, res, CallSid);
    }

    callData.messages.push({
      role: "assistant",
      text: aiResp.text,
      timestamp: new Date(),
    });
    activeCalls.set(CallSid, callData);
    speak(twiml, cleanTTS(aiResp.text));
    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("❌ [PROCESS]", err.message);
    sayFinal(twiml, "Thodi dikkat aa gayi. Engineer ko bhej raha hun.");
    twiml.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
    activeCalls.delete(CallSid);
    res.type("text/xml").send(twiml.toString());
  }
});

/* ═══════════════════════════════════════════════════════════════
   SUBMIT COMPLAINT
═══════════════════════════════════════════════════════════════ */
async function handleSubmit(callData, twiml, res, CallSid) {
  console.log("\n🚀 [SUBMITTING COMPLAINT]");
  const result = await submitComplaint(callData);
  const id = result.sapId || result.jobId || "";

  if (id) {
    sayFinal(
      twiml,
      `Complaint register ho gayi. Number hai ${String(id)
        .split("")
        .join(" ")}. Engineer contact karega. Shukriya!`
    );
  } else {
    sayFinal(twiml, "Complaint register ho gayi. Engineer contact karega. Shukriya!");
  }

  twiml.hangup();
  activeCalls.delete(CallSid);
  return res.type("text/xml").send(twiml.toString());
}

/* ═══════════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════════ */
async function validateMachineNumber(machineNo) {
  try {
    const r = await axios.get(
      `${BASE_URL}/get_machine_by_machine_no.php?machine_no=${machineNo}`,
      { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: (s) => s < 500 }
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
  } catch {
    return { valid: false };
  }
}

async function findMachineByPhone(phone) {
  if (!phone || phone.length < 8) return { valid: false };
  try {
    const r = await axios.get(
      `${BASE_URL}/get_machine_by_phone.php?phone=${phone}`,
      { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: (s) => s < 500 }
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
  } catch {
    return { valid: false };
  }
}

async function getExistingComplaint(machineNo) {
  if (!machineNo) return { found: false };
  try {
    const r = await axios.get(
      `${BASE_URL}/get_complaint_by_machine.php?machine_no=${machineNo}`,
      { timeout: API_TIMEOUT, headers: API_HEADERS, validateStatus: (s) => s < 500 }
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
        validateStatus: (s) => s < 500,
      }
    );
    console.log(`   🚨 Escalated: ${complaintId}`);
  } catch (err) {
    console.error("❌ Escalate:", err.message);
  }
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
      complaint_details: data.complaint_details || data.complaint_title || "Not provided",
      complaint_title: data.complaint_title || "General Problem",
      sub_title: data.complaint_subtitle || "Other",
      business_partner_code: c.businessPartnerCode || "NA",
      complaint_sap_id: "NA",
      machine_location_address: data.machine_location_address || "Not provided",
      pincode: "0",
      service_date: "",
      from_time: "",
      to_time: "",
    };

    if (data.lat != null && data.lng != null) {
      payload.job_open_lat = data.lat;
      payload.job_open_lng = data.lng;
      payload.job_close_lat = data.lat;
      payload.job_close_lng = data.lng;
    }

    console.log("📤 Submitting:", JSON.stringify(payload, null, 2));

    const r = await axios.post(COMPLAINT_URL, payload, {
      timeout: API_TIMEOUT,
      headers: { "Content-Type": "application/json", ...API_HEADERS },
      validateStatus: (s) => s < 500,
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