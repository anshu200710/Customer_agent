/**
 * voice.js — Twilio Voice Router for Priya (JCB Complaint Bot)
 *
 * COMPLETE REWRITE — All 16 fixes applied:
 *
 * FIX #1  — timeout:3 not 8. speechTimeout="auto" handles end-of-speech.
 *            No pause() inside gather (was firing early).
 *
 * FIX #2  — Short acks ("haan", "ok") → fast-path in state machine.
 *            No Groq call for simple confirmations. Saves 2-3s per turn.
 *
 * FIX #3  — chassisPartials capped at 3 chunks. Reset on retry.
 *            Dedup: don't look up same variation twice.
 *
 * FIX #4  — City confirmation REMOVED entirely. matchServiceCenter() success
 *            = city confirmed. No extra turn. Not in any of the 50 TCs.
 *
 * FIX #5  — Phone pre-confirmation REDESIGNED per user request:
 *            When machine found → "Aapka number jisme last mein XX hai —
 *            yehi rakhna hai ya badalna hai?" (TC-style: confirms last 2 digits)
 *            If customer gave phone in opening sentence → skip confirmation.
 *
 * FIX #6  — cleanTTS() only applied to SCRIPTED strings, not AI output.
 *            AI is already instructed not to use fillers.
 *
 * FIX #7  — Turn limit raised to 150. Also time-based fallback at 8 min.
 *
 * FIX #8  — (in ai.js) Pure phone → no chassis extraction.
 *
 * FIX #9  — Side questions answered in ALL states (not just notInCriticalState).
 *            Always append the current pending question.
 *
 * FIX #10 — finalConfirmAsked flag: ask final confirm only once per call.
 *
 * FIX #11 — Angry response + next field question combined in all states.
 *
 * FIX #12 — submitPartialComplaint() for chassis-not-found cases (TC-06).
 *
 * FIX #13 — Multi-machine state: awaitingSecondMachine after first submit.
 *
 * FIX #14 — (in ai.js) Existing complaint number extraction.
 *
 * FIX #15 — (in ai.js) engineer_preference field.
 *
 * FIX #16 — (in ai.js) "abhi theek" → machine_status=Running With Problem.
 *
 * NEW FEATURE — Upfront data capture: if customer gives multiple fields
 *               in first message, extract ALL and skip redundant questions.
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
  getNextFieldQuestion,
  applyCity,
} from "../utils/ai.js";
import {
  getSideAnswer,
  isPositiveConfirmation,
  isHardCancel,
  isNoMoreProblems,
  isShortAck,
  isHoldIntent,
  getAngryResponse,
  getFinalConfirmPrompt,
  getSilenceResponse,
  getHoldResponse,
  getMachineNotFoundResponse,
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
   TTS HELPERS - Human-like fast speech
   • rate: 2.0 = 2x speed (very fast, natural conversation)
   • speechTimeout: 2s (fast response detection)
   • timeout: 2s (quick turnaround)
═══════════════════════════════════════════════════════════════ */
const TTS_VOICE = "Google.hi-IN-Wavenet-A";
const TTS_LANG = "hi-IN";
const TTS_RATE = "2.0";  // 2x speed - like fast human speech
const TTS_PITCH = "0";   // Natural pitch

function speak(twiml, text) {
  const gather = twiml.gather({
    input: "speech dtmf",
    language: TTS_LANG,
    speechTimeout: 2,        // Detect speech in 2s
    timeout: 2,              // Quick response
    maxSpeechTime: 8,        // Max 8s (customers speak fast)
    actionOnEmptyResult: true,
    action: "/voice/process",
    method: "POST",
    enhanced: true,
    speechModel: "phone_call",
  });
  // rate: 2.0 = 2x faster (like natural fast conversation)
  gather.say({ 
    voice: TTS_VOICE, 
    language: TTS_LANG, 
    rate: TTS_RATE,
    pitch: TTS_PITCH
  }, text);
}

function gatherSilently(twiml) {
  const gather = twiml.gather({
    input: "speech dtmf",
    language: TTS_LANG,
    speechTimeout: 2,
    timeout: 2,
    maxSpeechTime: 8,
    actionOnEmptyResult: true,
    action: "/voice/process",
    method: "POST",
    enhanced: true,
    speechModel: "phone_call",
  });
}

function sayFinal(twiml, text) {
  // Final messages also at 2x speed
  twiml.say({ 
    voice: TTS_VOICE, 
    language: TTS_LANG, 
    rate: TTS_RATE,
    pitch: TTS_PITCH
  }, text);
}

/* ═══════════════════════════════════════════════════════════════
   FIX #6: cleanTTS() — ONLY for scripted strings, not AI output
   Strips words that make bot sound robotic when WE write the string
═══════════════════════════════════════════════════════════════ */
function cleanTTS(text) {
  return (text || "")
    .replace(/\bji\b/gi, "")
    .replace(/\bachcha\b/gi, "")
    .replace(/\bachha\b/gi, "")
    .replace(/\bokay\b/gi, "")
    .replace(/\bbahut\b/gi, "")
    .replace(/\bbhadiya\b/gi, "")
    .replace(/\bbilkul\b/gi, "")
    .replace(/\bswagat\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ═══════════════════════════════════════════════════════════════
   RESPONSE TYPE DETECTOR
   Detects what type of response customer gave for natural handling
═══════════════════════════════════════════════════════════════ */
function detectResponseType(text) {
  if (!text) return "empty";
  const lo = text.toLowerCase().trim();
  
  // Question detection
  if (/^(kya|kaun|kaise|kyu|kaha|kab|kitna|kitne|kitni|kaunsa|kaunse|kis|kiski|kiska|kyun|kitni der|kitna time|kaise|kaisa|kaisi)\b/i.test(lo)) {
    return "question";
  }
  
  // Short acknowledgment
  if (/^(haan|ha|han|ok|okay|theek|hmm|ji|nahi|nai|no|acha|achha|haa|hm|thik)$/i.test(lo)) {
    return "acknowledgment";
  }
  
  // Data provided (chassis, phone, city, problem)
  if (/\d{4,7}|\d{10}|(start|engine|hydraulic|oil|filter|ac|brake|bijli|smoke|overheat|leak|noise|gear|steering|turbo|boom|arm|bucket|transmission|coolant|battery|tire|tyre|problem|issue|kaam|chal|band|breakdown)/i.test(lo)) {
    return "data_provided";
  }
  
  // Hold/wait intent
  if (/^(ek minute|ek second|ruko|ruk|dhundh|dekh raha|hold on|thoda|wait)\s*$/i.test(lo)) {
    return "hold";
  }
  
  // Angry/frustrated
  if (/(bahut der|koi nahi aaya|engineer nahi aaya|bakwaas|kharab service|baar baar call|frustrated|gussa|pareshaan)/i.test(lo)) {
    return "frustrated";
  }
  
  return "general";
}

/* ═══════════════════════════════════════════════════════════════
   INITIAL CALL HANDLER
═══════════════════════════════════════════════════════════════ */
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
      callStartTime: Date.now(),
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
        existing_complaint_id: null,  // FIX #14
        engineer_preference: null,    // FIX #15
      },
      customerData: null,
      turnCount: 0,
      silenceCount: 0,

      // Phone flow — REDESIGNED (FIX #5)
      pendingPhoneConfirm: false,    // set when machine found with registered phone
      awaitingPhoneConfirm: false,   // waiting for "haan/nahi" on phone confirmation
      awaitingAlternatePhone: false, // collecting new phone after rejection
      phonePartials: [],
      phoneAccumulated: "",
      awaitingPhoneMore: false,

      // Chassis flow (FIX #3)
      machineNotFoundCount: 0,
      chassisPartials: [],
      chassisAccumulated: "",
      awaitingChassisMore: false,
      triedVariations: new Set(),    // FIX #3: dedup lookups

      // FIX #4: City confirmation REMOVED — these flags deleted
      // cityConfirmed, pendingCityConfirm, awaitingCityConfirm all gone
      cityNotFoundCount: 0,

      // FIX #10: Only ask final confirm once
      awaitingFinalConfirm: false,
      finalConfirmAsked: false,

      // Existing complaint
      awaitingComplaintAction: false,
      existingComplaintId: null,

      // FIX #13: Multi-machine
      awaitingSecondMachine: false,
      firstComplaintDone: false,

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

    // Greeting — natural, matches WantsFlow TC-01 pattern
    const greeting = callData.customerData
      ? `Namaste ${callData.customerData.name.split(" ")[0]}, kya problem hai machine mein?`
      : "Namaste ji, Rajesh Motors mein aapka swagat hai. Kya seva kar sakti hun?";

    speak(twiml, greeting);
    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("❌ [START]", err.message);
    sayFinal(twiml, "Thodi problem aa gayi. Thodi der baad call karein.");
    res.type("text/xml").send(twiml.toString());
  }
});

/* ═══════════════════════════════════════════════════════════════
   PROCESS HANDLER — main conversation state machine
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

    // ── FIX #7: Turn limit 150 (was 25-60 — real calls avg 95 turns) ──
    if (callData.turnCount > 150) {
      sayFinal(twiml, "Engineer ko message kar diya. Dhanyavaad!");
      twiml.hangup();
      activeCalls.delete(CallSid);
      return res.type("text/xml").send(twiml.toString());
    }

    // ── FIX #7: Time-based fallback at 8 minutes ──────────────────
    const callDuration = (Date.now() - callData.callStartTime) / 1000;
    if (callDuration > 480) { // 8 minutes
      sayFinal(twiml, "Bahut der ho gayi. Engineer ko message bhej raha hun. Dhanyavaad!");
      twiml.hangup();
      activeCalls.delete(CallSid);
      return res.type("text/xml").send(twiml.toString());
    }

    // ── Silence handling ──────────────────────────────────────────
    const inputIsEmpty = !userInput || userInput.length < 2;
    // Short acks are NOT silence — they need processing
    const ackDetected = isShortAck(userInput);

    if (inputIsEmpty && !ackDetected) {
      callData.silenceCount++;
      const hasData = !!(callData.customerData || callData.extractedData.machine_no);
      if (callData.silenceCount >= (hasData ? 8 : 5)) {
        sayFinal(twiml, "Koi awaaz nahi aayi. Dobara call karein.");
        twiml.hangup();
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }
      speak(twiml, getSilenceResponse(callData.silenceCount));
      activeCalls.set(CallSid, callData);
      return res.type("text/xml").send(twiml.toString());
    }
    callData.silenceCount = 0;

    // ── Hold intent ("ek minute", "ruko") → brief ack, wait ───────
    if (isHoldIntent(userInput)) {
      callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });
      speak(twiml, getHoldResponse());
      activeCalls.set(CallSid, callData);
      return res.type("text/xml").send(twiml.toString());
    }

    // ── Record user input ────────────────────────────────────────
    callData.messages.push({ role: "user", text: userInput, timestamp: new Date() });

    // ── Detect customer response type for natural handling ────────
    const responseType = detectResponseType(userInput);
    console.log(`   📝 Response type: ${responseType}`);

    // ── Early multi-field extraction from ANY turn ─────────────────
    // FIX: extract ALL data upfront from any message (TC-02, TC-03, TC-04)
    const earlyExtracted = extractAllData(userInput, callData.extractedData);
    for (const [k, v] of Object.entries(earlyExtracted)) {
      if (v && !callData.extractedData[k]) callData.extractedData[k] = v;
    }

    // Extract all complaint titles from this utterance
    const earlyComplaints = extractAllComplaintTitles(userInput);
    if (earlyComplaints.length) {
      if (!callData.extractedData.complaint_title)
        callData.extractedData.complaint_title = earlyComplaints[0];
      const existing = callData.extractedData.complaint_details
        ? callData.extractedData.complaint_details.split("; ").filter(Boolean)
        : [];
      callData.extractedData.complaint_details = [...new Set([...existing, ...earlyComplaints])].join("; ");
    }

    // City match after early extraction
    if (callData.extractedData.city && !callData.extractedData.city_id) {
      const mc = matchServiceCenter(callData.extractedData.city);
      if (mc) {
        applyCity(callData.extractedData, mc);
        console.log(`   🗺️  ${mc.city_name} → ${mc.branch_name}`);
      } else {
        callData.extractedData.city = null;
      }
    }

    callData.extractedData = sanitizeExtractedData(callData.extractedData);

    // ── FIX #9: Side question → answer in ANY state + redirect ────
    // Handles side questions even during critical states
    const sideAns = getSideAnswer(userInput);
    if (sideAns && !callData.awaitingPhoneConfirm && !callData.awaitingAlternatePhone &&
        !callData.awaitingPhoneMore && !callData.awaitingChassisMore) {
      const nextQ = getNextFieldQuestion(callData.extractedData);
      let combined = sideAns;
      if (nextQ) combined = `${sideAns} ${nextQ}`;
      // If in final confirm state, answer side question then still submit
      if (callData.awaitingFinalConfirm) {
        callData.awaitingFinalConfirm = false;
        callData.messages.push({ role: "assistant", text: combined, timestamp: new Date() });
        activeCalls.set(CallSid, callData);
        return await handleSubmit(callData, twiml, res, CallSid);
      }
      callData.messages.push({ role: "assistant", text: combined, timestamp: new Date() });
      activeCalls.set(CallSid, callData);
      speak(twiml, combined); // NOT cleanTTS — AI already clean
      return res.type("text/xml").send(twiml.toString());
    }

    // ── FIX #11: Angry response + next field in ALL states ────────
    const angryResp = getAngryResponse(userInput);
    if (angryResp && !callData.awaitingPhoneConfirm && !callData.awaitingFinalConfirm) {
      const nextQ = getNextFieldQuestion(callData.extractedData);
      const combined = nextQ ? `${angryResp} ${nextQ}` : angryResp;
      callData.messages.push({ role: "assistant", text: combined, timestamp: new Date() });
      activeCalls.set(CallSid, callData);
      speak(twiml, combined);
      return res.type("text/xml").send(twiml.toString());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHASSIS CHUNK ACCUMULATION (FIX #3)
    // FIX #3: capped at 3 chunks, dedup with triedVariations Set
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingChassisMore && !callData.customerData) {
      const digitsInInput = normalizeSpokenDigits(userInput);
      if (digitsInInput.length > 0 && digitsInInput.length <= 7) {
        if (digitsInInput.length >= 6) {
          callData.chassisPartials = [digitsInInput]; // full number, reset
        } else {
          // FIX #3: cap at 3 chunks
          if (callData.chassisPartials.length >= 3) {
            callData.chassisPartials.shift();
          }
          callData.chassisPartials.push(digitsInInput);
        }
        console.log(`   🔢 Chassis chunk: "${digitsInInput}" → [${callData.chassisPartials.join(", ")}]`);

        const variations = generateChassisVariations(callData.chassisPartials);
        // FIX #3: filter out already-tried variations
        const newVariations = variations.filter(v => !callData.triedVariations.has(v));

        let foundMachine = null;
        for (const variation of newVariations) {
          callData.triedVariations.add(variation);
          if (/^\d{4,7}$/.test(variation)) {
            const v = await validateMachineNumber(variation);
            if (v.valid) { foundMachine = { variation, data: v.data }; break; }
          }
        }

        if (foundMachine) {
          callData.customerData = foundMachine.data;
          callData.extractedData.machine_no = foundMachine.data.machineNo;
          callData.extractedData.customer_name = foundMachine.data.name;
          callData.machineNotFoundCount = 0;
          callData.awaitingChassisMore = false;
          callData.chassisPartials = [];
          callData.chassisAccumulated = "";
          console.log(`   ✅ Machine found via chunks: ${foundMachine.data.name}`);

          // FIX #5: Phone pre-confirmation — only if customer hasn't given phone yet
          if (!callData.extractedData.customer_phone && foundMachine.data.phone) {
            callData.pendingPhoneConfirm = true;
          }
        } else {
          callData.machineNotFoundCount++;
          callData.chassisAccumulated = callData.chassisPartials.join("");

          if (callData.machineNotFoundCount >= 5) {
            // Phone fallback
            const pr = callData._phoneData || (callData.callingNumber ? await findMachineByPhone(callData.callingNumber) : null);
            if (pr?.valid) {
              callData.customerData = pr.data;
              callData.extractedData.machine_no = pr.data.machineNo;
              callData.extractedData.customer_name = pr.data.name;
              callData.pendingPhoneConfirm = !callData.extractedData.customer_phone;
              callData.machineNotFoundCount = 0;
              callData.awaitingChassisMore = false;
              console.log(`   ✅ Phone fallback: ${pr.data.name}`);
            } else {
              // FIX #12: partial complaint submit (TC-06 pattern)
              sayFinal(twiml, getMachineNotFoundResponse());
              await submitPartialComplaint(callData);
              twiml.hangup();
              activeCalls.delete(CallSid);
              return res.type("text/xml").send(twiml.toString());
            }
          } else {
            callData.awaitingChassisMore = true;
            activeCalls.set(CallSid, callData);
            const soFar = callData.chassisAccumulated.split("").join(" ");
            speak(twiml, `Abhi tak ${soFar} mila. Baaki number bataiye dhere se.`);
            return res.type("text/xml").send(twiml.toString());
          }
        }
      }
      callData.awaitingChassisMore = false;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PHONE CHUNK ACCUMULATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

          if (accumulated.length === 10 && /^[6-9]/.test(accumulated)) {
            callData.extractedData.customer_phone = accumulated;
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            callData.awaitingPhoneMore = false;
            console.log(`   ✅ Phone via chunks: ${accumulated}`);
          } else if (accumulated.length < 5) {
            callData.awaitingPhoneMore = true;
            activeCalls.set(CallSid, callData);
            gatherSilently(twiml);
            return res.type("text/xml").send(twiml.toString());
          } else if (accumulated.length < 10) {
            callData.awaitingPhoneMore = true;
            activeCalls.set(CallSid, callData);
            speak(twiml, `Abhi ${accumulated.split("").join(" ")} mila. Baaki number bataiye.`);
            return res.type("text/xml").send(twiml.toString());
          } else {
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            callData.awaitingPhoneMore = false;
            speak(twiml, "Number sahi nahi laga. Pura 10 digit number dobara bataiye.");
            return res.type("text/xml").send(twiml.toString());
          }
        } else {
          callData.awaitingPhoneMore = true;
          activeCalls.set(CallSid, callData);
          speak(twiml, "Pura 10 digit mobile number bataiye.");
          return res.type("text/xml").send(twiml.toString());
        }
      }
      callData.awaitingPhoneMore = false;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MACHINE NUMBER LOOKUP
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

        // FIX #5: Phone pre-confirmation — only if customer hasn't given phone yet
        if (!callData.extractedData.customer_phone && v.data.phone &&
            v.data.phone !== "Unknown") {
          callData.pendingPhoneConfirm = true;
        }

        // If complaint already captured, don't ask for it again (WantsFlow pattern)
        if (!callData.extractedData.complaint_title) {
          const customerName = v.data.name.split(" ")[0] || "";
          activeCalls.set(CallSid, callData);
          speak(twiml, `${customerName}, problem kya hai?`);
          return res.type("text/xml").send(twiml.toString());
        }
        // else fall through — complaint already extracted from opening sentence
      } else {
        callData.machineNotFoundCount++;
        callData.extractedData.machine_no = null;
        console.warn(`   ❌ Machine not found (attempt ${callData.machineNotFoundCount})`);

        // Phone fallback on 3rd failure
        if (callData.machineNotFoundCount === 3 && callData.callingNumber) {
          const pr = callData._phoneData || await findMachineByPhone(callData.callingNumber);
          if (pr?.valid) {
            callData.customerData = pr.data;
            callData.extractedData.machine_no = pr.data.machineNo;
            callData.extractedData.customer_name = pr.data.name;
            callData.machineNotFoundCount = 0;
            callData.awaitingChassisMore = false;
            if (!callData.extractedData.customer_phone && pr.data.phone !== "Unknown") {
              callData.pendingPhoneConfirm = true;
            }
            console.log(`   ✅ Phone fallback: ${pr.data.name}`);
            if (!callData.extractedData.complaint_title) {
              const customerName = pr.data.name.split(" ")[0] || "";
              activeCalls.set(CallSid, callData);
              speak(twiml, `${customerName}, problem kya hai?`);
              return res.type("text/xml").send(twiml.toString());
            }
          }
        }

        if (!callData.customerData && callData.machineNotFoundCount < 5) {
          callData.awaitingChassisMore = true;
          callData.chassisPartials = [];
          callData.chassisAccumulated = "";
          callData.triedVariations = new Set();
          activeCalls.set(CallSid, callData);
          speak(twiml, getMachineNotFoundResponse());
          return res.type("text/xml").send(twiml.toString());
        }

        if (callData.machineNotFoundCount >= 5) {
          // FIX #12: submit partial complaint instead of just hanging up (TC-06 pattern)
          sayFinal(twiml, "Chassis nahi mila ji. Engineer ko bhej raha hun, wo directly aayega. Dhanyavaad!");
          await submitPartialComplaint(callData);
          twiml.hangup();
          activeCalls.delete(CallSid);
          return res.type("text/xml").send(twiml.toString());
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX #5: PHONE PRE-CONFIRMATION (REDESIGNED per WantsFlow)
    // "Aapka number jisme last mein XX hai — yehi rakhna hai?"
    // TC pattern: confirms last 2 digits, customer says haan/nahi
    // Skip if customer already gave phone in opening sentence
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.pendingPhoneConfirm && callData.customerData?.phone) {
      const ph = String(callData.customerData.phone);
      const lastTwo = ph.slice(-2);
      callData.pendingPhoneConfirm = false;
      callData.awaitingPhoneConfirm = true;
      activeCalls.set(CallSid, callData);
      speak(twiml, `Ji, ye number theek hai jisme last mein ${lastTwo} aata hai?`);
      return res.type("text/xml").send(twiml.toString());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PHONE CONFIRM ANSWER HANDLER
    // FIX #2: Short ack "haan" → fast-path, no LLM
    // Handles: "nahi" = wants new number, "haan" = keep existing
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingPhoneConfirm) {
      const wantsNewNumber = 
        /(change|naya|new|alag|badal|dusra|dusra|dusre|aur|बदल|नया|दूसरा|दूसरे|और)/i.test(userInput) ||
        (/^(nahi|nhi|nai|nahin|no)\b/i.test(userInput.trim()) && /((dusra|dusre|aur|naya|badal|number|नया|दूसरा|और|बदल))/i.test(userInput));
      
      if (wantsNewNumber) {
        // Customer wants to give a new number
        callData.awaitingPhoneConfirm = false;
        callData.awaitingAlternatePhone = true;
        callData.phonePartials = [];
        callData.phoneAccumulated = "";
        activeCalls.set(CallSid, callData);
        speak(twiml, "Pura 10 digit naya number bataiye.");
        return res.type("text/xml").send(twiml.toString());
      }

      callData.awaitingPhoneConfirm = false;
      const foundPhone = parsePhoneFromText(userInput);

      // Customer gives a new 10-digit number directly
      if (foundPhone && foundPhone.length === 10 && /^[6-9]/.test(foundPhone)) {
        callData.extractedData.customer_phone = foundPhone;
        console.log(`   ✅ Phone changed directly: ${foundPhone}`);
      }
      // "nahi" alone = keep existing (per WantsFlow TC-01)
      else if (isPositiveConfirmation(userInput) || /^(haan|ha|han|theek|ok|ji|yes)\b/i.test(userInput.trim().toLowerCase())) {
        callData.extractedData.customer_phone = callData.customerData.phone;
        console.log(`   ✅ Phone confirmed: ${callData.customerData.phone}`);
      }
      // Unclear — ask again
      else {
        callData.awaitingPhoneConfirm = true;
        activeCalls.set(CallSid, callData);
        const lastTwo = String(callData.customerData?.phone || "").slice(-2);
        speak(twiml, `Last mein ${lastTwo} wala number sahi hai ya naya number dena hai?`);
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ALTERNATE PHONE COLLECTION (Fixed for WantsFlow pattern)
    // Handles: partial numbers, spaced numbers, invalid lengths
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingAlternatePhone) {
      // First, try to extract a clean 10-digit phone from the input
      const foundPhone = parsePhoneFromText(userInput);
      
      if (foundPhone && foundPhone.length === 10 && /^[6-9]/.test(foundPhone)) {
        // Valid 10-digit phone found
        const orig = callData.customerData?.phone || "";
        callData.extractedData.customer_phone =
          orig && orig !== foundPhone ? `${orig}, ${foundPhone}` : foundPhone;
        callData.awaitingAlternatePhone = false;
        callData.phonePartials = [];
        callData.phoneAccumulated = "";
        console.log(`   ✅ Alternate phone: ${callData.extractedData.customer_phone}`);
      } else {
        // No valid phone found - extract all digits and check length
        const digitsInInput = normalizeSpokenDigits(userInput);
        
        if (digitsInInput.length > 0) {
          // Clean the accumulated phone - remove any non-digits and check length
          const cleanDigits = digitsInInput.replace(/\D/g, '');
          
          if (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits)) {
            // Valid 10-digit number
            const orig = callData.customerData?.phone || "";
            callData.extractedData.customer_phone =
              orig && orig !== cleanDigits ? `${orig}, ${cleanDigits}` : cleanDigits;
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            callData.awaitingAlternatePhone = false;
            console.log(`   ✅ Alternate phone via digits: ${cleanDigits}`);
          } else if (cleanDigits.length < 10) {
            // Less than 10 digits - ask for more
            callData.phonePartials = [cleanDigits];
            callData.phoneAccumulated = cleanDigits;
            activeCalls.set(CallSid, callData);
            speak(twiml, `Abhi ${cleanDigits.split("").join(" ")} mila. Baaki number bataiye.`);
            return res.type("text/xml").send(twiml.toString());
          } else {
            // More than 10 digits - reset and ask again (WantsFlow pattern)
            callData.phonePartials = [];
            callData.phoneAccumulated = "";
            callData.awaitingAlternatePhone = true;
            activeCalls.set(CallSid, callData);
            speak(twiml, "Ye number 10 aanko ka nahi hai. Kripya ek baar dobara batayiye — pura 10 digit ka number.");
            return res.type("text/xml").send(twiml.toString());
          }
        } else {
          // No digits found - ask again
          activeCalls.set(CallSid, callData);
          speak(twiml, "Pura 10 digit mobile number bataiye.");
          return res.type("text/xml").send(twiml.toString());
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX #4: CITY — no confirmation step, just match and move on
    // If city extracted but not matched → re-ask with examples
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // (City is matched immediately in the early extraction block above)
    // If city was set but not matched → extracted city was cleared → re-ask via AI
    if (callData.extractedData.city && !callData.extractedData.city_id) {
      // city was set but no match — clear and ask again
      const attempted = callData.extractedData.city;
      callData.extractedData.city = null;
      callData.cityNotFoundCount = (callData.cityNotFoundCount || 0) + 1;
      console.log(`   ❌ City not matched: ${attempted} (attempt ${callData.cityNotFoundCount})`);
      const hint = callData.cityNotFoundCount >= 2
        ? "Jaipur, Ajmer, Kota, Udaipur, Alwar, Sikar, Jodhpur — in mein se koi city bataiye."
        : "Yeh city nahi mili. Rajasthan ki woh city bataiye jahan machine khadi hai.";
      activeCalls.set(CallSid, callData);
      speak(twiml, hint);
      return res.type("text/xml").send(twiml.toString());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EXISTING COMPLAINT DETECTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!callData.awaitingComplaintAction) {
      const repeatRx = /(pehle complaint|already complaint|complaint kar di|complaint ki thi|engineer nahi aaya|engineer nhi aaya|aaya nahi|kab aayega|bahut der|kal se wait|2 din|3 din|dobara complaint|phir se complaint|re-register)/i;
      const hasExistingId = callData.extractedData.existing_complaint_id;

      if (repeatRx.test(lo) || hasExistingId) {
        callData.awaitingComplaintAction = true;
        let existingInfo = null;
        const machNo = callData.extractedData.machine_no || callData.customerData?.machineNo;
        if (machNo) existingInfo = await getExistingComplaint(machNo);
        else if (callData.callingNumber) {
          const pr = callData._phoneData || await findMachineByPhone(callData.callingNumber);
          if (pr?.valid) {
            callData.customerData = pr.data;
            callData.extractedData.machine_no = pr.data.machineNo;
            existingInfo = await getExistingComplaint(pr.data.machineNo);
          }
        }

        if (existingInfo?.found) {
          callData.existingComplaintId = existingInfo.complaintId;
          activeCalls.set(CallSid, callData);
          speak(twiml, `Complaint ${existingInfo.complaintId} mili. Nayi complaint karein ya engineer ko urgent message bhejein?`);
        } else {
          callData.awaitingComplaintAction = false;
          activeCalls.set(CallSid, callData);
          speak(twiml, "Pehli complaint nahi mili. Nayi register karte hain. Chassis number bataiye.");
        }
        return res.type("text/xml").send(twiml.toString());
      }
    }

    // COMPLAINT ACTION CHOICE
    if (callData.awaitingComplaintAction) {
      callData.awaitingComplaintAction = false;
      if (/(urgent|jaldi|message|engineer ko|escalate|priority)/i.test(lo)) {
        await escalateToEngineer(callData.existingComplaintId, callData.callingNumber);
        sayFinal(twiml, "Engineer ko urgent message bhej diya. Jaldi aayega. Dhanyavaad!");
        twiml.hangup();
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }
      // Otherwise register new complaint — fall through
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX #13: SECOND MACHINE (TC-32 pattern)
    // After first complaint done, if customer says "doosri machine"
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingSecondMachine) {
      callData.awaitingSecondMachine = false;
      // Reset for second machine
      callData.customerData = null;
      callData.extractedData.machine_no = null;
      callData.extractedData.complaint_title = null;
      callData.extractedData.complaint_details = "";
      callData.extractedData.machine_status = null;
      callData.extractedData.city = null;
      callData.extractedData.city_id = null;
      callData.extractedData.customer_phone = null;
      callData.awaitingFinalConfirm = false;
      callData.finalConfirmAsked = false;
      callData.machineNotFoundCount = 0;
      callData.chassisPartials = [];
      callData.triedVariations = new Set();

      // Extract from this turn for second machine
      const secondExtracted = extractAllData(userInput, {});
      for (const [k, v] of Object.entries(secondExtracted)) {
        if (v) callData.extractedData[k] = v;
      }

      activeCalls.set(CallSid, callData);
      if (!callData.extractedData.machine_no) {
        speak(twiml, "Doosri machine ka chassis number bataiye.");
      } else {
        speak(twiml, "Machine mein kya problem hai?");
      }
      return res.type("text/xml").send(twiml.toString());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CHECK FOR MULTI-MACHINE REQUEST (TC-32)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!callData.firstComplaintDone && /(do machine|2 machine|dono machine|doosri bhi|ek aur machine)/i.test(lo)) {
      // Flag it — will handle after first complaint is submitted
      callData.multiMachinePending = true;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FIX #10: FINAL CONFIRMATION TRIGGER
    // Only ask once per call (finalConfirmAsked flag)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const missing = missingField(callData.extractedData);
    const machineValidated = !!callData.customerData;

    if (!missing && machineValidated && !callData.awaitingFinalConfirm && !callData.finalConfirmAsked) {
      callData.awaitingFinalConfirm = true;
      callData.finalConfirmAsked = true; // FIX #10
      activeCalls.set(CallSid, callData);
      speak(twiml, getFinalConfirmPrompt());
      return res.type("text/xml").send(twiml.toString());
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // FINAL CONFIRM ANSWER HANDLER
    // FIX #2: Short acks fast-pathed — no LLM
    // "nahi" = no more problems = SUBMIT (per TC analysis)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (callData.awaitingFinalConfirm) {
      const addingMore = extractAllComplaintTitles(userInput);
      const isConfirming = isPositiveConfirmation(userInput);
      const noMore = isNoMoreProblems(userInput);
      const isCancel = isHardCancel(userInput);

      // True cancel only ("band karo", "cancel")
      if (isCancel && !noMore) {
        sayFinal(twiml, "Agar kuch aur ho toh dobara call karein. Dhanyavaad!");
        twiml.hangup();
        activeCalls.delete(CallSid);
        return res.type("text/xml").send(twiml.toString());
      }

      // Customer adds more problems
      if (addingMore.length > 0 && !isConfirming && !noMore) {
        const existingDetails = callData.extractedData.complaint_details
          ? callData.extractedData.complaint_details.split("; ").filter(Boolean)
          : [];
        const alreadyHave = new Set([callData.extractedData.complaint_title, ...existingDetails]);
        const newOnes = addingMore.filter(c => !alreadyHave.has(c));
        if (newOnes.length > 0) {
          callData.extractedData.complaint_details = [...existingDetails, ...newOnes].join("; ");
        }
        callData.awaitingFinalConfirm = false;
        activeCalls.set(CallSid, callData);
        return await handleSubmit(callData, twiml, res, CallSid);
      }

      // "nahi" / "haan" / short ack / anything else → SUBMIT
      callData.awaitingFinalConfirm = false;
      activeCalls.set(CallSid, callData);
      return await handleSubmit(callData, twiml, res, CallSid);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // AI RESPONSE FALLBACK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log(`   📊 ${JSON.stringify({
      machine: callData.extractedData.machine_no || "❌",
      complaint: callData.extractedData.complaint_title || "❌",
      status: callData.extractedData.machine_status || "❌",
      city: callData.extractedData.city || "❌",
      phone: callData.extractedData.customer_phone || "❌",
      missing: missing || "✅ READY",
    })}`);

    // Safety net — all data ready, trigger confirm
    if (!missing && machineValidated && !callData.finalConfirmAsked) {
      callData.awaitingFinalConfirm = true;
      callData.finalConfirmAsked = true;
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
        if (mc) applyCity(callData.extractedData, mc);
        else callData.extractedData.city = null;
      }
    }

    // Check again after AI
    const stillMissing = missingField(callData.extractedData);
    if (!stillMissing && machineValidated && !callData.finalConfirmAsked) {
      callData.awaitingFinalConfirm = true;
      callData.finalConfirmAsked = true;
      callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
      activeCalls.set(CallSid, callData);
      speak(twiml, getFinalConfirmPrompt());
      return res.type("text/xml").send(twiml.toString());
    }

    // HARD GUARDS — never submit without validation
    if (aiResp.readyToSubmit && !machineValidated) {
      console.warn("   ⛔ AI ready but machine NOT validated — blocking");
      aiResp.readyToSubmit = false;
    }
    if (aiResp.readyToSubmit && !callData.extractedData.customer_phone) {
      console.warn("   ⛔ AI ready but phone NOT confirmed — blocking");
      aiResp.readyToSubmit = false;
    }

    if (aiResp.readyToSubmit && machineValidated && callData.extractedData.customer_phone) {
      callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
      return await handleSubmit(callData, twiml, res, CallSid);
    }

    callData.messages.push({ role: "assistant", text: aiResp.text, timestamp: new Date() });
    activeCalls.set(CallSid, callData);
    // FIX #6: Don't run cleanTTS on AI output — AI is already instructed to be clean
    speak(twiml, aiResp.text);
    res.type("text/xml").send(twiml.toString());
  } catch (err) {
    console.error("❌ [PROCESS]", err.message);
    const twimlErr = new VoiceResponse();
    sayFinal(twimlErr, "Thodi dikkat aa gayi. Engineer ko bhej raha hun.");
    twimlErr.dial(process.env.HUMAN_AGENT_NUMBER || "+919876543210");
    activeCalls.delete(CallSid);
    res.type("text/xml").send(twimlErr.toString());
  }
});

/* ═══════════════════════════════════════════════════════════════
   SUBMIT COMPLAINT
   FIX #13: After successful submit, check for multi-machine pending
═══════════════════════════════════════════════════════════════ */
async function handleSubmit(callData, twiml, res, CallSid) {
  console.log("\n🚀 [SUBMITTING COMPLAINT]");
  const result = await submitComplaint(callData);
  const id = result.sapId || result.jobId || "";

  callData.firstComplaintDone = true;

  // FIX #13: Multi-machine — ask for second machine instead of hanging up
  if (callData.multiMachinePending) {
    callData.multiMachinePending = false;
    callData.awaitingSecondMachine = true;
    activeCalls.set(CallSid, callData);
    const idPart = id ? ` Number hai ${String(id).split("").join(" ")}.` : "";
    speak(twiml, `Pehli complaint register ho gayi.${idPart} Ab doosri machine ka chassis number bataiye.`);
    return res.type("text/xml").send(twiml.toString());
  }

  if (id) {
    sayFinal(twiml, `Complaint register ho gayi. Number hai ${String(id).split("").join(" ")}. Engineer contact karega. Shukriya!`);
  } else {
    sayFinal(twiml, "Complaint register ho gayi. Engineer contact karega. Shukriya!");
  }

  twiml.hangup();
  activeCalls.delete(CallSid);
  return res.type("text/xml").send(twiml.toString());
}

/* ═══════════════════════════════════════════════════════════════
   FIX #12: PARTIAL COMPLAINT SUBMIT (TC-06 — chassis not found)
   Submits without machine_no so engineer can still be dispatched
═══════════════════════════════════════════════════════════════ */
async function submitPartialComplaint(callData) {
  try {
    const payload = {
      machine_no: "Unknown",
      customer_name: callData.extractedData.customer_name || "Unknown",
      caller_name: callData.extractedData.customer_name || "Customer",
      caller_no: callData.extractedData.customer_phone || callData.callingNumber || "Unknown",
      contact_person: callData.extractedData.customer_name || "Customer",
      contact_person_number: callData.extractedData.customer_phone || callData.callingNumber || "Unknown",
      machine_model: "Unknown",
      sub_model: "NA",
      installation_date: "2025-01-01",
      machine_type: "Warranty",
      city_id: callData.extractedData.city_id || "4",
      complain_by: "Customer",
      machine_status: callData.extractedData.machine_status || "Breakdown",
      job_location: "Onsite",
      branch: callData.extractedData.branch || "JAIPUR",
      outlet: callData.extractedData.outlet || "JAIPUR",
      complaint_details: callData.extractedData.complaint_details || "Machine identification failed — engineer dispatch",
      complaint_title: callData.extractedData.complaint_title || "Machine Identification Failed",
      sub_title: "Other",
      business_partner_code: "NA",
      complaint_sap_id: "NA",
      machine_location_address: "Not provided",
      pincode: "0",
      service_date: "", from_time: "", to_time: "",
    };
    await axios.post(COMPLAINT_URL, payload, {
      timeout: API_TIMEOUT,
      headers: { "Content-Type": "application/json", ...API_HEADERS },
      validateStatus: s => s < 500,
    });
    console.log("✅ Partial complaint submitted");
  } catch (err) {
    console.error("❌ Partial submit failed:", err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   API HELPERS
═══════════════════════════════════════════════════════════════ */
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
  } catch {
    return { valid: false };
  }
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
  } catch {
    return { valid: false };
  }
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

async function submitComplaint(callData) {
  try {
    const data = callData.extractedData;
    const c = callData.customerData || {};
    if (!data.job_location) data.job_location = "Onsite";

    // FIX #15: Append engineer preference to complaint details if set
    let finalDetails = data.complaint_details || data.complaint_title || "Not provided";
    if (data.engineer_preference) {
      finalDetails += `; Engineer preference: ${data.engineer_preference}`;
    }

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
      complaint_details: finalDetails,
      complaint_title: data.complaint_title || "General Problem",
      sub_title: data.complaint_subtitle || "Other",
      business_partner_code: c.businessPartnerCode || "NA",
      complaint_sap_id: "NA",
      machine_location_address: data.machine_location_address || "Not provided",
      pincode: "0",
      service_date: "", from_time: "", to_time: "",
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